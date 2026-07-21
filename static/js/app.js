// Global application state variables
let streamActive = null;
let currentDeviceId = null;
let isMirrored = true; // default to mirrored (front camera)
let isLightingOk = false;
let currentLuminance = 100;
let currentHand = "RIGHT"; // RIGHT or LEFT
let captureInterval = null;
let isCapturing = false;

// Wizard Navigation state
let currentStep = 1;
let bfiAnswers = {}; // map of {questionId: score}
let oceanChartInstance = null; // global Chart.js instance

// BFI-60 Questions Bank
const bfiQuestions = [
    { id: "P001", text: "Saya seorang yang Ramah, mau bergaul." },
    { id: "P002", text: "Saya seorang yang berbelas kasih, suka menolong." },
    { id: "P03R", text: "Saya seorang yang cenderung tidak terorganisir, tidak sistematis dalam beraktivitas." },
    { id: "P04R", text: "Saya seorang yang tenang, mampu menangani stres dengan baik." },
    { id: "P05R", text: "Saya seorang yang hanya memiliki sedikit minat dan ketertarikan pada kesenian." },
    { id: "P006", text: "Saya seorang yang Berterus terang secara tegas." },
    { id: "P007", text: "Saya seorang yang memperlakukan orang lain dengan hormat." },
    { id: "P08R", text: "Saya seorang yang cenderung malas atau lamban ketika mengerjakan tugas." },
    { id: "P09R", text: "Saya seorang yang cenderung tetap optimis ketika mengalami kegagalan atau kemunduran." },
    { id: "P010", text: "Saya seorang yang Ingin tahu mengenai banyak hal." },
    { id: "P11R", text: "Saya seorang yang jarang merasa penuh tenaga (energik) atau bersemangat." },
    { id: "P12R", text: "Saya seorang yang cenderung mencari kesalahan orang lain, cenderung mempersalahkan kesalahan orang lain." },
    { id: "P013", text: "Saya seorang yang dapat diandalkan untuk bekerja, konsisten, tekun." },
    { id: "P014", text: "Saya seorang yang memiliki suasana hati yang mudah berubah (naik - turun)." },
    { id: "P015", text: "Saya seorang yang pandai berkreasi, mampu memikirkan banyak cara cerdas untuk melakukan sesuatu." },
    { id: "P16R", text: "Saya seorang yang cenderung diam ketika bersama dengan orang lain." },
    { id: "P17R", text: "Saya seorang yang memberikan sedikit kepedulian kepada orang lain." },
    { id: "P018", text: "Saya seorang yang runtut dan teratur, suka menjaga kerapian." },
    { id: "P019", text: "Saya seorang yang cenderung tegang (sukar tenang dan cemas)." },
    { id: "P020", text: "Saya seorang yang mengagumi seni, musik atau sastra." },
    { id: "P021", text: "Saya seorang yang bersikap menguasai, bertindak seperti pemimpin." },
    { id: "P22R", text: "Saya seorang yang memulai adu pendapat dengan orang lain." },
    { id: "P23R", text: "Saya seorang yang sulit memulai pengerjaan tugas." },
    { id: "P24R", text: "Saya seorang yang merasa aman dan nyaman dengan diri sendiri." },
    { id: "P25R", text: "Saya seorang yang menghindari perbincangan yang membutuhkan pemikiran mendalam, bersifat filosofis." },
    { id: "P26R", text: "Saya seorang yang kurang aktif bergerak dibandingkan orang-orang lain." },
    { id: "P027", text: "Saya seorang yang mudah memaafkan orang lain." },
    { id: "P28R", text: "Saya seorang yang dapat bertindak ceroboh." },
    { id: "P29R", text: "Saya seorang yang stabil secara emosional, tidak mudah marah." },
    { id: "P30R", text: "Saya seorang yang sulit menghasilkan solusi baru." },
    { id: "P31R", text: "Saya seorang yang terkadang merasa malu, cenderung menutup diri ketika bersama orang lain." },
    { id: "P032", text: "Saya seorang yang mudah menolong dan tidak mengutamakan kepentingan diri sendiri." },
    { id: "P033", text: "Saya seorang yang menjaga kerapian dan keteraturan." },
    { id: "P034", text: "Saya seorang yang sering khawatir." },
    { id: "P035", text: "Saya seorang yang menghargai seni dan keindahan." },
    { id: "P36R", text: "Saya seorang yang merasa sulit mempengaruhi orang lain." },
    { id: "P37R", text: "Saya seorang yang terkadang berkata kasar dengan orang lain." },
    { id: "P038", text: "Saya seorang yang efisien, mampu menyelesaikan tugas." },
    { id: "P039", text: "Saya seorang yang sering merasa sedih." },
    { id: "P040", text: "Saya seorang yang suka berpikir secara luas dan mendalam." },
    { id: "P041", text: "Saya seorang yang penuh tenaga dan semangat." },
    { id: "P042R", text: "Saya seorang yang mencurigai adanya niat buruk dibalik perilaku orang lain." },
    { id: "P043", text: "Saya seorang yang selalu dapat diandalkan." },
    { id: "P44R", text: "Saya seorang yang menjaga suasana hati tetap terkendali." },
    { id: "P45R", text: "Saya seorang yang kesulitan menghasilkan ide kreatif (baru dan manfaat)." },
    { id: "P046", text: "Saya seorang yang suka berbincang-bincang." },
    { id: "P47R", text: "Saya seorang yang dapat mengabaikan dan tidak peduli pada kondisi orang lain." },
    { id: "P48R", text: "Saya seorang yang dapat membiarkan kekacauan, tidak menjaga kerapian." },
    { id: "P49R", text: "Saya seorang yang jarang cemas atau takut." },
    { id: "P50R", text: "Saya seorang yang beranggapan bahwa puisi dan drama adalah hal yang membosankan." },
    { id: "P51R", text: "Saya seorang yang lebih suka membiarkan orang lain untuk mengambil keputusan." },
    { id: "P052", text: "Saya seorang yang sopan, santun terhadap orang lain." },
    { id: "P053", text: "Saya seorang yang gigih, menuntaskan pekerjaan." },
    { id: "P054", text: "Saya seorang yang sering mengalami depresi, merasa sedih." },
    { id: "P55R", text: "Saya seorang yang tidak suka berpikir abstrak (mendalam), lebih suka mencari solusi konkret (praktik)." },
    { id: "P056", text: "Saya seorang yang bersemangat tinggi." },
    { id: "P057", text: "Saya seorang yang berbaik sangka, berprasangka baik kepada orang lain." },
    { id: "P58R", text: "Saya seorang yang terkadang kurang bertanggungjawab." },
    { id: "P059", text: "Saya seorang yang temperamental, mudah tersinggung." },
    { id: "P060", text: "Saya seorang yang orisinal, mampu menghasilkan ide baru." }
];

