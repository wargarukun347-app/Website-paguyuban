import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
let db = getFirestore(app);
if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
  db = getFirestore(app, config.firestoreDatabaseId);
}

async function run() {
  const uid = "pdk76t5xDOPc3uhWeNKPbpiJxFQ2";
  await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true });
  await setDoc(doc(db, "roles_admin", uid), { 
    uid, 
    email: "wargarukun347@gmail.com", 
    grantedAt: new Date().toISOString(),
    grantedBy: "system_admin_initiation"
  }, { merge: true });
  console.log("Updated user to admin");
  process.exit(0);
}
run();
