/**
 * TRSA Studio - Corporate Vendor Information Matrix & Standardization Service
 * Standardizes Vendor General & Commercial Profile, 6-Role Vendor Key Contact Persons,
 * Origin-aligned Term of Payment & List of TRSA Documents, International Phone Formatting,
 * Procurement Typo Correction, and Deterministic Raw Profile Extraction.
 */

export const VENDOR_TBC_MARKER = '[To Be Confirmed by Vendor]';

export const VENDOR_CONTACT_ROLES = Object.freeze([
  'Sales',
  'Engineering',
  'Project',
  'Project Manager',
  'Spare Part',
  'Finance'
]);

const COUNTRY_CALLING_CODES = Object.freeze({
  indonesia: '+62',
  china: '+86',
  prc: '+86',
  italy: '+39',
  italia: '+39',
  netherlands: '+31',
  holland: '+31',
  japan: '+81',
  'united states': '+1',
  usa: '+1',
  us: '+1',
  canada: '+1',
  'united kingdom': '+44',
  uk: '+44',
  france: '+33',
  germany: '+49',
  deutschland: '+49',
  switzerland: '+41',
  australia: '+61',
  singapore: '+65',
  malaysia: '+60',
  'south korea': '+82',
  korea: '+82',
  taiwan: '+886',
  india: '+91',
  thailand: '+66',
  vietnam: '+84',
  spain: '+34',
  belgium: '+32',
  austria: '+43',
  denmark: '+45',
  sweden: '+46',
  norway: '+47',
  turkey: '+90',
  'united arab emirates': '+971',
  uae: '+971'
});

const TYPO_REPLACEMENTS = [
  [/\bequipmnets?\b/gi, m => (m[0] === 'E' ? 'Equipment' : 'equipment')],
  [/\bequipemnt\b/gi, m => (m[0] === 'E' ? 'Equipment' : 'equipment')],
  [/\bspecfication(s)?\b/gi, (_, p) => `Specification${p || ''}`],
  [/\bquoatation(s)?\b/gi, (_, p) => `Quotation${p || ''}`],
  [/\bquotaton(s)?\b/gi, (_, p) => `Quotation${p || ''}`],
  [/\bwaranty\b/gi, m => (m[0] === 'W' ? 'Warranty' : 'warranty')],
  [/\bcommisioning\b/gi, m => (m[0] === 'C' ? 'Commissioning' : 'commissioning')],
  [/\bmaintenace\b/gi, m => (m[0] === 'M' ? 'Maintenance' : 'maintenance')],
  [/\bdocumnet(s)?\b/gi, (_, p) => `Document${p || ''}`],
  [/\badress\b/gi, m => (m[0] === 'A' ? 'Address' : 'address')],
  [/\benginering\b/gi, m => (m[0] === 'E' ? 'Engineering' : 'engineering')],
  [/\bdelivary\b/gi, m => (m[0] === 'D' ? 'Delivery' : 'delivery')],
  [/\bmatrial(s)?\b/gi, (_, p) => `Material${p || ''}`],
  [/\bavailabel\b/gi, 'available'],
  [/\bcertifcate(s)?\b/gi, (_, p) => `Certificate${p || ''}`],
  [/\bshall\b/gi, m => (m[0] === 'S' ? 'Must' : 'must')]
];

