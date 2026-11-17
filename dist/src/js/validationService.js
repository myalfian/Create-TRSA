/**
 * Real-Time Corporate Specification Validation Engine for TRSA Studio
 * Validates all 6 steps of PT Indofood Fortuna Makmur TRSA documents.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isBlank(val) {
  return val === null || val === undefined || String(val).trim().length === 0;
}

function makeError(fieldKey, step, label, message, selector = '') {
  return {
    fieldKey,
    step,
    label,
    message,
    selector
  };
}

/**
 * Validate a single field key and value.
 * Used both by full project validation and instant field-level validation.
 */
export function validateField(fieldKey, value, context = {}) {
  const str = String(value ?? '').trim();

  if (fieldKey === 'documentInfo.title') {
    if (!str) return { valid: false, message: 'Document Title is required.' };
    if (str.length < 5) return { valid: false, message: 'Document Title must be at least 5 characters.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'documentInfo.subTitle') {
    if (!str) return { valid: false, message: 'Sub Title / Equipment Line is required.' };
    if (str.length < 3) return { valid: false, message: 'Sub Title must be at least 3 characters.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'documentInfo.docNumber') {
    if (!str) return { valid: false, message: 'Official Document Number (No. TRSA) is required.' };
    if (!str.includes('TRSA')) {
      return { valid: false, message: 'Document Number must follow corporate TRSA format (e.g. 006/RAP/TRSA – 1403/MFG-IFM/VIII/2024).' };
    }
    return { valid: true, message: '' };
  }

  if (fieldKey === 'generalInfo.plantLocation') {
    if (!str) return { valid: false, message: 'Plant Location is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'generalInfo.countryOriginCategory') {
    if (!str) return { valid: false, message: 'Country of Origin category is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'generalInfo.countryOriginForeign') {
    if (context.category && context.category !== 'Local' && !str) {
      return { valid: false, message: 'Please select a Country of Origin.' };
    }
    return { valid: true, message: '' };
  }

  if (fieldKey === 'generalInfo.equipmentType') {
    if (!str) return { valid: false, message: 'Equipment Type is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'generalInfo.vendorName') {
    if (!str || str === '__custom__') {
      return { valid: false, message: 'Vendor Name (OEM / Manufacturer) is required.' };
    }
    if (str.length < 2) {
      return { valid: false, message: 'Vendor Name must be at least 2 characters.' };
    }
    return { valid: true, message: '' };
  }

  if (/^generalInfo\.equipmentModels\.\d+\.modelNumber$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Model / Line Tag is required.' };
    return { valid: true, message: '' };
  }

  if (/^generalInfo\.equipmentModels\.\d+\.designCapacity$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Design Capacity is required (e.g. 600 kg/hour).' };
    return { valid: true, message: '' };
  }

  if (/^revision\.\d+\.revision$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Revision number is required (e.g. 0.0).' };
    return { valid: true, message: '' };
  }

  if (/^revision\.\d+\.description$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Description of changes is required.' };
    return { valid: true, message: '' };
  }

  if (/^revision\.\d+\.originatedBy$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Originated By author name is required.' };
    return { valid: true, message: '' };
  }

  if (/^revision\.\d+\.date$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Revision date is required.' };
    if (!DATE_ISO_REGEX.test(str) || Number.isNaN(new Date(str).getTime())) {
      return { valid: false, message: 'Enter a valid date in YYYY-MM-DD format.' };
    }
    return { valid: true, message: '' };
  }

  if (fieldKey === 'projectOverview.description') {
    if (!str) return { valid: false, message: 'Project Purpose & Scope Overview is required.' };
    if (str.length < 15) return { valid: false, message: 'Please provide at least 15 characters describing project purpose.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'projectOverview.keyDates.lineStartUp') {
    if (!str) return { valid: false, message: 'Target Line Start-up date is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'projectOverview.keyDates.finalQuotationDrawings') {
    if (!str) return { valid: false, message: 'Final Quotation & Signed Agreement target is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'projectOverview.keyDates.orderPlacement') {
    if (!str) return { valid: false, message: 'Order Placement Target is required.' };
    return { valid: true, message: '' };
  }

  // Step 2: Contacts & Site
  if (/^contact\.\d+\.name$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Contact name is required.' };
    return { valid: true, message: '' };
  }

  if (/^contact\.\d+\.role$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Responsibility / Role is required.' };
    return { valid: true, message: '' };
  }

  if (/^contact\.\d+\.email$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Corporate email address is required.' };
    if (!EMAIL_REGEX.test(str)) {
      return { valid: false, message: 'Enter a valid email address (e.g. name@icbp.indofood.co.id).' };
    }
    return { valid: true, message: '' };
  }

  if (fieldKey === 'siteDescription.invoiceRecipient') {
    if (!str) return { valid: false, message: 'Company Invoicing Name is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'siteDescription.deliveryPort') {
    if (!str) return { valid: false, message: 'Delivery Port (Incoterm) is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'siteDescription.address') {
    if (!str) return { valid: false, message: 'Company Address / Plant Location is required.' };
    if (str.length < 10) return { valid: false, message: 'Please provide a complete plant address (min. 10 characters).' };
    return { valid: true, message: '' };
  }

  // Step 3: Product Specifications & Process Parameters
  if (/^product\.\d+\.shape$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Product Shape name is required.' };
    return { valid: true, message: '' };
  }

  if (/^product\.\d+\.description$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Product description & geometry is required.' };
    return { valid: true, message: '' };
  }

  if (/^product\.\d+\.capacityOutput$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Target output capacity is required.' };
    return { valid: true, message: '' };
  }

  if (/^product\.\d+\.moistureOutput$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Target output moisture spec is required.' };
    return { valid: true, message: '' };
  }

  if (/^product\.\d+\.oilContentOutput$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Target output oil content spec is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.frying.temperatureRange') {
    if (!str) return { valid: false, message: 'Frying Temperature Range is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.frying.dwellTime') {
    if (!str) return { valid: false, message: 'Frying Dwell Time is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.frying.oilCapacityInFryer') {
    if (!str) return { valid: false, message: 'Oil Capacity in Fryer is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.seasoning.requiredSeasoning') {
    if (!str) return { valid: false, message: 'Required Seasoning type is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.seasoning.seasoningApplicationRate') {
    if (!str) return { valid: false, message: 'Seasoning Application Rate (%w/w) is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'processParameters.seasoning.seasoningCapacity') {
    if (!str) return { valid: false, message: 'Seasoning Capacity is required.' };
    return { valid: true, message: '' };
  }

  // Step 4: Scope of Supply
  if (/^scope\.(fryer|seasoning)\.\d+\.title$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Equipment module title is required.' };
    return { valid: true, message: '' };
  }

  if (/^scope\.(fryer|seasoning)\.\d+\.qty$/.test(fieldKey)) {
    if (!str) return { valid: false, message: 'Equipment quantity is required.' };
    return { valid: true, message: '' };
  }

  // Step 5: Hygiene & Performance Acceptance
  if (fieldKey === 'hygieneAndQuality.foodContactMaterial') {
    if (!str) return { valid: false, message: 'Food Contact Surface Material is required (e.g. Stainless Steel 304).' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'performanceAcceptance.commissioningDuration') {
    if (!str) return { valid: false, message: 'Commissioning Trial Time per Product is required.' };
    return { valid: true, message: '' };
  }

  // Step 6: Commercial Terms & Sign-Off
  if (fieldKey === 'commercialTerms.selectedPaymentOption') {
    if (!['Matrix Standard', 'Option 1', 'Option 2'].includes(str)) {
      return { valid: false, message: 'Please select a Payment Term schedule (Matrix Standard, Option 1, or Option 2).' };
    }
    return { valid: true, message: '' };
  }

  if (fieldKey === 'signOff.seller.companyName') {
    if (!str) return { valid: false, message: 'Seller / OEM Company Name is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'signOff.seller.quotationNo') {
    if (!str) return { valid: false, message: 'Quotation Reference No. is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'signOff.seller.name') {
    if (!str) return { valid: false, message: 'Seller Authorized Signatory Name & Title is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'signOff.purchaser.name') {
    if (!str) return { valid: false, message: 'Purchaser Authorized Signatory Name is required.' };
    return { valid: true, message: '' };
  }

  if (fieldKey === 'signOff.purchaser.position') {
    if (!str) return { valid: false, message: 'Purchaser Authorized Position is required.' };
    return { valid: true, message: '' };
  }

  return { valid: true, message: '' };
}

/**
 * Validate the entire TRSA project and group errors by step and fieldKey.
 */
export function validateProject(project) {
  const errors = [];
  const p = project || {};
  const docInfo = p.documentInfo || {};
  const genInfo = p.generalInfo || {};
  const overview = p.projectOverview || {};
  const keyDates = overview.keyDates || {};
  const site = p.siteDescription || {};
  const proc = p.processParameters || {};
  const frying = proc.frying || {};
  const seasoning = proc.seasoning || {};
  const hygiene = p.hygieneAndQuality || {};
  const perf = p.performanceAcceptance || {};
  const commercial = p.commercialTerms || {};
  const signOff = p.signOff || {};
  const seller = signOff.seller || {};
  const purchaser = signOff.purchaser || {};

  const check = (fieldKey, value, step, label, selector = '', context = {}) => {
    const res = validateField(fieldKey, value, context);
    if (!res.valid) {
      errors.push(makeError(fieldKey, step, label, res.message, selector));
    }
  };

  // --- Step 1: Document Details, General Info, Revision History & Dates ---
  check('documentInfo.title', docInfo.title, 1, 'Document Title', '#doc-title');
  check('documentInfo.subTitle', docInfo.subTitle, 1, 'Sub Title / Equipment Line', '#doc-subtitle');
  check('documentInfo.docNumber', docInfo.docNumber, 1, 'Document Number (No. TRSA)', '#doc-number');
  check('generalInfo.plantLocation', genInfo.plantLocation || docInfo.plantLocation, 1, 'Plant Location', '#gen-plant-location');
  check('generalInfo.countryOriginCategory', genInfo.countryOriginCategory || 'Foreign', 1, 'Country of Origin', '#gen-country-category');
  if ((genInfo.countryOriginCategory || 'Foreign') !== 'Local') {
    check('generalInfo.countryOriginForeign', genInfo.countryOriginForeign || genInfo.countryOfOrigin, 1, 'Country of Origin (CoO)', '#gen-country-origin', { category: genInfo.countryOriginCategory || 'Foreign' });
  }
  check('generalInfo.equipmentType', genInfo.equipmentType || genInfo.machineType, 1, 'Equipment Type', '#gen-equipment-type');
  check('generalInfo.vendorName', genInfo.vendorName, 1, 'Vendor Name (OEM / Manufacturer)', '#gen-vendor-custom, #gen-vendor-select');

  const models = Array.isArray(genInfo.equipmentModels) && genInfo.equipmentModels.length > 0
    ? genInfo.equipmentModels
    : [{ modelNumber: genInfo.modelNumber, designCapacity: genInfo.designCapacity }];

  models.forEach((m, idx) => {
    check(
      `generalInfo.equipmentModels.${idx}.modelNumber`,
      m?.modelNumber,
      1,
      `Equipment #${idx + 1} Model / Line Tag`,
      `[data-model-idx="${idx}"][data-model-field="modelNumber"]`
    );
    check(
      `generalInfo.equipmentModels.${idx}.designCapacity`,
      m?.designCapacity,
      1,
      `Equipment #${idx + 1} Design Capacity`,
      `[data-model-idx="${idx}"][data-model-field="designCapacity"]`
    );
  });

  const revisions = Array.isArray(docInfo.revisionHistory) ? docInfo.revisionHistory : [];
  if (revisions.length === 0) {
    errors.push(makeError('revision.list', 1, 'Revision History', 'At least one revision history entry is required.', '#revision-rows'));
  } else {
    revisions.forEach((rev, idx) => {
      check(`revision.${idx}.revision`, rev?.revision, 1, `Revision Row #${idx + 1} Code`, `[data-rev-idx="${idx}"][data-field="revision"]`);
      check(`revision.${idx}.description`, rev?.description, 1, `Revision Row #${idx + 1} Description`, `[data-rev-idx="${idx}"][data-field="description"]`);
      check(`revision.${idx}.originatedBy`, rev?.originatedBy, 1, `Revision Row #${idx + 1} Author`, `[data-rev-idx="${idx}"][data-field="originatedBy"]`);
      check(`revision.${idx}.date`, rev?.date, 1, `Revision Row #${idx + 1} Date`, `[data-rev-idx="${idx}"][data-field="date"]`);
    });
  }

  check('projectOverview.description', overview.description, 1, 'II. Project Purpose & Scope Overview', '#project-desc');
  check('projectOverview.keyDates.lineStartUp', keyDates.lineStartUp, 1, 'Target Line Start-up', '#date-startup');
  check('projectOverview.keyDates.finalQuotationDrawings', keyDates.finalQuotationDrawings, 1, 'Final Quotation & Signed Agreement', '#date-quotation');
  check('projectOverview.keyDates.orderPlacement', keyDates.orderPlacement, 1, 'Order Placement Target', '#date-po');

  // --- Step 2: Key Contacts & Site ---
  const contacts = Array.isArray(p.keyContacts) ? p.keyContacts : [];
  if (contacts.length === 0) {
    errors.push(makeError('contact.list', 2, 'Key Contacts', 'At least one key contact is required.', '#contact-list-container'));
  } else {
    contacts.forEach((c, idx) => {
      check(`contact.${idx}.name`, c?.name, 2, `Contact #${idx + 1} Name`, `[data-contact-idx="${idx}"][data-field="name"]`);
      check(`contact.${idx}.role`, c?.role, 2, `Contact #${idx + 1} Role`, `[data-contact-idx="${idx}"][data-field="role"]`);
      check(`contact.${idx}.email`, c?.email, 2, `Contact #${idx + 1} Email`, `[data-contact-idx="${idx}"][data-field="email"]`);
    });
  }

  check('siteDescription.invoiceRecipient', site.invoiceRecipient, 2, 'Company Invoicing Name', '#site-recipient');
  check('siteDescription.deliveryPort', site.deliveryPort, 2, 'Delivery Port (Incoterm)', '#site-port');
  check('siteDescription.address', site.address, 2, 'Company Address / Plant Location', '#site-address');

  // --- Step 3: Product Specifications & Process Parameters ---
  const products = Array.isArray(p.productSpecifications) ? p.productSpecifications : [];
  if (products.length === 0) {
    errors.push(makeError('product.list', 3, 'Product Specifications', 'At least one product specification is required.', '#trsa-builder-form'));
  } else {
    products.forEach((prod, idx) => {
      check(`product.${idx}.shape`, prod?.shape, 3, `Product #${idx + 1} Shape`, `[data-prod-idx="${idx}"][data-field="shape"]`);
      check(`product.${idx}.description`, prod?.description, 3, `Product #${idx + 1} Description`, `[data-prod-idx="${idx}"][data-field="description"]`);
      check(`product.${idx}.capacityOutput`, prod?.capacityOutput, 3, `Product #${idx + 1} Capacity`, `[data-prod-idx="${idx}"][data-field="capacityOutput"]`);
      check(`product.${idx}.moistureOutput`, prod?.moistureOutput, 3, `Product #${idx + 1} Moisture (Out)`, `[data-prod-idx="${idx}"][data-field="moistureOutput"]`);
      check(`product.${idx}.oilContentOutput`, prod?.oilContentOutput, 3, `Product #${idx + 1} Oil Content (Out)`, `[data-prod-idx="${idx}"][data-field="oilContentOutput"]`);
    });
  }

  check('processParameters.frying.temperatureRange', frying.temperatureRange, 3, 'Frying Temperature Range', '#proc-fry-temp');
  check('processParameters.frying.dwellTime', frying.dwellTime, 3, 'Frying Dwell Time', '#proc-fry-dwell');
  check('processParameters.frying.oilCapacityInFryer', frying.oilCapacityInFryer, 3, 'Oil Capacity in Fryer', '#proc-fry-oil');
  check('processParameters.seasoning.requiredSeasoning', seasoning.requiredSeasoning, 3, 'Required Seasoning', '#proc-seas-type');
  check('processParameters.seasoning.seasoningApplicationRate', seasoning.seasoningApplicationRate, 3, 'Seasoning Application Rate', '#proc-seas-rate');
  check('processParameters.seasoning.seasoningCapacity', seasoning.seasoningCapacity, 3, 'Seasoning Capacity', '#proc-seas-cap');

  // --- Step 4: Project Scope of Supply ---
  const scope = p.scopeOfSupply || {};
  ['fryer', 'seasoning'].forEach((scopeType) => {
    const list = Array.isArray(scope[scopeType]) ? scope[scopeType] : [];
    if (list.length === 0) {
      errors.push(makeError(`scope.${scopeType}.list`, 4, `${scopeType === 'fryer' ? 'Fryer' : 'Seasoning'} Scope`, `At least one ${scopeType} scope item is required.`, `#${scopeType}-scope-container`));
    } else {
      list.forEach((item, idx) => {
        check(`scope.${scopeType}.${idx}.title`, item?.title, 4, `${scopeType === 'fryer' ? 'Fryer' : 'Seasoning'} Item #${idx + 1} Title`, `[data-scope-type="${scopeType}"][data-scope-idx="${idx}"][data-field="title"]`);
        check(`scope.${scopeType}.${idx}.qty`, item?.qty, 4, `${scopeType === 'fryer' ? 'Fryer' : 'Seasoning'} Item #${idx + 1} Quantity`, `[data-scope-type="${scopeType}"][data-scope-idx="${idx}"][data-field="qty"]`);
      });
    }
  });

  // --- Step 5: Hygiene & Performance ---
  check('hygieneAndQuality.foodContactMaterial', hygiene.foodContactMaterial, 5, 'Food Contact Surface Material', '#hygiene-material');
  check('performanceAcceptance.commissioningDuration', perf.commissioningDuration, 5, 'Commissioning Trial Time per Product', '#comm-duration');

  // --- Step 6: Commercial Terms & Sign-off ---
  check('commercialTerms.selectedPaymentOption', commercial.selectedPaymentOption, 6, 'Payment Terms Option');
  check('signOff.seller.companyName', seller.companyName, 6, 'Seller Company Name', '#sign-seller-company');
  check('signOff.seller.quotationNo', seller.quotationNo, 6, 'Quotation Reference No.', '#sign-seller-quote');
  const sellerSignVal = !isBlank(seller.name) && !isBlank(seller.position)
    ? `${seller.name} - ${seller.position}`
    : (seller.name || seller.position || '');
  check('signOff.seller.name', sellerSignVal, 6, 'Seller Authorized Signatory', '#sign-seller-name');
  check('signOff.purchaser.name', purchaser.name, 6, 'IFM Authorized Signatory Name', '#sign-ifm-name');
  check('signOff.purchaser.position', purchaser.position, 6, 'IFM Signatory Position', '#sign-ifm-pos');

  const errorsByKey = {};
  const byStep = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const err of errors) {
    errorsByKey[err.fieldKey] = err;
    if (byStep[err.step]) {
      byStep[err.step].push(err);
    }
  }

  return {
    valid: errors.length === 0,
    totalErrors: errors.length,
    errors,
    errorsByKey,
    byStep
  };
}

/**
 * Return validation summary for a single builder step (1..6).
 */
export function validateStep(project, step) {
  const full = validateProject(project);
  const stepErrors = full.byStep[step] || [];
  const errorsByKey = {};
  for (const err of stepErrors) {
    errorsByKey[err.fieldKey] = err;
  }
  return {
    valid: stepErrors.length === 0,
    step,
    count: stepErrors.length,
    errors: stepErrors,
    errorsByKey
  };
}

/**
 * Convenience helper to look up an error message by fieldKey.
 */
export function getFieldError(validationResult, fieldKey) {
  return validationResult?.errorsByKey?.[fieldKey]?.message || null;
}
