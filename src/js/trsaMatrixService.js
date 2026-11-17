/**
 * PT Indofood Fortuna Makmur — Purchasing & Engineering Compliance Matrix Service
 * Authoritative 19-Clause Standard (Clauses I–XIX) across Plants 1402, 1403, 1405, 1411
 * and Vendor Origins (Local, Foreign, Mixed).
 */

export const TRSA_MATRIX_PDF_PATH = '/assets/aistudio/TRSA_Matrix_PT_Indofood_Fortuna_Makmur_6cec64af.pdf';

export const USER_ENGINEERING_PICS = [
  { name: 'Mohammad Faiz', email: 'mohammad.faiz@icbp.indofood.co.id', role: 'User / Engineering PIC', dept: 'ENG' },
  { name: 'Dany Taufiq Alim Ansori', email: 'dany.ansori@icbp.indofood.co.id', role: 'User / Engineering PIC', dept: 'ENG' },
  { name: 'Putra AP', email: 'adiprana@icbp.indofood.co.id', role: 'User / Engineering PIC', dept: 'ENG' },
  { name: 'Septian Bagus Jumantoro', email: 'septian.jumantoro@icbp.indofood.co.id', role: 'User / Engineering PIC', dept: 'ENG' }
];

export const PLANT_MATRIX_PROFILES = {
  '1402': {
    code: '1402',
    plantName: 'Cikokol Plant',
    siteTitle: 'PT Indofood Fortuna Makmur – Tangerang',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur – Attn: Purchasing Department',
    address: 'Jl. Wisma Damatex, RT.001/RW.001, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117, Indonesia',
    addressDetail: {
      street: 'Jl. Wisma Damatex, RT.001/RW.001',
      industrialZone: 'Kawasan Industri Cikokol',
      kelurahan: 'Cikokol',
      kecamatan: 'Kec. Tangerang',
      city: 'Kota Tangerang',
      province: 'Banten',
      postalCode: '15117',
      country: 'Indonesia',
      phone: '+62 21 552-3456',
      fax: '+62 21 552-3457',
      receivingGate: 'Gate B — Machinery & Heavy Equipment Receiving Bay',
      receivingHours: 'Monday – Friday, 08:00 – 16:00 WIB',
      taxEntityNote: 'PT Indofood Fortuna Makmur — Cikokol Manufacturing Site (KLU Code Active)',
      coordinates: '-6.2088° S, 106.6340° E'
    },
    deliveryPort: 'Tanjung Priok Port, Jakarta (CIF/CIP)',
    projectTeamPics: [
      { name: 'Moh Yusuf Alfian', email: 'my.alfian@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' },
      { name: 'Angga Dwiki Wicaksono', email: 'angga.wicaksono@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' }
    ],
    purchasingTeamPics: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id', role: 'Purchasing Team PIC & Invoice Recipient', dept: 'PUR' },
      { name: 'Natania WS', email: 'natania.ws@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' },
      { name: 'Arief Setyawan', email: 'arief.setyawan@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' }
    ],
    purchasingAttn: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id' },
      { name: 'Natania WS', email: 'natania.ws@icbp.indofood.co.id' },
      { name: 'Arief Setyawan', email: 'arief.setyawan@icbp.indofood.co.id' }
    ],
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival shall be back-charged to the Seller.'
  },
  '1403': {
    code: '1403',
    plantName: 'Semarang Plant',
    siteTitle: 'PT Indofood Fortuna Makmur – Semarang',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur – Attn: Purchasing Department',
    address: 'Jl. Tambak Aji IV No. 10, Tambakaji, Kec. Ngaliyan, Kota Semarang, Jawa Tengah 50185, Indonesia',
    addressDetail: {
      street: 'Jl. Tambak Aji IV No. 10',
      industrialZone: 'Kawasan Industri Tambak Aji',
      kelurahan: 'Tambakaji',
      kecamatan: 'Kec. Ngaliyan',
      city: 'Kota Semarang',
      province: 'Jawa Tengah',
      postalCode: '50185',
      country: 'Indonesia',
      phone: '+62 24 866-1403',
      fax: '+62 24 866-1404',
      receivingGate: 'Main Logistics Gate 1 — Engineering & Capital Goods',
      receivingHours: 'Monday – Friday, 08:00 – 16:30 WIB',
      taxEntityNote: 'PT Indofood Fortuna Makmur — Semarang Plant (KLU Snack Manufacturing)',
      coordinates: '-6.9924° S, 110.3389° E'
    },
    deliveryPort: 'Semarang Port (CIF/CIP)',
    projectTeamPics: [
      { name: 'Moh Yusuf Alfian', email: 'my.alfian@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' },
      { name: 'Ayodya Maulana Gunoro', email: 'ayodya.gunoro@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' }
    ],
    purchasingTeamPics: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id', role: 'Purchasing Team PIC & Invoice Recipient', dept: 'PUR' },
      { name: 'Natalia Happy', email: 'natalia.happy@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' },
      { name: 'Yanuar Ari Wibowo', email: 'yanuar.wibowo@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' }
    ],
    purchasingAttn: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id' },
      { name: 'Natalia Happy', email: 'natalia.happy@icbp.indofood.co.id' },
      { name: 'Yanuar Ari Wibowo', email: 'yanuar.wibowo@icbp.indofood.co.id' }
    ],
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival shall be back-charged to the Seller.'
  },
  '1405': {
    code: '1405',
    plantName: 'Cikupa Plant',
    siteTitle: 'PT Indofood Fortuna Makmur – Cikupa',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur – Attn: Purchasing Department',
    address: 'Jl. Bhumimas II No. 5, Talaga, Kec. Cikupa, Kab. Tangerang, Banten 15710, Indonesia',
    addressDetail: {
      street: 'Jl. Bhumimas II No. 5',
      industrialZone: 'Kawasan Industri Cikupa Mas',
      kelurahan: 'Talaga',
      kecamatan: 'Kec. Cikupa',
      city: 'Kab. Tangerang',
      province: 'Banten',
      postalCode: '15710',
      country: 'Indonesia',
      phone: '+62 21 596-1405',
      fax: '+62 21 596-1406',
      receivingGate: 'Gate 2 — Capital Equipment Unloading Dock',
      receivingHours: 'Monday – Friday, 08:00 – 16:00 WIB',
      taxEntityNote: 'PT Indofood Fortuna Makmur — Cikupa Plant (KLU Code Active)',
      coordinates: '-6.2247° S, 106.5122° E'
    },
    deliveryPort: 'Tanjung Priok Port, Jakarta (CIF/CIP)',
    projectTeamPics: [
      { name: 'Moh Yusuf Alfian', email: 'my.alfian@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' }
    ],
    purchasingTeamPics: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' },
      { name: 'Muhammad Alfatih', email: 'muhammad.alfatih@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' }
    ],
    purchasingAttn: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id' },
      { name: 'Muhammad Alfatih', email: 'muhammad.alfatih@icbp.indofood.co.id' }
    ],
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival shall be back-charged to the Seller.'
  },
  '1411': {
    code: '1411',
    plantName: 'Agro Plant',
    siteTitle: 'PT Indofood Fortuna Makmur – Tangerang (1411)',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur – Attn: Purchasing Department',
    address: 'Jl. Wisma Damatex, RT.001/RW.001, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117, Indonesia',
    addressDetail: {
      street: 'Jl. Wisma Damatex, RT.001/RW.001',
      industrialZone: 'Kompleks Wisma Damatex — Agro Facility',
      kelurahan: 'Cikokol',
      kecamatan: 'Kec. Tangerang',
      city: 'Kota Tangerang',
      province: 'Banten',
      postalCode: '15117',
      country: 'Indonesia',
      phone: '+62 21 552-1411',
      fax: '+62 21 552-1412',
      receivingGate: 'Gate A — Agro & Import Capital Machinery Receiving',
      receivingHours: 'Monday – Friday, 08:00 – 16:00 WIB',
      taxEntityNote: 'PT Indofood Fortuna Makmur — Agro Plant (Import Duty Exemption / SKB PPh 26 & PMK 35/2019 Mandatory)',
      coordinates: '-6.2089° S, 106.6342° E'
    },
    deliveryPort: 'Tanjung Priok Port, Jakarta (CIF/CIP)',
    projectTeamPics: [
      { name: 'Moh Yusuf Alfian', email: 'my.alfian@icbp.indofood.co.id', role: 'Project Team PIC', dept: 'MFG' }
    ],
    purchasingTeamPics: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id', role: 'Purchasing Team PIC & Invoice Recipient', dept: 'PUR' },
      { name: 'Muhammad Alfatih', email: 'muhammad.alfatih@icbp.indofood.co.id', role: 'Purchasing Team PIC', dept: 'PUR' }
    ],
    purchasingAttn: [
      { name: 'Dewi Natalia', email: 'dewi.natalia@icbp.indofood.co.id' },
      { name: 'Muhammad Alfatih', email: 'muhammad.alfatih@icbp.indofood.co.id' }
    ],
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival shall be back-charged to the Seller.'
  }
};

