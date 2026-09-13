// Firebase Realtime Sync Client Script untuk Akun Anggota & Admin
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Ambil konfigurasi Firebase dari Window/LocalStorage
const firebaseConfig = window.FIREBASE_CONFIG || JSON.parse(localStorage.getItem('firebaseConfig') || '{}');

if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // Dapatkan data user login aktif dari localStorage
    const loggedInUser = JSON.parse(localStorage.getItem('user_session') || '{}');
    const userPhone = loggedInUser.phone || loggedInUser.no_hp || '';

    if (userPhone) {
        // Cleaning format nomor HP agar konsisten sebagai ID Firebase node
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');

        // 1. LISTENER REALTIME UNTUK DATA ANGGOTA (Arisan, Kas, Status)
        const memberRef = ref(db, 'members/' + cleanPhone);
        onValue(memberRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                updateMemberUI(data);
            }
        });

        // 2. LISTENER REALTIME UNTUK MUTASI UANG MASUK & KELUAR
        const mutationRef = ref(db, 'mutasi/' + cleanPhone);
        onValue(mutationRef, (snapshot) => {
            const mutasiData = snapshot.val();
            if (mutasiData) {
                updateMutationUI(mutasiData);
            }
        });
    }

    // LISTENER GLOBAL KAS & KEUIANGAN PAGUYUBAN
    const financeRef = ref(db, 'finance_summary');
    onValue(financeRef, (snapshot) => {
        const summary = snapshot.val();
        if (summary) {
            if (document.getElementById('total-uang-masuk')) document.getElementById('total-uang-masuk').innerText = formatRupiah(summary.total_masuk || 0);
            if (document.getElementById('total-uang-keluar')) document.getElementById('total-uang-keluar').innerText = formatRupiah(summary.total_keluar || 0);
            if (document.getElementById('saldo-kas-utama')) document.getElementById('saldo-kas-utama').innerText = formatRupiah(summary.saldo_kas || 0);
        }
    });
}

// Fungsi Update Tampilan Otomatis di Layar Anggota
function updateMemberUI(data) {
    // Checkbox / Status Arisan
    const arisanEl = document.getElementById('status-iuran-arisan');
    const arisanCheck = document.getElementById('ceklis-arisan');
    if (arisanEl) arisanEl.innerText = data.iuran_arisan ? 'LUNAS / SUDAH SETOR' : 'BELUM SETOR';
    if (arisanCheck) arisanCheck.checked = !!data.iuran_arisan;

    // Checkbox / Status Iuran Kas
    const kasEl = document.getElementById('status-iuran-kas');
    const kasCheck = document.getElementById('ceklis-kas');
    if (kasEl) kasEl.innerText = data.iuran_kas ? 'LUNAS / SUDAH SETOR' : 'BELUM SETOR';
    if (kasCheck) kasCheck.checked = !!data.iuran_kas;

    // Saldo / Nominal Setoran
    if (document.getElementById('nominal-setoran-arisan')) {
        document.getElementById('nominal-setoran-arisan').innerText = formatRupiah(data.nominal_arisan || 0);
    }
    if (document.getElementById('nominal-setoran-kas')) {
        document.getElementById('nominal-setoran-kas').innerText = formatRupiah(data.nominal_kas || 0);
    }
    if (document.getElementById('terakhir-diupdate')) {
        document.getElementById('terakhir-diupdate').innerText = data.updated_at || new Date().toLocaleString('id-ID');
    }
}

// Fungsi Update Daftar Uang Masuk & Keluar Anggota
function updateMutationUI(mutasiList) {
    const container = document.getElementById('tabel-mutasi-anggota');
    if (!container) return;

    let html = '';
    Object.values(mutasiList).reverse().forEach(item => {
        const isMasuk = item.tipe === 'masuk';
        const badgeColor = isMasuk ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;';
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${item.tanggal || '-'}</td>
                <td style="padding: 10px;"><span style="padding: 3px 8px; border-radius: 4px; font-size: 12px; ${badgeColor}">${item.kategori || item.tipe}</span></td>
                <td style="padding: 10px;">${item.keterangan || '-'}</td>
                <td style="padding: 10px; font-weight: bold; color: ${isMasuk ? '#10b981' : '#ef4444'};">
                    ${isMasuk ? '+' : '-'} ${formatRupiah(item.jumlah || 0)}
                </td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}