// DOM Elements
const video = document.getElementById("webcam");
const cameraSelect = document.getElementById("camera-select");
const btnMirror = document.getElementById("btn-mirror");
const btnStartCapture = document.getElementById("btn-start-capture");
const btnRegenId = document.getElementById("btn-regen-id");
const biodataForm = document.getElementById("biodata-form");
const respondentIdInput = document.getElementById("responden-id");

const overlayRight = document.getElementById("overlay-right");
const overlayLeft = document.getElementById("overlay-left");
const statusToast = document.getElementById("status-toast");

// QC elements
const lightValEl = document.getElementById("light-val");
const lightProgressEl = document.getElementById("light-progress");
const lightStatusEl = document.getElementById("light-status");
const lightInstructionEl = document.getElementById("light-instruction");

// Dashboard/counter elements
const currentPhaseBadge = document.getElementById("current-phase-badge");
const circleProgress = document.getElementById("circle-progress");
const counterFraction = document.getElementById("counter-fraction");
const counterPct = document.getElementById("counter-pct");
const sessionInstructions = document.getElementById("session-instructions");
const backendFeedback = document.getElementById("backend-feedback");
const feedbackText = document.getElementById("feedback-text");

// Modal elements
const transitionModal = document.getElementById("transition-modal");
const btnTransitionNext = document.getElementById("btn-transition-next");
const successModal = document.getElementById("success-modal");
const btnResetApp = document.getElementById("btn-reset-app");
const summaryId = document.getElementById("summary-id");
const summaryNama = document.getElementById("summary-nama");

// Wizard Buttons
const btnBackToStep1 = document.getElementById("btn-back-to-step-1");
const btnGoToStep3 = document.getElementById("btn-go-to-step-3");
const btnBackToStep3 = document.getElementById("btn-back-to-step-3");
const btnSubmitAll = document.getElementById("btn-submit-all");
const chkEthicalConsent = document.getElementById("chk-ethical-consent");