export function correctProcurementTypos(text = '') {
  let result = String(text || '').trim();
  if (!result) return '';
  for (const [pattern, replacement] of TYPO_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

export function isIndonesianCountry(country = '') {
  const norm = String(country || '').trim().toLowerCase();
  if (!norm) return false;
  return (
    norm === 'indonesia' ||
    norm === 'id' ||
    norm === 'ri' ||
    norm.includes('indonesia')
  );
}

export function classifyVendorOrigin(country = '', explicitOrigin = '') {
  if (explicitOrigin === 'Mixed') return 'Mixed';
  const normCountry = String(country || '').trim();
  if (normCountry) {
    return isIndonesianCountry(normCountry) ? 'Local' : 'Foreign';
  }
  if (explicitOrigin === 'Local' || explicitOrigin === 'Foreign') {
    return explicitOrigin;
  }
  return 'Foreign';
}

export function getVendorOriginTag(origin = 'Foreign', country = '') {
  const resolved = classifyVendorOrigin(country, origin);
  if (resolved === 'Local') return 'LOCAL VENDOR';
  if (resolved === 'Mixed') return 'MIXED VENDOR';
  return 'FOREIGN VENDOR';
}

export function getDefaultTermOfPaymentByOrigin(origin = 'Foreign', currency = '') {
  const normOrigin = origin === 'Local' ? 'Local' : origin === 'Mixed' ? 'Mixed' : 'Foreign';
  if (normOrigin === 'Local') {
    return 'T/T (IDR): 30% DP against Commercial DPP Invoice (Faktur Pajak PP 44/2022) & APBG, 55% Progress/Delivery, 10% Commissioning (SAT), 5% Retention (3 mos)';
  }
  if (normOrigin === 'Mixed') {
    return 'Dual Currency (Offshore USD/EUR & Onshore IDR): 30% DP vs SWIFT APBG, 55% Progress / Shipping Docs, 10% Commissioning (≤60d B/L), 5% Retention 3 mos (≤150d B/L)';
  }
  const curr = currency ? ` (${currency})` : '';
  return `T/T or Irrevocable L/C at Sight${curr}: 30% DP vs SWIFT APBG, 55% Progress against Shipping Documents, 10% After Commissioning/SAT (≤60d B/L), 5% Retention 3 mos (≤150d B/L)`;
}

export function getCountryCallingCode(country = '') {
  const norm = String(country || '').trim().toLowerCase();
  if (!norm) return '';
  if (COUNTRY_CALLING_CODES[norm]) return COUNTRY_CALLING_CODES[norm];
  for (const [k, code] of Object.entries(COUNTRY_CALLING_CODES)) {
    if (norm.includes(k)) return code;
  }
  return '';
}

export function standardizeInternationalPhone(phone = '', country = '') {
  const raw = String(phone || '').trim();
  if (!raw || raw === VENDOR_TBC_MARKER) return '';

  // Clean common separators while preserving extension markers
  let cleaned = raw.replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const defaultCode = getCountryCallingCode(country);

  // Convert local leading 0 numbers when country code is known (e.g., Indonesia 0812... -> +62 812...)
  if (!cleaned.startsWith('+') && /^0\d{6,}/.test(cleaned.replace(/[\s\-()]/g, ''))) {
    const code = defaultCode || '+62';
    const digits = cleaned.replace(/^0+/, '').replace(/[^\d]/g, '');
    return formatCallingNumber(code, digits);
  }

  // Already has '+' prefix
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{1,3})[\s\-()]*(.+)$/);
    if (match) {
      return `+${match[1]} ${match[2].replace(/[^\d\sxext.+-]/gi, '').trim()}`;
    }
    return cleaned;
  }

  // Digits without '+'
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  if (!digitsOnly) return cleaned;

  if (defaultCode) {
    const codeDigits = defaultCode.slice(1);
    if (digitsOnly.startsWith(codeDigits) && digitsOnly.length >= codeDigits.length + 6) {
      return formatCallingNumber(defaultCode, digitsOnly.slice(codeDigits.length));
    }
    return formatCallingNumber(defaultCode, digitsOnly);
  }

  return `+${digitsOnly}`;
}

function formatCallingNumber(code, subscriberDigits) {
  const cleanDigits = String(subscriberDigits || '').replace(/[^\d]/g, '');
  if (!cleanDigits) return code;
  const groups = cleanDigits.match(/.{1,4}/g) || [cleanDigits];
  return `${code} ${groups.join('-')}`;
}

function mapLegacyPicRoleToMatrixRole(picRole = '') {
  const lower = String(picRole || '').toLowerCase();
  if (lower.includes('project manager') || lower.includes('director')) return 'Project Manager';
  if (lower.includes('project')) return 'Project';
  if (lower.includes('engineer') || lower.includes('technical')) return 'Engineering';
  if (lower.includes('spare') || lower.includes('part') || lower.includes('after')) return 'Spare Part';
  if (lower.includes('finance') || lower.includes('account') || lower.includes('tax')) return 'Finance';
  return 'Sales';
}

