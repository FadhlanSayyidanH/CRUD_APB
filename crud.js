import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc,
    updateDoc
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
const mhsCollection = collection(db, "MHS");

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
const mhsForm = document.getElementById("mhs-form");
const mhsIdInput = document.getElementById("mhs-id");
const mhsNamaInput = document.getElementById("mhs-nama");
const mhsPaketInput = document.getElementById("mhs-paket");
const mhsEmailInput = document.getElementById("mhs-email");
const mhsPasswordInput = document.getElementById("mhs-password");
const btnAction = document.getElementById("btn-action");
const tableBody = document.getElementById("mhs-table-body");

let isEditMode = false;

// READ: Menampilkan Data Mahasiswa Secara Realtime
onSnapshot(mhsCollection, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.docs.forEach((document) => {
        const data = document.data();
        const id = document.id;

        const tr = window.document.createElement("tr");
        tr.innerHTML = `
            <td>${id}</td>
            <td>${data.Nama || '-'}</td>
            <td>${data.PaketMK || '-'}</td>
            <td>${data.Email || '-'}</td>
            <td><code>${data.Password || '-'}</code></td>
            <td>
                <button class="btn-edit"
                    data-id="${id}"
                    data-nama="${data.Nama || ''}"
                    data-paket="${data.PaketMK || ''}"
                    data-email="${data.Email || ''}"
                    data-password="${data.Password || ''}">Edit</button>
                <button class="btn-delete" data-id="${id}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
});

// CREATE & UPDATE
mhsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nim = mhsIdInput.value.trim();

    const mhsData = {
        Nama: mhsNamaInput.value,
        PaketMK: mhsPaketInput.value,
        Email: mhsEmailInput.value,
        Password: mhsPasswordInput.value
    };

    try {
        if (!isEditMode) {
            const docRef = doc(db, "MHS", nim);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                alert(`Gagal! Mahasiswa dengan NIM ${nim} sudah terdaftar di database.`);
                return;
            }

            await setDoc(docRef, mhsData);
            alert("Data mahasiswa berhasil ditambahkan!");

        } else {
            const docRef = doc(db, "MHS", nim);
            await updateDoc(docRef, mhsData);

            isEditMode = false;
            mhsIdInput.disabled = false;
            btnAction.innerText = "Simpan";
            btnAction.style.backgroundColor = "#2ecc71";
            alert("Data mahasiswa berhasil diperbarui!");
        }
        mhsForm.reset();
    } catch (error) {
        alert("Gagal memproses data: " + error.message);
    }
});

// DELETE & PERSIAPAN UPDATE
tableBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-id");

    if (e.target.classList.contains("btn-delete")) {
        if (confirm(`Apakah Anda yakin ingin menghapus mahasiswa dengan NIM ${id}?`)) {
            try {
                const docRef = doc(db, "MHS", id);
                await deleteDoc(docRef);
            } catch (error) {
                alert("Gagal menghapus: " + error.message);
            }
        }
    }

    if (e.target.classList.contains("btn-edit")) {
        mhsIdInput.value = id;
        mhsIdInput.disabled = true;
        mhsNamaInput.value = e.target.getAttribute("data-nama");
        mhsPaketInput.value = e.target.getAttribute("data-paket");
        mhsEmailInput.value = e.target.getAttribute("data-email");
        mhsPasswordInput.value = e.target.getAttribute("data-password");

        isEditMode = true;
        btnAction.innerText = "Update";
        btnAction.style.backgroundColor = "#3498db";
    }
});
