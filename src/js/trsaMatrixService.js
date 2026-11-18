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
    siteTitle: 'PT Indofood Fortuna Makmur – Cikokol',
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
      { name: 'Natania WS', email: 'natania.ws@icbp.indofood.co.id' },
      { name: 'Arief Setyawan', email: 'arief.setyawan@icbp.indofood.co.id' }
    ],
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
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
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
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
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
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
    customClearanceNote: 'Indofood will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
  }
};

export const DOCUMENT_SUBMISSION_COMPLIANCE =
  'All invoices, shipping documents, and supporting records must be submitted directly to the designated Purchasing recipients above. The Seller must first submit softcopy drafts for IFM review and approval prior to dispatching original hardcopies. Any payment or customs clearance delays resulting from misdirected or non-compliant documentation must be the sole responsibility of the Seller and must under no circumstances excuse or extend the agreed project schedule.';

export const CONFIDENTIALITY_STANDARD =
  'All technical, commercial, and proprietary information disclosed within this document or during project execution must remain strictly confidential. The Seller must not disclose any such information to third parties without the prior written consent of PT Indofood Fortuna Makmur (IFM).';

export const LANGUAGE_REQUIREMENT_STANDARD =
  'English must be the mandatory default language for all control systems, Operator Interface Terminals (OIT), Human-Machine Interfaces (HMI), physical panel/equipment nameplates, warning labels, engineering drawings, data sheets, software instructions, and O&M manuals.';

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
    description: 'All product-contact equipment must be engineered for rapid cleaning, sanitization, and maintenance without contaminating or reacting with the product or CIP/cleaning agents.'
  },
  {
    no: 2,
    title: 'Hygienic Design',
    description: 'Must comply with international hygienic design standards (e.g., EHEDG / 3-A), featuring smooth, crevice-free, accessible, and self-draining surfaces in wet process zones.'
  },
  {
    no: 3,
    title: 'Structural Integrity',
    description: 'Equipment frames must be fully seal-welded and free of open holes, exposed threads, or penetrating fasteners that could harbor contaminants.'
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
    description: 'All electric motors must comply with minimum IE3 (Premium Efficiency) standards per IEC 60034-30-1.'
  },
  {
    no: 10,
    title: 'Local Isolation',
    description: 'Every motor drive must be fitted with a lockable local isolator switch electrically interlocked with the safety control circuit.'
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
    description: 'All PLC and HMI (OIT) Master Passwords (for software & Hardware) must be formally provided to the Buyer PIC prior to Final Acceptance.'
  }
];

export const FINAL_ACCEPTANCE_RULES = [
  {
    no: 1,
    title: '',
    description: 'Final acceptance (SAT) must occur on-site only after all equipment, control systems, and HMI/OIT units operate continuously and reliably in accordance with the agreed Target Performance Test parameters.'
  },
  {
    no: 2,
    title: '',
    description: 'FAT/SAT must include comprehensive classroom and on-site training sessions for both Operators and Maintenance personnel, evidenced by signed training attendance sheets as mandatory close-out documents.'
  },
  {
    no: 3,
    title: '',
    description: 'All acceptance test reports and the Final Acceptance Certificate (FAC) must be formally signed by authorized representatives of both parties.'
  },
  {
    no: 4,
    title: '',
    description: '(if) Any minor defects or pending items identified during testing must be recorded in a formal Snag List detailing corrective action plans, PIC, and binding completion timelines prior to final sign-off.'
  }
];

