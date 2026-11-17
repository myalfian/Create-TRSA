# TRSA Studio

Aplikasi web untuk membuat, mengelola, meninjau, dan mencetak **Tender Requirements & Specification Agreement (TRSA)** bagi proyek mesin dan lini pemrosesan makanan. Proyek ini dikembangkan untuk mendukung alur kerja engineering, procurement, dan dokumentasi PT Indofood Fortuna Makmur.

TRSA Studio menggabungkan antarmuka dashboard dan formulir dokumen bisnis, penyimpanan lokal di browser, opsi sinkronisasi ke Supabase PostgreSQL, serta keluaran yang dapat dicetak atau disimpan sebagai PDF.

> **Status runtime:** server aplikasi utama berjalan dengan Bun melalui `server.js`. Script `start` menggunakan `bun run server.js`; tidak perlu menjalankan Python untuk memulai server tersebut. Server menyediakan pemeriksaan kesehatan di `/health` dan melayani aset web dari root repository.

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Persyaratan](#persyaratan)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Autentikasi & Akun Pengguna (Login)](#autentikasi--akun-pengguna-login)
- [Endpoint server](#endpoint-server)
- [Pengujian, lint, dan build](#pengujian-lint-dan-build)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Penyimpanan dan keamanan](#penyimpanan-dan-keamanan)
- [Struktur proyek](#struktur-proyek)
- [Troubleshooting](#troubleshooting)

## Fitur

### Pengelolaan proyek dan dokumen

- Dashboard proyek dengan informasi status dan progres.
- Pembuatan, pengubahan, dan duplikasi proyek TRSA.
- Pencarian proyek berdasarkan informasi dokumen dan lokasi.
- Pengelolaan nomor dokumen TRSA, informasi umum, revisi, dan kontak utama.
- Formulir bertahap untuk informasi proyek, spesifikasi, ruang lingkup pasokan, penerimaan performa, dan persyaratan komersial.
- Template data awal dan spesifikasi contoh yang berada di `src/data/defaultTRSA.js`.

### Spesifikasi dan keluaran

- Pengelolaan spesifikasi produk dan parameter proses untuk tahap frying dan seasoning.
- Bagian ruang lingkup pasokan dan dokumentasi yang dibutuhkan.
- Tata letak dokumen bisnis yang dirancang untuk kertas A4.
- Aturan CSS khusus cetak di `src/css/style.css`; gunakan fitur **Print** browser untuk mencetak atau memilih **Save as PDF**.

### Audit dan sinkronisasi

- Riwayat aktivitas dan deteksi perubahan proyek melalui `src/js/auditService.js`.
- Penyimpanan lokal di browser dengan `localStorage`.
- Antrean perubahan lokal ketika Supabase belum dikonfigurasi atau tidak dapat diakses.
- Sinkronisasi opsional ke Supabase PostgreSQL melalui REST API.
- Skema database menyediakan tabel proyek, revisi, kontak, audit, serta lokasi pabrik.

### Peran pengguna

Modul `src/js/security.js` menyediakan logika antarmuka berbasis peran (`admin`, `engineer`, dan `purchaser`) serta sanitasi data sebelum disimpan. Ini adalah kontrol pada sisi klien, bukan pengganti autentikasi dan otorisasi server. Untuk penggunaan multi-user atau data sensitif, konfigurasi autentikasi dan kebijakan database yang sesuai harus diterapkan di Supabase.

## Teknologi

- **Frontend:** HTML, CSS, JavaScript ES modules, Tailwind CSS CDN.
- **Server runtime:** Bun (`Bun.serve`) dalam `server.js`.
- **Penyimpanan lokal:** browser `localStorage`.
- **Database opsional:** Supabase PostgreSQL dan REST API.
- **Pengujian dan skrip proyek:** Node.js scripts dan test runner bawaan Node.js.

## Persyaratan

Untuk menjalankan server aplikasi:

- Bun versi yang mendukung `Bun.serve`.
- Terminal pada direktori proyek.

Node.js diperlukan jika ingin menjalankan script pengujian, build, atau lint yang saat ini menggunakan perintah `node` di `package.json`.

## Menjalankan aplikasi

Clone repository, lalu pindah ke direktori proyek:

```bash
git clone https://github.com/myalfian/Create-TRSA.git
cd Create-TRSA
```

Jalankan server dengan Bun:

```bash
bun run start
```

Atau jalankan langsung:

```bash
bun run server.js
```

Secara default server menggunakan port **3000**. Untuk mengganti port, atur variabel lingkungan `PORT`:

```bash
PORT=8080 bun run start
```

Di PowerShell Windows:

```powershell
$env:PORT = "8080"
bun run start
```

Mode pengembangan dengan restart otomatis ketika file berubah:

```bash
bun run dev
```

Buka alamat server di browser. Route `/` memang mengembalikan JSON untuk pemeriksaan pre-warming; halaman aplikasi tersedia di `/index.html`:

- `http://localhost:3000/` — status server dalam JSON.
- `http://localhost:3000/health` — pemeriksaan kesehatan dalam JSON.
- `http://localhost:3000/index.html` — antarmuka TRSA Studio.

## Autentikasi & Akun Pengguna (Login)

TRSA Studio dilengkapi modul Master Data & Autentikasi internal (`src/js/masterDataService.js`) dengan sistem Role-Based Access Control (RBAC) bertingkat.

### Cara Login
1. Buka antarmuka di `http://localhost:3000/index.html`.
2. Klik avatar/profil pengguna di sudut kanan atas header atau tombol **Switch User / Login**.
3. Masukkan salah satu identifier:
   - **Email resmi Indofood** (misal: `my.alfian@icbp.indofood.co.id`)
   - **Nama Lengkap** (misal: `Moh Yusuf Alfian` atau `Refin A Putra`)
   - **Employee ID** (misal: `IFM-MFG-001`)
4. Masukkan Password / Passcode Standar:
   ```text
   indofood2026
   ```

---

### Daftar Akun Pengguna Berdasarkan Peran & Lokasi Pabrik

| Employee ID | Nama Pengguna | Email | Jabatan | Role (RBAC) | Cakupan Plant |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IFM-MFG-001** | **Moh Yusuf Alfian** | `my.alfian@icbp.indofood.co.id` | Project & Engineering Manager | **Super Admin** | All Plants (1402, 1403, 1405, 1411) |
| **IFM-MFG-002** | Refin A Putra | `refin.putra@icbp.indofood.co.id` | Project Engineer | Project & Engineering Team | 1403 - Semarang Plant |
| **IFM-MFG-013** | Murdani | `m.murdani@icbp.indofood.co.id` | Senior Project Engineer | Project & Engineering Team | 1402 - Cikokol Plant |
| **IFM-PUR-003** | Natalia Happy | `natalia.happy@icbp.indofood.co.id` | Purchasing Supervisor | Purchasing Plant | 1403 - Semarang Plant |
| **IFM-PUR-004** | Dewi Natalia | `dewi.natalia@icbp.indofood.co.id` | Purchasing Team PIC | Purchasing Plant | All Plants |
| **IFM-PUR-011** | Yanuar Ari Wibowo | `yanuar.wibowo@icbp.indofood.co.id` | Purchasing Team PIC | Purchasing Plant | 1403 - Semarang Plant |
| **IFM-PUR-012** | Muhammad Alfatih | `muhammad.alfatih@icbp.indofood.co.id` | Purchasing Team PIC | Purchasing Plant | 1405 - Cikupa / 1411 - Agro |
| **IFM-ENG-005** | Mohammad Faiz | `mohammad.faiz@icbp.indofood.co.id` | User / Engineering PIC | PIC Project | All Plants |
| **IFM-ENG-006** | Dany Taufiq Alim Ansori | `dany.ansori@icbp.indofood.co.id` | User / Engineering PIC | PIC Project | All Plants |
| **IFM-ENG-007** | Putra AP | `adiprana@icbp.indofood.co.id` | User / Engineering PIC | PIC Project | All Plants |
| **IFM-ENG-008** | Septian Bagus Jumantoro | `septian.jumantoro@icbp.indofood.co.id` | User / Engineering PIC | PIC Project | All Plants |
| **IFM-MFG-009** | Ayodya Maulana Gunoro | `ayodya.gunoro@icbp.indofood.co.id` | Project Team PIC | PIC Project | 1403 - Semarang Plant |
| **IFM-MFG-010** | Angga Dwiki Wicaksono | `angga.wicaksono@icbp.indofood.co.id` | Project Team PIC | PIC Project | 1402 - Cikokol Plant |

> **Ringkasan Hak Akses Peran (RBAC):**
> - **Super Admin**: Akses mutlak untuk tata kelola TRSA, persetujuan dan publikasi status dokumen, perubahan klausul khusus *Customs Clearance*, manajemen Master Data (Users, Vendors, Plants, Departments, Jabatan), serta penentuan kebijakan *Compliance Matrix* per-user.
> - **Project & Engineering Team**: Pembuatan dan penyusunan spesifikasi teknis TRSA, matriks produk snack, parameter operasional penggorengan dan seasoning, ruang lingkup pasokan, serta kriteria uji FAT/SAT.
> - **Purchasing Plant**: Peninjauan dan pemeliharaan ketentuan komersial (tahapan pembayaran, SWIFT BG/APBG), ketentuan perpajakan & pabean (PPN 11%, PPh 23, PPh 26 / DGT Form), dan kualifikasi vendor.
> - **PIC Project**: Verifikasi teknis lapangan, perwakilan plant untuk persetujuan Klausul IV (User Sign-off), dan pengawalan daftar catatan serah terima (*snag list*).

## Endpoint server

Server pada `server.js` menyediakan:

| Method | Path | Respons |
| --- | --- | --- |
| `GET` | `/` | HTTP 200, `{"status":"ok"}` |
| `GET` | `/health` | HTTP 200, `{"status":"ok"}` |
| `GET` | `/index.html` dan path aset yang tersedia | File statis dari direktori proyek |
| `GET` | Path file yang tidak tersedia | HTTP 404 |

Server juga mengatur MIME type untuk HTML, JavaScript, CSS, JSON, gambar, dan tipe file umum, serta mengirim header CORS dan kebijakan cache yang sesuai untuk pengembangan.

## Pengujian, lint, dan build

Script yang tersedia di `package.json`:

```bash
npm test
npm run lint
npm run build
```

Script tersebut menjalankan Node.js (`node tests/run.js`, `node scripts/lint.js`, dan `node scripts/build.js`). Jika Node.js tidak terpasang, perintah-perintah ini tidak tersedia; server aplikasi sendiri tetap dijalankan melalui Bun.

Build menyiapkan aset aplikasi di direktori `dist/`. Setelah perubahan sumber, jalankan build untuk menyegarkan hasil distribusi sebelum menggunakannya.

## Konfigurasi Supabase

Integrasi Supabase bersifat opsional. Tanpa konfigurasi, aplikasi menggunakan penyimpanan lokal browser.

1. Buat proyek Supabase dan siapkan URL proyek serta **anon/public key**.
2. Jalankan migrasi SQL dari `src/sql/schema.sql` pada database Supabase.
3. Buka aplikasi dan masukkan URL serta anon key pada pengaturan Supabase yang tersedia di antarmuka.
4. Gunakan fasilitas uji koneksi dan sinkronisasi di aplikasi.

Skema membuat tabel berikut:

- `trsa_plant_locations` — data lokasi pabrik.
- `trsa_projects` — data inti TRSA dan spesifikasi JSONB.
- `trsa_revisions` — catatan revisi dokumen.
- `trsa_key_contacts` — kontak proyek.
- `trsa_audit_logs` — catatan audit.

Skema juga mendefinisikan indeks, trigger pembaruan `updated_at`, serta Row Level Security (RLS). **Tinjau dan sesuaikan kebijakan RLS sebelum deployment**: kebijakan dalam migrasi adalah bagian dari kode proyek, bukan jaminan bahwa akses telah sesuai dengan kebijakan keamanan organisasi. Jangan pernah menaruh service-role key atau kredensial rahasia di frontend.

## Penyimpanan dan keamanan

- Ketika integrasi database belum aktif, data dan antrean sinkronisasi disimpan di `localStorage` browser dan hanya tersedia pada browser/profil yang sama.
- Menghapus data situs atau mengganti browser dapat menghilangkan data lokal yang belum disinkronkan. Buat cadangan dan lakukan sinkronisasi sesuai prosedur organisasi.
- Role-based UI dan sanitasi di browser membantu alur aplikasi, tetapi pengguna dapat memodifikasi JavaScript sisi klien. Gunakan autentikasi, validasi server, dan RLS yang ketat untuk melindungi data produksi.
- Koneksi ke Google Fonts dan Tailwind CSS menggunakan CDN, sehingga tampilan awal membutuhkan akses jaringan ke layanan tersebut.

## Struktur proyek

```text
Create-TRSA/
├── index.html                           # Entry point antarmuka web
├── server.js                            # HTTP server Bun/Node.js, health check, dan static assets
├── package.json                         # Script start, dev, test, build, dan lint
├── public/
│   └── assets/aistudio/                 # Dokumen matriks standar IFM (PDF)
├── src/
│   ├── assets/images/                   # Asset gambar latar & visual branding
│   ├── css/style.css                    # Gaya aplikasi, corporate design system & format cetak A4
│   ├── data/defaultTRSA.js              # Data/template spesifikasi TRSA standar Indofood
│   ├── js/
│   │   ├── app.js                       # Controller utama, Store (state management), & UI components
│   │   ├── masterDataService.js         # Master data (Users, Vendors, Plants, Dept, Jabatan, & Login)
│   │   ├── trsaMatrixService.js         # IFM 19-Clause compliance matrix & deep audit engine
│   │   ├── userMatrixSettingsService.js # Kebijakan akses matrix spesifikasi per-pengguna (RBAC)
│   │   ├── validationService.js         # Real-time field & multi-step validation engine
│   │   ├── draftHistoryService.js       # Auto-save 30s & snapshot history di LocalStorage
│   │   ├── dashboardStatsService.js     # Analitik ringkasan metrik dan agregasi proyek TRSA
│   │   ├── auditService.js              # Forensic audit trail & deteksi perubahan spesifikasi
│   │   ├── security.js                  # Standardisasi peran organisasi (RBAC) & sanitasi input
│   │   └── supabaseClient.js            # Koneksi Supabase PostgreSQL & antrean offline
│   └── sql/schema.sql                   # Skema PostgreSQL enterprise & RLS policies
├── scripts/
│   ├── build.js                         # Script validasi syntax, style rules, & packaging dist/
│   └── lint.js                          # Pemeriksaan linting proyek
├── tests/                               # 78 automated tests melintasi 9 test suites
│   ├── run.js                           # Test runner utama
│   ├── defaultTRSA.test.js              # Validasi spesifikasi dokumen & 19 klausul
│   ├── store.test.js                    # Validasi logika TRSAStore & perhitungan progres
│   ├── masterDataAndAuth.test.js        # Validasi autentikasi login & master data CRUD
│   ├── matrixAudit.test.js              # Validasi audit kepatuhan matriks 19 klausul IFM
│   ├── userMatrixSettings.test.js       # Validasi pembatasan plant & origin per user
│   ├── validation.test.js               # Validasi engine real-time validasi field
│   ├── draftHistory.test.js             # Validasi auto-save & pemulihan snapshot
│   ├── dashboardStats.test.js           # Validasi kalkulasi analitik & filter
│   └── activityLogging.test.js          # Validasi pencatatan forensic audit log
└── dist/                                # Aset bundle hasil build siap produksi
```

## Troubleshooting

### Port 3000 sudah digunakan

Jalankan server pada port lain dengan mengatur `PORT`, misalnya `PORT=8080 bun run start`.

### Server hidup, tetapi `/` menampilkan JSON

Ini perilaku yang disengaja untuk pemeriksaan kesehatan container. Buka `/index.html` untuk menggunakan antarmuka.

### Aset tidak ditemukan

Pastikan server dijalankan dari proyek yang berisi `index.html` dan direktori `src/`. Gunakan path `/index.html` untuk membuka aplikasi.

### Sinkronisasi Supabase gagal

Pastikan URL, anon key, migrasi skema, izin tabel, kebijakan RLS, dan konektivitas jaringan sudah benar. Periksa pesan error koneksi di antarmuka dan log browser.

## Lisensi dan penggunaan

Metadata proyek saat ini mencantumkan lisensi `UNLICENSED`. Aplikasi ini ditujukan untuk mendukung kebutuhan dokumentasi dan proses internal; isi TRSA dan persyaratan komersial tetap harus ditinjau serta disetujui oleh pihak berwenang sebelum digunakan sebagai dokumen resmi.
