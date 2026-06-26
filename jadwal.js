import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc,
    updateDoc,
    Timestamp
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

// Auth guard - hanya admin yang boleh akses
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.replace("login.html");
    throw new Error("Not authenticated");
}
if (currentUser.role !== "admin") {
    window.location.replace("dosen.html");
    throw new Error("Not admin");
}

document.getElementById("nav-username").textContent = `Admin: ${currentUser.username}`;
document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
});

const jadwalCollection = collection(db, "JadwalKelas");

// DOM Elements
const jadwalForm = document.getElementById("jadwal-form");
const jkIdInput = document.getElementById("jk-id");
const jkNamaInput = document.getElementById("jk-nama");
const jkDosenInput = document.getElementById("jk-dosen");
const jkProdiInput = document.getElementById("jk-prodi");
const jkPaketInput = document.getElementById("jk-paket");
const jkRuanganInput = document.getElementById("jk-ruangan");
const jkWaktuMasukInput = document.getElementById("jk-waktu-masuk");
const jkWaktuSelesaiInput = document.getElementById("jk-waktu-selesai");
const btnAction = document.getElementById("btn-action");
const tableBody = document.getElementById("jadwal-table-body");

let isEditMode = false;

const convertToISOString = (timestampData) => {
    if (!timestampData) return "";
    const dateObj = timestampData.toDate();
    return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const convertToLocaleDisplay = (timestampData) => {
    if (!timestampData) return "-";
    const dateObj = timestampData.toDate();
    return dateObj.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

// READ: Menampilkan Jadwal secara Realtime
onSnapshot(jadwalCollection, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.docs.forEach((document) => {
        const data = document.data();
        const id = document.id;

        const masukDisplay = convertToLocaleDisplay(data.JadwalMasuk);
        const selesaiDisplay = convertToLocaleDisplay(data.JadwalSelesai);
        const masukISO = convertToISOString(data.JadwalMasuk);
        const selesaiISO = convertToISOString(data.JadwalSelesai);

        const tr = window.document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${id}</strong></td>
            <td>${data.Nama || '-'}</td>
            <td>${data.KodeDosen || '-'}</td>
            <td>${data.KodeFakultasProdi || '-'}</td>
            <td>${data.PaketMK || '-'}</td>
            <td>${data.Ruangan || '-'}</td>
            <td>${masukDisplay}</td>
            <td>${selesaiDisplay}</td>
            <td>
                <button class="btn-edit"
                    data-id="${id}"
                    data-nama="${data.Nama || ''}"
                    data-dosen="${data.KodeDosen || ''}"
                    data-prodi="${data.KodeFakultasProdi || ''}"
                    data-paket="${data.PaketMK || ''}"
                    data-ruangan="${data.Ruangan || ''}"
                    data-masuk="${masukISO}"
                    data-selesai="${selesaiISO}">Edit</button>
                <button class="btn-delete" data-id="${id}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
});

// CREATE & UPDATE
jadwalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const kodeJadwal = jkIdInput.value.trim();
    const tsMasuk = Timestamp.fromDate(new Date(jkWaktuMasukInput.value));
    const tsSelesai = Timestamp.fromDate(new Date(jkWaktuSelesaiInput.value));

    const jadwalData = {
        Nama: jkNamaInput.value,
        KodeDosen: jkDosenInput.value,
        KodeFakultasProdi: jkProdiInput.value,
        PaketMK: jkPaketInput.value,
        Ruangan: jkRuanganInput.value,
        JadwalMasuk: tsMasuk,
        JadwalSelesai: tsSelesai
    };

    try {
        if (!isEditMode) {
            const docRef = doc(db, "JadwalKelas", kodeJadwal);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                alert(`Gagal! Kode Jadwal ${kodeJadwal} sudah digunakan di database.`);
                return;
            }

            await setDoc(docRef, jadwalData);
            alert("Jadwal baru berhasil ditambahkan!");

        } else {
            const docRef = doc(db, "JadwalKelas", kodeJadwal);
            await updateDoc(docRef, jadwalData);

            isEditMode = false;
            jkIdInput.disabled = false;
            btnAction.innerText = "Simpan Jadwal";
            btnAction.style.backgroundColor = "#2ecc71";
            alert("Jadwal berhasil diperbarui!");
        }
        jadwalForm.reset();
    } catch (error) {
        alert("Gagal memproses data: " + error.message);
    }
});

// DELETE & PERSIAPAN UPDATE
tableBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-id");

    if (e.target.classList.contains("btn-delete")) {
        if (confirm(`Apakah Anda yakin menghapus kode jadwal ${id}?`)) {
            try {
                const docRef = doc(db, "JadwalKelas", id);
                await deleteDoc(docRef);
            } catch (error) {
                alert("Gagal menghapus: " + error.message);
            }
        }
    }

    if (e.target.classList.contains("btn-edit")) {
        jkIdInput.value = id;
        jkIdInput.disabled = true;
        jkNamaInput.value = e.target.getAttribute("data-nama");
        jkDosenInput.value = e.target.getAttribute("data-dosen");
        jkProdiInput.value = e.target.getAttribute("data-prodi");
        jkPaketInput.value = e.target.getAttribute("data-paket");
        jkRuanganInput.value = e.target.getAttribute("data-ruangan");
        jkWaktuMasukInput.value = e.target.getAttribute("data-masuk");
        jkWaktuSelesaiInput.value = e.target.getAttribute("data-selesai");

        isEditMode = true;
        btnAction.innerText = "Update Jadwal";
        btnAction.style.backgroundColor = "#3498db";
    }
});