export const REMEDIES_CONSEQUENCES_STANDARD = [
  {
    no: 1,
    title: '',
    description: "The Seller must be fully responsible for undertaking all necessary corrective actions—including repairs, modifications, or machine/component replacement—within three (3) months from the Buyer's formal notification of performance test failure. All associated costs (including raw materials consumed during re-testing) must be borne exclusively by the Seller."
  },
  {
    no: 2,
    title: '',
    description: "Should the target performance standards remain unmet upon expiration of the three (3) month rectification period, the Seller must refund 100% of all payments previously released by the Buyer and dismantle/remove the equipment from the Buyer's premises at the Seller's sole expense and risk."
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
  "Transmission of the Bank Guarantee via SWIFT/Telex directly to the Buyer's bank is a strict condition precedent to Down Payment release. Any delay in Down Payment release caused by the Seller's non-compliance must be borne entirely by the Seller and must under no circumstances justify a delay in the project schedule."
];

export const ENGINEERING_SERVICES_PAYMENT_CLAUSES = [
  MATRIX_ENGINEERING_SERVICES_PAYMENT,
  'Engineering Services Payment: Payment for on-site engineering and technical support services performed by the Seller’s engineers or personnel at the Buyer’s premises—including, but not limited to, kick-off meetings, installation supervision, commissioning, and operator training.',
  'Payment for Engineering Services is strictly contingent upon the Buyer’s receipt of an original, color-printed DGT-1 Form (Certificate of Domicile). The Buyer reserves the right to withhold payment until such valid documentation is duly submitted by the Seller.'
];

export function getShipmentPortForPlant(plantLocationOrCode = '1403') {
  const code = resolvePlantCode(plantLocationOrCode);
  if (code === '1403') {
    return 'Semarang Port, Indonesia';
  }
  return 'Tanjung Priok Port, Jakarta, Indonesia';
}

export function resolveShipmentItemsForMatrix(plantLocationOrCode = '1403', vendorOrigin = 'Foreign', exWorksFactory = '') {
  const code = resolvePlantCode(plantLocationOrCode);
  const profile = PLANT_MATRIX_PROFILES[code] || PLANT_MATRIX_PROFILES['1403'];
  const origin = normalizeOriginMode(vendorOrigin);
  const portName = getShipmentPortForPlant(code);
  const exwDesc = String(exWorksFactory || '').trim() || 'To be confirmed in Seller Quotation (Factory Location & Firm EXW Lead Time)';

  if (origin === 'Local') {
    return [
      {
        no: 1,
        title: 'Equipment Ex-works vendor Factory',
        description: exwDesc
      },
      {
        no: 2,
        title: 'Franco Site Basis (Local Vendor)',
        description: `Quotation must be provided on a Franco Site basis (Local Vendor) for delivery to ${profile.siteTitle} (${profile.address}). All equipment must be delivered strictly in accordance with prior agreed schedules to the designated site location, with domestic inland freight and transit risk borne by the Seller.`
      }
    ];
  }

  if (origin === 'Mixed') {
    return [
      {
        no: 1,
        title: 'Equipment Ex-works vendor Factory',
        description: exwDesc
      },
      {
        no: 2,
        title: 'Applicable Basis & Incoterms (Dual Terms)',
        description: `Offshore imported machinery: CIF / CIP / CFR ${portName} (final site: ${profile.siteTitle}, ${profile.address}), stating firm Ex-Works (EXW) lead time. Onshore/local scope: Quotation must be provided on a Franco Site basis (Local Vendor) delivered to ${profile.siteTitle}.`
      },
      {
        no: 3,
        title: 'Delivery Schedule',
        description: `All imported and local equipment must be delivered strictly in accordance with prior agreed schedules to the designated site location (${profile.siteTitle}).`
      },
      {
        no: 4,
        title: 'Cargo & Marine Insurance (Offshore Scope)',
        description: "Where insured by the Seller, the Seller must provide an original Marine / Cargo Insurance Policy/Certificate in duplicate endorsed for at least 110% of the invoice value covering Institute Cargo Clauses (A) / Air, with claims payable in Jakarta, Indonesia (to Bank Central Asia (BCA) on the applicant's behalf)."
      },
      {
        no: 5,
        title: 'Vessel Age Certificate (Offshore Scope)',
        description: 'Carrying vessel must not be older than 25 years. For ocean freight under CFR/FOB where the Buyer covers insurance, the Seller must furnish a certificate from the shipping line/agent confirming the carrying vessel is not over 25 years old.'
      },
      {
        no: 6,
        title: 'Customs Clearance (Offshore Scope)',
        description: 'IFM will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
      }
    ];
  }

  return [
    {
      no: 1,
      title: 'Equipment Ex-works vendor Factory',
      description: exwDesc
    },
    {
      no: 2,
      title: 'Applicable Basis & Incoterms',
      description: `CIF / CIP / CFR ${portName} (final site: ${profile.siteTitle}, ${profile.address}). Quotation must be provided on a CIF / CIP / CFR Port/Site basis stating firm Ex-Works (EXW) lead time.`
    },
    {
      no: 3,
      title: 'Delivery Schedule',
      description: `All equipment must be delivered strictly in accordance with prior agreed schedules to the designated site location (${profile.siteTitle}).`
    },
    {
      no: 4,
      title: 'Cargo & Marine Insurance',
      description: "Where insured by the Seller, the Seller must provide an original Marine / Cargo Insurance Policy/Certificate in duplicate endorsed for at least 110% of the invoice value covering Institute Cargo Clauses (A) / Air, with claims payable in Jakarta, Indonesia (to Bank Central Asia (BCA) on the applicant's behalf)."
    },
    {
      no: 5,
      title: 'Vessel Age Certificate',
      description: 'Carrying vessel must not be older than 25 years. For ocean freight under CFR/FOB where the Buyer covers insurance, the Seller must furnish a certificate from the shipping line/agent confirming the carrying vessel is not over 25 years old.'
    },
    {
      no: 6,
      title: 'Customs Clearance',
      description: 'IFM will handle Indonesian customs clearance upon receipt of final original shipping documents. Any additional demurrage, storage, or penalty costs incurred due to delays in receiving these documents after cargo arrival must be back-charged to the Seller.'
    }
  ];
}

export const SHIPMENT_DELIVERY_ITEMS_5 = resolveShipmentItemsForMatrix('1403', 'Foreign');

export const WARRANTY_STANDARD =
  'The Seller must warrant the entire system, machinery, and workmanship against defects for a minimum period of twelve (12) months of continuous operation following Final Acceptance (FAC). Technical support (including telephone/remote system diagnostics) must be available during standard business hours throughout the warranty period.';

export const REQUIRED_DOCUMENTATION_13 = [
  { id: 1, title: 'As-Built Drawings', desc: 'Complete mechanical and electrical/control panel as-built drawings.', required: true },
  { id: 2, title: 'Cabling Schedule', desc: 'Detailed power, control, and instrumentation cabling schedule.', required: true },
  { id: 3, title: 'Functional Design Specification (FDS)', desc: 'Complete Functional Design Specification.', required: true },
  { id: 4, title: 'Software Design Specification (SDS)', desc: 'Comprehensive PLC/HMI software design specifications.', required: true },
  { id: 5, title: 'PLC & HMI (OIT) Source Code & Master Password', desc: 'The Seller must provide the latest program/source code of PLC and HMI (OIT) without Password, and formally provide all PLC and HMI (OIT) Master Passwords to the Buyer PIC.', required: true },
  { id: 6, title: 'Operational Manual', desc: 'Comprehensive operational manual for the equipment.', required: true },
  { id: 7, title: 'Maintenance Manual', desc: 'Preventive and corrective maintenance manual for the equipment.', required: true },
  { id: 8, title: 'Recommended Spare Parts List', desc: 'Categorized list of recommended spare parts with OEM part numbers.', required: true },
  { id: 9, title: 'Recommended Maintenance Schedule', desc: 'Interval-based preventive maintenance schedule.', required: true },
  { id: 10, title: 'Calibration Certificates', desc: 'Valid calibration certificates for all measurement instruments.', required: true },
  { id: 11, title: 'Halal Compliance Documentation', desc: 'Valid Halal Certificate or formal Statement Letter confirming that all equipment components and lubricants are not made from and have not come into contact with non-halal materials.', required: true },
  { id: 12, title: 'Equipment Layout Drawings', desc: 'Complete equipment layout drawings (top view, elevation view, and interface sections) in editable AutoCAD (.dwg) and PDF formats.', required: true }
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
    clauseTitle: 'Site Description (Site Location)',
    category: 'Site & Location',
    summary: 'Authorized delivery site location for 1402 (Cikokol - Jl. Wisma Damatex), 1403 (Semarang - Jl. Tambak Aji IV No. 10), 1405 (Cikupa), and 1411 (Agro).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'V.invoice',
    itemNo: 'VI',
    clauseTitle: 'Document Submission Compliance — Invoice Recipient',
    category: 'Billing & Submission',
    summary: 'All invoices issued to plant-specific PT Indofood Fortuna Makmur site address Attn: Purchasing Department with designated plant Purchasing recipients.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'V.submission',
    itemNo: 'VI',
    clauseTitle: 'Document Submission Compliance — Softcopy & Hardcopy Rules',
    category: 'Billing & Submission',
    summary: DOCUMENT_SUBMISSION_COMPLIANCE,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VI',
    itemNo: 'VII',
    clauseTitle: 'Confidentiality',
    category: 'Governance',
    summary: CONFIDENTIALITY_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VII',
    itemNo: 'VIII',
    clauseTitle: 'Language Requirements',
    category: 'Governance',
    summary: LANGUAGE_REQUIREMENT_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'VIII',
    itemNo: 'IX',
    clauseTitle: 'Product Specifications',
    category: 'Technical',
    summary: 'Strict conformity to technical parameters, capacity, and quality specifications in the Technical Specification Attachment.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.A',
    itemNo: 'X.A',
    clauseTitle: 'Equipment Scope',
    category: 'Scope of Supply',
    summary: 'Complete design, engineering, manufacturing, factory testing, and supply of main machinery, control panels, and automation.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.B',
    itemNo: 'X.B',
    clauseTitle: 'Services Scope',
    category: 'Scope of Supply',
    summary: 'Supervised installation, testing & commissioning complete with Operator Training, Maintenance Training, and P&ID System Identification.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.C',
    itemNo: 'X.C',
    clauseTitle: 'Ancillaries & Logistics',
    category: 'Scope of Supply',
    summary: 'FAT/Shop Test & modular disassembly, pre-wired panels & J-boxes, seaworthy/roadworthy packing (Franco/CIF/CIP), civil/anchor drawings.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.D',
    itemNo: 'X.D',
    clauseTitle: 'General Technical & Hygienic Requirements',
    category: 'Technical & Hygiene',
    summary: 'EHEDG/3-A design, seal-welded frames, zero dead-leg piping, min SUS304, calibration certs, FDA/EU 1935/2004 + EN 10204 3.1 + SDS/MSDS, IP65 panels, IE3 motors, lockable safety isolators, drip/grease pans, interlocked guards.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'IX.E',
    itemNo: 'X.E',
    clauseTitle: 'Control System, Software & Access Rights',
    category: 'Automation',
    summary: 'Unlocked PLC & HMI (OIT) source code without password + formal handover of all Master Passwords prior to Final Acceptance.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'X',
    itemNo: 'XI',
    clauseTitle: 'Target Performance Test',
    category: 'Acceptance',
    summary: 'Execution of FAT & SAT against measurable KPIs (capacity, efficiency, reject rate, product quality) and run-test duration.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XI',
    itemNo: 'XII',
    clauseTitle: 'Final Acceptance',
    category: 'Acceptance',
    summary: 'On-site SAT continuous reliability, signed Operator & Maintenance training attendance sheets, formal FAC sign-off, and binding Snag List (Punch List).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XII',
    itemNo: 'XIII',
    clauseTitle: 'Consequences If Target is Not Reached',
    category: 'Commercial Risk',
    summary: '3-month rectification period (including raw materials consumed borne by Seller), or rejection with 100% full refund & dismantling/removal at Seller expense.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.eq',
    itemNo: 'XIV',
    clauseTitle: 'Equipment Payment Schedule',
    category: 'Payment Terms',
    summary: '30% DP T/T vs SWIFT/Telex APBG, 55% Progress T/T vs original invoice & shipping docs, 10% Commissioning T/T (<=60d B/L), 5% Retention T/T 3 mos (<=150d B/L).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.srv',
    itemNo: 'XIV',
    clauseTitle: 'Engineering Services Payment',
    category: 'Payment Terms',
    summary: '100% T/T after machine running w/ Acceptance Certificate or <=150 calendar days from B/L subject to formal Undertaking Letter.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIII.bg',
    itemNo: 'XIV',
    clauseTitle: 'Invoicing & Bank Guarantee Conditions',
    category: 'Payment Terms',
    summary: 'Draft invoice verification required before hardcopy dispatch; SWIFT/Telex Bank Guarantee is a strict condition precedent to DP release.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIV',
    itemNo: 'XV',
    clauseTitle: 'Shipment and Delivery',
    category: 'Logistics',
    summary: 'Automated per Plant (1402/1403/1405/1411) x Origin: Local (EXW Vendor Factory + Franco Site) or Foreign (EXW Vendor Factory + CIF/CIP/CFR Port w/ EXW lead time, Delivery Schedule, 110% ICC(A)/Air Cargo Insurance payable Jakarta to BCA, <=25yr Vessel Age Cert, Customs Clearance demurrage back-charge).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XV',
    itemNo: 'XVI',
    clauseTitle: 'Warranty',
    category: 'After-Sales',
    summary: WARRANTY_STANDARD,
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.quote',
    itemNo: 'XVII',
    clauseTitle: 'Quotation Breakdown',
    category: 'Tax & Regulatory',
    summary: 'Separate, itemized quotations for Equipment Supply and Engineering Services costs (USD/EUR offshore vs IDR w/ DPP, PPN & PPh local).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.duty',
    itemNo: 'XVII',
    clauseTitle: 'Import Duty Exemption & Free Demurrage',
    category: 'Tax & Regulatory',
    summary: 'Valid CoO/duty exemption (Form E, AK, IJEPA) and minimum 14 calendar days free demurrage at port of discharge; failures deducted from contract value.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Foreign']
  },
  {
    id: 'XVI.pph26',
    itemNo: 'XVII',
    clauseTitle: 'Foreign Vendor Withholding Tax (PPh 26 / DGT-1 Form)',
    category: 'Tax & Regulatory',
    summary: '20% PPh 26; original DGT-1 treaty relief (5% CH, 7.5% DE, 10% IN/LU/PG/VE/ZW, 15% PK, 0% other); PMK 35/PMK.03/2019 6-month Time Test requiring BUT + NPWP.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Foreign']
  },
  {
    id: 'XVI.visa',
    itemNo: 'XVII',
    clauseTitle: 'Engineer Mobilization & Visa Expenses',
    category: 'Tax & Regulatory',
    summary: 'Foreign: Working Visa (ID by IFM, home by Seller) + IFM hotel/meals/local transport vs Seller allowances/airfare/insurance. Local: ALL mobilization costs borne by Seller.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVI.local',
    itemNo: 'XVII',
    clauseTitle: 'Local Vendor Taxation & Invoicing',
    category: 'Tax & Regulatory',
    summary: 'Indonesian PPN & PPh per Seller KLU Code; PP No. 44 Tahun 2022 Pasal 23 Ayat (2) commercial DPP invoice first + Faktur Pajak on payment date; Kwitansi + Materai.',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local']
  },
  {
    id: 'XVI.contract',
    itemNo: 'XVII',
    clauseTitle: 'Payment Term & Contract Issuance',
    category: 'Tax & Regulatory',
    summary: 'Payment within max 30 calendar days of approved original hardcopy docs; formalized via official PO and/or Sales Contract (Appendix 6).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVII',
    itemNo: 'XVIII',
    clauseTitle: 'Required Documentation',
    category: 'Close-Out Docs',
    summary: 'Complete English softcopy & hardcopy deliverables prior to Final Acceptance (As-Built, Cabling, FDS, SDS, Unlocked PLC/HMI + Master Passwords, Manuals, Spare Parts, Maintenance Schedule, Calibration, Halal, Layout .dwg/.pdf).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XVIII',
    itemNo: 'XIX',
    clauseTitle: 'Acknowledged and Approved By',
    category: 'Execution',
    summary: 'Formal execution and sign-off by authorized representatives of The Seller and PT Indofood Fortuna Makmur (The Buyer).',
    plants: ['1402', '1403', '1405', '1411'],
    origins: ['Local', 'Foreign']
  },
  {
    id: 'XIX',
    itemNo: 'XX',
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
  const profile = PLANT_MATRIX_PROFILES[code] || PLANT_MATRIX_PROFILES['1403'];
  const portName = getShipmentPortForPlant(code);
  const origin = normalizeOriginMode(vendorOrigin);
  const makeProv = (matrixId, title, items, applicablePlants, applicableOrigins) => ({
    matrixId,
    title,
    items,
    description: items.join(' '),
    applicablePlants,
    applicableOrigins
  });

  if (origin === 'Local') {
    return [
      makeProv(
        'XVI.quote',
        'Quotation Breakdown (IDR / Local Scope)',
        [
          'The Seller must provide separate, itemized quotations in Indonesian Rupiah (IDR) for Equipment Supply and Engineering Services costs (clearly specifying base DPP, applicable PPN, and PPh withholding).'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Local']
      ),
      makeProv(
        'XVI.local',
        'Local Vendor Taxation & Invoicing (PPN, PPh, KLU & PP 44/2022)',
        [
          "Subject to Indonesian PPN (VAT) and PPh (Income Tax) in accordance with prevailing tax regulations and the Seller's registered Company KLU Code (supporting KLU documents must be submitted to IFM).",
          'Tax Invoice (Faktur Pajak) issuance must comply with PP No. 44 Tahun 2022 Pasal 23 Ayat (2) (Appendix 5): for Down Payment and Progress Payments, the Seller issues a commercial DPP invoice first, and issues the Faktur Pajak bearing the exact date payment is received.',
          "Original invoices must be accompanied by complete original supporting documents and a duly signed 'Kwitansi' affixed with a valid 'Materai'."
        ],
        ['1402', '1403', '1405', '1411'],
        ['Local']
      ),
      makeProv(
        'XVI.visa',
        'Local Engineer Mobilization Expenses',
        [
          `Local Company Engineers (${profile.siteTitle}): All mobilization costs—including daily allowances, air/land tickets, insurance, hotel accommodation, meals, and local transportation—must be borne exclusively by the Seller.`
        ],
        ['1402', '1403', '1405', '1411'],
        ['Local']
      ),
      makeProv(
        'XVI.contract',
        'Payment Term & Contract Issuance',
        [
          "Invoices will be paid in IDR within a maximum of thirty (30) calendar days after receipt of complete, approved original hardcopy documents (including valid Faktur Pajak, KLU proof, and signed 'Kwitansi' affixed with a valid 'Materai') by IFM.",
          'PT Indofood Fortuna Makmur will formalize the award by issuing an official Purchase Order (PO) and/or Sales Contract (as outlined in Appendix 6) to the selected Seller.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Local']
      )
    ];
  }

  if (origin === 'Mixed') {
    return [
      makeProv(
        'XVI.mixed',
        'Separation of Offshore Supply & Onshore Scope',
        [
          'Contracts and commercial quotations are strictly itemized between Offshore Equipment Supply (USD/EUR) and Onshore Local Works/Services (IDR).'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Mixed']
      ),
      makeProv(
        'XVI.quote',
        'Quotation Breakdown (Dual Currency Scope)',
        [
          'The Seller must provide separate, itemized quotations for Offshore Equipment Supply (USD/EUR), Onshore/Local Works (IDR), and Engineering Services costs.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Mixed']
      ),
      makeProv(
        'XVI.duty',
        'Import Duty Exemption & Free Demurrage (Offshore Scope)',
        [
          'The Seller must furnish the Buyer with valid Certificates of Origin / duty exemption documentation (e.g., Form E, AK, IJEPA) for equipment manufactured in countries holding an Economic Partnership / Free Trade Agreement with Indonesia.',
          `A minimum of fourteen (14) calendar days of free demurrage at the port of discharge (${portName}) must be provided by the Seller.`,
          'In the event the Seller fails to provide valid duty exemption documentation within the free demurrage period, any incurred import duties, demurrage, and detention costs must be borne by the Seller and deducted from the total contract value.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Foreign', 'Mixed']
      ),
      makeProv(
        'XVI.pph26',
        'Foreign Vendor Withholding Tax (PPh 26 / DGT Form — Offshore Services)',
        [
          'Engineering Services costs rendered by a Foreign Seller are subject to Indonesian Withholding Tax (PPh Article 26 at 20%).',
          'Tax treaty relief applies upon valid submission of an original, color-printed Certificate of Domicile (DGT Form / DGT-1) prior to payment (reduced rates: 5% Switzerland, 7.5% Germany, 10% India/Luxembourg/PNG/Venezuela/Zimbabwe, 15% Pakistan, or 0% for other treaty countries per applicable Indonesian tax regulations).',
          'Pursuant to PMK No. 35/PMK.03/2019 (Appendix 4), if service work exceeds the applicable Time Test (6 months accumulative within a 12-month period), the Seller must register a Permanent Establishment (BUT) and obtain an Indonesian Tax ID (NPWP), subjecting service fees to domestic withholding tax (PPh 23 / corporate tax). Failure to establish a BUT after exceeding the Time Test invalidates the DGT Form and triggers the full 20% PPh 26 withholding tax.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Foreign', 'Mixed']
      ),
      makeProv(
        'XVI.local',
        'Local Vendor Taxation & Invoicing (Onshore Scope)',
        [
          "Subject to Indonesian PPN (VAT) and PPh (Income Tax) in accordance with prevailing tax regulations and the Seller's registered Company KLU Code (supporting KLU documents must be submitted to IFM).",
          'Tax Invoice (Faktur Pajak) issuance must comply with PP No. 44 Tahun 2022 Pasal 23 Ayat (2) (Appendix 5): for Down Payment and Progress Payments, the Seller issues a commercial DPP invoice first, and issues the Faktur Pajak bearing the exact date payment is received.',
          "Original invoices must be accompanied by complete original supporting documents and a duly signed 'Kwitansi' affixed with a valid 'Materai'."
        ],
        ['1402', '1403', '1405', '1411'],
        ['Local', 'Mixed']
      ),
      makeProv(
        'XVI.visa',
        'Visa & Engineer Mobilization Expenses (Foreign & Local Teams)',
        [
          `Engineers must be dispatched to ${profile.siteTitle} under a valid Working Visa. Visa processing in Indonesia is managed and paid by IFM, whereas home-country visa processing is managed and paid by the Seller.`,
          'Foreign Company Engineers: The Seller must bear daily allowances, international and domestic airfares, and insurance expenses. IFM must bear hotel accommodation, standard meals, and local transportation within Indonesia solely when directly related to project execution with IFM (excluding alcoholic beverages, cigarettes, and personal expenses).',
          'Local Company Engineers: All mobilization costs—including daily allowances, air/land tickets, insurance, hotel accommodation, meals, and local transportation—must be borne exclusively by the Seller.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Mixed']
      ),
      makeProv(
        'XVI.contract',
        'Payment Term & Contract Issuance',
        [
          'Invoices will be paid within a maximum of thirty (30) calendar days after receipt of complete, approved original hardcopy documents (DGT Form for offshore services; Faktur Pajak & Kwitansi w/ Materai for onshore scope) by IFM.',
          'PT Indofood Fortuna Makmur will formalize the award by issuing an official Purchase Order (PO) and/or Sales Contract (as outlined in Appendix 6) to the selected Seller.'
        ],
        ['1402', '1403', '1405', '1411'],
        ['Mixed']
      )
    ];
  }

  // Foreign Vendor (1402, 1403, 1405, 1411)
  return [
    makeProv(
      'XVI.quote',
      'Quotation Breakdown (Offshore Supply & Engineering Services)',
      [
        'The Seller must provide separate, itemized quotations in foreign currency (USD / EUR or agreed offshore currency) for Equipment Supply and Engineering Services costs.'
      ],
      ['1402', '1403', '1405', '1411'],
      ['Foreign']
    ),
    makeProv(
      'XVI.duty',
      'Import Duty Exemption & Free Demurrage',
      [
        'The Seller must furnish the Buyer with valid Certificates of Origin / duty exemption documentation (e.g., Form E, AK, IJEPA) for equipment manufactured in countries holding an Economic Partnership / Free Trade Agreement with Indonesia.',
        `A minimum of fourteen (14) calendar days of free demurrage at the port of discharge (${portName}) must be provided by the Seller.`,
        'In the event the Seller fails to provide valid duty exemption documentation within the free demurrage period, any incurred import duties, demurrage, and detention costs must be borne by the Seller and deducted from the total contract value.'
      ],
      ['1402', '1403', '1405', '1411'],
      ['Foreign']
    ),
    makeProv(
      'XVI.pph26',
      'Foreign Vendor Withholding Tax (PPh 26 / DGT Form)',
      [
        'Engineering Services costs rendered by a Foreign Seller are subject to Indonesian Withholding Tax (PPh Article 26 at 20%).',
        'Tax treaty relief applies upon valid submission of an original, color-printed Certificate of Domicile (DGT Form / DGT-1) prior to payment (reduced rates: 5% Switzerland, 7.5% Germany, 10% India/Luxembourg/PNG/Venezuela/Zimbabwe, 15% Pakistan, or 0% for other treaty countries per applicable Indonesian tax regulations).',
        'Pursuant to PMK No. 35/PMK.03/2019 (Appendix 4), if service work exceeds the applicable Time Test (6 months accumulative within a 12-month period), the Seller must register a Permanent Establishment (BUT) and obtain an Indonesian Tax ID (NPWP), subjecting service fees to domestic withholding tax (PPh 23 / corporate tax). Failure to establish a BUT after exceeding the Time Test invalidates the DGT Form and triggers the full 20% PPh 26 withholding tax.'
      ],
      ['1402', '1403', '1405', '1411'],
      ['Foreign']
    ),
    makeProv(
      'XVI.visa',
      'Visa & Foreign Engineer Mobilization Expenses',
      [
        `Engineers must be dispatched to ${profile.siteTitle} under a valid Working Visa. Visa processing in Indonesia is managed and paid by IFM, whereas home-country visa processing is managed and paid by the Seller.`,
        'Foreign Company Engineers: The Seller must bear daily allowances, international and domestic airfares, and insurance expenses. IFM must bear hotel accommodation, standard meals, and local transportation within Indonesia solely when directly related to project execution with IFM (excluding alcoholic beverages, cigarettes, and personal expenses).'
      ],
      ['1402', '1403', '1405', '1411'],
      ['Foreign']
    ),
    makeProv(
      'XVI.contract',
      'Payment Term & Contract Issuance',
      [
        'Invoices will be paid within a maximum of thirty (30) calendar days after receipt of complete, approved original hardcopy documents (including valid original DGT Form for Engineering Services) by IFM.',
        'PT Indofood Fortuna Makmur will formalize the award by issuing an official Purchase Order (PO) and/or Sales Contract (as outlined in Appendix 6) to the selected Seller.'
      ],
      ['1402', '1403', '1405', '1411'],
      ['Foreign']
    )
  ];
}

export function getShipmentTermsForMatrix(plantLocationOrCode = '1403', vendorOrigin = 'Foreign') {
  const code = resolvePlantCode(plantLocationOrCode);
  const profile = PLANT_MATRIX_PROFILES[code] || PLANT_MATRIX_PROFILES['1403'];
  const origin = normalizeOriginMode(vendorOrigin);
  const portName = getShipmentPortForPlant(code);

  if (origin === 'Local') {
    return `Franco Site / Franco Pabrik ${profile.siteTitle} (${profile.address}). Delivered strictly to agreed schedules. Domestic inland freight and transit risk borne by Seller.`;
  }
  if (origin === 'Mixed') {
    return `Dual Terms: Offshore machinery CIF / CIP / CFR ${portName} stating firm EXW lead time (110% ICC(A)/Air Cargo Insurance payable Jakarta to Bank Central Asia; carrying vessel <= 25 years for CFR/FOB). Onshore/local scope delivered Franco Site ${profile.siteTitle}.`;
  }
  return `CIF / CIP / CFR ${portName} stating firm Ex-Works (EXW) lead time. Duplicate original Insurance Policy/Certificate >= 110% invoice value covering ICC (A)/Air payable in Jakarta to Bank Central Asia (BCA). Carrying vessel must not exceed 25 years (CFR/FOB). Customs clearance by IFM upon original shipping docs.`;
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

  // XIII-XV: Payment Schedule (30/55/10/5 & 150d Undertaking Letter), SWIFT BG, Origin-automated Shipment, 12M FAC Warranty
  const hasMatrixSchedule = Array.isArray(p.commercialTerms?.matrixEquipmentSchedule) && p.commercialTerms.matrixEquipmentSchedule.length === 4;
  const hasUndertaking = String(p.commercialTerms?.engineeringServicesPayment || '').toLowerCase().includes('undertaking letter');
  const hasBgCond = Array.isArray(p.commercialTerms?.invoicingAndBankGuarantee) && p.commercialTerms.invoicingAndBankGuarantee.length >= 2;
  const shipItems = Array.isArray(p.commercialTerms?.shipmentItems) ? p.commercialTerms.shipmentItems : [];
  const hasShipValid = vendorOrigin === 'Local'
    ? shipItems.length >= 2 && shipItems.some(i => /franco\s*site/i.test(`${i.title} ${i.description}`))
    : shipItems.length >= 6 && shipItems.some(i => /cif\s*\/\s*cip/i.test(`${i.title} ${i.description}`));
  addCheck('XIII-XV', 'Payment Schedule, SWIFT BG, Undertaking Letter, Shipment & 12M Warranty',
    hasMatrixSchedule && hasUndertaking && hasBgCond && hasShipValid,
    'Checks 30/55/10/5 T/T schedule, 150-day Engineering Services Undertaking Letter, SWIFT/Telex BG condition, and origin-automated Shipment & Delivery rules.'
  );

  // XVI: Plant x Origin Administrative, Tax & Regulatory Provisions
  const expectedProvIds = buildLegalAndTaxProvisions(plantCode, vendorOrigin).map(pr => pr.matrixId);
  const actualProvIdsList = (p.legalAndTaxProvisions || []).map(pr => pr.matrixId).filter(Boolean);
  const actualProvIds = new Set(actualProvIdsList);
  const missingProvIds = expectedProvIds.filter(id => !actualProvIds.has(id));
  const extraProvIds = actualProvIdsList.filter(id => !expectedProvIds.includes(id));
  addCheck('XVI', `Administrative & Tax Provisions (Plant ${plantCode} × ${vendorOrigin})`,
    missingProvIds.length === 0 && extraProvIds.length === 0,
    missingProvIds.length === 0 && extraProvIds.length === 0
      ? `All ${expectedProvIds.length} applicable Clause XVII provisions match Plant ${plantCode} × ${vendorOrigin}.`
      : `Out-of-sync Clause XVII rules (missing: ${missingProvIds.join(', ') || 'none'}; extra: ${extraProvIds.join(', ') || 'none'})`
  );

  // XVIII: Required Documentation (12 Deliverables, without Operator Work Instructions)
  const docs = p.requiredDocumentation || [];
  const hasMasterPwdDoc = docs.some(d => String(d.title || '').toLowerCase().includes('master password'));
  const hasRemovedWorkInstr = docs.some(d => /operator\s*work\s*instructions/i.test(String(d.title || '')));
  addCheck('XVII', 'Required Documentation (12 PDF Deliverables)',
    docs.length === REQUIRED_DOCUMENTATION_13.length && hasMasterPwdDoc && !hasRemovedWorkInstr,
    `${docs.length}/${REQUIRED_DOCUMENTATION_13.length} deliverables configured (must include unlocked PLC & HMI Source Code & Master Password + .dwg/.pdf layouts).`
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

export const PROJECT_CONTACT_ROLES = Object.freeze([
  'PIC Project',
  'Project & Engineering Team',
  'Purchasing Plant'
]);

export function normalizeContactToProjectRole(contact = {}, teamMembers = []) {
  const explicit = String(contact?.projectRole || '').trim();
  if (PROJECT_CONTACT_ROLES.includes(explicit)) {
    return explicit;
  }

  const emailLower = String(contact?.email || '').trim().toLowerCase();
  const nameLower = String(contact?.name || '').trim().toLowerCase();
  const matchedUser = Array.isArray(teamMembers)
    ? teamMembers.find(
        m => (emailLower && String(m.email || '').trim().toLowerCase() === emailLower) ||
             (nameLower && String(m.name || '').trim().toLowerCase() === nameLower)
      )
    : null;

  if (matchedUser) {
    const userRole = String(matchedUser.role || '').trim();
    if (PROJECT_CONTACT_ROLES.includes(userRole)) {
      return userRole;
    }
    if (/super\s*admin/i.test(userRole)) {
      return null;
    }
  }

  const rawRole = String(contact?.role || '').trim();
  if (!rawRole) return null;
  if (PROJECT_CONTACT_ROLES.includes(rawRole)) return rawRole;
  if (/super\s*admin|engineering\s*manager/i.test(rawRole)) return null;
  if (/purchasing|buyer/i.test(rawRole)) return 'Purchasing Plant';
  if (/project\s*&\s*engineering\s*team|project\s*engineer/i.test(rawRole)) return 'Project & Engineering Team';
  if (/pic\s*project|project\s*team\s*pic|engineering\s*pic|user\s*\/\s*engineering|site\s*pic/i.test(rawRole)) return 'PIC Project';
  return null;
}

export function resolveProjectKeyContacts(project = {}, teamMembers = [], plantOverride = null) {
  const plantLoc = plantOverride || project?.documentInfo?.plantLocation || project?.generalInfo?.plantLocation || '1403';
  const plantCode = resolvePlantCode(plantLoc);
  const profile = PLANT_MATRIX_PROFILES[plantCode] || PLANT_MATRIX_PROFILES['1403'];
  const fullSiteTitle = profile.siteTitle || `PT Indofood Fortuna Makmur – ${profile.plantName.replace(' Plant', '')}`;
  const activeAddress = project?.siteDescription?.address || profile.address;
  const companyAddress = `${fullSiteTitle}, ${activeAddress}`;

  const toContactRecord = (person, projectRole, idx = 0) => {
    const cleanRoleLabel = projectRole;
    const jabatanNote = person.jabatan ? ` · ${person.jabatan}` : '';
    return {
      id: person.id || `proj-contact-${plantCode}-${projectRole.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx + 1}`,
      name: person.name,
      projectRole,
      role: `${cleanRoleLabel}${jabatanNote}`,
      jabatan: person.jabatan || '',
      companyAddress: person.companyAddress || companyAddress,
      email: person.email || '',
      plantCode: person.plantCode || plantCode
    };
  };

  const roleOrder = {
    'PIC Project': 1,
    'Project & Engineering Team': 2,
    'Purchasing Plant': 3
  };

  const sortContacts = (list) =>
    list.sort((a, b) => (roleOrder[a.projectRole] || 99) - (roleOrder[b.projectRole] || 99));

  // 1. If user has explicitly customized/assigned team contacts for this project
  if (Array.isArray(project?.projectTeamContacts) && project.projectTeamContacts.length > 0) {
    const seen = new Set();
    const explicitList = [];
    for (let i = 0; i < project.projectTeamContacts.length; i++) {
      const c = project.projectTeamContacts[i];
      if (!c || !c.name) continue;
      const pRole = normalizeContactToProjectRole(c, teamMembers);
      if (!pRole) continue;
      const dedupKey = String(c.email || c.name).trim().toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const matchedUser = teamMembers.find(
        m => (c.email && String(m.email || '').toLowerCase() === String(c.email).toLowerCase()) ||
             String(m.name || '').toLowerCase() === String(c.name).toLowerCase()
      );
      explicitList.push(
        toContactRecord(
          {
            ...matchedUser,
            ...c,
            companyAddress
          },
          pRole,
          i
        )
      );
    }
    return sortContacts(explicitList);
  }

  // 2. Auto-derive the team matching the active project (Creator + Active Plant + Custom Contacts)
  const users = Array.isArray(teamMembers) ? teamMembers : [];
  const originatorName = String(
    project?.documentInfo?.revisionHistory?.[0]?.originatedBy ||
    project?.originatedBy ||
    ''
  ).trim().toLowerCase();
  const seen = new Set();
  const selected = [];

  const pushUnique = (person, projectRole) => {
    if (!person || !person.name || !PROJECT_CONTACT_ROLES.includes(projectRole)) return;
    const key = String(person.email || person.name).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    selected.push(toContactRecord(person, projectRole, selected.length));
  };

  // A. PIC Project matching active Plant & Creator
  if (originatorName) {
    const origUser = users.find(
      u => u.role === 'PIC Project' && String(u.name || '').trim().toLowerCase() === originatorName
    );
    if (origUser) pushUnique(origUser, 'PIC Project');
  }
  const plantPicUsers = users.filter(
    u => u.role === 'PIC Project' && resolvePlantCode(u.plantCode || '') === plantCode && u.plantCode !== 'All Plants'
  );
  if (plantPicUsers.length > 0) {
    plantPicUsers.forEach(u => pushUnique(u, 'PIC Project'));
  } else {
    // Plant 1405 / 1411 fallback: include plant-profile project PIC if non-Super-Admin, else primary corporate PIC Project
    const profilePicNonAdmin = (profile.projectTeamPics || []).filter(p => {
      const m = users.find(u => u.email.toLowerCase() === p.email.toLowerCase());
      return !m || m.role === 'PIC Project';
    });
    if (profilePicNonAdmin.length > 0) {
      profilePicNonAdmin.forEach(p => {
        const m = users.find(u => u.email.toLowerCase() === p.email.toLowerCase());
        pushUnique(m || p, 'PIC Project');
      });
    } else if (!selected.some(c => c.projectRole === 'PIC Project')) {
      const primaryPic = users.find(u => u.role === 'PIC Project') || USER_ENGINEERING_PICS[0];
      if (primaryPic) pushUnique(primaryPic, 'PIC Project');
    }
  }

  // B. Project & Engineering Team matching active Project Creator & Plant
  if (originatorName) {
    const origEng = users.find(
      u => u.role === 'Project & Engineering Team' && String(u.name || '').trim().toLowerCase() === originatorName
    );
    if (origEng) pushUnique(origEng, 'Project & Engineering Team');
  }
  const plantEngTeam = users.filter(
    u => u.role === 'Project & Engineering Team' && u.plantCode !== 'All Plants' && resolvePlantCode(u.plantCode || '') === plantCode
  );
  if (plantEngTeam.length > 0) {
    plantEngTeam.forEach(u => pushUnique(u, 'Project & Engineering Team'));
  } else if (!selected.some(c => c.projectRole === 'Project & Engineering Team')) {
    const fallbackEng = users.find(u => u.role === 'Project & Engineering Team');
    if (fallbackEng) pushUnique(fallbackEng, 'Project & Engineering Team');
  }

  // C. Purchasing Plant matching active Plant & purchasingAttn
  const attnList = Array.isArray(project?.siteDescription?.purchasingAttn) && project.siteDescription.purchasingAttn.length > 0
    ? project.siteDescription.purchasingAttn
    : (profile.purchasingAttn || []);
  const plantPurchasingUsers = users.filter(
    u => u.role === 'Purchasing Plant' && u.plantCode !== 'All Plants' && resolvePlantCode(u.plantCode || '') === plantCode
  );

  if (plantPurchasingUsers.length > 0) {
    plantPurchasingUsers.forEach(u => pushUnique(u, 'Purchasing Plant'));
    // Also ensure explicit plant-level purchasingAttn contacts (if not All-Plants duplicate when plant users exist) are represented
    attnList.forEach(a => {
      const u = users.find(m => m.email.toLowerCase() === String(a.email || '').toLowerCase());
      if (u && u.plantCode !== 'All Plants') {
        pushUnique(u, 'Purchasing Plant');
      }
    });
  } else {
    attnList.forEach(a => {
      const u = users.find(m => m.email.toLowerCase() === String(a.email || '').toLowerCase());
      pushUnique(u || a, 'Purchasing Plant');
    });
  }

  // D. Preserve any custom (non-matrix-) contacts added to project.keyContacts whose role fits the 3 allowed roles
  if (Array.isArray(project?.keyContacts)) {
    project.keyContacts
      .filter(c => c && !String(c.id || '').startsWith('matrix-'))
      .forEach(c => {
        const pRole = normalizeContactToProjectRole(c, users);
        if (pRole) pushUnique(c, pRole);
      });
  }

  return sortContacts(selected);
}

export function formatSiteAddressLines(profile = {}, rawAddress = '') {
  const addr = String(rawAddress || profile.address || '').trim();
  const detail = profile.addressDetail;
  if (detail && addr === String(profile.address || '').trim() && detail.street && detail.kecamatan) {
    const line1 = [detail.street, detail.kelurahan].filter(Boolean).join(', ') + ',';
    const cityProvZip = [detail.kecamatan, detail.city, [detail.province, detail.postalCode].filter(Boolean).join(' '), detail.country]
      .filter(Boolean)
      .join(', ');
    return [line1, cityProvZip];
  }
  const kecMatch = addr.match(/^(.*?),\s*(Kec\..*)$/i);
  if (kecMatch) {
    return [`${kecMatch[1].trim()},`, kecMatch[2].trim()];
  }
  return addr ? [addr] : [];
}

