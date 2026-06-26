import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    onSnapshot,
    deleteDoc,
    updateDoc,
    query,
    where,
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
const dosenCollection = collection(db, "Dosen");

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
const dosenForm = document.getElementById("dosen-form");
const dosenUsernameInput = document.getElementById("dosen-username");
const dosenPasswordInput = document.getElementById("dosen-password");
const btnAction = document.getElementById("btn-action");
const tableBody = document.getElementById("dosen-table-body");

let editDocId = null;

// READ: Menampilkan data dosen secara realtime
onSnapshot(dosenCollection, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <strong>${data.Username || '-'}</strong>
                <span class="badge-id">${id}</span>
            </td>
            <td><code>${data.Password || '-'}</code></td>
            <td>
                <button class="btn-edit"
                    data-id="${id}"
                    data-username="${data.Username || ''}"
                    data-password="${data.Password || ''}">Edit</button>
                <button class="btn-delete" data-id="${id}" data-username="${data.Username || ''}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
});

// CREATE & UPDATE
dosenForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = dosenUsernameInput.value.trim();
    const password = dosenPasswordInput.value.trim();

    if (!username || !password) return;

    try {
        if (editDocId === null) {
            // CREATE: Cek duplikat username sebelum simpan
            const qCheck = query(dosenCollection, where("Username", "==", username));
            const existing = await getDocs(qCheck);

            if (!existing.empty) {
                alert(`Gagal! Username "${username}" sudah digunakan.`);
                return;
            }

            await addDoc(dosenCollection, { Username: username, Password: password });
            alert("Data dosen berhasil ditambahkan!");

        } else {
            // UPDATE
            const docRef = doc(db, "Dosen", editDocId);
            await updateDoc(docRef, { Username: username, Password: password });

            editDocId = null;
            btnAction.innerText = "Simpan";
            btnAction.style.backgroundColor = "#2ecc71";
            dosenUsernameInput.disabled = false;
            alert("Data dosen berhasil diperbarui!");
        }

        dosenForm.reset();
    } catch (error) {
        alert("Gagal memproses data: " + error.message);
    }
});

// DELETE & PERSIAPAN EDIT
tableBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-id");

    if (e.target.classList.contains("btn-delete")) {
        const username = e.target.getAttribute("data-username");
        if (confirm(`Hapus dosen "${username}"? Pastikan tidak ada jadwal terkait.`)) {
            try {
                await deleteDoc(doc(db, "Dosen", id));
            } catch (error) {
                alert("Gagal menghapus: " + error.message);
            }
        }
    }

    if (e.target.classList.contains("btn-edit")) {
        editDocId = id;
        dosenUsernameInput.value = e.target.getAttribute("data-username");
        dosenUsernameInput.disabled = true;
        dosenPasswordInput.value = e.target.getAttribute("data-password");

        btnAction.innerText = "Update";
        btnAction.style.backgroundColor = "#3498db";
        dosenUsernameInput.scrollIntoView({ behavior: "smooth" });
    }
});
