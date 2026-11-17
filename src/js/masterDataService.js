/**
 * TRSA Studio - Enterprise Master Data Service
 * Manages Users (with Role, Department, Jabatan), Vendors (detailed OEM directory),
 * Plants (detailed facility addresses & PICs), Departments, and Jabatan User.
 */

import { ORG_ROLES } from './security.js';
import { PLANT_MATRIX_PROFILES, resolvePlantCode } from './trsaMatrixService.js';

export const MASTER_STORAGE_KEYS = Object.freeze({
  USERS: 'TRSA_MASTER_USERS_V1',
  VENDORS: 'TRSA_MASTER_VENDORS_V1',
  PLANTS: 'TRSA_MASTER_PLANTS_V1',
  DEPARTMENTS: 'TRSA_MASTER_DEPARTMENTS_V1',
  JOB_TITLES: 'TRSA_MASTER_JOB_TITLES_V1',
  AUTH_SESSION: 'TRSA_AUTH_SESSION_V1'
});

export const DEFAULT_PASSCODE = 'indofood2026';

export const DEFAULT_DEPARTMENTS = [
  {
    code: 'MFG',
    name: 'Manufacturing & Project Engineering',
    division: 'PT Indofood Fortuna Makmur — Operations',
    headTitle: 'Project & Engineering Manager',
    costCenter: 'CC-1400-MFG',
    description: 'Capital equipment planning, TRSA authoring, line installation, and plant start-up execution.'
  },
  {
    code: 'ENG',
    name: 'Corporate Engineering & Automation',
    division: 'PT Indofood Fortuna Makmur — Technical',
    headTitle: 'Engineering PIC Lead',
    costCenter: 'CC-1400-ENG',
    description: 'Process engineering, PLC/HMI automation verification, hygienic design audit, and FAT/SAT validation.'
  },
  {
    code: 'PUR',
    name: 'Purchasing & Procurement',
    division: 'Supply Chain & Commercial',
    headTitle: 'Purchasing Supervisor',
    costCenter: 'CC-1400-PUR',
    description: 'Vendor qualification, commercial negotiation, SWIFT BG/APBG, tax/customs compliance, and invoicing.'
  },
  {
    code: 'QA',
    name: 'Quality Assurance & Food Safety',
    division: 'Quality & Regulatory Compliance',
    headTitle: 'QA / Food Safety Lead',
    costCenter: 'CC-1400-QA',
    description: 'EHEDG/3-A compliance, food-grade SUS304 verification, Halal documentation, and calibration standards.'
  },
  {
    code: 'FAC',
    name: 'Plant Facility & Utility',
    division: 'Site Infrastructure & Maintenance',
    headTitle: 'Plant Engineering Head',
    costCenter: 'CC-1400-FAC',
    description: 'Site utilities (steam, compressed air, nitrogen, power), plant receiving bay, and civil/structural readiness.'
  },
  {
    code: 'FIN',
    name: 'Finance, Tax & Accounting',
    division: 'Corporate Finance',
    headTitle: 'Tax & AP Manager',
    costCenter: 'CC-1400-FIN',
    description: 'PPh 26 / PMK 35/2019 verification, PP 44/2022 VAT invoicing compliance, and payment milestone settlement.'
  }
];

export const DEFAULT_JOB_TITLES = [
  {
    id: 'jab-01',
    code: 'PEM',
    title: 'Project & Engineering Manager',
    level: 'Manager',
    defaultDept: 'MFG',
    defaultRole: ORG_ROLES.SUPER_ADMIN,
    description: 'Approves corporate TRSA standards, manages Compliance Matrix per-user policies, and leads capital projects.'
  },
  {
    id: 'jab-02',
    code: 'SPE',
    title: 'Senior Project Engineer',
    level: 'Senior Specialist',
    defaultDept: 'MFG',
    defaultRole: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    description: 'Leads technical specification authoring, multi-equipment TRSA packaging, and vendor technical alignment.'
  },
  {
    id: 'jab-03',
    code: 'PE',
    title: 'Project Engineer',
    level: 'Engineer',
    defaultDept: 'MFG',
    defaultRole: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    description: 'Prepares technical parameters, P&ID/scope of supply, and FAT/SAT performance criteria.'
  },
  {
    id: 'jab-04',
    code: 'EPIC',
    title: 'User / Engineering PIC',
    level: 'Specialist / PIC',
    defaultDept: 'ENG',
    defaultRole: ORG_ROLES.PIC_PROJECT,
    description: 'Plant & engineering representative responsible for Clause IV user sign-off and field verification.'
  },
  {
    id: 'jab-05',
    code: 'PPIC',
    title: 'Project Team PIC',
    level: 'Coordinator / PIC',
    defaultDept: 'MFG',
    defaultRole: ORG_ROLES.PIC_PROJECT,
    description: 'Plant-assigned project coordinator overseeing local readiness, installation, and snag list closure.'
  },
  {
    id: 'jab-06',
    code: 'PSUP',
    title: 'Purchasing Supervisor',
    level: 'Supervisor',
    defaultDept: 'PUR',
    defaultRole: ORG_ROLES.PURCHASING_PLANT,
    description: 'Supervises plant procurement contracts, commercial terms, SWIFT BG, and Clause XVI tax provisions.'
  },
  {
    id: 'jab-07',
    code: 'PPUR',
    title: 'Purchasing Team PIC',
    level: 'Officer / Buyer',
    defaultDept: 'PUR',
    defaultRole: ORG_ROLES.PURCHASING_PLANT,
    description: 'Handles plant PO execution, invoice reception, customs clearance documents, and vendor correspondence.'
  },
  {
    id: 'jab-08',
    code: 'PEH',
    title: 'Plant Engineering Head',
    level: 'Section Head',
    defaultDept: 'FAC',
    defaultRole: ORG_ROLES.PIC_PROJECT,
    description: 'Oversees plant utilities, site receiving dock, and post-commissioning handover at factory level.'
  }
];

