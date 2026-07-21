import sqlite3
import os

DB_PATH = os.path.join("data", "palmprint.db")

def get_connection(db_path=DB_PATH):
    # Ensure database directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DB_PATH):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    # 1. Create palmprints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS palmprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        responden_id TEXT,
        nama TEXT NOT NULL,
        usia INTEGER NOT NULL,
        jenis_kelamin TEXT NOT NULL,
        pendidikan TEXT NOT NULL,
        bidang_pekerjaan TEXT NOT NULL,
        jumlah_akun_media_sosial INTEGER NOT NULL,
        rata2_penggunaan_medsos TEXT NOT NULL,
        orientasi_tangan TEXT NOT NULL,
        path_gambar_raw TEXT NOT NULL,
        path_gambar_roi TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 2. Create respondents table to store BFI-60 answers & ethical clearance
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS respondents (
        responden_id TEXT PRIMARY KEY,
        nama TEXT NOT NULL,
        usia INTEGER NOT NULL,
        jenis_kelamin TEXT NOT NULL,
        pendidikan TEXT NOT NULL,
        bidang_pekerjaan TEXT NOT NULL,
        jumlah_akun_media_sosial INTEGER NOT NULL,
        rata2_penggunaan_medsos TEXT NOT NULL,
        bfi_answers TEXT NOT NULL, -- JSON string
        ethical_clearance INTEGER NOT NULL, -- 1 = agreed, 0 = not
        score_o REAL NOT NULL DEFAULT 0.0,
        score_c REAL NOT NULL DEFAULT 0.0,
        score_e REAL NOT NULL DEFAULT 0.0,
        score_a REAL NOT NULL DEFAULT 0.0,
        score_n REAL NOT NULL DEFAULT 0.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    
    # Run migration to add score columns to respondents if they don't exist
    for col in ["score_o", "score_c", "score_e", "score_a", "score_n"]:
        try:
            cursor.execute(f"ALTER TABLE respondents ADD COLUMN {col} REAL NOT NULL DEFAULT 0.0;")
            conn.commit()
        except sqlite3.OperationalError:
            pass

    # Run simple migration to add responden_id column if table existed previously without it
    try:
        cursor.execute("ALTER TABLE palmprints ADD COLUMN responden_id TEXT;")
        conn.commit()
        print("Migrated database: added responden_id column.")
    except sqlite3.OperationalError:
        pass

    conn.close()
    print(f"Database initialized at: {db_path}")

def insert_palmprint(data, db_path=DB_PATH):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    query = """
    INSERT INTO palmprints (
        responden_id, nama, usia, jenis_kelamin, pendidikan, bidang_pekerjaan,
        jumlah_akun_media_sosial, rata2_penggunaan_medsos,
        orientasi_tangan, path_gambar_raw, path_gambar_roi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    cursor.execute(query, (
        data.get("responden_id"),
        data["nama"],
        data["usia"],
        data["jenis_kelamin"],
        data["pendidikan"],
        data["bidang_pekerjaan"],
        data["jumlah_akun_media_sosial"],
        str(data["rata2_penggunaan_medsos"]),
        data["orientasi_tangan"],
        data["path_gambar_raw"],
        data["path_gambar_roi"]
    ))
    
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id

def insert_respondent(data, db_path=DB_PATH):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    query = """
    INSERT OR REPLACE INTO respondents (
        responden_id, nama, usia, jenis_kelamin, pendidikan, bidang_pekerjaan,
        jumlah_akun_media_sosial, rata2_penggunaan_medsos, bfi_answers, ethical_clearance,
        score_o, score_c, score_e, score_a, score_n
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    cursor.execute(query, (
        data["responden_id"],
        data["nama"],
        data["usia"],
        data["jenis_kelamin"],
        data["pendidikan"],
        data["bidang_pekerjaan"],
        data["jumlah_akun_media_sosial"],
        data["rata2_penggunaan_medsos"],
        data["bfi_answers"],
        data["ethical_clearance"],
        data["score_o"],
        data["score_c"],
        data["score_e"],
        data["score_a"],
        data["score_n"]
    ))
    
    conn.commit()
    conn.close()