export function normalizeVendorKeyContacts(vendor = {}) {
  const existingList = Array.isArray(vendor.keyContacts) ? vendor.keyContacts : [];
  const existingMap = new Map();
  for (const item of existingList) {
    if (!item || !item.role) continue;
    const roleMatch = VENDOR_CONTACT_ROLES.find(r => r.toLowerCase() === String(item.role).trim().toLowerCase());
    if (roleMatch) {
      existingMap.set(roleMatch, item);
    }
  }

  // Fallback mapping from legacy single PIC if no role matches yet
  const legacyHasPic = Boolean(vendor.picName || vendor.picEmail || vendor.picPhone);
  const legacyTargetRole = mapLegacyPicRoleToMatrixRole(vendor.picRole);
  const country = vendor.country || '';

  return VENDOR_CONTACT_ROLES.map(role => {
    const found = existingMap.get(role) || {};
    let name = correctProcurementTypos(found.name || '');
    let email = String(found.email || '').trim();
    let phone = String(found.phone || '').trim();

    if (legacyHasPic && role === legacyTargetRole && !name && !email && !phone) {
      name = correctProcurementTypos(vendor.picName || '');
      email = String(vendor.picEmail || '').trim();
      phone = String(vendor.picPhone || '').trim();
    }

    return {
      role,
      name: name === VENDOR_TBC_MARKER ? '' : name,
      email: email === VENDOR_TBC_MARKER ? '' : email,
      phone: phone === VENDOR_TBC_MARKER ? '' : standardizeInternationalPhone(phone, country)
    };
  });
}

export function getVendorTRSADocumentMatrix(origin = 'Foreign', country = '') {
  const resolvedOrigin = classifyVendorOrigin(country, origin);
  const isLocal = resolvedOrigin === 'Local';

  const commercialCompliance = [
    {
      title: 'Final Commercial Quotation & Price Breakdown',
      note: isLocal ? 'Itemized in IDR (Equipment Supply & Services, DPP/PPN/PPh)' : 'Itemized in USD/EUR (Equipment Supply & Engineering Services)',
      mandatory: true
    }
  ];

  if (!isLocal) {
    commercialCompliance.push(
      {
        title: 'DGT-1 Form',
        note: 'Original, full-color — mandatory for Foreign Vendor Engineering Services (PPh 26 relief)',
        mandatory: true
      },
      {
        title: 'Certificate of Origin (COO) & Manufacturer Authorization Letter',
        note: 'Form E / AK / IJEPA / FTA preference where applicable for import duty exemption',
        mandatory: true
      }
    );
  } else {
    commercialCompliance.push(
      {
        title: 'Tax Invoice (Faktur Pajak PP 44/2022), Company KLU & Signed Kwitansi (Materai)',
        note: 'Commercial DPP invoice first; Faktur Pajak dated on payment receipt',
        mandatory: true
      },
      {
        title: 'Manufacturer Authorization Letter / Local Support Statement',
        note: 'OEM authorization & domestic compliance commitment',
        mandatory: true
      }
    );
  }

  return [
    {
      categoryNo: 1,
      category: 'Commercial & Compliance',
      items: commercialCompliance
    },
    {
      categoryNo: 2,
      category: 'Technical & Engineering',
      items: [
        {
          title: 'Technical Specification Matrix & Equipment Datasheet',
          note: 'Design capacities, material grades (SUS304/food grade), and instrumentation list',
          mandatory: true
        },
        {
          title: 'General Arrangement (GA) Drawing & Machine Footprint Layout',
          note: 'Overall dimensions, maintenance clearances, and plant tie-in coordinates',
          mandatory: true
        },
        {
          title: 'Utility Consumption List (Power, Compressed Air, Water, Steam, Nitrogen)',
          note: 'Peak/average consumption rates and required supply pressures',
          mandatory: true
        },
        {
          title: 'P&ID (Piping & Instrumentation Diagram) & Electrical Schematic Diagram',
          note: 'Complete instrumentation loop tagging and control panel wiring schematics',
          mandatory: true
        },
        {
          title: 'Password-Free Latest PLC/HMI Source Code & Master Password Handover Commitment',
          note: 'Unlocked backup source code & Master Passwords prior to Final Acceptance',
          mandatory: true
        }
      ]
    },
    {
      categoryNo: 3,
      category: 'After-Sales & Spare Parts',
      items: [
        {
          title: 'Recommended 2-Year Spare Parts List',
          note: 'Complete with OEM Part Numbers, Lead Times & Unit Prices',
          mandatory: true
        },
        {
          title: 'Operation, Maintenance & Troubleshooting Manual',
          note: 'English / Bahasa Indonesia (including Halal-compliant lubricant schedule)',
          mandatory: true
        },
        {
          title: 'FAT (Factory Acceptance Test) & SAT (Site Acceptance Test) Protocol',
          note: 'Capability trial procedures, acceptance criteria, training sheets & Snag List template',
          mandatory: true
        }
      ]
    }
  ];
}

