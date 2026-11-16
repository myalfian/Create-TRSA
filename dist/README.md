# TRSA Studio - Enterprise Tender Requirements & Specification Agreement Application

An enterprise-grade web application to author, manage, review, and print official **TRSA (Tender Requirements and Specification Agreement)** documents for food processing machinery lines.

Built specifically to conform with:
1. **Capiclean Modern Hygiene Design System** (`https://preview.themewagon.com/Capiclean/#`) (Fresh Sky Blue `#0284C7`, Deep Oceanic Navy `#0F2942`, Warm Sunny Coral `#FF7A00`, and Hygienic Mint `#10B981` on an airy light canvas `#F8FAFC`).
2. **DropX Admin Dashboard Architecture** (Sleek collapsible sidebar, executive KPI metric cards, data tables with live filters, status badges).
3. **Clean Business Form Design (Envato A4 Standard)** (Structured corporate grid layouts, highlighted parameter tags, signature endorsement blocks, `@media print` zero-distortion pagination).
4. **PT Indofood Fortuna Makmur TRSA Standard**:
   - Document No: `006/RAP/TRSA – 1403/MFG-IFM/VIII/2024`
   - Project: *Supply of Sheeted Pellet Fryer & Seasoning System (Semarang Plant / Cikupa Plant)*.
5. **Supabase PostgreSQL & Cloud Architecture**:
   - Hybrid Relational + JSONB schema with GIN indexes and Foreign Key B-Tree indexes.
   - Offline-First sync client with automatic LocalStorage fallback and offline queue.
   - Row-Level Security (RLS) policies and Role-Based Access Control (RBAC).

---

## 🚀 Quick Start / How to Run