// 1. Generate Automatic Respondent ID
function generateRespondentId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "PLM-";
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    respondentIdInput.value = result;
}

// 2. Camera Management
// 2. Camera Management
function stopCamera() {
    if (streamActive) {
        streamActive.getTracks().forEach(track => track.stop());
        streamActive = null;
    }
    if (qcTimer) {
        clearInterval(qcTimer);
        qcTimer = null;
    }
    video.srcObject = null;
    const testPreview = document.getElementById("webcam-test-preview");
    if (testPreview) {
        testPreview.srcObject = null;
    }
}

function resetCameraTestWidget() {
    const btnTestCamera = document.getElementById("btn-test-camera");
    const btnStopTestCamera = document.getElementById("btn-stop-test-camera");
    const testPreviewWrapper = document.getElementById("camera-test-preview-wrapper");
    const testIndicator = document.getElementById("camera-test-indicator");
    
    if (btnTestCamera) btnTestCamera.classList.remove("hidden");
    if (btnStopTestCamera) btnStopTestCamera.classList.add("hidden");
    if (testPreviewWrapper) testPreviewWrapper.classList.add("hidden");
    if (testIndicator) {
        testIndicator.className = "status-indicator red";
        testIndicator.textContent = "Kamera Nonaktif";
    }
}

async function initCamera(deviceId = null) {
    if (streamActive) {
        streamActive.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" },
        audio: false
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamActive = stream;
        
        const activeVideo = (currentStep === 1) ? document.getElementById("webcam-test-preview") : video;
        if (activeVideo) {
            activeVideo.srcObject = stream;
        }
        
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        if (settings.deviceId) {
            currentDeviceId = settings.deviceId;
        }

        const mirrorVideo = activeVideo || video;
        if (settings.facingMode === "user" || (settings.label && settings.label.toLowerCase().includes("front"))) {
            isMirrored = true;
            mirrorVideo.classList.add("mirrored");
        } else {
            isMirrored = false;
            mirrorVideo.classList.remove("mirrored");
        }

        await getCameraDevices();
        if (currentStep === 3) {
            startQCLoop();
        }
        
    } catch (err) {
        console.error("Gagal mendapatkan akses kamera: ", err);
        sessionInstructions.textContent = "Kamera tidak terdeteksi atau akses ditolak. Harap berikan izin kamera.";
        sessionInstructions.style.color = "var(--accent-red)";
        throw err;
    }
}

async function getCameraDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        
        cameraSelect.innerHTML = "";
        videoDevices.forEach(device => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || `Kamera ${cameraSelect.length + 1}`;
            if (device.deviceId === currentDeviceId) {
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Gagal mendata kamera: ", err);
    }
}

// 3. Real-time Quality Control (Luminance Calculation)
let qcTimer = null;
function startQCLoop() {
    if (qcTimer) clearInterval(qcTimer);

    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");

    qcTimer = setInterval(() => {
        if (!streamActive || video.paused || video.ended) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            let totalLuminance = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
            }
            
            currentLuminance = totalLuminance / (data.length / 4);
            updateLightingQC(currentLuminance);
            
        } catch (e) {
            // cross-origin protection
        }
    }, 100);
}

function updateLightingQC(luminance) {
    const lux = Math.round(luminance * 2.2);
    lightValEl.textContent = `${lux} lux`;
    
    const pct = Math.min(100, Math.max(0, (luminance / 255) * 100));
    lightProgressEl.style.width = `${pct}%`;

    if (luminance < 45) {
        isLightingOk = false;
        lightStatusEl.className = "status-indicator red";
        lightStatusEl.textContent = "Terlalu Gelap";
        lightInstructionEl.textContent = "Tambahkan pencahayaan lampu atau dekatkan ke sumber cahaya.";
        lightProgressEl.style.backgroundColor = "var(--accent-red)";
    } else if (luminance > 220) {
        isLightingOk = false;
        lightStatusEl.className = "status-indicator red";
        lightStatusEl.textContent = "Terlalu Terang";
        lightInstructionEl.textContent = "Backlight terdeteksi. Pindahkan posisi untuk menghindari cahaya langsung.";
        lightProgressEl.style.backgroundColor = "var(--accent-red)";
    } else {
        isLightingOk = true;
        lightStatusEl.className = "status-indicator green";
        lightStatusEl.textContent = "Cukup";
        lightInstructionEl.textContent = "Pencahayaan baik. Siluet telapak tangan dapat dipindai.";
        lightProgressEl.style.backgroundColor = "var(--accent-green)";
    }

    if (!isCapturing) {
        btnStartCapture.disabled = !isLightingOk;
    }
}

