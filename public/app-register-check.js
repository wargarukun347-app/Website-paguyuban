// Script Validasi Pendaftaran Anggota & Notifikasi Duplikat Data
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = window.FIREBASE_CONFIG || JSON.parse(localStorage.getItem('firebaseConfig') || '{}');

if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    window.checkDuplicateRegistration = async function(inputPhone, inputName) {
        const cleanPhone = inputPhone.replace(/[^0-9]/g, '');
        const dbRef = ref(db);
        
        try {
            const snapshot = await get(child(dbRef, `members/${cleanPhone}`));
            if (snapshot.exists()) {
                const existingData = snapshot.val();
                alert(`Peringatan: Nomor HP / Nama sudah terdaftar!\n\nEmail: ${existingData.email || 'Tidak dicantumkan'}\nNo. WhatsApp: ${existingData.phone || cleanPhone}\nNama: ${existingData.nama || inputName}\n\nSilakan gunakan menu Login.`);
                return true; // Duplikat ditemukan
            }
        } catch (error) {
            console.error("Gagal memeriksa duplikasi data:", error);
        }
        return false; // Aman / Belum terdaftar
    };
}
