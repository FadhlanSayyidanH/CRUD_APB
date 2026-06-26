import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtKK5R5L8Xmi-AFhQTReaUEoroMJfQEE8",
    authDomain: "apb-tubes.firebaseapp.com",
    databaseURL: "https://apb-tubes-default-rtdb.firebaseio.com",
    projectId: "apb-tubes",
    storageBucket: "apb-tubes.firebasestorage.app",
    messagingSenderId: "462120804276",
    appId: "1:462120804276:web:e6432765b9fa591e825ce1",
    measurementId: "G-EV8V3DKH2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Auth guard
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.replace("login.html");
    throw new Error("Not authenticated");
}
if (currentUser.role === "admin") {
    window.location.replace("index.html");
    throw new Error("Admin redirect");
}

document.getElementById("nav-username").textContent = currentUser.username;
document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
});

const formatDate = (ts) => {
    if (!ts) return "-";
    return ts.toDate().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

// Load jadwal milik dosen yang login
const jadwalList = document.getElementById("jadwal-list");
const qJadwal = query(
    collection(db, "JadwalKelas"),
    where("KodeDosen", "==", currentUser.username)
);

onSnapshot(qJadwal, (snapshot) => {
    jadwalList.innerHTML = "";

    if (snapshot.empty) {
        jadwalList.innerHTML = `
            <div class="empty-state">
                <p>Tidak ada jadwal mengajar untuk akun <strong>${currentUser.username}</strong>.</p>
            </div>`;
        return;
    }

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const card = document.createElement("div");
        card.className = "jadwal-card";
        card.innerHTML = `
            <div class="jadwal-info">
                <h4>
                    ${data.Nama || '-'}
                    <span class="kode-badge">${id}</span>
                </h4>
                <div class="jadwal-meta">
                    <span>Ruangan: ${data.Ruangan || '-'}</span>
                    <span>Paket MK: ${data.PaketMK || '-'}</span>
                    <span>Prodi: ${data.KodeFakultasProdi || '-'}</span>
                    <span>Masuk: ${formatDate(data.JadwalMasuk)}</span>
                    <span>Selesai: ${formatDate(data.JadwalSelesai)}</span>
                </div>
            </div>
            <div class="jadwal-actions">
                <button class="btn-mhs">Lihat Mahasiswa</button>
                <button class="btn-qr">Generate QR</button>
            </div>
        `;

        card.querySelector(".btn-qr").addEventListener("click", () => {
            openQR(id, data.Nama || id);
        });
        card.querySelector(".btn-mhs").addEventListener("click", () => {
            openMhs(data.PaketMK || "", data.Nama || "");
        });

        jadwalList.appendChild(card);
    });
});

// ===== QR Modal =====
function openQR(kodeJadwal, namaMK) {
    document.getElementById("qr-modal").classList.add("active");
    document.getElementById("qr-kode-text").textContent = kodeJadwal;
    document.getElementById("qr-modal-subtitle").textContent = namaMK;

    const qrCanvas = document.getElementById("qr-canvas");
    qrCanvas.innerHTML = "";

    new QRCode(qrCanvas, {
        text: kodeJadwal,
        width: 220,
        height: 220,
        colorDark: "#2c3e50",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

document.getElementById("btn-close-qr").addEventListener("click", closeQR);
document.getElementById("btn-close-qr2").addEventListener("click", closeQR);
document.getElementById("qr-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeQR();
});

function closeQR() {
    document.getElementById("qr-modal").classList.remove("active");
}

document.getElementById("btn-print-qr").addEventListener("click", () => {
    const kode = document.getElementById("qr-kode-text").textContent;
    const namaMK = document.getElementById("qr-modal-subtitle").textContent;
    const canvas = document.getElementById("qr-canvas").querySelector("canvas");
    if (!canvas) { alert("QR belum siap, coba lagi."); return; }

    const imgSrc = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    win.document.write(`
        <!DOCTYPE html>
        <html><head>
            <title>QR Absensi - ${kode}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 40px; }
                h2 { color: #2c3e50; margin-bottom: 6px; }
                .subtitle { color: #555; margin-bottom: 20px; font-size: 15px; }
                img { display: block; margin: 0 auto 16px; width: 250px; height: 250px; }
                .kode { font-size: 24px; font-weight: 700; color: #2c3e50; letter-spacing: 3px; }
            </style>
        </head><body>
            <h2>QR Code Absensi</h2>
            <p class="subtitle">${namaMK}</p>
            <img src="${imgSrc}">
            <p class="kode">${kode}</p>
            <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body></html>
    `);
    win.document.close();
});

// ===== Mahasiswa Modal =====
async function openMhs(paketMK, namaMK) {
    document.getElementById("mhs-modal").classList.add("active");
    document.getElementById("mhs-modal-subtitle").textContent = `${namaMK} — Paket MK: ${paketMK}`;

    const tableBody = document.getElementById("mhs-table-body");
    tableBody.innerHTML = `<tr><td colspan="3" class="center-cell">Memuat data mahasiswa...</td></tr>`;

    if (!paketMK) {
        tableBody.innerHTML = `<tr><td colspan="3" class="center-cell">Paket MK tidak tersedia.</td></tr>`;
        return;
    }

    try {
        const qMhs = query(collection(db, "MHS"), where("PaketMK", "==", paketMK));
        const snapshot = await getDocs(qMhs);

        tableBody.innerHTML = "";
        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="3" class="center-cell">Tidak ada mahasiswa untuk paket MK ini.</td></tr>`;
            return;
        }

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${docSnap.id}</td>
                <td>${data.Nama || '-'}</td>
                <td>${data.Email || '-'}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="3" class="center-cell" style="color:#e74c3c;">Gagal memuat: ${err.message}</td></tr>`;
    }
}

document.getElementById("btn-close-mhs").addEventListener("click", closeMhs);
document.getElementById("btn-close-mhs2").addEventListener("click", closeMhs);
document.getElementById("mhs-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeMhs();
});

function closeMhs() {
    document.getElementById("mhs-modal").classList.remove("active");
}
