import { defaultTRSAProject } from '../data/defaultTRSA.js';
import { 
  ROLES, 
  getCurrentRole, 
  setCurrentRole, 
  canEditCustomClearance, 
  canDeleteProject, 
  canChangeProjectStatus,
  sanitizeProject,
  sanitizeInput 
} from './security.js';
import { 
  createAuditEntry, 
  appendAuditLog, 
  getAuditLogs, 
  detectProjectChanges,
  detectDetailedProjectChanges,
  formatAuditTimestamp,
  getRelativeTime,
  exportAuditLogsToJSON,
  exportAuditLogsToCSV
} from './auditService.js';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  isConfigured, 
  testConnection, 
  getSyncStatus, 
  syncProjectToPostgres, 
  fetchProjectsFromPostgres 
} from './supabaseClient.js';

// ==========================================================================
// Official Document Control Number (No. TRSA) Utilities & Generators
// Conforming to PT Indofood Fortuna Makmur Engineering Specifications
// Format: 006/RAP/TRSA – 1403/MFG-IFM/VIII/2024
// Breakdown:
//   - 006  : Auto sequential 3-digit document number
//   - RAP  : Uppercase initials of creator/author name
//   - TRSA : Fixed document classification
//   - 1403 : Project location / Plant code (e.g. 1402: Semarang, 1403: Cikupa)
//   - MFG  : Department (MFG: Manufacturing, ENG: Engineering, etc.)
//   - IFM  : Fixed corporate entity (PT Indofood Fortuna Makmur)
//   - VIII : Month when document was first created (Roman numerals I-XII)
//   - 2024 : 4-digit creation year
// ==========================================================================

export function toRomanMonth(month) {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const m = parseInt(month, 10);
  if (isNaN(m) || m < 1 || m > 12) return 'I';
  return romans[m - 1];
}

export function fromRomanMonth(roman) {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const idx = romans.indexOf(String(roman || '').trim().toUpperCase());
  return idx >= 0 ? idx + 1 : 1;
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ENG';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ENG';
  return words.map(w => w[0].toUpperCase()).join('').slice(0, 5);
}