// 4. Capture & State Machine Logic
function startAcquisition() {
    if (isCapturing) return;
    
    isCapturing = true;
    btnStartCapture.disabled = true;
    backendFeedback.classList.add("hidden");
    statusToast.classList.remove("hidden");
    statusToast.textContent = `Memulai perekaman ${currentHand === "RIGHT" ? "Tangan Kanan" : "Tangan Kiri"}...`;
    
    // Trigger burst capture interval every 200ms
    captureInterval = setInterval(() => {
        captureAndSendFrame();
    }, 200);
}

async function captureAndSendFrame() {
    if (!isLightingOk) {
        backendFeedback.classList.remove("hidden");
        feedbackText.textContent = "Perekaman ditangguhkan: Kualitas cahaya buruk.";
        stopCaptureSession();
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    
    // Draw current frame from video to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 jpeg
    const base64Image = canvas.toDataURL("image/jpeg", 0.9);
    
    // Prepare metadata
    const idResponden = respondentIdInput.value;
    const namaResponden = document.getElementById("nama").value;
    const usiaResponden = parseInt(document.getElementById("usia").value) || 0;
    const genderResponden = document.querySelector('input[name="jenis-kelamin"]:checked')?.value || "";
    const pendidikanResponden = document.getElementById("pendidikan").value;
    const pekerjaanResponden = document.getElementById("bidang-pekerjaan").value;
    const akunMedsosResponden = parseInt(document.getElementById("jumlah-medsos").value) || 0;
    const penggunaanMedsosResponden = document.getElementById("penggunaan-medsos").value;
    
    const payload = {
        responden_id: idResponden,
        nama: namaResponden,
        usia: usiaResponden,
        jenis_kelamin: genderResponden,
        pendidikan: pendidikanResponden,
        bidang_pekerjaan: pekerjaanResponden,
        jumlah_akun_media_sosial: akunMedsosResponden,
        rata2_penggunaan_medsos: penggunaanMedsosResponden,
        orientasi_tangan: currentHand,
        mirrored: isMirrored,
        image: base64Image
    };
    
    try {
        const response = await fetch("/upload-frame", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === "success") {
            backendFeedback.classList.add("hidden");
            updateProgressUI(data.counter);
            showCameraGuidance("✓ Pindai Berhasil! Tahan Posisi...", true);
            
            if (data.landmarks) {
                drawBoundingBox(data.landmarks);
            }
            
            if (data.counter >= 25) {
                stopCaptureSession();
                handlePhaseTransition();
            }
        } else if (data.status === "reject") {
            backendFeedback.classList.remove("hidden");
            feedbackText.textContent = data.reason;
            showCameraGuidance(`⚠️ ${data.reason}`, false);
            hideBoundingBox();
        }

    } catch (err) {
        console.error("Gagal mengirim frame: ", err);
        backendFeedback.classList.remove("hidden");
        feedbackText.textContent = "Error komunikasi dengan server.";
    }
}

function stopCaptureSession() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    isCapturing = false;
    statusToast.classList.add("hidden");
    hideBoundingBox();
    hideCameraGuidance();
    
    // Enable start capture if lighting is still OK
    btnStartCapture.disabled = !isLightingOk;
}

function handlePhaseTransition() {
    if (currentHand === "RIGHT") {
        setTimeout(() => {
            transitionModal.classList.remove("hidden");
        }, 500);
    } else {
        setTimeout(() => {
            goToStep(4);
        }, 500);
    }
}

function startLeftHandPhase() {
    transitionModal.classList.add("hidden");
    currentHand = "LEFT";
    
    overlayRight.classList.add("hidden");
    overlayLeft.classList.remove("hidden");
    
    currentPhaseBadge.textContent = "TANGAN KIRI";
    currentPhaseBadge.style.background = "linear-gradient(135deg, var(--accent-teal), var(--accent-green))";
    sessionInstructions.textContent = "Posisikan TANGAN KIRI Anda pada area overlay dan biarkan sistem memindai otomatis.";
    
    updateProgressUI(0);
}