export const DOCUMENT_SUBMISSION_COMPLIANCE =
  'All invoices, shipping documents, and supporting records must be submitted directly to the designated Purchasing recipients above. The Seller shall first submit softcopy drafts for IFM review and approval prior to dispatching original hardcopies. Any payment or customs clearance delays resulting from misdirected or non-compliant documentation shall be the sole responsibility of the Seller and shall under no circumstances excuse or extend the agreed project schedule.';

export const CONFIDENTIALITY_STANDARD =
  'All technical, commercial, and proprietary information disclosed within this document or during project execution shall remain strictly confidential. The Seller shall not disclose any such information to third parties without the prior written consent of PT Indofood Fortuna Makmur (IFM).';

export const LANGUAGE_REQUIREMENT_STANDARD =
  'English shall be the mandatory default language for all control systems, Operator Interface Terminals (OIT), Human-Machine Interfaces (HMI), physical panel/equipment nameplates, warning labels, engineering drawings, data sheets, software instructions, and O&M manuals.';

export const SERVICES_SCOPE_STANDARD = [
  {
    id: 'srv-1',
    title: 'Operator Training',
    description: 'Comprehensive classroom and on-site hands-on training enabling operators to safely and efficiently operate the system.'
  },
  {
    id: 'srv-2',
    title: 'Maintenance Training',
    description: 'Comprehensive classroom and on-site technical training enabling maintenance personnel to perform preventive maintenance, troubleshooting, and fault diagnostics.'
  },
  {
    id: 'srv-3',
    title: 'System Identification',
    description: 'Complete industrial tagging for all valves, instruments, cables, and electrical components matching the P&ID and electrical schematics.'
  }
];

export const ANCILLARIES_LOGISTICS_STANDARD = [
  'Interfacing, Factory Acceptance Test (FAT) / Shop Test, and modular disassembly.',
  'Pre-wired control panels and field junction boxes.',
  'Industrial seaworthy/roadworthy packing, crating, loading, and delivery under Franco Site (Local) or CIF/CIP Port/Site (Foreign) terms.',
  'Structural/civil support drawings and anchor bolt layouts (if applicable).'
];

export const TECHNICAL_HYGIENIC_REQUIREMENTS_12 = [
  {
    no: 1,
    title: 'Cleanability & Maintenance',
    description: 'All product-contact equipment shall be engineered for rapid cleaning, sanitization, and maintenance without contaminating or reacting with the product or CIP/cleaning agents.'
  },
  {
    no: 2,
    title: 'Hygienic Design',
    description: 'Must comply with international hygienic design standards (e.g., EHEDG / 3-A), featuring smooth, crevice-free, accessible, and self-draining surfaces in wet process zones.'
  },
  {
    no: 3,
    title: 'Structural Integrity',
    description: 'Equipment frames shall be fully seal-welded and free of open holes, exposed threads, or penetrating fasteners that could harbor contaminants.'
  },
  {
    no: 4,
    title: 'Piping & Ductwork',
    description: 'Fully drainable, easily cleanable, and engineered with zero dead legs (dead ends).'
  },
  {
    no: 5,
    title: 'Food-Grade Materials',
    description: 'All product-contact surfaces must be fabricated from certified, non-absorbent, corrosion-resistant food-grade stainless steel (minimum SUS304 or higher as specified).'
  },
  {
    no: 6,
    title: 'Instrument Calibration',
    description: 'Valid calibration certificates (with documented calibration points) must be provided for all measuring instruments (temperature, pressure, flow, load cells/weight sensors).'
  },
  {
    no: 7,
    title: 'Food-Grade & Material Certificates',
    description: 'Valid food-grade compliance certificates (FDA or EU 1935/2004) for all non-metallic contact parts (PTFE/Teflon, gaskets, hoses) and Mill Test Certificates (EN 10204 3.1) plus SDS/MSDS for metallic contact components.'
  },
  {
    no: 8,
    title: 'Control Panels & Enclosures',
    description: 'All control panels and junction boxes in wet or process areas must be constructed of SUS304 stainless steel with a minimum ingress protection rating of IP65.'
  },
  {
    no: 9,
    title: 'Motor Efficiency',
    description: 'All electric motors shall comply with minimum IE3 (Premium Efficiency) standards per IEC 60034-30-1.'
  },
  {
    no: 10,
    title: 'Local Isolation',
    description: 'Every motor drive shall be fitted with a lockable local isolator switch electrically interlocked with the safety control circuit.'
  },
  {
    no: 11,
    title: 'Contamination Prevention',
    description: 'All motors and gearboxes installed above or adjacent to open product zones must be equipped with stainless steel preventive drip/grease catch pans.'
  },
  {
    no: 12,
    title: 'Machine Guarding & Safety Interlocks',
    description: 'All rotating and moving parts must be fully enclosed with fixed or movable safety guards; all access doors/points must be interlocked with the safety control system via safety limit switches/interlocks.'
  }
];