export function getNextSequenceNumber(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return '001';
  let maxSeq = 0;
  for (const p of projects) {
    const docNum = p?.documentInfo?.docNumber || '';
    const match = docNum.match(/^(\d{1,4})\//);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const next = maxSeq > 0 ? maxSeq + 1 : 1;
  return String(next).padStart(3, '0');
}

export function getPlantCode(plantLocation = '') {
  const loc = String(plantLocation || '').toLowerCase();
  if (loc.includes('1402') || loc.includes('cikokol')) return '1402';
  if (loc.includes('1403') || loc.includes('semarang')) return '1403';
  if (loc.includes('1405') || loc.includes('cikupa')) return '1405';
  if (loc.includes('1411') || loc.includes('agro')) return '1411';
  return '1403'; // default Semarang Plant
}

// Master Plant Directory & Invoicing Database
export const PLANT_DATABASE = {
  '1402': {
    code: '1402',
    plantName: 'Cikokol Plant',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur',
    address: 'Jalan Daan Mogot KM 19, Kebon Besar, Batuceper, Kota Tangerang, Banten 15122, Indonesia',
    deliveryPort: 'Tanjung Priok Port, Jakarta (CIF/CIP)',
    purchasingAttn: [
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id" },
      { name: "Moh Yusuf Alfian", email: "my.alfian@icbp.indofood.co.id" }
    ],
    customClearanceNote: 'Indofood will handle custom clearance in the Indonesian port after receiving final original shipping documents. If the goods arrive before documents, any demurrage/storage cost will be charged to The Seller.'
  },
  '1403': {
    code: '1403',
    plantName: 'Semarang Plant',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur',
    address: 'Jalan Tambak Aji IV Nomor 10, Tambakaji, Kecamatan Ngaliyan, Kota Semarang, Jawa Tengah 50185, Indonesia',
    deliveryPort: 'Semarang Port (CIF/CIP)',
    purchasingAttn: [
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id" },
      { name: "Yanuar Ari Wibowo", email: "yanuar.wibowo@icbp.indofood.co.id" }
    ],
    customClearanceNote: 'Indofood will handle custom clearance in the Indonesian port after receiving final original shipping documents. If the goods arrive before documents, any demurrage/storage cost will be charged to The Seller.'
  },
  '1405': {
    code: '1405',
    plantName: 'Cikupa Plant',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur',
    address: 'Jalan Bhumimas II No. 5 Kawasan Industri dan Pergudangan Cikupamas RT 01 RW 03 Kampung Telaga, Cikupa - Banten 15710, Indonesia',
    deliveryPort: 'Tanjung Priok Port, Jakarta (CIF/CIP)',
    purchasingAttn: [
      { name: "Moh Yusuf Alfian", email: "my.alfian@icbp.indofood.co.id" },
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id" }
    ],
    customClearanceNote: 'Indofood will handle custom clearance in the Indonesian port after receiving final original shipping documents. If the goods arrive before documents, any demurrage/storage cost will be charged to The Seller.'
  },
  '1411': {
    code: '1411',
    plantName: 'Agro Plant',
    companyName: 'PT. Indofood Fortuna Makmur',
    invoiceRecipient: 'PT Indofood Fortuna Makmur',
    address: 'Kawasan Industri Agro Indofood, Jawa Barat / Jawa Tengah, Indonesia',
    deliveryPort: 'Tanjung Priok / Tanjung Emas Port (CIF/CIP)',
    purchasingAttn: [
      { name: "Moh Yusuf Alfian", email: "my.alfian@icbp.indofood.co.id" },
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id" }
    ],
    customClearanceNote: 'Indofood will handle custom clearance in the Indonesian port after receiving final original shipping documents. If the goods arrive before documents, any demurrage/storage cost will be charged to The Seller.'
  }
};

export function getPlantDatabase(plantLocationOrCode = '') {
  const raw = String(plantLocationOrCode || '').toLowerCase();
  if (raw.includes('1402') || raw.includes('cikokol')) return PLANT_DATABASE['1402'];
  if (raw.includes('1403') || raw.includes('semarang')) return PLANT_DATABASE['1403'];
  if (raw.includes('1405') || raw.includes('cikupa')) return PLANT_DATABASE['1405'];
  if (raw.includes('1411') || raw.includes('agro')) return PLANT_DATABASE['1411'];
  return PLANT_DATABASE['1403'];
}

// Master Vendor Procurement Origin Matrix & Standards
export const VENDOR_ORIGIN_CONFIG = {
  Foreign: {
    origin: 'Foreign',
    label: 'Foreign (International OEM)',
    badgeClass: 'bg-sky-50 text-[#0284C7] border border-sky-200',
    description: 'International manufacturer. Import via Sea/Air freight (CIF/CIP), L/C payment, PPh 26 tax treaty, and Indonesian working visas apply.',
    currency: 'USD / EUR',
    defaultShipment: 'CIF / CIP Semarang Port, Indonesia. Endorsed Marine Insurance ICC A/AIR for at least 110% invoice value payable to Bank Central Asia (BCA) in Jakarta. Carrying vessel must not be older than 25 years.',
    defaultProvisions: [
      {
        title: "Cost Quotation Separation",
        description: "The Seller shall provide separate quotations for Equipment and Engineering Services costs."
      },
      {
        title: "Duty Exemption Documentation",
        description: "For equipment from countries with Economic Partnership Agreements (EPA), Seller must furnish Form DGT/exemption prior to demurrage expiry, or incurrence is deducted from contract value."
      },
      {
        title: "Withholding Tax (PPh 26 / Double Tax Treaty)",
        description: "Indonesian withholding tax (PPh 26) of 20% applies to services. If valid DGT Form is provided, treaty rates apply (e.g., 5% Switzerland, 7.5% Germany, 10% India/Luxembourg, 0% for applicable treaties)."
      },
      {
        title: "Permanent Establishment (PMK 35/2019)",
        description: "Exceeding 6 months cumulative service stay in 1 year requires Indonesian NPWP & Permanent Establishment (BUT), subject to PPh 23 (approx 4%). Otherwise 20% PPh 26 applies."
      },
      {
        title: "Visas & Engineer Expenses",
        description: "Dispatched engineers must possess valid Indonesian working visas. Indonesian visa costs borne by IFM; home country visa by Seller. Daily allowance, flights, insurance borne by Seller; local Indonesian lodging & transport borne by IFM."
      },
      {
        title: "Value Added Tax (PPN & PPh Local)",
        description: "Subject to Indonesian tax laws (PP No. 44 Tahun 2022 Pasal 23 ayat 2). Invoices must include original Kwitansi affixed with official Materai (stamp duty)."
      }
    ]
  },
  Local: {
    origin: 'Local',
    label: 'Local (Domestic Indonesian Vendor)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    description: 'Domestic Indonesian manufacturer or fabricator. Domestic Franco delivery in IDR, PPN 11% e-Faktur, PPh 23 withholding tax, without customs demurrage.',
    currency: 'IDR (Rupiah)',
    defaultShipment: 'Franco Pabrik / Buyer\'s Warehouse PT Indofood Fortuna Makmur (Semarang / Cikupa / Cikokol / Agro Plant). All domestic inland freight, transportation insurance, and transit risks are fully borne by Seller until goods are safely delivered to Buyer\'s plant site.',
    defaultProvisions: [
      {
        title: "Value Added Tax (PPN 11%)",
        description: "Delivery of Taxable Goods and Services within Indonesian customs territory is subject to 11% PPN in accordance with Indonesian Tax Harmonization Law (UU HPP). Seller must issue valid and creditable electronic tax invoices (e-Faktur)."
      },
      {
        title: "Withholding Tax (PPh Pasal 23)",
        description: "Installation, fabrication, testing, and commissioning services are subject to 2% PPh 23 withholding tax for valid NPWP holders. Official withholding tax slips (Bukti Potong) will be issued by PT Indofood Fortuna Makmur."
      },
      {
        title: "Contract Currency & Payment Terms (IDR)",
        description: "All transactions and disbursements are executed in Indonesian Rupiah (IDR) via national bank transfer. Invoices must include original official receipt (Kwitansi) affixed with valid stamp duty (Materai Rp 10,000) and copy of Purchase Order (PO/SPK)."
      },
      {
        title: "Local Labor Compliance & HSE (K3) Standards",
        description: "All technicians and personnel dispatched to the site must comply with PT Indofood Fortuna Makmur HSE/K3 guidelines, hold active BPJS Ketenagakerjaan coverage, and wear certified Personal Protective Equipment (PPE) within plant premises."
      },
      {
        title: "Warranty & On-Site After-Sales Support",
        description: "Mechanical and electrical warranty period of minimum 12 months from Final Acceptance Protocol (BAST). Local vendor must provide guaranteed on-site technical response within 1x24 hours for emergency line stoppages."
      }
    ]
  },
  Mixed: {
    origin: 'Mixed',
    label: 'Mixed (Dual Sourcing: Foreign & Local)',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    description: 'Hybrid sourcing model: Core specialized machinery imported from abroad (CIF/CIP, L/C, PPh 26), while peripheral fabrication, ducting, piping, and local installation executed locally (Franco, IDR, PPN).',
    currency: 'USD/EUR (Import Equipment) & IDR (Local Scope)',
    defaultShipment: 'Dual Terms: Main imported machinery shipped CIF / CIP Tanjung Emas Port Semarang (ICC A/AIR 110% Marine Cargo Insurance). Peripheral local materials, platforms, exhaust ducting, and integration panels delivered Franco Pabrik Indofood Plant.',
    defaultProvisions: [
      {
        title: "Separation of Offshore Supply & Onshore Scope",
        description: "Contracts and commercial quotations are strictly divided between Offshore Equipment Supply (in foreign currency / USD/EUR) and Onshore Local Works/Services (in IDR)."
      },
      {
        title: "Import Taxation & Custom Clearance Protocol",
        description: "Applicable import regulations, PPh 26 withholding / DGT Form tax treaty, and port customs clearance apply to offshore equipment. Import documentation (B/L, Packing List, Certificate of Origin) must be submitted on time to prevent demurrage."
      },
      {
        title: "Domestic Scope Taxation (PPN 11% & PPh 23)",
        description: "Domestic fabrication, on-site installation labor, and local support materials are subject to 11% PPN with e-Faktur and 2% PPh 23 withholding tax."
      },
      {
        title: "Expatriate & Local Engineer Coordination",
        description: "Installation and commissioning led by overseas principal commissioning engineers (holding official Working Visa/KITAS), assisted by BPJS-insured local technical personnel."
      },
      {
        title: "Combined Performance Acceptance & Warranty",
        description: "Continuous 7-hour trial verifies end-to-end integration between imported core machinery and local auxiliary systems. Comprehensive 12-month warranty binds both supply portions."
      }
    ]
  }
};

export function getVendorOriginConfig(origin = 'Foreign') {
  return VENDOR_ORIGIN_CONFIG[origin] || VENDOR_ORIGIN_CONFIG.Foreign;
}

export const FOREIGN_COUNTRY_OPTIONS = [
  'Japan',
  'Germany',
  'Italy',
  'Netherlands',
  'China',
  'United States',
  'United Kingdom',
  'Switzerland',
  'Taiwan',
  'Australia',
  'France',
  'Sweden',
  'Spain',
  'South Korea',
  'Denmark',
  'Other Foreign Country'
];

export const COUNTRY_ORIGIN_OPTIONS = [
  'Local (Indonesia)',
  'Foreign (Dropdown CoO)',
  'Mixed (Indonesia & Foreign CoO)',
  ...FOREIGN_COUNTRY_OPTIONS,
  'Indonesia',
  'Other'
];

export function parseCountryOfOrigin(coo = 'Japan') {
  if (!coo || typeof coo !== 'string') {
    return { category: 'Foreign', foreignCountry: 'Japan', fullDisplay: 'Foreign (Japan)' };
  }
  const trimmed = coo.trim();
  if (trimmed === 'Indonesia' || trimmed === 'Local' || trimmed.startsWith('Local')) {
    return { category: 'Local', foreignCountry: 'Indonesia', fullDisplay: 'Local (Indonesia)' };
  }
  if (trimmed.startsWith('Mixed') || trimmed.includes('&')) {
    const match = trimmed.match(/&\s*([A-Za-z\s]+)\)?/);
    const foreignCountry = match ? match[1].trim() : 'Japan';
    return { category: 'Mixed', foreignCountry, fullDisplay: `Mixed (Indonesia & ${foreignCountry})` };
  }
  // Foreign
  const match = trimmed.match(/Foreign\s*\(([A-Za-z\s]+)\)/i);
  const foreignCountry = match ? match[1].trim() : trimmed;
  return { category: 'Foreign', foreignCountry, fullDisplay: `Foreign (${foreignCountry})` };
}

export function formatCountryOfOrigin(category = 'Foreign', foreignCountry = 'Japan') {
  if (category === 'Local') {
    return 'Local (Indonesia)';
  }
  if (category === 'Mixed') {
    return `Mixed (Indonesia & ${foreignCountry || 'Japan'})`;
  }
  return `Foreign (${foreignCountry || 'Japan'})`;
}

export const EQUIPMENT_TYPE_OPTIONS = [
  'Process Line',
  'Frying System',
  'Seasoning System',
  'Flight Belt Elevator (FBE)',
  'Distribution System',
  'Packaging System',
  'Auto Case Packer',
  'Finished Good Conveyor',
  'Carton Sealer',
  'Palletizer',
  'Oil Free Compressor',
  'Nitrogen Generator',
  'Generator Set',
  'Sheeted Pellet Fryer & Seasoning System',
  'Extruder & Forming Line',
  'Continuous Roasting System',
  'De-Oiling & Cooling System',
  'Bulk Storage & Silo System',
  'CIP (Clean-in-Place) System',
  'Other Equipment'
];

export const VENDOR_DATABASE = [
  {
    id: 'v-01',
    name: 'Heat and Control / Kiremko B.V.',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Frying & Seasoning System',
    description: 'Consortium: Pellet Fryer, Drum Coating & Distribution Systems'
  },
  {
    id: 'v-02',
    name: 'Heat and Control, Inc.',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Frying System',
    description: 'Unitized Pan Fryers, Heat Exchangers, Filter Units & Multi-Zone Roasters'
  },
  {
    id: 'v-03',
    name: 'Kiremko B.V.',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Specialized Industrial Snack Pellet, Potato & Extrusion Frying Lines'
  },
  {
    id: 'v-04',
    name: 'Florigo Industry B.V. (tna)',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Frying System',
    description: 'Continuous Snack Pellet & Chip Frying with Active Oil Filtration'
  },
  {
    id: 'v-05',
    name: 'Ishida Co., Ltd.',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Multi-Head Weighers, Atlas Bagmakers & Snack Inspection Systems'
  },
  {
    id: 'v-06',
    name: 'Baker Perkins Ltd.',
    country: 'United Kingdom',
    origin: 'Foreign',
    equipmentType: 'Extruder & Forming Line',
    description: 'Twin Screw Food Extrusion, Cooking & Sheeted Pellet Forming Lines'
  },
  {
    id: 'v-07',
    name: 'Reading Bakery Systems (RBS)',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Continuous Sheeting, Gauging Rolls, Cutting & Continuous Oven Systems'
  },
  {
    id: 'v-08',
    name: 'Clextral SAS',
    country: 'France',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Twin Screw Extrusion Lines for 2D/3D Expanded Snack Pellets'
  },
  {
    id: 'v-09',
    name: 'PPM Technologies LLC',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Seasoning System',
    description: 'Loss-in-Weight Seasoning Systems, Coating Drums & Electromagnetic Feeders'
  },
  {
    id: 'v-10',
    name: 'TNA Solutions Pty Ltd',
    country: 'Australia',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'High-Speed Robag Packaging, On-Machine Seasoning & Distribution'
  },
  {
    id: 'v-11',
    name: 'Yamato Scale Co., Ltd.',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Multihead Weighers, Checkweighing & High-Speed Packaging Automation'
  },
  {
    id: 'v-12',
    name: 'Bühler Group',
    country: 'Switzerland',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Thermal Processing, Extrusion Processing & Raw Pellet Preparation'
  },
  {
    id: 'v-13',
    name: 'Fuji Packaging Machinery',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Alpha VII Horizontal Flow Wrappers, Feeders & Automated Case Packers'
  },
  {
    id: 'v-14',
    name: 'PT Fabrikasi Rekatama Mandiri',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'Distribution System',
    description: 'Domestic Food-Grade Stainless Conveyors, Mezzanines & Support Fabrication'
  },
  {
    id: 'v-15',
    name: 'PT Cipta Aneka Selera Tehnik',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'CIP (Clean-in-Place) System',
    description: 'Domestic Stainless Piping, Sanitary Tanks & Automated CIP Skids'
  },
  {
    id: 'v-16',
    name: 'PT Mitra Sarana Presisi',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'Flight Belt Elevator (FBE)',
    description: 'Domestic Flight Belt Elevators, Exhaust Ducting & Heavy Work Platforms'
  }
];

export function getVendorDetails(vendorName) {
  if (!vendorName) return null;
  return VENDOR_DATABASE.find(v => v.name.toLowerCase() === vendorName.trim().toLowerCase()) || null;
}

export function ensureGeneralInfo(project) {
  if (!project) return null;
  if (!project.generalInfo) {
    project.generalInfo = {
      plantLocation: project.documentInfo?.plantLocation || 'Semarang Plant',
      countryOriginCategory: 'Foreign',
      countryOriginForeign: 'Japan',
      countryOfOrigin: 'Japan',
      equipmentType: 'Frying System',
      machineType: 'Frying System',
      vendorName: 'Heat and Control / Kiremko B.V.',
      modelNumber: 'SPF-600 Continuous',
      designCapacity: '600 kg/hour (Pellet Output)',
      equipmentModels: [
        {
          id: 'eq-1',
          modelNumber: 'SPF-600 Continuous',
          designCapacity: '600 kg/hour (Pellet Output)'
        }
      ],
      targetCommissioning: project.projectOverview?.keyDates?.lineStartUp || 'End of April 2025'
    };
  } else {
    if (!project.generalInfo.equipmentType) {
      project.generalInfo.equipmentType = project.generalInfo.machineType || 'Frying System';
    }
    const parsedCoo = parseCountryOfOrigin(project.generalInfo.countryOfOrigin || 'Japan');
    if (!project.generalInfo.countryOriginCategory) {
      project.generalInfo.countryOriginCategory = parsedCoo.category;
    }
    if (!project.generalInfo.countryOriginForeign) {
      project.generalInfo.countryOriginForeign = parsedCoo.foreignCountry;
    }
    if (!Array.isArray(project.generalInfo.equipmentModels) || project.generalInfo.equipmentModels.length === 0) {
      project.generalInfo.equipmentModels = [
        {
          id: 'eq-1',
          modelNumber: project.generalInfo.modelNumber || 'SPF-600 Continuous',
          designCapacity: project.generalInfo.designCapacity || '600 kg/hour (Pellet Output)'
        }
      ];
    }
    // Synchronize legacy modelNumber & designCapacity if needed
    if (!project.generalInfo.modelNumber && project.generalInfo.equipmentModels.length > 0) {
      project.generalInfo.modelNumber = project.generalInfo.equipmentModels.map(m => m.modelNumber).filter(Boolean).join(', ');
    }
    if (!project.generalInfo.designCapacity && project.generalInfo.equipmentModels.length > 0) {
      project.generalInfo.designCapacity = project.generalInfo.equipmentModels.map(m => m.designCapacity).filter(Boolean).join(', ');
    }
  }
  return project.generalInfo;
}

export function generateTRSANumber(options = {}) {
  const {
    seq = '001',
    creatorName = 'Refin A Putra',
    plantCode = '1402',
    dept = 'MFG',
    date = new Date()
  } = options;

  const paddedSeq = String(seq).padStart(3, '0');
  const initials = getInitials(creatorName);
  
  let d = date;
  if (typeof date === 'string') {
    d = new Date(date);
    if (isNaN(d.getTime())) d = new Date();
  }
  const month = d.getMonth() + 1;
  const romanMonth = toRomanMonth(month);
  const year = d.getFullYear();

  // Standard official format with en-dash \u2013 and spaces
  return `${paddedSeq}/${initials}/TRSA \u2013 ${plantCode}/${dept}-IFM/${romanMonth}/${year}`;
}

export function parseTRSANumber(docNum = '') {
  if (!docNum || typeof docNum !== 'string') return null;
  const regex = /^(\d+)\/([A-Z0-9]+)\/TRSA\s*[\u2013\-]\s*([A-Z0-9]+)\/([A-Z0-9]+)-IFM\/([IVXLCDM]+)\/(\d{4})/i;
  const match = docNum.trim().match(regex);
  if (!match) return null;
  return {
    seq: match[1].padStart(3, '0'),
    initials: match[2].toUpperCase(),
    trsa: 'TRSA',
    plantCode: match[3],
    dept: match[4].toUpperCase(),
    ifm: 'IFM',
    romanMonth: match[5].toUpperCase(),
    year: match[6]
  };
}

// Application State Management
export class TRSAStore {
  constructor() {
    this.STORAGE_KEY = 'TRSA_ENTERPRISE_PROJECTS_V1';
    this.USER_STORAGE_KEY = 'TRSA_LOGGED_IN_USER_V1';
    this.teamMembers = [
      { name: "Moh Yusuf Alfian", email: "my.alfian@icbp.indofood.co.id", role: "Project & Engineering Manager", initials: "MYA", dept: "MFG" },
      { name: "Refin A Putra", email: "refin.putra@icbp.indofood.co.id", role: "Project Engineer", initials: "RAP", dept: "MFG" },
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id", role: "Purchasing Supervisor", initials: "NH", dept: "PUR" },
      { name: "Murdani", email: "m.murdani@icbp.indofood.co.id", role: "Project & Engineering", initials: "M", dept: "MFG" },
      { name: "Ayodya Maulana Gunoro", email: "ayodya.gunoro@icbp.indofood.co.id", role: "Project & Engineering", initials: "AMG", dept: "MFG" },
      { name: "Dany Taufiq Alim Ansori", email: "dany.ansori@icbp.indofood.co.id", role: "Project & Engineering", initials: "DTAA", dept: "MFG" }
    ];
    this.currentUser = this.loadUser();
    this.showUserMenu = false;
    this.showSupabaseModal = false;
    this.showAuditModal = false;
    this.auditSearchQuery = '';
    this.auditProjectFilter = 'all';
    this.lastProjectSnapshots = {};

    this.projects = this.loadProjects();
    this.activeProjectId = this.projects[0]?.id || 'trsa-006-ifm-2024';
    this.currentView = 'dashboard'; // 'dashboard' | 'projects' | 'builder' | 'studio'
    this.builderStep = 1; // 1 to 6
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.plantFilter = 'all';
    this.watermark = 'OFFICIAL';
    this.notification = null;

    // Initialize baseline snapshots and seed initial audit log if empty
    if (this.projects && this.projects.length > 0) {
      this.projects.forEach(p => this.takeSnapshot(p));
      if (getAuditLogs().length === 0) {
        const p0 = this.projects[0];
        const seedEntry = createAuditEntry(
          p0.id,
          'CREATE',
          [{ category: 'Initial Document Baseline', description: 'Tender specification scaffolded with 21 equipment modules & 4 snack pellet variants', from: 'Empty Template', to: p0.documentInfo?.docNumber || '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024' }],
          { name: 'Refin A Putra', role: 'Project Engineer', dept: 'MFG', initials: 'RAP' },
          p0.documentInfo?.docNumber
        );
        appendAuditLog(seedEntry);
      }
    }
  }

  takeSnapshot(project) {
    if (!project || !project.id) return;
    this.lastProjectSnapshots[project.id] = JSON.parse(JSON.stringify(project));
  }

  loadUser() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.USER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name) return parsed;
        }
      }
    } catch (e) {}
    return this.teamMembers[0];
  }

  setCurrentUser(user) {
    if (typeof user === 'string') {
      const found = this.teamMembers.find(m => m.name.toLowerCase() === user.toLowerCase());
      this.currentUser = found || { name: user, email: '', role: 'Project Engineer', initials: getInitials(user), dept: 'MFG' };
    } else if (user && user.name) {
      this.currentUser = user;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      }
    } catch (e) {}
    this.showNotification(`Active user session: ${this.currentUser.name} (${this.currentUser.role})`, 'info');
  }

  getCurrentUser() {
    return this.currentUser || this.teamMembers[0];
  }

  isAdmin() {
    const user = this.getCurrentUser();
    // Admin check: Role is Project & Engineering Manager or name is Moh Yusuf Alfian / explicit admin role
    return user?.role?.toLowerCase().includes('manager') || 
           user?.role?.toLowerCase().includes('admin') || 
           user?.name?.toLowerCase().includes('yusuf alfian');
  }

  updatePlantLocation(plantLocation, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;

    const oldPlant = proj.documentInfo.plantLocation || 'Unknown';
    proj.documentInfo.plantLocation = plantLocation;
    ensureGeneralInfo(proj);
    proj.generalInfo.plantLocation = plantLocation;
    const plantData = getPlantDatabase(plantLocation);

    if (!proj.siteDescription) {
      proj.siteDescription = {};
    }

    // Auto-populate IV. Site Location & Invoicing Address from database
    proj.siteDescription.invoiceRecipient = plantData.invoiceRecipient;
    proj.siteDescription.address = plantData.address;
    proj.siteDescription.deliveryPort = plantData.deliveryPort;
    proj.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(plantData.purchasingAttn));

    // Update Doc Number plant code if standard format
    const parsed = parseTRSANumber(proj.documentInfo.docNumber);
    if (parsed) {
      proj.documentInfo.docNumber = generateTRSANumber({
        seq: parsed.seq,
        creatorName: proj.documentInfo.revisionHistory?.[0]?.originatedBy || 'Refin A Putra',
        plantCode: plantData.code,
        dept: parsed.dept,
        date: proj.documentInfo.revisionHistory?.[0]?.date || new Date()
      });
    }

    this.saveProjects('PLANT_CHANGE', [{
      category: 'Plant Location',
      description: `Factory location & invoicing updated to ${plantData.plantName} (${plantData.code})`,
      from: oldPlant,
      to: plantLocation
    }]);
    this.showNotification(`Plant Location & Invoicing Address updated to ${plantData.plantName} (${plantData.code})`, 'info');
    return plantData;
  }

  updateGeneralInfo(fields = {}, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;
    ensureGeneralInfo(proj);
    Object.assign(proj.generalInfo, fields);

    if (fields.countryOfOrigin) {
      const parsed = parseCountryOfOrigin(fields.countryOfOrigin);
      proj.generalInfo.countryOriginCategory = parsed.category;
      proj.generalInfo.countryOriginForeign = parsed.foreignCountry;
    } else if (fields.countryOriginCategory || fields.countryOriginForeign) {
      const cat = fields.countryOriginCategory || proj.generalInfo.countryOriginCategory || 'Foreign';
      const fCountry = fields.countryOriginForeign || proj.generalInfo.countryOriginForeign || 'Japan';
      proj.generalInfo.countryOriginCategory = cat;
      proj.generalInfo.countryOriginForeign = fCountry;
      proj.generalInfo.countryOfOrigin = formatCountryOfOrigin(cat, fCountry);
    }

    if (fields.equipmentModels && Array.isArray(fields.equipmentModels)) {
      proj.generalInfo.equipmentModels = fields.equipmentModels;
      proj.generalInfo.modelNumber = fields.equipmentModels.map(m => m.modelNumber).filter(Boolean).join(', ');
      proj.generalInfo.designCapacity = fields.equipmentModels.map(m => m.designCapacity).filter(Boolean).join(', ');
    } else {
      if (fields.modelNumber && proj.generalInfo.equipmentModels?.[0]) {
        proj.generalInfo.equipmentModels[0].modelNumber = fields.modelNumber;
      }
      if (fields.designCapacity && proj.generalInfo.equipmentModels?.[0]) {
        proj.generalInfo.equipmentModels[0].designCapacity = fields.designCapacity;
      }
    }

    if (fields.plantLocation && fields.plantLocation !== proj.documentInfo.plantLocation) {
      this.updatePlantLocation(fields.plantLocation, proj.id);
    } else {
      this.saveProjects('UPDATE');
    }
    return proj.generalInfo;
  }

  updateCountryOfOrigin(category, foreignCountry = null, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return;
    ensureGeneralInfo(proj);
    const validCat = ['Local', 'Foreign', 'Mixed'].includes(category) ? category : 'Foreign';
    const oldVal = proj.generalInfo.countryOfOrigin;

    proj.generalInfo.countryOriginCategory = validCat;
    if (foreignCountry) {
      proj.generalInfo.countryOriginForeign = foreignCountry;
    }
    const targetForeign = proj.generalInfo.countryOriginForeign || 'Japan';
    proj.generalInfo.countryOfOrigin = formatCountryOfOrigin(validCat, targetForeign);

    this.saveProjects('UPDATE', [{
      category: 'Country of Origin',
      description: `Country of Origin updated to ${proj.generalInfo.countryOfOrigin}`,
      from: oldVal,
      to: proj.generalInfo.countryOfOrigin
    }]);
    render();
  }

  addEquipmentModel(projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;
    ensureGeneralInfo(proj);
    const newIdx = proj.generalInfo.equipmentModels.length + 1;
    const newModel = {
      id: 'eq-' + Date.now(),
      modelNumber: '',
      designCapacity: ''
    };
    proj.generalInfo.equipmentModels.push(newModel);
    proj.generalInfo.modelNumber = proj.generalInfo.equipmentModels.map(m => m.modelNumber).filter(Boolean).join(', ');
    proj.generalInfo.designCapacity = proj.generalInfo.equipmentModels.map(m => m.designCapacity).filter(Boolean).join(', ');
    this.saveProjects('UPDATE', [{
      category: 'Equipment Models',
      description: `Added equipment model line #${newIdx}`,
      from: `${newIdx - 1} models`,
      to: `${newIdx} models`
    }]);
    render();
    this.showNotification(`Added equipment model #${newIdx}`, 'info');
    return newModel;
  }

  removeEquipmentModel(idx, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return false;
    ensureGeneralInfo(proj);
    if (proj.generalInfo.equipmentModels.length <= 1) {
      this.showNotification('At least one equipment model specification is required.', 'warning');
      return false;
    }
    const removed = proj.generalInfo.equipmentModels.splice(idx, 1)[0];
    proj.generalInfo.modelNumber = proj.generalInfo.equipmentModels.map(m => m.modelNumber).filter(Boolean).join(', ');
    proj.generalInfo.designCapacity = proj.generalInfo.equipmentModels.map(m => m.designCapacity).filter(Boolean).join(', ');
    this.saveProjects('UPDATE', [{
      category: 'Equipment Models',
      description: `Removed equipment model "${removed.modelNumber || `#${idx + 1}`}"`,
      from: `${proj.generalInfo.equipmentModels.length + 1} models`,
      to: `${proj.generalInfo.equipmentModels.length} models`
    }]);
    render();
    this.showNotification('Equipment model removed.', 'info');
    return true;
  }

  updateEquipmentModel(idx, field, value, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return;
    ensureGeneralInfo(proj);
    if (!proj.generalInfo.equipmentModels[idx]) return;
    proj.generalInfo.equipmentModels[idx][field] = value;
    proj.generalInfo.modelNumber = proj.generalInfo.equipmentModels.map(m => m.modelNumber).filter(Boolean).join(', ');
    proj.generalInfo.designCapacity = proj.generalInfo.equipmentModels.map(m => m.designCapacity).filter(Boolean).join(', ');
  }

  updateVendorOrigin(vendorOrigin, projectId = null) {
    const validOrigins = ['Foreign', 'Local', 'Mixed'];
    const origin = validOrigins.includes(vendorOrigin) ? vendorOrigin : 'Foreign';
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;

    const oldOrigin = proj.documentInfo.vendorOrigin || 'Foreign';
    proj.documentInfo.vendorOrigin = origin;
    if (!proj.commercialTerms) proj.commercialTerms = {};
    proj.commercialTerms.vendorOrigin = origin;

    const config = VENDOR_ORIGIN_CONFIG[origin];
    if (config) {
      // Adapt default shipment terms to match origin if using standard default
      if (!proj.commercialTerms.shipmentTerms || 
          proj.commercialTerms.shipmentTerms.includes('CIF / CIP') || 
          proj.commercialTerms.shipmentTerms.includes('Franco Pabrik') || 
          proj.commercialTerms.shipmentTerms.includes('Dual Terms')) {
        proj.commercialTerms.shipmentTerms = config.defaultShipment;
      }
      // Update legal & tax provisions with tailored origin clauses
      if (Array.isArray(config.defaultProvisions)) {
        proj.legalAndTaxProvisions = JSON.parse(JSON.stringify(config.defaultProvisions));
      }
    }

    this.saveProjects('VENDOR_ORIGIN_CHANGE', [{
      category: 'Vendor Origin',
      description: `Vendor procurement origin updated to ${origin}`,
      from: oldOrigin,
      to: origin
    }]);
    this.showNotification(`Vendor Origin updated to ${origin} (${config?.label || origin})`, 'info');
    return config;
  }

  loadProjects() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(p => ensureGeneralInfo(p));
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage, resetting to default.', e);
    }
    const initial = [JSON.parse(JSON.stringify(defaultTRSAProject))];
    initial.forEach(p => ensureGeneralInfo(p));
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initial));
      } catch (e) {}
    }
    return initial;
  }

  saveProjects(customAction = 'UPDATE', customDiffs = null) {
    try {
      // 1. Security & Hardening: Deep payload sanitization against XSS
      const sanitized = sanitizeProject(this.projects);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sanitized));
      }

      // 2. Audit Trail: Generate immutable forensic audit log entry
      const active = this.getActiveProject();
      if (active) {
        const prev = this.lastProjectSnapshots[active.id];
        const diffs = customDiffs || (prev ? detectDetailedProjectChanges(prev, active) : []);

        // Log if there are actual diffs or if it's an explicit action
        if (diffs.length > 0 || customAction !== 'UPDATE') {
          const user = this.getCurrentUser();
          const role = this.isAdmin() ? ROLES.ADMIN : (user.role || ROLES.ENGINEER);
          const entry = createAuditEntry(
            active.id,
            customAction,
            diffs.length > 0 ? diffs : [{ category: 'Document Update', description: 'Specifications updated and saved', from: '', to: '' }],
            {
              name: user.name,
              role,
              dept: user.dept || 'MFG',
              email: user.email || '',
              initials: user.initials
            },
            active.documentInfo?.docNumber
          );
          appendAuditLog(entry);

          // 3. PostgreSQL Sync: Sync to Supabase or queue if offline
          syncProjectToPostgres(active, customAction).catch(e => console.warn('Supabase sync:', e));
        }

        // Refresh snapshot
        this.takeSnapshot(active);
      }

      this.showNotification('All changes saved and logged.', 'success');
    } catch (e) {
      this.showNotification('Error saving project data.', 'error');
    }
  }

  getActiveProject() {
    return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
  }

  createProject(title = 'New TRSA Project', creator = null, plant = 'Semarang Plant') {
    const author = creator || this.currentUser?.name || 'Moh Yusuf Alfian';
    const newProj = JSON.parse(JSON.stringify(defaultTRSAProject));
    newProj.id = 'trsa-' + Date.now();
    newProj.documentInfo.title = title;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const nextSeq = getNextSequenceNumber(this.projects);
    const plantCode = getPlantCode(plant);

    newProj.documentInfo.plantLocation = plant;
    ensureGeneralInfo(newProj);
    newProj.generalInfo.plantLocation = plant;
    const plantData = getPlantDatabase(plant);
    if (!newProj.siteDescription) newProj.siteDescription = {};
    newProj.siteDescription.invoiceRecipient = plantData.invoiceRecipient;
    newProj.siteDescription.address = plantData.address;
    newProj.siteDescription.deliveryPort = plantData.deliveryPort;
    newProj.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(plantData.purchasingAttn));
    newProj.siteDescription.customClearanceNote = plantData.customClearanceNote;

    newProj.documentInfo.docNumber = generateTRSANumber({
      seq: nextSeq,
      creatorName: author,
      plantCode: plantData.code,
      dept: this.currentUser?.dept || 'MFG',
      date: now
    });
    newProj.documentInfo.status = 'Draft';
    newProj.documentInfo.revisionHistory = [{
      revision: '0.0',
      description: 'First Document Draft',
      originatedBy: author,
      date: dateStr
    }];
    this.projects.unshift(newProj);
    this.activeProjectId = newProj.id;
    this.currentView = 'builder';
    this.builderStep = 1;
    this.takeSnapshot(newProj);
    this.saveProjects('CREATE', [{
      category: 'Document Creation',
      description: `New TRSA tender initialized: "${title}"`,
      from: 'Template',
      to: newProj.documentInfo.docNumber
    }]);
    return newProj;
  }

  duplicateProject(id) {
    const source = this.projects.find(p => p.id === id);
    if (!source) return;
    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = 'trsa-' + Date.now();
    cloned.documentInfo.title = cloned.documentInfo.title + ' (Copy)';
    
    const nextSeq = getNextSequenceNumber(this.projects);
    const creator = this.currentUser?.name || cloned.documentInfo.revisionHistory?.[0]?.originatedBy || 'Moh Yusuf Alfian';
    const parsed = parseTRSANumber(cloned.documentInfo.docNumber);
    const plantCode = parsed?.plantCode || getPlantCode(cloned.documentInfo.plantLocation);
    const dept = parsed?.dept || 'MFG';

    cloned.documentInfo.docNumber = generateTRSANumber({
      seq: nextSeq,
      creatorName: creator,
      plantCode: plantCode,
      dept: dept,
      date: new Date()
    });
    cloned.documentInfo.status = 'Draft';
    cloned.documentInfo.revisionHistory = [{
      revision: '0.0',
      description: 'Cloned Document Copy',
      originatedBy: creator,
      date: new Date().toISOString().split('T')[0]
    }];
    this.projects.unshift(cloned);
    this.activeProjectId = cloned.id;
    this.takeSnapshot(cloned);
    this.saveProjects('DUPLICATE', [{
      category: 'Document Cloned',
      description: `Cloned from ${source.documentInfo?.docNumber || source.title}`,
      from: source.documentInfo?.docNumber || '',
      to: cloned.documentInfo.docNumber
    }]);
    this.showNotification(`Project duplicated with next Doc No. (${nextSeq})`, 'success');
  }

  deleteProject(id) {
    if (this.projects.length <= 1) {
      alert('Cannot delete the last remaining project. Please create a new one first.');
      return;
    }
    if (confirm('Are you sure you want to delete this TRSA project?')) {
      this.projects = this.projects.filter(p => p.id !== id);
      this.activeProjectId = this.projects[0].id;
      this.saveProjects();
      this.showNotification('Project deleted.', 'info');
    }
  }

  resetToDefault(id) {
    if (confirm('Reset this project back to the official Indofood TRSA standard specifications?')) {
      const idx = this.projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.projects[idx] = JSON.parse(JSON.stringify(defaultTRSAProject));
        this.projects[idx].id = id;
        this.saveProjects();
        this.showNotification('Project reset to default Indofood standard template.', 'success');
      }
    }
  }

  exportJSON(id) {
    const proj = this.projects.find(p => p.id === id) || this.getActiveProject();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${proj.documentInfo.docNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_TRSA.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showNotification('TRSA Project exported as JSON.', 'success');
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.documentInfo || !parsed.productSpecifications) {
        throw new Error('Invalid TRSA format');
      }
      parsed.id = 'trsa-' + Date.now();
      this.projects.unshift(parsed);
      this.activeProjectId = parsed.id;
      this.saveProjects();
      this.showNotification('TRSA project imported successfully!', 'success');
      this.currentView = 'builder';
    } catch (e) {
      alert('Failed to parse JSON file. Please ensure it is a valid TRSA project export.');
    }
  }

  addRevisionRow(projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;
    if (!proj.documentInfo) proj.documentInfo = {};
    if (!Array.isArray(proj.documentInfo.revisionHistory)) proj.documentInfo.revisionHistory = [];
    
    const count = proj.documentInfo.revisionHistory.length;
    const revNum = count === 0 ? '0.0' : `0.${count}`;
    const today = new Date().toISOString().split('T')[0];
    const author = this.getCurrentUser().name;

    const newRev = {
      revision: revNum,
      description: 'Engineering Revision Update',
      originatedBy: author,
      date: today
    };

    proj.documentInfo.revisionHistory.push(newRev);
    this.saveProjects();
    this.showNotification(`Added new Revision ${revNum} by ${author}`, 'info');
    return newRev;
  }

  stampRevisionRow(idx, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj || !proj.documentInfo?.revisionHistory || !proj.documentInfo.revisionHistory[idx]) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const author = this.getCurrentUser().name;
    const rev = proj.documentInfo.revisionHistory[idx];

    rev.originatedBy = author;
    rev.date = today;
    this.saveProjects();
    this.showNotification(`Revision ${rev.revision} updated: Originated By ${author}, Date ${today}`, 'success');
    return true;
  }

  saveRevisionHistory(projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    const today = new Date().toISOString().split('T')[0];
    const author = this.getCurrentUser().name;
    
    if (proj?.documentInfo?.revisionHistory?.length > 0) {
      // Auto-stamp the latest revision row's date and author
      const latestRev = proj.documentInfo.revisionHistory[proj.documentInfo.revisionHistory.length - 1];
      latestRev.date = today;
      if (!latestRev.originatedBy || latestRev.originatedBy === 'Engineering Team') {
        latestRev.originatedBy = author;
      }
    }
    this.saveProjects();
    return true;
  }

  calculateProgress(proj) {
    let score = 0;
    const total = 7;
    if (proj.documentInfo?.docNumber) score++;
    if (proj.keyContacts?.length > 0) score++;
    if (proj.productSpecifications?.length > 0) score++;
    if (proj.scopeOfSupply?.fryer?.length > 0) score++;
    if (proj.scopeOfSupply?.seasoning?.length > 0) score++;
    if (proj.performanceAcceptance?.tests?.length > 0) score++;
    if (proj.commercialTerms?.selectedPaymentOption) score++;
    return Math.round((score / total) * 100);
  }

  showNotification(msg, type = 'info') {
    this.notification = { msg, type, timestamp: Date.now() };
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('notification-toast');
    if (banner) {
      banner.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 ${
        type === 'success' ? 'bg-[#10B981] text-white shadow-emerald-500/20' : 
        type === 'error' ? 'bg-red-600 text-white shadow-red-500/20' : 
        'bg-[#0B2447] text-white shadow-sky-950/30'
      }`;
      banner.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
        <span class="text-xs font-semibold">${msg}</span>
        <button onclick="document.getElementById('notification-toast').classList.add('hidden')" class="opacity-70 hover:opacity-100 text-sm ml-2">&times;</button>
      `;
      banner.classList.remove('hidden');
      setTimeout(() => {
        if (banner) banner.classList.add('hidden');
      }, 3500);
    }
  }
}