export function buildVendorInformationMatrix(vendor = {}) {
  const companyName = correctProcurementTypos(vendor.name || '');
  const addressParts = [vendor.address, vendor.city, vendor.postalCode].map(s => correctProcurementTypos(s || '')).filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const country = correctProcurementTypos(vendor.country || '');
  const origin = classifyVendorOrigin(country, vendor.origin);
  const originTag = getVendorOriginTag(origin, country);
  const equipmentOriginCountry = correctProcurementTypos(vendor.equipmentOriginCountry || country || '');
  const termOfPayment = correctProcurementTypos(
    vendor.termOfPayment || getDefaultTermOfPaymentByOrigin(origin, vendor.paymentCurrency)
  );

  const keyContacts = normalizeVendorKeyContacts({ ...vendor, origin, country }).map(c => ({
    role: c.role,
    name: c.name || VENDOR_TBC_MARKER,
    email: c.email || VENDOR_TBC_MARKER,
    phone: c.phone || VENDOR_TBC_MARKER
  }));

  return {
    origin,
    originTag,
    generalProfile: {
      companyName: companyName || VENDOR_TBC_MARKER,
      address: fullAddress || VENDOR_TBC_MARKER,
      country: country || VENDOR_TBC_MARKER,
      originTag,
      equipmentOriginCountry: equipmentOriginCountry || VENDOR_TBC_MARKER,
      termOfPayment: termOfPayment || VENDOR_TBC_MARKER
    },
    keyContacts,
    trsaDocuments: getVendorTRSADocumentMatrix(origin, country)
  };
}

export function formatVendorMatrixMarkdown(matrix) {
  if (!matrix) return '';
  const g = matrix.generalProfile || {};
  const lines = [
    '#### A. VENDOR GENERAL & COMMERCIAL PROFILE',
    '| Field | Details |',
    '| :--- | :--- |',
    `| **Company Name** | ${g.companyName || VENDOR_TBC_MARKER} |`,
    `| **Address** | ${g.address || VENDOR_TBC_MARKER} |`,
    `| **Country** | ${g.country || VENDOR_TBC_MARKER} *(Auto-Tag: ${g.originTag || 'FOREIGN VENDOR'})* |`,
    `| **Country of Origin of Equipment** | ${g.equipmentOriginCountry || VENDOR_TBC_MARKER} |`,
    `| **Term of Payment** | ${g.termOfPayment || VENDOR_TBC_MARKER} |`,
    '',
    '#### B. VENDOR KEY CONTACT PERSONS',
    '| Department / Role | Contact Name | Email Address | Phone / WhatsApp Number |',
    '| :--- | :--- | :--- | :--- |',
    ...(matrix.keyContacts || []).map(
      c => `| **${c.role}** | ${c.name || VENDOR_TBC_MARKER} | ${c.email || VENDOR_TBC_MARKER} | ${c.phone || VENDOR_TBC_MARKER} |`
    ),
    '',
    '#### C. LIST OF TRSA DOCUMENTS (ATTACHMENTS & DELIVERABLES)'
  ];

  for (const group of matrix.trsaDocuments || []) {
    lines.push(`${group.categoryNo}. **${group.category}:**`);
    for (const item of group.items || []) {
      lines.push(`   - ${item.title}${item.note ? ` *(${item.note})*` : ''}`);
    }
  }

  return lines.join('\n');
}

