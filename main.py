from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import cv2
import uuid
import io
import csv
import json
from datetime import datetime

# Import local modules
import database
from image_processor import PalmImageProcessor

app = FastAPI(title="Aplikasi Pengambilan Data Telapak Tangan (Palmprint)")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Image Processor
processor = PalmImageProcessor()

# Ensure directories exist
RAW_DIR = os.path.join("data", "raw")
ROI_DIR = os.path.join("data", "roi")
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(ROI_DIR, exist_ok=True)

# Initialize SQLite database
database.init_db()

# Pydantic schema for frame upload request
class PalmprintFrameUpload(BaseModel):
    responden_id: str = Field(..., min_length=1)
    nama: str = Field(..., min_length=1)
    usia: int = Field(..., ge=1, le=120)
    jenis_kelamin: str = Field(..., pattern="^(Laki-laki|Perempuan)$")
    pendidikan: str
    bidang_pekerjaan: str
    jumlah_akun_media_sosial: int = Field(..., ge=0)
    rata2_penggunaan_medsos: str = Field(..., min_length=1)
    orientasi_tangan: str = Field(..., pattern="^(RIGHT|LEFT)$")
    mirrored: bool = False
    image: str  # Base64 string

# Pydantic schema for final survey submission (BFI-60 + Consent)
class SurveySubmit(BaseModel):
    responden_id: str = Field(..., min_length=1)
    nama: str = Field(..., min_length=1)
    usia: int = Field(..., ge=1, le=120)
    jenis_kelamin: str = Field(..., pattern="^(Laki-laki|Perempuan)$")
    pendidikan: str = Field(..., pattern="^(SMA|S1|S2|S3|Lainnya)$")
    bidang_pekerjaan: str = Field(..., min_length=1)
    jumlah_akun_media_sosial: int = Field(..., ge=0)
    rata2_penggunaan_medsos: str = Field(..., pattern="^(< 1 Jam|1-3 Jam|> 3 Jam)$")
    bfi_answers: dict  # dict of 60 answers
    ethical_clearance: bool
    score_o: float = Field(..., ge=1.0, le=5.0)
    score_c: float = Field(..., ge=1.0, le=5.0)
    score_e: float = Field(..., ge=1.0, le=5.0)
    score_a: float = Field(..., ge=1.0, le=5.0)
    score_n: float = Field(..., ge=1.0, le=5.0)

# Serve static files
# Make sure the static folder exists first
os.makedirs("static", exist_ok=True)
os.makedirs(os.path.join("static", "css"), exist_ok=True)
os.makedirs(os.path.join("static", "js"), exist_ok=True)

@app.get("/")
def read_root():
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>Aplikasi Palmprint: Frontend index.html belum di-deploy.</h1>")