export const store = new TRSAStore();

// Application UI Engine
export function initApp() {
  render();

  // Global listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => render());
    
    // Quick Search Keybinding
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      }
    });
  }
}

export function setView(view, step = 1) {
  store.currentView = view;
  if (step) store.builderStep = step;
  render();
  if (typeof window !== 'undefined' && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function setActiveProject(id, targetView = null) {
  store.activeProjectId = id;
  if (targetView) store.currentView = targetView;
  render();
}

export function render() {
  const root = document.getElementById('app');
  if (!root) return;

  const activeProject = store.getActiveProject();

  root.innerHTML = `
    <div class="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
      <!-- Blue Sky Corporate Sidebar -->
      ${renderSidebar(activeProject)}

      <!-- Main Layout Content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <!-- Top Navigation -->
        ${renderHeader(activeProject)}

        <!-- Main Workspace Area -->
        <main class="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          ${
            store.currentView === 'dashboard' ? renderDashboard() :
            store.currentView === 'projects' ? renderProjectsHub() :
            store.currentView === 'builder' ? renderBuilder(activeProject) :
            store.currentView === 'studio' ? renderStudio(activeProject) : ''
          }
        </main>
      </div>

      <!-- Supabase Modal -->
      ${store.showSupabaseModal ? renderSupabaseModal() : ''}

      <!-- Audit Trail Forensic Modal -->
      ${store.showAuditModal ? renderAuditModal() : ''}

      <!-- Toast Notification Container -->
      <div id="notification-toast" class="hidden"></div>
    </div>
  `;

  attachEventHandlers(activeProject);
}

// Supabase Configuration Modal Component
function renderSupabaseModal() {
  const config = getSupabaseConfig();
  const syncStatus = getSyncStatus();

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scaleUp">
        <!-- Header -->
        <div class="p-6 bg-gradient-to-r from-[#0F2942] to-[#0284C7] text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <svg class="w-5 h-5 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
            </div>
            <div>
              <h3 class="text-base font-bold">PostgreSQL / Supabase Integration</h3>
              <p class="text-xs text-sky-200">Connect cloud database with offline LocalStorage fallback</p>
            </div>
          </div>
          <button onclick="window.TRSA.closeSupabaseModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all text-sm font-bold">
            &times;
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4 text-xs">
          <!-- Status Banner -->
          <div class="p-3.5 rounded-2xl border flex items-center justify-between ${
            syncStatus.isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
              <div>
                <div class="font-bold text-xs">${syncStatus.statusText}</div>
                <div class="text-[11px] opacity-80">${syncStatus.pendingCount} pending offline change(s)</div>
              </div>
            </div>
            <button onclick="window.TRSA.testSupabaseConnection()" class="btn-capiclean-accent text-[11px] px-3 py-1 font-semibold">
              Test Ping
            </button>
          </div>

          <!-- Test Connection Result Message -->
          <div id="supabase-test-result" class="hidden p-3 rounded-xl text-xs font-medium"></div>

          <!-- Form Inputs -->
          <div class="space-y-3">
            <div>
              <label class="block text-slate-700 font-bold mb-1">Supabase Project URL</label>
              <input 
                type="url" 
                id="supabase-url-input" 
                placeholder="https://xyzcompany.supabase.co" 
                value="${config.url || ''}"
                class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label class="block text-slate-700 font-bold mb-1">Supabase Public Anon Key</label>
              <input 
                type="password" 
                id="supabase-key-input" 
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                value="${config.anonKey || ''}"
                class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none font-mono text-xs"
              />
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="supabase-enable-input" 
                ${config.enabled ? 'checked' : ''}
                class="w-4 h-4 text-[#0284C7] rounded-sm focus:ring-[#0284C7]"
              />
              <label for="supabase-enable-input" class="text-slate-700 font-semibold cursor-pointer">
                Enable Cloud PostgreSQL Sync (Fallback to LocalStorage when unconfigured)
              </label>
            </div>
          </div>

          <!-- SQL Schema Reference Note -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] space-y-1">
            <div class="font-bold text-slate-800 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              PostgreSQL Database Schema (src/sql/schema.sql)
            </div>
            <p>Pre-configured with RLS security policies, GIN indexes on JSONB specifications, and foreign key B-tree indexes conforming to Supabase Postgres Best Practices.</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button onclick="window.TRSA.closeSupabaseModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <div class="flex items-center gap-2">
            <button onclick="window.TRSA.syncToPostgresNow()" class="px-4 py-2 rounded-xl text-xs font-bold border border-[#0284C7] text-[#0284C7] hover:bg-sky-50 transition-all">
              Sync Now
            </button>
            <button onclick="window.TRSA.saveSupabaseConfigFromModal()" class="btn-capiclean-accent text-xs px-4 py-2 font-bold shadow-md">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Forensic Audit Trail & Change Traceability Modal
function renderAuditModal() {
  const activeProj = store.getActiveProject();
  let allLogs = getAuditLogs();

  // Filter by project if current selected
  if (store.auditProjectFilter === 'current' && activeProj) {
    allLogs = allLogs.filter(l => l.projectId === activeProj.id);
  }

  // Filter by search query if any
  if (store.auditSearchQuery) {
    const q = store.auditSearchQuery.toLowerCase();
    allLogs = allLogs.filter(l => 
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.projectDocNumber && l.projectDocNumber.toLowerCase().includes(q)) ||
      (l.changedFields && l.changedFields.some(f => f.toLowerCase().includes(q))) ||
      (l.diffDetails && l.diffDetails.some(d => 
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.from && String(d.from).toLowerCase().includes(q)) ||
        (d.to && String(d.to).toLowerCase().includes(q))
      ))
    );
  }

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        <!-- Header -->
        <div class="p-6 bg-gradient-to-r from-[#0F2942] via-[#16365C] to-[#0284C7] text-white flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
              <svg class="w-5 h-5 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold">Audit Trail & Forensic Change History</h3>
                <span class="bg-sky-400/20 text-sky-200 border border-sky-300/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  ${allLogs.length} Records
                </span>
              </div>
              <p class="text-xs text-sky-200 mt-0.5">Comprehensive audit trail: <strong>When</strong> modified, <strong>Who</strong> made the change, and <strong>What</strong> values were updated (before & after).</p>
            </div>
          </div>
          <button onclick="window.TRSA.closeAuditModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all text-sm font-bold">
            &times;
          </button>
        </div>

        <!-- Filter & Action Bar -->
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <!-- Project Filter Dropdown -->
            <select 
              id="audit-project-filter" 
              onchange="window.TRSA.setAuditProjectFilter(this.value)"
              class="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7]"
            >
              <option value="all" ${store.auditProjectFilter === 'all' ? 'selected' : ''}>All Agreements History</option>
              <option value="current" ${store.auditProjectFilter === 'current' ? 'selected' : ''}>Active Agreement Only (${activeProj.documentInfo?.docNumber || 'Current'})</option>
            </select>

            <!-- Search Field -->
            <div class="relative flex-1 sm:w-64">
              <input 
                type="text" 
                id="audit-search-input" 
                placeholder="Filter by author, field, or value..." 
                value="${store.auditSearchQuery || ''}"
                oninput="window.TRSA.setAuditSearch(this.value)"
                class="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-[#0284C7] rounded-xl focus:outline-none"
              />
              <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <!-- Export Actions -->
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button onclick="window.TRSA.downloadAuditJSON()" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs">
              <svg class="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export JSON
            </button>
            <button onclick="window.TRSA.downloadAuditCSV()" class="btn-capiclean-accent text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 shadow-xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        <!-- Scrollable Timeline Body -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F8FAFC]">
          ${allLogs.length === 0 ? `
            <div class="text-center py-16 space-y-3">
              <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg font-bold">∅</div>
              <div class="text-sm font-bold text-slate-700">No matching audit records found</div>
              <div class="text-xs text-slate-400 max-w-sm mx-auto">Every change made to agreements, specifications, parameters, and revisions is automatically logged here with forensic detail.</div>
            </div>
          ` : `
            <div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              ${allLogs.map(log => {
                const actionColors = {
                  CREATE: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                  UPDATE: 'bg-sky-50 text-sky-800 border-sky-300',
                  PLANT_CHANGE: 'bg-indigo-50 text-indigo-800 border-indigo-300',
                  REVISION_STAMP: 'bg-amber-50 text-amber-800 border-amber-300',
                  DUPLICATE: 'bg-purple-50 text-purple-800 border-purple-300',
                  STATUS_CHANGE: 'bg-blue-50 text-blue-800 border-blue-300'
                };
                const actionBadgeClass = actionColors[log.action] || 'bg-slate-50 text-slate-800 border-slate-300';
                const formattedTime = formatAuditTimestamp(log.createdAt);
                const relTime = getRelativeTime(log.createdAt);

                return `
                  <div class="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <!-- Timeline Node Indicator -->
                    <div class="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-white border-3 border-[#0284C7] shadow-xs"></div>

                    <!-- Event Header: Siapa & Kapan -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <!-- Who made the change -->
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-[10px] font-extrabold shadow-2xs">
                          ${log.userInitials || 'IFM'}
                        </div>
                        <div>
                          <div class="text-xs font-bold text-slate-900 leading-tight">
                            ${log.userName}
                            <span class="ml-1 text-[10px] font-semibold text-slate-500">(${log.userRole} &bull; ${log.userDept || 'MFG'})</span>
                          </div>
                          ${log.userEmail ? `<div class="text-[10px] text-slate-400 font-mono">${log.userEmail}</div>` : ''}
                        </div>
                      </div>

                      <!-- Kapan (Waktu perubahan) -->
                      <div class="text-right">
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${actionBadgeClass}">
                          <span>${log.action}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 mt-0.5 flex items-center justify-end gap-1.5">
                          <span class="font-mono">${formattedTime}</span>
                          <span class="text-slate-400 font-medium">(${relTime})</span>
                        </div>
                      </div>
                    </div>

                    <!-- Document Reference Tag -->
                    ${log.projectDocNumber ? `
                      <div class="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <svg class="w-3 h-3 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        ${log.projectDocNumber}
                      </div>
                    ` : ''}

                    <!-- What was changed (Detailed Semantic Diffs) -->
                    <div class="space-y-2">
                      <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Modification Details (What Changed):
                      </div>

                      <div class="grid grid-cols-1 gap-2">
                        ${(log.diffDetails && log.diffDetails.length > 0 ? log.diffDetails : [{
                          category: 'General Update',
                          description: (log.changedFields || []).join(', ') || 'Parameters modified',
                          from: 'Previous state',
                          to: 'Saved state'
                        }]).map(diff => `
                          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <div class="flex items-center justify-between">
                              <span class="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#0284C7]">
                                ${diff.category || 'Specification'}
                              </span>
                              <span class="text-[11px] font-semibold text-slate-700">${diff.description}</span>
                            </div>

                            ${diff.from || diff.to ? `
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 font-mono">
                                <div class="p-1.5 rounded-lg bg-rose-50/60 border border-rose-200 text-rose-800">
                                  <div class="text-[9px] font-bold uppercase text-rose-500 mb-0.5">Previous Value:</div>
                                  <div class="break-words line-through opacity-85">${diff.from || '(None)'}</div>
                                </div>
                                <div class="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-900">
                                  <div class="text-[9px] font-bold uppercase text-emerald-600 mb-0.5">Updated Value:</div>
                                  <div class="break-words font-bold">${diff.to || '(Empty)'}</div>
                                </div>
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Footer -->
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
          <div class="text-slate-500 text-[11px]">
            Forensic Audit Trail is immutable &bull; Stored locally & synced to PostgreSQL
          </div>
          <button onclick="window.TRSA.closeAuditModal()" class="btn-capiclean-accent text-xs px-5 py-2 font-bold shadow-xs">
            Tutup
          </button>
        </div>
      </div>
    </div>
  `;
}

// 1. Sidebar Component (Blue Sky Theme)
function renderSidebar(activeProject) {
  const current = store.currentView;
  return `
    <aside class="dropx-sidebar w-64 text-white flex-shrink-0 flex flex-col justify-between hidden md:flex z-20 no-print select-none shadow-xl">
      <div>
        <!-- Brand Header with Crisp White Emblem -->
        <div class="p-6 border-b border-white/20 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#0284C7] font-extrabold text-lg shadow-lg shadow-sky-900/20">
              <svg class="w-5 h-5 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            </div>
            <div>
              <div class="font-black tracking-tight text-white text-base">TRSA Studio</div>
              <div class="text-[10px] text-sky-100 font-bold tracking-widest uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                PT Indofood Fortuna
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Section -->
        <nav class="p-4 space-y-6">
          <div>
            <div class="text-[10px] font-extrabold text-white/80 uppercase tracking-widest px-3 mb-2">Workspace Hub</div>
            <div class="space-y-1">
              <button onclick="window.TRSA.setView('dashboard')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'dashboard' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                Dashboard Overview
              </button>
              <button onclick="window.TRSA.setView('projects')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'projects' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  TRSA Projects
                </span>
                <span class="px-2 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-black border border-white/30">${store.projects.length}</span>
              </button>
            </div>
          </div>

          <div>
            <div class="text-[10px] font-extrabold text-white/80 uppercase tracking-widest px-3 mb-2">Authoring & Forms</div>
            <div class="space-y-1">
              <button onclick="window.TRSA.setView('builder', 1)" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'builder' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <svg class="w-4 h-4 text-[#FFD166]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                TRSA Builder (Form)
              </button>
              <button onclick="window.TRSA.setView('studio')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'studio' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-[#A7F3D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Clean Business Form
                </span>
                <span class="px-2 py-0.5 text-[9px] rounded-full bg-white/20 text-white font-extrabold uppercase tracking-wider border border-white/30">A4 Print</span>
              </button>
            </div>
          </div>

          <!-- Active Project Snapshot Widget (Glassmorphic White on Sky Blue) -->
          <div class="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-lg text-white">
            <div class="text-[10px] uppercase font-black text-sky-100 mb-1 flex items-center justify-between">
              <span>Active Agreement</span>
              <span class="w-2 h-2 rounded-full bg-white shadow-sm shadow-white/50"></span>
            </div>
            <div class="font-extrabold text-white text-xs truncate" title="${activeProject.documentInfo.title}">
              ${activeProject.documentInfo.title}
            </div>
            <div class="text-[10px] text-sky-100 font-mono mt-0.5 truncate">${activeProject.documentInfo.docNumber}</div>
            <div class="mt-3 flex items-center justify-between text-[11px]">
              <span class="text-sky-100 font-medium">Completeness</span>
              <span class="font-black text-white">${store.calculateProgress(activeProject)}%</span>
            </div>
            <div class="w-full h-1.5 bg-black/15 rounded-full mt-1.5 overflow-hidden">
              <div class="h-full bg-white rounded-full shadow" style="width: ${store.calculateProgress(activeProject)}%"></div>
            </div>
          </div>
        </nav>
      </div>

      <!-- User & Footer Info (Current Logged-in Session) -->
      <div class="p-4 border-t border-white/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 truncate cursor-pointer" onclick="window.TRSA.toggleUserMenu()" title="Logged in as: ${store.currentUser.name} (${store.currentUser.role}) - Click to switch">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black text-[#0284C7] shadow-md flex-shrink-0">
              ${store.currentUser.initials}
            </div>
            <div class="truncate">
              <div class="text-xs font-bold text-white truncate">${store.currentUser.name}</div>
              <div class="text-[10px] text-sky-100 truncate">${store.currentUser.role}</div>
            </div>
          </div>
          <span class="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs flex-shrink-0 ml-1.5" title="Logged in & Active"></span>
        </div>
      </div>
    </aside>
  `;
}

// 2. Header Component
function renderHeader(activeProject) {
  const syncStatus = getSyncStatus();
  const auditCount = getAuditLogs().length;
  return `
    <header class="dropx-header sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between no-print shadow-xs">
      <!-- Breadcrumbs & Plant Selector -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span class="hover:text-[#0284C7] cursor-pointer">IFM Engineering</span>
          <span>/</span>
          <span class="text-[#0F172A] font-bold capitalize">${store.currentView}</span>
        </div>

        <div class="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
          <span class="text-xs text-slate-500 font-medium">Plant:</span>
          <select id="plant-selector" class="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-slate-700 focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] cursor-pointer">
            <option value="all" ${store.plantFilter === 'all' ? 'selected' : ''}>All Locations</option>
            <option value="Semarang Plant" ${store.plantFilter === 'Semarang Plant' ? 'selected' : ''}>Semarang Plant</option>
            <option value="Cikupa Plant" ${store.plantFilter === 'Cikupa Plant' ? 'selected' : ''}>Cikupa Plant</option>
          </select>
        </div>
      </div>

      <!-- Quick Search & Actions -->
      <div class="flex items-center gap-3">
        <div class="relative hidden lg:block w-72">
          <input 
            type="text" 
            id="global-search" 
            placeholder="Search specs, tender #, items... (Ctrl+K)" 
            value="${store.searchQuery}"
            class="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white rounded-xl focus:outline-none transition-all placeholder:text-slate-400"
          />
          <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <button onclick="window.TRSA.createProject()" class="btn-capiclean-accent inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          New TRSA
        </button>

        <button onclick="window.TRSA.exportJSON('${activeProject.id}')" title="Export Current Project to JSON" class="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </button>

        <label for="import-file-input" title="Import TRSA JSON" class="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          <input type="file" id="import-file-input" accept=".json" class="hidden" />
        </label>

        <!-- PostgreSQL Database Status Pill -->
        <button 
          type="button" 
          onclick="window.TRSA.openSupabaseModal()" 
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            syncStatus.isConnected 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }"
          title="Database: ${syncStatus.statusText} (Click to configure Supabase)"
        >
          <span class="w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
          <span class="hidden md:inline">${syncStatus.isConnected ? 'PostgreSQL' : 'LocalStorage'}</span>
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>

        <!-- Change History / Forensic Audit Trail Button -->
        <button 
          type="button" 
          onclick="window.TRSA.openAuditModal()" 
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
          title="Audit Trail: Trace when, who modified, and what was changed"
        >
          <svg class="w-3.5 h-3.5 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="hidden md:inline">Change History</span>
          <span class="bg-[#0284C7] text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">${auditCount}</span>
        </button>

        <!-- User Session Profile & Switcher -->
        <div class="relative ml-1 pl-3 border-l border-slate-200">
          <button 
            type="button" 
            onclick="window.TRSA.toggleUserMenu()" 
            class="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Active Login: ${store.currentUser.name} (${store.currentUser.role}) - Click to switch"
          >
            <div class="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
              ${store.currentUser.initials}
            </div>
            <div class="text-left hidden sm:block">
              <div class="text-[11px] font-bold text-slate-800 leading-tight">${store.currentUser.name}</div>
              <div class="text-[9px] text-[#0284C7] font-semibold leading-tight flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active User</span>
              </div>
            </div>
            <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>

          <!-- User Switcher Dropdown Menu -->
          <div id="user-switcher-dropdown" class="${store.showUserMenu ? '' : 'hidden'} absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1">
            <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Login Session</span>
              <span class="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Online</span>
            </div>
            ${store.teamMembers.map(m => `
              <button 
                type="button" 
                onclick="window.TRSA.switchUser('${m.name}')" 
                class="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  m.name === store.currentUser.name 
                    ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-100' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }"
              >
                <div>
                  <div class="text-xs font-bold">${m.name}</div>
                  <div class="text-[10px] text-slate-500">${m.role} &bull; ${m.dept}</div>
                </div>
                ${m.name === store.currentUser.name ? '<span class="text-xs font-bold text-[#0284C7]">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </header>
  `;
}

// 3. Dashboard View (Modern Clean Corporate Aesthetic)
function renderDashboard() {
  const activeProject = store.getActiveProject();
  const totalScopeItems = (activeProject.scopeOfSupply?.fryer?.length || 0) + (activeProject.scopeOfSupply?.seasoning?.length || 0);

  return `
    <div class="space-y-8 animate-fadeIn">
      <!-- Clean Corporate Executive Welcome Banner -->
      <div class="dropx-card p-7 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0369A1] text-white relative overflow-hidden shadow-lg border border-slate-700/50">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-200 border border-white/15 text-[11px] font-semibold mb-3 backdrop-blur-sm">
            <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            Tender Requirements & Specification Agreement Platform
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">TRSA Industrial Engineering Studio</h1>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">
            Standardized engineering agreement matrix for PT Indofood Fortuna Makmur food machinery lines. Conforms to industrial hygienic design, 7-hour continuous capability protocols, and Indonesian commercial tax regulations.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <button onclick="window.TRSA.setView('builder', 1)" class="btn-capiclean-accent text-xs px-4 py-2 flex items-center gap-2 shadow-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              Open Specification Builder
            </button>
            <button onclick="window.TRSA.setView('studio')" class="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm">
              <svg class="w-4 h-4 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Clean Business Form (A4)
            </button>
          </div>
        </div>
        <!-- Ambient Glowing Blue Droplet Effect -->
        <div class="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <!-- Clean Corporate Continuous Processing Line Diagram -->
      <div class="dropx-card p-6 bg-white border border-slate-200 space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Indofood Continuous Pellet Production Line Architecture</span>
          </div>
          <span class="text-[11px] font-semibold text-[#0284C7] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            7-Hour Capability Protocol
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
          <!-- 1. Pellet Infeed -->
          <div class="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 hover:border-sky-200 hover:bg-sky-50/70 transition-all">
            <div class="flex items-center justify-between mb-1.5">
              <span class="w-6 h-6 rounded-lg bg-[#0284C7] text-white flex items-center justify-center text-xs font-bold">1</span>
              <span class="text-[10px] font-bold text-[#0369A1] uppercase tracking-wider">Raw Infeed</span>
            </div>
            <div class="font-bold text-xs text-[#0F172A]">Pellet Feed System</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Weigh feeder & hopper >70L</div>
            <div class="mt-2 text-[10px] font-mono font-bold text-[#0284C7]">Rate: 1.5 - 2.5 kg</div>
          </div>
          <!-- 2. Drum Pre-Fryer -->
          <div class="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:border-amber-200 hover:bg-amber-50/70 transition-all">
            <div class="flex items-center justify-between mb-1.5">
              <span class="w-6 h-6 rounded-lg bg-[#D97706] text-white flex items-center justify-center text-xs font-bold">2</span>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pre-Clean</span>
            </div>
            <div class="font-bold text-xs text-[#0F172A]">Drum Pre-Fryer</div>
            <div class="text-[10px] text-slate-500 mt-0.5">60 Mesh screen + air-knife</div>
            <div class="mt-2 text-[10px] font-mono font-bold text-amber-700">Fines auger</div>
          </div>
          <!-- 3. Fryer Module -->
          <div class="p-3.5 rounded-xl border border-orange-100 bg-orange-50/40 hover:border-orange-200 hover:bg-orange-50/70 transition-all">
            <div class="flex items-center justify-between mb-1.5">
              <span class="w-6 h-6 rounded-lg bg-[#EA580C] text-white flex items-center justify-center text-xs font-bold">3</span>
              <span class="text-[10px] font-bold text-[#EA580C] uppercase tracking-wider">Thermal</span>
            </div>
            <div class="font-bold text-xs text-[#0F172A]">Unitized Pan Fryer</div>
            <div class="text-[10px] text-slate-500 mt-0.5">CIP Hood, auto oil top-up</div>
            <div class="mt-2 text-[10px] font-mono font-bold text-[#EA580C]">180 - 190 °C (20-30s)</div>
          </div>
          <!-- 4. De-Oiling Shaker -->
          <div class="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:border-indigo-200 hover:bg-indigo-50/70 transition-all">
            <div class="flex items-center justify-between mb-1.5">
              <span class="w-6 h-6 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span class="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Recovery</span>
            </div>
            <div class="font-bold text-xs text-[#0F172A]">De-Oiling Shaker</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Oil accumulator & return</div>
            <div class="mt-2 text-[10px] font-mono font-bold text-indigo-700">Moisture: 1 - 2.1%</div>
          </div>
          <!-- 5. Seasoning Tumble -->
          <div class="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:border-emerald-200 hover:bg-emerald-50/70 transition-all">
            <div class="flex items-center justify-between mb-1.5">
              <span class="w-6 h-6 rounded-lg bg-[#059669] text-white flex items-center justify-center text-xs font-bold">5</span>
              <span class="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Flavoring</span>
            </div>
            <div class="font-bold text-xs text-[#0F172A]">Tumble Drum</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Loss-in-Weight screw</div>
            <div class="mt-2 text-[10px] font-mono font-bold text-[#059669]">Cap: 635 - 700 kg/h</div>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Row (Corporate Cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Total Projects -->
        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Projects</span>
            <div class="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100 flex items-center justify-center shadow-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-[#0F172A] mt-2">${store.projects.length}</div>
          <div class="text-[11px] text-[#0284C7] font-semibold mt-1 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
            <span>1 Active published agreement</span>
          </div>
        </div>

        <!-- Metric 2: Scope Items -->
        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Equipment Modules</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] border border-emerald-100 flex items-center justify-center shadow-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-[#0F172A] mt-2">${totalScopeItems} Units</div>
          <div class="text-[11px] text-[#059669] font-semibold mt-1">14 Fryer & 7 Seasoning items</div>
        </div>

        <!-- Metric 3: Target Output Capacity -->
        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Target Line Output</span>
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] border border-amber-100 flex items-center justify-center shadow-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-[#0F172A] mt-2">600 - 700 kg/h</div>
          <div class="text-[11px] text-[#D97706] font-semibold mt-1">4 Product variants registered</div>
        </div>

        <!-- Metric 4: Target Start-up -->
        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Line Start-Up Target</span>
            <div class="w-8 h-8 rounded-xl bg-sky-50 text-[#0369A1] border border-sky-100 flex items-center justify-center shadow-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>
          <div class="text-base font-bold text-[#0F172A] mt-2 truncate">${activeProject.projectOverview?.keyDates?.lineStartUp || 'End April 2025'}</div>
          <div class="text-[11px] text-[#0369A1] font-semibold mt-1">Semarang Line Installation</div>
        </div>
      </div>

      <!-- Projects Table Section -->
      <div class="dropx-card overflow-hidden bg-white border border-slate-200">
        <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-[#0F172A]">Registered TRSA Tender Agreements</h2>
            <p class="text-xs text-slate-500 mt-0.5">Manage agreements, monitor revision history, and export official documentation.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.TRSA.createProject()" class="text-xs bg-sky-50 text-[#0284C7] hover:bg-sky-100 border border-sky-200 font-semibold px-3 py-1.5 rounded-xl transition-all">
              + Add New Project
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th class="py-3 px-5">Tender / Agreement Title</th>
                <th class="py-3 px-4">Doc Number</th>
                <th class="py-3 px-4">Plant & Location</th>
                <th class="py-3 px-4">Origin</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Progress</th>
                <th class="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${store.projects.map(proj => {
                const isSelected = proj.id === store.activeProjectId;
                const progress = store.calculateProgress(proj);
                const vendorOrigin = proj.documentInfo.vendorOrigin || 'Foreign';
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-sky-50/30' : ''}">
                    <td class="py-3.5 px-5">
                      <div class="font-semibold text-[#0F172A] text-xs">${proj.documentInfo.title}</div>
                      <div class="text-[11px] text-slate-500 truncate max-w-xs">${proj.documentInfo.subTitle || proj.projectOverview.description}</div>
                    </td>
                    <td class="py-3.5 px-4 font-mono font-medium text-[#0369A1]">
                      ${proj.documentInfo.docNumber}
                    </td>
                    <td class="py-3.5 px-4 text-slate-500">
                      ${proj.documentInfo.plantLocation || 'Semarang Plant'}
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        vendorOrigin === 'Local' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        vendorOrigin === 'Mixed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-sky-50 text-[#0284C7] border border-sky-200'
                      }">
                        ${vendorOrigin}
                      </span>
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        proj.documentInfo.status === 'Published' ? 'badge-published' :
                        proj.documentInfo.status === 'Approved' ? 'badge-approved' :
                        proj.documentInfo.status === 'Under Review' ? 'badge-review' : 'badge-draft'
                      }">
                        ${proj.documentInfo.status}
                      </span>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div class="h-full bg-[#0284C7] rounded-full" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-[10px] font-bold text-[#0284C7]">${progress}%</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                      <button onclick="window.TRSA.setActiveProject('${proj.id}', 'builder')" class="px-2.5 py-1 text-slate-700 hover:text-[#0284C7] hover:bg-slate-100 rounded-lg font-medium text-[11px] transition-all">
                        Edit
                      </button>
                      <button onclick="window.TRSA.setActiveProject('${proj.id}', 'studio')" class="px-2.5 py-1 text-[#0284C7] hover:bg-sky-50 rounded-lg font-semibold text-[11px] transition-all">
                        Clean Form A4
                      </button>
                      <button onclick="window.TRSA.duplicateProject('${proj.id}')" class="px-2 py-1 text-[#5A7184] hover:text-[#0B2447] rounded-lg font-semibold text-[11px]" title="Duplicate">
                        Clone
                      </button>
                      <button onclick="window.TRSA.deleteProject('${proj.id}')" class="px-2 py-1 text-red-500 hover:text-red-700 rounded-lg font-semibold text-[11px]" title="Delete">
                        &times;
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Template Scaffolding Cards -->
      <div>
        <h3 class="text-sm font-bold text-[#0B2447] mb-3">Pre-Engineered Equipment Templates</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="dropx-card p-4 hover:border-[#0284C7] cursor-pointer transition-all bg-white" onclick="window.TRSA.resetToDefault('${activeProject.id}')">
            <div class="text-xs font-bold text-[#0B2447]">Sheeted Pellet Fryer & Seasoning System</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Full 14-page Indofood Semarang standard (4 products, 21 scope units, continuous 7h trial).</p>
            <div class="mt-3 text-[10px] font-bold text-[#0284C7] flex items-center gap-1">
              Load Official Template &rarr;
            </div>
          </div>
          <div class="dropx-card p-4 hover:border-[#FF7A00] cursor-pointer transition-all bg-white" onclick="window.TRSA.createProject('Extruded Snack Line Agreement')">
            <div class="text-xs font-bold text-[#0B2447]">Extruded Corn & Rice Snack Line</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Twin-screw extruder, pneumatic transfer, dryer oven & slurry seasoning system.</p>
            <div class="mt-3 text-[10px] font-bold text-[#FF7A00] flex items-center gap-1">
              Scaffold Extruder TRSA &rarr;
            </div>
          </div>
          <div class="dropx-card p-4 hover:border-[#10B981] cursor-pointer transition-all bg-white" onclick="window.TRSA.createProject('Packaging & Multipack Cartoning Line')">
            <div class="text-xs font-bold text-[#0B2447]">High-Speed VFFS Packaging & Multipack</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Multi-head weigher, nitrogen flushing, metal detector, and automatic case packer.</p>
            <div class="mt-3 text-[10px] font-bold text-[#10B981] flex items-center gap-1">
              Scaffold Packaging TRSA &rarr;
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 4. Projects Hub View
function renderProjectsHub() {
  const filtered = store.projects.filter(p => {
    const matchesSearch = store.searchQuery === '' ||
      p.documentInfo.title.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      p.documentInfo.docNumber.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      p.projectOverview.description.toLowerCase().includes(store.searchQuery.toLowerCase());
    const matchesStatus = store.statusFilter === 'all' || p.documentInfo.status === store.statusFilter;
    const matchesPlant = store.plantFilter === 'all' || p.documentInfo.plantLocation === store.plantFilter;
    return matchesSearch && matchesStatus && matchesPlant;
  });

  return `
    <div class="space-y-6 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-[#0B2447]">TRSA Projects Hub</h1>
          <p class="text-xs text-[#5A7184]">Browse, filter, and organize all Tender Requirements & Specification Agreements.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.TRSA.createProject()" class="btn-capiclean-accent font-semibold text-xs px-4 py-2 transition-all">
            + New TRSA Project
          </button>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-[#E0ECF6] text-xs">
        <span class="text-[#5A7184] font-bold text-[11px] uppercase tracking-wider">Filter:</span>
        <button onclick="window.TRSA.setStatusFilter('all')" class="px-3 py-1 rounded-xl font-bold ${store.statusFilter === 'all' ? 'bg-[#0B2447] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">All</button>
        <button onclick="window.TRSA.setStatusFilter('Published')" class="px-3 py-1 rounded-xl font-bold ${store.statusFilter === 'Published' ? 'bg-[#0284C7] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">Published</button>
        <button onclick="window.TRSA.setStatusFilter('Under Review')" class="px-3 py-1 rounded-xl font-bold ${store.statusFilter === 'Under Review' ? 'bg-[#FF7A00] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">Under Review</button>
        <button onclick="window.TRSA.setStatusFilter('Draft')" class="px-3 py-1 rounded-xl font-bold ${store.statusFilter === 'Draft' ? 'bg-slate-500 text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">Draft</button>
      </div>

      <!-- Grid Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${filtered.map(proj => {
          const progress = store.calculateProgress(proj);
          return `
            <div class="dropx-card p-5 flex flex-col justify-between hover:shadow-lg transition-all bg-white border border-[#E0ECF6]">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[10px] font-mono px-2 py-0.5 bg-[#E0F2FE] text-[#0369A1] rounded-lg font-bold">${proj.documentInfo.docNumber}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    proj.documentInfo.status === 'Published' ? 'badge-published' :
                    proj.documentInfo.status === 'Approved' ? 'badge-approved' :
                    proj.documentInfo.status === 'Under Review' ? 'badge-review' : 'badge-draft'
                  }">${proj.documentInfo.status}</span>
                </div>
                <h3 class="text-sm font-bold text-[#0B2447]">${proj.documentInfo.title}</h3>
                <p class="text-xs text-[#5A7184] line-clamp-2 mt-1.5">${proj.projectOverview.description}</p>
                <div class="mt-4 pt-4 border-t border-[#E0ECF6] space-y-2 text-[11px] text-[#0B2447]">
                  <div class="flex justify-between">
                    <span class="text-[#5A7184]">Target Start-Up:</span>
                    <span class="font-bold text-[#0369A1]">${proj.projectOverview.keyDates.lineStartUp}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-[#5A7184]">Vendor / Origin:</span>
                    <span class="font-bold text-[#0B2447] truncate max-w-[150px]">${proj.generalInfo?.vendorName || 'OEM'} (${proj.generalInfo?.countryOfOrigin || 'Japan'})</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-[#5A7184]">Products:</span>
                    <span class="font-bold">${proj.productSpecifications.length} Shapes</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-[#5A7184]">Scope Modules:</span>
                    <span class="font-bold">${(proj.scopeOfSupply.fryer.length + proj.scopeOfSupply.seasoning.length)} Units</span>
                  </div>
                </div>
              </div>

              <div class="mt-5 pt-3 border-t border-[#E0ECF6]">
                <div class="flex items-center justify-between mb-1.5 text-[10px]">
                  <span class="text-[#5A7184] font-semibold">Agreement Completeness</span>
                  <span class="font-bold text-[#0284C7]">${progress}%</span>
                </div>
                <div class="w-full h-1.5 bg-[#E0ECF6] rounded-full overflow-hidden mb-4">
                  <div class="h-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] rounded-full" style="width: ${progress}%"></div>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <button onclick="window.TRSA.setActiveProject('${proj.id}', 'builder')" class="flex-1 bg-[#0B2447] hover:bg-[#07192C] text-white font-bold text-xs py-2 rounded-xl text-center transition-all">
                    Edit Form
                  </button>
                  <button onclick="window.TRSA.setActiveProject('${proj.id}', 'studio')" class="flex-1 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] font-bold text-xs py-2 rounded-xl text-center transition-all">
                    A4 View
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 5. TRSA Builder View (Multi-Step Guided Form)
function renderBuilder(proj) {
  const step = store.builderStep;

  return `
    <div class="space-y-6 animate-fadeIn pb-24">
      <!-- Top Title & Navigation -->
      <div class="dropx-card p-5 bg-white border border-[#E0ECF6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono px-2.5 py-0.5 bg-[#E0F2FE] text-[#0284C7] rounded-full font-bold uppercase">
              Step ${step} of 6
            </span>
            <span class="text-xs text-[#5A7184] font-medium">Document Form Editor</span>
          </div>
          <h1 class="text-lg font-bold text-[#0B2447] mt-1">${proj.documentInfo.title}</h1>
          <p class="text-xs text-[#0369A1] font-mono">${proj.documentInfo.docNumber}</p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.TRSA.setView('studio')" class="bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            Live A4 Preview
          </button>
          <button onclick="window.TRSA.saveCurrentForm()" class="btn-capiclean-primary font-bold text-xs px-4 py-2 transition-all">
            Save Changes
          </button>
        </div>
      </div>

      <!-- Modern Capiclean Stepper Navigation Tabs -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
        ${[
          { s: 1, title: '1. Document & Dates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { s: 2, title: '2. Contacts & Site', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { s: 3, title: '3. Product Specs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
          { s: 4, title: '4. Project Scope', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { s: 5, title: '5. Tests & Hygiene', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { s: 6, title: '6. Terms, Tax & Docs', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map(item => `
          <button 
            onclick="window.TRSA.setStep(${item.s})" 
            class="p-3 rounded-2xl border text-left transition-all ${
              step === item.s 
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-md shadow-sky-500/20' 
                : 'bg-white hover:bg-[#F0F9FF] text-[#0B2447] border-[#E0ECF6]'
            }"
          >
            <div class="flex items-center gap-1.5 mb-1 ${step === item.s ? 'text-white' : 'text-[#0284C7]'}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"/></svg>
              <span class="text-[10px] font-bold">Step ${item.s}</span>
            </div>
            <div class="text-xs font-bold truncate">${item.title.split('. ')[1]}</div>
          </button>
        `).join('')}
      </div>

      <!-- Step Content Container -->
      <form id="trsa-builder-form" onsubmit="event.preventDefault();" class="space-y-6">
        ${
          step === 1 ? renderStep1(proj) :
          step === 2 ? renderStep2(proj) :
          step === 3 ? renderStep3(proj) :
          step === 4 ? renderStep4(proj) :
          step === 5 ? renderStep5(proj) :
          step === 6 ? renderStep6(proj) : ''
        }
      </form>

      <!-- Sticky Footer Actions -->
      <div class="floating-actions fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E0ECF6] px-6 py-3.5 z-30 shadow-lg flex items-center justify-between no-print max-w-7xl mx-auto md:left-64">
        <div>
          <button 
            type="button" 
            onclick="window.TRSA.setStep(${Math.max(1, step - 1)})" 
            class="px-4 py-2 text-xs font-bold rounded-xl border border-[#CBD5E1] text-[#0B2447] hover:bg-[#F0F9FF] transition-all ${step === 1 ? 'opacity-40 cursor-not-allowed' : ''}"
            ${step === 1 ? 'disabled' : ''}
          >
            &larr; Previous Step
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button 
            type="button" 
            onclick="window.TRSA.saveCurrentForm()" 
            class="px-4 py-2 text-xs font-bold rounded-xl bg-[#E0F2FE] text-[#0369A1] hover:bg-[#BAE6FD] transition-all"
          >
            Save Draft
          </button>
          ${
            step < 6 
              ? `<button 
                  type="button" 
                  onclick="window.TRSA.setStep(${step + 1})" 
                  class="btn-capiclean-primary px-5 py-2 text-xs font-bold transition-all"
                >
                  Continue &rarr;
                </button>`
              : `<button 
                  type="button" 
                  onclick="window.TRSA.saveCurrentForm(); window.TRSA.setView('studio');" 
                  class="btn-capiclean-accent px-5 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Finish & View Official A4
                </button>`
          }
        </div>
      </div>
    </div>
  `;
}

// Sub-step 1: Document Details, Revision History & Dates
function renderStep1(proj) {
  ensureGeneralInfo(proj);
  const parsed = parseTRSANumber(proj.documentInfo.docNumber);
  const authorName = proj.documentInfo.revisionHistory?.[0]?.originatedBy || 'Refin A Putra';
  const creationDate = proj.documentInfo.revisionHistory?.[0]?.date || new Date().toISOString().split('T')[0];
  const plantLoc = proj.documentInfo.plantLocation || 'Semarang Plant';
  const currentPlantCode = parsed?.plantCode || getPlantCode(plantLoc);
  const currentSeq = parsed?.seq || getNextSequenceNumber(store.projects);
  const currentInitials = parsed?.initials || getInitials(authorName);
  const currentDept = parsed?.dept || 'MFG';
  const currentMonth = parsed?.romanMonth || toRomanMonth(new Date(creationDate).getMonth() + 1);
  const currentYear = parsed?.year || new Date(creationDate).getFullYear().toString();

  const currentVendor = proj.generalInfo?.vendorName || '';
  const selectedVendorDetails = getVendorDetails(currentVendor);
  const isCustomVendorActive = store.customVendorActive || (currentVendor && !selectedVendorDetails);
  const cooParsed = parseCountryOfOrigin(proj.generalInfo?.countryOfOrigin || 'Japan');
  const currentCooCategory = proj.generalInfo?.countryOriginCategory || cooParsed.category || 'Foreign';
  const currentForeignCoo = proj.generalInfo?.countryOriginForeign || cooParsed.foreignCountry || 'Japan';
  const equipmentModels = proj.generalInfo?.equipmentModels || [
    {
      id: 'eq-1',
      modelNumber: proj.generalInfo?.modelNumber || 'SPF-600 Continuous',
      designCapacity: proj.generalInfo?.designCapacity || '600 kg/hour (Pellet Output)'
    }
  ];

  return `
    <div class="dropx-card p-6 bg-white border border-slate-200 space-y-6">
      <div class="border-b border-slate-200 pb-4">
        <h2 class="text-base font-bold text-[#0F172A]">Document Identification & Revision Control</h2>
        <p class="text-xs text-slate-500">Official document title, tracking number, and revision records conforming to Indofood standards.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
          <input type="text" id="doc-title" value="${proj.documentInfo.title}" class="corp-input font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Sub Title / Equipment Line</label>
          <input type="text" id="doc-subtitle" value="${proj.documentInfo.subTitle}" class="corp-input font-medium" />
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700">Document Number (No. TRSA)</label>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <svg class="w-3 h-3 text-slate-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Read-Only
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" id="doc-number" value="${proj.documentInfo.docNumber}" readonly class="corp-input font-mono font-bold text-[#0369A1] bg-slate-100/90 border-slate-300 cursor-not-allowed select-all" title="Official TRSA Document Number (Read-only)" />
            <button type="button" onclick="window.TRSA.autoGenerateDocNumber()" title="Generate next standard document number" class="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] rounded-xl whitespace-nowrap transition-all shadow-xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Auto
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Vendor Origin</label>
          <select id="doc-vendor-origin" class="corp-select font-bold text-[#0B2447]">
            <option value="Foreign" ${(proj.documentInfo.vendorOrigin || 'Foreign') === 'Foreign' ? 'selected' : ''}>Foreign (International OEM)</option>
            <option value="Local" ${proj.documentInfo.vendorOrigin === 'Local' ? 'selected' : ''}>Local (Domestic Indonesian Vendor)</option>
            <option value="Mixed" ${proj.documentInfo.vendorOrigin === 'Mixed' ? 'selected' : ''}>Mixed (Foreign Equipment & Local Services)</option>
          </select>
        </div>
      </div>

      <!-- Vendor Origin Contextual Banner -->
      <div class="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
        (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
        (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-50/70 border-purple-200 text-purple-950' :
        'bg-sky-50/70 border-sky-200 text-sky-950'
      }">
        <div class="flex items-center gap-2.5">
          <span class="px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] ${
            (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-600 text-white' :
            (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-600 text-white' :
            'bg-[#0284C7] text-white'
          }">
            ${proj.documentInfo.vendorOrigin || 'Foreign'} Sourcing
          </span>
          <span class="font-medium text-[11px]">
            ${(VENDOR_ORIGIN_CONFIG[proj.documentInfo.vendorOrigin || 'Foreign'] || VENDOR_ORIGIN_CONFIG.Foreign).description}
          </span>
        </div>
        <div class="font-mono text-[10px] font-bold text-slate-600 whitespace-nowrap">
          Currency: ${(VENDOR_ORIGIN_CONFIG[proj.documentInfo.vendorOrigin || 'Foreign'] || VENDOR_ORIGIN_CONFIG.Foreign).currency}
        </div>
      </div>

      <!-- Section: General Information Card -->
      <div class="p-5 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-2xl border border-sky-200/80 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sky-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] ring-4 ring-sky-100"></span>
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                General Information
              </h3>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Core tender specifications: plant location, machinery country of origin, equipment type, vendor/OEM details, models, and rated design capacities.
            </p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-[#0369A1] bg-[#E0F2FE] border border-[#BAE6FD] rounded-lg">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Tender Scope Master Data
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Plant Location -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Plant Location <span class="text-red-500">*</span>
            </label>
            <select id="gen-plant-location" class="corp-select font-bold text-slate-800">
              <option value="Cikokol Plant" ${(proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation) === 'Cikokol Plant' ? 'selected' : ''}>1402 - Cikokol Plant</option>
              <option value="Semarang Plant" ${(proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation) === 'Semarang Plant' ? 'selected' : ''}>1403 - Semarang Plant</option>
              <option value="Cikupa Plant" ${(proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation) === 'Cikupa Plant' ? 'selected' : ''}>1405 - Cikupa Plant</option>
              <option value="Agro Plant" ${(proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation) === 'Agro Plant' ? 'selected' : ''}>1411 - Agro Plant</option>
            </select>
          </div>

          <!-- Country of Origin Category Dropdown -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Country of Origin <span class="text-red-500">*</span>
            </label>
            <select 
              id="gen-country-category" 
              onchange="window.TRSA.onCountryCategoryChanged(this.value)" 
              class="corp-select font-bold text-[#0284C7]"
            >
              <option value="Local" ${currentCooCategory === 'Local' ? 'selected' : ''}>Local</option>
              <option value="Foreign" ${currentCooCategory === 'Foreign' ? 'selected' : ''}>Foreign (Dropdown CoO)</option>
              <option value="Mixed" ${currentCooCategory === 'Mixed' ? 'selected' : ''}>Mixed (Indonesia & Foreign (Dropdown CoO))</option>
            </select>
          </div>

          <!-- Specific CoO Sub-Dropdown / Origin Details -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-700">
                ${currentCooCategory === 'Local' ? 'Origin Details' : currentCooCategory === 'Mixed' ? 'Foreign Partner CoO' : 'Country of Origin (CoO)'} <span class="text-red-500">*</span>
              </label>
              <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                currentCooCategory === 'Local' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                currentCooCategory === 'Mixed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                'bg-sky-50 text-[#0284C7] border border-sky-200'
              }">
                ${currentCooCategory}
              </span>
            </div>
            ${currentCooCategory === 'Local' ? `
              <div class="corp-input bg-slate-50 border border-slate-200 font-bold text-emerald-800 text-xs flex items-center justify-between cursor-default">
                <span>Indonesia (Domestic)</span>
                <span class="text-[10px] text-emerald-600 font-mono font-bold">ID / Local</span>
              </div>
            ` : `
              <select 
                id="gen-country-origin" 
                onchange="window.TRSA.onForeignCountryChanged(this.value)" 
                class="corp-select font-bold text-[#0B2447]"
              >
                ${FOREIGN_COUNTRY_OPTIONS.map(c => `
                  <option value="${c}" ${currentForeignCoo === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            `}
          </div>

          <!-- Equipment Type (Dropdown) -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Equipment Type <span class="text-red-500">*</span>
            </label>
            <select id="gen-equipment-type" class="corp-select font-bold text-[#0B2447]">
              ${EQUIPMENT_TYPE_OPTIONS.map(opt => `
                <option value="${opt}" ${(proj.generalInfo?.equipmentType || proj.generalInfo?.machineType || 'Frying System') === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          </div>

          <!-- Vendor Name (OEM / Manufacturer) Dropdown with detail card -->
          <div class="md:col-span-2 lg:col-span-3 p-4 bg-white/95 border border-sky-200/80 rounded-2xl shadow-xs space-y-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label class="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Vendor Name (OEM / Manufacturer) <span class="text-red-500">*</span>
              </label>
              ${selectedVendorDetails ? `
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedVendorDetails.origin === 'Local' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-sky-50 text-[#0284C7] border border-sky-200'
                  }">
                    ${selectedVendorDetails.origin} OEM
                  </span>
                  <span class="text-[11px] font-semibold text-slate-500">
                    Base: <strong class="text-slate-800">${selectedVendorDetails.country}</strong>
                  </span>
                </div>
              ` : ''}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select id="gen-vendor-select" onchange="window.TRSA.onVendorSelectChanged(this.value)" class="corp-select font-bold text-slate-800 text-xs w-full">
                  <option value="" disabled ${!currentVendor ? 'selected' : ''}>-- Select Pre-vetted OEM / Equipment Vendor --</option>
                  ${VENDOR_DATABASE.map(v => `
                    <option value="${v.name}" ${currentVendor === v.name ? 'selected' : ''}>
                      ${v.name} (${v.country} - ${v.equipmentType})
                    </option>
                  `).join('')}
                  ${(currentVendor && !selectedVendorDetails) ? `
                    <option value="${currentVendor}" selected>${currentVendor} (Custom Vendor)</option>
                  ` : ''}
                  <option value="__custom__" ${store.customVendorActive ? 'selected' : ''}>+ Enter Custom Vendor Name...</option>
                </select>
              </div>

              <div>
                ${isCustomVendorActive ? `
                  <input 
                    type="text" 
                    id="gen-vendor-custom" 
                    value="${currentVendor}" 
                    placeholder="Enter custom OEM / Manufacturer name..." 
                    class="corp-input font-bold text-slate-900 text-xs w-full" 
                  />
                ` : `
                  <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                    <span class="truncate">
                      <strong>Specialization:</strong> ${selectedVendorDetails?.equipmentType || 'Food Processing Machinery'}
                    </span>
                    <span class="text-[10px] text-emerald-600 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                      Pre-vetted OEM
                    </span>
                  </div>
                `}
              </div>
            </div>

            ${selectedVendorDetails?.description ? `
              <p class="text-[11px] text-slate-500 mt-0.5 italic">
                ${selectedVendorDetails.description}
              </p>
            ` : ''}
          </div>

          <!-- Equipment Models & Design Capacities Matrix -->
          <div class="md:col-span-2 lg:col-span-3 pt-3 border-t border-sky-100 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-[#0284C7]"></span>
                  <label class="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Equipment Models & Design Capacities (Offered by Vendor)
                  </label>
                  <span class="text-[10px] bg-sky-50 text-[#0284C7] border border-sky-200 px-2 py-0.5 rounded-full font-bold">
                    ${equipmentModels.length} Equipment Unit${equipmentModels.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  Add equipment models / line tags and their corresponding rated design capacities offered by the vendor.
                </p>
              </div>
              <button 
                type="button" 
                onclick="window.TRSA.addEquipmentModel()" 
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] border border-sky-300 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                + Add Model & Capacity
              </button>
            </div>

            <!-- Dynamic List of Equipment Models & Design Capacities -->
            <div class="space-y-2.5" id="equipment-models-container">
              ${equipmentModels.map((item, idx) => `
                <div class="p-3.5 rounded-xl border border-sky-100 bg-white shadow-xs hover:border-sky-300 transition-all flex flex-col md:flex-row md:items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-[#0284C7] flex items-center justify-center text-xs font-bold font-mono">
                      #${idx + 1}
                    </span>
                  </div>
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                        Model / Line Tag <span class="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value="${item.modelNumber || ''}" 
                        data-model-idx="${idx}" 
                        data-model-field="modelNumber" 
                        placeholder="e.g. SPF-600 Continuous Fryer, TMB-700 Drum, etc." 
                        class="corp-input font-mono text-xs font-medium w-full"
                      />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                        Design Capacity <span class="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value="${item.designCapacity || ''}" 
                        data-model-idx="${idx}" 
                        data-model-field="designCapacity" 
                        placeholder="e.g. 600 kg/hour (Pellet Output), 2.5 kg/batch, etc." 
                        class="corp-input font-medium text-emerald-800 text-xs w-full"
                      />
                    </div>
                  </div>
                  ${equipmentModels.length > 1 ? `
                    <div class="flex items-center justify-end md:self-center">
                      <button 
                        type="button" 
                        onclick="window.TRSA.removeEquipmentModel(${idx})" 
                        title="Remove this equipment model" 
                        class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Section I: Revision History Matrix -->
      <div class="space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse"></span>
              <label class="text-xs font-bold text-[#0F172A] uppercase tracking-wider">I. Revision History Matrix</label>
              <span class="text-[10px] bg-sky-50 text-[#0284C7] border border-sky-200 px-2.5 py-0.5 rounded-full font-bold">
                Auto-User & Auto-Date on Save
              </span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              <strong class="text-slate-700">Originated By</strong> is automatically populated with the active authenticated user (<span class="font-bold text-[#0284C7]">${store.currentUser.name}</span>), and <strong class="text-slate-700">Date</strong> is stamped with the current date upon saving revisions.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.TRSA.addRevisionRow()" class="btn-capiclean-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all shadow-xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              + Add Revision Row
            </button>
          </div>
        </div>

        <div class="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#0F2942] text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th class="py-3 px-3.5 w-24">Revision</th>
                <th class="py-3 px-3.5">Description of Changes</th>
                <th class="py-3 px-3.5 w-72">Originated By (User Login)</th>
                <th class="py-3 px-3.5 w-56">Date (Auto on Save)</th>
                <th class="py-3 px-3.5 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody id="revision-rows" class="divide-y divide-slate-200">
              ${proj.documentInfo.revisionHistory.map((rev, i) => {
                const isUserMatch = rev.originatedBy === store.currentUser.name;
                return `
                <tr class="hover:bg-sky-50/30 transition-colors">
                  <td class="p-2.5 align-top">
                    <input 
                      type="text" 
                      value="${rev.revision}" 
                      data-rev-idx="${i}" 
                      data-field="revision" 
                      class="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#0369A1] bg-slate-50 focus:bg-white focus:border-[#0284C7]" 
                    />
                  </td>
                  <td class="p-2.5 align-top">
                    <input 
                      type="text" 
                      value="${rev.description}" 
                      data-rev-idx="${i}" 
                      data-field="description" 
                      placeholder="e.g. Specification update, scope amendment, trial notes..."
                      class="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:border-[#0284C7]" 
                    />
                  </td>
                  <td class="p-2.5 align-top">
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value="${rev.originatedBy || store.currentUser.name}" 
                          data-rev-idx="${i}" 
                          data-field="originatedBy" 
                          class="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0284C7]" 
                        />
                        <button 
                          type="button" 
                          onclick="window.TRSA.stampRevisionRow(${i})" 
                          title="Synchronize with logged-in user (${store.currentUser.name})" 
                          class="p-2 bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shadow-xs"
                        >
                          Auto Set
                        </button>
                      </div>
                      <div class="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <span class="w-1.5 h-1.5 rounded-full ${isUserMatch ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                        <span>${isUserMatch ? 'Current Logged-in User' : 'Author: ' + rev.originatedBy}</span>
                      </div>
                    </div>
                  </td>
                  <td class="p-2.5 align-top">
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="date" 
                          value="${rev.date}" 
                          data-rev-idx="${i}" 
                          data-field="date" 
                          class="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0284C7]" 
                        />
                        <button 
                          type="button" 
                          onclick="window.TRSA.stampRevisionRow(${i})" 
                          title="Update date to today (${new Date().toISOString().split('T')[0]})" 
                          class="p-2 bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shadow-xs"
                        >
                          Today
                        </button>
                      </div>
                      <div class="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Auto-updated on save</span>
                      </div>
                    </div>
                  </td>
                  <td class="p-2.5 align-top text-right space-x-1 whitespace-nowrap">
                    <button 
                      type="button" 
                      onclick="window.TRSA.stampRevisionRow(${i})" 
                      title="Save revision row with current timestamp & user identity" 
                      class="text-xs px-2.5 py-1.5 bg-sky-50 text-[#0284C7] hover:bg-sky-100 rounded-lg font-bold border border-sky-200 transition-all shadow-xs"
                    >
                      Save
                    </button>
                    ${i > 0 ? `
                      <button 
                        type="button" 
                        onclick="window.TRSA.removeRevisionRow(${i})" 
                        title="Delete revision row" 
                        class="text-xs px-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-bold transition-all"
                      >
                        &times;
                      </button>
                    ` : ''}
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section II: Project Description & Key Dates -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-4">
        <div>
          <label class="block text-xs font-bold text-[#0B2447] mb-1">II. Project Purpose & Scope Overview</label>
          <textarea id="project-desc" rows="3" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none">${proj.projectOverview.description}</textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Target Line Start-up</label>
            <input type="text" id="date-startup" value="${proj.projectOverview.keyDates.lineStartUp}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-bold text-[#0284C7]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Final Quotation & Signed Agreement</label>
            <input type="text" id="date-quotation" value="${proj.projectOverview.keyDates.finalQuotationDrawings}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-medium" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Order Placement Target</label>
            <input type="text" id="date-po" value="${proj.projectOverview.keyDates.orderPlacement}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-medium" />
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 2: Key Contacts, Site Description & Invoicing
function renderStep2(proj) {
  const isAdminUser = store.isAdmin();
  const currentPlant = proj.documentInfo.plantLocation || 'Semarang Plant';
  const plantData = getPlantDatabase(currentPlant);

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#0B2447]">Key Contacts & Plant Location</h2>
          <p class="text-xs text-[#5A7184]">Personnel responsible for project correspondence and invoice addresses.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Plant Location:</span>
          <select 
            id="step2-plant-selector" 
            onchange="window.TRSA.onPlantLocationChanged(this.value)"
            class="corp-select font-bold text-xs py-1.5 px-3 bg-[#E0F2FE] text-[#0284C7] border-sky-300 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="Cikokol Plant" ${currentPlant === 'Cikokol Plant' ? 'selected' : ''}>1402 - Cikokol Plant</option>
            <option value="Semarang Plant" ${currentPlant === 'Semarang Plant' ? 'selected' : ''}>1403 - Semarang Plant</option>
            <option value="Cikupa Plant" ${currentPlant === 'Cikupa Plant' ? 'selected' : ''}>1405 - Cikupa Plant</option>
            <option value="Agro Plant" ${currentPlant === 'Agro Plant' ? 'selected' : ''}>1411 - Agro Plant</option>
          </select>
        </div>
      </div>

      <!-- Contacts Table -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">III. Key Contacts Matrix (PT Indofood Fortuna Makmur)</label>
          <button type="button" onclick="window.TRSA.addContactRow()" class="text-xs font-bold text-[#0284C7] hover:text-[#0369A1]">+ Add Contact</button>
        </div>

        <div class="space-y-3" id="contact-list-container">
          ${proj.keyContacts.map((c, i) => `
            <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE] flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                <div>
                  <input type="text" placeholder="Name" value="${c.name}" data-contact-idx="${i}" data-field="name" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs font-bold text-[#0B2447] bg-white" />
                </div>
                <div>
                  <input type="text" placeholder="Responsibility / Role" value="${c.role}" data-contact-idx="${i}" data-field="role" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs bg-white text-[#5A7184]" />
                </div>
                <div>
                  <input type="email" placeholder="Email" value="${c.email}" data-contact-idx="${i}" data-field="email" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs font-mono text-[#0284C7] bg-white" />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.TRSA.removeContactRow(${i})" class="text-red-500 font-bold px-2.5 py-1 text-xs hover:bg-red-50 rounded-lg">Remove</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Site Description & Invoicing (Auto-populated from Master Plant Database) -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse"></span>
              <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">IV. Site Location & Invoicing Address</h3>
              <span class="text-[10px] bg-sky-50 text-[#0284C7] border border-sky-200 px-2 py-0.5 rounded-full font-bold">
                Auto from Plant Database
              </span>
            </div>
            <p class="text-[11px] text-[#5A7184] mt-0.5">
              Invoicing recipient and delivery destination are automatically populated from the master plant database for the selected plant (<strong class="text-[#0284C7]">${currentPlant}</strong>).
            </p>
          </div>
          <button 
            type="button" 
            onclick="window.TRSA.syncSiteLocationFromDatabase()" 
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] rounded-xl transition-all shadow-xs"
            title="Re-synchronize address details and delivery destination from plant database"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Re-sync Database
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-[#0B2447]">Company Invoicing Name</label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-filled
              </span>
            </div>
            <input 
              type="text" 
              id="site-recipient" 
              value="${proj.siteDescription.invoiceRecipient || plantData.invoiceRecipient}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-[#0284C7]" 
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-[#0B2447]">Delivery Port (Incoterm)</label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-filled
              </span>
            </div>
            <input 
              type="text" 
              id="site-port" 
              value="${proj.siteDescription.deliveryPort || plantData.deliveryPort}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl font-bold text-[#0284C7] focus:bg-white focus:border-[#0284C7]" 
            />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-[#0B2447]">Company Address / Plant Location</label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Database Synced
              </span>
            </div>
            <input 
              type="text" 
              id="site-address" 
              value="${proj.siteDescription.address || plantData.address}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#0284C7]" 
            />
          </div>

          <!-- Custom Clearance & Shipping Clause: RBAC Admin Protection -->
          <div class="md:col-span-2 p-4 rounded-2xl border ${isAdminUser ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50'}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 ${isAdminUser ? 'text-amber-600' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <label class="text-xs font-bold text-[#0B2447]">
                  Custom Clearance & Shipping Clause
                </label>
              </div>
              <div>
                ${isAdminUser ? `
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Admin Access (Editable)
                  </span>
                ` : `
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300" title="Restricted: Only Admin / Project & Engineering Manager can edit this clause">
                    <svg class="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
                    Locked: Admin Only
                  </span>
                `}
              </div>
            </div>

            <textarea 
              id="site-customs" 
              rows="3" 
              ${isAdminUser ? '' : 'readonly'}
              placeholder="Custom clearance terms..."
              class="w-full text-xs p-3 rounded-xl transition-all ${
                isAdminUser 
                  ? 'bg-white border border-amber-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20' 
                  : 'bg-slate-100/80 border border-slate-200 text-slate-600 cursor-not-allowed select-text'
              }"
            >${proj.siteDescription.customClearanceNote || plantData.customClearanceNote}</textarea>

            <div class="mt-2 flex items-center justify-between text-[11px]">
              <span class="${isAdminUser ? 'text-amber-700' : 'text-slate-500'}">
                ${isAdminUser 
                  ? `Logged in as <strong>${store.currentUser.name}</strong> (${store.currentUser.role}) — Authorized to modify legal customs clause.`
                  : `Read-only for regular users. Contact System Administrator (Project & Engineering Manager: <strong>Moh Yusuf Alfian</strong>) to request modifications to customs clearance terms.`
                }
              </span>
              ${!isAdminUser ? `
                <button 
                  type="button" 
                  onclick="window.TRSA.switchUser('Moh Yusuf Alfian')" 
                  class="text-[10px] font-bold text-[#0284C7] hover:underline"
                  title="Switch user session to Admin for editing permissions"
                >
                  Switch to Admin &rarr;
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 3: Product Specifications Matrix & Process Parameters
// Interactive Visual Engineering Canvas with Product Shape Diagrams, Specifications Matrix & Benchmarks
function renderStep3(proj) {
  if (typeof store.selectedProductIdx !== 'number' || store.selectedProductIdx >= proj.productSpecifications.length) {
    store.selectedProductIdx = 0;
  }
  const selIdx = store.selectedProductIdx;
  const activeProd = proj.productSpecifications[selIdx] || proj.productSpecifications[0];

  return `
    <div class="space-y-6">
      <!-- Top Header & Action Bar -->
      <div class="dropx-card p-6 bg-white border border-[#E0ECF6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse"></span>
            <span class="text-[10px] font-mono px-2.5 py-0.5 bg-[#E0F2FE] text-[#0284C7] rounded-full font-bold uppercase">
              Step 3 &bull; Section VII
            </span>
            <span class="text-xs text-[#5A7184] font-medium">Interactive Technical Specification Canvas</span>
          </div>
          <h2 class="text-lg font-bold text-[#0B2447] mt-1">Product Specifications & Process Parameters Canvas</h2>
          <p class="text-xs text-[#5A7184]">Interactive visual diagram, 2D/3D geometry matrix, physical benchmarks, and continuous process parameters.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.TRSA.addProductRow()" class="btn-capiclean-primary text-xs font-bold px-3.5 py-2 transition-all flex items-center gap-1.5 shadow-xs">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            + Add Product Variant
          </button>
        </div>
      </div>

      <!-- MAIN INTERACTIVE PRODUCT SPECIFICATION CANVAS -->
      <div class="dropx-card p-6 bg-white border border-[#E0ECF6] shadow-sm space-y-6">
        <!-- Canvas Navigation Selector / Product Tabs -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-[11px] font-bold text-[#0B2447] uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              Select Product Shape Canvas:
            </label>
            <span class="text-[11px] text-[#5A7184] font-medium">${proj.productSpecifications.length} registered pellet variants</span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${proj.productSpecifications.map((p, idx) => `
              <button 
                type="button" 
                onclick="window.TRSA.selectProductCanvas(${idx})"
                class="p-3 rounded-2xl border text-left transition-all relative ${
                  selIdx === idx 
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-md shadow-sky-500/20' 
                    : 'bg-[#F8FBFE] hover:bg-sky-50 text-[#0B2447] border-[#E0ECF6]'
                }"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    selIdx === idx ? 'bg-white/20 text-white' : 'bg-[#E0F2FE] text-[#0284C7]'
                  }">Shape #${idx + 1}</span>
                  ${proj.productSpecifications.length > 1 ? `
                    <span 
                      onclick="event.stopPropagation(); window.TRSA.removeProductRow(${idx})" 
                      title="Delete this shape"
                      class="text-xs cursor-pointer hover:scale-110 px-1 font-bold ${
                        selIdx === idx ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-600'
                      }"
                    >&times;</span>
                  ` : ''}
                </div>
                <div class="text-xs font-bold truncate">${p.shape}</div>
                <div class="text-[10px] font-mono mt-0.5 opacity-80 truncate">${p.capacityOutput || '600 Kg/h'}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- VISUAL CANVAS VIEWPORT (Image, SVG Diagram, Dimension Overlay & Live Preview) -->
        <div class="border-2 border-[#BAE6FD] bg-gradient-to-br from-slate-900 via-[#0B2447] to-[#0284C7] rounded-3xl p-6 text-white relative overflow-hidden shadow-inner">
          <div class="absolute -top-16 -right-16 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <!-- Left: Visual Shape Geometry Canvas Graphic -->
            <div class="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center">
              <div class="w-full flex items-center justify-between text-[10px] uppercase font-bold text-sky-200 mb-2">
                <span>3D Geometry Rendering</span>
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-mono">Live SVG</span>
              </div>
              
              <!-- Dynamic Shape Visual Representation -->
              <div class="w-full h-44 flex items-center justify-center relative my-2">
                ${
                  activeProd.shape.toLowerCase().includes('chicken') ? `
                    <!-- 3D Chicken Leg Shape Graphic -->
                    <svg class="w-40 h-40 filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="chickGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#FCD34D"/>
                          <stop offset="50%" stop-color="#F59E0B"/>
                          <stop offset="100%" stop-color="#D97706"/>
                        </linearGradient>
                      </defs>
                      <!-- Chicken drumstick bulbous body -->
                      <path d="M45 40 C30 55, 30 90, 55 105 C75 118, 100 100, 110 85 C120 70, 110 40, 85 30 C65 20, 55 30, 45 40 Z" fill="url(#chickGrad)" stroke="#B45309" stroke-width="2.5"/>
                      <!-- Perforation holes -->
                      <circle cx="65" cy="55" r="3" fill="#92400E" opacity="0.6"/>
                      <circle cx="85" cy="55" r="3" fill="#92400E" opacity="0.6"/>
                      <circle cx="55" cy="75" r="3.5" fill="#92400E" opacity="0.6"/>
                      <circle cx="75" cy="75" r="3" fill="#92400E" opacity="0.6"/>
                      <circle cx="95" cy="75" r="3" fill="#92400E" opacity="0.6"/>
                      <circle cx="70" cy="92" r="3" fill="#92400E" opacity="0.6"/>
                      <!-- Bone handle / stem -->
                      <path d="M105 90 L135 120 C138 123, 142 120, 145 117 C148 114, 145 110, 142 107 L112 77 Z" fill="#FEF3C7" stroke="#D97706" stroke-width="2"/>
                      <circle cx="140" cy="116" r="6" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
                      <circle cx="132" cy="124" r="5" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
                    </svg>
                  ` : activeProd.shape.toLowerCase().includes('golgappa') ? `
                    <!-- 3D Hollow Golgappa Sphere -->
                    <svg class="w-40 h-40 filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
                          <stop offset="0%" stop-color="#FEF08A"/>
                          <stop offset="45%" stop-color="#F59E0B"/>
                          <stop offset="100%" stop-color="#B45309"/>
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="55" fill="url(#sphereGrad)" stroke="#92400E" stroke-width="2.5"/>
                      <ellipse cx="65" cy="65" rx="18" ry="10" fill="#FEF9C3" opacity="0.5" transform="rotate(-25 65 65)"/>
                      <ellipse cx="80" cy="80" rx="42" ry="20" fill="none" stroke="#78350F" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>
                    </svg>
                  ` : activeProd.shape.toLowerCase().includes('star') ? `
                    <!-- 3D Star / Flower Shape -->
                    <svg class="w-40 h-40 filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#FDE68A"/>
                          <stop offset="50%" stop-color="#F59E0B"/>
                          <stop offset="100%" stop-color="#B45309"/>
                        </linearGradient>
                      </defs>
                      <path d="M80 20 L94 58 L135 60 L103 85 L114 125 L80 102 L46 125 L57 85 L25 60 L66 58 Z" fill="url(#starGrad)" stroke="#92400E" stroke-width="2.5"/>
                      <circle cx="80" cy="78" r="14" fill="#FEF3C7" stroke="#B45309" stroke-width="1.5"/>
                    </svg>
                  ` : `
                    <!-- 2D Pierced Round Mesh Chip -->
                    <svg class="w-40 h-40 filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="meshGrad" cx="40%" cy="40%" r="60%">
                          <stop offset="0%" stop-color="#FEF08A"/>
                          <stop offset="60%" stop-color="#F59E0B"/>
                          <stop offset="100%" stop-color="#B45309"/>
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="54" fill="url(#meshGrad)" stroke="#78350F" stroke-width="2.5"/>
                      <!-- Perforations grid -->
                      <circle cx="60" cy="60" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="80" cy="60" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="100" cy="60" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="60" cy="80" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="80" cy="80" r="5" fill="#78350F" opacity="0.7"/>
                      <circle cx="100" cy="80" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="60" cy="100" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="80" cy="100" r="4" fill="#78350F" opacity="0.6"/>
                      <circle cx="100" cy="100" r="4" fill="#78350F" opacity="0.6"/>
                    </svg>
                  `
                }
              </div>

              <div class="text-xs font-bold text-white tracking-wide mt-1">${activeProd.shape}</div>
              <div class="text-[10px] text-sky-200 mt-0.5 max-w-xs truncate">${activeProd.description}</div>
            </div>

            <!-- Right: Dynamic Specification Metrics and Parameter Indicators -->
            <div class="lg:col-span-7 space-y-4">
              <div>
                <span class="text-[10px] uppercase font-mono tracking-widest text-sky-300">Active Canvas Parameters</span>
                <div class="flex items-center gap-3 mt-1">
                  <input 
                    type="text" 
                    value="${activeProd.shape}" 
                    data-prod-idx="${selIdx}" 
                    data-field="shape" 
                    class="text-base font-extrabold text-white bg-white/10 border border-white/25 rounded-xl px-3 py-1.5 focus:bg-white/20 focus:outline-none w-full" 
                  />
                </div>
              </div>

              <!-- Critical Quality Targets (KPI Gauge Bar) -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                  <div class="text-[10px] text-sky-200 font-bold uppercase">Target Capacity</div>
                  <div class="text-sm font-black text-white font-mono mt-0.5">${activeProd.capacityOutput || '600 Kg/h'}</div>
                  <div class="text-[9px] text-emerald-300 font-medium">Output pellet</div>
                </div>
                <div class="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                  <div class="text-[10px] text-sky-200 font-bold uppercase">Moisture Out</div>
                  <div class="text-sm font-black text-cyan-200 font-mono mt-0.5">${activeProd.moistureOutput}</div>
                  <div class="text-[9px] text-cyan-300 font-medium">L-C-R &le; 0.3% gap</div>
                </div>
                <div class="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                  <div class="text-[10px] text-amber-200 font-bold uppercase">Oil Uptake</div>
                  <div class="text-sm font-black text-amber-300 font-mono mt-0.5">${activeProd.oilContentOutput}</div>
                  <div class="text-[9px] text-amber-200 font-medium">De-oiled spec</div>
                </div>
                <div class="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                  <div class="text-[10px] text-sky-200 font-bold uppercase">Bulk Density</div>
                  <div class="text-xs font-black text-white font-mono mt-0.5 truncate">${activeProd.bulkDensityOutput}</div>
                  <div class="text-[9px] text-sky-200 font-medium">Grams / Liter</div>
                </div>
              </div>

              <!-- Geometric Dimensions Overlay -->
              <div class="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 space-y-1.5 text-xs">
                <div class="text-[10px] font-bold text-sky-200 uppercase tracking-wider">Geometric Dimensions & Expansion</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div><span class="text-sky-300 font-semibold">Raw Infeed:</span> <span class="font-mono font-bold">${activeProd.dimensionInput}</span></div>
                  <div><span class="text-sky-300 font-semibold">Fried Output:</span> <span class="font-mono font-bold">${activeProd.dimensionOutput}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- COMPREHENSIVE PRODUCT SPECIFICATION TABLE (Editable Data Matrix) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">
              Product Specification Matrix (Input vs Output Physical Properties)
            </h3>
            <span class="text-[11px] text-[#5A7184] font-medium">Editable cells sync directly to official TRSA tender document</span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#0F2942] text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-3.5 w-12">#</th>
                  <th class="py-3 px-3.5 w-44">Product Shape</th>
                  <th class="py-3 px-3.5">Description & Geometry</th>
                  <th class="py-3 px-3.5 w-32">Input Dim</th>
                  <th class="py-3 px-3.5 w-32">Output Dim</th>
                  <th class="py-3 px-3.5 w-28">Capacity</th>
                  <th class="py-3 px-3.5 w-32">Bulk Density (In&rarr;Out)</th>
                  <th class="py-3 px-3.5 w-28 text-cyan-300">Moisture (Out)</th>
                  <th class="py-3 px-3.5 w-28 text-amber-300">Oil Content (Out)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${proj.productSpecifications.map((p, idx) => `
                  <tr class="transition-colors ${selIdx === idx ? 'bg-sky-50/70 border-l-4 border-l-[#0284C7]' : 'hover:bg-slate-50'}">
                    <td class="p-2.5 text-center font-bold text-slate-500">${idx + 1}</td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.shape}" 
                        data-prod-idx="${idx}" 
                        data-field="shape" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0B2447] bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.description}" 
                        data-prod-idx="${idx}" 
                        data-field="description" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.dimensionInput}" 
                        data-prod-idx="${idx}" 
                        data-field="dimensionInput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.dimensionOutput}" 
                        data-prod-idx="${idx}" 
                        data-field="dimensionOutput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.capacityOutput}" 
                        data-prod-idx="${idx}" 
                        data-field="capacityOutput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0284C7] bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.bulkDensityInput} / ${p.bulkDensityOutput}" 
                        data-prod-idx="${idx}" 
                        data-field="bulkDensity" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.moistureOutput}" 
                        data-prod-idx="${idx}" 
                        data-field="moistureOutput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0284C7] bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5">
                      <input 
                        type="text" 
                        value="${p.oilContentOutput}" 
                        data-prod-idx="${idx}" 
                        data-field="oilContentOutput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#EA580C] bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PROCESS OPERATING PARAMETERS BENCHMARKS CANVAS (Frying & Seasoning Operating Panels) -->
      <div class="dropx-card p-6 bg-white border border-[#E0ECF6] shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-[#E0ECF6]">
          <div>
            <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#EA580C]"></span>
              Process Parameters & Operating Benchmarks
            </h3>
            <p class="text-[11px] text-[#5A7184] mt-0.5">Critical technical thresholds for continuous frying and precision seasoning application.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Frying Process Benchmark Box (Capiclean Amber/Coral Accent) -->
          <div class="p-5 rounded-2xl border border-orange-200 bg-gradient-to-br from-[#FFF7ED] to-white space-y-4 shadow-xs">
            <div class="flex items-center justify-between border-b border-orange-200 pb-2.5">
              <div class="text-xs font-black text-[#EA580C] uppercase tracking-wider flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-[#FF7A00] animate-pulse"></span>
                Frying Operating Parameters
              </div>
              <span class="text-[10px] font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                14 Fryer Items
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Temperature Range</label>
                <input type="text" id="proc-fry-temp" value="${proj.processParameters.frying.temperatureRange}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono font-bold text-[#EA580C] focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Dwell Time</label>
                <input type="text" id="proc-fry-dwell" value="${proj.processParameters.frying.dwellTime}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono font-bold text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Feeder Rate</label>
                <input type="text" id="proc-fry-feeder" value="${proj.processParameters.frying.feederRate || '1.5 – 2.5 kg/batch'}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Oil Capacity in Fryer</label>
                <input type="text" id="proc-fry-oil" value="${proj.processParameters.frying.oilCapacityInFryer}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Spinner Rotation Time</label>
                <input type="text" id="proc-fry-spinner" value="${proj.processParameters.frying.spinnerRotationTime}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Hopper Gate Opening</label>
                <input type="text" id="proc-fry-hopper" value="${proj.processParameters.frying.hopperGateOpening || 'Min 8.5 cm – Max 12 cm'}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Seasoning Process Benchmark Box (Capiclean Sky Blue Accent) -->
          <div class="p-5 rounded-2xl border border-sky-200 bg-gradient-to-br from-[#F0F9FF] to-white space-y-4 shadow-xs">
            <div class="flex items-center justify-between border-b border-sky-200 pb-2.5">
              <div class="text-xs font-black text-[#0369A1] uppercase tracking-wider flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse"></span>
                Seasoning Operating Parameters
              </div>
              <span class="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                7 Seasoning Items
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Required Seasoning</label>
                <input type="text" id="proc-seas-type" value="${proj.processParameters.seasoning.requiredSeasoning}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-[#0369A1] focus:border-[#0284C7] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Application Rate (%w/w)</label>
                <input type="text" id="proc-seas-rate" value="${proj.processParameters.seasoning.seasoningApplicationRate}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-slate-800 focus:border-[#0284C7] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Salt Content (%SA Base Excl.)</label>
                <input type="text" id="proc-seas-salt" value="${proj.processParameters.seasoning.saltContentBaseExcluded}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#0284C7] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Seasoning Capacity</label>
                <input type="text" id="proc-seas-cap" value="${proj.processParameters.seasoning.seasoningCapacity}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-[#0284C7] focus:border-[#0284C7] focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Powder Type Specification</label>
                <input type="text" id="proc-seas-spec" value="${proj.processParameters.seasoning.seasoningType || 'Dry seasoning powder'}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-medium text-slate-800 focus:border-[#0284C7] focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 4: Project Scope of Supply (Fryer & Seasoning)
function renderStep4(proj) {
  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4">
        <h2 class="text-base font-bold text-[#0B2447]">Project Scope of Supply (Fryer & Seasoning)</h2>
        <p class="text-xs text-[#5A7184]">Comprehensive equipment breakdown conforming to PT Indofood Fortuna Makmur standards.</p>
      </div>

      <div class="space-y-6">
        <!-- A. Fryer System -->
        <div>
          <div class="flex items-center justify-between mb-3 bg-[#FF7A00] text-white px-4 py-2.5 rounded-2xl shadow-md shadow-orange-500/20">
            <div class="font-black text-xs uppercase tracking-wide">A) Fryer System Scope (${proj.scopeOfSupply.fryer.length} Units)</div>
            <button type="button" onclick="window.TRSA.addScopeItem('fryer')" class="text-xs bg-white text-[#EA580C] font-bold px-3 py-1 rounded-xl hover:bg-orange-50 transition-all">+ Add Module</button>
          </div>

          <div class="space-y-3" id="fryer-scope-container">
            ${proj.scopeOfSupply.fryer.map((item, i) => `
              <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-[#FF7A00] text-white flex items-center justify-center text-[10px] font-bold">${item.itemNumber || (i + 1)}</span>
                    <input type="text" value="${item.title}" data-scope-type="fryer" data-scope-idx="${i}" data-field="title" class="font-bold text-xs text-[#0B2447] bg-transparent border-b border-[#BAE6FD] w-80 focus:outline-none" />
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="text" value="${item.qty}" data-scope-type="fryer" data-scope-idx="${i}" data-field="qty" class="text-xs border border-[#E0ECF6] rounded-xl px-2.5 py-1 w-24 text-center font-bold text-[#EA580C] bg-white" />
                    <button type="button" onclick="window.TRSA.removeScopeItem('fryer', ${i})" class="text-red-500 text-xs font-bold px-1.5 py-0.5 hover:bg-red-50 rounded-lg">&times;</button>
                  </div>
                </div>
                <div class="text-[11px] text-[#5A7184] pl-7">
                  <textarea rows="2" data-scope-type="fryer" data-scope-idx="${i}" data-field="specs" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white text-xs">${item.specs.join('\n')}</textarea>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- B. Seasoning System -->
        <div>
          <div class="flex items-center justify-between mb-3 bg-[#0284C7] text-white px-4 py-2.5 rounded-2xl shadow-md shadow-sky-500/20">
            <div class="font-black text-xs uppercase tracking-wide">B) Seasoning System Scope (${proj.scopeOfSupply.seasoning.length} Units)</div>
            <button type="button" onclick="window.TRSA.addScopeItem('seasoning')" class="text-xs bg-white text-[#0369A1] font-bold px-3 py-1 rounded-xl hover:bg-sky-50 transition-all">+ Add Module</button>
          </div>

          <div class="space-y-3" id="seasoning-scope-container">
            ${proj.scopeOfSupply.seasoning.map((item, i) => `
              <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-[10px] font-bold">${item.itemNumber || (i + 1)}</span>
                    <input type="text" value="${item.title}" data-scope-type="seasoning" data-scope-idx="${i}" data-field="title" class="font-bold text-xs text-[#0B2447] bg-transparent border-b border-[#BAE6FD] w-80 focus:outline-none" />
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="text" value="${item.qty}" data-scope-type="seasoning" data-scope-idx="${i}" data-field="qty" class="text-xs border border-[#E0ECF6] rounded-xl px-2.5 py-1 w-24 text-center font-bold text-[#0284C7] bg-white" />
                    <button type="button" onclick="window.TRSA.removeScopeItem('seasoning', ${i})" class="text-red-500 text-xs font-bold px-1.5 py-0.5 hover:bg-red-50 rounded-lg">&times;</button>
                  </div>
                </div>
                <div class="text-[11px] text-[#5A7184] pl-7">
                  <textarea rows="2" data-scope-type="seasoning" data-scope-idx="${i}" data-field="specs" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white text-xs">${item.specs.join('\n')}</textarea>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 5: Hygienic Standards & Target Performance Tests
function renderStep5(proj) {
  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4">
        <h2 class="text-base font-bold text-[#0B2447]">Hygienic Design & Performance Acceptance Protocol</h2>
        <p class="text-xs text-[#5A7184]">SS304 food contact criteria, 7-hour continuous run, and sampling methodology.</p>
      </div>

      <!-- Hygiene Requirements -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">Hygienic Construction Standards</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-bold text-[#5A7184] mb-1">Food Contact Surface Material</label>
            <input type="text" id="hygiene-material" value="${proj.hygieneAndQuality.foodContactMaterial}" class="w-full text-xs p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F4F8FC] font-medium" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-[#5A7184] mb-1">Commissioning Trial Time per Product</label>
            <input type="text" id="comm-duration" value="${proj.performanceAcceptance.commissioningDuration}" class="w-full text-xs p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F4F8FC] font-bold text-[#0284C7]" />
          </div>
        </div>
      </div>

      <!-- Performance Test Matrix -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">Target Performance Test Protocols</h3>
        <div class="space-y-3">
          ${proj.performanceAcceptance.tests.map((test, i) => `
            <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
              <div class="font-bold text-xs text-[#0B2447] mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#0284C7]"></span>
                ${test.step}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-[10px] text-[#5A7184] font-bold uppercase">Observation & Process Action</span>
                  <p class="text-[#0B2447] mt-0.5">${test.observation}</p>
                </div>
                <div>
                  <span class="text-[10px] text-[#0284C7] font-bold uppercase">Acceptance Benchmark / Note</span>
                  <p class="text-[#0369A1] font-bold mt-0.5">${test.target}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mt-4 p-4 rounded-2xl border border-red-200 bg-red-50/70 text-xs text-red-950">
          <div class="font-bold mb-1 text-red-800">Consequences If Target is Not Reached (Clause XI)</div>
          <p class="leading-relaxed">${proj.performanceAcceptance.failureConsequence}</p>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 6: Commercial Terms, Tax Laws & Required Documents
function renderStep6(proj) {
  const currentOption = proj.commercialTerms.selectedPaymentOption;

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4">
        <h2 class="text-base font-bold text-[#0B2447]">Commercial Terms, Tax Provisions & Documentation</h2>
        <p class="text-xs text-[#5A7184]">Payment structure, Indonesian withholding tax compliance, and 14 required seller documents.</p>
      </div>

      <!-- Vendor Origin Mode Quick Toggle in Step 6 -->
      <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-500' :
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-500' :
                'bg-[#0284C7]'
              }"></span>
              <span class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">Vendor Procurement Origin</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">Vendor sourcing origin dictates applicable taxation frameworks (PPh 26 withholding vs PPh 23 local), Incoterms (CIF/CIP vs DAP/Franco), and contract currency.</p>
          </div>
          <div class="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-xs">
            ${['Foreign', 'Local', 'Mixed'].map(origin => `
              <button 
                type="button" 
                onclick="window.TRSA.setVendorOrigin('${origin}')" 
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  (proj.documentInfo.vendorOrigin || 'Foreign') === origin 
                    ? 'bg-[#0284C7] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }"
              >
                ${origin}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Payment Option Radio Selector -->
      <div>
        <label class="block text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-3">XIII. Term of Payment (Seller to Select One)</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Option 1 -->
          <div class="p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            currentOption === 'Option 1' ? 'border-[#0284C7] bg-[#E0F2FE]/40 shadow-sm' : 'border-[#E0ECF6] bg-white hover:border-[#BAE6FD]'
          }" onclick="window.TRSA.setPaymentOption('Option 1')">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-[#0B2447]">Option 1: Standard L/C & T/T</span>
              <input type="radio" name="pay-option" value="Option 1" ${currentOption === 'Option 1' ? 'checked' : ''} class="w-4 h-4 text-[#0284C7]" />
            </div>
            <ul class="text-xs space-y-1.5 text-[#5A7184]">
              <li class="flex items-center justify-between"><span>L/C against Shipping Document</span><span class="font-bold font-mono text-[#0B2447]">85%</span></li>
              <li class="flex items-center justify-between"><span>T/T after machine running (&le; 60 days)</span><span class="font-bold font-mono text-[#0B2447]">10%</span></li>
              <li class="flex items-center justify-between"><span>T/T retention 3 months (&le; 120 days)</span><span class="font-bold font-mono text-[#0B2447]">5%</span></li>
            </ul>
          </div>

          <!-- Option 2 -->
          <div class="p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            currentOption === 'Option 2' ? 'border-[#0284C7] bg-[#E0F2FE]/40 shadow-sm' : 'border-[#E0ECF6] bg-white hover:border-[#BAE6FD]'
          }" onclick="window.TRSA.setPaymentOption('Option 2')">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-[#0B2447]">Option 2: Down Payment with Bank Guarantee</span>
              <input type="radio" name="pay-option" value="Option 2" ${currentOption === 'Option 2' ? 'checked' : ''} class="w-4 h-4 text-[#0284C7]" />
            </div>
            <ul class="text-xs space-y-1.5 text-[#5A7184]">
              <li class="flex items-center justify-between"><span>Down Payment Counter Bank Guarantee</span><span class="font-bold font-mono text-[#0B2447]">30%</span></li>
              <li class="flex items-center justify-between"><span>L/C payable prior to shipping</span><span class="font-bold font-mono text-[#0B2447]">55%</span></li>
              <li class="flex items-center justify-between"><span>After Machine Running</span><span class="font-bold font-mono text-[#0B2447]">10%</span></li>
              <li class="flex items-center justify-between"><span>T/T retention 3 months</span><span class="font-bold font-mono text-[#0B2447]">5%</span></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 14 Required Documents Checklist -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <div class="flex items-center justify-between mb-3">
          <label class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XIV. Required Seller Documentation (14 Mandatory Deliverables)</label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${proj.requiredDocumentation.map((doc, i) => `
            <div class="p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F8FBFE] flex items-start gap-2.5 text-xs">
              <input type="checkbox" id="doc-req-${i}" ${doc.required ? 'checked' : ''} class="mt-0.5 rounded text-[#0284C7] focus:ring-[#0284C7] cursor-pointer" />
              <div>
                <label for="doc-req-${i}" class="font-bold text-[#0B2447] cursor-pointer">${i + 1}. ${doc.title}</label>
                <div class="text-[11px] text-[#5A7184]">${doc.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Official Signatures Block -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-3">Formal Sign-Off Parties</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE] space-y-2">
            <div class="font-bold text-[#0B2447] uppercase">Seller / OEM Supplier</div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Company Name</label>
              <input type="text" id="sign-seller-company" value="${proj.signOff.seller.companyName}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-medium" />
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Quotation Reference No.</label>
              <input type="text" id="sign-seller-quote" value="${proj.signOff.seller.quotationNo}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-mono" />
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Authorized Signatory Name & Title</label>
              <input type="text" id="sign-seller-name" value="${proj.signOff.seller.name} - ${proj.signOff.seller.position}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-medium" />
            </div>
          </div>

          <div class="p-4 border border-sky-200 rounded-2xl bg-[#F0F9FF] space-y-2">
            <div class="font-bold text-[#0369A1] uppercase">Purchaser (PT Indofood Fortuna Makmur)</div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Company Name</label>
              <input type="text" disabled value="${proj.signOff.purchaser.companyName}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-slate-100 font-medium text-slate-600" />
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Authorized Signatory Name</label>
              <input type="text" id="sign-ifm-name" value="${proj.signOff.purchaser.name}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-bold" />
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Position</label>
              <input type="text" id="sign-ifm-pos" value="${proj.signOff.purchaser.position}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-bold text-[#0284C7]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 6. Clean Business Form Studio (Envato Print Design Inspired with Capiclean Refresh)
function renderStudio(proj) {
  ensureGeneralInfo(proj);
  const watermark = store.watermark;

  return `
    <div class="space-y-6 animate-fadeIn pb-16">
      <!-- Studio Action Control Bar (No Print) -->
      <div class="studio-toolbar dropx-card p-4 bg-white border border-[#E0ECF6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print sticky top-16 z-20 shadow-md">
        <div class="flex items-center gap-3">
          <button onclick="window.TRSA.setView('builder', 1)" class="text-xs font-bold px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-[#0B2447] hover:bg-[#F0F9FF] flex items-center gap-1.5 transition-all">
            &larr; Back to Builder
          </button>
          <div>
            <div class="text-xs font-bold text-[#0B2447]">${proj.documentInfo.title}</div>
            <div class="text-[10px] font-mono text-[#0284C7] font-semibold">${proj.documentInfo.docNumber}</div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#5A7184] font-bold">Watermark:</span>
            <select id="watermark-select" onchange="window.TRSA.setWatermark(this.value)" class="text-xs font-bold p-1.5 border border-[#E0ECF6] rounded-xl bg-[#F4F8FC] text-[#0369A1]">
              <option value="OFFICIAL" ${watermark === 'OFFICIAL' ? 'selected' : ''}>OFFICIAL</option>
              <option value="DRAFT" ${watermark === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
              <option value="CONFIDENTIAL" ${watermark === 'CONFIDENTIAL' ? 'selected' : ''}>CONFIDENTIAL</option>
              <option value="NONE" ${watermark === 'NONE' ? 'selected' : ''}>NONE</option>
            </select>
          </div>

          <button onclick="window.print()" class="btn-capiclean-accent font-bold text-xs px-4 py-2 transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print / Save to PDF
          </button>
        </div>
      </div>

      <!-- Printable A4 Document Sheet (Clean Business Form Design with Capiclean Accents) -->
      <div class="print-area">
        <div class="a4-document-container relative">
          <!-- Watermark text -->
          ${watermark !== 'NONE' ? `<div class="document-watermark">${watermark}</div>` : ''}

          <!-- Document Header -->
          <div class="text-center pb-6 border-b-2 border-[#0B2447] mb-6">
            <div class="text-xs font-black tracking-widest text-[#0284C7] uppercase mb-1">Tender Requirements and Specification Agreement</div>
            <h1 class="text-xl font-black text-[#0B2447] uppercase tracking-tight">${proj.documentInfo.title}</h1>
            ${proj.documentInfo.subTitle ? `<div class="text-sm font-semibold text-[#16365C] mt-1">${proj.documentInfo.subTitle}</div>` : ''}
            <div class="mt-2 flex items-center justify-center gap-2 flex-wrap">
              <span class="px-3 py-1 bg-[#F0F9FF] border border-[#BAE6FD] font-mono text-xs font-bold text-[#0369A1] rounded">
                (${proj.documentInfo.docNumber})
              </span>
              <span class="px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider ${
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                'bg-sky-50 text-[#0284C7] border border-sky-200'
              }">
                Origin: ${proj.documentInfo.vendorOrigin || 'Foreign'} Vendor
              </span>
            </div>
          </div>

          <!-- Section General Information -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>General Information</span>
              <span class="text-[9px] font-mono text-[#0284C7] font-bold">Standard Procurement Specification</span>
            </h2>
            <table class="clean-form-table">
              <tbody>
                <tr>
                  <th style="width: 25%;">Plant Location</th>
                  <td style="width: 25%; font-weight: 600;">${getPlantCode(proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation)} - ${proj.generalInfo?.plantLocation || proj.documentInfo.plantLocation || 'Semarang Plant'}</td>
                  <th style="width: 25%;">Country of Origin</th>
                  <td style="width: 25%; font-weight: 700; color: #0284C7;">${parseCountryOfOrigin(proj.generalInfo?.countryOfOrigin || 'Japan').fullDisplay}</td>
                </tr>
                <tr>
                  <th>Equipment Type</th>
                  <td style="font-weight: 600;">${proj.generalInfo?.equipmentType || proj.generalInfo?.machineType || 'Frying System'}</td>
                  <th>Vendor / OEM</th>
                  <td style="font-weight: 700; color: #0B2447;">${proj.generalInfo?.vendorName || 'Heat and Control / Kiremko B.V.'}</td>
                </tr>
                ${(proj.generalInfo?.equipmentModels && proj.generalInfo.equipmentModels.length > 1) 
                  ? proj.generalInfo.equipmentModels.map((em, idx) => `
                    <tr>
                      <th>Model / Line Tag (#${idx + 1})</th>
                      <td class="font-mono text-slate-700">${em.modelNumber || 'N/A'}</td>
                      <th>Design Capacity (#${idx + 1})</th>
                      <td style="font-weight: 700; color: #059669;">${em.designCapacity || 'N/A'}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <th>Model / Line Tag</th>
                      <td class="font-mono text-slate-700">${proj.generalInfo?.modelNumber || 'SPF-600 Continuous'}</td>
                      <th>Design Capacity</th>
                      <td style="font-weight: 700; color: #059669;">${proj.generalInfo?.designCapacity || '600 kg/hour (Pellet Output)'}</td>
                    </tr>
                  `
                }
                <tr>
                  <th>Vendor Sourcing Origin</th>
                  <td>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      'bg-sky-50 text-[#0284C7] border border-sky-200'
                    }">
                      ${proj.documentInfo.vendorOrigin || 'Foreign'}
                    </span>
                  </td>
                  <th>Target Commissioning</th>
                  <td>${proj.generalInfo?.targetCommissioning || proj.projectOverview.keyDates.lineStartUp}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section I: Revision History -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">I. Revision History</h2>
            <table class="clean-form-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Revision</th>
                  <th style="width: 40%;">Description</th>
                  <th style="width: 25%;">Originated by</th>
                  <th style="width: 20%;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${proj.documentInfo.revisionHistory.map(r => `
                  <tr>
                    <td class="font-mono font-bold text-center text-[#0369A1]">${r.revision}</td>
                    <td>${r.description}</td>
                    <td>${r.originatedBy}</td>
                    <td>${r.date}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Forensic Audit Stamp & Verification Bar -->
            <div class="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-1.5 font-mono">
              <span class="flex items-center gap-1.5 text-slate-700">
                <svg class="w-3.5 h-3.5 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Audit Trail ID: <strong class="text-slate-900">${proj.id}</strong></span>
                <span class="text-slate-400">&bull;</span>
                <span class="text-emerald-700 font-bold">100% Traceable</span>
              </span>
              <span class="text-[9px] text-slate-500">
                Logged Author: <strong>${store.currentUser.name}</strong> (${store.currentUser.role})
              </span>
            </div>
          </div>

          <!-- Section II: Project Description -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">II. Project Description</h2>
            <p class="text-xs text-slate-700 leading-relaxed mb-4">
              ${proj.projectOverview.description}
            </p>
          </div>

          <!-- Section III: Key Dates -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">III. Key Dates</h2>
            <ul class="text-xs space-y-1.5 text-slate-700 list-disc pl-5">
              <li>Line start-up is targeted for the <strong class="text-[#0284C7]">${proj.projectOverview.keyDates.lineStartUp}</strong></li>
              <li>The final quotation, drawings, and signed agreement are expected by <strong>${proj.projectOverview.keyDates.finalQuotationDrawings}</strong></li>
              <li>Order placement is expected in <strong>${proj.projectOverview.keyDates.orderPlacement}</strong></li>
            </ul>
          </div>

          <!-- Section IV: Key Contacts -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">IV. Key Contacts</h2>
            <p class="text-[11px] text-[#5A7184] mb-2">All correspondence pertaining to this project with PT. Indofood Fortuna Makmur shall be directed through the following individuals:</p>
            <table class="clean-form-table table-header-orange">
              <thead>
                <tr>
                  <th style="width: 30%;">Name / Responsibility</th>
                  <th style="width: 45%;">Company / Address</th>
                  <th style="width: 25%;">Email</th>
                </tr>
              </thead>
              <tbody>
                ${proj.keyContacts.map(c => `
                  <tr>
                    <td class="font-bold text-[#0B2447]">${c.name}<div class="text-[11px] font-normal text-[#5A7184]">${c.role}</div></td>
                    <td class="text-[11px] text-slate-600">${c.companyAddress}</td>
                    <td class="font-mono text-[11px] text-[#0284C7] font-semibold">${c.email}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Section V: Site Description -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">V. Site Description</h2>
            <div class="text-xs text-slate-700 space-y-1 bg-[#F4F8FC] p-3 border border-[#D6E6F2] rounded">
              <div class="font-bold text-[#0B2447]">Company address / Site Location (All invoices should be issued to) :</div>
              <div class="font-bold">${proj.siteDescription.invoiceRecipient}</div>
              <div>${proj.siteDescription.address}</div>
              <div class="pt-1 text-[11px]">
                <strong class="text-[#0284C7]">Attention to Purchasing Department:</strong>
                ${proj.siteDescription.purchasingAttn.map(a => `${a.name} (${a.email})`).join('; ')}
              </div>
            </div>
          </div>

          <!-- Section VI & VII: Confidentiality & Language Requirements -->
          <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-1">VI. Confidentiality</h2>
              <p class="text-[11px] text-slate-600 leading-relaxed text-justify">${proj.projectOverview.confidentialityClause}</p>
            </div>
            <div>
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-1">VII. Language Requirements</h2>
              <p class="text-[11px] text-slate-600 leading-relaxed text-justify">${proj.projectOverview.languageRequirement}</p>
            </div>
          </div>

          <!-- Page Break For Clean Business Form Print Standard -->
          <div class="page-break my-6"></div>

          <!-- Section VIII: Product Specifications -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">VIII. Product Specifications</h2>
            
            ${proj.productSpecifications.map(p => `
              <div class="mb-4">
                <table class="clean-form-table table-header-orange">
                  <thead>
                    <tr>
                      <th colspan="3">${p.shape}</th>
                    </tr>
                    <tr style="background-color: #F0F9FF; color: #0B2447;">
                      <th style="width: 30%; background: #E0F2FE; color: #0369A1; border-color: #BAE6FD;">Parameter</th>
                      <th style="width: 35%; background: #E0F2FE; color: #0369A1; border-color: #BAE6FD;">Input</th>
                      <th style="width: 35%; background: #E0F2FE; color: #0369A1; border-color: #BAE6FD;">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-medium text-slate-600">Desc</td>
                      <td colspan="2">${p.description}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Dimension</td>
                      <td class="font-mono">${p.dimensionInput}</td>
                      <td class="font-mono">${p.dimensionOutput}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Capacity</td>
                      <td colspan="2" class="font-bold text-[#0B2447]">${p.capacityOutput}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Bulk Density</td>
                      <td class="font-mono">${p.bulkDensityInput}</td>
                      <td class="font-mono">${p.bulkDensityOutput}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Moisture Content</td>
                      <td class="font-mono">${p.moistureInput}</td>
                      <td class="font-mono font-bold text-[#0284C7]">${p.moistureOutput}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Oil Content</td>
                      <td class="font-mono">${p.oilContentInput}</td>
                      <td class="font-mono font-bold text-[#FF7A00]">${p.oilContentOutput}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `).join('')}

            <!-- Process Parameters Table -->
            <table class="clean-form-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Process</th>
                  <th style="width: 45%;">Description / Parameter 1</th>
                  <th style="width: 30%;">Description / Parameter 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td colspan="2">Feeder rate : ${proj.processParameters.frying.feederRate}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td>Frying Temperature: <span class="font-bold text-[#EA580C]">${proj.processParameters.frying.temperatureRange}</span></td>
                  <td>Dwell Time : ${proj.processParameters.frying.dwellTime}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td colspan="2">Oil capacity in fryer : ${proj.processParameters.frying.oilCapacityInFryer}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td colspan="2">Spinner rotation time : ${proj.processParameters.frying.spinnerRotationTime}</td>
                </tr>
                <tr class="table-header-orange">
                  <th colspan="3">Seasoning Specification</th>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Required seasoning</td>
                  <td colspan="2">${proj.processParameters.seasoning.requiredSeasoning} (${proj.processParameters.seasoning.seasoningType})</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Salt content (base excluded)</td>
                  <td colspan="2">${proj.processParameters.seasoning.saltContentBaseExcluded}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Seasoning application rate</td>
                  <td colspan="2">${proj.processParameters.seasoning.seasoningApplicationRate}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Seasoning capacity</td>
                  <td colspan="2"><span class="font-bold text-[#0284C7]">${proj.processParameters.seasoning.seasoningCapacity}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section IX: Scope of Supply -->
          <div class="page-break my-6"></div>

          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">IX. Scope of Supply</h2>
            
            <div class="font-bold text-xs text-[#FF7A00] mb-2 uppercase tracking-wide">A) Fryer System</div>
            <div class="space-y-3 mb-6">
              ${proj.scopeOfSupply.fryer.map(item => `
                <div class="text-xs">
                  <div class="font-bold text-[#0B2447]">${item.itemNumber}. ${item.qty} ${item.title}</div>
                  <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-0.5 mt-1">
                    ${item.specs.map(s => `<li>${s}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="font-bold text-xs text-[#0284C7] mb-2 uppercase tracking-wide">B) Seasoning System</div>
            <div class="space-y-3 mb-6">
              ${proj.scopeOfSupply.seasoning.map(item => `
                <div class="text-xs">
                  <div class="font-bold text-[#0B2447]">${item.itemNumber}. ${item.qty} ${item.title}</div>
                  <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-0.5 mt-1">
                    ${item.specs.map(s => `<li>${s}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section X: Target Performance Test -->
          <div class="page-break my-6"></div>

          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">X. Target Performance Test</h2>
            <table class="clean-form-table">
              <thead>
                <tr>
                  <th style="width: 8%;">No</th>
                  <th style="width: 25%;">Process</th>
                  <th style="width: 42%;">Observation</th>
                  <th style="width: 25%;">Note / Target</th>
                </tr>
              </thead>
              <tbody>
                ${proj.performanceAcceptance.tests.map((t, idx) => `
                  <tr>
                    <td class="text-center font-bold text-[#0284C7]">${idx + 1}</td>
                    <td class="font-bold text-[#0B2447]">${t.step}</td>
                    <td class="text-[11px]">${t.observation}</td>
                    <td class="text-[11px] font-bold text-[#0369A1]">${t.target}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="p-3 bg-[#F0F9FF] border border-[#BAE6FD] text-xs rounded mt-3">
              <strong class="text-[#0369A1]">Commissioning Mechanism:</strong> ${proj.performanceAcceptance.commissioningDuration}
            </div>
          </div>

          <!-- Section XI: Final Acceptance -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XI. Final Acceptance</h2>
            <div class="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 rounded leading-relaxed">
              ${proj.performanceAcceptance.finalAcceptance || "Final Acceptance will be certified upon successful completion of the continuous 7-hour capability trial meeting all throughput, moisture, oil uptake, and seasoning consistency criteria. Both Seller and Indofood representatives shall execute the official Final Acceptance Certificate."}
            </div>
          </div>

          <!-- Section XII: Consequences If Target is Not Reached -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XII. Consequences If Target is Not Reached</h2>
            <div class="p-3 bg-red-50 border border-red-200 text-xs text-red-950 rounded leading-relaxed">
              ${proj.performanceAcceptance.failureConsequence}
            </div>
          </div>

          <!-- Section XIII: Term of Payment -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XIII. Term of Payment (Selected: ${proj.commercialTerms.selectedPaymentOption})</h2>
            <table class="clean-form-table table-header-orange">
              <thead>
                <tr>
                  <th style="width: 50%;">Options 1</th>
                  <th style="width: 50%;">Options 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="${proj.commercialTerms.selectedPaymentOption === 'Option 1' ? 'bg-[#FFF7ED] font-bold text-[#EA580C]' : ''}">
                    <strong>Equipment</strong><br/>
                    85% by L/C against Shipping Document<br/>
                    10% by T/T after machine running (&le; 60 days from B/L date)<br/>
                    5% by T/T 3 months after machine running (&le; 120 days from B/L date)
                  </td>
                  <td class="${proj.commercialTerms.selectedPaymentOption === 'Option 2' ? 'bg-[#FFF7ED] font-bold text-[#EA580C]' : ''}">
                    <strong>Equipment</strong><br/>
                    30% Down Payment Counter with Bank Guarantee<br/>
                    55% by L/C payable prior to shipping<br/>
                    10% After Machine Running<br/>
                    5% by T/T Retention 3 Months after machine running
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-[11px] text-slate-700 bg-[#F4F8FC] p-2.5 border border-[#D6E6F2] rounded mt-2">
              <strong class="text-[#0284C7]">Engineering Services:</strong> ${proj.commercialTerms.engineeringServicesPayment}
            </div>
          </div>

          <!-- Section XIV: Shipment and Delivery -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XIV. Shipment and Delivery</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-100 text-emerald-800' :
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-100 text-purple-800' :
                'bg-sky-100 text-[#0369A1]'
              }">
                ${proj.documentInfo.vendorOrigin || 'Foreign'} Clause
              </span>
            </div>
            <div class="p-3 bg-[#F4F8FC] border border-[#D6E6F2] text-xs text-slate-700 rounded leading-relaxed">
              ${proj.commercialTerms.shipmentTerms}
            </div>
          </div>

          <!-- Section XV: Warranty -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XV. Warranty</h2>
            <div class="p-3 bg-[#F0F9FF] border border-[#BAE6FD] text-xs text-[#0369A1] rounded leading-relaxed font-medium">
              ${proj.commercialTerms.warranty}
            </div>
          </div>

          <!-- Section XVI: Administrative Provisions -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XVI. Administrative Provisions</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Local' ? 'bg-emerald-100 text-emerald-800' :
                (proj.documentInfo.vendorOrigin || 'Foreign') === 'Mixed' ? 'bg-purple-100 text-purple-800' :
                'bg-sky-100 text-[#0369A1]'
              }">
                ${proj.documentInfo.vendorOrigin || 'Foreign'} Compliance
              </span>
            </div>
            <div class="space-y-2 text-xs text-slate-700">
              ${(proj.legalAndTaxProvisions || []).map(p => `
                <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <strong class="text-[#0B2447]">${p.title}:</strong> ${p.description}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section XVII: Required Documentation -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XVII. Required Documentation (14 Items)</h2>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
              ${proj.requiredDocumentation.map(d => `
                <div class="flex items-center gap-1.5">
                  <span class="text-[#10B981] font-bold">✓</span>
                  <span><strong>${d.id}. ${d.title}:</strong> ${d.desc}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Signature Blocks (Envato Clean Business Form Design with Capiclean Refresh) -->
          <div class="mt-8 pt-6 border-t-2 border-[#0B2447]">
            <div class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-6">Acknowledged and Approved by,</div>
            
            <div class="grid grid-cols-2 gap-8 text-xs">
              <!-- Seller Endorsement -->
              <div class="space-y-3">
                <div class="border-b border-[#D6E6F2] pb-1 font-bold text-[#0B2447] uppercase">On behalf of Seller:</div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Company Name:</span> <span class="font-bold">${proj.signOff.seller.companyName}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Quotation No.:</span> <span class="font-mono text-[#0284C7] font-semibold">${proj.signOff.seller.quotationNo}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Date:</span> <span>${proj.signOff.seller.date}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Authorized Name:</span> <span class="font-bold">${proj.signOff.seller.name}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Title / Position:</span> <span>${proj.signOff.seller.position}</span></div>
                <div class="pt-8 border-b border-dashed border-[#CBD5E1]"></div>
                <div class="text-center text-[10px] text-[#5A7184] uppercase font-semibold">Authorized Signatory & Corporate Stamp</div>
              </div>

              <!-- Purchaser Endorsement (PT Indofood Fortuna Makmur) -->
              <div class="space-y-3">
                <div class="border-b border-[#D6E6F2] pb-1 font-bold text-[#0B2447] uppercase">On behalf of PT Indofood Fortuna Makmur:</div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Company:</span> <span class="font-bold">${proj.signOff.purchaser.companyName}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Name:</span> <span class="font-bold text-[#0B2447]">${proj.signOff.purchaser.name}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Title / Position:</span> <span class="font-bold text-[#0284C7]">${proj.signOff.purchaser.position}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Date:</span> <span>${proj.signOff.purchaser.date}</span></div>
                <div class="pt-12 border-b border-dashed border-[#CBD5E1]"></div>
                <div class="text-center text-[10px] text-[#5A7184] uppercase font-semibold">Project & Engineering Management Approval</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Event Handlers and Interactive Wiring
function attachEventHandlers(activeProject) {
  // Search input
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.searchQuery = e.target.value;
      if (store.currentView !== 'projects' && store.currentView !== 'dashboard') {
        store.currentView = 'projects';
      }
      render();
    });
  }

  // Plant Selector
  const plantSelect = document.getElementById('plant-selector');
  if (plantSelect) {
    plantSelect.addEventListener('change', (e) => {
      store.plantFilter = e.target.value;
      render();
    });
  }

  // File Import listener
  const importInput = document.getElementById('import-file-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        store.importJSON(event.target.result);
      };
      reader.readAsText(file);
    });
  }

  // Live input changes in Step 1
  const docTitle = document.getElementById('doc-title');
  if (docTitle) docTitle.addEventListener('input', (e) => activeProject.documentInfo.title = e.target.value);
  const docSubtitle = document.getElementById('doc-subtitle');
  if (docSubtitle) docSubtitle.addEventListener('input', (e) => activeProject.documentInfo.subTitle = e.target.value);
  const docNumber = document.getElementById('doc-number');
  const docStatus = document.getElementById('doc-status');
  if (docStatus) docStatus.addEventListener('change', (e) => activeProject.documentInfo.status = e.target.value);
  const docPlantLoc = document.getElementById('doc-plant-location');
  if (docPlantLoc) {
    docPlantLoc.addEventListener('change', (e) => {
      store.updatePlantLocation(e.target.value);
      render();
    });
  }

  const docVendorOrigin = document.getElementById('doc-vendor-origin');
  if (docVendorOrigin) {
    docVendorOrigin.addEventListener('change', (e) => {
      store.updateVendorOrigin(e.target.value);
      render();
    });
  }

  // General Information inputs
  const genPlantLoc = document.getElementById('gen-plant-location');
  if (genPlantLoc) {
    genPlantLoc.addEventListener('change', (e) => {
      store.updatePlantLocation(e.target.value);
      render();
    });
  }

  const genCountry = document.getElementById('gen-country-origin');
  if (genCountry) {
    genCountry.addEventListener('change', (e) => {
      ensureGeneralInfo(activeProject).countryOfOrigin = e.target.value;
      render();
    });
  }

  const genEquip = document.getElementById('gen-equipment-type');
  if (genEquip) {
    genEquip.addEventListener('change', (e) => {
      const g = ensureGeneralInfo(activeProject);
      g.equipmentType = e.target.value;
      g.machineType = e.target.value;
      render();
    });
  }

  const genMachine = document.getElementById('gen-machine-type');
  if (genMachine) {
    genMachine.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).machineType = e.target.value;
    });
  }

  const genVendorCustom = document.getElementById('gen-vendor-custom');
  if (genVendorCustom) {
    genVendorCustom.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).vendorName = e.target.value;
    });
  }

  // Dynamic Equipment Models & Capacities
  document.querySelectorAll('[data-model-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.modelIdx, 10);
      const field = e.target.dataset.modelField;
      store.updateEquipmentModel(idx, field, e.target.value);
    });
  });

  const genVendor = document.getElementById('gen-vendor-name');
  if (genVendor) {
    genVendor.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).vendorName = e.target.value;
    });
  }

  const genModel = document.getElementById('gen-model-number');
  if (genModel) {
    genModel.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).modelNumber = e.target.value;
    });
  }

  const genCap = document.getElementById('gen-design-capacity');
  if (genCap) {
    genCap.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).designCapacity = e.target.value;
    });
  }

  if (docNumber) {
    docNumber.addEventListener('input', (e) => {
      activeProject.documentInfo.docNumber = e.target.value;
    });
  }

  const projDesc = document.getElementById('project-desc');
  if (projDesc) projDesc.addEventListener('input', (e) => activeProject.projectOverview.description = e.target.value);
  const dateStartup = document.getElementById('date-startup');
  if (dateStartup) dateStartup.addEventListener('input', (e) => activeProject.projectOverview.keyDates.lineStartUp = e.target.value);
  const dateQuotation = document.getElementById('date-quotation');
  if (dateQuotation) dateQuotation.addEventListener('input', (e) => activeProject.projectOverview.keyDates.finalQuotationDrawings = e.target.value);
  const datePo = document.getElementById('date-po');
  if (datePo) datePo.addEventListener('input', (e) => activeProject.projectOverview.keyDates.orderPlacement = e.target.value);

  // Revision table inputs
  document.querySelectorAll('[data-rev-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.revIdx, 10);
      const field = e.target.dataset.field;
      if (activeProject.documentInfo.revisionHistory[idx]) {
        activeProject.documentInfo.revisionHistory[idx][field] = e.target.value;
      }
    });
  });

  // Contacts inputs
  document.querySelectorAll('[data-contact-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.contactIdx, 10);
      const field = e.target.dataset.field;
      if (activeProject.keyContacts[idx]) {
        activeProject.keyContacts[idx][field] = e.target.value;
      }
    });
  });

  // Products inputs
  document.querySelectorAll('[data-prod-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.prodIdx, 10);
      const field = e.target.dataset.field;
      if (activeProject.productSpecifications[idx]) {
        activeProject.productSpecifications[idx][field] = e.target.value;
      }
    });
  });

  // Step 2: Site Location and Invoicing Inputs
  const siteRecipient = document.getElementById('site-recipient');
  if (siteRecipient) {
    siteRecipient.addEventListener('input', (e) => {
      activeProject.siteDescription.invoiceRecipient = e.target.value;
    });
  }
  const sitePort = document.getElementById('site-port');
  if (sitePort) {
    sitePort.addEventListener('input', (e) => {
      activeProject.siteDescription.deliveryPort = e.target.value;
    });
  }
  const siteAddress = document.getElementById('site-address');
  if (siteAddress) {
    siteAddress.addEventListener('input', (e) => {
      activeProject.siteDescription.address = e.target.value;
    });
  }
  const siteCustoms = document.getElementById('site-customs');
  if (siteCustoms) {
    siteCustoms.addEventListener('input', (e) => {
      if (store.isAdmin()) {
        activeProject.siteDescription.customClearanceNote = e.target.value;
      }
    });
  }

  // Process benchmark inputs
  const fryTemp = document.getElementById('proc-fry-temp');
  if (fryTemp) fryTemp.addEventListener('input', (e) => activeProject.processParameters.frying.temperatureRange = e.target.value);
  const fryDwell = document.getElementById('proc-fry-dwell');
  if (fryDwell) fryDwell.addEventListener('input', (e) => activeProject.processParameters.frying.dwellTime = e.target.value);
  const fryFeeder = document.getElementById('proc-fry-feeder');
  if (fryFeeder) fryFeeder.addEventListener('input', (e) => activeProject.processParameters.frying.feederRate = e.target.value);
  const fryOil = document.getElementById('proc-fry-oil');
  if (fryOil) fryOil.addEventListener('input', (e) => activeProject.processParameters.frying.oilCapacityInFryer = e.target.value);
  const frySpinner = document.getElementById('proc-fry-spinner');
  if (frySpinner) frySpinner.addEventListener('input', (e) => activeProject.processParameters.frying.spinnerRotationTime = e.target.value);
  const fryHopper = document.getElementById('proc-fry-hopper');
  if (fryHopper) fryHopper.addEventListener('input', (e) => activeProject.processParameters.frying.hopperGateOpening = e.target.value);

  const seasType = document.getElementById('proc-seas-type');
  if (seasType) seasType.addEventListener('input', (e) => activeProject.processParameters.seasoning.requiredSeasoning = e.target.value);
  const seasRate = document.getElementById('proc-seas-rate');
  if (seasRate) seasRate.addEventListener('input', (e) => activeProject.processParameters.seasoning.seasoningApplicationRate = e.target.value);
  const seasSalt = document.getElementById('proc-seas-salt');
  if (seasSalt) seasSalt.addEventListener('input', (e) => activeProject.processParameters.seasoning.saltContentBaseExcluded = e.target.value);
  const seasCap = document.getElementById('proc-seas-cap');
  if (seasCap) seasCap.addEventListener('input', (e) => activeProject.processParameters.seasoning.seasoningCapacity = e.target.value);
  const seasSpec = document.getElementById('proc-seas-spec');
  if (seasSpec) seasSpec.addEventListener('input', (e) => activeProject.processParameters.seasoning.seasoningType = e.target.value);

  // Scope specs inputs
  document.querySelectorAll('[data-scope-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.scopeIdx, 10);
      const type = e.target.dataset.scopeType;
      const field = e.target.dataset.field;
      if (activeProject.scopeOfSupply[type][idx]) {
        if (field === 'specs') {
          activeProject.scopeOfSupply[type][idx].specs = e.target.value.split('\n');
        } else {
          activeProject.scopeOfSupply[type][idx][field] = e.target.value;
        }
      }
    });
  });
}

// Global methods accessible from inline event handlers
if (typeof window !== 'undefined') {
  window.TRSA = {
  setView,
  setStep(s) {
    store.builderStep = s;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  setActiveProject,
  createProject(title) {
    store.createProject(title);
    render();
  },
  duplicateProject(id) {
    store.duplicateProject(id);
    render();
  },
  autoGenerateDocNumber() {
    const p = store.getActiveProject();
    const nextSeq = getNextSequenceNumber(store.projects);
    const author = p.documentInfo.revisionHistory?.[0]?.originatedBy || 'Refin A Putra';
    const plantCode = getPlantCode(p.documentInfo.plantLocation);
    const dept = 'MFG';
    const date = p.documentInfo.revisionHistory?.[0]?.date || new Date();
    
    const newDocNum = generateTRSANumber({
      seq: nextSeq,
      creatorName: author,
      plantCode: plantCode,
      dept: dept,
      date: date
    });
    p.documentInfo.docNumber = newDocNum;
    store.showNotification(`Generated Official No. TRSA: ${newDocNum}`, 'success');
    render();
  },
  setNextSequence() {
    window.TRSA.autoGenerateDocNumber();
  },
  syncDocNumberFromGenerator() {
    window.TRSA.autoGenerateDocNumber();
  },
  setVendorOrigin(origin) {
    store.updateVendorOrigin(origin);
    render();
  },
  updateGeneralInfo(fields) {
    store.updateGeneralInfo(fields);
    render();
  },
  addEquipmentModel() {
    store.addEquipmentModel();
  },
  removeEquipmentModel(idx) {
    store.removeEquipmentModel(idx);
  },
  updateEquipmentModel(idx, field, value) {
    store.updateEquipmentModel(idx, field, value);
  },
  onVendorSelectChanged(value) {
    const p = store.getActiveProject();
    if (!p) return;
    ensureGeneralInfo(p);
    if (value === '__custom__') {
      store.customVendorActive = true;
    } else {
      store.customVendorActive = false;
      p.generalInfo.vendorName = value;
      const vDetails = getVendorDetails(value);
      if (vDetails && vDetails.country) {
        if (vDetails.origin === 'Local') {
          p.generalInfo.countryOriginCategory = 'Local';
          p.generalInfo.countryOriginForeign = 'Indonesia';
          p.generalInfo.countryOfOrigin = 'Local (Indonesia)';
        } else {
          p.generalInfo.countryOriginCategory = 'Foreign';
          p.generalInfo.countryOriginForeign = vDetails.country;
          p.generalInfo.countryOfOrigin = `Foreign (${vDetails.country})`;
        }
      }
      store.saveProjects('UPDATE', [{
        category: 'Vendor Selection',
        description: `Selected vendor: ${value}`,
        from: '',
        to: value
      }]);
    }
    render();
  },
  onCountryCategoryChanged(category) {
    store.updateCountryOfOrigin(category);
  },
  onForeignCountryChanged(foreignCountry) {
    const p = store.getActiveProject();
    const cat = p?.generalInfo?.countryOriginCategory || 'Foreign';
    store.updateCountryOfOrigin(cat, foreignCountry);
  },
  VENDOR_DATABASE,
  getVendorDetails,
  FOREIGN_COUNTRY_OPTIONS,
  COUNTRY_ORIGIN_OPTIONS,
  parseCountryOfOrigin,
  formatCountryOfOrigin,
  EQUIPMENT_TYPE_OPTIONS,
  deleteProject(id) {
    store.deleteProject(id);
    render();
  },
  resetToDefault(id) {
    store.resetToDefault(id);
    render();
  },
  exportJSON(id) {
    store.exportJSON(id);
  },
  setStatusFilter(status) {
    store.statusFilter = status;
    render();
  },
  setPaymentOption(opt) {
    const p = store.getActiveProject();
    p.commercialTerms.selectedPaymentOption = opt;
    store.saveProjects();
    render();
  },
  setWatermark(w) {
    store.watermark = w;
    render();
  },
  toggleUserMenu() {
    store.showUserMenu = !store.showUserMenu;
    render();
  },
  switchUser(name) {
    store.setCurrentUser(name);
    const role = store.isAdmin() ? ROLES.ADMIN : ROLES.ENGINEER;
    setCurrentRole(role);
    store.showUserMenu = false;
    render();
  },
  stampRevisionRow(idx) {
    store.stampRevisionRow(idx);
    render();
  },
  saveCurrentForm() {
    store.saveRevisionHistory();
    render();
  },
  addRevisionRow() {
    store.addRevisionRow();
    render();
  },
  removeRevisionRow(idx) {
    const p = store.getActiveProject();
    if (p.documentInfo?.revisionHistory) {
      p.documentInfo.revisionHistory.splice(idx, 1);
      store.saveProjects();
    }
    render();
  },
  addContactRow() {
    const p = store.getActiveProject();
    p.keyContacts.push({
      id: 'c-' + Date.now(),
      name: 'New Officer',
      role: 'Project Member',
      companyAddress: 'PT. Indofood Fortuna Makmur',
      email: 'officer@icbp.indofood.co.id',
      isPrimary: false
    });
    render();
  },
  removeContactRow(idx) {
    const p = store.getActiveProject();
    p.keyContacts.splice(idx, 1);
    render();
  },
  addProductRow() {
    const p = store.getActiveProject();
    p.productSpecifications.push({
      id: 'prod-' + Date.now(),
      shape: 'New Snack Shape (e.g. 3D Shell / Ring)',
      description: 'Corn or potato snack pellet, expanded shape',
      dimensionInput: '25 - 30 mm',
      dimensionOutput: 'NA',
      capacityOutput: '600 Kg/hour',
      bulkDensityInput: '300 g/l',
      bulkDensityOutput: '50 g/l',
      moistureInput: '10.0 - 11.5%',
      moistureOutput: '1.0 - 2.1%',
      oilContentInput: 'N/A',
      oilContentOutput: '28 - 40%'
    });
    render();
  },
  selectProductCanvas(idx) {
    store.selectedProductIdx = idx;
    render();
  },
  removeProductRow(idx) {
    const p = store.getActiveProject();
    p.productSpecifications.splice(idx, 1);
    if (store.selectedProductIdx >= p.productSpecifications.length) {
      store.selectedProductIdx = Math.max(0, p.productSpecifications.length - 1);
    }
    render();
  },
  addScopeItem(type) {
    const p = store.getActiveProject();
    const list = p.scopeOfSupply[type];
    list.push({
      itemNumber: list.length + 1,
      title: 'New Equipment Module',
      qty: '1 (one) unit',
      specs: ['Stainless steel 304 construction', 'Compliant with hygienic food contact design']
    });
    render();
  },
  syncSiteLocationFromDatabase() {
    const p = store.getActiveProject();
    const plant = p.documentInfo?.plantLocation || 'Semarang Plant';
    store.updatePlantLocation(plant);
    render();
  },
  onPlantLocationChanged(newPlant) {
    store.updatePlantLocation(newPlant);
    render();
  },
  removeScopeItem(type, idx) {
    const p = store.getActiveProject();
    p.scopeOfSupply[type].splice(idx, 1);
    render();
  },
  openSupabaseModal() {
    store.showSupabaseModal = true;
    render();
  },
  closeSupabaseModal() {
    store.showSupabaseModal = false;
    render();
  },
  async testSupabaseConnection() {
    const url = document.getElementById('supabase-url-input')?.value;
    const anonKey = document.getElementById('supabase-key-input')?.value;
    const resultBox = document.getElementById('supabase-test-result');
    if (!resultBox) return;

    resultBox.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-800', 'bg-red-50', 'text-red-800');
    resultBox.classList.add('bg-sky-50', 'text-sky-800');
    resultBox.innerText = 'Pinging PostgreSQL / Supabase REST endpoint...';

    const res = await testConnection(url, anonKey);
    resultBox.classList.remove('bg-sky-50', 'text-sky-800');
    if (res.success) {
      resultBox.classList.add('bg-emerald-50', 'text-emerald-800');
      resultBox.innerText = '✓ ' + res.message;
    } else {
      resultBox.classList.add('bg-red-50', 'text-red-800');
      resultBox.innerText = '✗ ' + res.message;
    }
  },
  saveSupabaseConfigFromModal() {
    const url = document.getElementById('supabase-url-input')?.value || '';
    const anonKey = document.getElementById('supabase-key-input')?.value || '';
    const enabled = document.getElementById('supabase-enable-input')?.checked || false;

    setSupabaseConfig({ url, anonKey, enabled });
    store.showSupabaseModal = false;
    store.showNotification(
      enabled ? 'Supabase PostgreSQL configuration saved.' : 'Offline LocalStorage mode active.', 
      'success'
    );
    render();
  },
  async syncToPostgresNow() {
    store.showNotification('Syncing project to PostgreSQL...', 'info');
    const p = store.getActiveProject();
    const res = await syncProjectToPostgres(p, 'SYNC');
    if (res.success) {
      store.showNotification('Project synced with PostgreSQL successfully.', 'success');
    } else {
      store.showNotification('Offline queue: change buffered for sync.', 'info');
    }
    render();
  },
  openAuditModal() {
    store.showAuditModal = true;
    render();
  },
  closeAuditModal() {
    store.showAuditModal = false;
    render();
  },
  setAuditProjectFilter(val) {
    store.auditProjectFilter = val;
    render();
  },
  setAuditSearch(val) {
    store.auditSearchQuery = val;
    render();
  },
  downloadAuditJSON() {
    const projId = store.auditProjectFilter === 'current' ? store.activeProjectId : null;
    const jsonStr = exportAuditLogsToJSON(projId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRSA_Audit_Log_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    store.showNotification('Audit log exported to JSON.', 'success');
  },
  downloadAuditCSV() {
    const projId = store.auditProjectFilter === 'current' ? store.activeProjectId : null;
    const csvStr = exportAuditLogsToCSV(projId);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRSA_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    store.showNotification('Audit log exported to CSV.', 'success');
  }
};
}