function updateProgressUI(counter) {
    successfulFramesCount = counter;
    
    // Update Fraction Text
    counterFraction.textContent = `${counter}/25`;
    
    // Update Percentage Text
    const pct = Math.round((counter / 25) * 100);
    counterPct.textContent = `${pct}%`;
    
    // Update Circular Progress Bar stroke-dashoffset
    const r = 40;
    const circ = 2 * Math.PI * r; // 251.2
    const offset = circ - (pct / 100) * circ;
    circleProgress.style.strokeDashoffset = offset;
    
    // Update toast content
    statusToast.textContent = `Merekam ${currentHand === "RIGHT" ? "Tangan Kanan" : "Tangan Kiri"} (${counter}/25)`;
}

// 5. Multi-step Wizard Navigation Logic
function goToStep(step) {
    currentStep = step;
    
    // Toggle active panels and sidebar indicators
    for (let i = 1; i <= 4; i++) {
        const panel = document.getElementById(`step-${i}-panel`);
        const indicator = document.getElementById(`step-indicator-${i}`);
        
        if (i === step) {
            panel.classList.remove("hidden");
            indicator.className = "step-item active";
        } else {
            panel.classList.add("hidden");
            if (i < step) {
                indicator.className = "step-item done";
            } else {
                indicator.className = "step-item";
            }
        }
    }

    // Camera auto lifecycle management
    if (step === 3) {
        // Step 3: Palmprint recording -> auto-start camera
        initCamera();
    } else {
        // Other steps -> auto-stop camera
        stopCamera();
        if (step !== 1) {
            resetCameraTestWidget();
        }
    }

    // Scroll to top of workspace
    document.querySelector(".workspace").scrollTop = 0;
}

// 6. BFI-60 Dynamic Renderer & Progress Tracker
function renderBfiQuestions() {
    const listEl = document.getElementById("bfi-questions-list");
    listEl.innerHTML = "";
    
    bfiQuestions.forEach((q, idx) => {
        const qNum = idx + 1;
        const itemEl = document.createElement("div");
        itemEl.className = "bfi-question-item";
        itemEl.id = `bfi-q-${q.id}`;
        
        itemEl.innerHTML = `
            <div class="bfi-question-num">${qNum}.</div>
            <div class="bfi-question-text">${q.text} <span style="color: rgba(255,255,255,0.3); font-size: 0.72rem;">(${q.id})</span></div>
            <div class="bfi-radio-group">
                ${[1, 2, 3, 4, 5].map(val => `
                    <label class="bfi-radio-wrapper">
                        <input type="radio" name="bfi_${q.id}" value="${val}">
                        <span class="bfi-radio-val">${val}</span>
                    </label>
                `).join("")}
            </div>
        `;
        
        listEl.appendChild(itemEl);
        
        // Add event listener to radios
        const radios = itemEl.querySelectorAll(`input[name="bfi_${q.id}"]`);
        radios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                bfiAnswers[q.id] = parseInt(e.target.value);
                itemEl.classList.add("answered");
                updateBfiProgress();
            });
        });
    });
}

function updateBfiProgress() {
    const total = bfiQuestions.length;
    const answered = Object.keys(bfiAnswers).length;
    const pct = Math.round((answered / total) * 100);
    
    const progressText = document.getElementById("bfi-progress-text");
    const progressFill = document.getElementById("bfi-progress-fill");
    
    progressText.textContent = `${answered} dari ${total} terjawab (${pct}%)`;
    progressFill.style.width = `${pct}%`;
    
    btnGoToStep3.disabled = (answered !== total);
}