export const CONTROL_SYSTEM_ACCESS_RIGHTS = [
  {
    no: 1,
    title: 'Unrestricted Source Code Delivery',
    description: 'The Seller must provide the latest, complete, and unlocked program/source code of PLC and HMI (OIT) without Password, enabling full backup, modification, and diagnostic access by the Buyer.'
  },
  {
    no: 2,
    title: 'Master Password Handover',
    description: 'All PLC and HMI (OIT) Master Passwords must be formally provided to the Buyer PIC prior to Final Acceptance.'
  }
];

export const FINAL_ACCEPTANCE_RULES = [
  {
    no: 1,
    title: 'On-Site Operational Acceptance',
    description: 'Final acceptance (SAT) shall occur on-site only after all equipment, control systems, and HMI/OIT units operate continuously and reliably in accordance with the agreed Target Performance Test parameters.'
  },
  {
    no: 2,
    title: 'Mandatory Training Completion',
    description: 'FAT/SAT must include comprehensive classroom and on-site training sessions for both Operators and Maintenance personnel, evidenced by signed training attendance sheets as mandatory close-out documents.'
  },
  {
    no: 3,
    title: 'Formal Sign-Off',
    description: 'All acceptance test reports and the Final Acceptance Certificate (FAC) must be formally signed by authorized representatives of both parties.'
  },
  {
    no: 4,
    title: 'Snag List (Punch List)',
    description: 'Any minor defects or pending items identified during testing must be recorded in a formal Snag List detailing corrective action plans, PIC, and binding completion timelines prior to final sign-off.'
  }
];

export const REMEDIES_CONSEQUENCES_STANDARD = [
  {
    no: 1,
    title: 'Rectification Period',
    description: "The Seller shall be fully responsible for undertaking all necessary corrective actions—including repairs, modifications, or machine/component replacement—within three (3) months from the Buyer's formal notification of performance test failure. All associated costs (including raw materials consumed during re-testing) shall be borne exclusively by the Seller."
  },
  {
    no: 2,
    title: 'Rejection & Full Refund',
    description: "Should the target performance standards remain unmet upon expiration of the three (3) month rectification period, the Seller shall refund 100% of all payments previously released by the Buyer and dismantle/remove the equipment from the Buyer's premises at the Seller's sole expense and risk."
  }
];

export const MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN = [
  {
    percent: '30%',
    stage: 'Down Payment',
    method: "Payable via T/T against submission of an irrevocable Advance Payment Bank Guarantee for the equivalent amount, transmitted via SWIFT/Telex directly from the Seller's bank to the Buyer's bank (issued by a reputable international bank acceptable to IFM)."
  },
  {
    percent: '55%',
    stage: 'Progress Payment',
    method: 'Payable via T/T against presentation of the original commercial invoice and complete shipping documents.'
  },
  {
    percent: '10%',
    stage: 'Commissioning Payment',
    method: 'Payable via T/T upon successful machine trial run and signed Acceptance Test Certificate per the performance test criteria, or no later than 60 calendar days from the Bill of Lading (B/L) date, provided any delay is not attributable to the Seller.'
  },
  {
    percent: '5%',
    stage: 'Retention Payment',
    method: 'Payable via T/T three (3) months after successful machine running and Final Acceptance Test Certificate to secure warranty obligations, or no later than 150 calendar days from the B/L date, provided any delay is not attributable to the Seller.'
  }
];

export const MATRIX_ENGINEERING_SERVICES_PAYMENT =
  '100% Payment: Payable via T/T after successful machine running with signed Acceptance Certificate, or no later than 150 calendar days from the B/L date, provided any delay is not attributable to the Seller (subject to the Seller providing a formal Undertaking Letter committing to complete remaining service works once the Buyer schedules site access).';

export const INVOICING_AND_BG_CONDITIONS = [
  'The Seller must provide a draft invoice for Buyer verification prior to dispatching the original hardcopy accompanied by the signed Acceptance Certificate.',
  "Transmission of the Bank Guarantee via SWIFT/Telex directly to the Buyer's bank is a strict condition precedent to Down Payment release. Any delay in Down Payment release caused by the Seller's non-compliance shall be borne entirely by the Seller and shall under no circumstances justify a delay in the project schedule."
];

export const SHIPMENT_DELIVERY_ITEMS_5 = [
  {
    no: 1,
    title: 'Delivery Schedule',
    description: 'All equipment shall be delivered strictly in accordance with prior agreed schedules to the designated site location.'
  },
  {
    no: 2,
    title: 'Incoterms',
    description: 'Quotation must be provided on a Franco Site basis (Local Vendor) or CIF/CIP Port/Site basis stating firm Ex-Works (EXW) lead time (Foreign Vendor).'
  },
  {
    no: 3,
    title: 'Cargo Insurance',
    description: "Where insured by the Seller, the Seller shall provide an original Insurance Policy/Certificate in duplicate endorsed for at least 110% of the invoice value covering Institute Cargo Clauses (A) / Air, with claims payable in Jakarta, Indonesia (to Bank Central Asia on the applicant's behalf)."
  },
  {
    no: 4,
    title: 'Vessel Age Certificate',
    description: 'For ocean freight under CFR/FOB where the Buyer covers insurance, the Seller must furnish a certificate from the shipping line/agent confirming the carrying vessel is not over 25 years old.'
  },
  {
    no: 5,
    title: 'Customs Clearance',
    description: 'IFM will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival shall be back-charged to the Seller.'
  }
];