function matchContactRole(line = '') {
  const lower = line.toLowerCase();
  if (/\bproject\s*manager\b|\bpm\b/.test(lower)) return 'Project Manager';
  if (/\bspare\s*parts?\b|\bafter[\s-]*sales?\b|\bservice\b/.test(lower)) return 'Spare Part';
  if (/\bengineering\b|\btechnical\b|\bengineer\b/.test(lower)) return 'Engineering';
  if (/\bproject\b/.test(lower)) return 'Project';
  if (/\bfinance\b|\baccounting\b|\bbilling\b|\btax\b|\bap\b/.test(lower)) return 'Finance';
  if (/\bsales\b|\bcommercial\b|\baccount\b|\bbdm\b|\bexport\b|\bmarketing\b/.test(lower)) return 'Sales';
  return null;
}

const KNOWN_COUNTRY_KEYWORDS = [
  'Indonesia',
  'China',
  'Italy',
  'Netherlands',
  'Japan',
  'United States',
  'USA',
  'United Kingdom',
  'UK',
  'France',
  'Germany',
  'Switzerland',
  'Australia',
  'Singapore',
  'Malaysia',
  'South Korea',
  'Taiwan',
  'India',
  'Thailand',
  'Vietnam',
  'Spain',
  'Belgium',
  'Austria',
  'Denmark',
  'Sweden',
  'Turkey',
  'UAE'
];