// 7. Submit All Survey & Reset
async function submitFinalSurvey() {
    const idResponden = respondentIdInput.value;
    const namaResponden = document.getElementById("nama").value;
    const usiaResponden = parseInt(document.getElementById("usia").value) || 0;
    const genderResponden = document.querySelector('input[name="jenis-kelamin"]:checked')?.value || "";
    const pendidikanResponden = document.getElementById("pendidikan").value;
    const pekerjaanResponden = document.getElementById("bidang-pekerjaan").value;
    const akunMedsosResponden = parseInt(document.getElementById("jumlah-medsos").value) || 0;
    const penggunaanMedsosResponden = document.getElementById("penggunaan-medsos").value;
    const ethicalConsent = chkEthicalConsent.checked;
    
    const oceanScores = calculateOceanScores(bfiAnswers);
    
    const payload = {
        responden_id: idResponden,
        nama: namaResponden,
        usia: usiaResponden,
        jenis_kelamin: genderResponden,
        pendidikan: pendidikanResponden,
        bidang_pekerjaan: pekerjaanResponden,
        jumlah_akun_media_sosial: akunMedsosResponden,
        rata2_penggunaan_medsos: penggunaanMedsosResponden,
        bfi_answers: bfiAnswers,
        ethical_clearance: ethicalConsent,
        score_o: oceanScores.o,
        score_c: oceanScores.c,
        score_e: oceanScores.e,
        score_a: oceanScores.a,
        score_n: oceanScores.n
    };

    try {
        btnSubmitAll.disabled = true;
        btnSubmitAll.textContent = "Mengirim...";
        
        const response = await fetch("/submit-survey", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === "success") {
            // Render the radar spider chart in modal
            renderOceanChart(oceanScores);
            
            // Show finished success modal
            summaryId.textContent = idResponden;
            summaryNama.textContent = namaResponden;
            successModal.classList.remove("hidden");
        } else {
            alert("Gagal mengirim kuesioner. Harap coba lagi.");
            btnSubmitAll.disabled = false;
            btnSubmitAll.textContent = "Kirim & Selesaikan Sesi";
        }
    } catch (e) {
        console.error("Gagal mengirim survey:", e);
        alert("Gagal terhubung ke server kuesioner.");
        btnSubmitAll.disabled = false;
        btnSubmitAll.textContent = "Kirim & Selesaikan Sesi";
    }
}

function resetApplication() {
    // Reset forms & data states
    biodataForm.reset();
    bfiAnswers = {};
    chkEthicalConsent.checked = false;
    btnSubmitAll.disabled = true;
    btnSubmitAll.textContent = "Kirim & Selesaikan Sesi";
    btnGoToStep3.disabled = true;
    
    // Reset wizard progression UI
    updateBfiProgress();
    renderBfiQuestions();
    
    // Hide modals
    successModal.classList.add("hidden");
    transitionModal.classList.add("hidden");
    
    // Reset camera capture states
    currentHand = "RIGHT";
    overlayRight.classList.remove("hidden");
    overlayLeft.classList.add("hidden");
    
    currentPhaseBadge.textContent = "TANGAN KANAN";
    currentPhaseBadge.style.background = "linear-gradient(135deg, var(--accent-blue), var(--accent-teal))";
    sessionInstructions.textContent = "Posisikan TANGAN KANAN Anda pada area overlay dan biarkan sistem memindai otomatis.";
    updateProgressUI(0);
    
    backendFeedback.classList.add("hidden");
    
    // Generate new ID and go back to step 1
    generateRespondentId();
    goToStep(1);
}

// 8. Bounding Box Overlay Drawing helpers
function drawBoundingBox(landmarks) {
    if (!landmarks || landmarks.length === 0) {
        hideBoundingBox();
        return;
    }
    
    const bboxEl = document.getElementById("hand-bbox");
    const videoWidth = video.clientWidth;
    const videoHeight = video.clientHeight;
    
    const xCoords = landmarks.map(lm => lm.x);
    const yCoords = landmarks.map(lm => lm.y);
    
    const xMin = Math.min(...xCoords);
    const xMax = Math.max(...xCoords);
    const yMin = Math.min(...yCoords);
    const yMax = Math.max(...yCoords);
    
    let left, width;
    if (isMirrored) {
        left = videoWidth * (1 - xMax);
        width = videoWidth * (xMax - xMin);
    } else {
        left = videoWidth * xMin;
        width = videoWidth * (xMax - xMin);
    }
    
    const top = videoHeight * yMin;
    const height = videoHeight * (yMax - yMin);
    
    bboxEl.style.left = `${left}px`;
    bboxEl.style.top = `${top}px`;
    bboxEl.style.width = `${width}px`;
    bboxEl.style.height = `${height}px`;
    bboxEl.classList.remove("hidden");
}

function hideBoundingBox() {
    const bboxEl = document.getElementById("hand-bbox");
    if (bboxEl) {
        bboxEl.classList.add("hidden");
    }
}