export const DEFAULT_TEAM_MEMBERS = [
  {
    employeeId: 'IFM-MFG-001',
    name: 'Moh Yusuf Alfian',
    email: 'my.alfian@icbp.indofood.co.id',
    role: ORG_ROLES.SUPER_ADMIN,
    jabatan: 'Project & Engineering Manager',
    initials: 'MYA',
    dept: 'MFG',
    departmentName: 'Manufacturing & Project Engineering',
    plantCode: 'All Plants',
    phone: '+62 21 5795-8822 ext. 4101',
    status: 'Active',
    bio: 'Super Admin overseeing TRSA governance, multi-plant Compliance Matrix policies, and capital project approvals across 1402, 1403, 1405, and 1411.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-MFG-002',
    name: 'Refin A Putra',
    email: 'refin.putra@icbp.indofood.co.id',
    role: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    jabatan: 'Project Engineer',
    initials: 'RAP',
    dept: 'MFG',
    departmentName: 'Manufacturing & Project Engineering',
    plantCode: '1403',
    phone: '+62 24 866-1403 ext. 2104',
    status: 'Active',
    bio: 'Lead TRSA specification author for continuous snack pellet frying, seasoning lines, and packaging automation.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-003',
    name: 'Natalia Happy',
    email: 'natalia.happy@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Supervisor',
    initials: 'NH',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: '1403',
    phone: '+62 24 866-1403 ext. 3102',
    status: 'Active',
    bio: 'Purchasing Plant supervisor for Semarang Plant (1403) managing Foreign & Local commercial terms, SWIFT BG, and vendor compliance.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-004',
    name: 'Dewi Natalia',
    email: 'dewi.natalia@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Team PIC',
    initials: 'DN',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: 'All Plants',
    phone: '+62 21 552-3456 ext. 3101',
    status: 'Active',
    bio: 'Primary Purchasing Team PIC & Invoice Recipient across Cikokol (1402), Semarang (1403), Cikupa (1405), and Agro (1411).',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-ENG-005',
    name: 'Mohammad Faiz',
    email: 'mohammad.faiz@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'User / Engineering PIC',
    initials: 'MF',
    dept: 'ENG',
    departmentName: 'Corporate Engineering & Automation',
    plantCode: 'All Plants',
    phone: '+62 21 5795-8822 ext. 4201',
    status: 'Active',
    bio: 'Corporate Engineering PIC handling technical design review, FAT/SAT instrumentation verification, and master password handover.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-ENG-006',
    name: 'Dany Taufiq Alim Ansori',
    email: 'dany.ansori@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'User / Engineering PIC',
    initials: 'DTAA',
    dept: 'ENG',
    departmentName: 'Corporate Engineering & Automation',
    plantCode: 'All Plants',
    phone: '+62 21 5795-8822 ext. 4202',
    status: 'Active',
    bio: 'Engineering PIC specializing in thermal processing systems, hygienic SUS304 verification, and safety interlocks.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-ENG-007',
    name: 'Putra AP',
    email: 'adiprana@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'User / Engineering PIC',
    initials: 'PAP',
    dept: 'ENG',
    departmentName: 'Corporate Engineering & Automation',
    plantCode: 'All Plants',
    phone: '+62 21 5795-8822 ext. 4203',
    status: 'Active',
    bio: 'Engineering PIC overseeing PLC/HMI source code compliance, Ewon remote access validation, and commissioning run tests.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-ENG-008',
    name: 'Septian Bagus Jumantoro',
    email: 'septian.jumantoro@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'User / Engineering PIC',
    initials: 'SBJ',
    dept: 'ENG',
    departmentName: 'Corporate Engineering & Automation',
    plantCode: 'All Plants',
    phone: '+62 21 5795-8822 ext. 4204',
    status: 'Active',
    bio: 'Engineering PIC responsible for packaging line integration, bulk density benchmarks, and utility interface specs.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-MFG-009',
    name: 'Ayodya Maulana Gunoro',
    email: 'ayodya.gunoro@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'Project Team PIC',
    initials: 'AMG',
    dept: 'MFG',
    departmentName: 'Manufacturing & Project Engineering',
    plantCode: '1403',
    phone: '+62 24 866-1403 ext. 2108',
    status: 'Active',
    bio: 'Semarang Plant (1403) Project Team PIC coordinating local civil works, machine rigging, and line commissioning.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-MFG-010',
    name: 'Angga Dwiki Wicaksono',
    email: 'angga.wicaksono@icbp.indofood.co.id',
    role: ORG_ROLES.PIC_PROJECT,
    jabatan: 'Project Team PIC',
    initials: 'ADW',
    dept: 'MFG',
    departmentName: 'Manufacturing & Project Engineering',
    plantCode: '1402',
    phone: '+62 21 552-3456 ext. 2105',
    status: 'Active',
    bio: 'Cikokol Plant (1402) Project Team PIC overseeing line installation, utility tie-in, and operator training records.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-011',
    name: 'Yanuar Ari Wibowo',
    email: 'yanuar.wibowo@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Team PIC',
    initials: 'YAW',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: '1403',
    phone: '+62 24 866-1403 ext. 3105',
    status: 'Active',
    bio: 'Semarang Plant (1403) Purchasing PIC handling domestic & foreign PO documents, customs coordination, and delivery scheduling.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-012',
    name: 'Muhammad Alfatih',
    email: 'muhammad.alfatih@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Team PIC',
    initials: 'MA',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: '1405',
    phone: '+62 21 596-1405 ext. 3104',
    status: 'Active',
    bio: 'Cikupa (1405) & Agro (1411) Purchasing PIC overseeing SKB PPh 26 / PMK 35/2019 verification and port demurrage monitoring.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-MFG-013',
    name: 'Murdani',
    email: 'm.murdani@icbp.indofood.co.id',
    role: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    jabatan: 'Senior Project Engineer',
    initials: 'M',
    dept: 'MFG',
    departmentName: 'Manufacturing & Project Engineering',
    plantCode: '1402',
    phone: '+62 21 552-3456 ext. 2102',
    status: 'Active',
    bio: 'Senior Project Engineer managing process equipment standardization, layout drawings, and cross-plant machinery specs.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-014',
    name: 'Natania WS',
    email: 'natania.ws@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Team PIC',
    initials: 'NWS',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: '1402',
    phone: '+62 21 552-3456 ext. 3102',
    status: 'Active',
    bio: 'Cikokol Plant (1402) Purchasing PIC responsible for invoice reception, softcopy verification, and domestic/import procurement.',
    password: DEFAULT_PASSCODE
  },
  {
    employeeId: 'IFM-PUR-015',
    name: 'Arief Setyawan',
    email: 'arief.setyawan@icbp.indofood.co.id',
    role: ORG_ROLES.PURCHASING_PLANT,
    jabatan: 'Purchasing Team PIC',
    initials: 'AS',
    dept: 'PUR',
    departmentName: 'Purchasing & Procurement',
    plantCode: '1402',
    phone: '+62 21 552-3456 ext. 3103',
    status: 'Active',
    bio: 'Cikokol Plant (1402) Purchasing PIC handling PO coordination, shipping documents compliance, and vendor delivery tracking.',
    password: DEFAULT_PASSCODE
  }
];