export const WARRANTY_STANDARD =
  'The Seller shall warrant the entire system, machinery, and workmanship against defects for a minimum period of twelve (12) months of continuous operation following Final Acceptance (FAC). Technical support (including telephone/remote system diagnostics) shall be available during standard business hours throughout the warranty period.';

export const REQUIRED_DOCUMENTATION_13 = [
  { id: 1, title: 'As-Built Drawings', desc: 'Complete mechanical and electrical/control panel as-built drawings.', required: true },
  { id: 2, title: 'Cabling Schedule', desc: 'Detailed power, control, and instrumentation cabling schedule.', required: true },
  { id: 3, title: 'Functional Design Specification (FDS)', desc: 'Complete Functional Design Specification.', required: true },
  { id: 4, title: 'Software Design Specification (SDS)', desc: 'Comprehensive PLC/HMI software design specifications.', required: true },
  { id: 5, title: 'PLC & HMI (OIT) Source Code & Master Password', desc: 'The Seller must provide the latest program/source code of PLC and HMI (OIT) without Password, and formally provide all PLC and HMI (OIT) Master Passwords to the Buyer PIC.', required: true },
  { id: 6, title: 'Operational Manual', desc: 'Comprehensive operational manual for the equipment.', required: true },
  { id: 7, title: 'Maintenance Manual', desc: 'Preventive and corrective maintenance manual for the equipment.', required: true },
  { id: 8, title: 'Operator Work Instructions', desc: 'Detailed step-by-step working instructions for operators.', required: true },
  { id: 9, title: 'Recommended Spare Parts List', desc: 'Categorized list of recommended spare parts with OEM part numbers.', required: true },
  { id: 10, title: 'Recommended Maintenance Schedule', desc: 'Interval-based preventive maintenance schedule.', required: true },
  { id: 11, title: 'Calibration Certificates', desc: 'Valid calibration certificates for all measurement instruments.', required: true },
  { id: 12, title: 'Halal Compliance Documentation', desc: 'Valid Halal Certificate or formal Statement Letter confirming that all equipment components and lubricants are not made from and have not come into contact with non-halal materials.', required: true },
  { id: 13, title: 'Equipment Layout Drawings', desc: 'Complete equipment layout drawings (top view, elevation view, and interface sections) in editable AutoCAD (.dwg) and PDF formats.', required: true }
];

export const APPENDICES_6 = [
  { id: 'app-1', code: 'Appendix 1', title: 'Technical Specifications', desc: 'Detailed product parameters, process operating thresholds, and engineering scope of supply.', included: true },
  { id: 'app-2', code: 'Appendix 2', title: 'Target Performance Table', desc: 'FAT/SAT acceptance criteria, continuous run-test duration, and measurable KPI benchmarks.', included: true },
  { id: 'app-3', code: 'Appendix 3', title: 'Bank Guarantee Format', desc: 'Irrevocable Advance Payment Bank Guarantee wording for SWIFT/Telex transmission.', included: true },
  { id: 'app-4', code: 'Appendix 4', title: 'PMK No. 35/PMK.03/2019 (Time Test & Permanent Establishment)', desc: 'Indonesian tax regulation reference governing 6-month Time Test, BUT, NPWP, and PPh 26/23.', included: true },
  { id: 'app-5', code: 'Appendix 5', title: 'PP No. 44 Tahun 2022 Pasal 23 Ayat (2) (Local Tax Invoice)', desc: 'Indonesian VAT regulation governing commercial DPP invoicing first and Faktur Pajak on payment date.', included: true },
  { id: 'app-6', code: 'Appendix 6', title: 'Draft Sales Contract', desc: 'PT Indofood Fortuna Makmur binding standard Sales Contract / Purchase Order reference template.', included: true }
];