function showCameraGuidance(text, isOk = false) {
    const guidanceEl = document.getElementById("camera-guidance");
    if (!guidanceEl) return;
    
    guidanceEl.textContent = text;
    if (isOk) {
        guidanceEl.classList.add("ok");
    } else {
        guidanceEl.classList.remove("ok");
    }
    guidanceEl.classList.remove("hidden");
}

function hideCameraGuidance() {
    const guidanceEl = document.getElementById("camera-guidance");
    if (guidanceEl) {
        guidanceEl.classList.add("hidden");
    }
}

// 9. Event Listeners Setup
document.addEventListener("DOMContentLoaded", () => {
    generateRespondentId();
    renderBfiQuestions();

    btnRegenId.addEventListener("click", generateRespondentId);

    // Camera test controls for Step 1
    const btnTestCamera = document.getElementById("btn-test-camera");
    const btnStopTestCamera = document.getElementById("btn-stop-test-camera");
    const testPreviewWrapper = document.getElementById("camera-test-preview-wrapper");
    const testIndicator = document.getElementById("camera-test-indicator");

    if (btnTestCamera) {
        btnTestCamera.addEventListener("click", async () => {
            btnTestCamera.disabled = true;
            btnTestCamera.textContent = "Mengaktifkan...";
            try {
                await initCamera();
                btnTestCamera.classList.add("hidden");
                btnStopTestCamera.classList.remove("hidden");
                testPreviewWrapper.classList.remove("hidden");
                testIndicator.className = "status-indicator green";
                testIndicator.textContent = "Kamera Aktif";
            } catch (err) {
                console.error(err);
                testIndicator.className = "status-indicator red";
                testIndicator.textContent = "Gagal Mengakses";
            } finally {
                btnTestCamera.disabled = false;
                btnTestCamera.textContent = "Uji Kamera";
            }
        });
    }

    if (btnStopTestCamera) {
        btnStopTestCamera.addEventListener("click", () => {
            stopCamera();
            btnStopTestCamera.classList.add("hidden");
            btnTestCamera.classList.remove("hidden");
            testPreviewWrapper.classList.add("hidden");
            testIndicator.className = "status-indicator red";
            testIndicator.textContent = "Kamera Nonaktif";
        });
    }

    cameraSelect.addEventListener("change", (e) => {
        initCamera(e.target.value);
    });

    btnMirror.addEventListener("click", () => {
        isMirrored = !isMirrored;
        if (isMirrored) {
            video.classList.add("mirrored");
        } else {
            video.classList.remove("mirrored");
        }
    });

    // Step 1 Submit
    biodataForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // Go to BFI-60 questionnaire
        goToStep(2);
    });

    // Step 2 Back & Next
    btnBackToStep1.addEventListener("click", () => {
        goToStep(1);
    });
    btnGoToStep3.addEventListener("click", () => {
        goToStep(3);
    });

    // Step 3 Capture Trigger
    btnStartCapture.addEventListener("click", () => {
        startAcquisition();
    });

    // Step 4 Back & Submit
    btnBackToStep3.addEventListener("click", () => {
        goToStep(3);
    });
    
    chkEthicalConsent.addEventListener("change", (e) => {
        btnSubmitAll.disabled = !e.target.checked;
    });

    btnSubmitAll.addEventListener("click", () => {
        submitFinalSurvey();
    });

    // Admin Export CSV with password prompt
    const btnExportCsv = document.getElementById("btn-export-csv");
    if (btnExportCsv) {
        btnExportCsv.addEventListener("click", (e) => {
            e.preventDefault();
            const pw = prompt("Masukkan password administrator untuk mengunduh berkas survei:");
            if (pw) {
                window.location.href = `/export-survey?password=${encodeURIComponent(pw)}`;
            }
        });
    }

    // Admin Export Image ZIP with password prompt
    const btnExportImages = document.getElementById("btn-export-images");
    if (btnExportImages) {
        btnExportImages.addEventListener("click", (e) => {
            e.preventDefault();
            const pw = prompt("Masukkan password administrator untuk mengunduh arsip gambar:");
            if (pw) {
                window.location.href = `/export-images?password=${encodeURIComponent(pw)}`;
            }
        });
    }

    // Modal Transition buttons
    btnTransitionNext.addEventListener("click", startLeftHandPhase);
    btnResetApp.addEventListener("click", resetApplication);
});

