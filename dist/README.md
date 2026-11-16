# TRSA Studio - Enterprise Tender Requirements & Specification Agreement Application

An enterprise-grade web application to author, manage, review, and print official **TRSA (Tender Requirements and Specification Agreement)** documents for food processing machinery lines.

Built specifically to conform with:
1. **Capiclean Modern Hygiene Design System** (`https://preview.themewagon.com/Capiclean/#`) (Fresh Sky Blue `#0284C7`, Deep Oceanic Navy `#0B2447`, Warm Sunny Coral `#FF7A00`, and Hygienic Mint `#10B981` on an airy light canvas `#F4F8FC`).
2. **DropX Admin Dashboard Architecture** (Sleek collapsible sidebar, executive KPI metric cards, data tables with live filters, status badges).
3. **Clean Business Form Design (Envato A4 Standard)** (Structured corporate grid layouts, highlighted parameter tags, signature endorsement blocks, `@media print` zero-distortion pagination).
4. **PT Indofood Fortuna Makmur TRSA Standard**:
   - Document No: `006/RAP/TRSA – 1403/MFG-IFM/VIII/2024`
   - Project: *Supply of Sheeted Pellet Fryer & Seasoning System (Semarang Plant)*.

---

## 🚀 Quick Start / How to Run

### Method 1: Instant Browser Launch (Zero Installation)
Simply double click or open [index.html](file:///e:/Create%20TRSA/index.html) directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Method 2: Windows Batch Launcher
Double click `start.bat` in this folder:
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

## 🌟 Key Features

### 1. DropX Admin Dashboard
- **Executive Metric Cards**: Total active TRSA agreements, registered equipment modules (21 units), target line capacity (600–700 kg/h), and startup milestone tracking (End of April 2025).
- **Interactive Projects Hub**: Search by title, document control number, or plant location with dynamic status tags (*Draft, Under Review, Published, Approved*).
- **Template Scaffolding**: One-click creation for Sheeted Pellet Lines, Extruded Snack Lines, and Packaging Systems.

### 2. Multi-Step Guided TRSA Builder
- **Step 1: Document Identification & Revision Control**:
  - Title, Sub-title, Control Number, Revision History Table (Revision, Description, Originated by, Date).
  - Target milestones: Line start-up date, Final quotation/drawings date, Order placement date.
- **Step 2: Key Contacts & Site Invoicing**:
  - IFM Contacts Matrix (Project & Engineering Manager, Purchasing Supervisor, Site Engineers).
  - Invoicing entity, Semarang plant address, and CIF shipping port details.
- **Step 3: Product Specifications & Process Parameters**:
  - 4 Preloaded snack shapes: *3D Chicken Legs, 3D Golgappa Pellets, 3D Star Pellets, 2D Pierced Chips*.
  - Input/Output dimensions, bulk density, moisture content (1.0–2.1% with Left-Center-Right gap ≤ 0.3%), oil uptake (28–40%).
  - Frying parameters: Feeder rate (1.5–2.5 kg/batch), Frying temp (180–190°C), Dwell time (20–30s), Oil capacity (175–180 kg), Spinner (20s).
  - Seasoning parameters: Dry seasoning, 1% salt content, 7.4% application rate, 635–700 kg/h capacity.
- **Step 4: Technical Scope of Supply**:
  - **Fryer System (14 Modules)**: Ground level pellet feed with weighing feeder, Unitized pan fryer module with automatic fresh/used oil top-up system and magnetic flow meter, Drum pre-fryer, Horizontal dual-fuel heat exchanger (gas/oil), Main oil pump, Circulation flow meter, 30 USGPM transfer pump, Interconnecting pipework, De-oiling inspection shaker with oil accumulator, 400V 50Hz SUS304 control panel with PLC and Ewon remote access router, Fryer platform, and Ancillaries.
  - **Seasoning System (7 Modules)**: Infeed weigh conveyor, 635–700 kg/h tumble drum, PLC software with air-conditioned SUS304 panel, Loss-in-Weight metering screw feeder with 960mm scarf feeder, Spiro-flow bulk fill elevator, AB ControlLogix / CompactLogix L43 panel view, and Ancillaries.
  - Utilities consumption rating & battery limits (power, compressed air, gas).
- **Step 5: Hygienic Design & Target Performance Tests**:
  - Food-grade SUS304 contact requirement, Clean-In-Place (CIP) hood, calibration certificates, MSDS.
  - Target Performance Protocols: Starting up, 7-hour continuous capability trial, 4-minute sampling interval (15 samples/hr), defect & sensory evaluation (Appearance, Aroma, Taste, Texture).
  - 3-Month modification & failure consequence penalty clause.
- **Step 6: Commercial Terms, Tax Laws & Required Documents**:
  - **Payment Options**: Option 1 (85% L/C, 10% T/T after running, 5% T/T retention) vs Option 2 (30% DP counter Bank Guarantee, 55% L/C, 10%, 5% retention).
  - Indonesian Withholding Tax (PPh 26 20% / DGT Form Double Tax Treaty relief).
  - Permanent Establishment (BUT) under PMK 35/2019 time-test rule (>6 months in 1 year).
  - Indonesian VAT (PPN PP 44/2022) and official Materai Kwitansi requirements.
  - Engineer working visas & expense division.
  - 14 Mandatory seller documentation checklist (As-built, Cabling, FDS, Software specs, Annotated PLC, HMI licenses, Manuals, Halal certificate, DWG layouts).
  - Dual signature authorization blocks (Seller & IFM Project & Engineering Manager).

### 3. Clean Business Form Studio (A4 Print / Save PDF)
- Designed following the Envato Clean Business Form aesthetic.
- Watermark toggles (*OFFICIAL, DRAFT, CONFIDENTIAL, NONE*).
- Formatted tables with exact print break avoidance (`page-break-inside: avoid`).
- One-click print engine that produces official crisp PDF contracts without margins distortion.

### 4. Data Import / Export & Auto-Save
- Real-time `localStorage` persistence saves all changes instantly.
- One-click `.json` export and import for seamless offline sharing and backup.
- Template reset button to restore default Indofood specification anytime.

---

## 📁 File Structure
```
e:\Create TRSA\
├── index.html            # Main SPA entry point (DropX layout + Clean Form Studio)
├── server.py             # Python 3 local development server
├── start.bat             # 1-click Windows launcher
├── README.md             # Project documentation
└── src/
    ├── css/
    │   └── style.css     # DropX card effects, badges, and Clean Business Form print CSS
    ├── data/
    │   └── defaultTRSA.js# Full 14-page Indofood TRSA preloaded seed data
    └── js/
        └── app.js        # Reactive state engine, multi-step builder, and print studio
```
