import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const firebaseConfig = {
    authDomain: "paguyubanarisanbanip3n.firebaseapp.com",
    databaseURL: "https://paguyubanarisanbanip3n-default-rtdb.firebaseio.com",
    projectId: "paguyubanarisanbanip3n"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function listenMemberStatus(memberPhone) {
    const memberRef = ref(db, 'members/' + memberPhone);
    onValue(memberRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            if(document.getElementById('status-arisan')) document.getElementById('status-arisan').checked = data.setoran_arisan || false;
            if(document.getElementById('status-iuran')) document.getElementById('status-iuran').checked = data.setoran_iuran || false;
            if(document.getElementById('saldo-masuk')) document.getElementById('saldo-masuk').innerText = data.uang_masuk || 0;
            if(document.getElementById('saldo-keluar')) document.getElementById('saldo-keluar').innerText = data.uang_keluar || 0;
        }
    });
}

export function checkDuplicateRegistration(nama, phone) {
    const membersRef = ref(db, 'members');
    onValue(membersRef, (snapshot) => {
        const members = snapshot.val();
        for (let id in members) {
            if (members[id].phone === phone || (members[id].nama && members[id].nama.toLowerCase() === nama.toLowerCase())) {
                alert(`Peringatan: Nama / No. WhatsApp ini telah terdaftar!\nEmail: ${members[id].email || 'Terdaftar'}\nNo. HP: ${members[id].phone}`);
                return false;
            }
        }
    });
}