// 10. OCEAN Score Calculation & Radar Chart Rendering
function calculateOceanScores(answers) {
    const reverseKeys = new Set([
        "P11R", "P16R", "P26R", "P31R", "P36R", "P51R",
        "P12R", "P17R", "P22R", "P37R", "P042R", "P47R",
        "P03R", "P08R", "P23R", "P28R", "P48R", "P58R",
        "P04R", "P09R", "P24R", "P29R", "P44R", "P49R",
        "P05R", "P25R", "P30R", "P45R", "P50R", "P55R"
    ]);

    const getScore = (key) => {
        const val = answers[key] || 3;
        return reverseKeys.has(key) ? (6 - val) : val;
    };

    const e_items = ["P001", "P006", "P11R", "P16R", "P021", "P26R", "P31R", "P36R", "P041", "P046", "P51R", "P056"];
    const a_items = ["P002", "P007", "P12R", "P17R", "P22R", "P027", "P032", "P37R", "P042R", "P47R", "P052", "P057"];
    const c_items = ["P03R", "P08R", "P013", "P018", "P23R", "P28R", "P033", "P038", "P043", "P48R", "P053", "P58R"];
    const n_items = ["P04R", "P09R", "P014", "P019", "P24R", "P29R", "P034", "P039", "P44R", "P49R", "P054", "P059"];
    const o_items = ["P05R", "P010", "P015", "P020", "P25R", "P30R", "P035", "P040", "P45R", "P50R", "P55R", "P060"];

    const sum = (arr) => arr.reduce((acc, k) => acc + getScore(k), 0);

    return {
        o: parseFloat((sum(o_items) / 12).toFixed(2)),
        c: parseFloat((sum(c_items) / 12).toFixed(2)),
        e: parseFloat((sum(e_items) / 12).toFixed(2)),
        a: parseFloat((sum(a_items) / 12).toFixed(2)),
        n: parseFloat((sum(n_items) / 12).toFixed(2))
    };
}

function renderOceanChart(scores) {
    const canvasEl = document.getElementById("ocean-chart");
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    
    if (oceanChartInstance) {
        oceanChartInstance.destroy();
    }
    
    const oceanDataLabelsPlugin = {
        id: 'oceanDataLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value !== undefined && value !== null) {
                        ctx.save();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 12px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(Number(value).toFixed(2), element.x, element.y - 6);
                        ctx.restore();
                    }
                });
            });
        }
    };

    oceanChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'Pikiran Terbuka (O)',
                'Kehati-hatian (C)',
                'Ekstraversi (E)',
                'Keramahan (A)',
                'Emosi Negatif (N)'
            ],
            datasets: [{
                label: 'Skor OCEAN',
                data: [scores.o, scores.c, scores.e, scores.a, scores.n],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.75)',
                    'rgba(16, 185, 129, 0.75)',
                    'rgba(245, 158, 11, 0.75)',
                    'rgba(139, 92, 246, 0.75)',
                    'rgba(239, 68, 68, 0.75)'
                ],
                borderColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        plugins: [oceanDataLabelsPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 25,
                    left: 5,
                    right: 5,
                    bottom: 5
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter',
                            size: 10,
                            weight: '600'
                        }
                    }
                },
                y: {
                    min: 0,
                    max: 5.5,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        stepSize: 1,
                        callback: function(value) {
                            return value <= 5 ? value : '';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Skor: ${Number(context.raw).toFixed(2)} / 5.00`;
                        }
                    }
                }
            }
        }
    });

    const badgesEl = document.getElementById("ocean-score-badges");
    if (badgesEl) {
        const aspects = [
            { key: 'O', name: 'Openness', score: scores.o, color: '#3b82f6' },
            { key: 'C', name: 'Conscientiousness', score: scores.c, color: '#10b981' },
            { key: 'E', name: 'Extraversion', score: scores.e, color: '#f59e0b' },
            { key: 'A', name: 'Agreeableness', score: scores.a, color: '#8b5cf6' },
            { key: 'N', name: 'Neuroticism', score: scores.n, color: '#ef4444' }
        ];
        badgesEl.innerHTML = aspects.map(a => `
            <div class="ocean-badge-item" style="border-left: 3px solid ${a.color};">
                <span>${a.key}:</span>
                <span class="ocean-badge-val">${Number(a.score).toFixed(2)}</span>
            </div>
        `).join('');
    }
}
