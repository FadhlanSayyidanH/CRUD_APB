import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    onSnapshot,
    deleteDoc,
    updateDoc,
    serverTimestamp
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
const absensiCollection = collection(db, "Absensi");

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

// DOM Elements
const absensiForm = document.getElementById("absensi-form");
const absIdInput = document.getElementById("absensi-id");
const absNimInput = document.getElementById("abs-nim");
const absKodeMKInput = document.getElementById("abs-kodemk");
const absStatusSelect = document.getElementById("abs-status");
const btnAction = document.getElementById("btn-action");
const tableBody = document.getElementById("absensi-table-body");

// READ: Menampilkan List Absensi secara Realtime
onSnapshot(absensiCollection, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.docs.forEach((document) => {
        const data = document.data();
        const id = document.id;

        let waktuFormat = "Memproses...";
        if (data.WaktuAbsen) {
            const dateObj = data.WaktuAbsen.toDate();
            waktuFormat = dateObj.toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        }

        const tr = window.document.createElement("tr");
        tr.innerHTML = `
            <td>${data.NIM || '-'}</td>
            <td><mark><strong>${data.KodeMK || '-'}</strong></mark></td>
            <td><strong>${data.StatusKehadiran || '-'}</strong></td>
            <td>${waktuFormat}</td>
            <td>
                <button class="btn-edit" data-id="${id}" data-nim="${data.NIM}" data-kodemk="${data.KodeMK}" data-status="${data.StatusKehadiran}">Edit</button>
                <button class="btn-delete" data-id="${id}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
});

// CREATE & UPDATE
absensiForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = absIdInput.value;
    const currentNim = absNimInput.value.trim();
    const currentKodeMK = absKodeMKInput.value.trim();
    const currentStatus = absStatusSelect.value;

    try {
        if (id === "") {
            await addDoc(absensiCollection, {
                NIM: currentNim,
                KodeMK: currentKodeMK,
                StatusKehadiran: currentStatus,
                WaktuAbsen: serverTimestamp()
            });
        } else {
            const docRef = doc(db, "Absensi", id);
            await updateDoc(docRef, {
                NIM: currentNim,
                KodeMK: currentKodeMK,
                StatusKehadiran: currentStatus
            });

            absIdInput.value = "";
            btnAction.innerText = "Submit Absen";
            btnAction.style.backgroundColor = "#2ecc71";
        }
        absensiForm.reset();
    } catch (error) {
        alert("Gagal memproses absensi: " + error.message);
    }
});

// DELETE & PERSIAPAN UPDATE
tableBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-id");

    if (e.target.classList.contains("btn-delete")) {
        if (confirm("Apakah Anda yakin ingin menghapus catatan absensi ini?")) {
            const docRef = doc(db, "Absensi", id);
            await deleteDoc(docRef);
        }
    }

    if (e.target.classList.contains("btn-edit")) {
        absIdInput.value = id;
        absNimInput.value = e.target.getAttribute("data-nim");
        absKodeMKInput.value = e.target.getAttribute("data-kodemk");
        absStatusSelect.value = e.target.getAttribute("data-status");

        btnAction.innerText = "Update Absen";
        btnAction.style.backgroundColor = "#3498db";
    }
});