export function parseRawVendorProfileText(rawText = '') {
  const corrected = correctProcurementTypos(rawText);
  const lines = corrected
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let name = '';
  let address = '';
  let city = '';
  let postalCode = '';
  let country = '';
  let equipmentOriginCountry = '';
  let termOfPayment = '';
  let equipmentType = '';
  let taxId = '';
  let website = '';
  let leadTimeWeeks = '';
  let paymentCurrency = '';

  const contactsMap = {};
  const unassignedContacts = [];

  for (const line of lines) {
    const kvMatch = line.match(/^([A-Za-z0-9\s/&().-]+?)\s*:\s*(.+)$/);
    const label = kvMatch ? kvMatch[1].trim().toLowerCase() : '';
    const value = kvMatch ? kvMatch[2].trim() : line;

    // 1. Check labeled general fields
    if (kvMatch && /(company|vendor|supplier|manufacturer|legal entity|nama perusahaan|perusahaan)/.test(label) && !/origin/.test(label)) {
      if (!name) name = value;
      continue;
    }
    if (kvMatch && /(country of origin|equipment origin|origin of equipment|made in|manufactured in|asal negara)/.test(label)) {
      equipmentOriginCountry = value;
      continue;
    }
    if (kvMatch && /(^country$|negara)/.test(label)) {
      country = value;
      continue;
    }
    if (kvMatch && /(address|alamat|office|factory|hq|location)/.test(label)) {
      address = address ? `${address}, ${value}` : value;
      continue;
    }
    if (kvMatch && /(city|kota)/.test(label)) {
      city = value;
      continue;
    }
    if (kvMatch && /(postal|zip|kode pos)/.test(label)) {
      postalCode = value;
      continue;
    }
    if (kvMatch && /(payment|term of payment|terms|top\b)/.test(label)) {
      termOfPayment = value;
      continue;
    }
    if (kvMatch && /(equipment|machinery|scope|line|produk|mesin)/.test(label) && !/origin/.test(label)) {
      if (!equipmentType) equipmentType = value;
      continue;
    }
    if (kvMatch && /(npwp|tax|vat|tin)/.test(label)) {
      taxId = value;
      continue;
    }
    if (kvMatch && /(web|url|site)/.test(label)) {
      website = value;
      continue;
    }
    if (kvMatch && /(lead\s*time|delivery\s*time)/.test(label)) {
      leadTimeWeeks = value;
      continue;
    }
    if (kvMatch && /(currency|mata uang)/.test(label)) {
      paymentCurrency = value;
      continue;
    }

    // 2. Check for contact person details (email, phone, or explicit role label)
    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = line.match(/(?:\+?\d[\d\s\-().]{6,}\d)/);
    const detectedRole = matchContactRole(label || line);

    if (detectedRole || emailMatch || phoneMatch) {
      let personName = '';
      let remainder = kvMatch ? kvMatch[2] : line;
      if (emailMatch) remainder = remainder.replace(emailMatch[0], '');
      if (phoneMatch) remainder = remainder.replace(phoneMatch[0], '');
      remainder = remainder
        .replace(/\b(email|e-mail|mail|tel|phone|hp|wa|whatsapp|mobile|pic|contact|mr\.?|ms\.?|mrs\.?|bapak|ibu)\b[:.]?/gi, '')
        .replace(/[|/<>()[\],;]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (remainder && remainder.length >= 2 && !/^\d+$/.test(remainder)) {
        personName = remainder.replace(/^[-–:\s]+|[-–:\s]+$/g, '').trim();
      }

      const contactEntry = {
        name: personName,
        email: emailMatch ? emailMatch[0].trim() : '',
        phone: phoneMatch ? phoneMatch[0].trim() : ''
      };

      if (detectedRole) {
        const prev = contactsMap[detectedRole] || {};
        contactsMap[detectedRole] = {
          role: detectedRole,
          name: prev.name || contactEntry.name,
          email: prev.email || contactEntry.email,
          phone: prev.phone || contactEntry.phone
        };
      } else {
        unassignedContacts.push(contactEntry);
      }
      continue;
    }

    // 3. Fallback heuristics for unlabeled lines
    if (!name && /\b(PT\.?|Co\.,?\s*Ltd\.?|GmbH|S\.p\.A\.|B\.V\.|Inc\.?|LLC|SAS|Ltd\.?|Pty\s*Ltd|Tbk|CV\.?)\b/i.test(line)) {
      name = line;
      continue;
    }
    if (!address && /\b(jl\.?|jalan|street|st\.?|road|rd\.?|ave\.?|avenue|blvd|boulevard|weg|straat|via|工业|kawasan|industri|park|block|blok|no\.?)\b/i.test(line)) {
      address = line;
      continue;
    }
    if (!termOfPayment && /\b(t\/t|tt\b|l\/c|lc\b|dp\b|down payment|at sight|retention|commissioning)\b/i.test(line)) {
      termOfPayment = line;
    }
  }

  // Detect country from raw text if not explicitly labeled
  if (!country) {
    const searchPool = `${address} ${lines.join(' ')}`;
    for (const candidate of KNOWN_COUNTRY_KEYWORDS) {
      if (new RegExp(`\\b${candidate}\\b`, 'i').test(searchPool)) {
        country = candidate === 'USA' || candidate === 'US' ? 'United States' : candidate === 'UK' ? 'United Kingdom' : candidate;
        break;
      }
    }
  }

  // Fallback website detection
  if (!website) {
    const urlMatch = corrected.match(/https?:\/\/[^\s]+|www\.[^\s]+/i);
    if (urlMatch) website = urlMatch[0];
  }

  // Map first unassigned contact to Sales if Sales is empty
  if (unassignedContacts.length > 0 && !contactsMap.Sales) {
    contactsMap.Sales = {
      role: 'Sales',
      ...unassignedContacts[0]
    };
  }

  const origin = classifyVendorOrigin(country);
  if (!paymentCurrency) {
    paymentCurrency = origin === 'Local' ? 'IDR (Rupiah)' : 'USD / EUR';
  }

  const keyContacts = VENDOR_CONTACT_ROLES.map(role => {
    const item = contactsMap[role] || {};
    return {
      role,
      name: item.name || '',
      email: item.email || '',
      phone: item.phone ? standardizeInternationalPhone(item.phone, country) : ''
    };
  });

  const primaryPic =
    keyContacts.find(c => c.name || c.email || c.phone) || { role: 'Sales', name: '', email: '', phone: '' };

  const vendorDraft = {
    name,
    address,
    city,
    postalCode,
    country,
    origin,
    equipmentOriginCountry: equipmentOriginCountry || country || '',
    equipmentType: equipmentType || 'Process Line',
    termOfPayment: termOfPayment || '',
    paymentCurrency,
    taxId,
    website,
    leadTimeWeeks: leadTimeWeeks || (origin === 'Local' ? '8 – 12 weeks' : '16 – 24 weeks'),
    picName: primaryPic.name,
    picRole: primaryPic.role,
    picEmail: primaryPic.email,
    picPhone: primaryPic.phone,
    keyContacts
  };

  return {
    vendorDraft,
    matrix: buildVendorInformationMatrix(vendorDraft)
  };
}
