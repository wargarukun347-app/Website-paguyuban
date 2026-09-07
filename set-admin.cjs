const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'website-paguyuban'
});

const db = getFirestore();

async function main() {
  const uid = 'tgQbLhDht4bAdIu5WhCk4h7idZq1';

  await db.collection('roles_admin').doc(uid).set({
    role: 'admin',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    role: 'admin',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('ADMIN BERHASIL:', uid);
}

main().catch(err => {
  console.error('GAGAL:', err);
  process.exit(1);
});
