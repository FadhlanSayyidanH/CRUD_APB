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

// Konfigurasi Resmi Proyek APB TUBES Anda
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

// Menargetkan koleksi: "JadwalKelas"
const jadwalCollection = collection(db, "JadwalKelas");

// DOM Elements
const jadwalForm = document.getElementById("jadwal-form");
const jkIdInput = document.getElementById("jk-id");
const jkNamaInput = document.getElementById("jk-nama");
const jkProdiInput = document.getElementById("jk-prodi");
const jkPaketInput = document.getElementById("jk-paket");
const jkRuanganInput = document.getElementById("jk-ruangan");
const jkWaktuMasukInput = document.getElementById("jk-waktu-masuk");     // <-- Update ID Masuk
const jkWaktuSelesaiInput = document.getElementById("jk-waktu-selesai"); // <-- Tambah ID Selesai
const btnAction = document.getElementById("btn-action");
const tableBody = document.getElementById("jadwal-table-body");

let isEditMode = false;

// Fungsi pembantu untuk memformat Timestamp Firestore ke String ISO lokal (Yyyy-MM-ddThh:mm)
const convertToISOString = (timestampData) => {
    if (!timestampData) return "";
    const dateObj = timestampData.toDate();
    return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// Fungsi pembantu untuk memformat tampilan teks tanggal di tabel (id-ID)
const convertToLocaleDisplay = (timestampData) => {
    if (!timestampData) return "-";
    const dateObj = timestampData.toDate();
    return dateObj.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

// 1. READ: Menampilkan Jadwal secara Realtime
onSnapshot(jadwalCollection, (snapshot) => {
    tableBody.innerHTML = "";
    
    snapshot.docs.forEach((document) => {
        const data = document.data();
        const id = document.id; 

        // Pemrosesan konversi waktu untuk tampilan tabel dan parsing data edit
        const masukDisplay = convertToLocaleDisplay(data.JadwalMasuk);
        const selesaiDisplay = convertToLocaleDisplay(data.JadwalSelesai);
        
        const masukISO = convertToISOString(data.JadwalMasuk);
        const selesaiISO = convertToISOString(data.JadwalSelesai);

        const tr = window.document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${id}</strong></td>
            <td>${data.Nama || '-'}</td>
            <td>${data.KodeFakultasProdi || '-'}</td> <td>${data.PaketMK || '-'}</td>
            <td>${data.Ruangan || '-'}</td>
            <td>${masukDisplay}</td>
            <td>${selesaiDisplay}</td>
            <td>
                <button class="btn-edit" 
                    data-id="${id}" 
                    data-nama="${data.Nama || ''}" 
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

// 2. CREATE & UPDATE: Simpan / Edit Jadwal
jadwalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const kodeJadwal = jkIdInput.value.trim();
    
    // Mengonversi input datetime-local HTML ke Format Timestamp Firestore
    const tsMasuk = Timestamp.fromDate(new Date(jkWaktuMasukInput.value));
    const tsSelesai = Timestamp.fromDate(new Date(jkWaktuSelesaiInput.value));

    // --- PERBAIKAN DI SINI: Tambahkan KodeFakultasProdi ---
    const jadwalData = {
        Nama: jkNamaInput.value,
        KodeFakultasProdi: jkProdiInput.value, // <-- Menangkap data dari input prodi
        PaketMK: jkPaketInput.value,
        Ruangan: jkRuanganInput.value,
        JadwalMasuk: tsMasuk,
        JadwalSelesai: tsSelesai
    };

    try {
        if (!isEditMode) {
            // MODE CREATE: Validasi Kode Jadwal duplikat sebelum simpan
            const docRef = doc(db, "JadwalKelas", kodeJadwal);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                alert(`Gagal! Kode Jadwal ${kodeJadwal} sudah digunakan di database.`);
                return; 
            }

            await setDoc(docRef, jadwalData);
            alert("Jadwal baru berhasil ditambahkan!");
            
        } else {
            // MODE UPDATE: Memperbarui data jadwal lama
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

// 3. DELETE & PERSIAPAN UPDATE
tableBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-id");

    // Aksi Hapus
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

    // Aksi Persiapan Edit
    if (e.target.classList.contains("btn-edit")) {
        jkIdInput.value = id;
        jkIdInput.disabled = true; 
        
        jkNamaInput.value = e.target.getAttribute("data-nama");
        // --- PERBAIKAN DI SINI: Masukkan data prodi ke input form ---
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