export const DEFAULT_VENDORS = [
  {
    id: 'v-01',
    vendorCode: 'VND-NL-001',
    name: 'Heat and Control / Kiremko B.V.',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Frying & Seasoning System',
    description: 'Consortium: Pellet Fryer, Drum Coating & Distribution Systems',
    address: '21121 Cabot Blvd, Hayward, CA / Waalreseweg, Montfoort',
    city: 'Montfoort / Hayward',
    postalCode: '3417 XG',
    website: 'https://www.heatandcontrol.com',
    picName: 'Pieter van Dijk',
    picRole: 'Regional Project Director (APAC)',
    picEmail: 'apac.projects@heatandcontrol.com',
    picPhone: '+65 6273 6362',
    taxId: 'NL-8045.12.901.B01',
    paymentCurrency: 'USD / EUR',
    leadTimeWeeks: '24 – 28 weeks',
    certifications: ['ISO 9001', 'CE', 'EHEDG', 'FDA Contact'],
    status: 'Preferred OEM'
  },
  {
    id: 'v-02',
    vendorCode: 'VND-US-002',
    name: 'Heat and Control, Inc.',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Frying System',
    description: 'Unitized Pan Fryers, Heat Exchangers, Filter Units & Multi-Zone Roasters',
    address: '21121 Cabot Blvd',
    city: 'Hayward, California',
    postalCode: '94545',
    website: 'https://www.heatandcontrol.com',
    picName: 'Marcus Vance',
    picRole: 'Senior Applications Engineer',
    picEmail: 'info@heatandcontrol.com',
    picPhone: '+1 510 259 0500',
    taxId: 'US-EIN-94-1234567',
    paymentCurrency: 'USD',
    leadTimeWeeks: '22 – 26 weeks',
    certifications: ['ISO 9001', 'UL', 'USDA / FDA'],
    status: 'Approved OEM'
  },
  {
    id: 'v-03',
    vendorCode: 'VND-NL-003',
    name: 'Kiremko B.V.',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Specialized Industrial Snack Pellet, Potato & Extrusion Frying Lines',
    address: 'Waalreseweg 17',
    city: 'Montfoort',
    postalCode: '3417 XG',
    website: 'https://www.kiremko.com',
    picName: 'Hendrik Bakker',
    picRole: 'Sales & Engineering Manager',
    picEmail: 'sales@kiremko.com',
    picPhone: '+31 348 479 400',
    taxId: 'NL-0082.91.442.B01',
    paymentCurrency: 'EUR',
    leadTimeWeeks: '24 – 30 weeks',
    certifications: ['ISO 9001', 'CE', 'EHEDG'],
    status: 'Approved OEM'
  },
  {
    id: 'v-04',
    vendorCode: 'VND-NL-004',
    name: 'Florigo Industry B.V. (tna)',
    country: 'Netherlands',
    origin: 'Foreign',
    equipmentType: 'Frying System',
    description: 'Continuous Snack Pellet & Chip Frying with Active Oil Filtration',
    address: 'Mercuriusweg 15',
    city: 'Woerden',
    postalCode: '3449 AW',
    website: 'https://www.tnasolutions.com',
    picName: 'Bram Vermeer',
    picRole: 'Processing Solutions Specialist',
    picEmail: 'florigo.sales@tnasolutions.com',
    picPhone: '+31 348 415 541',
    taxId: 'NL-8112.40.883.B01',
    paymentCurrency: 'EUR / USD',
    leadTimeWeeks: '20 – 26 weeks',
    certifications: ['ISO 9001', 'CE', 'EHEDG'],
    status: 'Approved OEM'
  },
  {
    id: 'v-05',
    vendorCode: 'VND-JP-005',
    name: 'Ishida Co., Ltd.',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Multi-Head Weighers, Atlas Bagmakers & Snack Inspection Systems',
    address: '44 Sanno-cho, Shogoin, Sakyo-ku',
    city: 'Kyoto',
    postalCode: '606-8392',
    website: 'https://www.ishida.com',
    picName: 'Kenji Takahashi',
    picRole: 'ASEAN Key Account Manager',
    picEmail: 'asean.sales@ishida.co.jp',
    picPhone: '+81 75 771 4141',
    taxId: 'JP-T4130001009912',
    paymentCurrency: 'USD / JPY',
    leadTimeWeeks: '14 – 18 weeks',
    certifications: ['ISO 9001', 'ISO 14001', 'CE', 'IP65'],
    status: 'Preferred OEM'
  },
  {
    id: 'v-06',
    vendorCode: 'VND-UK-006',
    name: 'Baker Perkins Ltd.',
    country: 'United Kingdom',
    origin: 'Foreign',
    equipmentType: 'Extruder & Forming Line',
    description: 'Twin Screw Food Extrusion, Cooking & Sheeted Pellet Forming Lines',
    address: 'Manor Drive, Paston Parkway',
    city: 'Peterborough',
    postalCode: 'PE4 7AP',
    website: 'https://www.bakerperkins.com',
    picName: 'Oliver Bennett',
    picRole: 'Global Extrusion Specialist',
    picEmail: 'bpltd@bakerperkins.com',
    picPhone: '+44 1733 283000',
    taxId: 'GB-882910412',
    paymentCurrency: 'GBP / EUR / USD',
    leadTimeWeeks: '26 – 32 weeks',
    certifications: ['ISO 9001', 'CE', 'UKCA'],
    status: 'Approved OEM'
  },
  {
    id: 'v-07',
    vendorCode: 'VND-US-007',
    name: 'Reading Bakery Systems (RBS)',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Continuous Sheeting, Gauging Rolls, Cutting & Continuous Oven Systems',
    address: '380 Old Bernville Road',
    city: 'Robesonia, Pennsylvania',
    postalCode: '19551',
    website: 'https://www.readingbakery.com',
    picName: 'David Miller',
    picRole: 'International Sales Director',
    picEmail: 'info@readingbakery.com',
    picPhone: '+1 610 693 5816',
    taxId: 'US-EIN-23-2948112',
    paymentCurrency: 'USD',
    leadTimeWeeks: '24 – 30 weeks',
    certifications: ['ISO 9001', 'UL', 'FDA'],
    status: 'Approved OEM'
  },
  {
    id: 'v-08',
    vendorCode: 'VND-FR-008',
    name: 'Clextral SAS',
    country: 'France',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Twin Screw Extrusion Lines for 2D/3D Expanded Snack Pellets',
    address: '1 Rue Colonel Riez, BP 10',
    city: 'Firminy',
    postalCode: '42702',
    website: 'https://www.clextral.com',
    picName: 'Jean-Luc Moreau',
    picRole: 'APAC Food Extrusion Lead',
    picEmail: 'clextral@clextral.com',
    picPhone: '+33 4 77 40 31 31',
    taxId: 'FR-48-341122901',
    paymentCurrency: 'EUR',
    leadTimeWeeks: '24 – 28 weeks',
    certifications: ['ISO 9001', 'CE', 'EHEDG'],
    status: 'Approved OEM'
  },
  {
    id: 'v-09',
    vendorCode: 'VND-US-009',
    name: 'PPM Technologies LLC',
    country: 'United States',
    origin: 'Foreign',
    equipmentType: 'Seasoning System',
    description: 'Loss-in-Weight Seasoning Systems, Coating Drums & Electromagnetic Feeders',
    address: '500 East Illinois Street',
    city: 'Newberg, Oregon',
    postalCode: '97132',
    website: 'https://www.ppmtech.com',
    picName: 'Sarah Jenkins',
    picRole: 'Seasoning Systems Manager',
    picEmail: 'sales@ppmtech.com',
    picPhone: '+1 503 538 3141',
    taxId: 'US-EIN-93-0884122',
    paymentCurrency: 'USD',
    leadTimeWeeks: '16 – 20 weeks',
    certifications: ['ISO 9001', 'FDA', '3-A Sanitary'],
    status: 'Approved OEM'
  },
  {
    id: 'v-10',
    vendorCode: 'VND-AU-010',
    name: 'TNA Solutions Pty Ltd',
    country: 'Australia',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'High-Speed Robag Packaging, On-Machine Seasoning & Distribution',
    address: '24 Carter Street',
    city: 'Sydney Olympic Park, NSW',
    postalCode: '2127',
    website: 'https://www.tnasolutions.com',
    picName: 'Liam Henderson',
    picRole: 'SEA Sales Director',
    picEmail: 'info@tnasolutions.com',
    picPhone: '+61 2 9714 2300',
    taxId: 'AU-ABN-44-002-719-901',
    paymentCurrency: 'USD / AUD',
    leadTimeWeeks: '16 – 22 weeks',
    certifications: ['ISO 9001', 'CE', 'IP65'],
    status: 'Preferred OEM'
  },
  {
    id: 'v-11',
    vendorCode: 'VND-JP-011',
    name: 'Yamato Scale Co., Ltd.',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Multihead Weighers, Checkweighing & High-Speed Packaging Automation',
    address: '5-22 Saenba-cho, Akashi',
    city: 'Hyogo',
    postalCode: '673-8688',
    website: 'https://www.yamato-scale.co.jp',
    picName: 'Haruki Sato',
    picRole: 'Overseas Sales Group',
    picEmail: 'export@yamato-scale.co.jp',
    picPhone: '+81 78 918 5566',
    taxId: 'JP-T7140001055109',
    paymentCurrency: 'USD / JPY',
    leadTimeWeeks: '14 – 18 weeks',
    certifications: ['ISO 9001', 'CE', 'OIML'],
    status: 'Approved OEM'
  },
  {
    id: 'v-12',
    vendorCode: 'VND-CH-012',
    name: 'Bühler Group',
    country: 'Switzerland',
    origin: 'Foreign',
    equipmentType: 'Process Line',
    description: 'Thermal Processing, Extrusion Processing & Raw Pellet Preparation',
    address: 'Gupfenstrasse 5',
    city: 'Uzwil',
    postalCode: '9240',
    website: 'https://www.buhlergroup.com',
    picName: 'Lukas Meyer',
    picRole: 'Head of Snack Food Systems',
    picEmail: 'food.processing@buhlergroup.com',
    picPhone: '+41 71 955 11 11',
    taxId: 'CHE-105.921.842 MWST',
    paymentCurrency: 'EUR / CHF / USD',
    leadTimeWeeks: '26 – 34 weeks',
    certifications: ['ISO 9001', 'CE', 'EHEDG', 'ATEX'],
    status: 'Approved OEM'
  },
  {
    id: 'v-13',
    vendorCode: 'VND-JP-013',
    name: 'Fuji Packaging Machinery',
    country: 'Japan',
    origin: 'Foreign',
    equipmentType: 'Packaging System',
    description: 'Alpha VII Horizontal Flow Wrappers, Feeders & Automated Case Packers',
    address: '14-10 Kamejima 2-chome, Nakamura-ku',
    city: 'Nagoya',
    postalCode: '453-0013',
    website: 'https://www.fuji-machinery.co.jp',
    picName: 'Takeshi Watanabe',
    picRole: 'ASEAN Export Representative',
    picEmail: 'sales@fuji-machinery.co.jp',
    picPhone: '+81 52 452 1211',
    taxId: 'JP-T2180001044218',
    paymentCurrency: 'USD / JPY',
    leadTimeWeeks: '16 – 20 weeks',
    certifications: ['ISO 9001', 'CE'],
    status: 'Approved OEM'
  },
  {
    id: 'v-14',
    vendorCode: 'VND-ID-014',
    name: 'PT Fabrikasi Rekatama Mandiri',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'Distribution System',
    description: 'Domestic Food-Grade Stainless Conveyors, Mezzanines & Support Fabrication',
    address: 'Jl. Jababeka IX Blok E No. 14, Kawasan Industri Jababeka',
    city: 'Kab. Bekasi, Jawa Barat',
    postalCode: '17530',
    website: 'https://www.rekatama.co.id',
    picName: 'Hendra Wijaya',
    picRole: 'Engineering & Project Manager',
    picEmail: 'project@rekatama.co.id',
    picPhone: '+62 21 893-4421',
    taxId: 'NPWP 02.441.892.3-413.000 (PKP)',
    paymentCurrency: 'IDR (Rupiah)',
    leadTimeWeeks: '8 – 12 weeks',
    certifications: ['ISO 9001', 'Food-Grade SUS304 MTC', 'Halal Lubricant Compliance'],
    status: 'Preferred Local Vendor'
  },
  {
    id: 'v-15',
    vendorCode: 'VND-ID-015',
    name: 'PT Cipta Aneka Selera Tehnik',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'CIP (Clean-in-Place) System',
    description: 'Domestic Stainless Piping, Sanitary Tanks & Automated CIP Skids',
    address: 'Jl. Industri Raya III Blok AE No. 8, Pasir Jaya, Jatiuwung',
    city: 'Kota Tangerang, Banten',
    postalCode: '15135',
    website: 'https://www.cast-engineering.co.id',
    picName: 'Bambang Sutrisno',
    picRole: 'Technical Sales Director',
    picEmail: 'engineering@cast-engineering.co.id',
    picPhone: '+62 21 590-8812',
    taxId: 'NPWP 03.112.405.9-416.000 (PKP)',
    paymentCurrency: 'IDR (Rupiah)',
    leadTimeWeeks: '10 – 14 weeks',
    certifications: ['ISO 9001', '3-A Sanitary Welding', 'Halal Statement'],
    status: 'Approved Local Vendor'
  },
  {
    id: 'v-16',
    vendorCode: 'VND-ID-016',
    name: 'PT Mitra Sarana Presisi',
    country: 'Indonesia',
    origin: 'Local',
    equipmentType: 'Flight Belt Elevator (FBE)',
    description: 'Domestic Flight Belt Elevators, Exhaust Ducting & Heavy Work Platforms',
    address: 'Jl. Raya Semarang–Kendal KM 12, Tambakaji, Ngaliyan',
    city: 'Kota Semarang, Jawa Tengah',
    postalCode: '50185',
    website: 'https://www.mitrasaranapresisi.co.id',
    picName: 'Agus Setiawan',
    picRole: 'Plant Fabrication Lead',
    picEmail: 'sales@mitrasaranapresisi.co.id',
    picPhone: '+62 24 866-7712',
    taxId: 'NPWP 02.889.120.4-503.000 (PKP)',
    paymentCurrency: 'IDR (Rupiah)',
    leadTimeWeeks: '6 – 10 weeks',
    certifications: ['ISO 9001', 'SUS304 Food-Grade MTC'],
    status: 'Approved Local Vendor'
  }
];

