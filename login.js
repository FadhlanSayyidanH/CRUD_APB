import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
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

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Jika sudah login, langsung redirect
const existingUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (existingUser) {
    window.location.replace(existingUser.role === "admin" ? "index.html" : "dosen.html");
}

const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const btnLogin = document.getElementById("btn-login");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    btnLogin.disabled = true;
    btnLogin.textContent = "Memproses...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
        // Cek admin hardcoded
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem("currentUser", JSON.stringify({ username: "Admin", role: "admin" }));
            window.location.href = "index.html";
            return;
        }

        // Cek dosen dari Firestore
        const q = query(collection(db, "Dosen"), where("Username", "==", username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            errorMsg.style.display = "block";
            return;
        }

        const dosenDoc = snapshot.docs[0];
        const dosenData = dosenDoc.data();

        if (dosenData.Password !== password) {
            errorMsg.style.display = "block";
            return;
        }

        sessionStorage.setItem("currentUser", JSON.stringify({
            username: dosenData.Username,
            role: "dosen",
            docId: dosenDoc.id
        }));
        window.location.href = "dosen.html";

    } catch (error) {
        alert("Terjadi kesalahan: " + error.message);
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = "Masuk";
    }
});