export const TRSA_COMPLIANCE_MATRIX = [
  {
    id: 'I.i',
    itemNo: 'I.i',
    clauseTitle: 'Project Title',
    category: 'Identification',
    summary: '[To be specified per Tender / Project]',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'I.ii',
    itemNo: 'I.ii',
    clauseTitle: 'Document Number',
    category: 'Identification',
    summary: '[To be specified per Tender / Project]',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'I.iii',
    itemNo: 'I.iii',
    clauseTitle: 'Revision History',
    category: 'Identification',
    summary: '[To be maintained per Document Control standard]',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'II',
    itemNo: 'II',
    clauseTitle: 'Project Description',
    category: 'Scope Overview',
    summary: 'Detailed scope, technical objectives, and operational background of the project as defined in the Tender Package.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'III',
    itemNo: 'III',
    clauseTitle: 'Key Dates',
    category: 'Schedule',
    summary: 'Binding project milestones, including tender submission, technical clarification, PO issuance, delivery, installation, and commissioning schedules.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IV',
    itemNo: 'IV',
    clauseTitle: 'Key Contacts',
    category: 'Stakeholders',
    summary: 'Exclusive correspondence via authorized IFM User/Engineering, Project Team, and Purchasing Team PICs per site.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'V.site',
    itemNo: 'V',
    clauseTitle: 'Site Description & Delivery Address',
    category: 'Site & Billing',
    summary: 'Authorized delivery address for 1405 (Cikupa), 1402/1411 (Tangerang - Jl. Wisma Damatex), and 1403 (Semarang - Jl. Tambak Aji IV No. 10).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'V.invoice',
    itemNo: 'V',
    clauseTitle: 'Invoice & Original Document Recipient',
    category: 'Site & Billing',
    summary: 'All invoices & shipping documents issued to PT Indofood Fortuna Makmur – Attn: Purchasing Department with plant-specific recipients.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'V.submission',
    itemNo: 'V',
    clauseTitle: 'Document Submission & Compliance',
    category: 'Site & Billing',
    summary: DOCUMENT_SUBMISSION_COMPLIANCE,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VI',
    itemNo: 'VI',
    clauseTitle: 'Confidentiality',
    category: 'Governance',
    summary: CONFIDENTIALITY_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VII',
    itemNo: 'VII',
    clauseTitle: 'Language Requirements',
    category: 'Governance',
    summary: LANGUAGE_REQUIREMENT_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VIII',
    itemNo: 'VIII',
    clauseTitle: 'Product Specifications',
    category: 'Technical',
    summary: 'Strict conformity to technical parameters, capacity, and quality specifications in the Technical Specification Attachment.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.A',
    itemNo: 'IX.A',
    clauseTitle: 'Equipment Scope',
    category: 'Scope of Supply',
    summary: 'Complete design, engineering, manufacturing, factory testing, and supply of main machinery, control panels, and automation.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.B',
    itemNo: 'IX.B',
    clauseTitle: 'Services Scope',
    category: 'Scope of Supply',
    summary: 'Supervised installation, testing & commissioning complete with Operator Training, Maintenance Training, and P&ID System Identification.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.C',
    itemNo: 'IX.C',
    clauseTitle: 'Ancillaries & Logistics',
    category: 'Scope of Supply',
    summary: 'FAT/Shop Test & modular disassembly, pre-wired panels & J-boxes, seaworthy/roadworthy packing (Franco/CIF/CIP), civil/anchor drawings.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.D',
    itemNo: 'IX.D',
    clauseTitle: 'General Technical & Hygienic Requirements (12 Rules)',
    category: 'Technical & Hygiene',
    summary: 'EHEDG/3-A design, seal-welded frames, zero dead-leg piping, min SUS304, calibration certs, FDA/EU 1935/2004 + EN 10204 3.1 + SDS/MSDS, IP65 panels, IE3 motors, lockable safety isolators, drip/grease pans, interlocked guards.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.E',
    itemNo: 'IX.E',
    clauseTitle: 'Control System, Software & Access Rights',
    category: 'Automation',
    summary: 'Unlocked PLC & HMI (OIT) source code without password + formal handover of all Master Passwords prior to Final Acceptance.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'X',
    itemNo: 'X',
    clauseTitle: 'Target Performance Test',
    category: 'Acceptance',
    summary: 'Execution of FAT & SAT against measurable KPIs (capacity, efficiency, reject rate, product quality) and run-test duration.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XI',
    itemNo: 'XI',
    clauseTitle: 'Final Acceptance',
    category: 'Acceptance',
    summary: 'On-site SAT continuous reliability, signed Operator & Maintenance training attendance sheets, formal FAC sign-off, and binding Snag List (Punch List).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XII',
    itemNo: 'XII',
    clauseTitle: 'Remedies & Consequences if Target is Not Reached',
    category: 'Commercial Risk',
    summary: '3-month rectification period (including raw materials consumed borne by Seller), or rejection with 100% full refund & dismantling/removal at Seller expense.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.eq',
    itemNo: 'XIII',
    clauseTitle: 'Equipment Payment Schedule',
    category: 'Payment Terms',
    summary: '30% DP T/T vs SWIFT/Telex APBG, 55% Progress T/T vs original invoice & shipping docs, 10% Commissioning T/T (<=60d B/L), 5% Retention T/T 3 mos (<=150d B/L).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.srv',
    itemNo: 'XIII',
    clauseTitle: 'Engineering Services Payment',
    category: 'Payment Terms',
    summary: '100% T/T after machine running w/ Acceptance Certificate or <=150 calendar days from B/L subject to formal Undertaking Letter.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.bg',
    itemNo: 'XIII',
    clauseTitle: 'Invoicing & Bank Guarantee Conditions',
    category: 'Payment Terms',
    summary: 'Draft invoice verification required before hardcopy dispatch; SWIFT/Telex Bank Guarantee is a strict condition precedent to DP release.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIV',
    itemNo: 'XIV',
    clauseTitle: 'Shipment and Delivery',
    category: 'Logistics',
    summary: 'Schedule adherence, Franco Site / CIF-CIP + EXW lead time, 110% ICC(A)/Air Cargo Insurance (payable Jakarta to BCA), <=25yr Vessel Age Cert, Customs Clearance demurrage back-charge.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XV',
    itemNo: 'XV',
    clauseTitle: 'Warranty',
    category: 'After-Sales',
    summary: WARRANTY_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.quote',
    itemNo: 'XVI',
    clauseTitle: 'Quotation Breakdown',
    category: 'Tax & Regulatory',
    summary: 'Separate, itemized quotations for Equipment Supply and Engineering Services costs.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.duty',
    itemNo: 'XVI',
    clauseTitle: 'Import Duty Exemption & Free Demurrage',
    category: 'Tax & Regulatory',
    summary: 'Valid CoO/duty exemption (Form E, AK, IJEPA) and minimum 14 calendar days free demurrage at port of discharge; failures deducted from contract value.',
    plants: ['1411'],
    origins: ['Foreign']
  },
  {
    id: 'XVI.pph26',
    itemNo: 'XVI',
    clauseTitle: 'Foreign Vendor Withholding Tax (PPh 26 / DGT Form)',
    category: 'Tax & Regulatory',
    summary: '20% PPh 26; DGT treaty relief (5% CH, 7.5% DE, 10% IN/LU/PG/VE/ZW, 15% PK, 0% other); PMK 35/PMK.03/2019 6-month Time Test requiring BUT + NPWP.',
    plants: ['1411'],
    origins: ['Foreign']
  },
  {
    id: 'XVI.visa',
    itemNo: 'XVI',
    clauseTitle: 'Visa & Engineer Mobilization Expenses',
    category: 'Tax & Regulatory',
    summary: 'Valid Working Visa required (Indonesia visa by IFM, home visa by Seller); clear cost split between Foreign vs Local engineers.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.local',
    itemNo: 'XVI',
    clauseTitle: 'Local Vendor Taxation & Invoicing',
    category: 'Tax & Regulatory',
    summary: 'Indonesian PPN & PPh per Seller KLU Code; PP No. 44 Tahun 2022 Pasal 23 Ayat (2) commercial DPP invoice first + Faktur Pajak on payment date; Kwitansi + Materai.',
    plants: ['1402', '1403', '1405'],
    origins: ['Local']
  },
  {
    id: 'XVI.contract',
    itemNo: 'XVI',
    clauseTitle: 'Payment Term & Contract Issuance',
    category: 'Tax & Regulatory',
    summary: 'Payment within max 30 calendar days of approved original hardcopy docs; formalized via official PO and/or Sales Contract (Appendix 6).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVII',
    itemNo: 'XVII',
    clauseTitle: 'Required Documentation (13 Deliverables)',
    category: 'Close-Out Docs',
    summary: 'Complete English softcopy & hardcopy deliverables prior to Final Acceptance (As-Built, Cabling, FDS, SDS, Unlocked PLC/HMI + Master Passwords, Manuals, Work Instructions, Spare Parts, Maintenance Schedule, Calibration, Halal, Layout .dwg/.pdf).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVIII',
    itemNo: 'XVIII',
    clauseTitle: 'Acknowledged and Approved By',
    category: 'Execution',
    summary: 'Formal execution and sign-off by authorized representatives of The Seller and PT Indofood Fortuna Makmur (The Buyer).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIX',
    itemNo: 'XIX',
    clauseTitle: 'Attachments / Appendices (6 Appendices)',
    category: 'Appendices',
    summary: 'Binding reference appendices: Technical Specifications, Target Performance Table, Bank Guarantee Format, PMK 35/2019, PP 44/2022, Draft Sales Contract.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  }
];

export function resolvePlantCode(plantLocationOrCode = '') {
  const raw = String(plantLocationOrCode || '').toLowerCase();
  if (raw.includes('1402') || raw.includes('cikokol')) return '1402';
  if (raw.includes('1403') || raw.includes('semarang')) return '1403';
  if (raw.includes('1405') || raw.includes('cikupa')) return '1405';
  if (raw.includes('1411') || raw.includes('agro')) return '1411';
  return '1403';
}

export function normalizeOriginMode(origin = 'Foreign') {
  const raw = String(origin || '').trim().toLowerCase();
  if (raw === 'local') return 'Local';
  if (raw === 'mixed') return 'Mixed';
  return 'Foreign';
}

export function isClauseApplicable(clauseRow, plantLocationOrCode = '1403', vendorOrigin = 'Foreign') {
  if (!clauseRow) return false;
  const code = resolvePlantCode(plantLocationOrCode);
  const origin = normalizeOriginMode(vendorOrigin);
  const plantMatch = Array.isArray(clauseRow.plants) ? clauseRow.plants.includes(code) : true;
  if (!plantMatch) return false;

  const allowedOrigins = Array.isArray(clauseRow.origins) ? clauseRow.origins : ['Local', 'Foreign'];
  if (origin === 'Mixed') {
    return allowedOrigins.includes('Local') || allowedOrigins.includes('Foreign');
  }
  return allowedOrigins.includes(origin);
}

export function getApplicableMatrixClauses(plantLocationOrCode = '1403', vendorOrigin = 'Foreign') {
  return TRSA_COMPLIANCE_MATRIX.filter(row => isClauseApplicable(row, plantLocationOrCode, vendorOrigin));
}

export function resolveContactsForPlant(plantLocationOrCode = '1403') {
  const code = resolvePlantCode(plantLocationOrCode);
  const profile = PLANT_MATRIX_PROFILES[code] || PLANT_MATRIX_PROFILES['1403'];
  const address = profile.address;

  const allContacts = [
    ...profile.projectTeamPics.map((p, idx) => ({
      id: `matrix-proj-${code}-${idx + 1}`,
      name: p.name,
      role: `${p.role} (${code} ${profile.plantName})`,
      companyAddress: `${profile.siteTitle}, ${address}`,
      email: p.email,
      group: 'Project Team PIC',
      isPrimary: p.name === 'Moh Yusuf Alfian'
    })),
    ...profile.purchasingTeamPics.map((p, idx) => ({
      id: `matrix-pur-${code}-${idx + 1}`,
      name: p.name,
      role: `${p.role} (${code} ${profile.plantName})`,
      companyAddress: `${profile.siteTitle}, ${address}`,
      email: p.email,
      group: 'Purchasing Team PIC',
      isPrimary: p.name === 'Dewi Natalia' || p.name === 'Natalia Happy'
    })),
    ...USER_ENGINEERING_PICS.map((p, idx) => ({
      id: `matrix-eng-${code}-${idx + 1}`,
      name: p.name,
      role: p.role,
      companyAddress: `${profile.siteTitle}, ${address}`,
      email: p.email,
      group: 'User / Engineering PIC',
      isPrimary: false
    }))
  ];

  return {
    plantCode: code,
    profile,
    userEngineeringPics: USER_ENGINEERING_PICS,
    projectTeamPics: profile.projectTeamPics,
    purchasingTeamPics: profile.purchasingTeamPics,
    purchasingAttn: profile.purchasingAttn,
    contacts: allContacts
  };
}

export function buildLegalAndTaxProvisions(plantLocationOrCode = '1403', vendorOrigin = 'Foreign') {
  const code = resolvePlantCode(plantLocationOrCode);
  const origin = normalizeOriginMode(vendorOrigin);
  const provisions = [];

  // Always applicable (1402, 1403, 1405, 1411 | Local & Foreign)
  provisions.push({
    matrixId: 'XVI.quote',
    title: 'Quotation Breakdown',
    description: 'The Seller shall provide separate, itemized quotations for Equipment Supply and Engineering Services costs.',
    applicablePlants: ['1402', '1403', '1405', '1411'],
    applicableOrigins: ['Local', 'Foreign']
  });

  // 1411 + Foreign (or Mixed on 1411)
  if (code === '1411' && (origin === 'Foreign' || origin === 'Mixed')) {
    provisions.push({
      matrixId: 'XVI.duty',
      title: 'Import Duty Exemption & Free Demurrage (14 Days)',
      description: 'The Seller shall furnish valid Certificates of Origin / duty exemption documentation (e.g., Form E, AK, IJEPA) for countries with an Economic Partnership / Free Trade Agreement with Indonesia and provide a minimum of fourteen (14) calendar days of free demurrage at port of discharge. Any incurred import duties, demurrage, or detention from failure to comply shall be borne by Seller and deducted from total contract value.',
      applicablePlants: ['1411'],
      applicableOrigins: ['Foreign']
    });
    provisions.push({
      matrixId: 'XVI.pph26',
      title: 'Foreign Vendor Withholding Tax (PPh 26 / DGT Form & PMK 35/2019)',
      description: 'Engineering Services costs rendered by a Foreign Seller are subject to 20% Indonesian Withholding Tax (PPh Article 26). Valid Certificate of Domicile (DGT Form) prior to payment entitles treaty rates (5% Switzerland, 7.5% Germany, 10% India/Luxembourg/PNG/Venezuela/Zimbabwe, 15% Pakistan, 0% other treaty countries). Per PMK No. 35/PMK.03/2019 (Appendix 4), exceeding the 6-month accumulative Time Test in 12 months requires Permanent Establishment (BUT) + NPWP (PPh 23 / corporate tax); failure invalidates DGT and triggers 20% PPh 26.',
      applicablePlants: ['1411'],
      applicableOrigins: ['Foreign']
    });
  }

  // Always applicable (1402, 1403, 1405, 1411 | Local & Foreign)
  provisions.push({
    matrixId: 'XVI.visa',
    title: 'Visa & Engineer Mobilization Expenses',
    description: 'Engineers must hold valid Working Visas (Indonesian visa managed & paid by IFM; home-country visa by Seller). Foreign Company Engineers: Seller bears daily allowances, international/domestic airfares & insurance; IFM bears hotel accommodation, standard meals & local transport directly related to project execution (excluding alcohol, cigarettes & personal expenses). Local Company Engineers: ALL mobilization costs (allowances, air/land tickets, insurance, hotel, meals, local transport) borne exclusively by Seller.',
    applicablePlants: ['1402', '1403', '1405', '1411'],
    applicableOrigins: ['Local', 'Foreign']
  });

  // 1402, 1403, 1405 + Local (or Mixed on those plants)
  if (['1402', '1403', '1405'].includes(code) && (origin === 'Local' || origin === 'Mixed')) {
    provisions.push({
      matrixId: 'XVI.local',
      title: 'Local Vendor Taxation & Invoicing (PPN, PPh, KLU & PP 44/2022)',
      description: "Subject to Indonesian PPN (VAT) and PPh (Income Tax) per prevailing tax regulations and Seller's registered Company KLU Code (supporting KLU docs required). Faktur Pajak issuance shall comply with PP No. 44 Tahun 2022 Pasal 23 Ayat (2) (Appendix 5): for Down Payment and Progress Payments, issue commercial DPP invoice first, then Faktur Pajak bearing the exact payment receipt date. Original invoices must attach complete supporting documents and duly signed Kwitansi affixed with valid Materai.",
      applicablePlants: ['1402', '1403', '1405'],
      applicableOrigins: ['Local']
    });
  }

  // Always applicable (1402, 1403, 1405, 1411 | Local & Foreign)
  provisions.push({
    matrixId: 'XVI.contract',
    title: 'Payment Term & Contract Issuance (Max 30 Days & Appendix 6)',
    description: 'Invoices will be paid within a maximum of thirty (30) calendar days after receipt of complete, approved original hardcopy documents by IFM. PT Indofood Fortuna Makmur will formalize award by issuing an official Purchase Order (PO) and/or Sales Contract (as outlined in Appendix 6).',
    applicablePlants: ['1402', '1403', '1405', '1411'],
    applicableOrigins: ['Local', 'Foreign']
  });

  return provisions;
}

export function getShipmentTermsForMatrix(plantLocationOrCode = '1403', vendorOrigin = 'Foreign') {
  const code = resolvePlantCode(plantLocationOrCode);
  const profile = PLANT_MATRIX_PROFILES[code] || PLANT_MATRIX_PROFILES['1403'];
  const origin = normalizeOriginMode(vendorOrigin);

  if (origin === 'Local') {
    return `Franco Site / Franco Pabrik ${profile.siteTitle} (${profile.address}). Delivered strictly to agreed schedules. Domestic inland freight and transit risk borne by Seller.`;
  }
  if (origin === 'Mixed') {
    return `Dual Terms: Offshore machinery CIF / CIP ${profile.deliveryPort} stating firm EXW lead time (110% ICC(A)/Air Cargo Insurance payable Jakarta to Bank Central Asia; carrying vessel <= 25 years for CFR/FOB). Onshore/local scope delivered Franco Site ${profile.siteTitle}.`;
  }
  return `CIF / CIP ${profile.deliveryPort} stating firm Ex-Works (EXW) lead time. Duplicate original Insurance Policy/Certificate >= 110% invoice value covering ICC (A)/Air payable in Jakarta to Bank Central Asia (BCA). Carrying vessel must not exceed 25 years (CFR/FOB). Customs clearance by IFM upon original shipping docs.`;
}

export function auditProjectMatrixCompliance(project) {
  const p = project || {};
  const plantLoc = p.documentInfo?.plantLocation || p.generalInfo?.plantLocation || 'Semarang Plant';
  const plantCode = resolvePlantCode(plantLoc);
  const vendorOrigin = normalizeOriginMode(p.documentInfo?.vendorOrigin || p.commercialTerms?.vendorOrigin || 'Foreign');
  const profile = PLANT_MATRIX_PROFILES[plantCode] || PLANT_MATRIX_PROFILES['1403'];
  const applicableRows = getApplicableMatrixClauses(plantCode, vendorOrigin);

  const checks = [];
  const addCheck = (id, title, passed, detail) => {
    checks.push({ id, title, passed: Boolean(passed), detail });
  };

  // I-III: Identification, Description & Key Dates
  addCheck('I-III', 'Identification, Project Overview & Key Dates',
    Boolean(p.documentInfo?.title && p.documentInfo?.docNumber && p.projectOverview?.description && p.projectOverview?.keyDates?.lineStartUp),
    'Project title, TRSA document control number, revision history, and milestones.'
  );

  // IV: Key Contacts match authorized matrix emails
  const contactEmails = new Set((p.keyContacts || []).map(c => String(c.email || '').trim().toLowerCase()));
  const expectedEmails = [
    ...USER_ENGINEERING_PICS.map(u => u.email.toLowerCase()),
    ...profile.projectTeamPics.map(u => u.email.toLowerCase()),
    ...profile.purchasingTeamPics.map(u => u.email.toLowerCase())
  ];
  const missingContacts = expectedEmails.filter(e => !contactEmails.has(e));
  addCheck('IV', `Authorized Site & Engineering PICs (Plant ${plantCode})`,
    missingContacts.length === 0,
    missingContacts.length === 0
      ? `All ${expectedEmails.length} IFM Matrix contacts for Plant ${plantCode} are present.`
      : `Missing ${missingContacts.length} authorized PIC email(s): ${missingContacts.join(', ')}`
  );

  // V: Site Description, Invoice Recipient & Document Submission Compliance
  const siteAddressOk = Boolean(p.siteDescription?.address && (
    (plantCode === '1403' && p.siteDescription.address.includes('Tambak Aji IV')) ||
    ((plantCode === '1402' || plantCode === '1411') && p.siteDescription.address.includes('Wisma Damatex')) ||
    (plantCode === '1405' && p.siteDescription.address.includes('Bhumimas II'))
  ));
  const docSubmitOk = Boolean(p.siteDescription?.documentSubmissionCompliance);
  addCheck('V', 'Site Delivery Address, Invoice Recipient & Doc Submission Rule',
    siteAddressOk && docSubmitOk,
    siteAddressOk && docSubmitOk
      ? `Address & softcopy-first submission clause aligned for Plant ${plantCode}.`
      : `Update Site Address (${profile.address}) and Document Submission Compliance rule.`
  );

  // VI & VII: Confidentiality & English Language Requirements
  const langStr = String(p.projectOverview?.languageRequirement || '').toLowerCase();
  const langOk = langStr.includes('oit') && langStr.includes('hmi') && langStr.includes('nameplates') && langStr.includes('warning labels');
  addCheck('VI-VII', 'Confidentiality & Full English Language Clause',
    Boolean(p.projectOverview?.confidentialityClause) && langOk,
    langOk
      ? 'Includes OIT, HMI, physical nameplates, warning labels, drawings, data sheets & O&M manuals.'
      : 'Language clause should specify OIT, HMI, physical nameplates, warning labels, drawings & O&M manuals.'
  );

  // VIII-IX: Product Specs + Scope + 12 Technical & Hygienic Rules + Control System Access
  const tech12 = p.hygieneAndQuality?.generalTechnicalHygienic12 || [];
  const ctrlAccess = p.scopeOfSupply?.controlSystemAccess || [];
  const srvScope = p.scopeOfSupply?.servicesScope || [];
  addCheck('IX.B-E', 'Services, Ancillaries, 12 Technical/Hygienic Rules & Unlocked PLC/HMI',
    tech12.length >= 12 && ctrlAccess.length >= 2 && srvScope.length >= 3,
    `Tech/Hygiene rules: ${tech12.length}/12 · Services: ${srvScope.length}/3 · Control Access: ${ctrlAccess.length}/2`
  );

  // X-XII: Performance Test, Final Acceptance (Snag List & Training Sheets) & 100% Refund Remedy
  const facStr = String(p.performanceAcceptance?.finalAcceptance || '').toLowerCase();
  const hasFacList = Array.isArray(p.performanceAcceptance?.finalAcceptanceChecklist) && p.performanceAcceptance.finalAcceptanceChecklist.length >= 4;
  const remList = p.performanceAcceptance?.remediesAndConsequences || [];
  addCheck('X-XII', 'Performance Trial, Final Acceptance (Training + Snag List) & Remedies',
    (facStr.includes('snag list') || hasFacList) && remList.length >= 2,
    'Verifies signed training attendance sheets, Snag List (Punch List), 3-month rectification, and 100% refund/dismantle clause.'
  );

  // XIII-XV: Payment Schedule (30/55/10/5 & 150d Undertaking Letter), SWIFT BG, Shipment (5 items), 12M FAC Warranty
  const hasMatrixSchedule = Array.isArray(p.commercialTerms?.matrixEquipmentSchedule) && p.commercialTerms.matrixEquipmentSchedule.length === 4;
  const hasUndertaking = String(p.commercialTerms?.engineeringServicesPayment || '').toLowerCase().includes('undertaking letter');
  const hasBgCond = Array.isArray(p.commercialTerms?.invoicingAndBankGuarantee) && p.commercialTerms.invoicingAndBankGuarantee.length >= 2;
  const hasShip5 = Array.isArray(p.commercialTerms?.shipmentItems) && p.commercialTerms.shipmentItems.length >= 5;
  addCheck('XIII-XV', 'Payment Schedule, SWIFT BG, Undertaking Letter, Shipment (5) & 12M Warranty',
    hasMatrixSchedule && hasUndertaking && hasBgCond && hasShip5,
    'Checks 30/55/10/5 T/T schedule, 150-day Engineering Services Undertaking Letter, SWIFT/Telex BG condition, and 5 shipment rules.'
  );

  // XVI: Plant x Origin Administrative, Tax & Regulatory Provisions
  const expectedProvIds = buildLegalAndTaxProvisions(plantCode, vendorOrigin).map(pr => pr.matrixId);
  const actualProvIds = new Set((p.legalAndTaxProvisions || []).map(pr => pr.matrixId).filter(Boolean));
  const missingProvIds = expectedProvIds.filter(id => !actualProvIds.has(id));
  addCheck('XVI', `Administrative & Tax Provisions (Plant ${plantCode} × ${vendorOrigin})`,
    missingProvIds.length === 0,
    missingProvIds.length === 0
      ? `All ${expectedProvIds.length} applicable Clause XVI provisions match Plant ${plantCode} × ${vendorOrigin}.`
      : `Missing or out-of-sync Clause XVI rules: ${missingProvIds.join(', ')}`
  );

  // XVII: 13 Required Documents
  const docs = p.requiredDocumentation || [];
  const hasMasterPwdDoc = docs.some(d => String(d.title || '').toLowerCase().includes('master password'));
  addCheck('XVII', 'Required Documentation (13 PDF Deliverables)',
    docs.length === 13 && hasMasterPwdDoc,
    `${docs.length}/13 deliverables configured (must include unlocked PLC & HMI Source Code & Master Password + .dwg/.pdf layouts).`
  );

  // XIX: 6 Reference Appendices
  const apps = p.appendices || [];
  addCheck('XIX', 'Attachments / Reference Appendices (6 Appendices)',
    apps.length >= 6,
    `${apps.length}/6 binding appendices attached (Tech Specs, Target Perf, BG Format, PMK 35/2019, PP 44/2022, Draft Sales Contract).`
  );

  const passedCount = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const complianceScore = totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 0;

  return {
    plantCode,
    plantName: profile.plantName,
    vendorOrigin,
    totalMatrixRows: TRSA_COMPLIANCE_MATRIX.length,
    applicableMatrixRows: applicableRows.length,
    applicableIds: applicableRows.map(r => r.id),
    passedCount,
    totalChecks,
    complianceScore,
    checks,
    discrepancies: checks.filter(c => !c.passed)
  };
}
