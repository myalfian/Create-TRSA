import { defaultTRSAProject } from '../data/defaultTRSA.js';
import { 
  ROLES,
  ORG_ROLES,
  ORG_ROLE_LIST,
  ROLE_CAPABILITIES,
  isSuperAdminRole,
  mapToLegacyRole,
  getCurrentRole, 
  setCurrentRole, 
  canEditCustomClearance, 
  canDeleteProject, 
  canChangeProjectStatus,
  sanitizeProject,
  sanitizeInput 
} from './security.js';
import {
  MASTER_STORAGE_KEYS,
  DEFAULT_PASSCODE,
  loadDepartments,
  upsertDepartment,
  deleteDepartment,
  loadJobTitles,
  upsertJobTitle,
  deleteJobTitle,
  loadUsers,
  upsertUser,
  deleteUser,
  verifyLoginCredentials,
  loadVendors,
  upsertVendor,
  deleteVendor,
  loadPlants,
  getPlantProfile,
  upsertPlant
} from './masterDataService.js';
import { 
  ACTIVITY_DOMAINS,
  ACTIVITY_DOMAIN_LABELS,
  createAuditEntry, 
  appendAuditLog, 
  getAuditLogs, 
  filterAuditLogs,
  computeActivityStats,
  getDistinctAuditActions,
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
import {
  getDraftHistory,
  getDraftById,
  saveDraftToHistory,
  deleteDraftFromHistory,
  clearDraftHistory,
  exportDraftHistoryJSON,
  formatDraftTimestamp,
  getDraftRelativeTime
} from './draftHistoryService.js';
import {
  validateField,
  validateProject,
  validateStep,
  getFieldError
} from './validationService.js';
import {
  AGREEMENT_STATUSES,
  computeAgreementStats,
  calculateProjectCompleteness,
  normalizeAgreementStatus,
  resolveProjectCreatedAt,
  formatAgreementDate,
  getRelativeAgreementAge
} from './dashboardStatsService.js';
import {
  TRSA_MATRIX_PDF_PATH,
  USER_ENGINEERING_PICS,
  PLANT_MATRIX_PROFILES,
  DOCUMENT_SUBMISSION_COMPLIANCE,
  CONFIDENTIALITY_STANDARD,
  LANGUAGE_REQUIREMENT_STANDARD,
  SERVICES_SCOPE_STANDARD,
  ANCILLARIES_LOGISTICS_STANDARD,
  TECHNICAL_HYGIENIC_REQUIREMENTS_12,
  CONTROL_SYSTEM_ACCESS_RIGHTS,
  FINAL_ACCEPTANCE_RULES,
  REMEDIES_CONSEQUENCES_STANDARD,
  MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN,
  MATRIX_ENGINEERING_SERVICES_PAYMENT,
  INVOICING_AND_BG_CONDITIONS,
  SHIPMENT_DELIVERY_ITEMS_5,
  WARRANTY_STANDARD,
  REQUIRED_DOCUMENTATION_13,
  APPENDICES_6,
  TRSA_COMPLIANCE_MATRIX,
  resolvePlantCode,
  normalizeOriginMode,
  isClauseApplicable,
  getApplicableMatrixClauses,
  resolveContactsForPlant,
  buildLegalAndTaxProvisions,
  getShipmentTermsForMatrix,
  auditProjectMatrixCompliance
} from './trsaMatrixService.js';
import {
  MATRIX_PLANT_CODES,
  MATRIX_ORIGIN_MODES,
  MATRIX_USER_PRESETS,
  getAllMatrixClauseIds,
  getUserSettingKey,
  loadUserMatrixSettings,
  getUserMatrixSetting,
  isUserSettingCustomized,
  updateUserMatrixSetting,
  toggleUserPlantAccess,
  toggleUserOriginAccess,
  toggleUserClauseAccess,
  applyPresetToUserMatrix,
  resetUserMatrixSetting,
  resetAllUserMatrixSettings,
  isPlantAllowedForUser,
  isOriginAllowedForUser,
  isClauseAssignedToUser
} from './userMatrixSettingsService.js';

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorClass(fieldKey, validationResult) {
  return getFieldError(validationResult, fieldKey) ? 'corp-input-error' : '';
}

function buildErrorInnerHtml(msg) {
  if (!msg) return '';
  return `<svg class="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>${escapeHtml(msg)}</span>`;
}

function renderErrorMsg(fieldKey, validationResult, darkTheme = false) {
  const msg = getFieldError(validationResult, fieldKey);
  return `<p data-error-for="${escapeHtml(fieldKey)}" class="field-error-msg ${msg ? '' : 'hidden'} ${darkTheme ? '!text-red-300' : ''}">${buildErrorInnerHtml(msg)}</p>`;
}

function updateValidationIndicatorsInPlace(project, fieldKey, value, sourceEl = null, context = {}) {
  if (typeof document === 'undefined' || !project) return;
  const fieldRes = validateField(fieldKey, value, context);
  const targets = document.querySelectorAll(`[data-validation-key="${fieldKey}"]`);
  const els = targets.length > 0 ? Array.from(targets) : (sourceEl ? [sourceEl] : []);

  els.forEach(el => {
    if (fieldRes.valid) {
      el.classList.remove('corp-input-error');
      el.removeAttribute('aria-invalid');
    } else {
      el.classList.add('corp-input-error');
      el.setAttribute('aria-invalid', 'true');
    }
    if (sourceEl && el !== sourceEl && el.tagName === sourceEl.tagName && typeof sourceEl.value === 'string' && el.value !== sourceEl.value) {
      el.value = sourceEl.value;
    }
  });

  document.querySelectorAll(`[data-error-for="${fieldKey}"]`).forEach(errEl => {
    if (fieldRes.valid) {
      errEl.classList.add('hidden');
      errEl.innerHTML = '';
    } else {
      errEl.classList.remove('hidden');
      errEl.innerHTML = buildErrorInnerHtml(fieldRes.message);
    }
  });

  const full = validateProject(project);
  for (let s = 1; s <= 6; s++) {
    const count = full.byStep[s]?.length || 0;
    const badge = document.querySelector(`[data-step-error-badge="${s}"]`);
    if (badge) {
      if (count > 0) {
        badge.classList.remove('hidden');
        badge.textContent = String(count);
      } else {
        badge.classList.add('hidden');
        badge.textContent = '0';
      }
    }
  }

  const pill = document.getElementById('builder-validation-pill');
  if (pill) {
    if (full.valid) {
      pill.className = 'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 transition-all';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>All required fields valid</span>`;
    } else {
      pill.className = 'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer transition-all';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span>${full.totalErrors} required field${full.totalErrors > 1 ? 's' : ''} invalid</span>`;
    }
  }

  const banner = document.getElementById('builder-validation-banner');
  if (banner) {
    if (full.valid) {
      banner.classList.add('hidden');
    } else if (store?.showValidationSummary) {
      banner.classList.remove('hidden');
      const countEl = banner.querySelector('[data-validation-banner-count]');
      if (countEl) {
        countEl.textContent = `Incomplete Corporate Specifications (${full.totalErrors} Required Field${full.totalErrors > 1 ? 's' : ''})`;
      }
      const chipsEl = banner.querySelector('[data-validation-banner-chips]');
      if (chipsEl) {
        chipsEl.innerHTML = `${full.errors.slice(0, 12).map(err => `
          <button
            type="button"
            onclick="window.TRSA.focusValidationIssue(${err.step}, '${escapeHtml(err.fieldKey)}')"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
            title="${escapeHtml(err.message)}"
          >
            <span class="font-mono text-[10px] font-bold text-red-500">S${err.step}</span>
            <span>${escapeHtml(err.label)}</span>
          </button>
        `).join('')}${full.errors.length > 12 ? `<span class="text-[11px] font-semibold text-red-700 px-2 py-1">+${full.errors.length - 12} more</span>` : ''}`;
      }
    }
  }
}

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

// Master Plant Directory & Invoicing Database (Synced with IFM TRSA Matrix)
export const PLANT_DATABASE = PLANT_MATRIX_PROFILES;

export function getPlantDatabase(plantLocationOrCode = '') {
  return getPlantProfile(plantLocationOrCode);
}

// Master Vendor Procurement Origin Matrix & Standards
export const VENDOR_ORIGIN_CONFIG = {
  Foreign: {
    origin: 'Foreign',
    label: 'Foreign (International OEM)',
    badgeClass: 'bg-sky-50 text-[#0284C7] border border-sky-200',
    description: 'International OEM. CIF/CIP Port/Site w/ EXW lead time, 30/55/10/5 T/T w/ SWIFT APBG, PPh 26/PMK 35/2019 (1411), 14-day free demurrage & Working Visas.',
    currency: 'USD / EUR',
    defaultShipment: getShipmentTermsForMatrix('1403', 'Foreign'),
    defaultProvisions: buildLegalAndTaxProvisions('1411', 'Foreign')
  },
  Local: {
    origin: 'Local',
    label: 'Local (Domestic Indonesian Vendor)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    description: 'Domestic Indonesian vendor. Franco Site delivery in IDR, PPN/PPh per Company KLU Code, PP 44/2022 Pasal 23 Ayat (2) commercial DPP + Faktur Pajak, Kwitansi + Materai.',
    currency: 'IDR (Rupiah)',
    defaultShipment: getShipmentTermsForMatrix('1403', 'Local'),
    defaultProvisions: buildLegalAndTaxProvisions('1403', 'Local')
  },
  Mixed: {
    origin: 'Mixed',
    label: 'Mixed (Dual Sourcing: Foreign & Local)',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    description: 'Hybrid sourcing model: Offshore core equipment (CIF/CIP, PPh 26/PMK 35/2019) paired with onshore fabrication/installation (Franco Site, IDR, KLU, PP 44/2022).',
    currency: 'USD/EUR (Import Equipment) & IDR (Local Scope)',
    defaultShipment: getShipmentTermsForMatrix('1403', 'Mixed'),
    defaultProvisions: [
      {
        matrixId: 'XVI.mixed',
        title: 'Separation of Offshore Supply & Onshore Scope',
        description: 'Contracts and commercial quotations are strictly itemized between Offshore Equipment Supply (USD/EUR) and Onshore Local Works/Services (IDR).'
      },
      ...buildLegalAndTaxProvisions('1411', 'Foreign').filter(p => p.matrixId === 'XVI.duty' || p.matrixId === 'XVI.pph26'),
      ...buildLegalAndTaxProvisions('1403', 'Local')
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
  const allVendors = loadVendors();
  return allVendors.find(v => v.name.toLowerCase() === vendorName.trim().toLowerCase()) ||
    VENDOR_DATABASE.find(v => v.name.toLowerCase() === vendorName.trim().toLowerCase()) ||
    null;
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

export function syncPlantContacts(plantLocationOrCode, project) {
  if (!project) return [];
  const resolved = resolveContactsForPlant(plantLocationOrCode);
  const existing = Array.isArray(project.keyContacts) ? project.keyContacts : [];
  const customContacts = existing.filter(c => c && !String(c.id || '').startsWith('matrix-'));
  project.keyContacts = [...JSON.parse(JSON.stringify(resolved.contacts)), ...customContacts];
  return project.keyContacts;
}

export function ensureProjectMatrixDefaults(project) {
  if (!project || typeof project !== 'object') return project;
  ensureGeneralInfo(project);
  if (!project.createdAt) {
    project.createdAt = resolveProjectCreatedAt(project) || new Date().toISOString();
  }
  if (!project.updatedAt) {
    project.updatedAt = project.createdAt;
  }

  const plantCode = resolvePlantCode(project.documentInfo?.plantLocation || project.generalInfo?.plantLocation || '1403');
  const plantProfile = PLANT_MATRIX_PROFILES[plantCode] || PLANT_MATRIX_PROFILES['1403'];
  const origin = normalizeOriginMode(project.documentInfo?.vendorOrigin || project.commercialTerms?.vendorOrigin || 'Foreign');

  project.projectOverview = project.projectOverview || {};
  if (!project.projectOverview.confidentialityClause) {
    project.projectOverview.confidentialityClause = CONFIDENTIALITY_STANDARD;
  }
  if (!project.projectOverview.languageRequirement) {
    project.projectOverview.languageRequirement = LANGUAGE_REQUIREMENT_STANDARD;
  }

  project.siteDescription = project.siteDescription || {};
  if (!project.siteDescription.invoiceRecipient) {
    project.siteDescription.invoiceRecipient = plantProfile.invoiceRecipient;
  }
  if (!project.siteDescription.address) {
    project.siteDescription.address = plantProfile.address;
  }
  if (!project.siteDescription.deliveryPort) {
    project.siteDescription.deliveryPort = plantProfile.deliveryPort;
  }
  if (!Array.isArray(project.siteDescription.purchasingAttn) || project.siteDescription.purchasingAttn.length === 0) {
    project.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(plantProfile.purchasingAttn));
  }
  if (!project.siteDescription.customClearanceNote) {
    project.siteDescription.customClearanceNote = plantProfile.customClearanceNote;
  }
  if (!project.siteDescription.documentSubmissionCompliance) {
    project.siteDescription.documentSubmissionCompliance = DOCUMENT_SUBMISSION_COMPLIANCE;
  }

  project.scopeOfSupply = project.scopeOfSupply || { fryer: [], seasoning: [] };
  if (!Array.isArray(project.scopeOfSupply.servicesScope) || project.scopeOfSupply.servicesScope.length === 0) {
    project.scopeOfSupply.servicesScope = JSON.parse(JSON.stringify(SERVICES_SCOPE_STANDARD));
  }
  if (!Array.isArray(project.scopeOfSupply.ancillariesAndLogistics) || project.scopeOfSupply.ancillariesAndLogistics.length === 0) {
    project.scopeOfSupply.ancillariesAndLogistics = [...ANCILLARIES_LOGISTICS_STANDARD];
  }
  if (!Array.isArray(project.scopeOfSupply.controlSystemAccess) || project.scopeOfSupply.controlSystemAccess.length === 0) {
    project.scopeOfSupply.controlSystemAccess = JSON.parse(JSON.stringify(CONTROL_SYSTEM_ACCESS_RIGHTS));
  }

  project.hygieneAndQuality = project.hygieneAndQuality || {};
  if (!Array.isArray(project.hygieneAndQuality.generalTechnicalHygienic12) || project.hygieneAndQuality.generalTechnicalHygienic12.length === 0) {
    project.hygieneAndQuality.generalTechnicalHygienic12 = JSON.parse(JSON.stringify(TECHNICAL_HYGIENIC_REQUIREMENTS_12));
  }

  project.performanceAcceptance = project.performanceAcceptance || {};
  if (!Array.isArray(project.performanceAcceptance.finalAcceptanceChecklist) || project.performanceAcceptance.finalAcceptanceChecklist.length === 0) {
    project.performanceAcceptance.finalAcceptanceChecklist = JSON.parse(JSON.stringify(FINAL_ACCEPTANCE_RULES));
  }
  if (!Array.isArray(project.performanceAcceptance.remediesAndConsequences) || project.performanceAcceptance.remediesAndConsequences.length === 0) {
    project.performanceAcceptance.remediesAndConsequences = JSON.parse(JSON.stringify(REMEDIES_CONSEQUENCES_STANDARD));
  }

  project.commercialTerms = project.commercialTerms || {};
  if (!project.commercialTerms.selectedPaymentOption) {
    project.commercialTerms.selectedPaymentOption = 'Matrix Standard';
  }
  if (!Array.isArray(project.commercialTerms.matrixEquipmentSchedule) || project.commercialTerms.matrixEquipmentSchedule.length === 0) {
    project.commercialTerms.matrixEquipmentSchedule = JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN));
  }
  project.commercialTerms.options = project.commercialTerms.options || {};
  if (!project.commercialTerms.options.matrixStandard) {
    project.commercialTerms.options.matrixStandard = {
      title: 'IFM Compliance Matrix Standard (T/T & SWIFT APBG)',
      breakdown: JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN))
    };
  }
  if (!project.commercialTerms.engineeringServicesPayment) {
    project.commercialTerms.engineeringServicesPayment = MATRIX_ENGINEERING_SERVICES_PAYMENT;
  }
  if (!Array.isArray(project.commercialTerms.invoicingAndBankGuarantee) || project.commercialTerms.invoicingAndBankGuarantee.length === 0) {
    project.commercialTerms.invoicingAndBankGuarantee = [...INVOICING_AND_BG_CONDITIONS];
  }
  if (!Array.isArray(project.commercialTerms.shipmentItems) || project.commercialTerms.shipmentItems.length === 0) {
    project.commercialTerms.shipmentItems = JSON.parse(JSON.stringify(SHIPMENT_DELIVERY_ITEMS_5));
  }
  if (!project.commercialTerms.warranty) {
    project.commercialTerms.warranty = WARRANTY_STANDARD;
  }

  if (!Array.isArray(project.legalAndTaxProvisions) || project.legalAndTaxProvisions.length === 0) {
    project.legalAndTaxProvisions = buildLegalAndTaxProvisions(plantCode, origin);
  }
  if (!Array.isArray(project.requiredDocumentation) || project.requiredDocumentation.length === 0) {
    project.requiredDocumentation = JSON.parse(JSON.stringify(REQUIRED_DOCUMENTATION_13));
  }
  if (!Array.isArray(project.appendices) || project.appendices.length === 0) {
    project.appendices = JSON.parse(JSON.stringify(APPENDICES_6));
  }

  return project;
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

export const AUTO_SAVE_INTERVAL_MS = 30000;

// Application State Management
export class TRSAStore {
  constructor() {
    this.STORAGE_KEY = 'TRSA_ENTERPRISE_PROJECTS_V1';
    this.USER_STORAGE_KEY = 'TRSA_LOGGED_IN_USER_V1';
    this.AUTH_SESSION_KEY = MASTER_STORAGE_KEYS.AUTH_SESSION;
    this.PROGRESS_STORAGE_KEY = 'TRSA_FORM_PROGRESS_V1';
    this.departments = loadDepartments();
    this.jobTitles = loadJobTitles();
    this.teamMembers = loadUsers();
    this.vendors = loadVendors();
    this.plants = loadPlants();
    this.currentUser = this.loadUser();
    this.isAuthenticated = this.loadAuthSession();
    this.loginError = '';
    this.showForgotHint = false;
    this.showQuickLoginPanel = false;
    this.showUserMenu = false;
    this.showSupabaseModal = false;
    this.showAuditModal = false;
    this.showPdfModal = false;
    this.confirmDeleteProjectId = null;
    this.confirmBulkDelete = false;
    this.selectedProjectIds = [];
    this.dashboardSort = 'recent';
    this.matrixSubTab = 'matrix'; // 'matrix' | 'users'
    this.selectedMatrixUserKey = getUserSettingKey(this.teamMembers[1] || this.teamMembers[0]);
    this.userMatrixSearch = '';
    this.matrixClauseScopeFilter = 'all'; // 'all' | 'assigned'
    this.directoryTab = 'users'; // 'users' | 'vendors' | 'plants' | 'org'
    this.selectedDirectoryUserEmail = (this.teamMembers[0] || {}).email || '';
    this.selectedDirectoryVendorId = (this.vendors[0] || {}).id || 'v-01';
    this.selectedDirectoryPlantCode = '1403';
    this.directorySearch = '';
    this.directoryRoleFilter = 'all';
    this.directoryVendorOriginFilter = 'all';
    this.showAddUserForm = false;
    this.editingUserEmail = null;
    this.showAddVendorForm = false;
    this.editingVendorId = null;
    this.editingPlantCode = null;
    this.showAddDeptForm = false;
    this.editingDeptCode = null;
    this.showAddJobForm = false;
    this.editingJobId = null;
    this.auditSearchQuery = '';
    this.auditProjectFilter = 'all';
    this.auditDomainFilter = ACTIVITY_DOMAINS.ALL;
    this.auditActionFilter = 'all';
    this.auditSeverityFilter = 'all';
    this.auditDateFrom = '';
    this.auditDateTo = '';
    this.historySearchQuery = '';
    this.historyFilter = 'all';
    this.confirmClearHistory = false;
    this.showValidationSummary = false;
    this.autoSaveTimer = null;
    this.autoSaveIntervalId = null;
    this.autoSaveIntervalMs = AUTO_SAVE_INTERVAL_MS;
    this.autoSaveEnabled = true;
    this.lastAutoSavedAt = null;
    this.lastProjectSnapshots = {};

    this.projects = this.loadProjects();
    this.activeProjectId = this.projects[0]?.id || 'trsa-006-ifm-2024';
    this.currentView = 'dashboard'; // 'dashboard' | 'projects' | 'history' | 'directory' | 'activity' | 'matrix' | 'builder' | 'studio'
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
          { name: 'Refin A Putra', role: ORG_ROLES.PROJECT_ENGINEERING_TEAM, dept: 'MFG', initials: 'RAP' },
          p0.documentInfo?.docNumber
        );
        appendAuditLog(seedEntry);
      }
    }
    this._initialized = true;
  }

  logActivity(action, diffs = [], meta = {}) {
    const active = meta.project || this.getActiveProject();
    const user = meta.user || this.getCurrentUser() || {};
    const entry = createAuditEntry(
      meta.projectId || active?.id || 'workspace',
      action,
      diffs,
      {
        name: user.name || 'System User',
        role: user.role || (this.isAdmin() ? ORG_ROLES.SUPER_ADMIN : ORG_ROLES.PROJECT_ENGINEERING_TEAM),
        dept: user.dept || 'MFG',
        email: user.email || '',
        initials: user.initials || getInitials(user.name || 'IFM')
      },
      meta.projectDocNumber !== undefined ? meta.projectDocNumber : (active?.documentInfo?.docNumber || ''),
      meta
    );
    return appendAuditLog(entry);
  }

  refreshMasterData() {
    this.departments = loadDepartments();
    this.jobTitles = loadJobTitles();
    this.teamMembers = loadUsers();
    this.vendors = loadVendors();
    this.plants = loadPlants();
  }

  loadAuthSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.AUTH_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Boolean(parsed && parsed.authenticated && parsed.email);
        }
      }
    } catch (e) {}
    return false;
  }

  takeSnapshot(project) {
    if (!project || !project.id) return;
    this.lastProjectSnapshots[project.id] = JSON.parse(JSON.stringify(project));
  }

  loadUser() {
    const members = loadUsers();
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.USER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name) {
            const matched = members.find(
              m => (parsed.email && m.email.toLowerCase() === parsed.email.toLowerCase()) ||
                   m.name.toLowerCase() === parsed.name.toLowerCase()
            );
            return matched || parsed;
          }
        }
      }
    } catch (e) {}
    return members[0] || this.teamMembers[0];
  }

  setCurrentUser(user, options = {}) {
    const prevUser = this.currentUser ? { ...this.currentUser } : null;
    this.teamMembers = loadUsers();
    if (typeof user === 'string') {
      const found = this.teamMembers.find(
        m => m.name.toLowerCase() === user.toLowerCase() || m.email.toLowerCase() === user.toLowerCase()
      );
      this.currentUser = found || {
        name: user,
        email: '',
        role: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
        jabatan: 'Project Engineer',
        initials: getInitials(user),
        dept: 'MFG',
        departmentName: 'Manufacturing & Project Engineering',
        plantCode: '1403'
      };
    } else if (user && user.name) {
      this.currentUser = user;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      }
    } catch (e) {}
    setCurrentRole(mapToLegacyRole(this.currentUser.role));
    if (this._initialized && !options.silentLog && prevUser && prevUser.name !== this.currentUser.name) {
      this.logActivity('USER_SWITCH', [{
        category: 'Session Switch',
        description: `Switched active workspace user session to ${this.currentUser.name}`,
        from: `${prevUser.name} (${prevUser.role || 'User'})`,
        to: `${this.currentUser.name} (${this.currentUser.role || 'User'})`
      }], { targetEntity: this.currentUser.email || this.currentUser.name });
    }
    this.showNotification(`Active user session: ${this.currentUser.name} (${this.currentUser.role})`, 'info');
  }

  login(identifier, password) {
    const res = verifyLoginCredentials(identifier, password);
    if (!res.valid) {
      this.loginError = res.reason;
      this.logActivity('USER_LOGIN_FAILED', [{
        category: 'Authentication Security',
        description: `Failed sign-in attempt for "${identifier || '(empty)'}"`,
        from: 'Login Gate',
        to: res.reason
      }], {
        user: { name: identifier || 'Unknown Actor', role: 'Unauthenticated', dept: 'N/A', initials: 'SEC' },
        targetEntity: identifier || 'Auth Gate',
        severity: 'security'
      });
      return { success: false, message: res.reason };
    }
    this.loginError = '';
    this.isAuthenticated = true;
    this.showQuickLoginPanel = false;
    this.showForgotHint = false;
    this.setCurrentUser(res.user, { silentLog: true });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          this.AUTH_SESSION_KEY,
          JSON.stringify({
            authenticated: true,
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            loggedInAt: new Date().toISOString()
          })
        );
      }
    } catch (e) {}
    const active = this.getActiveProject();
    if (active) {
      appendAuditLog(createAuditEntry(
        active.id,
        'USER_LOGIN',
        [{
          category: 'Authentication',
          description: `User signed in: ${res.user.name} (${res.user.jabatan} · ${res.user.dept})`,
          from: 'Signed Out',
          to: res.user.role
        }],
        res.user,
        active.documentInfo?.docNumber,
        { targetEntity: res.user.email || res.user.name }
      ));
    }
    this.showNotification(`Selamat datang, ${res.user.name} (${res.user.role})`, 'success');
    return { success: true, user: res.user };
  }

  loginAsQuickUser(emailOrName) {
    this.teamMembers = loadUsers();
    const user = this.teamMembers.find(
      m => m.email.toLowerCase() === String(emailOrName || '').toLowerCase() ||
           m.name.toLowerCase() === String(emailOrName || '').toLowerCase()
    );
    if (!user) return { success: false, message: 'User not found.' };
    return this.login(user.email, user.password || DEFAULT_PASSCODE);
  }

  logout() {
    const prev = this.getCurrentUser();
    this.isAuthenticated = false;
    this.showUserMenu = false;
    this.loginError = '';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.AUTH_SESSION_KEY);
      }
    } catch (e) {}
    const active = this.getActiveProject();
    if (active && prev) {
      appendAuditLog(createAuditEntry(
        active.id,
        'USER_LOGOUT',
        [{
          category: 'Authentication',
          description: `User signed out: ${prev.name}`,
          from: prev.role,
          to: 'Signed Out'
        }],
        prev,
        active.documentInfo?.docNumber
      ));
    }
    return true;
  }

  getCurrentUser() {
    return this.currentUser || this.teamMembers[0];
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return isSuperAdminRole(user?.role) || isSuperAdminRole(user?.name);
  }

  saveUserRecord(userData) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin (Project & Engineering Manager) yang dapat mengelola User.', 'error');
      return null;
    }
    const saved = upsertUser(userData);
    if (!saved) {
      this.showNotification('Nama dan Email corporate wajib diisi.', 'error');
      return null;
    }
    this.refreshMasterData();
    if (this.currentUser && (
      this.currentUser.email.toLowerCase() === saved.email.toLowerCase() ||
      (userData.originalEmail && this.currentUser.email.toLowerCase() === String(userData.originalEmail).toLowerCase())
    )) {
      this.currentUser = saved;
    }
    this.selectedDirectoryUserEmail = saved.email;
    const active = this.getActiveProject();
    if (active) {
      appendAuditLog(createAuditEntry(
        active.id,
        'MASTER_USER_UPDATE',
        [{
          category: 'User Directory',
          description: `Saved user ${saved.name} (${saved.jabatan} · ${saved.dept})`,
          from: 'User Directory',
          to: `${saved.role} | Plant ${saved.plantCode}`
        }],
        this.getCurrentUser(),
        active.documentInfo?.docNumber
      ));
    }
    this.showNotification(`User "${saved.name}" (${saved.role}) tersimpan.`, 'success');
    return saved;
  }

  removeUserRecord(emailOrName) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat menghapus user.', 'error');
      return false;
    }
    const cur = this.getCurrentUser();
    if (cur && (cur.email.toLowerCase() === String(emailOrName).toLowerCase() || cur.name.toLowerCase() === String(emailOrName).toLowerCase())) {
      this.showNotification('Tidak dapat menghapus user yang sedang aktif login.', 'error');
      return false;
    }
    const removedTarget = this.teamMembers.find(
      m => m.email.toLowerCase() === String(emailOrName).toLowerCase() || m.name.toLowerCase() === String(emailOrName).toLowerCase()
    );
    const ok = deleteUser(emailOrName);
    if (ok) {
      this.refreshMasterData();
      this.selectedDirectoryUserEmail = this.teamMembers[0]?.email || '';
      this.logActivity('MASTER_USER_DELETE', [{
        category: 'User Directory',
        description: `Removed user "${removedTarget?.name || emailOrName}" from IFM directory`,
        from: `${removedTarget?.name || emailOrName} (${removedTarget?.role || 'Active'})`,
        to: 'Removed'
      }], { targetEntity: removedTarget?.email || emailOrName });
      this.showNotification('User berhasil dihapus dari direktori.', 'info');
    }
    return ok;
  }

  saveVendorRecord(vendorData) {
    if (!this.isAdmin() && !String(this.getCurrentUser()?.role || '').toLowerCase().includes('purchasing') && !String(this.getCurrentUser()?.role || '').toLowerCase().includes('engineering')) {
      this.showNotification('Akses ditolak untuk mengubah data Vendor.', 'error');
      return null;
    }
    const saved = upsertVendor(vendorData);
    if (!saved) {
      this.showNotification('Nama Vendor wajib diisi.', 'error');
      return null;
    }
    this.refreshMasterData();
    this.selectedDirectoryVendorId = saved.id;
    const active = this.getActiveProject();
    if (active) {
      appendAuditLog(createAuditEntry(
        active.id,
        'MASTER_VENDOR_UPDATE',
        [{
          category: 'Vendor Directory',
          description: `Saved vendor ${saved.name} (${saved.vendorCode})`,
          from: 'Vendor Master',
          to: `${saved.origin} | ${saved.country}`
        }],
        this.getCurrentUser(),
        active.documentInfo?.docNumber,
        { targetEntity: saved.name }
      ));
    }
    this.showNotification(`Detail Vendor "${saved.name}" tersimpan.`, 'success');
    return saved;
  }

  removeVendorRecord(idOrName) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat menghapus vendor.', 'error');
      return false;
    }
    const targetVendor = this.vendors.find(v => v.id === idOrName || v.name.toLowerCase() === String(idOrName).toLowerCase());
    const ok = deleteVendor(idOrName);
    if (ok) {
      this.refreshMasterData();
      this.selectedDirectoryVendorId = this.vendors[0]?.id || '';
      this.logActivity('MASTER_VENDOR_DELETE', [{
        category: 'Vendor Directory',
        description: `Removed vendor "${targetVendor?.name || idOrName}" from Master Directory`,
        from: targetVendor?.vendorCode || idOrName,
        to: 'Removed'
      }], { targetEntity: targetVendor?.name || idOrName });
      this.showNotification('Vendor dihapus dari Master Directory.', 'info');
    }
    return ok;
  }

  savePlantDetail(code, patch) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat mengubah detail alamat Plant.', 'error');
      return null;
    }
    const saved = upsertPlant(code, patch);
    if (!saved) return null;
    this.refreshMasterData();
    const active = this.getActiveProject();
    if (active) {
      if (resolvePlantCode(active.documentInfo?.plantLocation) === saved.code) {
        active.siteDescription = active.siteDescription || {};
        active.siteDescription.address = saved.address;
        active.siteDescription.deliveryPort = saved.deliveryPort;
        active.siteDescription.invoiceRecipient = saved.invoiceRecipient;
      }
      appendAuditLog(createAuditEntry(
        active.id,
        'MASTER_PLANT_UPDATE',
        [{
          category: 'Plant Detail Address',
          description: `Updated detailed address & facility profile for Plant ${saved.code} (${saved.plantName})`,
          from: 'Plant Master',
          to: saved.address
        }],
        this.getCurrentUser(),
        active.documentInfo?.docNumber,
        { targetEntity: `Plant ${saved.code}` }
      ));
    }
    this.showNotification(`Detail Alamat Plant ${saved.code} (${saved.plantName}) diperbarui.`, 'success');
    return saved;
  }

  saveDepartmentRecord(dept) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat mengelola Department.', 'error');
      return null;
    }
    const saved = upsertDepartment(dept);
    if (!saved) {
      this.showNotification('Kode & Nama Department wajib diisi.', 'error');
      return null;
    }
    this.refreshMasterData();
    this.logActivity('MASTER_DEPT_UPDATE', [{
      category: 'Department Master',
      description: `Saved department ${saved.code} — ${saved.name}`,
      from: 'Department Directory',
      to: `${saved.code} (${saved.costCenter})`
    }], { targetEntity: saved.code });
    this.showNotification(`Department "${saved.code} - ${saved.name}" tersimpan.`, 'success');
    return saved;
  }

  removeDepartmentRecord(code) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat menghapus Department.', 'error');
      return false;
    }
    const prevDept = this.departments.find(d => d.code.toUpperCase() === String(code).toUpperCase());
    const ok = deleteDepartment(code);
    if (ok) {
      this.refreshMasterData();
      this.logActivity('MASTER_DEPT_DELETE', [{
        category: 'Department Master',
        description: `Deleted department ${code}`,
        from: `${prevDept?.code || code} - ${prevDept?.name || ''}`,
        to: 'Removed'
      }], { targetEntity: code });
      this.showNotification(`Department ${code} dihapus.`, 'info');
    }
    return ok;
  }

  saveJobTitleRecord(job) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat mengelola Jabatan User.', 'error');
      return null;
    }
    const saved = upsertJobTitle(job);
    if (!saved) {
      this.showNotification('Nama Jabatan wajib diisi.', 'error');
      return null;
    }
    this.refreshMasterData();
    this.logActivity('MASTER_JOB_UPDATE', [{
      category: 'Jabatan Master',
      description: `Saved job title ${saved.title} (${saved.code})`,
      from: 'Jabatan Master',
      to: `${saved.defaultDept} · ${saved.defaultRole}`
    }], { targetEntity: saved.title });
    this.showNotification(`Jabatan "${saved.title}" tersimpan.`, 'success');
    return saved;
  }

  removeJobTitleRecord(id) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Super Admin yang dapat menghapus Jabatan.', 'error');
      return false;
    }
    const prevJob = this.jobTitles.find(j => j.id === id);
    const ok = deleteJobTitle(id);
    if (ok) {
      this.refreshMasterData();
      this.logActivity('MASTER_JOB_DELETE', [{
        category: 'Jabatan Master',
        description: `Deleted job title "${prevJob?.title || id}"`,
        from: prevJob?.title || id,
        to: 'Removed'
      }], { targetEntity: prevJob?.title || id });
      this.showNotification('Jabatan berhasil dihapus.', 'info');
    }
    return ok;
  }

  getCurrentUserMatrixSetting() {
    return getUserMatrixSetting(this.getCurrentUser(), this.teamMembers);
  }

  getAllUserMatrixSettings() {
    return loadUserMatrixSettings(this.teamMembers);
  }

  updateMatrixSettingsForUser(targetUserKey, patch = {}) {
    if (!this.isAdmin()) {
      this.logActivity('MATRIX_POLICY_BLOCK', [{
        category: 'Compliance Matrix RBAC',
        description: `Unauthorized attempt to modify Compliance Matrix settings for ${targetUserKey}`,
        from: this.getCurrentUser()?.role || 'Non-Admin',
        to: 'Blocked (Super Admin Required)'
      }], { targetEntity: targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, severity: 'security' });
      this.showNotification('Hanya Admin (Manager) yang dapat mengubah pengaturan Compliance Matrix user.', 'error');
      return null;
    }
    const adminUser = this.getCurrentUser();
    const adminName = adminUser?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = updateUserMatrixSetting(targetUserKey, patch, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    const active = this.getActiveProject();
    if (active) {
      const entry = createAuditEntry(
        active.id,
        'USER_MATRIX_SETTING',
        [{
          category: 'User Matrix Config',
          description: `Updated Compliance Matrix settings for ${updated.name || targetUserKey}`,
          from: `View:${before.canViewMatrix} Edit:${before.canEditMatrix} Align:${before.canAlignMatrix} · Plants [${before.allowedPlants.join(', ')}] · Clauses ${before.assignedClauses.length}/${getAllMatrixClauseIds().length}`,
          to: `View:${updated.canViewMatrix} Edit:${updated.canEditMatrix} Align:${updated.canAlignMatrix} · Plants [${updated.allowedPlants.join(', ')}] · Origins [${updated.allowedOrigins.join(', ')}] · Clauses ${updated.assignedClauses.length}/${getAllMatrixClauseIds().length}`
        }],
        {
          name: adminName,
          role: adminUser?.role || ORG_ROLES.SUPER_ADMIN,
          dept: adminUser?.dept || 'MFG',
          email: adminUser?.email || '',
          initials: adminUser?.initials || 'MYA'
        },
        active.documentInfo?.docNumber,
        { targetEntity: updated.name || targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX }
      );
      appendAuditLog(entry);
    }
    return updated;
  }

  toggleMatrixPlantForUser(targetUserKey, plantCode) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat mengubah akses Plant pada user.', 'error');
      return null;
    }
    const adminName = this.getCurrentUser()?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = toggleUserPlantAccess(targetUserKey, plantCode, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    if (before.allowedPlants.join(',') === updated.allowedPlants.join(',')) {
      this.showNotification('Minimal 1 Plant harus diaktifkan untuk user ini.', 'info');
      return updated;
    }
    this.logActivity('MATRIX_PLANT_ACCESS', [{
      category: 'Plant Matrix Scope',
      description: `Toggled Plant ${plantCode} access for ${updated.name || targetUserKey}`,
      from: `[${before.allowedPlants.join(', ')}]`,
      to: `[${updated.allowedPlants.join(', ')}]`
    }], { targetEntity: updated.name || targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    this.showNotification(`Akses Plant untuk ${updated.name}: ${updated.allowedPlants.join(', ')}`, 'success');
    return updated;
  }

  toggleMatrixOriginForUser(targetUserKey, origin) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat mengubah akses Origin pada user.', 'error');
      return null;
    }
    const adminName = this.getCurrentUser()?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = toggleUserOriginAccess(targetUserKey, origin, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    if (before.allowedOrigins.join(',') === updated.allowedOrigins.join(',')) {
      this.showNotification('Minimal 1 Vendor Origin harus diaktifkan untuk user ini.', 'info');
      return updated;
    }
    this.logActivity('MATRIX_ORIGIN_ACCESS', [{
      category: 'Origin Matrix Scope',
      description: `Toggled Vendor Origin "${origin}" access for ${updated.name || targetUserKey}`,
      from: `[${before.allowedOrigins.join(', ')}]`,
      to: `[${updated.allowedOrigins.join(', ')}]`
    }], { targetEntity: updated.name || targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    this.showNotification(`Akses Origin untuk ${updated.name}: ${updated.allowedOrigins.join(', ')}`, 'success');
    return updated;
  }

  toggleMatrixClauseForUser(targetUserKey, clauseId) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat mengubah cakupan Klausul Matrix user.', 'error');
      return null;
    }
    const adminName = this.getCurrentUser()?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = toggleUserClauseAccess(targetUserKey, clauseId, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    const enabled = updated.assignedClauses.includes(clauseId);
    this.logActivity('MATRIX_CLAUSE_ACCESS', [{
      category: 'Clause Assignment',
      description: `${enabled ? 'Enabled' : 'Disabled'} Compliance Matrix clause ${clauseId} for ${updated.name || targetUserKey}`,
      from: `${before.assignedClauses.length} assigned clauses`,
      to: `${updated.assignedClauses.length} assigned clauses (${enabled ? '+' : '-'}${clauseId})`
    }], { targetEntity: `${updated.name || targetUserKey} (${clauseId})`, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    return updated;
  }

  applyMatrixPresetForUser(targetUserKey, presetKey) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat menerapkan preset Compliance Matrix user.', 'error');
      return null;
    }
    const adminUser = this.getCurrentUser();
    const adminName = adminUser?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = applyPresetToUserMatrix(targetUserKey, presetKey, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    const presetLabel = MATRIX_USER_PRESETS[presetKey]?.label || presetKey;
    const active = this.getActiveProject();
    if (active) {
      appendAuditLog(createAuditEntry(
        active.id,
        'USER_MATRIX_PRESET',
        [{
          category: 'User Matrix Config',
          description: `Applied preset "${presetLabel}" for ${updated.name || targetUserKey}`,
          from: `Plants [${before.allowedPlants.join(', ')}] (${before.assignedClauses.length} clauses)`,
          to: `${presetLabel} · Plants [${updated.allowedPlants.join(', ')}] (${updated.assignedClauses.length} clauses)`
        }],
        {
          name: adminName,
          role: adminUser?.role || ORG_ROLES.SUPER_ADMIN,
          dept: adminUser?.dept || 'MFG',
          email: adminUser?.email || '',
          initials: adminUser?.initials || 'MYA'
        },
        active.documentInfo?.docNumber,
        { targetEntity: updated.name || targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX }
      ));
    }
    this.showNotification(`Preset "${presetLabel}" diterapkan ke ${updated.name}.`, 'success');
    return updated;
  }

  resetMatrixForUser(targetUserKey) {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat mereset pengaturan Compliance Matrix user.', 'error');
      return null;
    }
    const adminName = this.getCurrentUser()?.name || 'Admin';
    const before = getUserMatrixSetting(targetUserKey, this.teamMembers);
    const updated = resetUserMatrixSetting(targetUserKey, {
      teamMembers: this.teamMembers,
      updatedBy: adminName
    });
    this.logActivity('USER_MATRIX_RESET', [{
      category: 'User Matrix Reset',
      description: `Reset Compliance Matrix configuration for ${updated.name || targetUserKey} to role defaults`,
      from: `Plants [${before.allowedPlants.join(', ')}] · ${before.assignedClauses.length} clauses`,
      to: `Default (${updated.assignedClauses.length} clauses)`
    }], { targetEntity: updated.name || targetUserKey, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    this.showNotification(`Compliance Matrix ${updated.name} dikembalikan ke default.`, 'info');
    return updated;
  }

  resetAllUsersMatrix() {
    if (!this.isAdmin()) {
      this.showNotification('Hanya Admin yang dapat mereset seluruh pengaturan user.', 'error');
      return null;
    }
    const res = resetAllUserMatrixSettings(this.teamMembers);
    this.logActivity('USER_MATRIX_RESET_ALL', [{
      category: 'Global Matrix Reset',
      description: `Reset all ${this.teamMembers.length} user Compliance Matrix policies back to role defaults`,
      from: 'Custom Per-User Policies',
      to: 'Role Defaults Restored'
    }], { targetEntity: `${this.teamMembers.length} Users`, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    this.showNotification('Seluruh pengaturan Compliance Matrix user dikembalikan ke default.', 'info');
    return res;
  }

  updatePlantLocation(plantLocation, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;

    const userSetting = this.getCurrentUserMatrixSetting();
    if (!isPlantAllowedForUser(userSetting, plantLocation)) {
      this.logActivity('MATRIX_POLICY_BLOCK', [{
        category: 'Plant Access Restriction',
        description: `Blocked switch to restricted Plant "${plantLocation}" for ${this.getCurrentUser().name}`,
        from: `Allowed: [${userSetting.allowedPlants.join(', ')}]`,
        to: `Blocked: ${plantLocation}`
      }], { project: proj, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, severity: 'security' });
      this.showNotification(`Plant "${plantLocation}" dibatasi untuk user ${this.getCurrentUser().name}. Hubungi Admin.`, 'error');
      return null;
    }

    const oldPlant = proj.documentInfo.plantLocation || 'Unknown';
    proj.documentInfo.plantLocation = plantLocation;
    ensureProjectMatrixDefaults(proj);
    proj.generalInfo.plantLocation = plantLocation;
    const plantData = getPlantDatabase(plantLocation);
    const origin = normalizeOriginMode(proj.documentInfo.vendorOrigin || proj.commercialTerms?.vendorOrigin || 'Foreign');

    if (!proj.siteDescription) {
      proj.siteDescription = {};
    }

    // Auto-populate V. Site Location, Invoice Recipient & Submission Compliance from matrix
    proj.siteDescription.invoiceRecipient = plantData.invoiceRecipient;
    proj.siteDescription.address = plantData.address;
    proj.siteDescription.deliveryPort = plantData.deliveryPort;
    proj.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(plantData.purchasingAttn));
    if (!proj.siteDescription.customClearanceNote) {
      proj.siteDescription.customClearanceNote = plantData.customClearanceNote;
    }
    proj.siteDescription.documentSubmissionCompliance = DOCUMENT_SUBMISSION_COMPLIANCE;

    // Sync matrix contacts for selected plant while preserving custom contacts
    syncPlantContacts(plantData.code, proj);

    // Sync Plant x Origin administrative & tax provisions + shipment wording
    if (origin === 'Mixed') {
      proj.legalAndTaxProvisions = [
        {
          matrixId: 'XVI.mixed',
          title: 'Separation of Offshore Supply & Onshore Scope',
          description: 'Contracts and commercial quotations are strictly itemized between Offshore Equipment Supply (USD/EUR) and Onshore Local Works/Services (IDR).'
        },
        ...buildLegalAndTaxProvisions(plantData.code, 'Mixed')
      ];
    } else {
      proj.legalAndTaxProvisions = buildLegalAndTaxProvisions(plantData.code, origin);
    }

    if (!proj.commercialTerms) proj.commercialTerms = {};
    if (!proj.commercialTerms.shipmentTerms ||
        proj.commercialTerms.shipmentTerms.includes('CIF / CIP') ||
        proj.commercialTerms.shipmentTerms.includes('Franco') ||
        proj.commercialTerms.shipmentTerms.includes('Dual Terms')) {
      proj.commercialTerms.shipmentTerms = getShipmentTermsForMatrix(plantData.code, origin);
    }

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
      description: `Factory location, contacts & tax matrix updated to ${plantData.plantName} (${plantData.code})`,
      from: oldPlant,
      to: plantLocation
    }]);
    this.showNotification(`Plant ${plantData.code} (${plantData.plantName}) contacts, invoicing & matrix synced.`, 'info');
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

    const userSetting = this.getCurrentUserMatrixSetting();
    if (!isOriginAllowedForUser(userSetting, origin)) {
      this.logActivity('MATRIX_POLICY_BLOCK', [{
        category: 'Origin Access Restriction',
        description: `Blocked switch to restricted Vendor Origin "${origin}" for ${this.getCurrentUser().name}`,
        from: `Allowed: [${userSetting.allowedOrigins.join(', ')}]`,
        to: `Blocked: ${origin}`
      }], { project: proj, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, severity: 'security' });
      this.showNotification(`Vendor Origin "${origin}" dibatasi untuk user ${this.getCurrentUser().name}. Hubungi Admin.`, 'error');
      return null;
    }

    const oldOrigin = proj.documentInfo.vendorOrigin || 'Foreign';
    proj.documentInfo.vendorOrigin = origin;
    ensureProjectMatrixDefaults(proj);
    proj.commercialTerms.vendorOrigin = origin;

    const plantCode = resolvePlantCode(proj.documentInfo?.plantLocation || proj.generalInfo?.plantLocation || '1403');
    const config = VENDOR_ORIGIN_CONFIG[origin];

    // Adapt default shipment terms to match Plant x Origin Matrix
    if (!proj.commercialTerms.shipmentTerms ||
        proj.commercialTerms.shipmentTerms.includes('CIF / CIP') ||
        proj.commercialTerms.shipmentTerms.includes('Franco') ||
        proj.commercialTerms.shipmentTerms.includes('Dual Terms')) {
      proj.commercialTerms.shipmentTerms = getShipmentTermsForMatrix(plantCode, origin);
    }

    // Build Clause XVI provisions from Plant x Origin Matrix
    if (origin === 'Mixed') {
      proj.legalAndTaxProvisions = [
        {
          matrixId: 'XVI.mixed',
          title: 'Separation of Offshore Supply & Onshore Scope',
          description: 'Contracts and commercial quotations are strictly itemized between Offshore Equipment Supply (USD/EUR) and Onshore Local Works/Services (IDR).'
        },
        ...buildLegalAndTaxProvisions(plantCode, 'Mixed')
      ];
    } else {
      proj.legalAndTaxProvisions = buildLegalAndTaxProvisions(plantCode, origin);
    }

    this.saveProjects('VENDOR_ORIGIN_CHANGE', [{
      category: 'Vendor Origin',
      description: `Vendor procurement origin updated to ${origin} (Plant ${plantCode})`,
      from: oldOrigin,
      to: origin
    }]);
    this.showNotification(`Vendor Origin updated to ${origin} (${config?.label || origin}) for Plant ${plantCode}`, 'info');
    return config;
  }

  alignProjectWithMatrix(projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj) return null;

    const userSetting = this.getCurrentUserMatrixSetting();
    if (!userSetting.canViewMatrix || !userSetting.canEditMatrix) {
      this.logActivity('MATRIX_POLICY_BLOCK', [{
        category: 'Matrix Sync Restriction',
        description: `Blocked Compliance Matrix alignment for read-only user ${this.getCurrentUser().name}`,
        from: `canEditMatrix: ${userSetting.canEditMatrix}`,
        to: 'Blocked Alignment'
      }], { project: proj, domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, severity: 'security' });
      this.showNotification(`User ${this.getCurrentUser().name} memiliki akses Read-Only / Terbatas pada Compliance Matrix.`, 'error');
      return null;
    }

    const plantCode = resolvePlantCode(proj.documentInfo?.plantLocation || proj.generalInfo?.plantLocation || '1403');
    const origin = normalizeOriginMode(proj.documentInfo?.vendorOrigin || proj.commercialTerms?.vendorOrigin || 'Foreign');
    const profile = PLANT_MATRIX_PROFILES[plantCode] || PLANT_MATRIX_PROFILES['1403'];

    syncPlantContacts(plantCode, proj);

    proj.siteDescription = proj.siteDescription || {};
    proj.siteDescription.invoiceRecipient = profile.invoiceRecipient;
    proj.siteDescription.address = profile.address;
    proj.siteDescription.deliveryPort = profile.deliveryPort;
    proj.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(profile.purchasingAttn));
    proj.siteDescription.customClearanceNote = profile.customClearanceNote;
    proj.siteDescription.documentSubmissionCompliance = DOCUMENT_SUBMISSION_COMPLIANCE;

    proj.projectOverview = proj.projectOverview || {};
    proj.projectOverview.confidentialityClause = CONFIDENTIALITY_STANDARD;
    proj.projectOverview.languageRequirement = LANGUAGE_REQUIREMENT_STANDARD;

    proj.scopeOfSupply = proj.scopeOfSupply || { fryer: [], seasoning: [] };
    proj.scopeOfSupply.servicesScope = JSON.parse(JSON.stringify(SERVICES_SCOPE_STANDARD));
    proj.scopeOfSupply.ancillariesAndLogistics = [...ANCILLARIES_LOGISTICS_STANDARD];
    proj.scopeOfSupply.controlSystemAccess = JSON.parse(JSON.stringify(CONTROL_SYSTEM_ACCESS_RIGHTS));

    proj.hygieneAndQuality = proj.hygieneAndQuality || {};
    proj.hygieneAndQuality.generalTechnicalHygienic12 = JSON.parse(JSON.stringify(TECHNICAL_HYGIENIC_REQUIREMENTS_12));

    proj.performanceAcceptance = proj.performanceAcceptance || {};
    proj.performanceAcceptance.finalAcceptance = 'Final Site Acceptance (SAT) will be certified only after continuous reliable operation, comprehensive FAT/SAT Operator & Maintenance training evidenced by signed training attendance sheets, formal FAC execution, and recording of any pending items on a binding Snag List (Punch List) with corrective action plans, PIC, and completion timelines prior to final sign-off.';
    proj.performanceAcceptance.finalAcceptanceChecklist = JSON.parse(JSON.stringify(FINAL_ACCEPTANCE_RULES));
    proj.performanceAcceptance.remediesAndConsequences = JSON.parse(JSON.stringify(REMEDIES_CONSEQUENCES_STANDARD));

    proj.commercialTerms = proj.commercialTerms || {};
    proj.commercialTerms.matrixEquipmentSchedule = JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN));
    proj.commercialTerms.options = proj.commercialTerms.options || {};
    proj.commercialTerms.options.matrixStandard = {
      title: 'IFM Compliance Matrix Standard (T/T & SWIFT APBG)',
      breakdown: JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN))
    };
    proj.commercialTerms.engineeringServicesPayment = MATRIX_ENGINEERING_SERVICES_PAYMENT;
    proj.commercialTerms.invoicingAndBankGuarantee = [...INVOICING_AND_BG_CONDITIONS];
    proj.commercialTerms.shipmentTerms = getShipmentTermsForMatrix(plantCode, origin);
    proj.commercialTerms.shipmentItems = JSON.parse(JSON.stringify(SHIPMENT_DELIVERY_ITEMS_5));
    proj.commercialTerms.warranty = WARRANTY_STANDARD;

    proj.legalAndTaxProvisions = origin === 'Mixed'
      ? [
          {
            matrixId: 'XVI.mixed',
            title: 'Separation of Offshore Supply & Onshore Scope',
            description: 'Contracts and commercial quotations are strictly itemized between Offshore Equipment Supply (USD/EUR) and Onshore Local Works/Services (IDR).'
          },
          ...buildLegalAndTaxProvisions(plantCode, 'Mixed')
        ]
      : buildLegalAndTaxProvisions(plantCode, origin);

    proj.requiredDocumentation = JSON.parse(JSON.stringify(REQUIRED_DOCUMENTATION_13));
    proj.appendices = JSON.parse(JSON.stringify(APPENDICES_6));

    const audit = auditProjectMatrixCompliance(proj);
    this.saveProjects('MATRIX_ALIGNMENT', [{
      category: 'Compliance Matrix Sync',
      description: `Aligned all 19 clauses to IFM Compliance Matrix (${plantCode} / ${origin}) — Score ${audit.complianceScore}%`,
      from: 'Custom / Legacy',
      to: `Plant ${plantCode} × ${origin} (${audit.complianceScore}%)`
    }]);
    this.showNotification(`TRSA aligned with IFM 19-Clause Matrix (${audit.complianceScore}% compliant).`, 'success');
    return audit;
  }

  loadProjects() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(p => ensureProjectMatrixDefaults(p));
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage, resetting to default.', e);
    }
    const initial = [JSON.parse(JSON.stringify(defaultTRSAProject))];
    initial.forEach(p => ensureProjectMatrixDefaults(p));
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initial));
      } catch (e) {}
    }
    return initial;
  }

  saveProjects(customAction = 'UPDATE', customDiffs = null) {
    try {
      const activeBeforeSave = this.getActiveProject();
      if (activeBeforeSave) {
        activeBeforeSave.updatedAt = new Date().toISOString();
      }
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
    const now = new Date();
    newProj.id = 'trsa-' + now.getTime();
    newProj.createdAt = now.toISOString();
    newProj.updatedAt = now.toISOString();
    newProj.documentInfo.title = title;
    const dateStr = now.toISOString().split('T')[0];
    const nextSeq = getNextSequenceNumber(this.projects);
    const plantCode = getPlantCode(plant);

    newProj.documentInfo.plantLocation = plant;
    ensureProjectMatrixDefaults(newProj);
    newProj.generalInfo.plantLocation = plant;
    const plantData = getPlantDatabase(plant);
    if (!newProj.siteDescription) newProj.siteDescription = {};
    newProj.siteDescription.invoiceRecipient = plantData.invoiceRecipient;
    newProj.siteDescription.address = plantData.address;
    newProj.siteDescription.deliveryPort = plantData.deliveryPort;
    newProj.siteDescription.purchasingAttn = JSON.parse(JSON.stringify(plantData.purchasingAttn));
    newProj.siteDescription.customClearanceNote = plantData.customClearanceNote;
    newProj.siteDescription.documentSubmissionCompliance = DOCUMENT_SUBMISSION_COMPLIANCE;
    syncPlantContacts(plantData.code, newProj);
    const origin = normalizeOriginMode(newProj.documentInfo.vendorOrigin || 'Foreign');
    newProj.legalAndTaxProvisions = buildLegalAndTaxProvisions(plantData.code, origin);
    newProj.commercialTerms.shipmentTerms = getShipmentTermsForMatrix(plantData.code, origin);

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
    this.saveDraftSnapshot({
      project: newProj,
      builderStep: 1,
      label: 'Initial Draft Created',
      isAutoSave: false
    });
    return newProj;
  }

  duplicateProject(id) {
    const source = this.projects.find(p => p.id === id);
    if (!source) return;
    const cloned = JSON.parse(JSON.stringify(source));
    const now = new Date();
    cloned.id = 'trsa-' + now.getTime();
    cloned.createdAt = now.toISOString();
    cloned.updatedAt = now.toISOString();
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
    this.saveDraftSnapshot({
      project: cloned,
      builderStep: 1,
      label: `Cloned from ${source.documentInfo?.docNumber || source.documentInfo?.title || 'Project'}`,
      isAutoSave: false
    });
    this.showNotification(`Project duplicated with next Doc No. (${nextSeq})`, 'success');
  }

  updateProjectStatus(id, newStatus) {
    const proj = this.projects.find(p => p.id === id);
    if (!proj) return false;
    const normalized = normalizeAgreementStatus(newStatus);
    if (!AGREEMENT_STATUSES.includes(normalized)) return false;

    const role = this.isAdmin() ? ROLES.ADMIN : ROLES.ENGINEER;
    if (!canChangeProjectStatus(role, normalized)) {
      this.showNotification('Only Managers/Admins can set status to Approved or Published.', 'error');
      return false;
    }

    const oldStatus = normalizeAgreementStatus(proj.documentInfo?.status);
    if (oldStatus === normalized) return true;

    proj.documentInfo = proj.documentInfo || {};
    proj.documentInfo.status = normalized;
    this.saveProjects('STATUS_CHANGE', [{
      category: 'Agreement Status',
      description: `Updated status for ${proj.documentInfo?.docNumber || proj.documentInfo?.title || id}`,
      from: oldStatus,
      to: normalized
    }]);
    this.showNotification(`Status updated to ${normalized}.`, 'success');
    return true;
  }

  deleteProject(id) {
    if (this.projects.length <= 1) {
      this.showNotification('Cannot delete the last remaining project. Please create a new one first.', 'error');
      return false;
    }
    const target = this.projects.find(p => p.id === id);
    if (target) {
      this.saveDraftSnapshot({
        project: target,
        builderStep: this.builderStep,
        label: 'Backup Before Delete',
        isAutoSave: false
      });
    }
    this.projects = this.projects.filter(p => p.id !== id);
    this.selectedProjectIds = this.selectedProjectIds.filter(selId => selId !== id);
    if (!this.projects.some(p => p.id === this.activeProjectId)) {
      this.activeProjectId = this.projects[0].id;
    }
    this.confirmDeleteProjectId = null;
    this.confirmBulkDelete = false;
    this.saveProjects('DELETE', [{
      category: 'Project Deleted',
      description: `Deleted agreement "${target?.documentInfo?.title || id}" (saved backup checkpoint in Draft History)`,
      from: target?.documentInfo?.docNumber || id,
      to: 'Archived in Draft History'
    }]);
    this.showNotification('Project removed. A backup snapshot was saved to Draft History.', 'info');
    return true;
  }

  bulkUpdateProjectStatus(ids, newStatus) {
    const targetIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (targetIds.length === 0) return 0;
    const normalized = normalizeAgreementStatus(newStatus);
    if (!AGREEMENT_STATUSES.includes(normalized)) return 0;

    const role = this.isAdmin() ? ROLES.ADMIN : ROLES.ENGINEER;
    if (!canChangeProjectStatus(role, normalized)) {
      this.showNotification('Only Managers/Admins can set status to Approved or Published.', 'error');
      return 0;
    }

    let updatedCount = 0;
    const nowIso = new Date().toISOString();
    this.projects.forEach(proj => {
      if (targetIds.includes(proj.id)) {
        proj.documentInfo = proj.documentInfo || {};
        if (normalizeAgreementStatus(proj.documentInfo.status) !== normalized) {
          proj.documentInfo.status = normalized;
          proj.updatedAt = nowIso;
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      this.saveProjects('BULK_STATUS_CHANGE', [{
        category: 'Bulk Status Update',
        description: `Updated ${updatedCount} agreement(s) to ${normalized}`,
        from: 'Mixed',
        to: normalized
      }]);
      this.showNotification(`Updated status of ${updatedCount} agreement(s) to ${normalized}.`, 'success');
    } else {
      this.showNotification(`Selected agreements already have status "${normalized}".`, 'info');
    }
    this.selectedProjectIds = [];
    this.confirmBulkDelete = false;
    return updatedCount;
  }

  bulkDeleteProjects(ids) {
    const targetIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (targetIds.length === 0) return 0;
    if (this.projects.length - targetIds.length < 1) {
      this.showNotification('At least one active TRSA agreement must remain in the workspace.', 'error');
      return 0;
    }

    const targets = this.projects.filter(p => targetIds.includes(p.id));
    targets.forEach(t => {
      this.saveDraftSnapshot({
        project: t,
        builderStep: this.builderStep,
        label: 'Backup Before Bulk Delete',
        isAutoSave: false
      });
    });

    this.projects = this.projects.filter(p => !targetIds.includes(p.id));
    this.selectedProjectIds = [];
    this.confirmBulkDelete = false;
    this.confirmDeleteProjectId = null;
    if (!this.projects.some(p => p.id === this.activeProjectId)) {
      this.activeProjectId = this.projects[0].id;
    }

    this.saveProjects('BULK_DELETE', [{
      category: 'Bulk Delete',
      description: `Removed ${targets.length} agreement(s) (backup checkpoints saved to Draft History)`,
      from: targets.map(t => t.documentInfo?.docNumber || t.id).join(', '),
      to: 'Archived in Draft History'
    }]);
    this.showNotification(`Removed ${targets.length} agreement(s). Backups saved to Draft History.`, 'info');
    return targets.length;
  }

  exportSelectedProjectsJSON(ids) {
    const targetIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    const selected = this.projects.filter(p => targetIds.includes(p.id));
    if (selected.length === 0) return false;
    if (selected.length === 1) {
      this.exportJSON(selected[0].id);
      return true;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selected, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `IFM_TRSA_Bundle_${selected.length}_Agreements.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.logActivity('EXPORT_BUNDLE', [{
      category: 'Data Export',
      description: `Exported ${selected.length} TRSA agreements as JSON bundle`,
      from: 'Workspace',
      to: `IFM_TRSA_Bundle_${selected.length}_Agreements.json`
    }], { targetEntity: `${selected.length} Agreements` });
    this.showNotification(`Exported ${selected.length} TRSA agreements as JSON bundle.`, 'success');
    return true;
  }

  resetToDefault(id) {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const prevDoc = this.projects[idx].documentInfo?.docNumber || id;
      this.saveDraftSnapshot({
        project: this.projects[idx],
        builderStep: this.builderStep,
        label: 'Backup Before Template Reset',
        isAutoSave: false
      });
      this.projects[idx] = JSON.parse(JSON.stringify(defaultTRSAProject));
      this.projects[idx].id = id;
      ensureProjectMatrixDefaults(this.projects[idx]);
      this.saveProjects('RESET_TEMPLATE', [{
        category: 'Template Reset',
        description: `Reset agreement "${prevDoc}" back to default Indofood 19-Clause standard template`,
        from: prevDoc,
        to: 'Default IFM 19-Clause Template'
      }]);
      this.showNotification('Project reset to default Indofood 19-Clause standard template.', 'success');
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
    this.logActivity('EXPORT_JSON', [{
      category: 'Document Export',
      description: `Exported TRSA JSON for "${proj.documentInfo?.title || proj.id}"`,
      from: proj.documentInfo?.docNumber || proj.id,
      to: 'JSON File'
    }], { project: proj });
    this.showNotification('TRSA Project exported as JSON.', 'success');
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.documentInfo || !parsed.productSpecifications) {
        throw new Error('Invalid TRSA format');
      }
      parsed.id = 'trsa-' + Date.now();
      if (!parsed.createdAt) {
        parsed.createdAt = resolveProjectCreatedAt(parsed) || new Date().toISOString();
      }
      parsed.updatedAt = new Date().toISOString();
      ensureProjectMatrixDefaults(parsed);
      this.projects.unshift(parsed);
      this.activeProjectId = parsed.id;
      this.saveProjects('IMPORT_JSON', [{
        category: 'Document Import',
        description: `Imported TRSA specification "${parsed.documentInfo?.title || parsed.id}" from JSON`,
        from: 'JSON Import',
        to: parsed.documentInfo?.docNumber || parsed.id
      }]);
      this.showNotification('TRSA project imported and aligned with matrix defaults!', 'success');
      this.currentView = 'builder';
    } catch (e) {
      this.showNotification('Failed to parse JSON file. Please ensure it is a valid TRSA project export.', 'error');
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
    this.saveProjects('REVISION_STAMP', [{
      category: 'Revision History',
      description: `Added revision ${revNum} by ${author}`,
      from: `${count} revisions`,
      to: `Rev ${revNum} (${today})`
    }]);
    this.showNotification(`Added new Revision ${revNum} by ${author}`, 'info');
    return newRev;
  }

  stampRevisionRow(idx, projectId = null) {
    const proj = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!proj || !proj.documentInfo?.revisionHistory || !proj.documentInfo.revisionHistory[idx]) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const author = this.getCurrentUser().name;
    const rev = proj.documentInfo.revisionHistory[idx];
    const prevStamp = `${rev.originatedBy || 'None'} (${rev.date || 'N/A'})`;

    rev.originatedBy = author;
    rev.date = today;
    this.saveProjects('REVISION_STAMP', [{
      category: 'Revision Stamp',
      description: `Stamped Revision ${rev.revision} (${rev.description || 'Engineering Revision'})`,
      from: prevStamp,
      to: `${author} (${today})`
    }]);
    this.showNotification(`Revision ${rev.revision} updated: Originated By ${author}, Date ${today}`, 'success');
    return true;
  }

  saveRevisionHistory(projectId = null, draftLabel = '') {
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
    if (proj) {
      this.saveDraftSnapshot({
        project: proj,
        builderStep: this.builderStep,
        label: draftLabel || `Saved Draft (Step ${this.builderStep} of 6)`,
        isAutoSave: false,
        logActivity: true
      });
    }
    return true;
  }

  saveDraftSnapshot(options = {}) {
    const proj = options.project || this.getActiveProject();
    if (!proj) return null;

    const sanitizedProjects = sanitizeProject(this.projects);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sanitizedProjects));
      } catch (e) {}
    }

    const entry = saveDraftToHistory(proj, {
      user: this.getCurrentUser(),
      builderStep: options.builderStep ?? this.builderStep,
      progress: this.calculateProgress(proj),
      label: options.label || '',
      isAutoSave: Boolean(options.isAutoSave)
    });

    if (entry && !options.isAutoSave && (options.notify || options.logActivity)) {
      this.logActivity('DRAFT_SAVE', [{
        category: 'Draft Checkpoint',
        description: `Saved manual draft checkpoint: "${entry.label}" (Step ${entry.builderStep}/6)`,
        from: 'Working Form',
        to: `${entry.progress}% Complete`
      }], { project: proj });
    }

    if (entry && !options.isAutoSave && options.notify) {
      this.showNotification(`Draft checkpoint saved to LocalStorage history (${entry.label})`, 'success');
    }
    return entry;
  }

  scheduleAutoSaveDraft() {
    if (!this.autoSaveEnabled) return;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveDraft();
    }, 1200);
  }

  saveFormProgressToLocalStorage() {
    const active = this.getActiveProject();
    if (!active || typeof localStorage === 'undefined') return null;
    const progressState = {
      activeProjectId: active.id,
      builderStep: this.builderStep,
      currentView: this.currentView,
      progress: this.calculateProgress(active),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.PROGRESS_STORAGE_KEY, JSON.stringify(progressState));
    } catch (e) {}
    return progressState;
  }

  restoreFormProgress() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.PROGRESS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.activeProjectId) {
        const exists = this.projects.some(p => p.id === parsed.activeProjectId);
        if (exists) {
          this.activeProjectId = parsed.activeProjectId;
          this.builderStep = Math.min(6, Math.max(1, Number(parsed.builderStep) || 1));
          if (parsed.savedAt) {
            this.lastAutoSavedAt = parsed.savedAt;
          }
        }
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  startAutoSave(intervalMs = AUTO_SAVE_INTERVAL_MS) {
    this.stopAutoSave();
    this.autoSaveIntervalMs = intervalMs;
    this.autoSaveEnabled = true;
    this.autoSaveIntervalId = setInterval(() => {
      if (this.autoSaveEnabled) {
        this.autoSaveDraft();
      }
    }, intervalMs);
    if (this.autoSaveIntervalId && typeof this.autoSaveIntervalId.unref === 'function') {
      this.autoSaveIntervalId.unref();
    }
    return this.autoSaveIntervalId;
  }

  stopAutoSave() {
    if (this.autoSaveIntervalId !== null) {
      clearInterval(this.autoSaveIntervalId);
      this.autoSaveIntervalId = null;
    }
    if (this.autoSaveTimer !== null) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  toggleAutoSave() {
    this.autoSaveEnabled = !this.autoSaveEnabled;
    if (this.autoSaveEnabled) {
      this.startAutoSave(this.autoSaveIntervalMs || AUTO_SAVE_INTERVAL_MS);
      this.autoSaveDraft();
      this.showNotification('30-second LocalStorage auto-save enabled.', 'success');
    } else {
      this.stopAutoSave();
      this.showNotification('Auto-save paused. Remember to click Save Draft manually.', 'info');
    }
    return this.autoSaveEnabled;
  }

  autoSaveDraft() {
    const active = this.getActiveProject();
    if (!active) return null;
    const entry = this.saveDraftSnapshot({
      project: active,
      builderStep: this.builderStep,
      label: `Auto-Saved Draft (Step ${this.builderStep} of 6)`,
      isAutoSave: true
    });
    this.saveFormProgressToLocalStorage();
    this.lastAutoSavedAt = entry?.savedAt || new Date().toISOString();

    if (typeof document !== 'undefined') {
      const badge = document.getElementById('autosave-status-badge');
      if (badge) {
        const timeText = new Date(this.lastAutoSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Auto-saved every 30s &bull; ${timeText}</span>`;
      }
    }
    return entry;
  }

  resumeDraft(draftId, mode = 'replace') {
    const draft = getDraftById(draftId);
    if (!draft || !draft.snapshot) {
      this.showNotification('Saved draft could not be found in LocalStorage.', 'error');
      return null;
    }

    const restored = sanitizeProject(JSON.parse(JSON.stringify(draft.snapshot)));
    ensureProjectMatrixDefaults(restored);

    if (mode === 'new') {
      restored.id = 'trsa-' + Date.now();
      restored.documentInfo = restored.documentInfo || {};
      restored.documentInfo.title = `${restored.documentInfo.title || 'Untitled TRSA'} (Resumed Copy)`;
      restored.documentInfo.status = 'Draft';
      this.projects.unshift(restored);
    } else {
      const targetId = draft.projectId || restored.id;
      restored.id = targetId;
      const idx = this.projects.findIndex(p => p.id === targetId);
      if (idx !== -1) {
        this.projects[idx] = restored;
      } else {
        this.projects.unshift(restored);
      }
    }

    this.activeProjectId = restored.id;
    this.currentView = 'builder';
    this.builderStep = Math.min(6, Math.max(1, Number(draft.builderStep) || 1));
    this.takeSnapshot(restored);
    this.saveProjects('RESTORE_DRAFT', [{
      category: 'Draft Resumed',
      description: `Resumed "${draft.label || 'Saved Draft'}" from LocalStorage history (Step ${this.builderStep} of 6)`,
      from: formatDraftTimestamp(draft.savedAt),
      to: restored.documentInfo?.docNumber || restored.id
    }]);
    this.showNotification(`Resumed draft "${restored.documentInfo?.title || 'TRSA Draft'}" at Step ${this.builderStep} of 6.`, 'success');
    return restored;
  }

  deleteDraft(draftId) {
    const draft = getDraftById(draftId);
    const res = deleteDraftFromHistory(draftId);
    if (res.deleted) {
      this.logActivity('DRAFT_DELETE', [{
        category: 'Draft History',
        description: `Deleted saved draft "${draft?.label || draftId}"`,
        from: draft?.docNumber || draftId,
        to: 'Removed'
      }]);
      this.showNotification('Saved draft removed from history.', 'info');
    }
    return res.deleted;
  }

  clearAllDrafts(projectId = null) {
    clearDraftHistory(projectId);
    this.confirmClearHistory = false;
    this.logActivity('DRAFT_CLEAR', [{
      category: 'Draft History',
      description: projectId ? 'Cleared saved draft history for active project' : 'Cleared all saved draft history across workspace',
      from: 'LocalStorage Drafts',
      to: 'Cleared'
    }]);
    this.showNotification(projectId ? 'Cleared draft history for active project.' : 'Cleared all saved draft history.', 'info');
  }

  calculateProgress(proj) {
    return calculateProjectCompleteness(proj);
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
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'login' || params.has('logout')) {
      store.isAuthenticated = false;
    }
  }
  store.restoreFormProgress();
  render();

  // Automatically save current form progress to LocalStorage every 30 seconds
  store.startAutoSave(AUTO_SAVE_INTERVAL_MS);

  // Global listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => render());
    window.addEventListener('beforeunload', () => {
      if (store.autoSaveEnabled) {
        store.autoSaveDraft();
      }
    });
    
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

export 
function applyIFMBrandHighlighting(container) {
  if (!container || typeof document === 'undefined' || typeof document.createTreeWalker !== 'function') return;
  try {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/PT\.?\s+Indofood\s+Fortuna\s+Makmur/i.test(node.nodeValue)) {
          return NodeFilter.FILTER_SKIP;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toUpperCase();
        if (['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'SELECT', 'OPTION', 'IFRAME', 'CODE'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.classList && (parent.classList.contains('ifm-company-brand') || parent.classList.contains('login-company'))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const node of textNodes) {
      const parent = node.parentNode;
      if (!parent) continue;
      const text = node.nodeValue;
      const regex = /(PT\.?\s+Indofood\s+Fortuna\s+Makmur)/gi;
      if (!regex.test(text)) continue;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
        }
        const span = document.createElement('span');
        span.className = 'ifm-company-brand';
        span.style.color = 'rgb(0, 168, 232)';
        span.style.fontWeight = '700';
        span.textContent = match[0];
        frag.appendChild(span);
        lastIdx = regex.lastIndex;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.substring(lastIdx)));
      }
      parent.replaceChild(frag, node);
    }
  } catch (err) {
    // Graceful fallback
  }
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  if (!store.isAuthenticated) {
    root.innerHTML = renderLoginView();
    applyIFMBrandHighlighting(root);
    attachLoginHandlers();
    return;
  }

  const activeProject = ensureProjectMatrixDefaults(store.getActiveProject());

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
            store.currentView === 'history' ? renderDraftHistoryView() :
            store.currentView === 'directory' ? renderDirectoryView(activeProject) :
            store.currentView === 'activity' ? renderActivityLogView(activeProject) :
            store.currentView === 'matrix' ? renderComplianceMatrixView(activeProject) :
            store.currentView === 'builder' ? renderBuilder(activeProject) :
            store.currentView === 'studio' ? renderStudio(activeProject) : ''
          }
        </main>
      </div>

      <!-- Supabase Modal -->
      ${store.showSupabaseModal ? renderSupabaseModal() : ''}

      <!-- Audit Trail Forensic Modal -->
      ${store.showAuditModal ? renderAuditModal() : ''}

      <!-- Embedded Reference PDF Modal -->
      ${store.showPdfModal ? renderPdfModal() : ''}

      <!-- Toast Notification Container -->
      <div id="notification-toast" class="hidden"></div>
    </div>
  `;

  applyIFMBrandHighlighting(root);
  attachEventHandlers(activeProject);
}

function renderLoginView() {
  const users = store.teamMembers || loadUsers();
  const quickUsers = [
    users.find(u => u.role === ORG_ROLES.SUPER_ADMIN) || users[0],
    users.find(u => u.role === ORG_ROLES.PROJECT_ENGINEERING_TEAM) || users[1],
    users.find(u => u.role === ORG_ROLES.PURCHASING_PLANT) || users[2],
    users.find(u => u.role === ORG_ROLES.PIC_PROJECT) || users[4]
  ].filter(Boolean);

  return `
    <div class="trsa-login-screen">
      <div class="trsa-login-bg-layer" aria-hidden="true">
        <img
          src="/src/assets/images/industrial_robotics_bg_1794920709040.jpg"
          alt="Industrial robotic arm with blue network connections and data flow lines"
          referrerPolicy="no-referrer"
          class="trsa-login-bg-img"
          onerror="this.style.display='none'"
        />
      </div>
      <div class="trsa-login-bg-scrim" aria-hidden="true"></div>

      <!-- Blazing Sky Rocket Adventure Animation Layer -->
      <div class="trsa-rocket-scene" aria-hidden="true">
        <!-- Cosmic Shooting Star Streaks -->
        <div class="rocket-star-streak streak-1"></div>
        <div class="rocket-star-streak streak-2"></div>
        <div class="rocket-star-streak streak-3"></div>
        <div class="rocket-star-streak streak-4"></div>

        <!-- Soaring Rocket Flight Assembly -->
        <div class="rocket-flight-path">
          <div class="rocket-assembly" id="trsa-launch-rocket" title="TRSA Enterprise Rocket Launch">
            <!-- Trailing White Smoke Trail Clouds (Asap Putih) -->
            <div class="rocket-smoke-trail">
              <div class="smoke-puff puff-1"></div>
              <div class="smoke-puff puff-2"></div>
              <div class="smoke-puff puff-3"></div>
              <div class="smoke-puff puff-4"></div>
              <div class="smoke-puff puff-5"></div>
              <div class="smoke-puff puff-6"></div>
            </div>

            <!-- Blazing Exhaust Fire Plume (Api Biru & Api Orange) -->
            <div class="rocket-fire-plume">
              <!-- Outer Fiery Orange Flame Layer (Api Orange) -->
              <div class="flame-orange-outer"></div>
              <div class="flame-orange-mid"></div>

              <!-- High-Energy Plasma Blue Flame Core (Api Biru) -->
              <div class="flame-blue-outer"></div>
              <div class="flame-blue-core"></div>
              <div class="flame-blue-mach-disk"></div>

              <!-- Sparks & Embers (Orange & Blue) -->
              <div class="flame-spark spark-orange-1"></div>
              <div class="flame-spark spark-orange-2"></div>
              <div class="flame-spark spark-blue-1"></div>
              <div class="flame-spark spark-blue-2"></div>
            </div>

            <!-- Vector Rocket Spacecraft -->
            <svg class="rocket-svg" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rocketBodyGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#FFFFFF"/>
                  <stop offset="60%" stop-color="#E2E8F0"/>
                  <stop offset="100%" stop-color="#CBD5E1"/>
                </linearGradient>
                <linearGradient id="rocketNoseGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#FF4B4B"/>
                  <stop offset="70%" stop-color="#DC2626"/>
                  <stop offset="100%" stop-color="#991B1B"/>
                </linearGradient>
                <linearGradient id="rocketFinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#EF4444"/>
                  <stop offset="100%" stop-color="#B91C1C"/>
                </linearGradient>
                <linearGradient id="rocketWindowGlass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#38BDF8"/>
                  <stop offset="50%" stop-color="#0284C7"/>
                  <stop offset="100%" stop-color="#0369A1"/>
                </linearGradient>
                <linearGradient id="rocketNozzleGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#64748B"/>
                  <stop offset="50%" stop-color="#334155"/>
                  <stop offset="100%" stop-color="#1E293B"/>
                </linearGradient>
              </defs>

              <!-- Left Aerodynamic Wing Fin -->
              <path d="M 34 105 Q 14 126 10 148 Q 28 142 36 126 Z" fill="url(#rocketFinGrad)"/>
              <!-- Right Aerodynamic Wing Fin -->
              <path d="M 86 105 Q 106 126 110 148 Q 92 142 84 126 Z" fill="url(#rocketFinGrad)"/>
              
              <!-- Center Fin / Keel Trim -->
              <path d="M 58 112 L 62 112 L 63 138 L 57 138 Z" fill="#991B1B"/>

              <!-- Engine Thruster Nozzle -->
              <path d="M 46 135 L 74 135 L 70 148 L 50 148 Z" fill="url(#rocketNozzleGrad)"/>
              <ellipse cx="60" cy="148" rx="10" ry="3" fill="#0F172A"/>

              <!-- Main Aerodynamic Fuselage -->
              <path d="M 60 18 Q 85 55 84 135 L 36 135 Q 35 55 60 18 Z" fill="url(#rocketBodyGrad)"/>

              <!-- Blazing Red Nose Cone -->
              <path d="M 60 18 Q 78 48 80 62 L 40 62 Q 42 48 60 18 Z" fill="url(#rocketNoseGrad)"/>

              <!-- Porthole Window Bezel & Reflective Glass -->
              <circle cx="60" cy="82" r="14" fill="#94A3B8"/>
              <circle cx="60" cy="82" r="11" fill="url(#rocketWindowGlass)"/>
              <path d="M 53 76 Q 60 72 67 76 Q 64 79 53 79 Z" fill="rgba(255, 255, 255, 0.8)"/>

              <!-- Corporate Technical Stripes -->
              <line x1="42" y1="120" x2="78" y2="120" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="44" y1="125" x2="76" y2="125" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="trsa-login-ring ring-0 ring-offset-0 border-0 border-none outline-none shadow-none">
        <i class="trsa-ring-curve trsa-ring-curve-1" style="--clr:#00f0ff; --clr-glow:rgba(0,240,255,0.65);" title="Cyan Gyro Ring"></i>
        <i class="trsa-ring-curve trsa-ring-curve-2" style="--clr:#ff2d75; --clr-glow:rgba(255,45,117,0.65);" title="Magenta Gyro Ring"></i>
        <i class="trsa-ring-curve trsa-ring-curve-3" style="--clr:#ffd000; --clr-glow:rgba(255,208,0,0.65);" title="Gold Gyro Ring"></i>
        <i class="trsa-ring-curve trsa-ring-curve-4" style="--clr:#00ff9d; --clr-glow:rgba(0,255,157,0.65);" title="Mint Emerald Gyro Ring"></i>
        <i class="trsa-ring-curve trsa-ring-curve-5" style="--clr:#a855f7; --clr-glow:rgba(168,85,247,0.65);" title="Purple Plasma Gyro Ring"></i>

        <!-- Interactive Glass Crack Animation Overlay -->
        <div id="trsa-glass-crack-layer" class="trsa-glass-crack-layer" aria-hidden="true"></div>

        <form id="trsa-login-form" class="login" novalidate>
          <!-- Robot Mascot Animation Above Login Text -->
          <div class="trsa-login-robot-mascot-header" aria-label="TRSA Robotics Mascot Animation">
            <video
              autoplay
              loop
              muted
              playsinline
              class="trsa-robot-video-header"
              title="TRSA Robotics Assistant"
            >
              <source src="/src/assets/videos/Robot_TFU.webm" type="video/webm" />
              <source src="/public/assets/videos/Robot_TFU.webm" type="video/webm" />
              <source src="src/assets/videos/Robot_TFU.webm" type="video/webm" />
            </video>
          </div>

          <h2>Login</h2>
          <p class="login-subtitle"><span class="login-brand">TRSA Studio</span><span class="login-company" style="font-size: 2em; line-height: 1.25; display: block; margin-top: 4px; color: rgb(0, 168, 232); font-weight: 800;">PT Indofood Fortuna Makmur</span></p>

          ${store.loginError ? `
            <div class="w-full px-4 py-2 rounded-2xl bg-red-500/20 border border-red-400/60 text-red-200 text-xs text-center font-medium">
              ${escapeHtml(store.loginError)}
            </div>
          ` : ''}

          <div class="inputBx">
            <input
              type="text"
              id="login-identifier"
              placeholder="Username or Email"
              value="${escapeHtml(store.loginDraftIdentifier || '')}"
              autocomplete="username"
              required
            />
          </div>
          <div class="inputBx">
            <input
              type="password"
              id="login-password"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
          </div>
          <div class="inputBx">
            <input type="submit" value="Sign in" />
          </div>
          <div class="links">
            <button type="button" onclick="window.TRSA.toggleForgotHint()">Forget Password</button>
            <button type="button" onclick="window.TRSA.toggleQuickLoginPanel()">Quick Role Access</button>
          </div>
        </form>
      </div>

      ${store.showForgotHint ? `
        <div class="relative z-10 mt-5 max-w-md w-full p-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 text-white/95 text-xs backdrop-blur-md shadow-2xl space-y-1.5">
          <div class="font-bold text-amber-300">Corporate Access Passcode Info</div>
          <p class="text-white/85 leading-relaxed">
            Gunakan email corporate IFM (contoh: <span class="font-mono text-sky-300">my.alfian@icbp.indofood.co.id</span>) atau nama lengkap dengan passcode standar <span class="font-mono font-bold text-emerald-300">${DEFAULT_PASSCODE}</span>.
          </p>
        </div>
      ` : ''}

      ${store.showQuickLoginPanel ? `
        <div class="relative z-10 mt-5 max-w-2xl w-full p-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 text-white backdrop-blur-md shadow-2xl space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-white">Pilih Akun Berdasarkan Role</span>
            <span class="text-[11px] font-mono text-sky-200">Passcode: ${DEFAULT_PASSCODE}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${quickUsers.map(u => `
              <button
                type="button"
                onclick="window.TRSA.quickFillAndLogin('${escapeHtml(u.email)}')"
                class="text-left p-3 rounded-xl bg-slate-900/70 hover:bg-sky-900/60 border border-white/15 transition-colors cursor-pointer"
              >
                <div class="text-xs font-bold text-white">${escapeHtml(u.name)}</div>
                <div class="text-[11px] text-sky-300 font-medium mt-0.5">${escapeHtml(u.role)}</div>
                <div class="text-[10px] text-white/75 mt-0.5">${escapeHtml(u.jabatan)} &middot; Dept ${escapeHtml(u.dept)} &middot; Plant ${escapeHtml(u.plantCode)}</div>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function playGlassCrackSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 2800 + Math.random() * 1200;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.1);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3600, ctx.currentTime);
    filter.Q.setValueAtTime(3.5, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (_) {
    // Ignore restricted audio context
  }
}

export function generateGlassCrackSVG(crackId) {
  const numRadials = 10 + Math.floor(Math.random() * 4); // 10 to 13 branches
  const radialPoints = [];

  for (let i = 0; i < numRadials; i++) {
    const baseAngle = (i * (360 / numRadials)) + (Math.random() * 18 - 9);
    const rad = (baseAngle * Math.PI) / 180;
    const totalLength = 55 + Math.random() * 60; // 55px to 115px

    const p1Dist = 16 + Math.random() * 10;
    const p2Dist = 38 + Math.random() * 20;
    const p3Dist = totalLength;

    const j1 = (Math.random() - 0.5) * 0.28;
    const j2 = (Math.random() - 0.5) * 0.36;

    const p0 = { x: 0, y: 0 };
    const p1 = { x: Math.round(Math.cos(rad + j1) * p1Dist * 10) / 10, y: Math.round(Math.sin(rad + j1) * p1Dist * 10) / 10 };
    const p2 = { x: Math.round(Math.cos(rad + j2) * p2Dist * 10) / 10, y: Math.round(Math.sin(rad + j2) * p2Dist * 10) / 10 };
    const p3 = { x: Math.round(Math.cos(rad) * p3Dist * 10) / 10, y: Math.round(Math.sin(rad) * p3Dist * 10) / 10 };

    radialPoints.push([p0, p1, p2, p3]);
  }

  // Radial fracture lines
  const darkPaths = radialPoints.map(pts =>
    `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y}`
  ).join(' ');

  // Spiderweb stress rings connecting radials
  const webArcs = [];
  for (let i = 0; i < radialPoints.length; i++) {
    const nextIdx = (i + 1) % radialPoints.length;
    // Inner web arc
    if (Math.random() > 0.15) {
      const a = radialPoints[i][1];
      const b = radialPoints[nextIdx][1];
      const midX = (a.x + b.x) / 2 + (Math.random() * 6 - 3);
      const midY = (a.y + b.y) / 2 + (Math.random() * 6 - 3);
      webArcs.push(`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`);
    }
    // Mid web arc
    if (Math.random() > 0.25) {
      const a = radialPoints[i][2];
      const b = radialPoints[nextIdx][2];
      const midX = (a.x + b.x) / 2 + (Math.random() * 10 - 5);
      const midY = (a.y + b.y) / 2 + (Math.random() * 10 - 5);
      webArcs.push(`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`);
    }
  }
  const webArcsStr = webArcs.join(' ');

  // Glass Shard Reflections
  const shards = [];
  for (let s = 0; s < 4; s++) {
    const idx = Math.floor(Math.random() * (radialPoints.length - 1));
    const pA1 = radialPoints[idx][1];
    const pA2 = radialPoints[idx][2];
    const pB2 = radialPoints[idx + 1][2];
    const pB1 = radialPoints[idx + 1][1];
    shards.push(`<polygon points="${pA1.x},${pA1.y} ${pA2.x},${pA2.y} ${pB2.x},${pB2.y} ${pB1.x},${pB1.y}" fill="url(#glassShardGrad-${crackId})" opacity="0.32" />`);
  }

  // Center impact crater
  const craterPts = [];
  for (let c = 0; c < 8; c++) {
    const a = (c * 45) * Math.PI / 180;
    const r = 4.5 + Math.random() * 5.5;
    craterPts.push(`${Math.round(Math.cos(a) * r)},${Math.round(Math.sin(a) * r)}`);
  }

  return `
    <svg class="glass-crack-svg" width="260" height="260" viewBox="-130 -130 260 260" style="position: absolute; left: -130px; top: -130px; pointer-events: none; overflow: visible;">
      <defs>
        <radialGradient id="glassCraterGrad-${crackId}" cx="0" cy="0" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="35%" stop-color="#7dd3fc" stop-opacity="0.85"/>
          <stop offset="70%" stop-color="#0284c7" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="glassShardGrad-${crackId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#0369a1" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      
      <!-- Glass Shards -->
      ${shards.join('\n      ')}
      
      <!-- Depth Shadow Layer (simulates glass refraction edge) -->
      <path d="${darkPaths}" fill="none" stroke="rgba(2, 8, 20, 0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(1, 1.5)"/>
      <path d="${webArcsStr}" fill="none" stroke="rgba(2, 8, 20, 0.6)" stroke-width="2.2" stroke-linecap="round" transform="translate(1, 1.5)"/>
      
      <!-- Cyan Stress Tint Layer -->
      <path d="${darkPaths}" fill="none" stroke="rgba(56, 189, 248, 0.8)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${webArcsStr}" fill="none" stroke="rgba(56, 189, 248, 0.7)" stroke-width="1.4" stroke-linecap="round"/>
      
      <!-- Specular Highlight Layer (Bright White Glass Edge) -->
      <path d="${darkPaths}" fill="none" stroke="rgba(255, 255, 255, 0.98)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${webArcsStr}" fill="none" stroke="rgba(255, 255, 255, 0.92)" stroke-width="0.9" stroke-linecap="round"/>
      
      <!-- Central Impact Crater -->
      <polygon points="${craterPts.join(' ')}" fill="url(#glassCraterGrad-${crackId})" stroke="#ffffff" stroke-width="1.2" />
      <circle cx="0" cy="0" r="3" fill="#ffffff" />
    </svg>
  `;
}

export function spawnGlassCrack(x, y, container) {
  if (!container || typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const layer = container.querySelector('#trsa-glass-crack-layer');
  if (!layer) return;

  // Limit max active cracks to 8
  while (layer.children.length >= 8) {
    layer.firstElementChild.remove();
  }

  const crackId = `crack_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const crackEl = document.createElement('div');
  crackEl.className = 'glass-crack-instance';
  crackEl.style.left = `${Math.round(x)}px`;
  crackEl.style.top = `${Math.round(y)}px`;
  crackEl.innerHTML = generateGlassCrackSVG(crackId);

  layer.appendChild(crackEl);

  // Shudder the form slightly for tactile impact feedback
  const form = container.querySelector('#trsa-login-form');
  if (form) {
    form.classList.remove('glass-impact-shake');
    void form.offsetWidth; // force reflow
    form.classList.add('glass-impact-shake');
    setTimeout(() => {
      form.classList.remove('glass-impact-shake');
    }, 200);
  }

  // Audio feedback
  playGlassCrackSound();

  // Auto clean up after animation fades out
  setTimeout(() => {
    if (crackEl.parentNode) {
      crackEl.remove();
    }
  }, 4600);
}

export function attachGlassCrackEffect(loginRing) {
  if (!loginRing) return;
  loginRing.addEventListener('pointerdown', (e) => {
    // Only trigger on mouse left click or single touch pointer
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = loginRing.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    spawnGlassCrack(x, y, loginRing);
  });
}

function attachLoginHandlers() {
  const form = document.getElementById('trsa-login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const idEl = document.getElementById('login-identifier');
      const pwdEl = document.getElementById('login-password');
      const identifier = idEl ? idEl.value.trim() : '';
      const password = pwdEl ? pwdEl.value : '';
      store.loginDraftIdentifier = identifier;
      const rocket = document.getElementById('trsa-launch-rocket');
      if (rocket) rocket.classList.add('rocket-boosting');
      store.login(identifier, password);
      render();
    });
  }

  // Attach interactive glass crack animation to the login form container
  const loginRing = document.querySelector('.trsa-login-ring');
  if (loginRing) {
    attachGlassCrackEffect(loginRing);
  }

  // Ensure robot video autoplays smoothly
  const robotVideo = document.querySelector('.trsa-robot-video-header');
  if (robotVideo) {
    robotVideo.muted = true;
    const playPromise = robotVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const resumePlay = () => {
          robotVideo.play().catch(() => {});
          window.removeEventListener('pointerdown', resumePlay);
          window.removeEventListener('keydown', resumePlay);
        };
        window.addEventListener('pointerdown', resumePlay, { once: true });
        window.addEventListener('keydown', resumePlay, { once: true });
      });
    }
  }
}

function renderPdfModal() {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        <div class="p-4 sm:p-5 bg-gradient-to-r from-[#0F2942] to-[#0284C7] text-white flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 class="text-sm font-bold">TRSA Compliance Matrix Reference Document (<span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span>)</h3>
            <p class="text-[11px] text-sky-200">Authoritative 19-Clause Standard (Clauses I–XIX) &bull; Plants 1402, 1403, 1405, 1411</p>
          </div>
          <div class="flex items-center gap-2">
            <a href="${TRSA_MATRIX_PDF_PATH}" download="TRSA_Matrix_PT_Indofood_Fortuna_Makmur.pdf" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all">
              Download PDF
            </a>
            <button type="button" onclick="window.TRSA.closePdfModal()" class="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-sm font-bold">
              &times;
            </button>
          </div>
        </div>
        <div class="flex-1 bg-slate-100">
          <iframe src="${TRSA_MATRIX_PDF_PATH}" title="TRSA Matrix PT Indofood Fortuna Makmur PDF" class="w-full h-full border-0"></iframe>
        </div>
      </div>
    </div>
  `;
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

// Forensic Audit Trail & Activity Log Modal
function renderAuditModal() {
  const activeProj = store.getActiveProject();
  const baseLogs = getAuditLogs();
  const stats = computeActivityStats(
    store.auditProjectFilter === 'current' && activeProj
      ? baseLogs.filter(l => l.projectId === activeProj.id)
      : baseLogs
  );
  const allLogs = filterAuditLogs(baseLogs, {
    projectId: store.auditProjectFilter === 'current' && activeProj ? activeProj.id : null,
    domain: store.auditDomainFilter || ACTIVITY_DOMAINS.ALL,
    action: store.auditActionFilter || 'all',
    searchQuery: store.auditSearchQuery || ''
  });

  const actionColors = {
    CREATE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    UPDATE: 'bg-sky-50 text-sky-800 border-sky-200',
    PLANT_CHANGE: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    REVISION_STAMP: 'bg-amber-50 text-amber-800 border-amber-200',
    DUPLICATE: 'bg-purple-50 text-purple-800 border-purple-200',
    STATUS_CHANGE: 'bg-blue-50 text-blue-800 border-blue-200',
    MATRIX_ALIGNMENT: 'bg-teal-50 text-teal-800 border-teal-200',
    USER_MATRIX_SETTING: 'bg-teal-50 text-teal-800 border-teal-200',
    USER_MATRIX_PRESET: 'bg-teal-50 text-teal-800 border-teal-200',
    MATRIX_PLANT_ACCESS: 'bg-teal-50 text-teal-800 border-teal-200',
    MATRIX_ORIGIN_ACCESS: 'bg-teal-50 text-teal-800 border-teal-200',
    MATRIX_CLAUSE_ACCESS: 'bg-teal-50 text-teal-800 border-teal-200',
    MATRIX_POLICY_BLOCK: 'bg-rose-50 text-rose-800 border-rose-200',
    USER_LOGIN_FAILED: 'bg-rose-50 text-rose-800 border-rose-200',
    DELETE: 'bg-rose-50 text-rose-800 border-rose-200',
    BULK_DELETE: 'bg-rose-50 text-rose-800 border-rose-200'
  };

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        <!-- Header -->
        <div class="p-6 bg-gradient-to-r from-[#0F2942] via-[#16365C] to-[#0284C7] text-white flex items-center justify-between flex-shrink-0 gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md shrink-0">
              <svg class="w-5 h-5 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold truncate">Activity Log &amp; Forensic Audit Trail</h3>
                <span class="text-xs text-sky-200 font-mono tabular-nums whitespace-nowrap">${allLogs.length} / ${stats.total} events</span>
              </div>
              <p class="text-xs text-sky-200 mt-0.5 truncate">Tracks user actions, project specification diffs, and Compliance Matrix updates.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="window.TRSA.openFullActivityLog()" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer">
              Open Activity Console &rarr;
            </button>
            <button type="button" onclick="window.TRSA.closeAuditModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all text-sm font-bold cursor-pointer">
              &times;
            </button>
          </div>
        </div>

        <!-- Domain Segmented Filter + Toolbar -->
        <div class="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs flex-shrink-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
              ${[
                { key: ACTIVITY_DOMAINS.ALL, label: 'All Activity', count: stats.total },
                { key: ACTIVITY_DOMAINS.USER_ACTION, label: 'User Actions', count: stats.byDomain.user_action },
                { key: ACTIVITY_DOMAINS.PROJECT_CHANGE, label: 'Project Changes', count: stats.byDomain.project_change },
                { key: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, label: 'Compliance Matrix', count: stats.byDomain.compliance_matrix }
              ].map(tab => {
                const active = (store.auditDomainFilter || ACTIVITY_DOMAINS.ALL) === tab.key;
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.setAuditDomainFilter('${tab.key}')"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                      active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }"
                  >${tab.label} (${tab.count})</button>
                `;
              }).join('')}
            </div>

            <div class="flex items-center gap-2">
              <button type="button" onclick="window.TRSA.downloadAuditJSON()" class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer">
                Export JSON
              </button>
              <button type="button" onclick="window.TRSA.downloadAuditCSV()" class="btn-capiclean-accent text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                Export CSV
              </button>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-2">
            <select 
              id="audit-project-filter" 
              onchange="window.TRSA.setAuditProjectFilter(this.value)"
              class="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] w-full sm:w-auto"
            >
              <option value="all" ${store.auditProjectFilter === 'all' ? 'selected' : ''}>All Agreements History</option>
              <option value="current" ${store.auditProjectFilter === 'current' ? 'selected' : ''}>Active Agreement Only (${escapeHtml(activeProj.documentInfo?.docNumber || 'Current')})</option>
            </select>

            <div class="relative flex-1 w-full">
              <input 
                type="text" 
                id="audit-search-input" 
                placeholder="Search actor, action, clause, or before/after value..." 
                value="${escapeHtml(store.auditSearchQuery || '')}"
                class="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-[#0284C7] rounded-xl focus:outline-none"
              />
              <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>
        </div>

        <!-- Scrollable Timeline Body -->
        <div class="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F8FAFC]">
          ${allLogs.length === 0 ? `
            <div class="text-center py-14 space-y-3">
              <div class="text-sm font-bold text-slate-700">No matching activity records found</div>
              <div class="text-xs text-slate-500 max-w-sm mx-auto">Adjust your category or search filter to inspect user actions, TRSA edits, and Compliance Matrix updates.</div>
              <button type="button" onclick="window.TRSA.resetAuditFilters()" class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">Reset Filters</button>
            </div>
          ` : `
            <div class="space-y-3">
              ${allLogs.map(log => {
                const actionBadgeClass = actionColors[log.action] || 'bg-slate-100 text-slate-800 border-slate-200';
                const formattedTime = formatAuditTimestamp(log.createdAt);
                const relTime = getRelativeTime(log.createdAt);
                const domainLabel = ACTIVITY_DOMAIN_LABELS[log.domain] || 'Activity';

                return `
                  <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                          ${escapeHtml(log.userInitials || 'IFM')}
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-slate-900 truncate">
                            ${escapeHtml(log.userName)}
                          </div>
                          <div class="text-[11px] text-slate-500 truncate">
                            ${escapeHtml(log.userRole)} &middot; ${escapeHtml(log.userDept || 'MFG')}${log.userEmail ? ` &middot; <span class="font-mono">${escapeHtml(log.userEmail)}</span>` : ''}
                          </div>
                        </div>
                      </div>

                      <div class="text-left sm:text-right shrink-0">
                        <div class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${actionBadgeClass}">
                          <span>${escapeHtml(log.action)}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                          <span>${escapeHtml(domainLabel)}</span>
                          <span aria-hidden="true"> &middot; </span>
                          <span>${escapeHtml(formattedTime)}</span>
                          <span class="text-slate-400">(${escapeHtml(relTime)})</span>
                        </div>
                      </div>
                    </div>

                    ${(log.projectDocNumber || log.targetEntity) ? `
                      <div class="text-[11px] text-slate-600 font-mono">
                        Target: <span class="font-semibold text-slate-900">${escapeHtml(log.projectDocNumber || log.targetEntity)}</span>
                      </div>
                    ` : ''}

                    <div class="space-y-2">
                      ${(log.diffDetails && log.diffDetails.length > 0 ? log.diffDetails : [{
                        category: 'Activity',
                        description: (log.changedFields || []).join(', ') || 'Recorded event',
                        from: '',
                        to: ''
                      }]).map(diff => `
                        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="text-[11px] font-bold text-[#0369A1]">${escapeHtml(diff.category || 'Update')}</span>
                            <span class="text-[11px] font-medium text-slate-700">${escapeHtml(diff.description)}</span>
                          </div>
                          ${(diff.from || diff.to) ? `
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/60 font-mono">
                              <div class="text-rose-700 break-words">
                                <span class="text-[10px] font-sans font-bold text-slate-400 uppercase mr-1">Before:</span>${escapeHtml(diff.from || '(None)')}
                              </div>
                              <div class="text-emerald-800 break-words font-semibold">
                                <span class="text-[10px] font-sans font-bold text-slate-400 uppercase mr-1">After:</span>${escapeHtml(diff.to || '(Empty)')}
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      `).join('')}
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
            Immutable activity trail persisted in LocalStorage &amp; queued for PostgreSQL sync
          </div>
          <button type="button" onclick="window.TRSA.closeAuditModal()" class="btn-capiclean-accent text-xs px-5 py-2 font-bold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
}

// 1. Sidebar Component (Blue Sky Theme)
function renderSidebar(activeProject) {
  const current = store.currentView;
  const draftCount = getDraftHistory().length;
  const activityCount = getAuditLogs().length;
  const matrixAudit = auditProjectMatrixCompliance(activeProject);
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
              <div class="text-[10px] tracking-widest uppercase">
                <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span>
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
                Summary Dashboard
              </button>
              <button onclick="window.TRSA.setView('projects')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'projects' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  TRSA Projects
                </span>
                <span class="px-2 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-black border border-white/30 tabular-nums">${store.projects.length}</span>
              </button>
              <button onclick="window.TRSA.setView('history')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'history' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                  Draft History
                </span>
                <span class="px-2 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-black border border-white/30 tabular-nums">${draftCount}</span>
              </button>
              <button onclick="window.TRSA.setView('directory')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'directory' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Master Directory
                </span>
                <span class="text-[10px] text-sky-100 font-semibold tabular-nums">${store.teamMembers.length}</span>
              </button>
              <button onclick="window.TRSA.setView('activity')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'activity' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                  Activity Log
                </span>
                <span class="text-[10px] text-sky-100 font-semibold tabular-nums">${activityCount}</span>
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
              <button onclick="window.TRSA.setView('matrix')" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                current === 'matrix' ? 'dropx-nav-active' : 'hover:bg-white/15 text-white/90 hover:text-white'
              }">
                <span class="flex items-center gap-3">
                  <svg class="w-4 h-4 text-[#93C5FD]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Compliance Matrix
                </span>
                <span class="px-2 py-0.5 text-[10px] rounded-full ${
                  !store.getCurrentUserMatrixSetting().canViewMatrix
                    ? 'bg-red-400/30 border-red-200/50'
                    : matrixAudit.complianceScore === 100
                      ? 'bg-emerald-400/30 border-emerald-200/50'
                      : 'bg-amber-400/30 border-amber-200/50'
                } text-white font-black border">${store.getCurrentUserMatrixSetting().canViewMatrix ? `${matrixAudit.complianceScore}%` : 'Locked'}</span>
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
      <div class="p-4 border-t border-white/20 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 truncate cursor-pointer" onclick="window.TRSA.toggleUserMenu()" title="Logged in as: ${escapeHtml(store.currentUser.name)} (${escapeHtml(store.currentUser.jabatan || store.currentUser.role)})">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black text-[#0284C7] shadow-md flex-shrink-0">
              ${escapeHtml(store.currentUser.initials)}
            </div>
            <div class="truncate">
              <div class="text-xs font-bold text-white truncate">${escapeHtml(store.currentUser.name)}</div>
              <div class="text-[10px] text-sky-100 truncate">${escapeHtml(store.currentUser.jabatan || store.currentUser.role)} &middot; ${escapeHtml(store.currentUser.dept)}</div>
            </div>
          </div>
          <button
            type="button"
            onclick="window.TRSA.logout()"
            title="Sign Out to Animated Login Screen"
            class="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
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
            <option value="Cikokol Plant" ${store.plantFilter === 'Cikokol Plant' ? 'selected' : ''}>1402 - Cikokol Plant</option>
            <option value="Semarang Plant" ${store.plantFilter === 'Semarang Plant' ? 'selected' : ''}>1403 - Semarang Plant</option>
            <option value="Cikupa Plant" ${store.plantFilter === 'Cikupa Plant' ? 'selected' : ''}>1405 - Cikupa Plant</option>
            <option value="Agro Plant" ${store.plantFilter === 'Agro Plant' ? 'selected' : ''}>1411 - Agro Plant</option>
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
          <div id="user-switcher-dropdown" class="${store.showUserMenu ? '' : 'hidden'} absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 max-h-[75vh] overflow-y-auto">
            <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Session</div>
                <div class="text-[11px] font-bold text-[#0F172A]">${escapeHtml(store.currentUser.jabatan || store.currentUser.role)} &middot; ${escapeHtml(store.currentUser.dept)}</div>
              </div>
              <button
                type="button"
                onclick="window.TRSA.logout()"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer"
              >
                Sign Out
              </button>
            </div>
            <div class="px-3 pt-1.5 pb-1 flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch User / Role</span>
              <button type="button" onclick="window.TRSA.showUserMenu = false; window.TRSA.setView('directory')" class="text-[10px] font-bold text-[#0284C7] hover:underline">
                Manage Directory &rarr;
              </button>
            </div>
            ${store.teamMembers.map(m => `
              <button 
                type="button" 
                onclick="window.TRSA.switchUser('${escapeHtml(m.name)}')" 
                class="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  m.name === store.currentUser.name 
                    ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-100' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }"
              >
                <div class="min-w-0 pr-2">
                  <div class="text-xs font-bold truncate">${escapeHtml(m.name)}</div>
                  <div class="text-[10px] text-slate-500 truncate">${escapeHtml(m.jabatan || m.role)} &middot; ${escapeHtml(m.dept)}</div>
                  <div class="text-[10px] text-[#0369A1] font-medium truncate">${escapeHtml(m.role)}</div>
                </div>
                ${m.name === store.currentUser.name ? '<span class="text-xs font-bold text-[#0284C7] shrink-0">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </header>
  `;
}

// 3. Summary Dashboard View (Recent TRSA Projects, Creation Dates, Status & Portfolio Stats)
function renderDashboard() {
  const activeProject = store.getActiveProject();
  const allDrafts = getDraftHistory();
  const sortBy = store.dashboardSort || 'recent';
  const stats = computeAgreementStats(store.projects, {
    drafts: allDrafts,
    statusFilter: store.statusFilter,
    plantFilter: store.plantFilter,
    searchQuery: store.searchQuery,
    sortBy
  });

  const statusMeta = {
    Published: {
      barClass: 'bg-sky-600',
      trackBg: 'bg-sky-50',
      textClass: 'text-sky-700',
      badgeClass: 'badge-published',
      desc: 'Released & signed tender specifications'
    },
    Approved: {
      barClass: 'bg-emerald-600',
      trackBg: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      badgeClass: 'badge-approved',
      desc: 'Signed off by engineering & procurement'
    },
    'Under Review': {
      barClass: 'bg-amber-500',
      trackBg: 'bg-amber-50',
      textClass: 'text-amber-700',
      badgeClass: 'badge-review',
      desc: 'Pending technical or commercial review'
    },
    Draft: {
      barClass: 'bg-slate-500',
      trackBg: 'bg-slate-100',
      textClass: 'text-slate-700',
      badgeClass: 'badge-draft',
      desc: 'Work in progress inside TRSA builder'
    }
  };

  const hasActiveFilter = store.statusFilter !== 'all' || store.plantFilter !== 'all' || Boolean(store.searchQuery);
  const recentDrafts = allDrafts.slice(0, 3);
  const userIsAdmin = store.isAdmin();

  const validSelectedIds = (store.selectedProjectIds || []).filter(id => store.projects.some(p => p.id === id));
  const filteredIds = stats.filteredAgreements.map(p => p.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => validSelectedIds.includes(id));

  return `
    <div class="space-y-6 animate-fadeIn">
      <!-- Summary Workspace Overview Bar (Single-Elevation Corporate Header) -->
      <div class="dropx-card p-6 bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div class="space-y-1.5 max-w-2xl">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span>
            <span aria-hidden="true">&middot;</span>
            <span>TRSA Specification Portfolio</span>
            <span aria-hidden="true">&middot;</span>
            <span class="font-mono tabular-nums text-[#0369A1]">Active: ${escapeHtml(activeProject?.documentInfo?.docNumber || 'Pending')}</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-[#0F172A]">TRSA Agreement Dashboard</h1>
          <p class="text-xs text-slate-600 leading-relaxed">
            Manage recent TRSA projects, track creation dates and approval statuses across plants, and jump directly into the 6-step specification builder or A4 form.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onclick="window.TRSA.createProject()"
            class="btn-capiclean-accent text-xs px-4 py-2 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            New Agreement
          </button>
          <button
            type="button"
            onclick="window.TRSA.setView('builder', 1)"
            class="btn-capiclean-primary text-xs px-4 py-2 flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Open Form Editor
          </button>
          <button
            type="button"
            onclick="window.TRSA.setView('studio')"
            class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg class="w-4 h-4 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Official A4 Form
          </button>
        </div>
      </div>

      <!-- 4-Column Tabular KPI Summary Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="text-xs font-semibold text-slate-500">Total TRSA Agreements</div>
          <div class="text-3xl font-bold text-[#0F172A] mt-2 font-mono tabular-nums" data-stat="total-agreements">${stats.totalCount}</div>
          <div class="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            ${stats.plantDistribution.length} facility ${stats.plantDistribution.length === 1 ? 'site' : 'sites'} &middot; ${stats.totalScopeModules} equipment units
          </div>
        </div>

        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="text-xs font-semibold text-slate-500">Published &amp; Approved</div>
          <div class="text-3xl font-bold text-emerald-700 mt-2 font-mono tabular-nums" data-stat="finalized-agreements">${stats.finalizedCount}</div>
          <div class="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            ${stats.finalizedPercentage}% of total (${stats.publishedCount} Published &middot; ${stats.approvedCount} Approved)
          </div>
        </div>

        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="text-xs font-semibold text-slate-500">In Review &amp; Draft</div>
          <div class="text-3xl font-bold text-amber-600 mt-2 font-mono tabular-nums" data-stat="in-progress-agreements">${stats.inProgressCount}</div>
          <div class="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            ${stats.inProgressPercentage}% active (${stats.underReviewCount} Under Review &middot; ${stats.draftCount} Draft)
          </div>
        </div>

        <div class="dropx-card p-5 bg-white border border-slate-200">
          <div class="text-xs font-semibold text-slate-500">Average Completeness</div>
          <div class="text-3xl font-bold text-[#0284C7] mt-2 font-mono tabular-nums" data-stat="avg-completeness">${stats.avgCompleteness}%</div>
          <div class="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            ${stats.validationSummary.validCount}/${stats.totalCount} validation-clean &middot; ${stats.totalProductVariants} product shapes
          </div>
        </div>
      </div>

      <!-- Recent TRSA Projects Registry (Primary Multi-Agreement Management Table) -->
      <div class="dropx-card overflow-hidden bg-white border border-slate-200" data-section="recent-trsa-projects">
        <div class="p-5 border-b border-slate-200 space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-[#0F172A]">Recent TRSA Projects</h2>
              <p class="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                Showing ${stats.filteredCount} of ${stats.totalCount} ${stats.totalCount === 1 ? 'agreement' : 'agreements'}${hasActiveFilter ? ' (filtered)' : ''} &middot; Sorted by ${
                  sortBy === 'recent' ? 'Creation Date (Newest)' :
                  sortBy === 'oldest' ? 'Creation Date (Oldest)' :
                  sortBy === 'status' ? 'Approval Status' :
                  sortBy === 'completeness' ? 'Completeness' : 'Title A–Z'
                }
              </p>
            </div>

            <!-- Search, Plant Filter & Sort Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative w-full sm:w-56">
                <input
                  type="text"
                  id="dashboard-search"
                  placeholder="Filter title, doc #, vendor..."
                  value="${escapeHtml(store.searchQuery)}"
                  aria-label="Filter recent TRSA projects"
                  class="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white rounded-lg focus:outline-none transition-colors placeholder:text-slate-400"
                />
                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <select
                id="dashboard-plant-filter"
                aria-label="Filter projects by plant location"
                class="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
              >
                <option value="all" ${store.plantFilter === 'all' ? 'selected' : ''}>All Plants</option>
                <option value="Cikokol Plant" ${store.plantFilter === 'Cikokol Plant' ? 'selected' : ''}>1402 &middot; Cikokol</option>
                <option value="Semarang Plant" ${store.plantFilter === 'Semarang Plant' ? 'selected' : ''}>1403 &middot; Semarang</option>
                <option value="Cikupa Plant" ${store.plantFilter === 'Cikupa Plant' ? 'selected' : ''}>1405 &middot; Cikupa</option>
                <option value="Agro Plant" ${store.plantFilter === 'Agro Plant' ? 'selected' : ''}>1411 &middot; Agro</option>
              </select>

              <select
                id="dashboard-sort"
                aria-label="Sort recent TRSA projects"
                class="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
              >
                <option value="recent" ${sortBy === 'recent' ? 'selected' : ''}>Newest First</option>
                <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
                <option value="status" ${sortBy === 'status' ? 'selected' : ''}>By Status</option>
                <option value="completeness" ${sortBy === 'completeness' ? 'selected' : ''}>Completeness</option>
                <option value="title" ${sortBy === 'title' ? 'selected' : ''}>Title A–Z</option>
              </select>

              <button type="button" onclick="window.TRSA.createProject()" class="text-xs bg-sky-50 text-[#0284C7] hover:bg-sky-100 border border-sky-200 font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0">
                + New TRSA
              </button>
            </div>
          </div>

          <!-- Status Segmented Filter Tabs -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter agreements by status">
              ${['all', ...AGREEMENT_STATUSES].map(st => {
                const count = st === 'all' ? stats.totalCount : (stats.statusCounts[st] || 0);
                const isActive = store.statusFilter === st;
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.setStatusFilter('${escapeHtml(st)}')"
                    class="px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isActive ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                    }"
                  >
                    ${st === 'all' ? 'All' : escapeHtml(st)} <span class="font-mono tabular-nums text-[11px] text-slate-500">(${count})</span>
                  </button>
                `;
              }).join('')}
            </div>

            ${hasActiveFilter ? `
              <button type="button" onclick="window.TRSA.resetDashboardFilters()" class="text-xs font-semibold text-slate-600 hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0">
                Reset Filters
              </button>
            ` : ''}
          </div>

          ${validSelectedIds.length > 0 ? `
            <!-- Multi-Agreement Bulk Management Action Bar -->
            <div class="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-wrap items-center justify-between gap-3" data-bulk-bar="true">
              <div class="flex items-center gap-3 text-xs">
                <span class="font-bold text-[#0F172A] font-mono tabular-nums">${validSelectedIds.length} ${validSelectedIds.length === 1 ? 'agreement' : 'agreements'} selected</span>
                <button type="button" onclick="window.TRSA.clearProjectSelection()" class="text-slate-600 hover:text-[#0F172A] underline font-medium">
                  Clear
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Bulk update status for selected agreements"
                  onchange="if (this.value) { window.TRSA.bulkUpdateProjectStatus(this.value); this.value = ''; }"
                  class="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer focus:outline-none focus:border-[#0284C7]"
                >
                  <option value="">Set Status...</option>
                  ${AGREEMENT_STATUSES.map(opt => {
                    const disabled = !userIsAdmin && !['Draft', 'Under Review'].includes(opt);
                    return `<option value="${escapeHtml(opt)}" ${disabled ? 'disabled' : ''}>${escapeHtml(opt)}${disabled ? ' (Admin)' : ''}</option>`;
                  }).join('')}
                </select>
                <button
                  type="button"
                  onclick="window.TRSA.bulkExportSelectedProjects()"
                  class="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Export JSON
                </button>
                ${store.confirmBulkDelete ? `
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      onclick="window.TRSA.confirmBulkDeleteProjects()"
                      class="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Confirm Delete (${validSelectedIds.length})
                    </button>
                    <button
                      type="button"
                      onclick="window.TRSA.cancelBulkDelete()"
                      class="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ` : `
                  <button
                    type="button"
                    onclick="window.TRSA.requestBulkDelete()"
                    class="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Delete Selected
                  </button>
                `}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="overflow-x-auto">
          ${stats.filteredAgreements.length === 0 ? `
            <div class="p-10 text-center space-y-3">
              <div class="text-sm font-semibold text-slate-700">No agreements match the current filters</div>
              <p class="text-xs text-slate-500">Try clearing the status, plant, or search filter, or create a new TRSA agreement.</p>
              <div class="flex items-center justify-center gap-2 pt-1">
                ${hasActiveFilter ? `
                  <button type="button" onclick="window.TRSA.resetDashboardFilters()" class="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                    Reset Filters
                  </button>
                ` : ''}
                <button type="button" onclick="window.TRSA.createProject()" class="btn-capiclean-primary text-xs px-4 py-2">
                  + New Agreement
                </button>
              </div>
            </div>
          ` : `
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th class="py-3 pl-5 pr-2 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all visible agreements"
                      ${allFilteredSelected ? 'checked' : ''}
                      onchange="window.TRSA.toggleSelectAllProjects()"
                      class="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
                    />
                  </th>
                  <th class="py-3 px-3">Agreement Title</th>
                  <th class="py-3 px-3">Doc Number</th>
                  <th class="py-3 px-3">Created Date</th>
                  <th class="py-3 px-3">Plant</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3">Readiness</th>
                  <th class="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${stats.filteredAgreements.map(proj => {
                  const isActiveProj = proj.id === store.activeProjectId;
                  const isChecked = validSelectedIds.includes(proj.id);
                  const isConfirmingDelete = store.confirmDeleteProjectId === proj.id;
                  const progress = calculateProjectCompleteness(proj);
                  const status = normalizeAgreementStatus(proj.documentInfo?.status);
                  const createdIso = resolveProjectCreatedAt(proj);
                  const formattedCreated = formatAgreementDate(createdIso);
                  const relativeCreated = getRelativeAgreementAge(createdIso);
                  const creatorName = proj.documentInfo?.revisionHistory?.[0]?.originatedBy || '';
                  const plantName = proj.documentInfo?.plantLocation || proj.generalInfo?.plantLocation || 'Semarang Plant';
                  const plantCode = resolvePlantCode(plantName);
                  const vendorOrigin = proj.documentInfo?.vendorOrigin || 'Foreign';
                  const validationRes = stats.validationSummary.byProjectId[proj.id] || { valid: true, totalErrors: 0 };

                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors ${isActiveProj ? 'bg-sky-50/40' : ''}" data-project-id="${escapeHtml(proj.id)}">
                      <td class="py-3 pl-5 pr-2 align-middle">
                        <input
                          type="checkbox"
                          aria-label="Select ${escapeHtml(proj.documentInfo?.title || proj.id)}"
                          ${isChecked ? 'checked' : ''}
                          onchange="window.TRSA.toggleSelectProject('${escapeHtml(proj.id)}')"
                          class="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7] cursor-pointer"
                        />
                      </td>
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-[#0F172A] text-xs">${escapeHtml(proj.documentInfo?.title || 'Untitled TRSA Agreement')}</span>
                          ${isActiveProj ? '<span class="text-[11px] font-semibold text-[#0284C7]">(Active)</span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          ${escapeHtml(proj.generalInfo?.vendorName || proj.documentInfo?.subTitle || 'PT Indofood Fortuna Makmur')}
                          ${proj.generalInfo?.equipmentType ? ` &middot; ${escapeHtml(proj.generalInfo.equipmentType)}` : ''}
                        </div>
                      </td>
                      <td class="py-3 px-3 font-mono tabular-nums font-medium text-[#0369A1] whitespace-nowrap">
                        ${escapeHtml(proj.documentInfo?.docNumber || 'Pending')}
                      </td>
                      <td class="py-3 px-3 whitespace-nowrap" data-created-date="${escapeHtml(createdIso || '')}">
                        <div class="font-mono tabular-nums font-medium text-[#0F172A]">${escapeHtml(formattedCreated)}</div>
                        <div class="text-[11px] text-slate-500 font-mono tabular-nums">
                          ${[relativeCreated, creatorName].filter(Boolean).map(s => escapeHtml(s)).join(' &middot; ') || 'Initial baseline'}
                        </div>
                      </td>
                      <td class="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div class="font-medium text-slate-800">${escapeHtml(plantCode)} &middot; ${escapeHtml(plantName.replace(' Plant', ''))}</div>
                        <div class="text-[11px] text-slate-500">${escapeHtml(vendorOrigin)} sourcing</div>
                      </td>
                      <td class="py-3 px-3 whitespace-nowrap">
                        <select
                          aria-label="Agreement status for ${escapeHtml(proj.documentInfo?.title || proj.id)}"
                          onchange="window.TRSA.updateProjectStatus('${escapeHtml(proj.id)}', this.value)"
                          class="text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 ${
                            status === 'Published' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                            status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            status === 'Under Review' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }"
                        >
                          ${AGREEMENT_STATUSES.map(opt => {
                            const disabled = !userIsAdmin && !['Draft', 'Under Review'].includes(opt) && opt !== status;
                            return `<option value="${escapeHtml(opt)}" ${status === opt ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${escapeHtml(opt)}</option>`;
                          }).join('')}
                        </select>
                      </td>
                      <td class="py-3 px-3 whitespace-nowrap">
                        <div class="flex items-center gap-2 font-mono tabular-nums">
                          <div class="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-full bg-[#0284C7] rounded-full" style="width: ${progress}%"></div>
                          </div>
                          <span class="text-[11px] font-bold text-[#0F172A]">${progress}%</span>
                          <span class="text-[11px] ${validationRes.valid ? 'text-emerald-700' : 'text-red-600'} font-semibold">
                            &middot; ${validationRes.valid ? 'Valid' : `${validationRes.totalErrors} err`}
                          </span>
                        </div>
                      </td>
                      <td class="py-3 px-5 text-right whitespace-nowrap">
                        ${isConfirmingDelete ? `
                          <div class="inline-flex items-center gap-1.5">
                            <button type="button" onclick="window.TRSA.deleteProject('${escapeHtml(proj.id)}')" class="px-2.5 py-1 text-white bg-red-600 hover:bg-red-700 rounded-lg font-bold text-[11px] transition-colors">
                              Confirm
                            </button>
                            <button type="button" onclick="window.TRSA.cancelDeleteProject()" class="px-2 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-[11px]">
                              Cancel
                            </button>
                          </div>
                        ` : `
                          <div class="inline-flex items-center gap-1">
                            <button type="button" onclick="window.TRSA.setActiveProject('${escapeHtml(proj.id)}', 'builder')" class="px-2.5 py-1 text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg font-semibold text-[11px] transition-colors">
                              Edit
                            </button>
                            <button type="button" onclick="window.TRSA.setActiveProject('${escapeHtml(proj.id)}', 'studio')" class="px-2.5 py-1 text-slate-700 hover:text-[#0284C7] hover:bg-slate-100 rounded-lg font-medium text-[11px] transition-colors">
                              A4 Form
                            </button>
                            <button type="button" onclick="window.TRSA.duplicateProject('${escapeHtml(proj.id)}')" class="px-2 py-1 text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg font-semibold text-[11px]" title="Duplicate Agreement">
                              Clone
                            </button>
                            <button type="button" onclick="window.TRSA.requestDeleteProject('${escapeHtml(proj.id)}')" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg font-semibold text-[11px]" title="Delete Agreement" aria-label="Delete ${escapeHtml(proj.documentInfo?.title || proj.id)}">
                              Delete
                            </button>
                          </div>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- Status Distribution & Facility Breakdown Split -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <!-- Status Distribution Panel (7 cols) -->
        <div class="lg:col-span-7 dropx-card p-6 bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 class="text-base font-bold text-[#0F172A]">Agreement Status Distribution</h2>
                <p class="text-xs text-slate-500 mt-0.5">Lifecycle breakdown across all created TRSA agreements. Click a status row to filter.</p>
              </div>
              ${store.statusFilter !== 'all' ? `
                <button
                  type="button"
                  onclick="window.TRSA.setStatusFilter('all')"
                  class="text-xs font-semibold text-[#0284C7] hover:underline whitespace-nowrap shrink-0"
                >
                  Clear Status Filter (${escapeHtml(store.statusFilter)})
                </button>
              ` : `
                <span class="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">${stats.totalCount} total</span>
              `}
            </div>

            ${stats.totalCount === 0 ? `
              <div class="py-10 text-center space-y-3">
                <div class="text-sm font-semibold text-slate-700">No TRSA agreements created yet</div>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">Create your first Tender Requirements &amp; Specification Agreement to see live status metrics.</p>
                <button type="button" onclick="window.TRSA.createProject()" class="btn-capiclean-primary text-xs px-4 py-2">
                  Create First TRSA
                </button>
              </div>
            ` : `
              <!-- Multi-Segment Stacked Distribution Bar -->
              <div class="mt-5">
                <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex" role="img" aria-label="Agreement status distribution bar">
                  ${stats.statusDistribution.map(item => {
                    if (item.count === 0) return '';
                    const exactWidth = stats.totalCount > 0 ? ((item.count / stats.totalCount) * 100).toFixed(2) : '0';
                    const meta = statusMeta[item.status] || statusMeta.Draft;
                    return `<div class="${meta.barClass} h-full transition-all duration-200 border-r border-white last:border-r-0" style="width: ${exactWidth}%" title="${escapeHtml(item.status)}: ${item.count} (${item.percentage}%)"></div>`;
                  }).join('')}
                </div>
              </div>

              <!-- Per-Status Interactive Rows -->
              <div class="mt-5 divide-y divide-slate-100">
                ${stats.statusDistribution.map(item => {
                  const meta = statusMeta[item.status] || statusMeta.Draft;
                  const isFiltered = store.statusFilter === item.status;
                  return `
                    <button
                      type="button"
                      onclick="window.TRSA.toggleDashboardStatusFilter('${escapeHtml(item.status)}')"
                      class="w-full py-3 px-2 -mx-2 rounded-lg text-left transition-colors hover:bg-slate-50 ${isFiltered ? 'bg-sky-50/70' : ''}"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <span class="w-2.5 h-2.5 rounded-sm shrink-0 ${meta.barClass}"></span>
                          <span class="text-xs font-bold text-[#0F172A]">${escapeHtml(item.status)}</span>
                          <span class="text-[11px] text-slate-500 truncate hidden sm:inline">${meta.desc}</span>
                        </div>
                        <div class="flex items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                          <span class="font-bold text-[#0F172A]">${item.count} ${item.count === 1 ? 'agreement' : 'agreements'}</span>
                          <span class="w-10 text-right font-semibold ${meta.textClass}">${item.percentage}%</span>
                        </div>
                      </div>
                      <div class="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="${meta.barClass} h-full rounded-full transition-all duration-200" style="width: ${item.percentage}%"></div>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Validation check across portfolio: <strong class="text-[#0F172A] font-mono tabular-nums">${stats.validationSummary.validCount}</strong> valid, <strong class="${stats.validationSummary.invalidCount > 0 ? 'text-red-600' : 'text-emerald-700'} font-mono tabular-nums">${stats.validationSummary.invalidCount}</strong> needing attention</span>
            <button type="button" onclick="window.TRSA.setView('builder', 1)" class="font-semibold text-[#0284C7] hover:underline whitespace-nowrap shrink-0">
              Review Active Draft in Editor &rarr;
            </button>
          </div>
        </div>

        <!-- Facility, Vendor Origin & Draft Checkpoints (5 cols) -->
        <div class="lg:col-span-5 dropx-card p-6 bg-white border border-slate-200 flex flex-col justify-between space-y-5">
          <div class="space-y-5">
            <div class="pb-4 border-b border-slate-100">
              <h2 class="text-base font-bold text-[#0F172A]">Facility &amp; Sourcing Breakdown</h2>
              <p class="text-xs text-slate-500 mt-0.5">Distribution by manufacturing plant and equipment vendor origin.</p>
            </div>

            <!-- By Plant Location -->
            <div class="space-y-2.5">
              <div class="text-xs font-semibold text-slate-700">By Plant Location</div>
              ${stats.plantDistribution.length === 0 ? `
                <div class="text-xs text-slate-400">No facility assignments recorded.</div>
              ` : stats.plantDistribution.map(pl => `
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-700 font-medium truncate">${escapeHtml(pl.plantLocation)}</span>
                    <span class="font-mono tabular-nums text-slate-700 font-semibold">${pl.count} (${pl.percentage}%)</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="bg-[#0284C7] h-full rounded-full" style="width: ${pl.percentage}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- By Vendor Sourcing -->
            <div class="pt-3 border-t border-slate-100 space-y-2.5">
              <div class="text-xs font-semibold text-slate-700">By Vendor Sourcing Origin</div>
              <div class="grid grid-cols-3 gap-2">
                ${stats.originDistribution.map(org => `
                  <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div class="text-[11px] font-semibold text-slate-500">${escapeHtml(org.origin)}</div>
                    <div class="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-0.5">${org.count}</div>
                    <div class="text-[11px] font-mono tabular-nums text-slate-500">${org.percentage}%</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- LocalStorage Draft Checkpoints Summary -->
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div class="text-xs text-slate-600">
              <div class="font-semibold text-[#0F172A]">Saved Local Drafts: <span class="font-mono tabular-nums">${stats.draftSummary.total}</span></div>
              <div class="text-[11px] text-slate-500 font-mono tabular-nums">${stats.draftSummary.manual} manual &middot; ${stats.draftSummary.autoSave} auto-saved</div>
            </div>
            <button type="button" onclick="window.TRSA.setView('history')" class="text-xs font-semibold text-[#0284C7] hover:underline whitespace-nowrap shrink-0">
              Draft History &rarr;
            </button>
          </div>
        </div>
      </div>

      ${recentDrafts.length > 0 ? `
        <!-- Quick Resume Saved Drafts Panel -->
        <div class="dropx-card p-5 bg-white border border-slate-200 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-sm font-bold text-[#0F172A]">Recent Saved Draft Checkpoints</h2>
              <p class="text-[11px] text-slate-500">Resume saved work directly into the specification builder.</p>
            </div>
            <button type="button" onclick="window.TRSA.setView('history')" class="text-xs font-bold text-[#0284C7] hover:underline whitespace-nowrap shrink-0">
              View All Draft History (${allDrafts.length}) &rarr;
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            ${recentDrafts.map((draft, idx) => `
              <div class="${idx > 0 ? 'pt-3 md:pt-0 md:pl-4' : ''} flex flex-col justify-between gap-2.5">
                <div>
                  <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span class="font-semibold ${draft.isAutoSave ? 'text-amber-700' : 'text-[#0284C7]'}">${draft.isAutoSave ? 'Auto-Save' : 'Manual Save'}</span>
                    <span class="font-mono tabular-nums">${escapeHtml(getDraftRelativeTime(draft.savedAt))}</span>
                  </div>
                  <div class="text-xs font-bold text-[#0F172A] truncate mt-1" title="${escapeHtml(draft.title)}">${escapeHtml(draft.title)}</div>
                  <div class="text-[11px] font-mono text-[#0369A1] truncate mt-0.5">${escapeHtml(draft.docNumber || 'No. TRSA pending')}</div>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-mono tabular-nums text-slate-500">Step ${draft.builderStep}/6 &middot; ${draft.progress}%</span>
                  <button type="button" onclick="window.TRSA.resumeDraft('${escapeHtml(draft.id)}')" class="btn-capiclean-primary text-[11px] px-3 py-1 font-bold whitespace-nowrap shrink-0">
                    Resume &rarr;
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Quick Template Scaffolding Cards -->
      <div>
        <h3 class="text-sm font-bold text-[#0B2447] mb-3">Pre-Engineered Equipment Templates</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="dropx-card p-4 hover:border-[#0284C7] cursor-pointer transition-all bg-white" onclick="window.TRSA.resetToDefault('${escapeHtml(activeProject.id)}')">
            <div class="text-xs font-bold text-[#0B2447]">Sheeted Pellet Fryer &amp; Seasoning System</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Full 14-page Indofood Semarang standard (4 products, 21 scope units, continuous 7h trial).</p>
            <div class="mt-3 text-[11px] font-bold text-[#0284C7]">
              Load Official Template &rarr;
            </div>
          </div>
          <div class="dropx-card p-4 hover:border-[#FF7A00] cursor-pointer transition-all bg-white" onclick="window.TRSA.createProject('Extruded Snack Line Agreement')">
            <div class="text-xs font-bold text-[#0B2447]">Extruded Corn &amp; Rice Snack Line</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Twin-screw extruder, pneumatic transfer, dryer oven &amp; slurry seasoning system.</p>
            <div class="mt-3 text-[11px] font-bold text-[#EA580C]">
              Scaffold Extruder TRSA &rarr;
            </div>
          </div>
          <div class="dropx-card p-4 hover:border-[#10B981] cursor-pointer transition-all bg-white" onclick="window.TRSA.createProject('Packaging & Multipack Cartoning Line')">
            <div class="text-xs font-bold text-[#0B2447]">High-Speed VFFS Packaging &amp; Multipack</div>
            <p class="text-[11px] text-[#5A7184] mt-1">Multi-head weigher, nitrogen flushing, metal detector, and automatic case packer.</p>
            <div class="mt-3 text-[11px] font-bold text-[#059669]">
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
          const createdFormatted = formatAgreementDate(resolveProjectCreatedAt(proj));
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
                    <span class="text-[#5A7184]">Created Date:</span>
                    <span class="font-mono tabular-nums font-bold text-[#0F172A]">${escapeHtml(createdFormatted)}</span>
                  </div>
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

// 4b. Draft History View (LocalStorage-based Saved Drafts)
function renderDraftHistoryView() {
  const activeProj = store.getActiveProject();
  const allDrafts = getDraftHistory();

  let filtered = allDrafts;
  if (store.historyFilter === 'manual') {
    filtered = filtered.filter(d => !d.isAutoSave);
  } else if (store.historyFilter === 'auto') {
    filtered = filtered.filter(d => d.isAutoSave);
  } else if (store.historyFilter === 'current' && activeProj) {
    filtered = filtered.filter(d => d.projectId === activeProj.id);
  }

  if (store.historySearchQuery) {
    const q = store.historySearchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.docNumber && d.docNumber.toLowerCase().includes(q)) ||
      (d.plantLocation && d.plantLocation.toLowerCase().includes(q)) ||
      (d.vendorName && d.vendorName.toLowerCase().includes(q)) ||
      (d.savedBy && d.savedBy.toLowerCase().includes(q)) ||
      (d.label && d.label.toLowerCase().includes(q))
    );
  }

  return `
    <div class="space-y-6 animate-fadeIn">
      <!-- Page Title & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-xl font-bold text-[#0B2447]">TRSA Draft History</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
              ${allDrafts.length} Saved in LocalStorage
            </span>
          </div>
          <p class="text-xs text-[#5A7184] mt-0.5">Save checkpoints of your TRSA drafts and resume any previous version right where you left off.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.TRSA.setView('builder', store.builderStep)" class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#0B2447] transition-all">
            &larr; Return to Builder
          </button>
          <button onclick="window.TRSA.createProject()" class="btn-capiclean-accent font-semibold text-xs px-4 py-2 transition-all">
            + New TRSA Draft
          </button>
        </div>
      </div>

      <!-- Save Current Draft Checkpoint Card -->
      <div class="dropx-card p-5 bg-white border border-[#E0ECF6] space-y-3">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#0284C7]">Active Agreement Checkpoint</div>
            <div class="text-sm font-bold text-[#0F172A] mt-0.5">${escapeHtml(activeProj?.documentInfo?.title || 'Untitled TRSA')}</div>
            <div class="text-[11px] text-slate-500 font-mono">
              ${escapeHtml(activeProj?.documentInfo?.docNumber || '')} &bull; Step ${store.builderStep} of 6 &bull; ${store.calculateProgress(activeProj)}% Complete
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              id="draft-history-note"
              placeholder="Optional draft note (e.g., Pre-review fryer specs)..."
              class="corp-input sm:w-72"
            />
            <button onclick="window.TRSA.saveDraftWithNote('draft-history-note')" class="btn-capiclean-primary text-xs px-4 py-2.5 font-bold whitespace-nowrap flex items-center justify-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Save Current Draft
            </button>
          </div>
        </div>
      </div>

      <!-- Filter, Search & Export Toolbar -->
      <div class="dropx-card p-3.5 bg-white border border-[#E0ECF6] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.TRSA.setHistoryFilter('all')" class="px-3 py-1.5 rounded-xl font-bold transition-all ${store.historyFilter === 'all' ? 'bg-[#0B2447] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">
            All (${allDrafts.length})
          </button>
          <button onclick="window.TRSA.setHistoryFilter('manual')" class="px-3 py-1.5 rounded-xl font-bold transition-all ${store.historyFilter === 'manual' ? 'bg-[#0284C7] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">
            Manual Saves
          </button>
          <button onclick="window.TRSA.setHistoryFilter('auto')" class="px-3 py-1.5 rounded-xl font-bold transition-all ${store.historyFilter === 'auto' ? 'bg-[#D97706] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">
            Auto-Saves
          </button>
          <button onclick="window.TRSA.setHistoryFilter('current')" class="px-3 py-1.5 rounded-xl font-bold transition-all ${store.historyFilter === 'current' ? 'bg-[#059669] text-white' : 'text-[#5A7184] hover:bg-[#F0F9FF]'}">
            Active Project Only
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative flex-1 sm:w-64">
            <input
              type="text"
              id="draft-history-search"
              placeholder="Search title, doc #, note, plant..."
              value="${escapeHtml(store.historySearchQuery)}"
              oninput="window.TRSA.setHistorySearch(this.value)"
              class="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white rounded-xl focus:outline-none"
            />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <button onclick="window.TRSA.downloadDraftHistoryJSON()" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export JSON
          </button>

          ${allDrafts.length > 0 ? (
            store.confirmClearHistory ? `
              <div class="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
                <span class="text-[11px] font-bold text-rose-700">Clear all?</span>
                <button onclick="window.TRSA.confirmClearDraftHistory()" class="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700">Yes, Clear</button>
                <button onclick="window.TRSA.cancelClearDraftHistory()" class="px-2 py-0.5 rounded-lg bg-white text-slate-600 border border-slate-200 text-[11px] font-semibold">Cancel</button>
              </div>
            ` : `
              <button onclick="window.TRSA.requestClearDraftHistory()" class="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs">
                Clear History
              </button>
            `
          ) : ''}
        </div>
      </div>

      <!-- Saved Drafts List -->
      ${filtered.length === 0 ? `
        <div class="dropx-card p-12 bg-white border border-slate-200 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-sky-50 text-[#0284C7] border border-sky-200 flex items-center justify-center mx-auto">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
          </div>
          <div class="text-sm font-bold text-[#0F172A]">No saved TRSA drafts match this filter</div>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Use <strong>Save Current Draft</strong> above or click <strong>Save Draft</strong> while editing in the TRSA Builder. Your drafts are stored safely in browser LocalStorage so you can resume anytime.
          </p>
          <button onclick="window.TRSA.setView('builder', 1)" class="btn-capiclean-primary text-xs px-4 py-2 font-bold">
            Open Specification Builder
          </button>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${filtered.map(draft => {
            const isActiveProj = activeProj && draft.projectId === activeProj.id;
            return `
              <div class="dropx-card p-5 bg-white border ${isActiveProj ? 'border-sky-200' : 'border-slate-200'} flex flex-col justify-between gap-4">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          draft.isAutoSave
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-sky-50 text-[#0284C7] border border-sky-200'
                        }">
                          ${draft.isAutoSave ? 'Auto-Save' : 'Manual Checkpoint'}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Step ${draft.builderStep} of 6
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          draft.status === 'Published' ? 'badge-published' :
                          draft.status === 'Approved' ? 'badge-approved' :
                          draft.status === 'Under Review' ? 'badge-review' : 'badge-draft'
                        }">
                          ${escapeHtml(draft.status)}
                        </span>
                      </div>
                      <h3 class="text-sm font-bold text-[#0F172A] truncate" title="${escapeHtml(draft.title)}">${escapeHtml(draft.title)}</h3>
                      <div class="text-[11px] font-mono text-[#0369A1] mt-0.5 truncate">${escapeHtml(draft.docNumber || 'No. TRSA pending')}</div>
                    </div>

                    <div class="text-right flex-shrink-0">
                      <div class="text-[11px] font-bold text-slate-700">${escapeHtml(getDraftRelativeTime(draft.savedAt))}</div>
                      <div class="text-[10px] font-mono text-slate-400">${escapeHtml(formatDraftTimestamp(draft.savedAt))}</div>
                    </div>
                  </div>

                  <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2">
                    <div class="truncate">
                      <span class="text-[10px] font-bold uppercase text-slate-400 mr-1.5">Note:</span>
                      <span class="font-semibold text-slate-700">${escapeHtml(draft.label)}</span>
                    </div>
                    <span class="text-[10px] text-slate-500 flex-shrink-0">by <strong>${escapeHtml(draft.savedBy)}</strong></span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div class="truncate"><span class="text-slate-400">Plant:</span> <strong class="text-slate-800">${escapeHtml(draft.plantLocation || 'Semarang Plant')}</strong></div>
                    <div class="truncate"><span class="text-slate-400">Vendor:</span> <strong class="text-slate-800">${escapeHtml(draft.vendorName || 'OEM Standard')}</strong></div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between text-[10px] mb-1">
                      <span class="text-slate-500 font-semibold">Agreement Completeness</span>
                      <span class="font-bold text-[#0284C7]">${draft.progress}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] rounded-full" style="width: ${draft.progress}%"></div>
                    </div>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <button onclick="window.TRSA.resumeDraft('${escapeHtml(draft.id)}')" class="btn-capiclean-primary text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Resume Draft
                    </button>
                    <button onclick="window.TRSA.resumeDraftAsCopy('${escapeHtml(draft.id)}')" class="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold transition-all" title="Open this draft as a separate new TRSA project">
                      Open as Copy
                    </button>
                    <button onclick="window.TRSA.previewDraft('${escapeHtml(draft.id)}')" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all">
                      A4 View
                    </button>
                  </div>
                  <button onclick="window.TRSA.deleteDraft('${escapeHtml(draft.id)}')" class="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold transition-all" title="Delete saved draft">
                    Delete
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// 4c. IFM TRSA Compliance Matrix, Deep Audit & Per-User Matrix Settings (Admin)
function renderComplianceMatrixView(proj) {
  ensureProjectMatrixDefaults(proj);
  const audit = auditProjectMatrixCompliance(proj);
  const activeCode = audit.plantCode;
  const activeOrigin = audit.vendorOrigin;
  const profile = PLANT_MATRIX_PROFILES[activeCode] || PLANT_MATRIX_PROFILES['1403'];
  const contactsResolved = resolveContactsForPlant(activeCode);

  const userIsAdmin = store.isAdmin();
  const currentUser = store.getCurrentUser();
  const activeUserSetting = store.getCurrentUserMatrixSetting();
  const allSettings = store.getAllUserMatrixSettings();
  const totalClauses = getAllMatrixClauseIds().length;
  const customizedCount = store.teamMembers.filter(m => {
    const k = getUserSettingKey(m);
    return isUserSettingCustomized(allSettings[k], m);
  }).length;

  const activeSubTab = store.matrixSubTab || 'matrix';
  const scopeFilter = store.matrixClauseScopeFilter || 'all';
  const visibleMatrixRows = scopeFilter === 'assigned'
    ? TRSA_COMPLIANCE_MATRIX.filter(row => isClauseAssignedToUser(activeUserSetting, row.id))
    : TRSA_COMPLIANCE_MATRIX;

  const searchLower = String(store.userMatrixSearch || '').trim().toLowerCase();
  const filteredMembers = store.teamMembers.filter(m =>
    !searchLower ||
    m.name.toLowerCase().includes(searchLower) ||
    m.role.toLowerCase().includes(searchLower) ||
    m.dept.toLowerCase().includes(searchLower) ||
    m.email.toLowerCase().includes(searchLower)
  );

  const selectedKey = allSettings[store.selectedMatrixUserKey]
    ? store.selectedMatrixUserKey
    : getUserSettingKey(store.teamMembers[0]);
  const selectedMember = store.teamMembers.find(m => getUserSettingKey(m) === selectedKey) || store.teamMembers[0];
  const selectedSetting = allSettings[getUserSettingKey(selectedMember)] || getUserMatrixSetting(selectedMember, store.teamMembers);

  const plantOptions = [
    { code: '1402', label: '1402 - Cikokol Plant', value: 'Cikokol Plant' },
    { code: '1403', label: '1403 - Semarang Plant', value: 'Semarang Plant' },
    { code: '1405', label: '1405 - Cikupa Plant', value: 'Cikupa Plant' },
    { code: '1411', label: '1411 - Agro Plant', value: 'Agro Plant' }
  ];

  return `
    <div class="space-y-6 animate-fadeIn">
      <!-- Top Header & Sub-Tab Switcher -->
      <div class="dropx-card p-6 bg-white border border-slate-200 space-y-4">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>IFM Standard &middot; Clauses I–XIX</span>
              <span aria-hidden="true">&middot;</span>
              <span class="font-mono tabular-nums font-semibold ${audit.complianceScore === 100 ? 'text-emerald-700' : 'text-amber-700'}">
                Matrix Score: ${audit.complianceScore}% (${audit.passedCount}/${audit.totalChecks} checks)
              </span>
              <span aria-hidden="true">&middot;</span>
              <span class="font-mono tabular-nums text-[#0369A1]">${escapeHtml(proj.documentInfo?.docNumber || '')}</span>
            </div>
            <h1 class="text-xl font-bold text-[#0F172A]"><span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span> &mdash; TRSA Compliance Matrix</h1>
            <p class="text-xs text-slate-600">
              Authoritative 19-clause mapping for <strong class="text-slate-800">${activeCode} (${escapeHtml(profile.plantName)})</strong> &times; <strong class="text-[#0284C7]">${activeOrigin} Vendor</strong> (${audit.applicableMatrixRows}/${audit.totalMatrixRows} rules active).
            </p>
          </div>

          <!-- Segmented Sub-Tab Controls -->
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <div class="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200" role="tablist" aria-label="Compliance Matrix Tabs">
              <button
                type="button"
                role="tab"
                aria-selected="${activeSubTab === 'matrix'}"
                onclick="window.TRSA.setMatrixSubTab('matrix')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeSubTab === 'matrix' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                }"
              >
                Matrix &amp; Deep Audit
              </button>
              <button
                type="button"
                role="tab"
                aria-selected="${activeSubTab === 'users'}"
                onclick="window.TRSA.setMatrixSubTab('users')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeSubTab === 'users' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600 hover:text-[#0F172A]'
                }"
              >
                <span>${userIsAdmin ? 'User Matrix Settings (Admin)' : 'My Matrix Permissions'}</span>
                <span class="font-mono tabular-nums text-[11px] ${customizedCount > 0 ? 'text-[#0284C7]' : 'text-slate-500'}">(${store.teamMembers.length}${customizedCount > 0 ? ` · ${customizedCount} custom` : ''})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Active User Assigned Compliance Scope Strip -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex flex-wrap items-center gap-2 text-slate-600">
            <span class="font-semibold text-[#0F172A]">Active User Scope (${escapeHtml(currentUser.name)}):</span>
            <span class="font-mono tabular-nums">Plants: <strong>${activeUserSetting.allowedPlants.join(', ')}</strong></span>
            <span aria-hidden="true">&middot;</span>
            <span>Origins: <strong>${activeUserSetting.allowedOrigins.join(', ')}</strong></span>
            <span aria-hidden="true">&middot;</span>
            <span class="font-mono tabular-nums">Clauses: <strong>${activeUserSetting.assignedClauses.length}/${totalClauses}</strong></span>
            <span aria-hidden="true">&middot;</span>
            <span class="font-semibold ${
              !activeUserSetting.canViewMatrix ? 'text-red-700' :
              activeUserSetting.canEditMatrix ? 'text-emerald-700' : 'text-amber-700'
            }">
              ${!activeUserSetting.canViewMatrix ? 'Access Restricted' : activeUserSetting.canEditMatrix ? 'Edit & Re-Align Enabled' : 'Read-Only Access'}
            </span>
          </div>
          ${activeUserSetting.customNotes ? `
            <div class="text-[11px] text-[#0369A1] font-medium">
              Admin Directive: ${escapeHtml(activeUserSetting.customNotes)}
            </div>
          ` : ''}
        </div>
      </div>

      ${activeSubTab === 'users' ? (
        userIsAdmin ? `
          <!-- ADMIN PER-USER COMPLIANCE MATRIX SETTINGS WORKSPACE -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start" data-section="admin-user-matrix-settings">
            <!-- Left Panel: Team Directory (5 cols) -->
            <div class="lg:col-span-5 dropx-card overflow-hidden bg-white border border-slate-200">
              <div class="p-4 border-b border-slate-200 space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <h2 class="text-sm font-bold text-[#0F172A]">Select User (${store.teamMembers.length} Users)</h2>
                    <p class="text-[11px] text-slate-500">Configure Compliance Matrix permissions per user.</p>
                  </div>
                  <button
                    type="button"
                    onclick="window.TRSA.resetAllUsersMatrix()"
                    class="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
                  >
                    Reset All
                  </button>
                </div>

                <div class="relative">
                  <input
                    type="text"
                    id="user-matrix-search"
                    value="${escapeHtml(store.userMatrixSearch || '')}"
                    placeholder="Search user name, role, or dept..."
                    aria-label="Search team users for matrix configuration"
                    class="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white rounded-lg focus:outline-none"
                  />
                  <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
              </div>

              <div class="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
                ${filteredMembers.length === 0 ? `
                  <div class="p-6 text-center text-xs text-slate-500">No users match "${escapeHtml(store.userMatrixSearch)}".</div>
                ` : filteredMembers.map(member => {
                  const key = getUserSettingKey(member);
                  const setting = allSettings[key] || getUserMatrixSetting(member, store.teamMembers);
                  const isSelected = key === getUserSettingKey(selectedMember);
                  const isCustom = isUserSettingCustomized(setting, member);
                  const isSelf = getUserSettingKey(currentUser) === key;

                  return `
                    <button
                      type="button"
                      onclick="window.TRSA.selectMatrixUser('${escapeHtml(key)}')"
                      data-matrix-user-row="${escapeHtml(key)}"
                      class="w-full p-3.5 text-left transition-colors hover:bg-slate-50 flex items-start justify-between gap-3 ${
                        isSelected ? 'bg-sky-50/70' : ''
                      }"
                    >
                      <div class="flex items-start gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isSelected ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-slate-700'
                        }">
                          ${escapeHtml(member.initials)}
                        </div>
                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5">
                            <span class="text-xs font-bold text-[#0F172A] truncate">${escapeHtml(member.name)}</span>
                            ${isSelf ? '<span class="text-[10px] font-semibold text-[#0284C7]">(You)</span>' : ''}
                          </div>
                          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(member.role)} &middot; ${escapeHtml(member.dept)}</div>
                          <div class="text-[11px] font-mono tabular-nums text-slate-600 mt-1">
                            ${!setting.canViewMatrix
                              ? '<span class="text-red-600 font-semibold">Matrix Locked</span>'
                              : `${setting.allowedPlants.length}/4 Plants &middot; ${setting.allowedOrigins.length}/3 Origins &middot; ${setting.assignedClauses.length}/${totalClauses} Clauses`
                            }
                          </div>
                        </div>
                      </div>
                      <div class="text-right shrink-0 space-y-1">
                        <div class="text-[10px] font-semibold ${
                          !setting.canViewMatrix ? 'text-red-600' :
                          setting.canEditMatrix ? 'text-emerald-700' : 'text-amber-700'
                        }">
                          ${!setting.canViewMatrix ? 'Restricted' : setting.canEditMatrix ? 'Can Edit' : 'Read-Only'}
                        </div>
                        ${isCustom ? '<div class="text-[10px] font-semibold text-[#0284C7]">Customized</div>' : '<div class="text-[10px] text-slate-400">Default</div>'}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Right Panel: Selected User Compliance Matrix Configurator (7 cols) -->
            <div class="lg:col-span-7 dropx-card p-6 bg-white border border-slate-200 space-y-6" data-matrix-user-editor="${escapeHtml(selectedSetting.userKey)}">
              <div class="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div class="text-xs text-slate-500 font-medium">${escapeHtml(selectedMember.role)} &middot; ${escapeHtml(selectedMember.dept)} &middot; <span class="font-mono">${escapeHtml(selectedMember.email)}</span></div>
                  <h2 class="text-base font-bold text-[#0F172A] mt-0.5">Compliance Matrix Settings: ${escapeHtml(selectedMember.name)}</h2>
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick="window.TRSA.switchUser('${escapeHtml(selectedMember.name)}'); window.TRSA.setMatrixSubTab('matrix');"
                    class="px-3 py-1.5 text-xs font-semibold text-[#0284C7] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap"
                    title="Switch active session to inspect Compliance Matrix as this user"
                  >
                    Preview as User
                  </button>
                  <button
                    type="button"
                    onclick="window.TRSA.resetMatrixForUser('${escapeHtml(selectedSetting.userKey)}')"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              <!-- Quick Role Presets -->
              <div class="space-y-2">
                <div class="text-xs font-semibold text-[#0F172A]">Quick Compliance Presets</div>
                <div class="flex flex-wrap gap-2">
                  ${Object.values(MATRIX_USER_PRESETS).map(preset => `
                    <button
                      type="button"
                      onclick="window.TRSA.applyMatrixPresetForUser('${escapeHtml(selectedSetting.userKey)}', '${escapeHtml(preset.key)}')"
                      title="${escapeHtml(preset.description)}"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-[#0284C7] text-slate-700 transition-colors whitespace-nowrap"
                    >
                      ${escapeHtml(preset.label)}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 1. Matrix Access & Editing Permissions -->
              <div class="pt-4 border-t border-slate-100 space-y-3">
                <div class="text-xs font-semibold text-[#0F172A]">1. Access &amp; Alignment Permissions</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label class="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 cursor-pointer hover:border-[#0284C7] transition-colors">
                    <input
                      type="checkbox"
                      ${selectedSetting.canViewMatrix ? 'checked' : ''}
                      onchange="window.TRSA.updateUserMatrixField('${escapeHtml(selectedSetting.userKey)}', 'canViewMatrix', this.checked)"
                      class="mt-0.5 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <div>
                      <div class="text-xs font-bold text-[#0F172A]">Allow Compliance Matrix Access</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">User can view the 19-clause matrix, PIC routing, and Deep Audit checks.</div>
                    </div>
                  </label>

                  <label class="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 cursor-pointer hover:border-[#0284C7] transition-colors ${!selectedSetting.canViewMatrix ? 'opacity-50' : ''}">
                    <input
                      type="checkbox"
                      ${selectedSetting.canEditMatrix ? 'checked' : ''}
                      ${!selectedSetting.canViewMatrix ? 'disabled' : ''}
                      onchange="window.TRSA.updateUserMatrixField('${escapeHtml(selectedSetting.userKey)}', 'canEditMatrix', this.checked)"
                      class="mt-0.5 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <div>
                      <div class="text-xs font-bold text-[#0F172A]">Allow Re-Align &amp; Matrix Changes</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">User can run "Re-Align Active TRSA to Matrix" and apply plant/origin rules.</div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- 2. Allowed Plants & Default Plant -->
              <div class="pt-4 border-t border-slate-100 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-semibold text-[#0F172A]">2. Authorized Plant Sites (${selectedSetting.allowedPlants.length}/4)</div>
                    <div class="text-[11px] text-slate-500">Toggle which IFM plants this user can configure in the Compliance Matrix.</div>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <label for="user-default-plant" class="text-slate-500 font-medium whitespace-nowrap">Default Plant:</label>
                    <select
                      id="user-default-plant"
                      onchange="window.TRSA.updateUserMatrixField('${escapeHtml(selectedSetting.userKey)}', 'defaultPlantCode', this.value)"
                      class="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer"
                    >
                      ${selectedSetting.allowedPlants.map(code => {
                        const p = PLANT_MATRIX_PROFILES[code];
                        return `<option value="${code}" ${selectedSetting.defaultPlantCode === code ? 'selected' : ''}>${code} &middot; ${escapeHtml(p?.plantName || code)}</option>`;
                      }).join('')}
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  ${plantOptions.map(po => {
                    const active = selectedSetting.allowedPlants.includes(po.code);
                    return `
                      <button
                        type="button"
                        onclick="window.TRSA.toggleMatrixPlantForUser('${escapeHtml(selectedSetting.userKey)}', '${po.code}')"
                        class="px-3 py-2 rounded-xl border text-left transition-colors ${
                          active
                            ? 'bg-sky-50 border-[#0284C7] text-[#0369A1]'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }"
                      >
                        <div class="flex items-center justify-between text-xs font-bold font-mono tabular-nums">
                          <span>${po.code}</span>
                          <span>${active ? '✓' : '—'}</span>
                        </div>
                        <div class="text-[11px] truncate mt-0.5">${escapeHtml(po.value.replace(' Plant', ''))}</div>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 3. Allowed Vendor Origins & Default Origin -->
              <div class="pt-4 border-t border-slate-100 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-semibold text-[#0F172A]">3. Authorized Vendor Origins (${selectedSetting.allowedOrigins.length}/3)</div>
                    <div class="text-[11px] text-slate-500">Restrict or permit Foreign, Local, and Mixed vendor sourcing compliance rules.</div>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <label for="user-default-origin" class="text-slate-500 font-medium whitespace-nowrap">Default Origin:</label>
                    <select
                      id="user-default-origin"
                      onchange="window.TRSA.updateUserMatrixField('${escapeHtml(selectedSetting.userKey)}', 'defaultOrigin', this.value)"
                      class="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer"
                    >
                      ${selectedSetting.allowedOrigins.map(orig => `
                        <option value="${orig}" ${selectedSetting.defaultOrigin === orig ? 'selected' : ''}>${orig}</option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  ${MATRIX_ORIGIN_MODES.map(orig => {
                    const active = selectedSetting.allowedOrigins.includes(orig);
                    return `
                      <button
                        type="button"
                        onclick="window.TRSA.toggleMatrixOriginForUser('${escapeHtml(selectedSetting.userKey)}', '${orig}')"
                        class="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                          active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }"
                      >
                        <span>${orig}</span>
                        <span class="font-mono">${active ? '✓' : '—'}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 4. Assigned Compliance Matrix Clauses (I–XIX) -->
              <div class="pt-4 border-t border-slate-100 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-semibold text-[#0F172A]">4. Assigned Matrix Clauses Scope (<span class="font-mono tabular-nums">${selectedSetting.assignedClauses.length}/${totalClauses}</span>)</div>
                    <div class="text-[11px] text-slate-500">Select which IFM clauses this user is responsible for reviewing/enforcing.</div>
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button type="button" onclick="window.TRSA.setUserClausesPreset('${escapeHtml(selectedSetting.userKey)}', 'all')" class="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md">All</button>
                    <button type="button" onclick="window.TRSA.setUserClausesPreset('${escapeHtml(selectedSetting.userKey)}', 'tech')" class="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md">Tech (I–XII)</button>
                    <button type="button" onclick="window.TRSA.setUserClausesPreset('${escapeHtml(selectedSetting.userKey)}', 'comm')" class="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md">Comm (XIII–XIX)</button>
                    <button type="button" onclick="window.TRSA.setUserClausesPreset('${escapeHtml(selectedSetting.userKey)}', 'none')" class="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-md">Clear</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  ${TRSA_COMPLIANCE_MATRIX.map(row => {
                    const checked = selectedSetting.assignedClauses.includes(row.id);
                    return `
                      <label class="p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                        checked ? 'bg-sky-50/50 border-sky-200' : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                      }">
                        <input
                          type="checkbox"
                          ${checked ? 'checked' : ''}
                          onchange="window.TRSA.toggleMatrixClauseForUser('${escapeHtml(selectedSetting.userKey)}', '${escapeHtml(row.id)}')"
                          class="mt-0.5 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                        />
                        <div class="min-w-0">
                          <div class="font-semibold text-[#0F172A] truncate">
                            <span class="font-mono text-[#0369A1]">${escapeHtml(row.itemNo)}</span> &middot; ${escapeHtml(row.clauseTitle)}
                          </div>
                          <div class="text-[10px] text-slate-500 truncate">${escapeHtml(row.category)}</div>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 5. Admin Compliance Directive Note -->
              <div class="pt-4 border-t border-slate-100 space-y-2">
                <label for="user-matrix-notes" class="block text-xs font-semibold text-[#0F172A]">5. Admin Compliance Directive / Notes for ${escapeHtml(selectedMember.name)}</label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    id="user-matrix-notes"
                    value="${escapeHtml(selectedSetting.customNotes || '')}"
                    placeholder="e.g., Focus on Plant 1403 thermal/hygiene clauses and local tax verification"
                    class="corp-input flex-1"
                  />
                  <button
                    type="button"
                    onclick="window.TRSA.saveUserMatrixNote('${escapeHtml(selectedSetting.userKey)}')"
                    class="btn-capiclean-primary text-xs px-4 py-2 whitespace-nowrap shrink-0"
                  >
                    Save Directive
                  </button>
                </div>
                <div class="text-[11px] text-slate-500 font-mono tabular-nums">
                  ${selectedSetting.updatedAt
                    ? `Last configured by ${escapeHtml(selectedSetting.updatedBy)} on ${escapeHtml(formatAgreementDate(selectedSetting.updatedAt))}`
                    : 'Using default IFM Compliance Matrix policy'}
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- NON-ADMIN READ-ONLY MATRIX PERMISSIONS SUMMARY -->
          <div class="dropx-card p-6 bg-white border border-slate-200 space-y-5">
            <div class="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 class="text-base font-bold text-[#0F172A]">Your Assigned Compliance Matrix Profile</h2>
                <p class="text-xs text-slate-500 mt-0.5">Configured by Admin (Project &amp; Engineering Manager) for ${escapeHtml(currentUser.name)}.</p>
              </div>
              <span class="text-xs font-semibold text-amber-700">Admin-Managed Policy</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div class="text-slate-500 font-medium">Authorized Plants</div>
                <div class="font-mono tabular-nums font-bold text-[#0F172A] mt-1">${activeUserSetting.allowedPlants.join(', ')}</div>
                <div class="text-[11px] text-slate-500 mt-1">Default: ${activeUserSetting.defaultPlantCode}</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div class="text-slate-500 font-medium">Authorized Origins</div>
                <div class="font-bold text-[#0F172A] mt-1">${activeUserSetting.allowedOrigins.join(', ')}</div>
                <div class="text-[11px] text-slate-500 mt-1">Default: ${activeUserSetting.defaultOrigin}</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div class="text-slate-500 font-medium">Matrix Access &amp; Clauses</div>
                <div class="font-mono tabular-nums font-bold text-[#0F172A] mt-1">${activeUserSetting.assignedClauses.length} / ${totalClauses} Clauses</div>
                <div class="text-[11px] font-semibold mt-1 ${activeUserSetting.canEditMatrix ? 'text-emerald-700' : 'text-amber-700'}">
                  ${!activeUserSetting.canViewMatrix ? 'Access Restricted' : activeUserSetting.canEditMatrix ? 'Edit & Re-Align Permitted' : 'Read-Only Inspection'}
                </div>
              </div>
            </div>

            <div class="text-xs text-slate-600 bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              To modify Compliance Matrix permissions per user, switch to an Admin / Project &amp; Engineering Manager account (e.g., <strong>Moh Yusuf Alfian</strong>).
            </div>
          </div>
        `
      ) : !activeUserSetting.canViewMatrix ? `
        <!-- RESTRICTED COMPLIANCE MATRIX NOTICE -->
        <div class="dropx-card p-10 bg-white border border-slate-200 text-center space-y-4">
          <div class="text-base font-bold text-[#0F172A]">Compliance Matrix Access Restricted</div>
          <p class="text-xs text-slate-600 max-w-md mx-auto">
            Admin has restricted Compliance Matrix access for <strong>${escapeHtml(currentUser.name)}</strong> (${escapeHtml(currentUser.role)}). Contact your Project &amp; Engineering Manager to adjust your user matrix settings.
          </p>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button type="button" onclick="window.TRSA.setMatrixSubTab('users')" class="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
              View My Matrix Permissions
            </button>
            <button type="button" onclick="window.TRSA.setView('dashboard')" class="btn-capiclean-primary text-xs px-4 py-2">
              Return to Dashboard
            </button>
          </div>
        </div>
      ` : `
      <!-- Plant x Origin Controls & Action Bar -->
      <div class="dropx-card p-4 bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <select
            aria-label="Matrix Plant Location"
            onchange="window.TRSA.onPlantLocationChanged(this.value)"
            ${!activeUserSetting.canEditMatrix ? 'disabled' : ''}
            class="corp-select text-xs font-bold bg-slate-50 border-slate-200 ${!activeUserSetting.canEditMatrix ? 'opacity-60 cursor-not-allowed' : ''}"
          >
            ${plantOptions.map(po => {
              const allowed = activeUserSetting.allowedPlants.includes(po.code);
              return `<option value="${po.value}" ${activeCode === po.code ? 'selected' : ''} ${!allowed ? 'disabled' : ''}>${po.label}${!allowed ? ' (Restricted)' : ''}</option>`;
            }).join('')}
          </select>

          <div class="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            ${['Foreign', 'Local', 'Mixed'].map(orig => {
              const allowed = activeUserSetting.allowedOrigins.includes(orig);
              const disabled = !activeUserSetting.canEditMatrix || !allowed;
              return `
                <button
                  type="button"
                  ${disabled ? 'disabled' : ''}
                  onclick="window.TRSA.setVendorOrigin('${orig}')"
                  title="${!allowed ? 'Origin restricted by Admin for this user' : `Switch origin to ${orig}`}"
                  class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeOrigin === orig ? 'bg-[#0284C7] text-white shadow-xs' :
                    disabled ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-600 hover:text-slate-900'
                  }"
                >
                  ${orig}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="window.TRSA.openPdfModal()" class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700">
            Preview Reference PDF
          </button>

          <a href="${TRSA_MATRIX_PDF_PATH}" download="TRSA_Matrix_PT_Indofood_Fortuna_Makmur.pdf" class="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#0284C7]">
            Download PDF
          </a>

          <button
            type="button"
            ${!activeUserSetting.canEditMatrix ? 'disabled' : ''}
            onclick="window.TRSA.alignProjectWithMatrix()"
            class="btn-capiclean-accent text-xs px-4 py-2 font-bold ${!activeUserSetting.canEditMatrix ? 'opacity-50 cursor-not-allowed' : ''}"
            title="${!activeUserSetting.canEditMatrix ? 'Read-Only user permission: Admin disabled Re-Align' : 'Align active TRSA draft with IFM Matrix'}"
          >
            Re-Align Active TRSA to Matrix
          </button>
        </div>
      </div>

      <!-- Site Routing & Deep Audit Split -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Site & PIC Routing Card (5 cols) -->
        <div class="lg:col-span-5 dropx-card p-5 bg-white border border-slate-200 space-y-4">
          <div class="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-[#0F172A]">Authorized Site & PIC Routing (${activeCode})</h2>
              <p class="text-[11px] text-slate-500">${escapeHtml(profile.siteTitle)}</p>
            </div>
            <span class="px-2 py-0.5 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-200 font-mono text-[10px] font-bold">Plant ${activeCode}</span>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div class="font-bold text-[#0F172A]">Delivery Address (Clause V):</div>
            <div class="text-slate-700">${escapeHtml(profile.address)}</div>
            <div class="pt-1 text-[11px] text-[#0369A1] font-semibold">Port: ${escapeHtml(profile.deliveryPort)}</div>
            <div class="text-[11px] text-slate-600">Invoice To: <strong>${escapeHtml(profile.invoiceRecipient)}</strong></div>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">User / Engineering PICs (${USER_ENGINEERING_PICS.length})</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                ${USER_ENGINEERING_PICS.map(u => `
                  <div class="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div class="font-bold text-slate-800 truncate">${escapeHtml(u.name)}</div>
                    <div class="text-[10px] font-mono text-[#0284C7] truncate">${escapeHtml(u.email)}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Project Team PICs</div>
                <div class="space-y-1">
                  ${contactsResolved.projectTeamPics.map(u => `
                    <div class="p-2 rounded-lg bg-sky-50/50 border border-sky-200/70">
                      <div class="font-bold text-slate-800 truncate">${escapeHtml(u.name)}</div>
                      <div class="text-[10px] font-mono text-[#0369A1] truncate">${escapeHtml(u.email)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Purchasing Team PICs</div>
                <div class="space-y-1">
                  ${contactsResolved.purchasingTeamPics.map(u => `
                    <div class="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200/70">
                      <div class="font-bold text-slate-800 truncate">${escapeHtml(u.name)}</div>
                      <div class="text-[10px] font-mono text-emerald-700 truncate">${escapeHtml(u.email)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Deep Compliance Audit Verification (7 cols) -->
        <div class="lg:col-span-7 dropx-card p-5 bg-white border border-slate-200 space-y-4">
          <div class="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-[#0F172A]">Deep Specification & Clause Audit (${audit.passedCount}/${audit.totalChecks} Passed)</h2>
              <p class="text-[11px] text-slate-500">Automated verification of active TRSA draft against all 19 Clauses of IFM Compliance Matrix PDF.</p>
            </div>
            <span class="px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
              audit.discrepancies.length === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }">
              ${audit.discrepancies.length === 0 ? '100% Compliant' : `${audit.discrepancies.length} Discrepancy`}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-2">
            ${audit.checks.map(chk => `
              <div class="p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                chk.passed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/70 border-amber-300'
              }">
                <div class="flex items-start gap-2.5">
                  <span class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                    chk.passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }">
                    ${chk.passed ? '✓' : '!'}
                  </span>
                  <div>
                    <div class="font-bold text-[#0F172A]">
                      <span class="font-mono text-[#0284C7] mr-1">${escapeHtml(chk.id)}</span>
                      ${escapeHtml(chk.title)}
                    </div>
                    <div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(chk.detail)}</div>
                  </div>
                </div>
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  chk.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }">
                  ${chk.passed ? 'Pass' : 'Action Needed'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Full 19-Clause Plant x Origin Applicability Matrix Table -->
      <div class="dropx-card overflow-hidden bg-white border border-slate-200">
        <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-[#0F172A]">Complete 19-Clause Matrix (Clauses I–XIX &bull; Plants 1402 / 1403 / 1405 / 1411 &times; Local / Foreign)</h2>
            <p class="text-[11px] text-slate-500">Highlighted rows apply to the active configuration (<strong>Plant ${activeCode} &times; ${activeOrigin}</strong>) and your assigned user scope (${activeUserSetting.assignedClauses.length}/${totalClauses} clauses).</p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <div class="inline-flex p-1 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onclick="window.TRSA.setMatrixClauseScopeFilter('all')"
                class="px-2.5 py-1 rounded-md font-semibold ${scopeFilter === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600'}"
              >
                All (${totalClauses})
              </button>
              <button
                type="button"
                onclick="window.TRSA.setMatrixClauseScopeFilter('assigned')"
                class="px-2.5 py-1 rounded-md font-semibold ${scopeFilter === 'assigned' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600'}"
              >
                My Scope (${activeUserSetting.assignedClauses.length})
              </button>
            </div>
            <button type="button" onclick="window.TRSA.setView('studio')" class="px-3.5 py-2 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200 text-xs font-bold hover:bg-sky-100 shrink-0">
              Open Official A4 Preview &rarr;
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#0F2942] text-white text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th class="py-3 px-4 w-20">Clause</th>
                <th class="py-3 px-4 w-56">Section / Provision</th>
                <th class="py-3 px-4">Standard Summary</th>
                <th class="py-3 px-2.5 text-center w-14 ${activeCode === '1402' ? 'bg-[#0284C7]' : ''}">1402</th>
                <th class="py-3 px-2.5 text-center w-14 ${activeCode === '1403' ? 'bg-[#0284C7]' : ''}">1403</th>
                <th class="py-3 px-2.5 text-center w-14 ${activeCode === '1405' ? 'bg-[#0284C7]' : ''}">1405</th>
                <th class="py-3 px-2.5 text-center w-14 ${activeCode === '1411' ? 'bg-[#0284C7]' : ''}">1411</th>
                <th class="py-3 px-2.5 text-center w-16 ${activeOrigin === 'Local' ? 'bg-emerald-700' : ''}">Local</th>
                <th class="py-3 px-2.5 text-center w-16 ${activeOrigin === 'Foreign' ? 'bg-sky-700' : ''}">Foreign</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${visibleMatrixRows.length === 0 ? `
                <tr>
                  <td colspan="9" class="py-8 text-center text-xs text-slate-500">
                    No clauses assigned to ${escapeHtml(currentUser.name)} yet. Contact Admin to assign Compliance Matrix clauses.
                  </td>
                </tr>
              ` : visibleMatrixRows.map(row => {
                const isActive = isClauseApplicable(row, activeCode, activeOrigin);
                const inUserScope = isClauseAssignedToUser(activeUserSetting, row.id);
                return `
                  <tr class="${isActive && inUserScope ? 'bg-sky-50/40' : 'bg-slate-50/60 opacity-60'}">
                    <td class="py-2.5 px-4 font-mono font-bold text-[#0369A1] align-top">${escapeHtml(row.itemNo)}</td>
                    <td class="py-2.5 px-4 align-top">
                      <div class="font-bold text-[#0F172A]">${escapeHtml(row.clauseTitle)}</div>
                      <div class="text-[10px] text-slate-500">
                        ${escapeHtml(row.category)}${!inUserScope ? ' &middot; <span class="text-amber-700 font-semibold">Outside User Scope</span>' : ''}
                      </div>
                    </td>
                    <td class="py-2.5 px-4 text-[11px] text-slate-700 leading-relaxed align-top">${escapeHtml(row.summary)}</td>
                    ${['1402', '1403', '1405', '1411'].map(code => {
                      const yes = row.plants.includes(code);
                      return `<td class="py-2.5 px-2.5 text-center font-bold align-top ${yes ? 'text-emerald-600' : 'text-slate-400'}">${yes ? '✓' : '—'}</td>`;
                    }).join('')}
                    ${['Local', 'Foreign'].map(org => {
                      const yes = row.origins.includes(org);
                      return `<td class="py-2.5 px-2.5 text-center font-bold align-top ${yes ? 'text-emerald-600' : 'text-slate-400'}">${yes ? '✓' : '—'}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      `}
    </div>
  `;
}

// 5. TRSA Builder View (Multi-Step Guided Form)
function renderBuilder(proj) {
  const step = store.builderStep;
  const draftCount = getDraftHistory().length;
  const validation = validateProject(proj);
  const autoSaveLabel = !store.autoSaveEnabled
    ? 'Auto-save paused'
    : store.lastAutoSavedAt
      ? `Auto-saved every 30s • ${new Date(store.lastAutoSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : 'Auto-save every 30s active';

  return `
    <div class="space-y-6 animate-fadeIn pb-24">
      <!-- Top Title & Navigation -->
      <div class="dropx-card p-5 bg-white border border-[#E0ECF6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-mono px-2.5 py-0.5 bg-[#E0F2FE] text-[#0284C7] rounded-full font-bold uppercase">
              Step ${step} of 6
            </span>
            <span class="text-xs text-[#5A7184] font-medium">Document Form Editor</span>
            <button
              type="button"
              id="autosave-status-badge"
              onclick="window.TRSA.toggleAutoSave()"
              title="Automatically saves form progress to LocalStorage every 30 seconds (Click to pause/resume)"
              class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                store.autoSaveEnabled
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                  : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full ${store.autoSaveEnabled ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
              <span>${autoSaveLabel}</span>
            </button>
            <button
              type="button"
              id="builder-validation-pill"
              onclick="window.TRSA.toggleValidationSummary()"
              title="View corporate specification validation status"
              class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                validation.valid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full ${validation.valid ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}"></span>
              <span>${validation.valid ? 'All required fields valid' : `${validation.totalErrors} required field${validation.totalErrors > 1 ? 's' : ''} invalid`}</span>
            </button>
          </div>
          <h1 class="text-lg font-bold text-[#0B2447] mt-1">${proj.documentInfo.title}</h1>
          <p class="text-xs text-[#0369A1] font-mono">${proj.documentInfo.docNumber}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.TRSA.setView('history')" class="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5">
            <svg class="w-4 h-4 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
            Draft History (${draftCount})
          </button>
          <button onclick="window.TRSA.setView('studio')" class="bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            Live A4 Preview
          </button>
          <button onclick="window.TRSA.saveCurrentForm()" class="btn-capiclean-primary font-bold text-xs px-4 py-2 transition-all">
            Save Changes
          </button>
        </div>
      </div>

      ${!validation.valid && store.showValidationSummary ? `
        <div id="builder-validation-banner" class="dropx-card p-4 bg-red-50/90 border border-red-200 space-y-2.5 no-print">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2 text-red-800">
              <svg class="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <div>
                <div data-validation-banner-count class="text-xs font-bold">Incomplete Corporate Specifications (${validation.totalErrors} Required Field${validation.totalErrors > 1 ? 's' : ''})</div>
                <div class="text-[11px] text-red-700">Complete highlighted mandatory fields before publishing or generating the official A4 document.</div>
              </div>
            </div>
            <button type="button" onclick="window.TRSA.toggleValidationSummary(false)" class="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-red-100">&times;</button>
          </div>
          <div data-validation-banner-chips class="flex flex-wrap gap-1.5">
            ${validation.errors.slice(0, 12).map(err => `
              <button
                type="button"
                onclick="window.TRSA.focusValidationIssue(${err.step}, '${escapeHtml(err.fieldKey)}')"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                title="${escapeHtml(err.message)}"
              >
                <span class="font-mono text-[10px] font-bold text-red-500">S${err.step}</span>
                <span>${escapeHtml(err.label)}</span>
              </button>
            `).join('')}
            ${validation.errors.length > 12 ? `<span class="text-[11px] font-semibold text-red-700 px-2 py-1">+${validation.errors.length - 12} more</span>` : ''}
          </div>
        </div>
      ` : '<div id="builder-validation-banner" class="hidden"></div>'}

      <!-- Modern Capiclean Stepper Navigation Tabs -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
        ${[
          { s: 1, title: '1. Document & Dates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { s: 2, title: '2. Contacts & Site', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { s: 3, title: '3. Product Specs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
          { s: 4, title: '4. Project Scope', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          { s: 5, title: '5. Tests & Hygiene', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { s: 6, title: '6. Terms, Tax & Docs', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map(item => {
          const stepErrCount = validation.byStep[item.s]?.length || 0;
          return `
          <button 
            onclick="window.TRSA.setStep(${item.s})" 
            class="p-3 rounded-2xl border text-left transition-all relative ${
              step === item.s 
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-md shadow-sky-500/20' 
                : stepErrCount > 0
                  ? 'bg-red-50/40 hover:bg-red-50 text-[#0B2447] border-red-200'
                  : 'bg-white hover:bg-[#F0F9FF] text-[#0B2447] border-[#E0ECF6]'
            }"
          >
            <div class="flex items-center justify-between gap-1.5 mb-1 ${step === item.s ? 'text-white' : 'text-[#0284C7]'}">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"/></svg>
                <span class="text-[10px] font-bold">Step ${item.s}</span>
              </div>
              <span
                data-step-error-badge="${item.s}"
                class="${stepErrCount > 0 ? '' : 'hidden'} px-1.5 py-0.2 rounded-full text-[9px] font-extrabold font-mono ${
                  step === item.s ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                }"
                title="${stepErrCount} validation issue(s) in Step ${item.s}"
              >${stepErrCount}</span>
            </div>
            <div class="text-xs font-bold truncate">${item.title.split('. ')[1]}</div>
          </button>
        `;
        }).join('')}
      </div>

      <!-- Step Content Container -->
      <form id="trsa-builder-form" onsubmit="event.preventDefault();" novalidate class="space-y-6">
        ${
          step === 1 ? renderStep1(proj, validation) :
          step === 2 ? renderStep2(proj, validation) :
          step === 3 ? renderStep3(proj, validation) :
          step === 4 ? renderStep4(proj, validation) :
          step === 5 ? renderStep5(proj, validation) :
          step === 6 ? renderStep6(proj, validation) : ''
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
                  onclick="window.TRSA.finishAndPreview()" 
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
function renderStep1(proj, validation = validateProject(proj)) {
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
          <label class="block text-xs font-semibold text-slate-700 mb-1">Document Title <span class="text-red-500">*</span></label>
          <input type="text" id="doc-title" data-validation-key="documentInfo.title" value="${escapeHtml(proj.documentInfo.title)}" class="corp-input font-medium ${errorClass('documentInfo.title', validation)}" />
          ${renderErrorMsg('documentInfo.title', validation)}
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Sub Title / Equipment Line <span class="text-red-500">*</span></label>
          <input type="text" id="doc-subtitle" data-validation-key="documentInfo.subTitle" value="${escapeHtml(proj.documentInfo.subTitle)}" class="corp-input font-medium ${errorClass('documentInfo.subTitle', validation)}" />
          ${renderErrorMsg('documentInfo.subTitle', validation)}
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700">Active Document Control Number (No. TRSA)</label>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
              <svg class="w-3 h-3 text-slate-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Read-Only
            </span>
          </div>
          <input type="text" id="doc-number" value="${proj.documentInfo.docNumber}" readonly class="corp-input font-mono font-bold text-[#0369A1] bg-slate-100/90 border-slate-300 cursor-not-allowed select-all w-full" title="Official TRSA Document Number (Read-only)" />
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
                <select id="gen-vendor-select" data-validation-key="generalInfo.vendorName" onchange="window.TRSA.onVendorSelectChanged(this.value)" class="corp-select font-bold text-slate-800 text-xs w-full ${errorClass('generalInfo.vendorName', validation)}">
                  <option value="" disabled ${!currentVendor ? 'selected' : ''}>-- Select Pre-vetted OEM / Equipment Vendor --</option>
                  ${loadVendors().map(v => `
                    <option value="${escapeHtml(v.name)}" ${currentVendor === v.name ? 'selected' : ''}>
                      ${escapeHtml(v.name)} (${escapeHtml(v.country)} - ${escapeHtml(v.equipmentType)})
                    </option>
                  `).join('')}
                  ${(currentVendor && !selectedVendorDetails) ? `
                    <option value="${escapeHtml(currentVendor)}" selected>${escapeHtml(currentVendor)} (Custom Vendor)</option>
                  ` : ''}
                  <option value="__custom__" ${store.customVendorActive ? 'selected' : ''}>+ Enter Custom Vendor Name...</option>
                </select>
                ${!isCustomVendorActive ? renderErrorMsg('generalInfo.vendorName', validation) : ''}
              </div>

              <div>
                ${isCustomVendorActive ? `
                  <input 
                    type="text" 
                    id="gen-vendor-custom" 
                    data-validation-key="generalInfo.vendorName"
                    value="${escapeHtml(currentVendor)}" 
                    placeholder="Enter custom OEM / Manufacturer name..." 
                    class="corp-input font-bold text-slate-900 text-xs w-full ${errorClass('generalInfo.vendorName', validation)}" 
                  />
                  ${renderErrorMsg('generalInfo.vendorName', validation)}
                ` : `
                  <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between gap-2">
                    <span class="truncate">
                      <strong>Specialization:</strong> ${escapeHtml(selectedVendorDetails?.equipmentType || 'Food Processing Machinery')}
                    </span>
                    <button
                      type="button"
                      onclick="window.TRSA.openVendorInDirectory('${escapeHtml(selectedVendorDetails?.id || '')}')"
                      class="text-[10px] text-[#0284C7] font-bold hover:underline shrink-0"
                    >
                      Detail Vendor &rarr;
                    </button>
                  </div>
                `}
              </div>
            </div>

            ${selectedVendorDetails ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div class="bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <div class="text-[10px] text-slate-500">Vendor Code &amp; Tax ID</div>
                  <div class="font-mono font-semibold text-slate-800 truncate">${escapeHtml(selectedVendorDetails.vendorCode || 'OEM')} &middot; ${escapeHtml(selectedVendorDetails.taxId || 'Registered')}</div>
                </div>
                <div class="bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <div class="text-[10px] text-slate-500">Vendor PIC</div>
                  <div class="font-semibold text-slate-800 truncate">${escapeHtml(selectedVendorDetails.picName || 'Account Team')} (${escapeHtml(selectedVendorDetails.picEmail || '-')})</div>
                </div>
                <div class="bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <div class="text-[10px] text-slate-500">HQ / Factory Address</div>
                  <div class="text-slate-700 truncate" title="${escapeHtml(selectedVendorDetails.address || '')}">${escapeHtml(selectedVendorDetails.address || selectedVendorDetails.country)}${selectedVendorDetails.city ? `, ${escapeHtml(selectedVendorDetails.city)}` : ''}</div>
                </div>
                <div class="bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <div class="text-[10px] text-slate-500">Lead Time &amp; Currency</div>
                  <div class="font-semibold text-slate-800 truncate">${escapeHtml(selectedVendorDetails.leadTimeWeeks || '16–24 wks')} &middot; ${escapeHtml(selectedVendorDetails.paymentCurrency || 'USD/EUR')}</div>
                </div>
              </div>
            ` : ''}

            ${selectedVendorDetails?.description ? `
              <p class="text-[11px] text-slate-500 mt-0.5 italic">
                ${escapeHtml(selectedVendorDetails.description)}
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
                        value="${escapeHtml(item.modelNumber || '')}" 
                        data-model-idx="${idx}" 
                        data-model-field="modelNumber" 
                        data-validation-key="generalInfo.equipmentModels.${idx}.modelNumber"
                        placeholder="e.g. SPF-600 Continuous Fryer, TMB-700 Drum, etc." 
                        class="corp-input font-mono text-xs font-medium w-full ${errorClass(`generalInfo.equipmentModels.${idx}.modelNumber`, validation)}"
                      />
                      ${renderErrorMsg(`generalInfo.equipmentModels.${idx}.modelNumber`, validation)}
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                        Design Capacity <span class="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value="${escapeHtml(item.designCapacity || '')}" 
                        data-model-idx="${idx}" 
                        data-model-field="designCapacity" 
                        data-validation-key="generalInfo.equipmentModels.${idx}.designCapacity"
                        placeholder="e.g. 600 kg/hour (Pellet Output), 2.5 kg/batch, etc." 
                        class="corp-input font-medium text-emerald-800 text-xs w-full ${errorClass(`generalInfo.equipmentModels.${idx}.designCapacity`, validation)}"
                      />
                      ${renderErrorMsg(`generalInfo.equipmentModels.${idx}.designCapacity`, validation)}
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
                      value="${escapeHtml(rev.revision)}" 
                      data-rev-idx="${i}" 
                      data-field="revision" 
                      data-validation-key="revision.${i}.revision"
                      class="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#0369A1] bg-slate-50 focus:bg-white focus:border-[#0284C7] ${errorClass(`revision.${i}.revision`, validation)}" 
                    />
                    ${renderErrorMsg(`revision.${i}.revision`, validation)}
                  </td>
                  <td class="p-2.5 align-top">
                    <input 
                      type="text" 
                      value="${escapeHtml(rev.description)}" 
                      data-rev-idx="${i}" 
                      data-field="description" 
                      data-validation-key="revision.${i}.description"
                      placeholder="e.g. Specification update, scope amendment, trial notes..."
                      class="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:border-[#0284C7] ${errorClass(`revision.${i}.description`, validation)}" 
                    />
                    ${renderErrorMsg(`revision.${i}.description`, validation)}
                  </td>
                  <td class="p-2.5 align-top">
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value="${escapeHtml(rev.originatedBy || store.currentUser.name)}" 
                          data-rev-idx="${i}" 
                          data-field="originatedBy" 
                          data-validation-key="revision.${i}.originatedBy"
                          class="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0284C7] ${errorClass(`revision.${i}.originatedBy`, validation)}" 
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
                      ${renderErrorMsg(`revision.${i}.originatedBy`, validation)}
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
                          value="${escapeHtml(rev.date)}" 
                          data-rev-idx="${i}" 
                          data-field="date" 
                          data-validation-key="revision.${i}.date"
                          class="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0284C7] ${errorClass(`revision.${i}.date`, validation)}" 
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
                      ${renderErrorMsg(`revision.${i}.date`, validation)}
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
          <label class="block text-xs font-bold text-[#0B2447] mb-1">II. Project Purpose & Scope Overview <span class="text-red-500">*</span></label>
          <textarea id="project-desc" data-validation-key="projectOverview.description" rows="3" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none ${errorClass('projectOverview.description', validation)}">${escapeHtml(proj.projectOverview.description)}</textarea>
          ${renderErrorMsg('projectOverview.description', validation)}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Target Line Start-up <span class="text-red-500">*</span></label>
            <input type="text" id="date-startup" data-validation-key="projectOverview.keyDates.lineStartUp" value="${escapeHtml(proj.projectOverview.keyDates.lineStartUp)}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-bold text-[#0284C7] ${errorClass('projectOverview.keyDates.lineStartUp', validation)}" />
            ${renderErrorMsg('projectOverview.keyDates.lineStartUp', validation)}
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Final Quotation & Signed Agreement <span class="text-red-500">*</span></label>
            <input type="text" id="date-quotation" data-validation-key="projectOverview.keyDates.finalQuotationDrawings" value="${escapeHtml(proj.projectOverview.keyDates.finalQuotationDrawings)}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-medium ${errorClass('projectOverview.keyDates.finalQuotationDrawings', validation)}" />
            ${renderErrorMsg('projectOverview.keyDates.finalQuotationDrawings', validation)}
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">Order Placement Target <span class="text-red-500">*</span></label>
            <input type="text" id="date-po" data-validation-key="projectOverview.keyDates.orderPlacement" value="${escapeHtml(proj.projectOverview.keyDates.orderPlacement)}" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] font-medium ${errorClass('projectOverview.keyDates.orderPlacement', validation)}" />
            ${renderErrorMsg('projectOverview.keyDates.orderPlacement', validation)}
          </div>
        </div>

        <!-- Clauses VI & VII: Confidentiality & Mandatory Language Requirements -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">VI. Confidentiality Clause</label>
            <textarea id="doc-confidentiality" rows="3" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none">${escapeHtml(proj.projectOverview.confidentialityClause || CONFIDENTIALITY_STANDARD)}</textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0B2447] mb-1">VII. Language Requirements (Mandatory English)</label>
            <textarea id="doc-language" rows="3" class="w-full text-xs p-2.5 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl focus:bg-white focus:border-[#0284C7] focus:outline-none">${escapeHtml(proj.projectOverview.languageRequirement || LANGUAGE_REQUIREMENT_STANDARD)}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 2: Key Contacts, Site Description & Invoicing
function renderStep2(proj, validation = validateProject(proj)) {
  ensureProjectMatrixDefaults(proj);
  const isAdminUser = store.isAdmin();
  const currentPlant = proj.documentInfo.plantLocation || 'Semarang Plant';
  const plantCode = resolvePlantCode(currentPlant);
  const plantData = getPlantDatabase(currentPlant);
  const matrixContacts = resolveContactsForPlant(plantCode);

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#0B2447]">Key Contacts & Plant Location (Clauses IV &amp; V)</h2>
          <p class="text-xs text-[#5A7184]">Authorized User/Engineering, Project, Purchasing PICs, delivery address, and document submission rules.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onclick="window.TRSA.syncSiteLocationFromDatabase()"
            class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all"
            title="Synchronize Plant ${plantCode} PICs, address, and delivery port from IFM Matrix"
          >
            Sync Plant PICs &amp; Address
          </button>
        </div>
      </div>

      <!-- Contacts Table -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <label class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">IV. Key Contacts Matrix (Plant ${plantCode} &mdash; ${proj.keyContacts.length} Contacts) <span class="text-red-500">*</span></label>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Engineering PICs: ${matrixContacts.userEngineeringPics.length}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
              Project PICs: ${matrixContacts.projectTeamPics.length}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Purchasing PICs: ${matrixContacts.purchasingTeamPics.length}
            </span>
            <button type="button" onclick="window.TRSA.addContactRow()" class="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] ml-1">+ Add Contact</button>
          </div>
        </div>
        ${renderErrorMsg('contact.list', validation)}

        <div class="space-y-3" id="contact-list-container">
          ${proj.keyContacts.map((c, i) => `
            <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE] flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                <div>
                  <input type="text" placeholder="Name *" value="${escapeHtml(c.name)}" data-contact-idx="${i}" data-field="name" data-validation-key="contact.${i}.name" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs font-bold text-[#0B2447] bg-white ${errorClass(`contact.${i}.name`, validation)}" />
                  ${renderErrorMsg(`contact.${i}.name`, validation)}
                </div>
                <div>
                  <input type="text" placeholder="Responsibility / Role *" value="${escapeHtml(c.role)}" data-contact-idx="${i}" data-field="role" data-validation-key="contact.${i}.role" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs bg-white text-[#5A7184] ${errorClass(`contact.${i}.role`, validation)}" />
                  ${renderErrorMsg(`contact.${i}.role`, validation)}
                </div>
                <div>
                  <input type="email" placeholder="Corporate Email *" value="${escapeHtml(c.email)}" data-contact-idx="${i}" data-field="email" data-validation-key="contact.${i}.email" class="w-full p-2 border border-[#E0ECF6] rounded-xl text-xs font-mono text-[#0284C7] bg-white ${errorClass(`contact.${i}.email`, validation)}" />
                  ${renderErrorMsg(`contact.${i}.email`, validation)}
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
              <label class="block text-xs font-bold text-[#0B2447]">Company Invoicing Name <span class="text-red-500">*</span></label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-filled
              </span>
            </div>
            <input 
              type="text" 
              id="site-recipient" 
              data-validation-key="siteDescription.invoiceRecipient"
              value="${escapeHtml(proj.siteDescription.invoiceRecipient || plantData.invoiceRecipient)}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-[#0284C7] ${errorClass('siteDescription.invoiceRecipient', validation)}" 
            />
            ${renderErrorMsg('siteDescription.invoiceRecipient', validation)}
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-[#0B2447]">Delivery Port (Incoterm) <span class="text-red-500">*</span></label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Auto-filled
              </span>
            </div>
            <input 
              type="text" 
              id="site-port" 
              data-validation-key="siteDescription.deliveryPort"
              value="${escapeHtml(proj.siteDescription.deliveryPort || plantData.deliveryPort)}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl font-bold text-[#0284C7] focus:bg-white focus:border-[#0284C7] ${errorClass('siteDescription.deliveryPort', validation)}" 
            />
            ${renderErrorMsg('siteDescription.deliveryPort', validation)}
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-[#0B2447]">Company Address / Plant Location <span class="text-red-500">*</span></label>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Database Synced
              </span>
            </div>
            <input 
              type="text" 
              id="site-address" 
              data-validation-key="siteDescription.address"
              value="${escapeHtml(proj.siteDescription.address || plantData.address)}" 
              class="w-full text-xs p-2.5 bg-[#F8FBFE] border border-sky-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#0284C7] ${errorClass('siteDescription.address', validation)}" 
            />
            ${renderErrorMsg('siteDescription.address', validation)}

            ${plantData?.addressDetail ? `
              <div class="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-bold text-[#0F172A]">
                    Detail Address Breakdown &mdash; Plant ${escapeHtml(plantData.code)} (${escapeHtml(plantData.plantName)})
                  </div>
                  <button
                    type="button"
                    onclick="window.TRSA.openPlantInDirectory('${escapeHtml(plantData.code)}')"
                    class="text-[11px] font-bold text-[#0284C7] hover:underline"
                  >
                    Open Plant Detail &rarr;
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <div class="text-[10px] text-slate-500">Jalan / Kawasan Industri</div>
                    <div class="font-semibold text-slate-800">${escapeHtml(plantData.addressDetail.street)}</div>
                    <div class="text-slate-600">${escapeHtml(plantData.addressDetail.industrialZone || '')}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500">Kelurahan / Kecamatan</div>
                    <div class="font-semibold text-slate-800">${escapeHtml(plantData.addressDetail.kelurahan)}, ${escapeHtml(plantData.addressDetail.kecamatan)}</div>
                    <div class="text-slate-600">${escapeHtml(plantData.addressDetail.city)}, ${escapeHtml(plantData.addressDetail.province)} ${escapeHtml(plantData.addressDetail.postalCode)}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500">Receiving Bay &amp; Operational Hours</div>
                    <div class="font-semibold text-slate-800">${escapeHtml(plantData.addressDetail.receivingGate || '-')}</div>
                    <div class="text-slate-600">${escapeHtml(plantData.addressDetail.receivingHours || '-')}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500">Telepon / Tax &amp; KLU Entity</div>
                    <div class="font-mono font-semibold text-slate-800">${escapeHtml(plantData.addressDetail.phone || '-')}</div>
                    <div class="text-slate-600 truncate" title="${escapeHtml(plantData.addressDetail.taxEntityNote || '')}">${escapeHtml(plantData.addressDetail.taxEntityNote || '-')}</div>
                  </div>
                </div>
              </div>
            ` : ''}
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

          <!-- Clause V: Document Submission & Compliance -->
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-[#0B2447] mb-1">
              V. Document Submission &amp; Compliance (Softcopy Draft Approval Prior to Hardcopy)
            </label>
            <textarea
              id="site-doc-submission"
              rows="3"
              class="w-full text-xs p-3 bg-[#F4F8FC] border border-[#E0ECF6] rounded-xl text-slate-700 focus:bg-white focus:border-[#0284C7] focus:outline-none"
            >${escapeHtml(proj.siteDescription.documentSubmissionCompliance || DOCUMENT_SUBMISSION_COMPLIANCE)}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 3: Product Specifications Matrix & Process Parameters
// Interactive Visual Engineering Canvas with Product Shape Diagrams, Specifications Matrix & Benchmarks
function renderStep3(proj, validation = validateProject(proj)) {
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
                <span class="text-[10px] uppercase font-mono tracking-widest text-sky-300">Active Canvas Parameters <span class="text-red-300">*</span></span>
                <div class="flex items-center gap-3 mt-1">
                  <input 
                    type="text" 
                    value="${escapeHtml(activeProd.shape)}" 
                    data-prod-idx="${selIdx}" 
                    data-field="shape" 
                    data-validation-key="product.${selIdx}.shape"
                    class="text-base font-extrabold text-white bg-white/10 border border-white/25 rounded-xl px-3 py-1.5 focus:bg-white/20 focus:outline-none w-full ${errorClass(`product.${selIdx}.shape`, validation)}" 
                  />
                </div>
                ${renderErrorMsg(`product.${selIdx}.shape`, validation, true)}
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
                    <td class="p-2.5 text-center font-bold text-slate-500 align-top">${idx + 1}</td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.shape)}" 
                        data-prod-idx="${idx}" 
                        data-field="shape" 
                        data-validation-key="product.${idx}.shape"
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0B2447] bg-white focus:border-[#0284C7] ${errorClass(`product.${idx}.shape`, validation)}" 
                      />
                      ${renderErrorMsg(`product.${idx}.shape`, validation)}
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.description)}" 
                        data-prod-idx="${idx}" 
                        data-field="description" 
                        data-validation-key="product.${idx}.description"
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:border-[#0284C7] ${errorClass(`product.${idx}.description`, validation)}" 
                      />
                      ${renderErrorMsg(`product.${idx}.description`, validation)}
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.dimensionInput)}" 
                        data-prod-idx="${idx}" 
                        data-field="dimensionInput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.dimensionOutput)}" 
                        data-prod-idx="${idx}" 
                        data-field="dimensionOutput" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.capacityOutput)}" 
                        data-prod-idx="${idx}" 
                        data-field="capacityOutput" 
                        data-validation-key="product.${idx}.capacityOutput"
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0284C7] bg-white focus:border-[#0284C7] ${errorClass(`product.${idx}.capacityOutput`, validation)}" 
                      />
                      ${renderErrorMsg(`product.${idx}.capacityOutput`, validation)}
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.bulkDensityInput)} / ${escapeHtml(p.bulkDensityOutput)}" 
                        data-prod-idx="${idx}" 
                        data-field="bulkDensity" 
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 bg-white focus:border-[#0284C7]" 
                      />
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.moistureOutput)}" 
                        data-prod-idx="${idx}" 
                        data-field="moistureOutput" 
                        data-validation-key="product.${idx}.moistureOutput"
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0284C7] bg-white focus:border-[#0284C7] ${errorClass(`product.${idx}.moistureOutput`, validation)}" 
                      />
                      ${renderErrorMsg(`product.${idx}.moistureOutput`, validation)}
                    </td>
                    <td class="p-2.5 align-top">
                      <input 
                        type="text" 
                        value="${escapeHtml(p.oilContentOutput)}" 
                        data-prod-idx="${idx}" 
                        data-field="oilContentOutput" 
                        data-validation-key="product.${idx}.oilContentOutput"
                        class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#EA580C] bg-white focus:border-[#0284C7] ${errorClass(`product.${idx}.oilContentOutput`, validation)}" 
                      />
                      ${renderErrorMsg(`product.${idx}.oilContentOutput`, validation)}
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
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Temperature Range <span class="text-red-500">*</span></label>
                <input type="text" id="proc-fry-temp" data-validation-key="processParameters.frying.temperatureRange" value="${escapeHtml(proj.processParameters.frying.temperatureRange)}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono font-bold text-[#EA580C] focus:border-[#EA580C] focus:outline-none ${errorClass('processParameters.frying.temperatureRange', validation)}" />
                ${renderErrorMsg('processParameters.frying.temperatureRange', validation)}
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Dwell Time <span class="text-red-500">*</span></label>
                <input type="text" id="proc-fry-dwell" data-validation-key="processParameters.frying.dwellTime" value="${escapeHtml(proj.processParameters.frying.dwellTime)}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono font-bold text-slate-800 focus:border-[#EA580C] focus:outline-none ${errorClass('processParameters.frying.dwellTime', validation)}" />
                ${renderErrorMsg('processParameters.frying.dwellTime', validation)}
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Feeder Rate</label>
                <input type="text" id="proc-fry-feeder" value="${escapeHtml(proj.processParameters.frying.feederRate || '1.5 – 2.5 kg/batch')}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Oil Capacity in Fryer <span class="text-red-500">*</span></label>
                <input type="text" id="proc-fry-oil" data-validation-key="processParameters.frying.oilCapacityInFryer" value="${escapeHtml(proj.processParameters.frying.oilCapacityInFryer)}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none ${errorClass('processParameters.frying.oilCapacityInFryer', validation)}" />
                ${renderErrorMsg('processParameters.frying.oilCapacityInFryer', validation)}
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Spinner Rotation Time</label>
                <input type="text" id="proc-fry-spinner" value="${escapeHtml(proj.processParameters.frying.spinnerRotationTime)}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Hopper Gate Opening</label>
                <input type="text" id="proc-fry-hopper" value="${escapeHtml(proj.processParameters.frying.hopperGateOpening || 'Min 8.5 cm – Max 12 cm')}" class="w-full p-2 border border-orange-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#EA580C] focus:outline-none" />
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
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Required Seasoning <span class="text-red-500">*</span></label>
                <input type="text" id="proc-seas-type" data-validation-key="processParameters.seasoning.requiredSeasoning" value="${escapeHtml(proj.processParameters.seasoning.requiredSeasoning)}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-[#0369A1] focus:border-[#0284C7] focus:outline-none ${errorClass('processParameters.seasoning.requiredSeasoning', validation)}" />
                ${renderErrorMsg('processParameters.seasoning.requiredSeasoning', validation)}
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Application Rate (%w/w) <span class="text-red-500">*</span></label>
                <input type="text" id="proc-seas-rate" data-validation-key="processParameters.seasoning.seasoningApplicationRate" value="${escapeHtml(proj.processParameters.seasoning.seasoningApplicationRate)}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-slate-800 focus:border-[#0284C7] focus:outline-none ${errorClass('processParameters.seasoning.seasoningApplicationRate', validation)}" />
                ${renderErrorMsg('processParameters.seasoning.seasoningApplicationRate', validation)}
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Salt Content (%SA Base Excl.)</label>
                <input type="text" id="proc-seas-salt" value="${escapeHtml(proj.processParameters.seasoning.saltContentBaseExcluded)}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono text-slate-800 focus:border-[#0284C7] focus:outline-none" />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Seasoning Capacity <span class="text-red-500">*</span></label>
                <input type="text" id="proc-seas-cap" data-validation-key="processParameters.seasoning.seasoningCapacity" value="${escapeHtml(proj.processParameters.seasoning.seasoningCapacity)}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-mono font-bold text-[#0284C7] focus:border-[#0284C7] focus:outline-none ${errorClass('processParameters.seasoning.seasoningCapacity', validation)}" />
                ${renderErrorMsg('processParameters.seasoning.seasoningCapacity', validation)}
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] text-slate-500 font-bold mb-1">Powder Type Specification</label>
                <input type="text" id="proc-seas-spec" value="${escapeHtml(proj.processParameters.seasoning.seasoningType || 'Dry seasoning powder')}" class="w-full p-2 border border-sky-200 rounded-xl bg-white font-medium text-slate-800 focus:border-[#0284C7] focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 4: Project Scope of Supply (Fryer, Seasoning, Services, Ancillaries & Control System Access)
function renderStep4(proj, validation = validateProject(proj)) {
  ensureProjectMatrixDefaults(proj);
  const servicesScope = proj.scopeOfSupply?.servicesScope || SERVICES_SCOPE_STANDARD;
  const ancillaries = proj.scopeOfSupply?.ancillariesAndLogistics || ANCILLARIES_LOGISTICS_STANDARD;
  const controlAccess = proj.scopeOfSupply?.controlSystemAccess || CONTROL_SYSTEM_ACCESS_RIGHTS;

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-[#0B2447]">IX. Project Scope of Supply (Equipment, Services, Ancillaries &amp; Automation Access)</h2>
          <p class="text-xs text-[#5A7184]">Comprehensive machinery, training services, logistics, and unlocked PLC/HMI code obligations conforming to IFM Matrix.</p>
        </div>
        <button type="button" onclick="window.TRSA.setView('matrix')" class="px-3 py-1.5 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200 text-xs font-bold hover:bg-sky-100 shrink-0">
          View Compliance Matrix &rarr;
        </button>
      </div>

      <div class="space-y-6">
        <!-- A. Fryer System -->
        <div>
          <div class="flex items-center justify-between mb-3 bg-[#FF7A00] text-white px-4 py-2.5 rounded-2xl shadow-md shadow-orange-500/20">
            <div class="font-black text-xs uppercase tracking-wide">IX.A1) Fryer System Scope (${proj.scopeOfSupply.fryer.length} Units)</div>
            <button type="button" onclick="window.TRSA.addScopeItem('fryer')" class="text-xs bg-white text-[#EA580C] font-bold px-3 py-1 rounded-xl hover:bg-orange-50 transition-all">+ Add Module</button>
          </div>
          ${renderErrorMsg('scope.fryer.list', validation)}

          <div class="space-y-3" id="fryer-scope-container">
            ${proj.scopeOfSupply.fryer.map((item, i) => `
              <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div class="flex items-start gap-2 flex-1">
                    <span class="w-5 h-5 rounded-full bg-[#FF7A00] text-white flex items-center justify-center text-[10px] font-bold mt-1 shrink-0">${item.itemNumber || (i + 1)}</span>
                    <div class="flex-1 max-w-md">
                      <input type="text" value="${escapeHtml(item.title)}" data-scope-type="fryer" data-scope-idx="${i}" data-field="title" data-validation-key="scope.fryer.${i}.title" class="w-full font-bold text-xs text-[#0B2447] bg-transparent border-b border-[#BAE6FD] px-1.5 py-1 rounded-t focus:outline-none ${errorClass(`scope.fryer.${i}.title`, validation)}" />
                      ${renderErrorMsg(`scope.fryer.${i}.title`, validation)}
                    </div>
                  </div>
                  <div class="flex items-start gap-2">
                    <div>
                      <input type="text" value="${escapeHtml(item.qty)}" data-scope-type="fryer" data-scope-idx="${i}" data-field="qty" data-validation-key="scope.fryer.${i}.qty" class="text-xs border border-[#E0ECF6] rounded-xl px-2.5 py-1 w-28 text-center font-bold text-[#EA580C] bg-white ${errorClass(`scope.fryer.${i}.qty`, validation)}" />
                      ${renderErrorMsg(`scope.fryer.${i}.qty`, validation)}
                    </div>
                    <button type="button" onclick="window.TRSA.removeScopeItem('fryer', ${i})" class="text-red-500 text-xs font-bold px-1.5 py-0.5 hover:bg-red-50 rounded-lg">&times;</button>
                  </div>
                </div>
                <div class="text-[11px] text-[#5A7184] pl-7">
                  <textarea rows="2" data-scope-type="fryer" data-scope-idx="${i}" data-field="specs" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white text-xs">${escapeHtml(item.specs.join('\n'))}</textarea>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- A2. Seasoning System -->
        <div>
          <div class="flex items-center justify-between mb-3 bg-[#0284C7] text-white px-4 py-2.5 rounded-2xl shadow-md shadow-sky-500/20">
            <div class="font-black text-xs uppercase tracking-wide">IX.A2) Seasoning System Scope (${proj.scopeOfSupply.seasoning.length} Units)</div>
            <button type="button" onclick="window.TRSA.addScopeItem('seasoning')" class="text-xs bg-white text-[#0369A1] font-bold px-3 py-1 rounded-xl hover:bg-sky-50 transition-all">+ Add Module</button>
          </div>
          ${renderErrorMsg('scope.seasoning.list', validation)}

          <div class="space-y-3" id="seasoning-scope-container">
            ${proj.scopeOfSupply.seasoning.map((item, i) => `
              <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div class="flex items-start gap-2 flex-1">
                    <span class="w-5 h-5 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-[10px] font-bold mt-1 shrink-0">${item.itemNumber || (i + 1)}</span>
                    <div class="flex-1 max-w-md">
                      <input type="text" value="${escapeHtml(item.title)}" data-scope-type="seasoning" data-scope-idx="${i}" data-field="title" data-validation-key="scope.seasoning.${i}.title" class="w-full font-bold text-xs text-[#0B2447] bg-transparent border-b border-[#BAE6FD] px-1.5 py-1 rounded-t focus:outline-none ${errorClass(`scope.seasoning.${i}.title`, validation)}" />
                      ${renderErrorMsg(`scope.seasoning.${i}.title`, validation)}
                    </div>
                  </div>
                  <div class="flex items-start gap-2">
                    <div>
                      <input type="text" value="${escapeHtml(item.qty)}" data-scope-type="seasoning" data-scope-idx="${i}" data-field="qty" data-validation-key="scope.seasoning.${i}.qty" class="text-xs border border-[#E0ECF6] rounded-xl px-2.5 py-1 w-28 text-center font-bold text-[#0284C7] bg-white ${errorClass(`scope.seasoning.${i}.qty`, validation)}" />
                      ${renderErrorMsg(`scope.seasoning.${i}.qty`, validation)}
                    </div>
                    <button type="button" onclick="window.TRSA.removeScopeItem('seasoning', ${i})" class="text-red-500 text-xs font-bold px-1.5 py-0.5 hover:bg-red-50 rounded-lg">&times;</button>
                  </div>
                </div>
                <div class="text-[11px] text-[#5A7184] pl-7">
                  <textarea rows="2" data-scope-type="seasoning" data-scope-idx="${i}" data-field="specs" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white text-xs">${escapeHtml(item.specs.join('\n'))}</textarea>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- IX.B Services Scope, IX.C Ancillaries & Logistics, IX.E Control System Access Rights -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-[#E0ECF6] pt-5">
          <div class="p-4 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2.5">
            <div class="text-xs font-bold text-[#0369A1] uppercase tracking-wider">IX.B Services Scope (${servicesScope.length})</div>
            <div class="space-y-2 text-xs">
              ${servicesScope.map((srv, idx) => `
                <div class="p-2.5 rounded-xl bg-white border border-sky-100">
                  <div class="font-bold text-[#0B2447]">${idx + 1}. ${escapeHtml(srv.title)}</div>
                  <div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(srv.description)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">IX.C Ancillaries &amp; Logistics (${ancillaries.length})</div>
            <ul class="space-y-2 text-[11px] text-slate-700">
              ${ancillaries.map((anc, idx) => `
                <li class="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-start gap-2">
                  <span class="font-mono font-bold text-[#0284C7]">${idx + 1}.</span>
                  <span>${escapeHtml(anc)}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2.5">
            <div class="text-xs font-bold text-amber-800 uppercase tracking-wider">IX.E Control System &amp; Password Access</div>
            <div class="space-y-2 text-xs">
              ${controlAccess.map(rule => `
                <div class="p-2.5 rounded-xl bg-white border border-amber-200/70">
                  <div class="font-bold text-[#0B2447]">${rule.no}. ${escapeHtml(rule.title)}</div>
                  <div class="text-[11px] text-slate-700 mt-0.5">${escapeHtml(rule.description)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-step 5: Hygienic Standards (12 Rules), Target Performance Tests, Final Acceptance & Remedies
function renderStep5(proj, validation = validateProject(proj)) {
  ensureProjectMatrixDefaults(proj);
  const tech12 = proj.hygieneAndQuality?.generalTechnicalHygienic12 || TECHNICAL_HYGIENIC_REQUIREMENTS_12;
  const facList = proj.performanceAcceptance?.finalAcceptanceChecklist || FINAL_ACCEPTANCE_RULES;
  const remedies = proj.performanceAcceptance?.remediesAndConsequences || REMEDIES_CONSEQUENCES_STANDARD;

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4">
        <h2 class="text-base font-bold text-[#0B2447]">Hygienic Design (12 Rules), Performance Protocol, Final Acceptance &amp; Remedies</h2>
        <p class="text-xs text-[#5A7184]">Clauses IX.D, X, XI (Training Attendance + Snag List), and XII (3-Month Rectification &amp; 100% Refund).</p>
      </div>

      <!-- Hygiene Requirements -->
      <div class="space-y-4">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">Core Hygiene &amp; Trial Thresholds</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-bold text-[#5A7184] mb-1">Food Contact Surface Material <span class="text-red-500">*</span></label>
            <input type="text" id="hygiene-material" data-validation-key="hygieneAndQuality.foodContactMaterial" value="${escapeHtml(proj.hygieneAndQuality.foodContactMaterial)}" class="w-full text-xs p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F4F8FC] font-medium ${errorClass('hygieneAndQuality.foodContactMaterial', validation)}" />
            ${renderErrorMsg('hygieneAndQuality.foodContactMaterial', validation)}
          </div>
          <div>
            <label class="block text-[11px] font-bold text-[#5A7184] mb-1">Commissioning Trial Time per Product <span class="text-red-500">*</span></label>
            <input type="text" id="comm-duration" data-validation-key="performanceAcceptance.commissioningDuration" value="${escapeHtml(proj.performanceAcceptance.commissioningDuration)}" class="w-full text-xs p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F4F8FC] font-bold text-[#0284C7] ${errorClass('performanceAcceptance.commissioningDuration', validation)}" />
            ${renderErrorMsg('performanceAcceptance.commissioningDuration', validation)}
          </div>
        </div>

        <!-- Clause IX.D: 12 General Technical & Hygienic Requirements -->
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">IX.D General Technical &amp; Hygienic Requirements (${tech12.length} Mandatory Rules)</h4>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">EHEDG / 3-A / IE3 / IP65</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            ${tech12.map(r => `
              <div class="p-3 rounded-xl border border-slate-200 bg-[#F8FBFE]">
                <div class="font-bold text-[#0B2447]">${r.no}. ${escapeHtml(r.title)}</div>
                <div class="text-[11px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(r.description)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Performance Test Matrix -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">X. Target Performance Test Protocols</h3>
        <div class="space-y-3">
          ${proj.performanceAcceptance.tests.map((test) => `
            <div class="p-3.5 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE]">
              <div class="font-bold text-xs text-[#0B2447] mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#0284C7]"></span>
                ${escapeHtml(test.step)}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-[10px] text-[#5A7184] font-bold uppercase">Observation & Process Action</span>
                  <p class="text-[#0B2447] mt-0.5">${escapeHtml(test.observation)}</p>
                </div>
                <div>
                  <span class="text-[10px] text-[#0284C7] font-bold uppercase">Acceptance Benchmark / Note</span>
                  <p class="text-[#0369A1] font-bold mt-0.5">${escapeHtml(test.target)}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Clause XI: Final Acceptance (Training Attendance Sheets & Snag List) -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-3">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XI. Final Acceptance Criteria (${facList.length} Rules)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          ${facList.map(item => `
            <div class="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <div class="font-bold text-emerald-900">${item.no}. ${escapeHtml(item.title)}</div>
              <p class="text-[11px] text-emerald-950/90 mt-1 leading-relaxed">${escapeHtml(item.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Clause XII: Remedies & Consequences -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-3">
        <h3 class="text-xs font-bold text-red-800 uppercase tracking-wider">XII. Remedies &amp; Consequences If Target is Not Reached</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          ${remedies.map(rem => `
            <div class="p-4 rounded-2xl border border-red-200 bg-red-50/60 text-red-950">
              <div class="font-bold text-red-800">${rem.no}. ${escapeHtml(rem.title)}</div>
              <p class="text-[11px] mt-1 leading-relaxed">${escapeHtml(rem.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Sub-step 6: Commercial Terms, Shipment, Tax Laws, 13 Required Docs & 6 Appendices
function renderStep6(proj, validation = validateProject(proj)) {
  ensureProjectMatrixDefaults(proj);
  const currentOption = proj.commercialTerms.selectedPaymentOption || 'Matrix Standard';
  const activeCode = resolvePlantCode(proj.documentInfo?.plantLocation || 'Semarang Plant');
  const activeOrigin = normalizeOriginMode(proj.documentInfo?.vendorOrigin || 'Foreign');
  const matrixPay = proj.commercialTerms.matrixEquipmentSchedule || MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN;
  const engPay = proj.commercialTerms.engineeringServicesPayment || MATRIX_ENGINEERING_SERVICES_PAYMENT;
  const bgConds = proj.commercialTerms.invoicingAndBankGuarantee || INVOICING_AND_BG_CONDITIONS;
  const shipItems = proj.commercialTerms.shipmentItems || SHIPMENT_DELIVERY_ITEMS_5;
  const appendices = proj.appendices || APPENDICES_6;

  return `
    <div class="dropx-card p-6 bg-white border border-[#E0ECF6] space-y-6">
      <div class="border-b border-[#E0ECF6] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-[#0B2447]">Commercial Terms, Shipment, Tax Laws &amp; Documentation (Clauses XIII–XIX)</h2>
          <p class="text-xs text-[#5A7184]">Payment schedules, SWIFT APBG, 150-day Undertaking Letter, Plant ${activeCode} tax rules, ${proj.requiredDocumentation.length} deliverables &amp; ${appendices.length} appendices.</p>
        </div>
        <button type="button" onclick="window.TRSA.openPdfModal()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shrink-0">
          Preview IFM Matrix PDF
        </button>
      </div>

      <!-- Vendor Origin Mode Quick Toggle in Step 6 -->
      <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${
                activeOrigin === 'Local' ? 'bg-emerald-500' :
                activeOrigin === 'Mixed' ? 'bg-purple-500' :
                'bg-[#0284C7]'
              }"></span>
              <span class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">Vendor Procurement Origin (Plant ${activeCode})</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">Controls Clause XIV Incoterms and Clause XVI tax rules (Local PPN/PPh/KLU/PP 44/2022 vs Plant 1411 Foreign Import Duty/PPh 26/PMK 35/2019).</p>
          </div>
          <div class="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-xs">
            ${['Foreign', 'Local', 'Mixed'].map(origin => `
              <button 
                type="button" 
                onclick="window.TRSA.setVendorOrigin('${origin}')" 
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeOrigin === origin 
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

      <!-- Payment Option Selector -->
      <div class="space-y-4">
        <label class="block text-xs font-bold text-[#0B2447] uppercase tracking-wider">XIII. Term of Payment (Equipment Supply &amp; Engineering Services)</label>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Matrix Standard -->
          <div class="p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            currentOption === 'Matrix Standard' ? 'border-[#0284C7] bg-[#E0F2FE]/45 shadow-sm' : 'border-[#E0ECF6] bg-white hover:border-[#BAE6FD]'
          }" onclick="window.TRSA.setPaymentOption('Matrix Standard')">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-[#0B2447]">Matrix Standard (30/55/10/5 T/T)</span>
              <input type="radio" name="pay-option" value="Matrix Standard" ${currentOption === 'Matrix Standard' ? 'checked' : ''} class="w-4 h-4 text-[#0284C7]" />
            </div>
            <ul class="text-xs space-y-1.5 text-[#5A7184]">
              ${matrixPay.map(row => `
                <li class="flex items-center justify-between"><span>${escapeHtml(row.stage)}</span><span class="font-bold font-mono text-[#0B2447]">${escapeHtml(row.percent)}</span></li>
              `).join('')}
            </ul>
            <div class="mt-2 text-[10px] text-[#0369A1] font-semibold">SWIFT/Telex APBG &bull; &le;60d / &le;150d B/L</div>
          </div>

          <!-- Option 1 -->
          <div class="p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            currentOption === 'Option 1' ? 'border-[#0284C7] bg-[#E0F2FE]/45 shadow-sm' : 'border-[#E0ECF6] bg-white hover:border-[#BAE6FD]'
          }" onclick="window.TRSA.setPaymentOption('Option 1')">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-[#0B2447]">Option 1: L/C &amp; T/T</span>
              <input type="radio" name="pay-option" value="Option 1" ${currentOption === 'Option 1' ? 'checked' : ''} class="w-4 h-4 text-[#0284C7]" />
            </div>
            <ul class="text-xs space-y-1.5 text-[#5A7184]">
              <li class="flex items-center justify-between"><span>L/C against Shipping Document</span><span class="font-bold font-mono text-[#0B2447]">85%</span></li>
              <li class="flex items-center justify-between"><span>T/T after machine running (&le; 60d)</span><span class="font-bold font-mono text-[#0B2447]">10%</span></li>
              <li class="flex items-center justify-between"><span>T/T retention 3 mos (&le; 150d)</span><span class="font-bold font-mono text-[#0B2447]">5%</span></li>
            </ul>
          </div>

          <!-- Option 2 -->
          <div class="p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            currentOption === 'Option 2' ? 'border-[#0284C7] bg-[#E0F2FE]/45 shadow-sm' : 'border-[#E0ECF6] bg-white hover:border-[#BAE6FD]'
          }" onclick="window.TRSA.setPaymentOption('Option 2')">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-[#0B2447]">Option 2: DP BG + L/C</span>
              <input type="radio" name="pay-option" value="Option 2" ${currentOption === 'Option 2' ? 'checked' : ''} class="w-4 h-4 text-[#0284C7]" />
            </div>
            <ul class="text-xs space-y-1.5 text-[#5A7184]">
              <li class="flex items-center justify-between"><span>Down Payment Counter BG</span><span class="font-bold font-mono text-[#0B2447]">30%</span></li>
              <li class="flex items-center justify-between"><span>L/C payable prior to shipping</span><span class="font-bold font-mono text-[#0B2447]">55%</span></li>
              <li class="flex items-center justify-between"><span>After Machine Running</span><span class="font-bold font-mono text-[#0B2447]">10%</span></li>
              <li class="flex items-center justify-between"><span>T/T retention 3 months</span><span class="font-bold font-mono text-[#0B2447]">5%</span></li>
            </ul>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div class="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200">
            <div class="font-bold text-[#0369A1]">Engineering Services Payment (150-Day Undertaking Letter)</div>
            <p class="text-[11px] text-slate-700 mt-1 leading-relaxed">${escapeHtml(engPay)}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
            <div class="font-bold text-amber-800">Invoicing &amp; SWIFT/Telex BG Conditions</div>
            <ul class="text-[11px] text-slate-700 mt-1 space-y-1 list-disc pl-4">
              ${bgConds.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- XIV Shipment & XV Warranty -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XIV. Shipment, Delivery &amp; XV. Warranty</h3>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${escapeHtml(activeOrigin)} Mode</span>
        </div>
        <div class="p-3 rounded-xl bg-[#F4F8FC] border border-[#D6E6F2] text-xs text-slate-700">
          <strong>Active Delivery Basis:</strong> ${escapeHtml(proj.commercialTerms.shipmentTerms)}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          ${shipItems.map(item => `
            <div class="p-3 rounded-xl border border-slate-200 bg-white">
              <div class="font-bold text-[#0B2447]">${item.no}. ${escapeHtml(item.title)}</div>
              <div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(item.description)}</div>
            </div>
          `).join('')}
          <div class="p-3 rounded-xl border border-sky-200 bg-sky-50/50">
            <div class="font-bold text-[#0369A1]">XV. Warranty Standard</div>
            <div class="text-[11px] text-slate-700 mt-0.5">${escapeHtml(proj.commercialTerms.warranty || WARRANTY_STANDARD)}</div>
          </div>
        </div>
      </div>

      <!-- XVI Administrative, Tax & Regulatory Provisions -->
      <div class="border-t border-[#E0ECF6] pt-5 space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XVI. Administrative, Tax &amp; Regulatory Provisions (Plant ${activeCode} &times; ${activeOrigin})</h3>
          <span class="text-[11px] font-mono text-[#0284C7] font-bold">${(proj.legalAndTaxProvisions || []).length} Active Clauses</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          ${(proj.legalAndTaxProvisions || []).map(p => `
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/80">
              <div class="font-bold text-[#0B2447]">${escapeHtml(p.title)}</div>
              <div class="text-[11px] text-slate-600 mt-1 leading-relaxed">${escapeHtml(p.description)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 13 Required Documents Checklist -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <div class="flex items-center justify-between mb-3">
          <label class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XVII. Required Seller Documentation (${proj.requiredDocumentation.length} Mandatory Deliverables)</label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${proj.requiredDocumentation.map((doc, i) => `
            <div class="p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F8FBFE] flex items-start gap-2.5 text-xs">
              <input type="checkbox" id="doc-req-${i}" ${doc.required ? 'checked' : ''} class="mt-0.5 rounded text-[#0284C7] focus:ring-[#0284C7] cursor-pointer" />
              <div>
                <label for="doc-req-${i}" class="font-bold text-[#0B2447] cursor-pointer">${doc.id || (i + 1)}. ${escapeHtml(doc.title)}</label>
                <div class="text-[11px] text-[#5A7184]">${escapeHtml(doc.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- XIX Reference Appendices Checklist -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <div class="flex items-center justify-between mb-3">
          <label class="text-xs font-bold text-[#0B2447] uppercase tracking-wider">XIX. Attachments / Reference Appendices (${appendices.length} Binding Appendices)</label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${appendices.map((app, i) => `
            <div class="p-2.5 border border-[#E0ECF6] rounded-xl bg-[#F8FBFE] flex items-start gap-2.5 text-xs">
              <input type="checkbox" id="app-check-${i}" ${app.included !== false ? 'checked' : ''} class="mt-0.5 rounded text-[#0284C7] focus:ring-[#0284C7] cursor-pointer" />
              <div>
                <label for="app-check-${i}" class="font-bold text-[#0B2447] cursor-pointer">${escapeHtml(app.code)}: ${escapeHtml(app.title)}</label>
                <div class="text-[11px] text-[#5A7184]">${escapeHtml(app.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Official Signatures Block (Clause XVIII) -->
      <div class="border-t border-[#E0ECF6] pt-5">
        <h3 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-3">XVIII. Acknowledged &amp; Approved By (Formal Sign-Off Parties)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 border border-[#E0ECF6] rounded-2xl bg-[#F8FBFE] space-y-2">
            <div class="font-bold text-[#0B2447] uppercase">The Seller / OEM Supplier</div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Company Name <span class="text-red-500">*</span></label>
              <input type="text" id="sign-seller-company" data-validation-key="signOff.seller.companyName" value="${escapeHtml(proj.signOff.seller.companyName)}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-medium ${errorClass('signOff.seller.companyName', validation)}" />
              ${renderErrorMsg('signOff.seller.companyName', validation)}
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Quotation Reference No. <span class="text-red-500">*</span></label>
              <input type="text" id="sign-seller-quote" data-validation-key="signOff.seller.quotationNo" value="${escapeHtml(proj.signOff.seller.quotationNo)}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-mono ${errorClass('signOff.seller.quotationNo', validation)}" />
              ${renderErrorMsg('signOff.seller.quotationNo', validation)}
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Authorized Signatory Name & Title <span class="text-red-500">*</span></label>
              <input type="text" id="sign-seller-name" data-validation-key="signOff.seller.name" value="${escapeHtml(proj.signOff.seller.name && proj.signOff.seller.position ? `${proj.signOff.seller.name} - ${proj.signOff.seller.position}` : (proj.signOff.seller.name || proj.signOff.seller.position || ''))}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-medium ${errorClass('signOff.seller.name', validation)}" />
              ${renderErrorMsg('signOff.seller.name', validation)}
            </div>
          </div>

          <div class="p-4 border border-sky-200 rounded-2xl bg-[#F0F9FF] space-y-2">
            <div class="font-bold text-[#0369A1] uppercase">The Buyer (<span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span>)</div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Company Name</label>
              <input type="text" disabled value="${escapeHtml(proj.signOff.purchaser.companyName)}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-slate-100 font-medium text-slate-600" />
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Authorized Signatory Name <span class="text-red-500">*</span></label>
              <input type="text" id="sign-ifm-name" data-validation-key="signOff.purchaser.name" value="${escapeHtml(proj.signOff.purchaser.name)}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-bold ${errorClass('signOff.purchaser.name', validation)}" />
              ${renderErrorMsg('signOff.purchaser.name', validation)}
            </div>
            <div>
              <label class="text-[10px] text-[#5A7184] font-semibold">Position <span class="text-red-500">*</span></label>
              <input type="text" id="sign-ifm-pos" data-validation-key="signOff.purchaser.position" value="${escapeHtml(proj.signOff.purchaser.position)}" class="w-full p-2 border border-[#E0ECF6] rounded-xl bg-white font-bold text-[#0284C7] ${errorClass('signOff.purchaser.position', validation)}" />
              ${renderErrorMsg('signOff.purchaser.position', validation)}
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
  ensureProjectMatrixDefaults(proj);
  const watermark = store.watermark;
  const activeCode = resolvePlantCode(proj.documentInfo?.plantLocation || 'Semarang Plant');
  const activeOrigin = normalizeOriginMode(proj.documentInfo?.vendorOrigin || 'Foreign');
  const tech12 = proj.hygieneAndQuality?.generalTechnicalHygienic12 || TECHNICAL_HYGIENIC_REQUIREMENTS_12;
  const servicesScope = proj.scopeOfSupply?.servicesScope || SERVICES_SCOPE_STANDARD;
  const ancillaries = proj.scopeOfSupply?.ancillariesAndLogistics || ANCILLARIES_LOGISTICS_STANDARD;
  const controlAccess = proj.scopeOfSupply?.controlSystemAccess || CONTROL_SYSTEM_ACCESS_RIGHTS;
  const facChecklist = proj.performanceAcceptance?.finalAcceptanceChecklist || FINAL_ACCEPTANCE_RULES;
  const remediesList = proj.performanceAcceptance?.remediesAndConsequences || REMEDIES_CONSEQUENCES_STANDARD;
  const matrixSchedule = proj.commercialTerms?.matrixEquipmentSchedule || MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN;
  const bgConditions = proj.commercialTerms?.invoicingAndBankGuarantee || INVOICING_AND_BG_CONDITIONS;
  const shipmentItems = proj.commercialTerms?.shipmentItems || SHIPMENT_DELIVERY_ITEMS_5;
  const appendicesList = proj.appendices || APPENDICES_6;

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
                  <th>Target Commissioning</th>
                  <td colspan="3">${proj.generalInfo?.targetCommissioning || proj.projectOverview.keyDates.lineStartUp}</td>
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
            <p class="text-[11px] text-[#5A7184] mb-2">All correspondence pertaining to this project with <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT. Indofood Fortuna Makmur</span> shall be directed through the following individuals:</p>
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
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">V. Site Description &amp; Document Submission Compliance</h2>
            <div class="text-xs text-slate-700 space-y-1.5 bg-[#F4F8FC] p-3 border border-[#D6E6F2] rounded">
              <div class="font-bold text-[#0B2447]">Company Address / Site Location (Plant ${activeCode} &mdash; All Invoices Issued To):</div>
              <div class="font-bold">${escapeHtml(proj.siteDescription.invoiceRecipient)}</div>
              <div>${escapeHtml(proj.siteDescription.address)}</div>
              <div class="pt-1 text-[11px]">
                <strong class="text-[#0284C7]">Attention to Purchasing Department:</strong>
                ${(proj.siteDescription.purchasingAttn || []).map(a => `${escapeHtml(a.name)} (${escapeHtml(a.email)})`).join('; ')}
              </div>
              <div class="pt-1.5 border-t border-[#D6E6F2] text-[11px] leading-relaxed">
                <strong class="text-[#0B2447]">Document Submission &amp; Compliance:</strong>
                ${escapeHtml(proj.siteDescription.documentSubmissionCompliance || DOCUMENT_SUBMISSION_COMPLIANCE)}
              </div>
            </div>
          </div>

          <!-- Section VI & VII: Confidentiality & Language Requirements -->
          <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-1">VI. Confidentiality</h2>
              <p class="text-[11px] text-slate-600 leading-relaxed text-justify">${escapeHtml(proj.projectOverview.confidentialityClause || CONFIDENTIALITY_STANDARD)}</p>
            </div>
            <div>
              <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-1">VII. Language Requirements</h2>
              <p class="text-[11px] text-slate-600 leading-relaxed text-justify">${escapeHtml(proj.projectOverview.languageRequirement || LANGUAGE_REQUIREMENT_STANDARD)}</p>
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
                      <th colspan="3">${escapeHtml(p.shape)}</th>
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
                      <td colspan="2">${escapeHtml(p.description)}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Dimension</td>
                      <td class="font-mono">${escapeHtml(p.dimensionInput)}</td>
                      <td class="font-mono">${escapeHtml(p.dimensionOutput)}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Capacity</td>
                      <td colspan="2" class="font-bold text-[#0B2447]">${escapeHtml(p.capacityOutput)}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Bulk Density</td>
                      <td class="font-mono">${escapeHtml(p.bulkDensityInput)}</td>
                      <td class="font-mono">${escapeHtml(p.bulkDensityOutput)}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Moisture Content</td>
                      <td class="font-mono">${escapeHtml(p.moistureInput)}</td>
                      <td class="font-mono font-bold text-[#0284C7]">${escapeHtml(p.moistureOutput)}</td>
                    </tr>
                    <tr>
                      <td class="font-medium text-slate-600">Oil Content</td>
                      <td class="font-mono">${escapeHtml(p.oilContentInput)}</td>
                      <td class="font-mono font-bold text-[#FF7A00]">${escapeHtml(p.oilContentOutput)}</td>
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
                  <td colspan="2">Feeder rate : ${escapeHtml(proj.processParameters.frying.feederRate)}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td>Frying Temperature: <span class="font-bold text-[#EA580C]">${escapeHtml(proj.processParameters.frying.temperatureRange)}</span></td>
                  <td>Dwell Time : ${escapeHtml(proj.processParameters.frying.dwellTime)}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td colspan="2">Oil capacity in fryer : ${escapeHtml(proj.processParameters.frying.oilCapacityInFryer)}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Frying</td>
                  <td colspan="2">Spinner rotation time : ${escapeHtml(proj.processParameters.frying.spinnerRotationTime)}</td>
                </tr>
                <tr class="table-header-orange">
                  <th colspan="3">Seasoning Specification</th>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Required seasoning</td>
                  <td colspan="2">${escapeHtml(proj.processParameters.seasoning.requiredSeasoning)} (${escapeHtml(proj.processParameters.seasoning.seasoningType)})</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Salt content (base excluded)</td>
                  <td colspan="2">${escapeHtml(proj.processParameters.seasoning.saltContentBaseExcluded)}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Seasoning application rate</td>
                  <td colspan="2">${escapeHtml(proj.processParameters.seasoning.seasoningApplicationRate)}</td>
                </tr>
                <tr>
                  <td class="font-bold text-[#0B2447]">Seasoning capacity</td>
                  <td colspan="2"><span class="font-bold text-[#0284C7]">${escapeHtml(proj.processParameters.seasoning.seasoningCapacity)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section IX: Scope of Supply -->
          <div class="page-break my-6"></div>

          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">IX. Scope of Supply</h2>
            
            <div class="font-bold text-xs text-[#FF7A00] mb-2 uppercase tracking-wide">IX.A1) Equipment Scope &mdash; Fryer System</div>
            <div class="space-y-3 mb-5">
              ${proj.scopeOfSupply.fryer.map(item => `
                <div class="text-xs">
                  <div class="font-bold text-[#0B2447]">${item.itemNumber}. ${escapeHtml(item.qty)} ${escapeHtml(item.title)}</div>
                  <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-0.5 mt-1">
                    ${item.specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="font-bold text-xs text-[#0284C7] mb-2 uppercase tracking-wide">IX.A2) Equipment Scope &mdash; Seasoning System</div>
            <div class="space-y-3 mb-5">
              ${proj.scopeOfSupply.seasoning.map(item => `
                <div class="text-xs">
                  <div class="font-bold text-[#0B2447]">${item.itemNumber}. ${escapeHtml(item.qty)} ${escapeHtml(item.title)}</div>
                  <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-0.5 mt-1">
                    ${item.specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="font-bold text-xs text-[#0B2447] mb-1.5 uppercase tracking-wide">IX.B) Services Scope (Training &amp; System Identification)</div>
            <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-1 mb-4">
              ${servicesScope.map(srv => `<li><strong>${escapeHtml(srv.title)}:</strong> ${escapeHtml(srv.description)}</li>`).join('')}
            </ul>

            <div class="font-bold text-xs text-[#0B2447] mb-1.5 uppercase tracking-wide">IX.C) Ancillaries &amp; Logistics</div>
            <ul class="list-disc pl-6 text-[11px] text-slate-700 space-y-1 mb-4">
              ${ancillaries.map(anc => `<li>${escapeHtml(anc)}</li>`).join('')}
            </ul>

            <div class="font-bold text-xs text-[#0B2447] mb-1.5 uppercase tracking-wide">IX.D) General Technical &amp; Hygienic Requirements (12 Rules)</div>
            <table class="clean-form-table mb-4">
              <thead>
                <tr>
                  <th style="width: 7%;">No</th>
                  <th style="width: 28%;">Standard / Rule</th>
                  <th style="width: 65%;">Mandatory Requirement</th>
                </tr>
              </thead>
              <tbody>
                ${tech12.map(r => `
                  <tr>
                    <td class="text-center font-bold text-[#0284C7]">${r.no}</td>
                    <td class="font-bold text-[#0B2447]">${escapeHtml(r.title)}</td>
                    <td class="text-[11px]">${escapeHtml(r.description)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="font-bold text-xs text-[#0B2447] mb-1.5 uppercase tracking-wide">IX.E) Control System, Software &amp; Access Rights</div>
            <div class="p-3 bg-amber-50/70 border border-amber-200 rounded text-[11px] text-slate-800 space-y-1">
              ${controlAccess.map(r => `<div><strong>${r.no}. ${escapeHtml(r.title)}:</strong> ${escapeHtml(r.description)}</div>`).join('')}
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
                    <td class="font-bold text-[#0B2447]">${escapeHtml(t.step)}</td>
                    <td class="text-[11px]">${escapeHtml(t.observation)}</td>
                    <td class="text-[11px] font-bold text-[#0369A1]">${escapeHtml(t.target)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="p-3 bg-[#F0F9FF] border border-[#BAE6FD] text-xs rounded mt-3">
              <strong class="text-[#0369A1]">Commissioning Mechanism:</strong> ${escapeHtml(proj.performanceAcceptance.commissioningDuration)}
            </div>
          </div>

          <!-- Section XI: Final Acceptance -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XI. Final Acceptance</h2>
            <div class="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 rounded leading-relaxed space-y-1.5">
              ${facChecklist.map(item => `<div><strong>${item.no}. ${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}</div>`).join('')}
            </div>
          </div>

          <!-- Section XII: Remedies & Consequences If Target is Not Reached -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XII. Remedies &amp; Consequences If Target is Not Reached</h2>
            <div class="p-3 bg-red-50 border border-red-200 text-xs text-red-950 rounded leading-relaxed space-y-1.5">
              ${remediesList.map(rem => `<div><strong>${rem.no}. ${escapeHtml(rem.title)}:</strong> ${escapeHtml(rem.description)}</div>`).join('')}
            </div>
          </div>

          <!-- Section XIII: Term of Payment -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XIII. Term of Payment (Selected: ${escapeHtml(proj.commercialTerms.selectedPaymentOption || 'Matrix Standard')})</h2>
            <table class="clean-form-table table-header-orange mb-2">
              <thead>
                <tr>
                  <th style="width: 14%;">Tranche</th>
                  <th style="width: 24%;">Milestone Stage</th>
                  <th style="width: 62%;">Matrix Equipment Supply Payment Trigger (SWIFT APBG &amp; T/T)</th>
                </tr>
              </thead>
              <tbody>
                ${matrixSchedule.map(row => `
                  <tr class="${proj.commercialTerms.selectedPaymentOption === 'Matrix Standard' ? 'bg-[#FFF7ED]' : ''}">
                    <td class="font-mono font-bold text-center text-[#EA580C]">${escapeHtml(row.percent)}</td>
                    <td class="font-bold text-[#0B2447]">${escapeHtml(row.stage)}</td>
                    <td class="text-[11px]">${escapeHtml(row.method)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table class="clean-form-table mb-2">
              <thead>
                <tr>
                  <th style="width: 50%;">Alternative Option 1</th>
                  <th style="width: 50%;">Alternative Option 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-[11px] ${proj.commercialTerms.selectedPaymentOption === 'Option 1' ? 'bg-[#FFF7ED] font-bold text-[#EA580C]' : ''}">
                    85% L/C against Shipping Documents; 10% T/T after machine running (&le; 60d B/L); 5% T/T 3 mos (&le; 150d B/L)
                  </td>
                  <td class="text-[11px] ${proj.commercialTerms.selectedPaymentOption === 'Option 2' ? 'bg-[#FFF7ED] font-bold text-[#EA580C]' : ''}">
                    30% DP via SWIFT/Telex APBG; 55% against invoice &amp; shipping docs; 10% after running (&le; 60d B/L); 5% retention 3 mos (&le; 150d B/L)
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="text-[11px] text-slate-700 bg-[#F4F8FC] p-2.5 border border-[#D6E6F2] rounded space-y-1">
              <div><strong class="text-[#0284C7]">Engineering Services Payment:</strong> ${escapeHtml(proj.commercialTerms.engineeringServicesPayment || MATRIX_ENGINEERING_SERVICES_PAYMENT)}</div>
              <div><strong class="text-[#0B2447]">Invoicing &amp; SWIFT/Telex BG Conditions:</strong> ${bgConditions.map(c => escapeHtml(c)).join(' ')}</div>
            </div>
          </div>

          <!-- Section XIV: Shipment and Delivery -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XIV. Shipment and Delivery</h2>
            <div class="p-3 bg-[#F4F8FC] border border-[#D6E6F2] text-xs text-slate-700 rounded leading-relaxed space-y-1.5">
              <div><strong>Applicable Basis:</strong> ${escapeHtml(proj.commercialTerms.shipmentTerms)}</div>
              ${shipmentItems.map(item => `
                <div class="text-[11px]"><strong>${item.no}. ${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}</div>
              `).join('')}
            </div>
          </div>

          <!-- Section XV: Warranty -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XV. Warranty</h2>
            <div class="p-3 bg-[#F0F9FF] border border-[#BAE6FD] text-xs text-[#0369A1] rounded leading-relaxed font-medium">
              ${escapeHtml(proj.commercialTerms.warranty || WARRANTY_STANDARD)}
            </div>
          </div>

          <!-- Section XVI: Administrative, Tax & Regulatory Provisions -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XVI. Administrative, Tax &amp; Regulatory Provisions</h2>
            <div class="space-y-2 text-xs text-slate-700">
              ${(proj.legalAndTaxProvisions || []).map(p => `
                <div class="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <strong class="text-[#0B2447]">${escapeHtml(p.title)}:</strong> ${escapeHtml(p.description)}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section XVII: Required Documentation -->
          <div class="mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XVII. Required Documentation (${proj.requiredDocumentation.length} Items)</h2>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
              ${proj.requiredDocumentation.map(d => `
                <div class="flex items-start gap-1.5">
                  <span class="text-[#10B981] font-bold">${d.required === false ? '—' : '✓'}</span>
                  <span><strong>${d.id}. ${escapeHtml(d.title)}:</strong> ${escapeHtml(d.desc)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section XVIII: Acknowledged and Approved by -->
          <div class="mt-8 pt-6 border-t-2 border-[#0B2447] mb-6">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-6">XVIII. Acknowledged and Approved by,</h2>
            
            <div class="grid grid-cols-2 gap-8 text-xs">
              <!-- Seller Endorsement -->
              <div class="space-y-3">
                <div class="border-b border-[#D6E6F2] pb-1 font-bold text-[#0B2447] uppercase">ACKNOWLEDGED AND APPROVED BY (THE SELLER):</div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Company Name:</span> <span class="font-bold">${escapeHtml(proj.signOff.seller.companyName)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Quotation No.:</span> <span class="font-mono text-[#0284C7] font-semibold">${escapeHtml(proj.signOff.seller.quotationNo)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Date:</span> <span>${escapeHtml(proj.signOff.seller.date)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Authorized Name:</span> <span class="font-bold">${escapeHtml(proj.signOff.seller.name)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Title / Position:</span> <span>${escapeHtml(proj.signOff.seller.position)}</span></div>
                <div class="pt-8 border-b border-dashed border-[#CBD5E1]"></div>
                <div class="text-center text-[10px] text-[#5A7184] uppercase font-semibold">Signature &amp; Company Stamp</div>
              </div>

              <!-- Purchaser Endorsement (PT Indofood Fortuna Makmur) -->
              <div class="space-y-3">
                <div class="border-b border-[#D6E6F2] pb-1 font-bold text-[#0B2447] uppercase">ACKNOWLEDGED AND APPROVED BY (THE BUYER &mdash; <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT INDOFOOD FORTUNA MAKMUR</span>):</div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Company:</span> <span class="font-bold">${escapeHtml(proj.signOff.purchaser.companyName)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Name:</span> <span class="font-bold text-[#0B2447]">${escapeHtml(proj.signOff.purchaser.name)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Title / Position:</span> <span class="font-bold text-[#0284C7]">${escapeHtml(proj.signOff.purchaser.position)}</span></div>
                <div class="flex justify-between"><span class="text-[#5A7184]">Date:</span> <span>${escapeHtml(proj.signOff.purchaser.date)}</span></div>
                <div class="pt-12 border-b border-dashed border-[#CBD5E1]"></div>
                <div class="text-center text-[10px] text-[#5A7184] uppercase font-semibold">Signature &amp; Company Stamp</div>
              </div>
            </div>
          </div>

          <!-- Section XIX: Attachments / Appendices -->
          <div class="mb-2">
            <h2 class="text-xs font-bold text-[#0B2447] uppercase tracking-wider mb-2">XIX. Attachments / Reference Appendices</h2>
            <table class="clean-form-table">
              <thead>
                <tr>
                  <th style="width: 18%;">Appendix</th>
                  <th style="width: 34%;">Title</th>
                  <th style="width: 36%;">Description</th>
                  <th style="width: 12%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${appendicesList.map(app => `
                  <tr>
                    <td class="font-mono font-bold text-[#0369A1]">${escapeHtml(app.code)}</td>
                    <td class="font-bold text-[#0B2447]">${escapeHtml(app.title)}</td>
                    <td class="text-[11px]">${escapeHtml(app.desc)}</td>
                    <td class="text-center font-bold ${app.included !== false ? 'text-emerald-700' : 'text-slate-400'}">${app.included !== false ? 'Attached' : 'Excluded'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDirectoryView(activeProject) {
  const isAdmin = store.isAdmin();
  const currentTab = store.directoryTab || 'users';
  const query = String(store.directorySearch || '').trim().toLowerCase();
  const users = store.teamMembers || loadUsers();
  const vendors = store.vendors || loadVendors();
  const plantsMap = store.plants || loadPlants();
  const plantList = Object.values(plantsMap);
  const departments = store.departments || loadDepartments();
  const jobTitles = store.jobTitles || loadJobTitles();

  const filteredUsers = users.filter(u => {
    const matchesRole = store.directoryRoleFilter === 'all' || u.role === store.directoryRoleFilter;
    const matchesQuery = !query || [u.name, u.email, u.employeeId, u.jabatan, u.dept, u.departmentName, u.role, u.plantCode]
      .some(v => String(v || '').toLowerCase().includes(query));
    return matchesRole && matchesQuery;
  });

  const selectedUser = filteredUsers.find(u => u.email.toLowerCase() === String(store.selectedDirectoryUserEmail || '').toLowerCase())
    || users.find(u => u.email.toLowerCase() === String(store.selectedDirectoryUserEmail || '').toLowerCase())
    || filteredUsers[0]
    || users[0];

  const editingUserObj = store.editingUserEmail
    ? users.find(u => u.email.toLowerCase() === String(store.editingUserEmail).toLowerCase())
    : null;

  const filteredVendors = vendors.filter(v => {
    const matchesOrigin = store.directoryVendorOriginFilter === 'all' || v.origin === store.directoryVendorOriginFilter;
    const matchesQuery = !query || [v.name, v.vendorCode, v.country, v.equipmentType, v.city, v.picName, v.description]
      .some(f => String(f || '').toLowerCase().includes(query));
    return matchesOrigin && matchesQuery;
  });

  const selectedVendor = filteredVendors.find(v => v.id === store.selectedDirectoryVendorId)
    || vendors.find(v => v.id === store.selectedDirectoryVendorId)
    || filteredVendors[0]
    || vendors[0];

  const editingVendorObj = store.editingVendorId
    ? vendors.find(v => v.id === store.editingVendorId)
    : null;

  const selectedPlant = plantsMap[store.selectedDirectoryPlantCode] || plantList[0];
  const plantDetail = selectedPlant?.addressDetail || {};
  const plantContacts = selectedPlant ? resolveContactsForPlant(selectedPlant.code) : [];

  const editingDeptObj = store.editingDeptCode
    ? departments.find(d => d.code.toUpperCase() === String(store.editingDeptCode).toUpperCase())
    : null;
  const editingJobObj = store.editingJobId
    ? jobTitles.find(j => j.id === store.editingJobId)
    : null;

  const roleBadgeClass = (role) => {
    if (isSuperAdminRole(role)) return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    if (String(role).toLowerCase().includes('purchasing')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (String(role).toLowerCase().includes('pic project')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return 'bg-sky-50 text-sky-800 border-sky-200';
  };

  return `
    <div class="space-y-6 animate-fadeIn">
      <!-- Directory Header & Navigation Tabs -->
      <div class="dropx-card p-6 border-t-4 border-t-[#0284C7]">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]"><span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span> &middot; Master Governance</div>
            <h1 class="text-xl font-extrabold text-[#0F172A] mt-0.5">Enterprise Master Directory</h1>
            <p class="text-xs text-slate-500 mt-1">
              Kelola detail User, Role, Department, Jabatan User, Vendor OEM/Lokal, dan Detail Alamat Lengkap Plant IFM.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${['users', 'vendors', 'plants', 'org'].map(tab => {
              const meta = {
                users: { label: 'Detail User', count: users.length },
                vendors: { label: 'Detail Vendor', count: vendors.length },
                plants: { label: 'Detail Alamat Plant', count: plantList.length },
                org: { label: 'Role, Dept & Jabatan', count: departments.length + jobTitles.length }
              }[tab];
              const active = currentTab === tab;
              return `
                <button
                  type="button"
                  onclick="window.TRSA.setDirectoryTab('${tab}')"
                  class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }"
                >
                  <span>${meta.label}</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${meta.count}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      ${currentTab === 'users' ? `
        <!-- TAB 1: DETAIL USER -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Master User List -->
          <div class="lg:col-span-5 dropx-card p-5 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-extrabold text-[#0F172A]">Direktori User IFM (${filteredUsers.length})</h2>
              ${isAdmin ? `
                <button
                  type="button"
                  onclick="window.TRSA.toggleAddUserForm()"
                  class="btn-capiclean-primary px-3 py-1.5 text-xs cursor-pointer"
                >
                  + Tambah User
                </button>
              ` : ''}
            </div>

            <input
              type="text"
              id="directory-search"
              value="${escapeHtml(store.directorySearch)}"
              placeholder="Cari nama, NIK, email, jabatan, department..."
              class="corp-input"
            />

            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                onclick="window.TRSA.setDirectoryRoleFilter('all')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  store.directoryRoleFilter === 'all'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }"
              >Semua Role (${users.length})</button>
              ${ORG_ROLE_LIST.map(r => {
                const count = users.filter(u => u.role === r).length;
                const active = store.directoryRoleFilter === r;
                const cap = ROLE_CAPABILITIES[r];
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.setDirectoryRoleFilter('${escapeHtml(r)}')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      active
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }"
                  >${escapeHtml(cap?.shortLabel || r)} (${count})</button>
                `;
              }).join('')}
            </div>

            <div class="divide-y divide-slate-100 max-h-[560px] overflow-y-auto pr-1">
              ${filteredUsers.length === 0 ? `
                <div class="py-10 text-center text-xs text-slate-400">Tidak ada user yang cocok dengan filter.</div>
              ` : filteredUsers.map(u => {
                const isSel = selectedUser && selectedUser.email.toLowerCase() === u.email.toLowerCase();
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.selectDirectoryUser('${escapeHtml(u.email)}')"
                    class="w-full text-left py-3 px-3 rounded-xl transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSel ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50 border border-transparent'
                    }"
                  >
                    <div class="flex items-start gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-full bg-[#0284C7]/10 text-[#0369A1] font-extrabold text-xs flex items-center justify-center shrink-0">
                        ${escapeHtml(u.initials)}
                      </div>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHtml(u.name)}</div>
                        <div class="text-[11px] text-slate-600 truncate">${escapeHtml(u.jabatan)} &middot; <span class="font-semibold">${escapeHtml(u.dept)}</span></div>
                        <div class="mt-1 inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${roleBadgeClass(u.role)}">
                          ${escapeHtml(u.role)}
                        </div>
                      </div>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400 shrink-0">${escapeHtml(u.employeeId)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Detail User Inspector or Form -->
          <div class="lg:col-span-7 dropx-card p-6">
            ${(store.showAddUserForm || editingUserObj) ? `
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 class="text-base font-extrabold text-[#0F172A]">${editingUserObj ? 'Edit Detail User' : 'Tambah User Baru'}</h3>
                    <p class="text-xs text-slate-500">Tentukan Role, Department, Jabatan User, dan Plant penugasan.</p>
                  </div>
                  <button type="button" onclick="window.TRSA.cancelUserForm()" class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Employee ID / NIK</label>
                    <input id="dir-user-empid" type="text" class="corp-input font-mono" value="${escapeHtml(editingUserObj?.employeeId || `IFM-USR-${String(users.length + 1).padStart(3, '0')}`)}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Akun</label>
                    <select id="dir-user-status" class="corp-select">
                      <option value="Active" ${(editingUserObj?.status || 'Active') === 'Active' ? 'selected' : ''}>Active</option>
                      <option value="Inactive" ${editingUserObj?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap *</label>
                    <input id="dir-user-name" type="text" class="corp-input" placeholder="e.g. Budi Santoso" value="${escapeHtml(editingUserObj?.name || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Corporate *</label>
                    <input id="dir-user-email" type="email" class="corp-input" placeholder="nama@icbp.indofood.co.id" value="${escapeHtml(editingUserObj?.email || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Role Aplikasi *</label>
                    <select id="dir-user-role" class="corp-select">
                      ${ORG_ROLE_LIST.map(r => `
                        <option value="${escapeHtml(r)}" ${(editingUserObj?.role || ORG_ROLES.PROJECT_ENGINEERING_TEAM) === r ? 'selected' : ''}>${escapeHtml(r)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jabatan User *</label>
                    <select id="dir-user-jabatan" class="corp-select">
                      ${jobTitles.map(j => `
                        <option value="${escapeHtml(j.title)}" ${(editingUserObj?.jabatan || '') === j.title ? 'selected' : ''}>${escapeHtml(j.title)} (${escapeHtml(j.code)})</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department *</label>
                    <select id="dir-user-dept" class="corp-select">
                      ${departments.map(d => `
                        <option value="${escapeHtml(d.code)}" ${(editingUserObj?.dept || 'MFG') === d.code ? 'selected' : ''}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Plant Penugasan</label>
                    <select id="dir-user-plant" class="corp-select">
                      <option value="All Plants" ${(editingUserObj?.plantCode || 'All Plants') === 'All Plants' ? 'selected' : ''}>All Plants (Multi-Site)</option>
                      ${plantList.map(p => `
                        <option value="${escapeHtml(p.code)}" ${editingUserObj?.plantCode === p.code ? 'selected' : ''}>${escapeHtml(p.code)} — ${escapeHtml(p.plantName)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Telepon / Ekstensi</label>
                    <input id="dir-user-phone" type="text" class="corp-input" value="${escapeHtml(editingUserObj?.phone || '+62 21 5795-8822')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password Login</label>
                    <input id="dir-user-password" type="text" class="corp-input font-mono" value="${escapeHtml(editingUserObj?.password || DEFAULT_PASSCODE)}" />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Deskripsi Tugas / Bio</label>
                  <textarea id="dir-user-bio" rows="2" class="corp-textarea">${escapeHtml(editingUserObj?.bio || '')}</textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onclick="window.TRSA.cancelUserForm()" class="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                  <button type="button" onclick="window.TRSA.submitUserForm('${escapeHtml(editingUserObj?.email || '')}')" class="btn-capiclean-primary px-5 py-2 text-xs cursor-pointer">Simpan Detail User</button>
                </div>
              </div>
            ` : selectedUser ? `
              <div class="space-y-5">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div class="flex items-start gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                      ${escapeHtml(selectedUser.initials)}
                    </div>
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-lg font-extrabold text-[#0F172A]">${escapeHtml(selectedUser.name)}</h3>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                          ${escapeHtml(selectedUser.status)}
                        </span>
                      </div>
                      <div class="text-xs font-semibold text-slate-600 mt-0.5">
                        ${escapeHtml(selectedUser.jabatan)} &middot; <span class="text-[#0369A1]">${escapeHtml(selectedUser.dept)} — ${escapeHtml(selectedUser.departmentName)}</span>
                      </div>
                      <div class="mt-2 inline-block px-2.5 py-1 rounded-lg border text-[11px] font-bold ${roleBadgeClass(selectedUser.role)}">
                        ${escapeHtml(selectedUser.role)}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onclick="window.TRSA.switchSessionFromDirectory('${escapeHtml(selectedUser.email)}')"
                      class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                    >Gunakan Sesi</button>
                    ${isAdmin ? `
                      <button
                        type="button"
                        onclick="window.TRSA.editDirectoryUser('${escapeHtml(selectedUser.email)}')"
                        class="btn-capiclean-primary px-3 py-1.5 text-xs cursor-pointer"
                      >Edit User</button>
                      ${store.getCurrentUser()?.email?.toLowerCase() !== selectedUser.email.toLowerCase() ? `
                        <button
                          type="button"
                          onclick="window.TRSA.deleteDirectoryUser('${escapeHtml(selectedUser.email)}')"
                          class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold cursor-pointer"
                        >Hapus</button>
                      ` : ''}
                    ` : ''}
                  </div>
                </div>

                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Employee ID / NIK</dt>
                    <dd class="font-mono font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedUser.employeeId)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Email Corporate</dt>
                    <dd class="font-mono font-semibold text-[#0369A1] mt-0.5 break-all">${escapeHtml(selectedUser.email)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Jabatan User</dt>
                    <dd class="font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedUser.jabatan)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Department &amp; Plant</dt>
                    <dd class="font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedUser.dept)} (${escapeHtml(selectedUser.departmentName)}) &middot; Plant ${escapeHtml(selectedUser.plantCode)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Telepon / Ekstensi</dt>
                    <dd class="font-semibold text-slate-700 mt-0.5">${escapeHtml(selectedUser.phone)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Compliance Matrix Policy</dt>
                    <dd class="mt-0.5 flex items-center justify-between gap-2">
                      <span class="font-semibold text-slate-700">
                        ${(() => {
                          const ms = getUserMatrixSetting(selectedUser, users);
                          return `${ms.allowedPlants.length} Plants &middot; ${ms.assignedClauses.length} Clauses`;
                        })()}
                      </span>
                      ${isAdmin ? `
                        <button type="button" onclick="window.TRSA.selectMatrixUser('${escapeHtml(getUserSettingKey(selectedUser))}'); window.TRSA.setMatrixSubTab('users'); window.TRSA.setView('matrix');" class="text-[11px] font-bold text-[#0284C7] hover:underline cursor-pointer">
                          Atur Matrix &rarr;
                        </button>
                      ` : ''}
                    </dd>
                  </div>
                </dl>

                ${selectedUser.bio ? `
                  <div class="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 leading-relaxed">
                    <div class="text-[10px] font-bold uppercase text-[#0369A1] mb-1">Tanggung Jawab &amp; Ruang Lingkup</div>
                    ${escapeHtml(selectedUser.bio)}
                  </div>
                ` : ''}

                <div class="border-t border-slate-100 pt-4">
                  <div class="text-[11px] font-bold uppercase text-slate-500 mb-2">Hak Akses Role: ${escapeHtml(selectedUser.role)}</div>
                  <div class="flex flex-wrap gap-1.5">
                    ${(ROLE_CAPABILITIES[selectedUser.role]?.permissions || []).map(perm => `
                      <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">${escapeHtml(perm)}</span>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : currentTab === 'vendors' ? `
        <!-- TAB 2: DETAIL VENDOR -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-5 dropx-card p-5 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-extrabold text-[#0F172A]">Direktori Vendor OEM &amp; Lokal (${filteredVendors.length})</h2>
              <button type="button" onclick="window.TRSA.toggleAddVendorForm()" class="btn-capiclean-primary px-3 py-1.5 text-xs cursor-pointer">+ Tambah Vendor</button>
            </div>

            <input
              type="text"
              id="directory-search"
              value="${escapeHtml(store.directorySearch)}"
              placeholder="Cari nama vendor, kode, negara, mesin, PIC..."
              class="corp-input"
            />

            <div class="flex flex-wrap gap-1.5">
              ${['all', 'Foreign', 'Local'].map(orig => `
                <button
                  type="button"
                  onclick="window.TRSA.setDirectoryVendorOriginFilter('${orig}')"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    store.directoryVendorOriginFilter === orig
                      ? 'bg-[#0284C7] text-white border-[#0284C7]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }"
                >${orig === 'all' ? `Semua (${vendors.length})` : `${orig} (${vendors.filter(v => v.origin === orig).length})`}</button>
              `).join('')}
            </div>

            <div class="divide-y divide-slate-100 max-h-[560px] overflow-y-auto pr-1">
              ${filteredVendors.map(v => {
                const isSel = selectedVendor && selectedVendor.id === v.id;
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.selectDirectoryVendor('${escapeHtml(v.id)}')"
                    class="w-full text-left py-3 px-3 rounded-xl transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                      isSel ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50 border border-transparent'
                    }"
                  >
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHtml(v.name)}</div>
                      <div class="text-[11px] text-slate-500 truncate">${escapeHtml(v.equipmentType)} &middot; ${escapeHtml(v.country)}</div>
                      <div class="mt-1 flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${v.origin === 'Foreign' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">${escapeHtml(v.origin)}</span>
                        <span class="text-[10px] font-mono text-slate-400">${escapeHtml(v.vendorCode || v.id)}</span>
                      </div>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="lg:col-span-7 dropx-card p-6">
            ${(store.showAddVendorForm || editingVendorObj) ? `
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 class="text-base font-extrabold text-[#0F172A]">${editingVendorObj ? 'Edit Detail Vendor' : 'Tambah Vendor Baru'}</h3>
                    <p class="text-xs text-slate-500">Lengkapi alamat manufaktur, PIC vendor, NPWP/Tax ID, dan lead time.</p>
                  </div>
                  <button type="button" onclick="window.TRSA.cancelVendorForm()" class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kode Vendor</label>
                    <input id="dir-vnd-code" type="text" class="corp-input font-mono" value="${escapeHtml(editingVendorObj?.vendorCode || `VND-${String(vendors.length + 1).padStart(3, '0')}`)}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Vendor / OEM *</label>
                    <input id="dir-vnd-name" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.name || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Origin</label>
                    <select id="dir-vnd-origin" class="corp-select">
                      <option value="Foreign" ${(editingVendorObj?.origin || 'Foreign') === 'Foreign' ? 'selected' : ''}>Foreign (Import)</option>
                      <option value="Local" ${editingVendorObj?.origin === 'Local' ? 'selected' : ''}>Local (Domestic Indonesia)</option>
                      <option value="Mixed" ${editingVendorObj?.origin === 'Mixed' ? 'selected' : ''}>Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Negara Asal</label>
                    <input id="dir-vnd-country" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.country || 'Indonesia')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Equipment</label>
                    <input id="dir-vnd-equip" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.equipmentType || 'Process Line')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Kualifikasi</label>
                    <input id="dir-vnd-status" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.status || 'Approved OEM')}" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Alamat Lengkap Pabrik / HQ</label>
                    <input id="dir-vnd-address" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.address || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kota &amp; Provinsi/State</label>
                    <input id="dir-vnd-city" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.city || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kode Pos</label>
                    <input id="dir-vnd-postal" type="text" class="corp-input font-mono" value="${escapeHtml(editingVendorObj?.postalCode || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama PIC Vendor</label>
                    <input id="dir-vnd-pic-name" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.picName || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jabatan PIC Vendor</label>
                    <input id="dir-vnd-pic-role" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.picRole || 'Account Manager')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email PIC Vendor</label>
                    <input id="dir-vnd-pic-email" type="email" class="corp-input" value="${escapeHtml(editingVendorObj?.picEmail || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Telepon PIC Vendor</label>
                    <input id="dir-vnd-pic-phone" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.picPhone || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tax ID / NPWP</label>
                    <input id="dir-vnd-tax" type="text" class="corp-input font-mono" value="${escapeHtml(editingVendorObj?.taxId || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mata Uang &amp; Lead Time</label>
                    <div class="grid grid-cols-2 gap-2">
                      <input id="dir-vnd-currency" type="text" class="corp-input" placeholder="USD / IDR" value="${escapeHtml(editingVendorObj?.paymentCurrency || '')}" />
                      <input id="dir-vnd-leadtime" type="text" class="corp-input" placeholder="16-24 weeks" value="${escapeHtml(editingVendorObj?.leadTimeWeeks || '')}" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Website</label>
                    <input id="dir-vnd-website" type="text" class="corp-input" value="${escapeHtml(editingVendorObj?.website || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sertifikasi (pisahkan koma)</label>
                    <input id="dir-vnd-certs" type="text" class="corp-input" value="${escapeHtml((editingVendorObj?.certifications || ['ISO 9001']).join(', '))}" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Deskripsi Kemampuan &amp; Cakupan</label>
                    <textarea id="dir-vnd-desc" rows="2" class="corp-textarea">${escapeHtml(editingVendorObj?.description || '')}</textarea>
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onclick="window.TRSA.cancelVendorForm()" class="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                  <button type="button" onclick="window.TRSA.submitVendorForm('${escapeHtml(editingVendorObj?.id || '')}')" class="btn-capiclean-primary px-5 py-2 text-xs cursor-pointer">Simpan Detail Vendor</button>
                </div>
              </div>
            ` : selectedVendor ? `
              <div class="space-y-5">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">${escapeHtml(selectedVendor.vendorCode || selectedVendor.id)}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${selectedVendor.origin === 'Foreign' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">${escapeHtml(selectedVendor.origin)} &middot; ${escapeHtml(selectedVendor.country)}</span>
                      <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">${escapeHtml(selectedVendor.status || 'Approved OEM')}</span>
                    </div>
                    <h3 class="text-lg font-extrabold text-[#0F172A] mt-1.5">${escapeHtml(selectedVendor.name)}</h3>
                    <p class="text-xs text-slate-600 mt-0.5">${escapeHtml(selectedVendor.equipmentType)} &mdash; ${escapeHtml(selectedVendor.description)}</p>
                  </div>
                  <div class="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onclick="window.TRSA.applyVendorToProject('${escapeHtml(selectedVendor.id)}')"
                      class="btn-capiclean-accent px-3 py-1.5 text-xs cursor-pointer"
                    >Terapkan ke TRSA Aktif</button>
                    <button
                      type="button"
                      onclick="window.TRSA.editDirectoryVendor('${escapeHtml(selectedVendor.id)}')"
                      class="btn-capiclean-primary px-3 py-1.5 text-xs cursor-pointer"
                    >Edit Vendor</button>
                    ${isAdmin ? `
                      <button
                        type="button"
                        onclick="window.TRSA.deleteDirectoryVendor('${escapeHtml(selectedVendor.id)}')"
                        class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold cursor-pointer"
                      >Hapus</button>
                    ` : ''}
                  </div>
                </div>

                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div class="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Alamat Lengkap Kantor Pusat / Pabrik</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(selectedVendor.address || '—')}, ${escapeHtml(selectedVendor.city || '')} ${escapeHtml(selectedVendor.postalCode || '')}, ${escapeHtml(selectedVendor.country)}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">PIC Vendor (Account / Project Lead)</dt>
                    <dd class="font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedVendor.picName || '—')}</dd>
                    <dd class="text-[11px] text-slate-500">${escapeHtml(selectedVendor.picRole || '')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Kontak PIC Vendor</dt>
                    <dd class="font-mono text-[#0369A1] font-semibold mt-0.5 break-all">${escapeHtml(selectedVendor.picEmail || '—')}</dd>
                    <dd class="text-[11px] text-slate-600">${escapeHtml(selectedVendor.picPhone || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Tax ID / NPWP</dt>
                    <dd class="font-mono font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedVendor.taxId || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Currency &amp; Standard Lead Time</dt>
                    <dd class="font-bold text-[#0F172A] mt-0.5">${escapeHtml(selectedVendor.paymentCurrency || '—')} &middot; ${escapeHtml(selectedVendor.leadTimeWeeks || '—')}</dd>
                  </div>
                </dl>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div class="flex flex-wrap gap-1.5">
                    ${(selectedVendor.certifications || []).map(c => `
                      <span class="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0369A1] text-[11px] font-bold">${escapeHtml(c)}</span>
                    `).join('')}
                  </div>
                  ${selectedVendor.website ? `
                    <span class="font-mono text-[11px] text-slate-500">${escapeHtml(selectedVendor.website)}</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : currentTab === 'plants' ? `
        <!-- TAB 3: DETAIL ADDRESS MASING-MASING PLANT -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-4 dropx-card p-5 space-y-3">
            <h2 class="text-sm font-extrabold text-[#0F172A]">Daftar Plant <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span></h2>
            <p class="text-[11px] text-slate-500">Pilih lokasi Plant untuk melihat rincian alamat pengiriman, gate logistik, entitas pajak, dan PIC resmi.</p>
            <div class="space-y-2 pt-1">
              ${plantList.map(pl => {
                const isSel = selectedPlant && selectedPlant.code === pl.code;
                const d = pl.addressDetail || {};
                const picCount = resolveContactsForPlant(pl.code).length;
                return `
                  <button
                    type="button"
                    onclick="window.TRSA.selectDirectoryPlant('${escapeHtml(pl.code)}')"
                    class="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-sky-50 border-[#0284C7] shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="px-2 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[11px] font-bold">${escapeHtml(pl.code)}</span>
                      <span class="text-[10px] font-semibold text-slate-500 tabular-nums">${picCount} PIC</span>
                    </div>
                    <div class="text-sm font-extrabold text-[#0F172A] mt-1.5">${escapeHtml(pl.plantName)}</div>
                    <div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(d.city || pl.shortLocation)}, ${escapeHtml(d.province || '')}</div>
                    <div class="text-[10px] text-slate-400 mt-1 truncate">${escapeHtml(d.street || pl.address)}</div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="lg:col-span-8 dropx-card p-6">
            ${store.editingPlantCode === selectedPlant?.code ? `
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 class="text-base font-extrabold text-[#0F172A]">Edit Detail Alamat &amp; Fasilitas &mdash; Plant ${escapeHtml(selectedPlant.code)} (${escapeHtml(selectedPlant.plantName)})</h3>
                    <p class="text-xs text-slate-500">Perubahan akan otomatis menyinkronkan alamat dokumen TRSA Plant ${escapeHtml(selectedPlant.code)}.</p>
                  </div>
                  <button type="button" onclick="window.TRSA.cancelPlantEditForm()" class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jalan / Nomor Gedung</label>
                    <input id="dir-plant-street" type="text" class="corp-input" value="${escapeHtml(plantDetail.street || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kawasan Industri / Area</label>
                    <input id="dir-plant-zone" type="text" class="corp-input" value="${escapeHtml(plantDetail.industrialZone || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kelurahan / Desa</label>
                    <input id="dir-plant-kel" type="text" class="corp-input" value="${escapeHtml(plantDetail.kelurahan || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kecamatan</label>
                    <input id="dir-plant-kec" type="text" class="corp-input" value="${escapeHtml(plantDetail.kecamatan || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kota / Kabupaten</label>
                    <input id="dir-plant-city" type="text" class="corp-input" value="${escapeHtml(plantDetail.city || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Provinsi</label>
                    <input id="dir-plant-prov" type="text" class="corp-input" value="${escapeHtml(plantDetail.province || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kode Pos</label>
                    <input id="dir-plant-postal" type="text" class="corp-input font-mono" value="${escapeHtml(plantDetail.postalCode || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Telepon Plant</label>
                    <input id="dir-plant-phone" type="text" class="corp-input" value="${escapeHtml(plantDetail.phone || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fax / Koordinat</label>
                    <div class="grid grid-cols-2 gap-2">
                      <input id="dir-plant-fax" type="text" class="corp-input" placeholder="Fax" value="${escapeHtml(plantDetail.fax || '')}" />
                      <input id="dir-plant-coords" type="text" class="corp-input font-mono" placeholder="Lat, Lng" value="${escapeHtml(plantDetail.coordinates || '')}" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Receiving Gate / Dock</label>
                    <input id="dir-plant-gate" type="text" class="corp-input" value="${escapeHtml(plantDetail.receivingGate || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jam Penerimaan Barang</label>
                    <input id="dir-plant-hours" type="text" class="corp-input" value="${escapeHtml(plantDetail.receivingHours || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Port Pengiriman (Delivery Port)</label>
                    <input id="dir-plant-port" type="text" class="corp-input" value="${escapeHtml(selectedPlant.deliveryPort || '')}" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Invoice Recipient</label>
                    <input id="dir-plant-invoice" type="text" class="corp-input" value="${escapeHtml(selectedPlant.invoiceRecipient || '')}" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Entitas Pajak (NPWP / KLU)</label>
                    <input id="dir-plant-tax" type="text" class="corp-input" value="${escapeHtml(plantDetail.taxEntityNote || '')}" />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onclick="window.TRSA.cancelPlantEditForm()" class="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                  <button type="button" onclick="window.TRSA.submitPlantDetailForm('${escapeHtml(selectedPlant.code)}')" class="btn-capiclean-primary px-5 py-2 text-xs cursor-pointer">Simpan Detail Alamat Plant</button>
                </div>
              </div>
            ` : selectedPlant ? `
              <div class="space-y-5">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="px-2.5 py-0.5 rounded bg-[#0F172A] text-white font-mono text-xs font-bold">PLANT ${escapeHtml(selectedPlant.code)}</span>
                      <span class="text-xs font-bold text-[#0284C7]">${escapeHtml(selectedPlant.legalEntity)}</span>
                    </div>
                    <h3 class="text-lg font-extrabold text-[#0F172A] mt-1">${escapeHtml(selectedPlant.plantName)} &mdash; ${escapeHtml(plantDetail.city || selectedPlant.shortLocation)}</h3>
                    <p class="text-xs text-slate-600 mt-1">${escapeHtml(selectedPlant.address)}</p>
                  </div>
                  <div class="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onclick="window.TRSA.applyPlantToProject('${escapeHtml(selectedPlant.code)}')"
                      class="btn-capiclean-accent px-3 py-1.5 text-xs cursor-pointer"
                    >Terapkan ke TRSA Aktif</button>
                    ${isAdmin ? `
                      <button
                        type="button"
                        onclick="window.TRSA.editPlantDetail('${escapeHtml(selectedPlant.code)}')"
                        class="btn-capiclean-primary px-3 py-1.5 text-xs cursor-pointer"
                      >Edit Alamat Detail</button>
                    ` : ''}
                  </div>
                </div>

                <!-- Structured Address Breakdown -->
                <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div class="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
                    <dt class="text-[10px] font-bold uppercase text-[#0369A1]">Alamat Jalan &amp; Kawasan Industri</dt>
                    <dd class="font-bold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.street || '—')}</dd>
                    <dd class="text-slate-600 mt-0.5">${escapeHtml(plantDetail.industrialZone || '')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Kelurahan / Kecamatan</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.kelurahan || '—')} / ${escapeHtml(plantDetail.kecamatan || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Kota &amp; Provinsi</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.city || '—')}, ${escapeHtml(plantDetail.province || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Kode Pos &amp; Negara</dt>
                    <dd class="font-mono font-bold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.postalCode || '—')} &middot; ${escapeHtml(plantDetail.country || 'Indonesia')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Telepon &amp; Fax</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.phone || '—')}</dd>
                    <dd class="text-[11px] text-slate-500">Fax: ${escapeHtml(plantDetail.fax || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Receiving Gate &amp; Jam</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.receivingGate || '—')}</dd>
                    <dd class="text-[11px] text-slate-500">${escapeHtml(plantDetail.receivingHours || '—')}</dd>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Delivery Port &amp; GPS</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(selectedPlant.deliveryPort || '—')}</dd>
                    <dd class="font-mono text-[11px] text-slate-500">${escapeHtml(plantDetail.coordinates || '—')}</dd>
                  </div>
                  <div class="sm:col-span-2 lg:col-span-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <dt class="text-[10px] font-bold uppercase text-slate-400">Entitas Pajak &amp; Penerima Invoice (Buyer Tax Entity)</dt>
                    <dd class="font-semibold text-[#0F172A] mt-0.5">${escapeHtml(plantDetail.taxEntityNote || '—')}</dd>
                    <dd class="text-[11px] text-[#0369A1] mt-0.5 font-medium">Invoice Recipient: ${escapeHtml(selectedPlant.invoiceRecipient || '—')}</dd>
                  </div>
                </dl>

                <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                  <div class="text-[10px] font-bold uppercase text-amber-700 mb-1">Clause XVI.d Customs Clearance (Matrix Standard)</div>
                  <p class="leading-relaxed">${escapeHtml(selectedPlant.clearanceClause || '')}</p>
                </div>

                <div>
                  <div class="text-[11px] font-bold uppercase text-slate-500 mb-2">PIC &amp; Stakeholder Resmi Plant ${escapeHtml(selectedPlant.code)} (${plantContacts.length})</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${plantContacts.map(c => `
                      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="font-bold text-[#0F172A] truncate">${escapeHtml(c.name)}</div>
                          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(c.role)}</div>
                          <div class="text-[10px] font-mono text-[#0369A1] truncate">${escapeHtml(c.email)}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : `
        <!-- TAB 4: ROLES, DEPARTMENT & JABATAN USER -->
        <div class="space-y-6">
          <!-- 4 Standardized Roles Matrix -->
          <div class="dropx-card p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 class="text-sm font-extrabold text-[#0F172A]">Matriks 4 Role Organisasi IFM</h2>
                <p class="text-xs text-slate-500">Standar peran pengguna pada sistem Create-TRSA <span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span>.</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${ORG_ROLE_LIST.map(roleName => {
                const cap = ROLE_CAPABILITIES[roleName];
                const memberCount = users.filter(u => u.role === roleName).length;
                return `
                  <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <span class="inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${roleBadgeClass(roleName)}">${escapeHtml(roleName)}</span>
                        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(cap?.description || '')}</p>
                      </div>
                      <button
                        type="button"
                        onclick="window.TRSA.setDirectoryRoleFilter('${escapeHtml(roleName)}'); window.TRSA.setDirectoryTab('users');"
                        class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-[#0284C7] hover:bg-sky-50 shrink-0 cursor-pointer tabular-nums"
                      >${memberCount} User</button>
                    </div>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      ${(cap?.permissions || []).map(p => `
                        <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">${escapeHtml(p)}</span>
                      `).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Departments Master -->
          <div class="dropx-card p-6 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-extrabold text-[#0F172A]">Master Department (${departments.length})</h2>
                <p class="text-xs text-slate-500">Struktur departemen &amp; cost center untuk penugasan user dan nomor dokumen TRSA.</p>
              </div>
              ${isAdmin ? `
                <button type="button" onclick="window.TRSA.toggleAddDeptForm()" class="btn-capiclean-primary px-3.5 py-1.5 text-xs cursor-pointer">+ Tambah Department</button>
              ` : ''}
            </div>

            ${(store.showAddDeptForm || editingDeptObj) ? `
              <div class="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                <div class="text-xs font-extrabold text-[#0369A1]">${editingDeptObj ? `Edit Department: ${escapeHtml(editingDeptObj.code)}` : 'Tambah Department Baru'}</div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Kode Dept *</label>
                    <input id="dir-dept-code" type="text" class="corp-input font-mono uppercase" placeholder="MFG" value="${escapeHtml(editingDeptObj?.code || '')}" ${editingDeptObj ? 'readonly' : ''} />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nama Department *</label>
                    <input id="dir-dept-name" type="text" class="corp-input" value="${escapeHtml(editingDeptObj?.name || '')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Divisi</label>
                    <input id="dir-dept-division" type="text" class="corp-input" value="${escapeHtml(editingDeptObj?.division || 'PT Indofood Fortuna Makmur')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Jabatan Kepala Dept</label>
                    <input id="dir-dept-head" type="text" class="corp-input" value="${escapeHtml(editingDeptObj?.headTitle || '')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Cost Center</label>
                    <input id="dir-dept-cc" type="text" class="corp-input font-mono" value="${escapeHtml(editingDeptObj?.costCenter || '')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Deskripsi</label>
                    <input id="dir-dept-desc" type="text" class="corp-input" value="${escapeHtml(editingDeptObj?.description || '')}" />
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <button type="button" onclick="window.TRSA.cancelDeptForm()" class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer">Batal</button>
                  <button type="button" onclick="window.TRSA.submitDeptForm()" class="btn-capiclean-primary px-4 py-1.5 text-xs cursor-pointer">Simpan Department</button>
                </div>
              </div>
            ` : ''}

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <th class="py-2.5 pr-3 font-bold">Kode</th>
                    <th class="py-2.5 pr-3 font-bold">Nama Department</th>
                    <th class="py-2.5 pr-3 font-bold">Kepala &amp; Divisi</th>
                    <th class="py-2.5 pr-3 font-bold">Cost Center</th>
                    <th class="py-2.5 pr-3 font-bold text-right">User</th>
                    ${isAdmin ? `<th class="py-2.5 font-bold text-right">Aksi</th>` : ''}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${departments.map(d => {
                    const cnt = users.filter(u => String(u.dept).toUpperCase() === String(d.code).toUpperCase()).length;
                    return `
                      <tr class="hover:bg-slate-50/70">
                        <td class="py-3 pr-3 font-mono font-extrabold text-[#0369A1]">${escapeHtml(d.code)}</td>
                        <td class="py-3 pr-3">
                          <div class="font-bold text-[#0F172A]">${escapeHtml(d.name)}</div>
                          <div class="text-[11px] text-slate-500">${escapeHtml(d.description || '')}</div>
                        </td>
                        <td class="py-3 pr-3">
                          <div class="font-semibold text-slate-700">${escapeHtml(d.headTitle)}</div>
                          <div class="text-[11px] text-slate-400">${escapeHtml(d.division)}</div>
                        </td>
                        <td class="py-3 pr-3 font-mono text-slate-600">${escapeHtml(d.costCenter)}</td>
                        <td class="py-3 pr-3 text-right font-bold tabular-nums text-[#0F172A]">${cnt}</td>
                        ${isAdmin ? `
                          <td class="py-3 text-right space-x-1 whitespace-nowrap">
                            <button type="button" onclick="window.TRSA.editDeptRecord('${escapeHtml(d.code)}')" class="px-2 py-1 text-[11px] font-bold text-[#0284C7] hover:bg-sky-50 rounded-lg cursor-pointer">Edit</button>
                            <button type="button" onclick="window.TRSA.deleteDeptRecord('${escapeHtml(d.code)}')" class="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">Hapus</button>
                          </td>
                        ` : ''}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Jabatan User Master -->
          <div class="dropx-card p-6 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-extrabold text-[#0F172A]">Master Jabatan User (${jobTitles.length})</h2>
                <p class="text-xs text-slate-500">Daftar jabatan struktural/fungsional beserta mapping default Department dan Role.</p>
              </div>
              ${isAdmin ? `
                <button type="button" onclick="window.TRSA.toggleAddJobForm()" class="btn-capiclean-primary px-3.5 py-1.5 text-xs cursor-pointer">+ Tambah Jabatan</button>
              ` : ''}
            </div>

            ${(store.showAddJobForm || editingJobObj) ? `
              <div class="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                <div class="text-xs font-extrabold text-[#0369A1]">${editingJobObj ? `Edit Jabatan: ${escapeHtml(editingJobObj.title)}` : 'Tambah Jabatan User Baru'}</div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Kode Jabatan</label>
                    <input id="dir-job-code" type="text" class="corp-input font-mono uppercase" placeholder="SPE" value="${escapeHtml(editingJobObj?.code || '')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nama Jabatan *</label>
                    <input id="dir-job-title" type="text" class="corp-input" value="${escapeHtml(editingJobObj?.title || '')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Level / Grade</label>
                    <input id="dir-job-level" type="text" class="corp-input" placeholder="Manager / Supervisor / PIC" value="${escapeHtml(editingJobObj?.level || 'Specialist')}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Default Department</label>
                    <select id="dir-job-dept" class="corp-select">
                      ${departments.map(d => `
                        <option value="${escapeHtml(d.code)}" ${(editingJobObj?.defaultDept || 'MFG') === d.code ? 'selected' : ''}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Default Role</label>
                    <select id="dir-job-role" class="corp-select">
                      ${ORG_ROLE_LIST.map(r => `
                        <option value="${escapeHtml(r)}" ${(editingJobObj?.defaultRole || ORG_ROLES.PROJECT_ENGINEERING_TEAM) === r ? 'selected' : ''}>${escapeHtml(r)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Deskripsi</label>
                    <input id="dir-job-desc" type="text" class="corp-input" value="${escapeHtml(editingJobObj?.description || '')}" />
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <button type="button" onclick="window.TRSA.cancelJobForm()" class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer">Batal</button>
                  <button type="button" onclick="window.TRSA.submitJobForm('${escapeHtml(editingJobObj?.id || '')}')" class="btn-capiclean-primary px-4 py-1.5 text-xs cursor-pointer">Simpan Jabatan</button>
                </div>
              </div>
            ` : ''}

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <th class="py-2.5 pr-3 font-bold">Kode</th>
                    <th class="py-2.5 pr-3 font-bold">Nama Jabatan</th>
                    <th class="py-2.5 pr-3 font-bold">Level</th>
                    <th class="py-2.5 pr-3 font-bold">Default Dept &amp; Role</th>
                    <th class="py-2.5 pr-3 font-bold text-right">User</th>
                    ${isAdmin ? `<th class="py-2.5 font-bold text-right">Aksi</th>` : ''}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${jobTitles.map(j => {
                    const cnt = users.filter(u => String(u.jabatan).toLowerCase() === String(j.title).toLowerCase()).length;
                    return `
                      <tr class="hover:bg-slate-50/70">
                        <td class="py-3 pr-3 font-mono font-extrabold text-[#0369A1]">${escapeHtml(j.code)}</td>
                        <td class="py-3 pr-3">
                          <div class="font-bold text-[#0F172A]">${escapeHtml(j.title)}</div>
                          <div class="text-[11px] text-slate-500">${escapeHtml(j.description || '')}</div>
                        </td>
                        <td class="py-3 pr-3 font-semibold text-slate-700">${escapeHtml(j.level)}</td>
                        <td class="py-3 pr-3">
                          <span class="font-mono font-bold text-slate-700">${escapeHtml(j.defaultDept)}</span>
                          <span class="text-slate-400 mx-1">&middot;</span>
                          <span class="text-[11px] text-[#0369A1] font-semibold">${escapeHtml(j.defaultRole)}</span>
                        </td>
                        <td class="py-3 pr-3 text-right font-bold tabular-nums text-[#0F172A]">${cnt}</td>
                        ${isAdmin ? `
                          <td class="py-3 text-right space-x-1 whitespace-nowrap">
                            <button type="button" onclick="window.TRSA.editJobRecord('${escapeHtml(j.id)}')" class="px-2 py-1 text-[11px] font-bold text-[#0284C7] hover:bg-sky-50 rounded-lg cursor-pointer">Edit</button>
                            <button type="button" onclick="window.TRSA.deleteJobRecord('${escapeHtml(j.id)}')" class="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">Hapus</button>
                          </td>
                        ` : ''}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

function renderActivityLogView(activeProject) {
  const allLogs = getAuditLogs();
  const scopedLogs = store.auditProjectFilter === 'current' && activeProject
    ? allLogs.filter(l => l.projectId === activeProject.id)
    : allLogs;
  const stats = computeActivityStats(scopedLogs);
  const distinctActions = getDistinctAuditActions(allLogs);

  const filteredLogs = filterAuditLogs(allLogs, {
    projectId: store.auditProjectFilter === 'current' && activeProject ? activeProject.id : null,
    domain: store.auditDomainFilter || ACTIVITY_DOMAINS.ALL,
    action: store.auditActionFilter || 'all',
    severity: store.auditSeverityFilter || 'all',
    searchQuery: store.auditSearchQuery || '',
    dateFrom: store.auditDateFrom || '',
    dateTo: store.auditDateTo || ''
  });

  const severityLabelMap = {
    info: { label: 'Info', cls: 'text-slate-600' },
    success: { label: 'Confirmed', cls: 'text-emerald-700' },
    warning: { label: 'Sensitive', cls: 'text-amber-700' },
    security: { label: 'Security Policy', cls: 'text-rose-700' }
  };

  return `
    <div class="space-y-6 animate-fadeIn">
      <!-- Header -->
      <div class="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-semibold text-[#0284C7]"><span class="ifm-company-brand" style="color: rgb(0, 168, 232); font-weight: 700;">PT Indofood Fortuna Makmur</span> &middot; Governance &amp; Traceability</div>
          <h1 class="text-xl font-extrabold text-[#0F172A] mt-0.5">Activity &amp; Compliance Audit Log</h1>
          <p class="text-xs text-slate-500 mt-1">
            Pemantauan kronologis untuk aktivitas pengguna, perubahan spesifikasi TRSA, dan pembaruan Compliance Matrix.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onclick="window.TRSA.downloadAuditJSON()" class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold whitespace-nowrap cursor-pointer">
            Export JSON
          </button>
          <button type="button" onclick="window.TRSA.downloadAuditCSV()" class="btn-capiclean-primary px-4 py-2 text-xs font-bold whitespace-nowrap cursor-pointer">
            Download CSV
          </button>
        </div>
      </div>

      <!-- KPI Summary Strip -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-xs text-slate-500 font-medium">Total Logged Events</div>
          <div class="text-2xl font-extrabold text-[#0F172A] mt-1 font-mono tabular-nums">${stats.total}</div>
          <div class="text-[11px] text-slate-400 mt-1 tabular-nums">${stats.last24hCount} in last 24h</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-xs text-slate-500 font-medium">User Actions</div>
          <div class="text-2xl font-extrabold text-[#0284C7] mt-1 font-mono tabular-nums">${stats.byDomain.user_action}</div>
          <div class="text-[11px] text-slate-400 mt-1">Auth, Directory, Exports</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-xs text-slate-500 font-medium">Project Changes</div>
          <div class="text-2xl font-extrabold text-[#0F172A] mt-1 font-mono tabular-nums">${stats.byDomain.project_change}</div>
          <div class="text-[11px] text-slate-400 mt-1">Specs, Status, Revisions</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="text-xs text-slate-500 font-medium">Compliance Matrix</div>
          <div class="text-2xl font-extrabold text-emerald-700 mt-1 font-mono tabular-nums">${stats.byDomain.compliance_matrix}</div>
          <div class="text-[11px] text-slate-400 mt-1">Policies, Access, Sync</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <div class="text-xs text-slate-500 font-medium">Active Actors</div>
          <div class="text-2xl font-extrabold text-[#0F172A] mt-1 font-mono tabular-nums">${stats.uniqueActors}</div>
          <div class="text-[11px] text-slate-400 mt-1 truncate">${stats.topActors[0] ? `Top: ${escapeHtml(stats.topActors[0].name)}` : 'No actors yet'}</div>
        </div>
      </div>

      <!-- Segmented Domain Filter + Controls -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div class="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
            ${[
              { key: ACTIVITY_DOMAINS.ALL, label: 'All Activity', count: stats.total },
              { key: ACTIVITY_DOMAINS.USER_ACTION, label: 'User Actions', count: stats.byDomain.user_action },
              { key: ACTIVITY_DOMAINS.PROJECT_CHANGE, label: 'Project Changes', count: stats.byDomain.project_change },
              { key: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX, label: 'Compliance Matrix', count: stats.byDomain.compliance_matrix }
            ].map(tab => {
              const isAct = (store.auditDomainFilter || ACTIVITY_DOMAINS.ALL) === tab.key;
              return `
                <button
                  type="button"
                  onclick="window.TRSA.setAuditDomainFilter('${tab.key}')"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                    isAct ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }"
                >${tab.label} (${tab.count})</button>
              `;
            }).join('')}
          </div>

          <div class="text-xs text-slate-500 font-mono tabular-nums">
            Showing ${filteredLogs.length} of ${allLogs.length} records
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div class="lg:col-span-2 relative">
            <input
              type="text"
              id="activity-search-input"
              value="${escapeHtml(store.auditSearchQuery || '')}"
              placeholder="Search actor, doc #, clause, or diff value..."
              class="corp-input pl-8"
            />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <select onchange="window.TRSA.setAuditProjectFilter(this.value)" class="corp-select">
            <option value="all" ${store.auditProjectFilter === 'all' ? 'selected' : ''}>All Agreements</option>
            <option value="current" ${store.auditProjectFilter === 'current' ? 'selected' : ''}>Active (${escapeHtml(activeProject?.documentInfo?.docNumber || 'Current')})</option>
          </select>

          <select onchange="window.TRSA.setAuditActionFilter(this.value)" class="corp-select">
            <option value="all" ${store.auditActionFilter === 'all' ? 'selected' : ''}>All Actions (${distinctActions.length})</option>
            ${distinctActions.map(act => `
              <option value="${escapeHtml(act)}" ${store.auditActionFilter === act ? 'selected' : ''}>${escapeHtml(act)}</option>
            `).join('')}
          </select>

          <select onchange="window.TRSA.setAuditSeverityFilter(this.value)" class="corp-select">
            <option value="all" ${store.auditSeverityFilter === 'all' ? 'selected' : ''}>All Severities</option>
            <option value="info" ${store.auditSeverityFilter === 'info' ? 'selected' : ''}>Info</option>
            <option value="success" ${store.auditSeverityFilter === 'success' ? 'selected' : ''}>Confirmed</option>
            <option value="warning" ${store.auditSeverityFilter === 'warning' ? 'selected' : ''}>Sensitive</option>
            <option value="security" ${store.auditSeverityFilter === 'security' ? 'selected' : ''}>Security Policy</option>
          </select>

          <div class="flex items-center gap-1.5">
            <input
              type="date"
              value="${escapeHtml(store.auditDateFrom || '')}"
              onchange="window.TRSA.setAuditDateFrom(this.value)"
              title="From Date"
              class="corp-input px-2"
            />
            <button type="button" onclick="window.TRSA.resetAuditFilters()" class="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 whitespace-nowrap cursor-pointer">
              Reset
            </button>
          </div>
        </div>

        <!-- Populated or Empty State -->
        ${filteredLogs.length === 0 ? `
          <div class="py-14 text-center border-t border-slate-100 space-y-3">
            <div class="text-sm font-bold text-slate-800">No activity records match the active filters</div>
            <p class="text-xs text-slate-500 max-w-md mx-auto">
              Every sign-in, user/vendor/plant edit, TRSA specification change, and Compliance Matrix policy update is recorded automatically.
            </p>
            <button type="button" onclick="window.TRSA.resetAuditFilters()" class="btn-capiclean-primary px-4 py-2 text-xs font-bold cursor-pointer">
              Reset Activity Filters
            </button>
          </div>
        ` : `
          <div class="overflow-x-auto border-t border-slate-100">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th class="py-3 pr-4">Timestamp</th>
                  <th class="py-3 pr-4">Actor</th>
                  <th class="py-3 pr-4">Category / Action</th>
                  <th class="py-3 pr-4">Target / Doc No.</th>
                  <th class="py-3">Change Details (Before &rarr; After)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${filteredLogs.map(log => {
                  const sevMeta = severityLabelMap[log.severity] || severityLabelMap.info;
                  const domainLabel = ACTIVITY_DOMAIN_LABELS[log.domain] || 'Activity';
                  const diffs = (log.diffDetails && log.diffDetails.length > 0)
                    ? log.diffDetails
                    : [{ category: 'Event', description: (log.changedFields || []).join(', '), from: '', to: '' }];

                  return `
                    <tr class="hover:bg-slate-50/80 align-top">
                      <td class="py-3.5 pr-4 whitespace-nowrap font-mono tabular-nums">
                        <div class="text-slate-900 font-semibold">${escapeHtml(formatAuditTimestamp(log.createdAt))}</div>
                        <div class="text-[11px] text-slate-400">${escapeHtml(getRelativeTime(log.createdAt))}</div>
                      </td>
                      <td class="py-3.5 pr-4 min-w-[170px]">
                        <div class="font-bold text-slate-900">${escapeHtml(log.userName)}</div>
                        <div class="text-[11px] text-slate-500">${escapeHtml(log.userRole)} &middot; ${escapeHtml(log.userDept || 'MFG')}</div>
                      </td>
                      <td class="py-3.5 pr-4 whitespace-nowrap">
                        <div class="font-mono font-bold text-[#0369A1]">${escapeHtml(log.action)}</div>
                        <div class="text-[11px] text-slate-500">
                          ${escapeHtml(domainLabel)} &middot; <span class="font-semibold ${sevMeta.cls}">${sevMeta.label}</span>
                        </div>
                      </td>
                      <td class="py-3.5 pr-4 font-mono text-slate-700 max-w-[190px] break-words">
                        ${escapeHtml(log.projectDocNumber || log.targetEntity || 'Workspace')}
                      </td>
                      <td class="py-3.5 space-y-1.5 min-w-[260px]">
                        ${diffs.map(d => `
                          <div>
                            <div class="text-slate-800 font-medium">
                              <span class="font-bold text-slate-900">${escapeHtml(d.category || 'Update')}:</span>
                              ${escapeHtml(d.description || '')}
                            </div>
                            ${(d.from || d.to) ? `
                              <div class="text-[11px] font-mono text-slate-500 mt-0.5">
                                <span class="text-rose-700">${escapeHtml(d.from || '(None)')}</span>
                                <span class="mx-1 text-slate-400">&rarr;</span>
                                <span class="text-emerald-800 font-semibold">${escapeHtml(d.to || '(Empty)')}</span>
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// Event Handlers and Interactive Wiring
function attachEventHandlers(activeProject) {
  const preserveSearchFocus = (inputId, pos) => {
    const el = document.getElementById(inputId);
    if (el) {
      el.focus();
      if (typeof pos === 'number' && typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(pos, pos);
      }
    }
  };

  // Search input (global header)
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.searchQuery = e.target.value;
      if (store.currentView !== 'projects' && store.currentView !== 'dashboard') {
        store.currentView = 'projects';
      }
      render();
      preserveSearchFocus('global-search', pos);
    });
  }

  // Dashboard quick search input
  const dashSearch = document.getElementById('dashboard-search');
  if (dashSearch) {
    dashSearch.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.searchQuery = e.target.value;
      render();
      preserveSearchFocus('dashboard-search', pos);
    });
  }

  // Dashboard plant filter
  const dashPlantFilter = document.getElementById('dashboard-plant-filter');
  if (dashPlantFilter) {
    dashPlantFilter.addEventListener('change', (e) => {
      store.plantFilter = e.target.value;
      render();
    });
  }

  // Dashboard sort selector
  const dashSort = document.getElementById('dashboard-sort');
  if (dashSort) {
    dashSort.addEventListener('change', (e) => {
      store.dashboardSort = e.target.value || 'recent';
      render();
    });
  }

  // User Matrix Settings search input
  const userMatrixSearch = document.getElementById('user-matrix-search');
  if (userMatrixSearch) {
    userMatrixSearch.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.userMatrixSearch = e.target.value;
      render();
      preserveSearchFocus('user-matrix-search', pos);
    });
  }

  // Enterprise Master Directory search input
  const dirSearch = document.getElementById('directory-search');
  if (dirSearch) {
    dirSearch.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.directorySearch = e.target.value;
      render();
      preserveSearchFocus('directory-search', pos);
    });
  }

  // Activity Log view & modal search inputs
  const activitySearch = document.getElementById('activity-search-input');
  if (activitySearch) {
    activitySearch.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.auditSearchQuery = e.target.value;
      render();
      preserveSearchFocus('activity-search-input', pos);
    });
  }

  const auditModalSearch = document.getElementById('audit-search-input');
  if (auditModalSearch) {
    auditModalSearch.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      store.auditSearchQuery = e.target.value;
      render();
      preserveSearchFocus('audit-search-input', pos);
    });
  }

  // Plant Selector (top bar)
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
  if (docTitle) {
    docTitle.addEventListener('input', (e) => {
      activeProject.documentInfo.title = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'documentInfo.title', e.target.value, e.target);
    });
  }
  const docSubtitle = document.getElementById('doc-subtitle');
  if (docSubtitle) {
    docSubtitle.addEventListener('input', (e) => {
      activeProject.documentInfo.subTitle = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'documentInfo.subTitle', e.target.value, e.target);
    });
  }
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
      updateValidationIndicatorsInPlace(activeProject, 'generalInfo.vendorName', e.target.value, e.target);
    });
  }

  // Dynamic Equipment Models & Capacities
  document.querySelectorAll('[data-model-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.modelIdx, 10);
      const field = e.target.dataset.modelField;
      store.updateEquipmentModel(idx, field, e.target.value);
      updateValidationIndicatorsInPlace(activeProject, `generalInfo.equipmentModels.${idx}.${field}`, e.target.value, e.target);
    });
  });

  const genVendor = document.getElementById('gen-vendor-name');
  if (genVendor) {
    genVendor.addEventListener('input', (e) => {
      ensureGeneralInfo(activeProject).vendorName = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'generalInfo.vendorName', e.target.value, e.target);
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
      updateValidationIndicatorsInPlace(activeProject, 'documentInfo.docNumber', e.target.value, e.target);
    });
  }

  const projDesc = document.getElementById('project-desc');
  if (projDesc) {
    projDesc.addEventListener('input', (e) => {
      activeProject.projectOverview.description = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'projectOverview.description', e.target.value, e.target);
    });
  }
  const dateStartup = document.getElementById('date-startup');
  if (dateStartup) {
    dateStartup.addEventListener('input', (e) => {
      activeProject.projectOverview.keyDates.lineStartUp = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'projectOverview.keyDates.lineStartUp', e.target.value, e.target);
    });
  }
  const dateQuotation = document.getElementById('date-quotation');
  if (dateQuotation) {
    dateQuotation.addEventListener('input', (e) => {
      activeProject.projectOverview.keyDates.finalQuotationDrawings = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'projectOverview.keyDates.finalQuotationDrawings', e.target.value, e.target);
    });
  }
  const datePo = document.getElementById('date-po');
  if (datePo) {
    datePo.addEventListener('input', (e) => {
      activeProject.projectOverview.keyDates.orderPlacement = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'projectOverview.keyDates.orderPlacement', e.target.value, e.target);
    });
  }

  // Revision table inputs
  document.querySelectorAll('[data-rev-idx]').forEach(input => {
    const syncRev = (e) => {
      const idx = parseInt(e.target.dataset.revIdx, 10);
      const field = e.target.dataset.field;
      if (activeProject.documentInfo.revisionHistory[idx]) {
        activeProject.documentInfo.revisionHistory[idx][field] = e.target.value;
        updateValidationIndicatorsInPlace(activeProject, `revision.${idx}.${field}`, e.target.value, e.target);
      }
    };
    input.addEventListener('input', syncRev);
    if (input.type === 'date') {
      input.addEventListener('change', syncRev);
    }
  });

  // Contacts inputs
  document.querySelectorAll('[data-contact-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.contactIdx, 10);
      const field = e.target.dataset.field;
      if (activeProject.keyContacts[idx]) {
        activeProject.keyContacts[idx][field] = e.target.value;
        updateValidationIndicatorsInPlace(activeProject, `contact.${idx}.${field}`, e.target.value, e.target);
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
        updateValidationIndicatorsInPlace(activeProject, `product.${idx}.${field}`, e.target.value, e.target);
      }
    });
  });

  // Step 2: Site Location and Invoicing Inputs
  const siteRecipient = document.getElementById('site-recipient');
  if (siteRecipient) {
    siteRecipient.addEventListener('input', (e) => {
      activeProject.siteDescription.invoiceRecipient = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'siteDescription.invoiceRecipient', e.target.value, e.target);
    });
  }
  const sitePort = document.getElementById('site-port');
  if (sitePort) {
    sitePort.addEventListener('input', (e) => {
      activeProject.siteDescription.deliveryPort = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'siteDescription.deliveryPort', e.target.value, e.target);
    });
  }
  const siteAddress = document.getElementById('site-address');
  if (siteAddress) {
    siteAddress.addEventListener('input', (e) => {
      activeProject.siteDescription.address = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'siteDescription.address', e.target.value, e.target);
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
  const siteDocSub = document.getElementById('site-doc-submission');
  if (siteDocSub) {
    siteDocSub.addEventListener('input', (e) => {
      activeProject.siteDescription.documentSubmissionCompliance = e.target.value;
    });
  }
  const docConf = document.getElementById('doc-confidentiality');
  if (docConf) {
    docConf.addEventListener('input', (e) => {
      activeProject.projectOverview.confidentialityClause = e.target.value;
    });
  }
  const docLang = document.getElementById('doc-language');
  if (docLang) {
    docLang.addEventListener('input', (e) => {
      activeProject.projectOverview.languageRequirement = e.target.value;
    });
  }

  // Process benchmark inputs
  const fryTemp = document.getElementById('proc-fry-temp');
  if (fryTemp) {
    fryTemp.addEventListener('input', (e) => {
      activeProject.processParameters.frying.temperatureRange = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.frying.temperatureRange', e.target.value, e.target);
    });
  }
  const fryDwell = document.getElementById('proc-fry-dwell');
  if (fryDwell) {
    fryDwell.addEventListener('input', (e) => {
      activeProject.processParameters.frying.dwellTime = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.frying.dwellTime', e.target.value, e.target);
    });
  }
  const fryFeeder = document.getElementById('proc-fry-feeder');
  if (fryFeeder) fryFeeder.addEventListener('input', (e) => activeProject.processParameters.frying.feederRate = e.target.value);
  const fryOil = document.getElementById('proc-fry-oil');
  if (fryOil) {
    fryOil.addEventListener('input', (e) => {
      activeProject.processParameters.frying.oilCapacityInFryer = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.frying.oilCapacityInFryer', e.target.value, e.target);
    });
  }
  const frySpinner = document.getElementById('proc-fry-spinner');
  if (frySpinner) frySpinner.addEventListener('input', (e) => activeProject.processParameters.frying.spinnerRotationTime = e.target.value);
  const fryHopper = document.getElementById('proc-fry-hopper');
  if (fryHopper) fryHopper.addEventListener('input', (e) => activeProject.processParameters.frying.hopperGateOpening = e.target.value);

  const seasType = document.getElementById('proc-seas-type');
  if (seasType) {
    seasType.addEventListener('input', (e) => {
      activeProject.processParameters.seasoning.requiredSeasoning = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.seasoning.requiredSeasoning', e.target.value, e.target);
    });
  }
  const seasRate = document.getElementById('proc-seas-rate');
  if (seasRate) {
    seasRate.addEventListener('input', (e) => {
      activeProject.processParameters.seasoning.seasoningApplicationRate = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.seasoning.seasoningApplicationRate', e.target.value, e.target);
    });
  }
  const seasSalt = document.getElementById('proc-seas-salt');
  if (seasSalt) seasSalt.addEventListener('input', (e) => activeProject.processParameters.seasoning.saltContentBaseExcluded = e.target.value);
  const seasCap = document.getElementById('proc-seas-cap');
  if (seasCap) {
    seasCap.addEventListener('input', (e) => {
      activeProject.processParameters.seasoning.seasoningCapacity = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'processParameters.seasoning.seasoningCapacity', e.target.value, e.target);
    });
  }
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
          updateValidationIndicatorsInPlace(activeProject, `scope.${type}.${idx}.${field}`, e.target.value, e.target);
        }
      }
    });
  });

  // Step 5: Hygiene & Performance Acceptance inputs
  const hygieneMat = document.getElementById('hygiene-material');
  if (hygieneMat) {
    hygieneMat.addEventListener('input', (e) => {
      activeProject.hygieneAndQuality.foodContactMaterial = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'hygieneAndQuality.foodContactMaterial', e.target.value, e.target);
    });
  }
  const commDuration = document.getElementById('comm-duration');
  if (commDuration) {
    commDuration.addEventListener('input', (e) => {
      activeProject.performanceAcceptance.commissioningDuration = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'performanceAcceptance.commissioningDuration', e.target.value, e.target);
    });
  }

  // Step 6: Required Documentation & Appendices checkboxes & Sign-off Authorization inputs
  document.querySelectorAll('[id^="doc-req-"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.id.replace('doc-req-', ''), 10);
      if (Array.isArray(activeProject.requiredDocumentation) && activeProject.requiredDocumentation[idx]) {
        activeProject.requiredDocumentation[idx].required = Boolean(e.target.checked);
      }
    });
  });
  document.querySelectorAll('[id^="app-check-"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.id.replace('app-check-', ''), 10);
      if (Array.isArray(activeProject.appendices) && activeProject.appendices[idx]) {
        activeProject.appendices[idx].included = Boolean(e.target.checked);
      }
    });
  });
  const signSellerCompany = document.getElementById('sign-seller-company');
  if (signSellerCompany) {
    signSellerCompany.addEventListener('input', (e) => {
      activeProject.signOff.seller.companyName = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'signOff.seller.companyName', e.target.value, e.target);
    });
  }
  const signSellerQuote = document.getElementById('sign-seller-quote');
  if (signSellerQuote) {
    signSellerQuote.addEventListener('input', (e) => {
      activeProject.signOff.seller.quotationNo = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'signOff.seller.quotationNo', e.target.value, e.target);
    });
  }
  const signSellerName = document.getElementById('sign-seller-name');
  if (signSellerName) {
    signSellerName.addEventListener('input', (e) => {
      const raw = e.target.value;
      const sepIdx = raw.indexOf(' - ');
      if (sepIdx !== -1) {
        activeProject.signOff.seller.name = raw.slice(0, sepIdx).trim();
        activeProject.signOff.seller.position = raw.slice(sepIdx + 3).trim();
      } else {
        activeProject.signOff.seller.name = raw.trim();
        activeProject.signOff.seller.position = '';
      }
      updateValidationIndicatorsInPlace(activeProject, 'signOff.seller.name', raw, e.target);
    });
  }
  const signIfmName = document.getElementById('sign-ifm-name');
  if (signIfmName) {
    signIfmName.addEventListener('input', (e) => {
      activeProject.signOff.purchaser.name = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'signOff.purchaser.name', e.target.value, e.target);
    });
  }
  const signIfmPos = document.getElementById('sign-ifm-pos');
  if (signIfmPos) {
    signIfmPos.addEventListener('input', (e) => {
      activeProject.signOff.purchaser.position = e.target.value;
      updateValidationIndicatorsInPlace(activeProject, 'signOff.purchaser.position', e.target.value, e.target);
    });
  }

  // Auto-save builder form edits & real-time blur/focusout validation
  const builderForm = document.getElementById('trsa-builder-form');
  if (builderForm) {
    builderForm.addEventListener('input', () => store.scheduleAutoSaveDraft());
    builderForm.addEventListener('change', () => store.scheduleAutoSaveDraft());
    builderForm.addEventListener('focusout', (e) => {
      const target = e.target;
      if (!target || !target.dataset || !target.dataset.validationKey) return;
      const key = target.dataset.validationKey;
      let val = target.value;
      if (target.id === 'gen-vendor-select' && val === '__custom__') {
        val = ensureGeneralInfo(activeProject).vendorName;
      }
      updateValidationIndicatorsInPlace(activeProject, key, val, target);
    });
  }
}

// Global methods accessible from inline event handlers
if (typeof window !== 'undefined') {
  window.TRSA = {
    showLogin: () => {
      store.isAuthenticated = false;
      render();
    },
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
  requestDeleteProject(id) {
    store.confirmDeleteProjectId = id;
    render();
  },
  cancelDeleteProject() {
    store.confirmDeleteProjectId = null;
    render();
  },
  toggleSelectProject(id) {
    const idx = store.selectedProjectIds.indexOf(id);
    if (idx === -1) {
      store.selectedProjectIds.push(id);
    } else {
      store.selectedProjectIds.splice(idx, 1);
    }
    store.confirmBulkDelete = false;
    render();
  },
  toggleSelectAllProjects() {
    const visibleIds = computeAgreementStats(store.projects, {
      statusFilter: store.statusFilter,
      plantFilter: store.plantFilter,
      searchQuery: store.searchQuery,
      sortBy: store.dashboardSort || 'recent'
    }).filteredAgreements.map(p => p.id);

    const allSelected = visibleIds.length > 0 && visibleIds.every(id => store.selectedProjectIds.includes(id));
    if (allSelected) {
      store.selectedProjectIds = store.selectedProjectIds.filter(id => !visibleIds.includes(id));
    } else {
      const merged = new Set([...store.selectedProjectIds, ...visibleIds]);
      store.selectedProjectIds = Array.from(merged);
    }
    store.confirmBulkDelete = false;
    render();
  },
  clearProjectSelection() {
    store.selectedProjectIds = [];
    store.confirmBulkDelete = false;
    render();
  },
  bulkUpdateProjectStatus(newStatus) {
    store.bulkUpdateProjectStatus(store.selectedProjectIds, newStatus);
    render();
  },
  bulkExportSelectedProjects() {
    store.exportSelectedProjectsJSON(store.selectedProjectIds);
  },
  requestBulkDelete() {
    store.confirmBulkDelete = true;
    render();
  },
  cancelBulkDelete() {
    store.confirmBulkDelete = false;
    render();
  },
  confirmBulkDeleteProjects() {
    store.bulkDeleteProjects(store.selectedProjectIds);
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
  toggleDashboardStatusFilter(status) {
    store.statusFilter = store.statusFilter === status ? 'all' : status;
    render();
  },
  resetDashboardFilters() {
    store.statusFilter = 'all';
    store.plantFilter = 'all';
    store.searchQuery = '';
    store.dashboardSort = 'recent';
    render();
  },
  updateProjectStatus(id, status) {
    store.updateProjectStatus(id, status);
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
    const p = store.getActiveProject();
    store.saveRevisionHistory();
    const validation = validateProject(p);
    if (!validation.valid) {
      store.showValidationSummary = true;
      store.showNotification(`Draft saved, but ${validation.totalErrors} mandatory field(s) need attention.`, 'error');
    } else {
      store.showValidationSummary = false;
    }
    render();
  },
  finishAndPreview() {
    const p = store.getActiveProject();
    const validation = validateProject(p);
    if (!validation.valid) {
      store.showValidationSummary = true;
      const firstErr = validation.errors[0];
      if (firstErr && store.builderStep !== firstErr.step) {
        store.builderStep = firstErr.step;
      }
      store.showNotification(`Please complete ${validation.totalErrors} required field(s) before viewing Official A4.`, 'error');
      render();
      setTimeout(() => {
        if (firstErr) {
          const target = document.querySelector(`[data-validation-key="${firstErr.fieldKey}"]`) ||
            (firstErr.selector ? document.querySelector(firstErr.selector) : null);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof target.focus === 'function') target.focus();
          }
        }
      }, 50);
      return;
    }
    store.showValidationSummary = false;
    store.saveRevisionHistory();
    setView('studio');
  },
  toggleValidationSummary(force) {
    store.showValidationSummary = typeof force === 'boolean' ? force : !store.showValidationSummary;
    render();
  },
  focusValidationIssue(step, fieldKey) {
    store.builderStep = step;
    render();
    setTimeout(() => {
      const target = document.querySelector(`[data-validation-key="${fieldKey}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof target.focus === 'function') target.focus();
      }
    }, 50);
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
  openFullActivityLog() {
    store.showAuditModal = false;
    store.currentView = 'activity';
    render();
  },
  setAuditProjectFilter(val) {
    store.auditProjectFilter = val;
    render();
  },
  setAuditDomainFilter(domain) {
    store.auditDomainFilter = domain || ACTIVITY_DOMAINS.ALL;
    render();
  },
  setAuditActionFilter(action) {
    store.auditActionFilter = action || 'all';
    render();
  },
  setAuditSeverityFilter(severity) {
    store.auditSeverityFilter = severity || 'all';
    render();
  },
  setAuditDateFrom(dateVal) {
    store.auditDateFrom = dateVal || '';
    render();
  },
  setAuditDateTo(dateVal) {
    store.auditDateTo = dateVal || '';
    render();
  },
  resetAuditFilters() {
    store.auditSearchQuery = '';
    store.auditProjectFilter = 'all';
    store.auditDomainFilter = ACTIVITY_DOMAINS.ALL;
    store.auditActionFilter = 'all';
    store.auditSeverityFilter = 'all';
    store.auditDateFrom = '';
    store.auditDateTo = '';
    render();
  },
  setAuditSearch(val) {
    store.auditSearchQuery = val;
    render();
  },
  downloadAuditJSON() {
    const projId = store.auditProjectFilter === 'current' ? store.activeProjectId : null;
    const filters = {
      domain: store.auditDomainFilter || ACTIVITY_DOMAINS.ALL,
      action: store.auditActionFilter || 'all',
      severity: store.auditSeverityFilter || 'all',
      searchQuery: store.auditSearchQuery || '',
      dateFrom: store.auditDateFrom || '',
      dateTo: store.auditDateTo || ''
    };
    const jsonStr = exportAuditLogsToJSON(projId, filters);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRSA_Audit_Log_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    store.logActivity('AUDIT_EXPORT', [{
      category: 'Audit Export',
      description: `Exported filtered activity log to JSON (${filters.domain})`,
      from: 'Activity Log',
      to: a.download
    }]);
    store.showNotification('Audit log exported to JSON.', 'success');
  },
  downloadAuditCSV() {
    const projId = store.auditProjectFilter === 'current' ? store.activeProjectId : null;
    const filters = {
      domain: store.auditDomainFilter || ACTIVITY_DOMAINS.ALL,
      action: store.auditActionFilter || 'all',
      severity: store.auditSeverityFilter || 'all',
      searchQuery: store.auditSearchQuery || '',
      dateFrom: store.auditDateFrom || '',
      dateTo: store.auditDateTo || ''
    };
    const csvStr = exportAuditLogsToCSV(projId, filters);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRSA_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    store.logActivity('AUDIT_EXPORT', [{
      category: 'Audit Export',
      description: `Exported filtered activity log to CSV (${filters.domain})`,
      from: 'Activity Log',
      to: a.download
    }]);
    store.showNotification('Audit log exported to CSV.', 'success');
  },
  saveDraftWithNote(noteInputId) {
    const inputEl = noteInputId ? document.getElementById(noteInputId) : null;
    const note = inputEl ? inputEl.value.trim() : '';
    const p = store.getActiveProject();
    store.saveDraftSnapshot({
      project: p,
      builderStep: store.builderStep,
      label: note || `Manual Draft Checkpoint (Step ${store.builderStep} of 6)`,
      isAutoSave: false,
      notify: true
    });
    if (inputEl) inputEl.value = '';
    render();
  },
  resumeDraft(draftId) {
    store.resumeDraft(draftId, 'replace');
    render();
  },
  resumeDraftAsCopy(draftId) {
    store.resumeDraft(draftId, 'new');
    render();
  },
  previewDraft(draftId) {
    const restored = store.resumeDraft(draftId, 'replace');
    if (restored) {
      store.currentView = 'studio';
    }
    render();
  },
  deleteDraft(draftId) {
    store.deleteDraft(draftId);
    render();
  },
  requestClearDraftHistory() {
    store.confirmClearHistory = true;
    render();
  },
  cancelClearDraftHistory() {
    store.confirmClearHistory = false;
    render();
  },
  confirmClearDraftHistory() {
    const projectId = store.historyFilter === 'current' ? store.activeProjectId : null;
    store.clearAllDrafts(projectId);
    render();
  },
  setHistoryFilter(filter) {
    store.historyFilter = filter;
    store.confirmClearHistory = false;
    render();
  },
  setHistorySearch(query) {
    store.historySearchQuery = query;
    render();
    const searchEl = document.getElementById('draft-history-search');
    if (searchEl) {
      searchEl.focus();
      const len = searchEl.value.length;
      searchEl.setSelectionRange(len, len);
    }
  },
  downloadDraftHistoryJSON() {
    const projId = store.historyFilter === 'current' ? store.activeProjectId : null;
    const jsonStr = exportDraftHistoryJSON(projId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRSA_Draft_History_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    store.showNotification('Draft history exported to JSON.', 'success');
  },
  toggleAutoSave() {
    store.toggleAutoSave();
    render();
  },
  openPdfModal() {
    store.showPdfModal = true;
    render();
  },
  closePdfModal() {
    store.showPdfModal = false;
    render();
  },
  alignProjectWithMatrix() {
    store.alignProjectWithMatrix();
    render();
  },
  setMatrixSubTab(tab) {
    store.matrixSubTab = tab === 'users' ? 'users' : 'matrix';
    render();
  },
  setMatrixClauseScopeFilter(scope) {
    store.matrixClauseScopeFilter = scope === 'assigned' ? 'assigned' : 'all';
    render();
  },
  selectMatrixUser(userKey) {
    store.selectedMatrixUserKey = userKey;
    render();
  },
  updateUserMatrixField(userKey, field, value) {
    store.updateMatrixSettingsForUser(userKey, { [field]: value });
    render();
  },
  toggleMatrixPlantForUser(userKey, plantCode) {
    store.toggleMatrixPlantForUser(userKey, plantCode);
    render();
  },
  toggleMatrixOriginForUser(userKey, origin) {
    store.toggleMatrixOriginForUser(userKey, origin);
    render();
  },
  toggleMatrixClauseForUser(userKey, clauseId) {
    store.toggleMatrixClauseForUser(userKey, clauseId);
    render();
  },
  setUserClausesPreset(userKey, scope) {
    const allIds = getAllMatrixClauseIds();
    const techPrefixes = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    let nextClauses = allIds;
    if (scope === 'tech') {
      nextClauses = allIds.filter(id => techPrefixes.includes(String(id).split('.')[0]));
    } else if (scope === 'comm') {
      nextClauses = allIds.filter(id => !techPrefixes.includes(String(id).split('.')[0]));
    } else if (scope === 'none') {
      nextClauses = [];
    }
    store.updateMatrixSettingsForUser(userKey, { assignedClauses: nextClauses });
    render();
  },
  applyMatrixPresetForUser(userKey, presetKey) {
    store.applyMatrixPresetForUser(userKey, presetKey);
    render();
  },
  saveUserMatrixNote(userKey) {
    const input = document.getElementById('user-matrix-notes');
    const customNotes = input ? input.value.trim() : '';
    const updated = store.updateMatrixSettingsForUser(userKey, { customNotes });
    if (updated) {
      store.showNotification(`Directive Compliance Matrix untuk ${updated.name} tersimpan.`, 'success');
    }
    render();
  },
  resetMatrixForUser(userKey) {
    store.resetMatrixForUser(userKey);
    render();
  },
  resetAllUsersMatrix() {
    store.resetAllUsersMatrix();
    render();
  },
  toggleForgotHint() {
    store.showForgotHint = !store.showForgotHint;
    render();
  },
  toggleQuickLoginPanel() {
    store.showQuickLoginPanel = !store.showQuickLoginPanel;
    render();
  },
  quickFillAndLogin(email) {
    store.loginAsQuickUser(email);
    render();
  },
  logout() {
    store.logout();
    render();
  },
  openVendorInDirectory(vendorId) {
    if (vendorId) store.selectedDirectoryVendorId = vendorId;
    store.directoryTab = 'vendors';
    store.currentView = 'directory';
    render();
  },
  openPlantInDirectory(plantCode) {
    if (plantCode) store.selectedDirectoryPlantCode = resolvePlantCode(plantCode);
    store.directoryTab = 'plants';
    store.currentView = 'directory';
    render();
  },
  setDirectoryTab(tab) {
    store.directoryTab = tab;
    render();
  },
  selectDirectoryUser(email) {
    store.selectedDirectoryUserEmail = email;
    store.showAddUserForm = false;
    store.editingUserEmail = null;
    render();
  },
  selectDirectoryVendor(vendorId) {
    store.selectedDirectoryVendorId = vendorId;
    store.showAddVendorForm = false;
    store.editingVendorId = null;
    render();
  },
  selectDirectoryPlant(plantCode) {
    store.selectedDirectoryPlantCode = resolvePlantCode(plantCode);
    store.editingPlantCode = null;
    render();
  },
  setDirectoryRoleFilter(role) {
    store.directoryRoleFilter = role || 'all';
    render();
  },
  setDirectoryVendorOriginFilter(origin) {
    store.directoryVendorOriginFilter = origin || 'all';
    render();
  },
  toggleAddUserForm() {
    store.editingUserEmail = null;
    store.showAddUserForm = !store.showAddUserForm;
    render();
  },
  editDirectoryUser(email) {
    store.showAddUserForm = false;
    store.editingUserEmail = email;
    render();
  },
  cancelUserForm() {
    store.showAddUserForm = false;
    store.editingUserEmail = null;
    render();
  },
  submitUserForm(originalEmail = '') {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saved = store.saveUserRecord({
      originalEmail,
      employeeId: val('dir-user-empid'),
      status: val('dir-user-status') || 'Active',
      name: val('dir-user-name'),
      email: val('dir-user-email'),
      role: val('dir-user-role'),
      jabatan: val('dir-user-jabatan'),
      dept: val('dir-user-dept'),
      plantCode: val('dir-user-plant') || 'All Plants',
      phone: val('dir-user-phone'),
      password: document.getElementById('dir-user-password')?.value || DEFAULT_PASSCODE,
      bio: val('dir-user-bio')
    });
    if (saved) {
      store.showAddUserForm = false;
      store.editingUserEmail = null;
    }
    render();
  },
  deleteDirectoryUser(email) {
    store.removeUserRecord(email);
    render();
  },
  switchSessionFromDirectory(email) {
    store.setCurrentUser(email);
    render();
  },
  toggleAddVendorForm() {
    store.editingVendorId = null;
    store.showAddVendorForm = !store.showAddVendorForm;
    render();
  },
  editDirectoryVendor(id) {
    store.showAddVendorForm = false;
    store.editingVendorId = id;
    render();
  },
  cancelVendorForm() {
    store.showAddVendorForm = false;
    store.editingVendorId = null;
    render();
  },
  submitVendorForm(existingId = '') {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saved = store.saveVendorRecord({
      id: existingId || undefined,
      vendorCode: val('dir-vnd-code'),
      name: val('dir-vnd-name'),
      origin: val('dir-vnd-origin') || 'Foreign',
      country: val('dir-vnd-country') || 'Indonesia',
      equipmentType: val('dir-vnd-equip') || 'Process Line',
      status: val('dir-vnd-status') || 'Approved OEM',
      address: val('dir-vnd-address'),
      city: val('dir-vnd-city'),
      postalCode: val('dir-vnd-postal'),
      picName: val('dir-vnd-pic-name'),
      picRole: val('dir-vnd-pic-role'),
      picEmail: val('dir-vnd-pic-email'),
      picPhone: val('dir-vnd-pic-phone'),
      taxId: val('dir-vnd-tax'),
      paymentCurrency: val('dir-vnd-currency'),
      leadTimeWeeks: val('dir-vnd-leadtime'),
      website: val('dir-vnd-website'),
      certifications: val('dir-vnd-certs'),
      description: val('dir-vnd-desc')
    });
    if (saved) {
      store.showAddVendorForm = false;
      store.editingVendorId = null;
    }
    render();
  },
  deleteDirectoryVendor(id) {
    store.removeVendorRecord(id);
    render();
  },
  applyVendorToProject(vendorId) {
    const v = (store.vendors || loadVendors()).find(item => item.id === vendorId);
    if (!v) return;
    window.TRSA.onVendorSelectChanged(v.name);
    store.showNotification(`Vendor "${v.name}" diterapkan ke TRSA aktif.`, 'success');
    store.currentView = 'builder';
    store.builderStep = 1;
    render();
  },
  editPlantDetail(plantCode) {
    store.editingPlantCode = resolvePlantCode(plantCode);
    render();
  },
  cancelPlantEditForm() {
    store.editingPlantCode = null;
    render();
  },
  submitPlantDetailForm(plantCode) {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saved = store.savePlantDetail(plantCode, {
      deliveryPort: val('dir-plant-port'),
      invoiceRecipient: val('dir-plant-invoice'),
      addressDetail: {
        street: val('dir-plant-street'),
        industrialZone: val('dir-plant-zone'),
        kelurahan: val('dir-plant-kel'),
        kecamatan: val('dir-plant-kec'),
        city: val('dir-plant-city'),
        province: val('dir-plant-prov'),
        postalCode: val('dir-plant-postal'),
        phone: val('dir-plant-phone'),
        fax: val('dir-plant-fax'),
        coordinates: val('dir-plant-coords'),
        receivingGate: val('dir-plant-gate'),
        receivingHours: val('dir-plant-hours'),
        taxEntityNote: val('dir-plant-tax')
      }
    });
    if (saved) {
      store.editingPlantCode = null;
    }
    render();
  },
  applyPlantToProject(plantCode) {
    const pl = getPlantProfile(plantCode);
    if (!pl) return;
    store.updatePlantLocation(pl.plantName);
    store.showNotification(`Plant ${pl.code} (${pl.plantName}) & alamat lengkap diterapkan ke TRSA aktif.`, 'success');
    store.currentView = 'builder';
    store.builderStep = 2;
    render();
  },
  toggleAddDeptForm() {
    store.editingDeptCode = null;
    store.showAddDeptForm = !store.showAddDeptForm;
    render();
  },
  editDeptRecord(code) {
    store.showAddDeptForm = false;
    store.editingDeptCode = code;
    render();
  },
  cancelDeptForm() {
    store.showAddDeptForm = false;
    store.editingDeptCode = null;
    render();
  },
  submitDeptForm() {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saved = store.saveDepartmentRecord({
      code: val('dir-dept-code'),
      name: val('dir-dept-name'),
      division: val('dir-dept-division'),
      headTitle: val('dir-dept-head'),
      costCenter: val('dir-dept-cc'),
      description: val('dir-dept-desc')
    });
    if (saved) {
      store.showAddDeptForm = false;
      store.editingDeptCode = null;
    }
    render();
  },
  deleteDeptRecord(code) {
    store.removeDepartmentRecord(code);
    render();
  },
  toggleAddJobForm() {
    store.editingJobId = null;
    store.showAddJobForm = !store.showAddJobForm;
    render();
  },
  editJobRecord(id) {
    store.showAddJobForm = false;
    store.editingJobId = id;
    render();
  },
  cancelJobForm() {
    store.showAddJobForm = false;
    store.editingJobId = null;
    render();
  },
  submitJobForm(existingId = '') {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saved = store.saveJobTitleRecord({
      id: existingId || undefined,
      code: val('dir-job-code'),
      title: val('dir-job-title'),
      level: val('dir-job-level'),
      defaultDept: val('dir-job-dept'),
      defaultRole: val('dir-job-role'),
      description: val('dir-job-desc')
    });
    if (saved) {
      store.showAddJobForm = false;
      store.editingJobId = null;
    }
    render();
  },
  deleteJobRecord(id) {
    store.removeJobTitleRecord(id);
    render();
  }
};
}
