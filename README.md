# TRSA Studio

Aplikasi web untuk membuat, mengelola, meninjau, dan mencetak **Tender Requirements & Specification Agreement (TRSA)** bagi proyek mesin dan lini pemrosesan makanan. Proyek ini dikembangkan untuk mendukung alur kerja engineering, procurement, dan dokumentasi PT Indofood Fortuna Makmur.

TRSA Studio menggabungkan antarmuka dashboard dan formulir dokumen bisnis, penyimpanan lokal di browser, opsi sinkronisasi ke Supabase PostgreSQL, serta keluaran yang dapat dicetak atau disimpan sebagai PDF.

> **Status runtime:** server aplikasi utama berjalan dengan Bun melalui `server.js`. Script `start` menggunakan `bun run server.js`; tidak perlu menjalankan Python untuk memulai server tersebut. Server menyediakan pemeriksaan kesehatan di `/health` dan melayani aset web dari root repository.

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Persyaratan](#persyaratan)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
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
├── index.html                 # Entry point antarmuka web
├── server.js                  # HTTP server Bun, health check, dan static assets
├── package.json               # Script start, dev, test, build, dan lint
├── src/
│   ├── css/style.css          # Gaya aplikasi dan format cetak
│   ├── data/defaultTRSA.js    # Data/template TRSA awal
│   ├── js/
│   │   ├── app.js             # Inisialisasi UI dan alur aplikasi
│   │   ├── auditService.js    # Audit trail dan deteksi perubahan
│   │   ├── security.js        # Peran dan sanitasi sisi klien
│   │   └── supabaseClient.js  # Koneksi Supabase dan antrean offline
│   └── sql/schema.sql         # Skema PostgreSQL/Supabase
├── scripts/
│   ├── build.js               # Validasi dan pembuatan distribusi
│   └── lint.js                # Pemeriksaan lint proyek
├── tests/                     # Unit dan pengujian integrasi
└── dist/                      # Aset hasil build
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
