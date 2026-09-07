# Panduan Menghubungkan GitHub & Firebase Hosting (CI/CD Auto-Deploy)

Panduan ini memastikan setiap kali Anda melakukan **Push / Commit** ke GitHub (branch `main` atau `master`), GitHub Actions akan **secara otomatis mem-build dan men-deploy** website ke Firebase Hosting (`paguyubanarisanbanip3n.my.id`).

---

## Ringkasan Konfigurasi yang Sudah Dibuat

1. **`.firebaserc`**
   - Menghubungkan project ke ID Firebase: `gen-lang-client-0342748058`.
2. **`firebase.json`**
   - Mengatur Firebase Hosting untuk membaca folder `dist` dan melayani routing Single-Page Application (SPA).
3. **`.github/workflows/firebase-hosting.yml`**
   - Alur kerja otomatis di GitHub Actions untuk build (`npm run build`) dan deploy ke Firebase Hosting.

---

## 2 Cara Mudah Mengaktifkan Auto-Deploy di GitHub

Pilih salah satu dari 2 cara di bawah ini:

### OPSI 1: Cara Otomatis dengan Firebase CLI (Paling Cepat)

Buka terminal atau Google Cloud Shell di dalam folder project, lalu jalankan:
```bash
firebase init hosting:github
```
Ikuti petunjuk di layar:
1. Login ke GitHub jika diminta.
2. Masukkan repository Anda, misal: `username-anda/nama-repo-anda`.
3. Set up build script? Jawab **`Y`**, lalu ketik: `npm run build`.
4. Set up auto deploy saat merge/push? Jawab **`Y`**.
5. Branch target: ketik **`main`** atau **`master`**.

Firebase akan otomatis membuat GitHub Secrets untuk Anda!

---

### OPSI 2: Cara Manual (Mengisi Secret di GitHub)

Jika Anda ingin mengisi Secret secara manual di GitHub:

#### Langkah A: Dapatkan Kunci Service Account dari Firebase / Google Cloud
1. Buka [Google Cloud Console Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=gen-lang-client-0342748058).
2. Cari Service Account Firebase (contoh: `firebase-adminsdk-...` atau akun dengan akhiran `@gen-lang-client-0342748058.iam.gserviceaccount.com`).
3. Klik Service Account tersebut > Buka tab **Keys** > Klik **Add Key** > **Create new key** > Pilih **JSON** > Klik **Create**.
4. File JSON akan terdownload. Buka file JSON tersebut dengan Notepad/Text Editor dan **salin (copy) seluruh isinya**.

#### Langkah B: Masukkan Secret ke Repository GitHub
1. Buka repository Anda di **GitHub**.
2. Masuk ke menu **Settings** > **Secrets and variables** > **Actions**.
3. Klik tombol **New repository secret**.
4. Masukkan:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT` (atau `FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0342748058`)
   - **Secret**: Tempelkan seluruh teks JSON yang Anda salin tadi.
5. Klik **Add secret**.

*(Atau jika menggunakan Token Firebase: Jalankan `firebase login:ci` di terminal, lalu simpan kode token yang dihasilkan sebagai secret dengan nama `FIREBASE_TOKEN`).*

---

## Menguji Deployment

Setelah selesai mengatur salah satu opsi di atas:
1. Lakukan `git add .`, `git commit -m "Update website"`, lalu `git push origin main`.
2. Buka tab **Actions** di GitHub repository Anda.
3. Anda akan melihat proses build dan deploy berjalan otomatis hingga bertanda centang hijau (Success).
4. Website Anda di **`https://paguyubanarisanbanip3n.my.id`** akan langsung terbarui!