@app.post("/upload-frame")
async def upload_frame(payload: PalmprintFrameUpload):
    try:
        # Decode base64 image
        img = processor.decode_base64_image(payload.image)
        if img is None:
            raise HTTPException(status_code=400, detail="Format gambar tidak valid.")

        # Process frame (MediaPipe validation, handedness check, masking, and cropping)
        result = processor.process_frame(img, payload.orientasi_tangan, payload.mirrored)

        if result["status"] == "reject":
            return {
                "status": "reject",
                "reason": result["reason"]
            }

        # Lolos QC: Dapatkan masked ROI
        masked_roi = result["masked_roi"]

        # Hubungkan ke database untuk menghitung frame yang sudah berhasil dikumpulkan untuk tangan ini
        conn = database.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) as count FROM palmprints WHERE responden_id = ? AND orientasi_tangan = ?",
            (payload.responden_id, payload.orientasi_tangan)
        )
        row = cursor.fetchone()
        current_count = row["count"] if row else 0
        conn.close()

        # Counter untuk frame baru ini
        new_counter = current_count + 1

        if new_counter > 25:
            return {
                "status": "reject",
                "reason": f"Perekaman Tangan {payload.orientasi_tangan} sudah lengkap (25/25)."
            }

        # Bersihkan ID responden dan nama untuk nama berkas yang aman
        safe_id = "".join(c for c in payload.responden_id if c.isalnum() or c in ("-", "_")).strip()
        if not safe_id:
            safe_id = str(uuid.uuid4())[:8]

        safe_name = "".join(c for c in payload.nama if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        if not safe_name:
            safe_name = "responden"

        # Simpan seluruh citra dalam folder sesuai ID / kode responden
        respondent_dir_raw = os.path.join("data", safe_id, "raw")
        respondent_dir_roi = os.path.join("data", safe_id, "roi")
        os.makedirs(respondent_dir_raw, exist_ok=True)
        os.makedirs(respondent_dir_roi, exist_ok=True)

        filename = f"{safe_name}_{payload.orientasi_tangan}_{new_counter}.jpg"
        
        path_raw = os.path.join(respondent_dir_raw, filename)
        path_roi = os.path.join(respondent_dir_roi, filename)

        # Simpan gambar raw dan ROI ke lokal disk
        cv2.imwrite(path_raw, img)
        cv2.imwrite(path_roi, masked_roi)

        # Simpan record data ke database SQLite
        db_data = {
            "responden_id": payload.responden_id,
            "nama": payload.nama,
            "usia": payload.usia,
            "jenis_kelamin": payload.jenis_kelamin,
            "pendidikan": payload.pendidikan,
            "bidang_pekerjaan": payload.bidang_pekerjaan,
            "jumlah_akun_media_sosial": payload.jumlah_akun_media_sosial,
            "rata2_penggunaan_medsos": payload.rata2_penggunaan_medsos,
            "orientasi_tangan": payload.orientasi_tangan,
            "path_gambar_raw": path_raw,
            "path_gambar_roi": path_roi
        }
        database.insert_palmprint(db_data)

        return {
            "status": "success",
            "counter": new_counter,
            "landmarks": result["landmarks"]
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan internal: {str(e)}")

@app.post("/submit-survey")
async def submit_survey(payload: SurveySubmit):
    try:
        db_data = {
            "responden_id": payload.responden_id,
            "nama": payload.nama,
            "usia": payload.usia,
            "jenis_kelamin": payload.jenis_kelamin,
            "pendidikan": payload.pendidikan,
            "bidang_pekerjaan": payload.bidang_pekerjaan,
            "jumlah_akun_media_sosial": payload.jumlah_akun_media_sosial,
            "rata2_penggunaan_medsos": payload.rata2_penggunaan_medsos,
            "bfi_answers": json.dumps(payload.bfi_answers),
            "ethical_clearance": 1 if payload.ethical_clearance else 0,
            "score_o": payload.score_o,
            "score_c": payload.score_c,
            "score_e": payload.score_e,
            "score_a": payload.score_a,
            "score_n": payload.score_n
        }
        database.insert_respondent(db_data)
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan data kuesioner: {str(e)}")

from fastapi.responses import HTMLResponse

@app.get("/export-survey")
async def export_survey(password: str = None):
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if not password or password != admin_password:
        return HTMLResponse(
            content="<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'><h2>Akses Ditolak</h2><p style='color: #666;'>Password administrator salah atau tidak disertakan.</p></div>",
            status_code=401
        )
    try:
        conn = database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM respondents ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        conn.close()

        # P001 to P060
        bfi_keys = [
            "P001", "P002", "P03R", "P04R", "P05R", "P006", "P007", "P08R", "P09R", "P010",
            "P11R", "P16R", "P021", "P26R", "P31R", "P36R", "P041", "P046", "P51R", "P056",
            "P002", "P007", "P12R", "P17R", "P22R", "P027", "P032", "P37R", "P042R", "P47R",
            "P052", "P057", "P013", "P018", "P033", "P038", "P043", "P053", "P03R", "P08R",
            "P23R", "P28R", "P48R", "P58R", "P014", "P019", "P034", "P039", "P054", "P059",
            "P04R", "P09R", "P24R", "P29R", "P44R", "P49R", "P010", "P015", "P020", "P035",
            "P040", "P060", "P05R", "P25R", "P30R", "P45R", "P50R", "P55R"
        ]
        # Remove duplicates while keeping order
        seen = set()
        bfi_keys = [x for x in bfi_keys if not (x in seen or seen.add(x))]

        output = io.StringIO()
        writer = csv.writer(output)

        # CSV Headers
        headers = [
            "responden_id", "nama", "usia", "jenis_kelamin", "pendidikan", 
            "bidang_pekerjaan", "jumlah_akun_media_sosial", "rata2_penggunaan_medsos", 
            "ethical_clearance", "score_o", "score_c", "score_e", "score_a", "score_n", "timestamp"
        ] + bfi_keys
        writer.writerow(headers)

        for row in rows:
            ans_dict = {}
            try:
                ans_dict = json.loads(row["bfi_answers"])
            except Exception:
                pass

            bfi_answers_row = [ans_dict.get(k, "") for k in bfi_keys]
            
            respondent_row = [
                row["responden_id"],
                row["nama"],
                row["usia"],
                row["jenis_kelamin"],
                row["pendidikan"],
                row["bidang_pekerjaan"],
                row["jumlah_akun_media_sosial"],
                row["rata2_penggunaan_medsos"],
                row["ethical_clearance"],
                row["score_o"],
                row["score_c"],
                row["score_e"],
                row["score_a"],
                row["score_n"],
                row["timestamp"]
            ] + bfi_answers_row
            writer.writerow(respondent_row)

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=hasil_survei_palmprint.csv"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gagal melakukan ekspor data: {str(e)}")

import zipfile
import tempfile

@app.get("/export-images")
async def export_images(background_tasks: BackgroundTasks, password: str = None):
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if not password or password != admin_password:
        return HTMLResponse(
            content="<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'><h2>Akses Ditolak</h2><p style='color: #666;'>Password administrator salah atau tidak disertakan.</p></div>",
            status_code=401
        )
    try:
        if not os.path.exists("data"):
            return HTMLResponse(
                content="<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'><h2>Tidak Ada Gambar</h2><p style='color: #666;'>Belum ada data citra responden yang tersimpan di server.</p></div>",
                status_code=404
            )
            
        zip_filename = os.path.join(tempfile.gettempdir(), f"palmprint_images_{uuid.uuid4().hex}.zip")
        has_files = False
        
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk("data"):
                for file in files:
                    if not (file.lower().endswith(".png") or file.lower().endswith(".jpg") or file.lower().endswith(".jpeg")):
                        continue
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, "data")
                    zip_file.write(file_path, arcname)
                    has_files = True
                    
        if not has_files:
            if os.path.exists(zip_filename):
                os.remove(zip_filename)
            return HTMLResponse(
                content="<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'><h2>Tidak Ada Gambar</h2><p style='color: #666;'>Belum ada file gambar (.jpg/.jpeg/.png) responden di folder data.</p></div>",
                status_code=404
            )
            
        background_tasks.add_task(os.remove, zip_filename)
        return FileResponse(
            zip_filename,
            media_type="application/zip",
            filename="palmprint_images_export.zip"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gagal melakukan ekspor gambar: {str(e)}")

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")