### Method 1: Instant Browser Launch (Zero Installation)
Simply double-click or open [index.html](file:///e:/Create%20TRSA/index.html) directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Method 2: Windows Batch Launcher
Double-click `start.bat` in this folder:
```cmd
start.bat
```
This automatically launches your browser and starts the lightweight Python server on `http://localhost:5173`.

### Method 3: Python Server
```bash
python server.py
```
Then visit `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification (TDD Suite)

TRSA Studio includes a comprehensive automated test suite powered by the native Node.js Test Runner:

```bash
# Run all 45 automated unit & integration tests
node --test tests/store.test.js tests/docNumber.test.js tests/defaultTRSA.test.js tests/sqlMigration.test.js tests/securityAudit.test.js tests/auditService.test.js tests/supabaseClient.test.js
```

### Build Production Package
```bash
# Verify syntax, print rules, and compile production assets to dist/
node scripts/build.js
```

---

## 🌟 Key Features & Architecture

### 1. DropX Admin Dashboard & Navigation
- **Executive Metric Cards**: Total active TRSA agreements, registered equipment modules (21 units), target line capacity (600–700 kg/h), and startup milestone tracking (End of April 2025).
- **Interactive Projects Hub**: Search by title, document control number, or plant location with dynamic status tags (*Draft, Under Review, Published, Approved*).
- **Template Scaffolding**: One-click creation for Sheeted Pellet Lines, Extruded Snack Lines, and Packaging Systems.

### 2. Smart Document Control Number (No. TRSA) Generator
Generates official document numbers conforming to PT Indofood Fortuna Makmur standards:
```
Contoh Format: 006/RAP/TRSA – 1403/MFG-IFM/VIII/2024
```
- **006**: Nomor urut dokumen 3-digit (otomatis meneruskan nomor tertinggi).
- **RAP**: Inisial kapital dari nama pembuat (*creator/author*).
- **TRSA**: Klasifikasi dokumen tetap (*Tender Requirements and Specification Agreement*).
- **1402 / 1403**: Kode Plant / Lokasi Proyek (`1402`: Semarang, `1403`: Cikupa).
- **MFG**: Kode Departemen (`MFG`, `ENG`, `QA`, `PUR`).
- **IFM**: Identitas korporasi (*PT Indofood Fortuna Makmur*).
- **VIII**: Bulan pertama dokumen dibuat dalam angka Romawi (`I` s/d `XII`).
- **2024**: Tahun dokumen pertama kali dibuat.
- **Bi-directional Sync**: Dilengkapi tombol *"Auto Next Number"* dan 7 badge visual segmen interaktif.

### 3. Multi-Step Guided TRSA Builder
- **Step 1: Document Identification, General Information & Revision Control**:
  - **General Information Master Section**:
    - **Plant Lokasi**: Pemilihan pabrik tujuan (*1402 - Semarang Plant / 1403 - Cikupa Plant*).
    - **Country of Origin (Dropdown)**: Pilihan negara asal pabrikan mesin (*Japan, Germany, Italy, Netherlands, China, United States, United Kingdom, Switzerland, Taiwan, Indonesia, Australia, dll*).
    - **Jenis Mesin (Machine Type)**: Klasifikasi tipe mesin & sistem peralatan (misal: *Sheeted Pellet Fryer & Seasoning System*).
    - **Nama Vendor (OEM / Manufacturer)**: Nama manufaktur / prinsipal vendor (misal: *Heat and Control / Kiremko B.V.*).
    - **Model / Line Tag & Kapasitas Desain (dll)**: Tag model mesin dan kapasitas desain (misal: *SPF-600 Continuous, 600 kg/hour*).
  - **Official Document Control**: Title, Sub-title, Nomor Dokumen TRSA resmi (Read-Only dengan Auto sequential generator).
  - **Vendor Procurement Origin Sourcing**: Pilihan asal vendor (**Foreign**, **Local**, dan **Mixed**) yang secara dinamis menyesuaikan klausul pengiriman (CIF/CIP vs Franco Pabrik), regulasi perpajakan (PPh 26 treaty vs PPh 23 lokal), mata uang (USD/EUR vs IDR), dan persyaratan visa kerja tenaga ahli.
  - **Revision History**: Kolom *Originated By* otomatis terisi nama pengguna aktif, dan *Date* otomatis terisi tanggal penyimpanan.
- **Step 2: Key Contacts & Site Invoicing (Section IV)**:
  - **Database Auto-Fill**: Pemilihan plant location (*Semarang 1402 / Cikupa 1403*) otomatis mengisi alamat pabrik, entitas penerima invoice, delivery port CIF/CIP, dan daftar purchasing attention.
  - **RBAC Custom Clearance Clause**: Klausul pengurusan bea cukai dan demurrage dikunci khusus role **Admin** (*Moh Yusuf Alfian / Manager*).
- **Step 3: Interactive Product Specifications & Process Parameters Canvas**:
  - **Visual CAD/CAM SVG Diagram**: Menampilkan visual 3D snack pellets (*3D Chicken Legs*, *3D Golgappa Pellets*, *3D Star Pellets*, *2D Pierced Chips*).
  - **Quality KPI Gauges**: Target kapasitas output (`600 Kg/h`), moisture out (`1.0–2.1%`, L-C-R gap &le; 0.3%), oil uptake (`28–40%`), dan bulk density.
  - **Editable Product Matrix Table**: Tabel data spesifikasi lengkap yang dapat diedit langsung.
  - **Process Operating Benchmarks**: Panel parameter operasional *Frying* (14 parameter) dan *Seasoning* (7 parameter).
- **Step 4: Project Scope of Supply**:
  - **Fryer System (14 Modules)**: Pellet feed dengan weighing feeder, pan fryer module dengan automatic oil top-up system, drum pre-fryer, dual-fuel heat exchanger, circulation flow meter, transfer pump, de-oiling shaker, SUS304 control panel dengan Ewon router, dan fryer platform.
  - **Seasoning System (7 Modules)**: Infeed weigh conveyor, tumble drum, loss-in-weight scarf feeder, bulk fill elevator, panel Allen-Bradley ControlLogix / CompactLogix L43.
- **Step 5: Hygienic Design & Target Performance Tests**:
  - Food-grade SUS304 requirement, CIP hood, uji kemampuan continuous 7-jam, interval sampling 4-menit, evaluasi sensori (Appearance, Aroma, Taste, Texture), klausul konsekuensi kegagalan 3-bulan.
- **Step 6: Commercial Terms, Tax Laws & Required Documents**:
  - Payment Options: Option 1 (85% L/C, 10% T/T, 5% retention) vs Option 2 (30% DP counter BG, 55% L/C, 10%, 5% retention).
  - Pajak PPh 26 (20% / DGT Form Treaty relief), BUT PMK 35/2019, PPN PP 44/2022, Materai Kwitansi, visa kerja engineer.
  - 14 Dokumen wajib seller (As-built, Cabling, FDS, Software specs, Annotated PLC, Halal cert, DWG layout).
  - Blok tanda tangan resmi ganda (Seller & IFM Project & Engineering Manager).

### 4. PostgreSQL (Supabase) Database & Cloud Integration
- **Database Schema (`src/sql/schema.sql`)**:
  - Tabel: `trsa_projects`, `trsa_revisions`, `trsa_key_contacts`, `trsa_audit_logs`, `trsa_plant_locations`.
  - **Supabase Postgres Best Practices**: B-tree index pada foreign keys, GIN index pada kolom JSONB, automated `updated_at` trigger, dan Row-Level Security (RLS) pada semua tabel.
  - Immutabilitas audit log (hanya mengizinkan `INSERT` dan `SELECT`).
- **Offline-First Resilience (`src/js/supabaseClient.js`)**:
  - Sinkronisasi real-time saat online; otomatis mengantre (*offline buffer queue*) dan menyimpan ke LocalStorage saat offline atau sebelum database dikonfigurasi.
- **Security & Hardening (`src/js/security.js`)**:
  - Role-Based Access Control (RBAC): `admin`, `engineer`, `purchaser`.
  - Deep recursive payload sanitization untuk mencegah serangan Cross-Site Scripting (XSS).
- **Audit Service (`src/js/auditService.js`)**:
  - Pencatatan log perubahan dan deteksi granular diff antar revisi dokumen.
- **UI Database Controls**:
  - Status pill di navbar (🟢 `PostgreSQL Connected` / 🟡 `LocalStorage Active`).
  - Modal pengaturan Supabase (URL, Anon Key, tombol *Test Ping*, dan tombol *Sync Now*).

### 5. Clean Business Form Studio (A4 Print / Save PDF)
- Mengikuti estetika Clean Business Form (Envato A4 Standard).
- Watermark toggles (*OFFICIAL, DRAFT, CONFIDENTIAL, NONE*).
- Presisi `@media print` tanpa distorsi margin atau potongan tabel (`page-break-inside: avoid`).

---

## 📁 File Structure

```
e:\Create TRSA/
├── index.html                        # Main SPA entry point (DropX layout + Clean Form Studio)
├── server.py                         # Python 3 local development server
├── start.bat                         # 1-click Windows launcher
├── README.md                         # Comprehensive documentation
├── scripts/
│   └── build.js                      # Production compiler, syntax validator, and bundler
├── src/
│   ├── css/
│   │   └── style.css                 # DropX card effects, badges, and Clean Business Form print CSS
│   ├── data/
│   │   └── defaultTRSA.js            # Seed 14-page Indofood TRSA dataset
│   ├── js/
│   │   ├── app.js                    # Reactive UI views, stepper navigation, and form renderer
│   │   ├── supabaseClient.js         # Supabase PostgreSQL client & offline-first sync engine
│   │   ├── security.js               # RBAC permissions, XSS sanitization, and user roles
│   │   └── auditService.js           # Change diff detection and immutable audit trail logging
│   └── sql/
│       └── schema.sql                # Production PostgreSQL migration (Supabase Best Practices & RLS)
├── tests/
│   ├── defaultTRSA.test.js           # 14-page Indofood specification matrix verification
│   ├── docNumber.test.js             # Document Control Number generation and parsing tests
│   ├── store.test.js                 # Local store, plant auto-population, and progress tests
│   ├── sqlMigration.test.js          # PostgreSQL schema, foreign key indexes, and RLS audit tests
│   ├── securityAudit.test.js         # RBAC access control, admin protection, and XSS sanitization tests
│   ├── auditService.test.js          # Audit logging, diff detection, and immutability tests
│   └── supabaseClient.test.js        # Supabase config, offline queue, and data transformation tests
└── dist/                             # Compiled production-ready distribution package
```

---

## 🛡️ License & Standards
Developed for **PT Indofood Fortuna Makmur** engineering division, adhering to:
- Hygienic Food Processing Machinery Standards (EHEDG / SUS304).
- Clean Code, SOLID Design & Zero-Downtime Database Architecture.