function readStorageArray(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(fallback));
}

function writeStorageValue(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function loadDepartments() {
  return readStorageArray(MASTER_STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
}

export function saveDepartments(list) {
  return writeStorageValue(MASTER_STORAGE_KEYS.DEPARTMENTS, list);
}

export function getDepartmentByCode(code) {
  const list = loadDepartments();
  return list.find(d => String(d.code).toUpperCase() === String(code || '').toUpperCase()) || null;
}

export function upsertDepartment(dept) {
  const list = loadDepartments();
  const code = String(dept.code || '').trim().toUpperCase();
  if (!code) return null;
  const entry = {
    code,
    name: String(dept.name || code).trim(),
    division: String(dept.division || 'PT Indofood Fortuna Makmur').trim(),
    headTitle: String(dept.headTitle || 'Department Head').trim(),
    costCenter: String(dept.costCenter || `CC-1400-${code}`).trim(),
    description: String(dept.description || '').trim()
  };
  const idx = list.findIndex(d => d.code.toUpperCase() === code);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  saveDepartments(list);
  return entry;
}

export function deleteDepartment(code) {
  const list = loadDepartments();
  if (list.length <= 1) return false;
  const next = list.filter(d => d.code.toUpperCase() !== String(code || '').toUpperCase());
  saveDepartments(next);
  return next.length < list.length;
}

export function loadJobTitles() {
  return readStorageArray(MASTER_STORAGE_KEYS.JOB_TITLES, DEFAULT_JOB_TITLES);
}

export function saveJobTitles(list) {
  return writeStorageValue(MASTER_STORAGE_KEYS.JOB_TITLES, list);
}

export function upsertJobTitle(job) {
  const list = loadJobTitles();
  const title = String(job.title || '').trim();
  if (!title) return null;
  const id = job.id || `jab-${Date.now()}`;
  const entry = {
    id,
    code: String(job.code || title.slice(0, 4).toUpperCase()).trim().toUpperCase(),
    title,
    level: String(job.level || 'Specialist').trim(),
    defaultDept: String(job.defaultDept || 'MFG').trim().toUpperCase(),
    defaultRole: String(job.defaultRole || ORG_ROLES.PROJECT_ENGINEERING_TEAM).trim(),
    description: String(job.description || '').trim()
  };
  const idx = list.findIndex(j => j.id === id || j.title.toLowerCase() === title.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  saveJobTitles(list);
  return entry;
}

export function deleteJobTitle(id) {
  const list = loadJobTitles();
  if (list.length <= 1) return false;
  const next = list.filter(j => j.id !== id);
  saveJobTitles(next);
  return next.length < list.length;
}

export function normalizeUserRecord(u = {}, departments = loadDepartments()) {
  const deptCode = String(u.dept || 'MFG').toUpperCase();
  const deptObj = departments.find(d => d.code.toUpperCase() === deptCode);
  const name = String(u.name || '').trim();
  const initials = u.initials || name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 5) || 'USR';
  return {
    employeeId: u.employeeId || `IFM-${deptCode}-${String(Math.floor(100 + Math.random() * 900))}`,
    name,
    email: String(u.email || '').trim(),
    role: u.role || ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    jabatan: u.jabatan || 'Project Engineer',
    initials,
    dept: deptCode,
    departmentName: u.departmentName || deptObj?.name || deptCode,
    plantCode: u.plantCode || 'All Plants',
    phone: u.phone || '+62 21 5795-8822',
    status: u.status || 'Active',
    bio: u.bio || '',
    password: u.password || DEFAULT_PASSCODE
  };
}

export function loadUsers() {
  const depts = loadDepartments();
  const raw = readStorageArray(MASTER_STORAGE_KEYS.USERS, DEFAULT_TEAM_MEMBERS);
  return raw.map(u => normalizeUserRecord(u, depts));
}

export function saveUsers(list) {
  return writeStorageValue(MASTER_STORAGE_KEYS.USERS, list);
}

export function upsertUser(userData) {
  const list = loadUsers();
  const depts = loadDepartments();
  const normalized = normalizeUserRecord(userData, depts);
  if (!normalized.name || !normalized.email) return null;

  const idx = list.findIndex(
    u => u.email.toLowerCase() === normalized.email.toLowerCase() ||
         (userData.originalEmail && u.email.toLowerCase() === String(userData.originalEmail).toLowerCase()) ||
         (userData.employeeId && u.employeeId === userData.employeeId)
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...normalized };
  } else {
    list.push(normalized);
  }
  saveUsers(list);
  return normalized;
}

export function deleteUser(emailOrName) {
  const list = loadUsers();
  if (list.length <= 1) return false;
  const target = String(emailOrName || '').toLowerCase();
  const next = list.filter(u => u.email.toLowerCase() !== target && u.name.toLowerCase() !== target);
  saveUsers(next);
  return next.length < list.length;
}

export function verifyLoginCredentials(identifier, password) {
  const id = String(identifier || '').trim().toLowerCase();
  const pwd = String(password || '').trim();
  if (!id || !pwd) {
    return { valid: false, reason: 'Email / Username dan Password wajib diisi.' };
  }
  const users = loadUsers();
  const user = users.find(
    u => u.email.toLowerCase() === id ||
         u.name.toLowerCase() === id ||
         (u.employeeId && u.employeeId.toLowerCase() === id)
  );
  if (!user) {
    return { valid: false, reason: `Akun "${identifier}" tidak ditemukan di direktori IFM.` };
  }
  if (user.status === 'Inactive') {
    return { valid: false, reason: `Akun ${user.name} berstatus Non-Aktif. Hubungi Super Admin.` };
  }
  const expectedPwd = user.password || DEFAULT_PASSCODE;
  if (pwd !== expectedPwd && pwd !== DEFAULT_PASSCODE) {
    return { valid: false, reason: 'Password tidak sesuai. Gunakan password akun atau passcode standar perusahaan.' };
  }
  return { valid: true, user };
}

export function loadVendors() {
  return readStorageArray(MASTER_STORAGE_KEYS.VENDORS, DEFAULT_VENDORS);
}

export function saveVendors(list) {
  return writeStorageValue(MASTER_STORAGE_KEYS.VENDORS, list);
}

export function upsertVendor(vendor) {
  const list = loadVendors();
  const name = String(vendor.name || '').trim();
  if (!name) return null;
  const id = vendor.id || `v-${Date.now()}`;
  const certs = Array.isArray(vendor.certifications)
    ? vendor.certifications
    : String(vendor.certifications || 'ISO 9001').split(',').map(s => s.trim()).filter(Boolean);

  const entry = {
    id,
    vendorCode: String(vendor.vendorCode || `VND-${String(list.length + 1).padStart(3, '0')}`).trim().toUpperCase(),
    name,
    country: String(vendor.country || 'Indonesia').trim(),
    origin: ['Foreign', 'Local', 'Mixed'].includes(vendor.origin) ? vendor.origin : 'Foreign',
    equipmentType: String(vendor.equipmentType || 'Process Line').trim(),
    description: String(vendor.description || '').trim(),
    address: String(vendor.address || '').trim(),
    city: String(vendor.city || '').trim(),
    postalCode: String(vendor.postalCode || '').trim(),
    website: String(vendor.website || '').trim(),
    picName: String(vendor.picName || '').trim(),
    picRole: String(vendor.picRole || 'Account Manager').trim(),
    picEmail: String(vendor.picEmail || '').trim(),
    picPhone: String(vendor.picPhone || '').trim(),
    taxId: String(vendor.taxId || '').trim(),
    paymentCurrency: String(vendor.paymentCurrency || (vendor.origin === 'Local' ? 'IDR (Rupiah)' : 'USD / EUR')).trim(),
    leadTimeWeeks: String(vendor.leadTimeWeeks || '16 – 24 weeks').trim(),
    certifications: certs,
    status: String(vendor.status || 'Approved OEM').trim()
  };

  const idx = list.findIndex(v => v.id === id || v.name.toLowerCase() === name.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  saveVendors(list);
  return entry;
}

export function deleteVendor(idOrName) {
  const list = loadVendors();
  if (list.length <= 1) return false;
  const key = String(idOrName || '').toLowerCase();
  const next = list.filter(v => v.id !== idOrName && v.name.toLowerCase() !== key);
  saveVendors(next);
  return next.length < list.length;
}

export function loadPlants() {
  let overrides = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(MASTER_STORAGE_KEYS.PLANTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          overrides = parsed;
        }
      }
    }
  } catch (e) {}

  const merged = {};
  for (const [code, base] of Object.entries(PLANT_MATRIX_PROFILES)) {
    const ov = overrides[code] || {};
    merged[code] = {
      ...base,
      ...ov,
      addressDetail: {
        ...(base.addressDetail || {}),
        ...(ov.addressDetail || {})
      }
    };
  }
  return merged;
}

export function getPlantProfile(plantLocationOrCode = '1403') {
  const code = resolvePlantCode(plantLocationOrCode);
  const all = loadPlants();
  return all[code] || all['1403'];
}

export function upsertPlant(code, patch = {}) {
  const resolved = resolvePlantCode(code);
  const all = loadPlants();
  const current = all[resolved];
  if (!current) return null;

  const nextDetail = {
    ...(current.addressDetail || {}),
    ...(patch.addressDetail || {})
  };
  const composedAddress = patch.address ||
    [nextDetail.street, nextDetail.kelurahan, nextDetail.kecamatan, nextDetail.city, nextDetail.province, nextDetail.postalCode, nextDetail.country]
      .filter(Boolean)
      .join(', ');

  const updated = {
    ...current,
    ...patch,
    code: resolved,
    address: composedAddress || current.address,
    addressDetail: nextDetail
  };
  all[resolved] = updated;
  writeStorageValue(MASTER_STORAGE_KEYS.PLANTS, all);
  return updated;
}
