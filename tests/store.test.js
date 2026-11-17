// Setup minimal headless DOM environment for Node
globalThis.window = { 
  addEventListener: () => {}, 
  removeEventListener: () => {}, 
  scrollTo: () => {} 
};
globalThis.localStorage = { 
  _data: {},
  getItem(k) { return this._data[k] || null; }, 
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
globalThis.document = { 
  getElementById: () => null, 
  querySelectorAll: () => [] 
};

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';
import { TRSAStore, PLANT_DATABASE, getPlantDatabase, VENDOR_ORIGIN_CONFIG, getVendorOriginConfig, COUNTRY_ORIGIN_OPTIONS, FOREIGN_COUNTRY_OPTIONS, EQUIPMENT_TYPE_OPTIONS, VENDOR_DATABASE, getVendorDetails, parseCountryOfOrigin, formatCountryOfOrigin, ensureGeneralInfo } from '../src/js/app.js';
import { getAuditLogs } from '../src/js/auditService.js';

describe('TRSA Store and Business Logic Tests', () => {
  // Mock store calculation logic
  function calculateProgress(proj) {
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

  test('Calculate progress of preloaded complete project should be 100%', () => {
    const progress = calculateProgress(defaultTRSAProject);
    assert.strictEqual(progress, 100);
  });

  test('Calculate progress of empty/draft project', () => {
    const draft = {
      documentInfo: { docNumber: 'TEST-001' },
      keyContacts: [],
      productSpecifications: [],
      scopeOfSupply: { fryer: [], seasoning: [] }
    };
    const progress = calculateProgress(draft);
    assert.strictEqual(progress, 14); // 1/7
  });

  test('Project duplication integrity', () => {
    const original = JSON.parse(JSON.stringify(defaultTRSAProject));
    const cloned = JSON.parse(JSON.stringify(original));
    cloned.id = 'trsa-clone-123';
    cloned.documentInfo.title = original.documentInfo.title + ' (Copy)';
    cloned.documentInfo.status = 'Draft';

    assert.notStrictEqual(cloned.id, original.id);
    assert.strictEqual(cloned.documentInfo.status, 'Draft');
    assert.strictEqual(cloned.productSpecifications.length, original.productSpecifications.length);
    assert.strictEqual(cloned.scopeOfSupply.fryer.length, 14);
  });

  test('JSON serialization and round-trip parsing', () => {
    const jsonStr = JSON.stringify(defaultTRSAProject);
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.id, defaultTRSAProject.id);
    assert.strictEqual(parsed.documentInfo.docNumber, defaultTRSAProject.documentInfo.docNumber);
    assert.strictEqual(parsed.scopeOfSupply.fryer.length, defaultTRSAProject.scopeOfSupply.fryer.length);
  });

  test('Revision History: Originated By auto-filled with active logged-in user', () => {
    const store = new TRSAStore();
    const today = new Date().toISOString().split('T')[0];

    // Default user is Moh Yusuf Alfian
    assert.strictEqual(store.getCurrentUser().name, 'Moh Yusuf Alfian');

    // Switch user to Refin A Putra
    store.setCurrentUser('Refin A Putra');
    assert.strictEqual(store.getCurrentUser().name, 'Refin A Putra');
    assert.strictEqual(store.getCurrentUser().dept, 'MFG');

    // Add new revision row
    const newRev = store.addRevisionRow();
    assert.ok(newRev, 'New revision row should be returned');
    assert.strictEqual(newRev.originatedBy, 'Refin A Putra', 'Originated By must auto-fill with active logged-in user');
    assert.strictEqual(newRev.date, today, 'Date must auto-fill with today');

    // Switch user to Natalia Happy
    store.setCurrentUser('Natalia Happy');
    assert.strictEqual(store.getCurrentUser().name, 'Natalia Happy');

    // Stamp previous revision row with current user
    const proj = store.getActiveProject();
    const lastIdx = proj.documentInfo.revisionHistory.length - 1;
    store.stampRevisionRow(lastIdx);
    assert.strictEqual(proj.documentInfo.revisionHistory[lastIdx].originatedBy, 'Natalia Happy');
    assert.strictEqual(proj.documentInfo.revisionHistory[lastIdx].date, today);
  });

  test('Revision History: Date automatically updated when revision is saved', () => {
    const store = new TRSAStore();
    const today = new Date().toISOString().split('T')[0];
    const proj = store.getActiveProject();

    // Ensure there is at least one revision with an older or empty date
    if (!proj.documentInfo.revisionHistory || proj.documentInfo.revisionHistory.length === 0) {
      proj.documentInfo.revisionHistory = [{ revision: '0.0', description: 'Initial', originatedBy: 'Test', date: '2020-01-01' }];
    } else {
      proj.documentInfo.revisionHistory[proj.documentInfo.revisionHistory.length - 1].date = '2020-01-01';
    }

    assert.strictEqual(proj.documentInfo.revisionHistory[proj.documentInfo.revisionHistory.length - 1].date, '2020-01-01');

    // Save revision history
    store.saveRevisionHistory();

    // Date must be automatically updated to current save date
    assert.strictEqual(proj.documentInfo.revisionHistory[proj.documentInfo.revisionHistory.length - 1].date, today, 'Date must be auto-populated with current save date');
  });

  test('IV. Site Location & Invoicing Address auto-populated from Plant Database', () => {
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Test database master resolution
    const semarang = getPlantDatabase('Semarang Plant');
    assert.strictEqual(semarang.code, '1403');
    assert.strictEqual(semarang.deliveryPort, 'Semarang Port (CIF/CIP)');
    assert.ok(semarang.address.includes('Tambak Aji IV'));

    const cikupa = getPlantDatabase('Cikupa Plant');
    assert.strictEqual(cikupa.code, '1405');
    assert.strictEqual(cikupa.deliveryPort, 'Tanjung Priok Port, Jakarta (CIF/CIP)');
    assert.ok(cikupa.address.includes('Bhumimas II'));

    const cikokol = getPlantDatabase('Cikokol Plant');
    assert.strictEqual(cikokol.code, '1402');
    assert.ok(cikokol.address.includes('Wisma Damatex'));

    const agro = getPlantDatabase('Agro Plant');
    assert.strictEqual(agro.code, '1411');
    assert.ok(agro.address.includes('Wisma Damatex'));

    // 2. Test auto-population when plant location changes to Cikupa
    store.updatePlantLocation('Cikupa Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Cikupa Plant');
    assert.strictEqual(proj.siteDescription.deliveryPort, cikupa.deliveryPort);
    assert.strictEqual(proj.siteDescription.address, cikupa.address);
    assert.strictEqual(proj.siteDescription.invoiceRecipient, cikupa.invoiceRecipient);
    assert.ok(proj.documentInfo.docNumber.includes('1405'), 'Doc Number should update plant code to 1405');

    // 3. Test auto-population when plant location changes back to Semarang
    store.updatePlantLocation('Semarang Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Semarang Plant');
    assert.strictEqual(proj.siteDescription.deliveryPort, semarang.deliveryPort);
    assert.strictEqual(proj.siteDescription.address, semarang.address);
    assert.ok(proj.documentInfo.docNumber.includes('1403'), 'Doc Number should update plant code to 1403');
  });

  test('Custom Clearance & Shipping Clause: Admin-only access validation', () => {
    const store = new TRSAStore();

    // Default user is Moh Yusuf Alfian (Manager / Admin)
    store.setCurrentUser('Moh Yusuf Alfian');
    assert.strictEqual(store.isAdmin(), true, 'Moh Yusuf Alfian (Manager) must have admin privileges');

    // Project Engineer user (Refin A Putra)
    store.setCurrentUser('Refin A Putra');
    assert.strictEqual(store.isAdmin(), false, 'Refin A Putra (Project Engineer) must not have admin privileges');

    // Purchasing Supervisor user (Natalia Happy)
    store.setCurrentUser('Natalia Happy');
    assert.strictEqual(store.isAdmin(), false, 'Natalia Happy (Purchasing) must not have admin privileges');

    // Murdani (Project & Engineering)
    store.setCurrentUser('Murdani');
    assert.strictEqual(store.isAdmin(), false, 'Murdani must not have admin privileges');
  });

  test('Product Specifications & Process Parameters Canvas: Visual canvas selection and data integrity', () => {
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // Verify default 4 products loaded
    assert.strictEqual(proj.productSpecifications.length, 4);
    assert.strictEqual(proj.productSpecifications[0].shape, '3D Chicken Legs');
    assert.strictEqual(proj.productSpecifications[1].shape, '3D Golgappa Pellets');
    assert.strictEqual(proj.productSpecifications[2].shape, '3D Star Pellets');
    assert.strictEqual(proj.productSpecifications[3].shape, '2D Pierced Chips');

    // Verify Process Parameters integrity
    assert.strictEqual(proj.processParameters.frying.dwellTime, '20 – 30 seconds');
    assert.strictEqual(proj.processParameters.seasoning.requiredSeasoning, 'Dry only');

    // Test selection of canvas tab
    store.selectedProductIdx = 2; // 3D Star Pellets
    assert.strictEqual(store.selectedProductIdx, 2);
    assert.strictEqual(proj.productSpecifications[store.selectedProductIdx].shape, '3D Star Pellets');

    // Test adding product variant
    proj.productSpecifications.push({
      id: 'prod-new',
      shape: '3D Pillow Snack',
      description: 'Pillow shape filled snack',
      dimensionInput: '25 x 25 mm',
      dimensionOutput: 'NA',
      capacityOutput: '600 Kg/hour',
      bulkDensityInput: '320 g/l',
      bulkDensityOutput: '55 g/l',
      moistureInput: '10.5%',
      moistureOutput: '1.5%',
      oilContentInput: 'N/A',
      oilContentOutput: '30%'
    });
    assert.strictEqual(proj.productSpecifications.length, 5);
    assert.strictEqual(proj.productSpecifications[4].shape, '3D Pillow Snack');
  });

  test('Audit Trail & Traceability: Automatically records who, when, and what changed during store operations', () => {
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Initial baseline audit entry exists
    const initialLogs = getAuditLogs();
    assert.ok(initialLogs.length >= 1, 'Initial baseline audit log must exist');

    // 2. Perform an operation: Change plant location
    store.setCurrentUser('Moh Yusuf Alfian');
    store.updatePlantLocation('Cikupa Plant');

    const updatedLogs = getAuditLogs(proj.id);
    assert.ok(updatedLogs.length >= 2, 'New audit entry should be added');

    const latest = updatedLogs[0];
    assert.strictEqual(latest.action, 'PLANT_CHANGE', 'Action must reflect plant change');
    assert.strictEqual(latest.userName, 'Moh Yusuf Alfian', 'Must record who made the change');
    assert.strictEqual(latest.projectId, proj.id);
    assert.ok(latest.createdAt, 'Must record when the change was made');

    // Verify detailed before & after diffs
    assert.ok(latest.diffDetails && latest.diffDetails.length > 0, 'Must record what was changed');
    const plantDiff = latest.diffDetails.find(d => d.category.includes('Plant'));
    assert.ok(plantDiff, 'Must contain plant diff');
    assert.strictEqual(plantDiff.to, 'Cikupa Plant', 'Must record new value');
  });

  test('Vendor Origin Selection (Foreign, Local, Mixed): Updates terms, provisions & audit trail', () => {
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Initial default is Foreign
    assert.strictEqual(proj.documentInfo.vendorOrigin || 'Foreign', 'Foreign');
    const foreignCfg = getVendorOriginConfig('Foreign');
    assert.strictEqual(foreignCfg.origin, 'Foreign');
    assert.ok(foreignCfg.label.includes('Foreign'));

    // 2. Switch to Local (Plant 1403)
    store.setCurrentUser('Moh Yusuf Alfian');
    const localCfg = store.updateVendorOrigin('Local');
    assert.ok(localCfg);
    assert.strictEqual(proj.documentInfo.vendorOrigin, 'Local');
    assert.strictEqual(proj.commercialTerms.vendorOrigin, 'Local');
    assert.ok(proj.commercialTerms.shipmentTerms.includes('Franco Site'), 'Local vendor shipment must use domestic Franco Site terms');
    assert.ok(proj.legalAndTaxProvisions.some(p => p.title.includes('Local Vendor Taxation') && p.description.includes('PPN') && p.description.includes('PP No. 44 Tahun 2022')), 'Local vendor provisions on 1403 must enforce PPN, PPh, KLU, PP 44/2022 & Materai');
    assert.ok(!proj.legalAndTaxProvisions.some(p => p.matrixId === 'XVI.pph26'), 'Plant 1403 Local must not include Plant 1411 Foreign PPh 26');

    // 3. Switch to Mixed (Plant 1403)
    const mixedCfg = store.updateVendorOrigin('Mixed');
    assert.ok(mixedCfg);
    assert.strictEqual(proj.documentInfo.vendorOrigin, 'Mixed');
    assert.strictEqual(proj.commercialTerms.vendorOrigin, 'Mixed');
    assert.ok(proj.commercialTerms.shipmentTerms.includes('Dual Terms'), 'Mixed vendor shipment must use Dual Terms');
    assert.ok(proj.legalAndTaxProvisions.some(p => p.matrixId === 'XVI.local'), 'Mixed vendor on 1403 includes Local Taxation');
    assert.ok(proj.legalAndTaxProvisions.some(p => p.matrixId === 'XVI.visa'), 'Includes Visa & Engineer Mobilization');

    // 4. Plant 1411 + Foreign triggers Import Duty Exemption & PPh 26 / PMK 35/2019
    store.updatePlantLocation('Agro Plant');
    store.updateVendorOrigin('Foreign');
    assert.ok(proj.legalAndTaxProvisions.some(p => p.matrixId === 'XVI.duty'), 'Plant 1411 Foreign must require CoO duty exemption & 14 days free demurrage');
    assert.ok(proj.legalAndTaxProvisions.some(p => p.matrixId === 'XVI.pph26'), 'Plant 1411 Foreign must enforce PPh 26 & PMK 35/2019');

    // 5. Fallback on invalid origin
    store.updateVendorOrigin('InvalidOrigin');
    assert.strictEqual(proj.documentInfo.vendorOrigin, 'Foreign', 'Invalid origin should fall back to Foreign');
  });

  test('General Information Section: Verification of Plant Location, Country of Origin dropdown, Equipment Type dropdown, Vendor Name, and auto-sync', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Ensure generalInfo is populated
    assert.ok(proj.generalInfo, 'generalInfo object must exist');
    assert.strictEqual(proj.generalInfo.plantLocation, 'Semarang Plant');
    assert.strictEqual(proj.generalInfo.countryOfOrigin, 'Japan');
    assert.ok(proj.generalInfo.equipmentType || proj.generalInfo.machineType);

    // 2. Verify Country of Origin & Equipment Type Options lists
    assert.ok(Array.isArray(COUNTRY_ORIGIN_OPTIONS), 'COUNTRY_ORIGIN_OPTIONS must be an array');
    assert.ok(COUNTRY_ORIGIN_OPTIONS.includes('Japan'));
    assert.ok(COUNTRY_ORIGIN_OPTIONS.includes('Germany'));
    assert.ok(COUNTRY_ORIGIN_OPTIONS.includes('Indonesia'));

    assert.ok(Array.isArray(EQUIPMENT_TYPE_OPTIONS), 'EQUIPMENT_TYPE_OPTIONS must be an array');
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Process Line'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Frying System'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Seasoning System'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Flight Belt Elevator (FBE)'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Distribution System'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Packaging System'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Auto Case Packer'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Finished Good Conveyor'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Carton Sealer'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Palletizer'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Oil Free Compressor'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Nitrogen Generator'));
    assert.ok(EQUIPMENT_TYPE_OPTIONS.includes('Generator Set'));

    // 3. Update General Information fields
    store.setCurrentUser('Moh Yusuf Alfian');
    store.updateGeneralInfo({
      countryOfOrigin: 'Germany',
      equipmentType: 'Process Line',
      machineType: 'Process Line',
      vendorName: 'Kiremko B.V. & Florigo',
      modelNumber: 'KRM-750 Pro',
      designCapacity: '750 kg/hour (Pellet Output)'
    });

    assert.strictEqual(proj.generalInfo.countryOfOrigin, 'Germany');
    assert.strictEqual(proj.generalInfo.equipmentType, 'Process Line');
    assert.strictEqual(proj.generalInfo.vendorName, 'Kiremko B.V. & Florigo');
    assert.strictEqual(proj.generalInfo.modelNumber, 'KRM-750 Pro');
    assert.strictEqual(proj.generalInfo.designCapacity, '750 kg/hour (Pellet Output)');

    // 4. Updating Plant Location synchronizes generalInfo.plantLocation
    store.updatePlantLocation('Cikupa Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Cikupa Plant');
    assert.strictEqual(proj.generalInfo.plantLocation, 'Cikupa Plant');
    assert.ok(proj.documentInfo.docNumber.includes('1405'), 'Cikupa plant code must be 1405');

    // 5. Updating Plant Location to Cikokol (1402) and Agro (1411)
    store.updatePlantLocation('Cikokol Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Cikokol Plant');
    assert.ok(proj.documentInfo.docNumber.includes('1402'), 'Cikokol plant code must be 1402');

    store.updatePlantLocation('Agro Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Agro Plant');
    assert.ok(proj.documentInfo.docNumber.includes('1411'), 'Agro plant code must be 1411');

    // 6. Audit Trail captures General Information updates
    const logs = getAuditLogs(proj.id);
    assert.ok(logs.length >= 1, 'Audit log must record updates');
    assert.ok(logs.some(l => l.userName === 'Moh Yusuf Alfian'));
  });

  test('Vendor Details Database: Verify vendor list, country, OEM origin, and helper lookup', () => {
    assert.ok(Array.isArray(VENDOR_DATABASE), 'VENDOR_DATABASE must be an array');
    assert.ok(VENDOR_DATABASE.length >= 15, 'Must contain comprehensive pre-vetted OEM vendors');

    // 1. Verify specific international and local vendors exist
    const heatControl = getVendorDetails('Heat and Control, Inc.');
    assert.ok(heatControl, 'Heat and Control, Inc. must exist');
    assert.strictEqual(heatControl.country, 'United States');
    assert.strictEqual(heatControl.origin, 'Foreign');
    assert.strictEqual(heatControl.equipmentType, 'Frying System');

    const ishida = getVendorDetails('Ishida Co., Ltd.');
    assert.ok(ishida, 'Ishida must exist');
    assert.strictEqual(ishida.country, 'Japan');
    assert.strictEqual(ishida.origin, 'Foreign');
    assert.strictEqual(ishida.equipmentType, 'Packaging System');

    const rekatama = getVendorDetails('PT Fabrikasi Rekatama Mandiri');
    assert.ok(rekatama, 'PT Fabrikasi Rekatama Mandiri must exist');
    assert.strictEqual(rekatama.country, 'Indonesia');
    assert.strictEqual(rekatama.origin, 'Local');

    // 2. Case-insensitive lookup
    const kiremko = getVendorDetails('kiremko b.v.');
    assert.ok(kiremko, 'Case-insensitive lookup must succeed');
    assert.strictEqual(kiremko.country, 'Netherlands');

    // 3. Unknown vendor returns null
    assert.strictEqual(getVendorDetails('NonExistent OEM'), null);
  });

  test('Equipment Models & Design Capacities: Can add, update, and remove multiple models with respective design capacities', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Initial project has 1 default model
    assert.ok(Array.isArray(proj.generalInfo.equipmentModels));
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 1);
    assert.strictEqual(proj.generalInfo.equipmentModels[0].modelNumber, 'SPF-600 Continuous');
    assert.strictEqual(proj.generalInfo.equipmentModels[0].designCapacity, '600 kg/hour (Pellet Output)');

    // 2. Add second equipment model (e.g. Coating Drum)
    const model2 = store.addEquipmentModel();
    assert.ok(model2, 'Must return newly added equipment model');
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 2);

    // 3. Update model #2 Line Tag and Design Capacity
    store.updateEquipmentModel(1, 'modelNumber', 'TMB-700 Continuous Coating Drum');
    store.updateEquipmentModel(1, 'designCapacity', '635 - 700 kg/hour (Seasoning Output)');
    assert.strictEqual(proj.generalInfo.equipmentModels[1].modelNumber, 'TMB-700 Continuous Coating Drum');
    assert.strictEqual(proj.generalInfo.equipmentModels[1].designCapacity, '635 - 700 kg/hour (Seasoning Output)');

    // 4. Add third equipment model (e.g. Weigh Feeder)
    const model3 = store.addEquipmentModel();
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 3);
    store.updateEquipmentModel(2, 'modelNumber', 'WGH-25 Automated Loss-in-Weight Feeder');
    store.updateEquipmentModel(2, 'designCapacity', '1.5 - 2.5 kg/batch infeed rate');
    assert.strictEqual(proj.generalInfo.equipmentModels[2].modelNumber, 'WGH-25 Automated Loss-in-Weight Feeder');

    // 5. Verify legacy modelNumber and designCapacity sync contains all models
    assert.ok(proj.generalInfo.modelNumber.includes('SPF-600'));
    assert.ok(proj.generalInfo.modelNumber.includes('TMB-700'));
    assert.ok(proj.generalInfo.designCapacity.includes('600 kg/hour'));
    assert.ok(proj.generalInfo.designCapacity.includes('635 - 700 kg/hour'));

    // 6. Remove model #2 (index 1)
    const removed = store.removeEquipmentModel(1);
    assert.strictEqual(removed, true);
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 2);
    assert.strictEqual(proj.generalInfo.equipmentModels[0].modelNumber, 'SPF-600 Continuous');
    assert.strictEqual(proj.generalInfo.equipmentModels[1].modelNumber, 'WGH-25 Automated Loss-in-Weight Feeder');

    // 7. Cannot remove when only 1 model left
    store.removeEquipmentModel(1);
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 1);
    const blockedRemoval = store.removeEquipmentModel(0);
    assert.strictEqual(blockedRemoval, false, 'Cannot remove the last remaining equipment model');
    assert.strictEqual(proj.generalInfo.equipmentModels.length, 1);
  });

  test('Country of Origin Dropdown: Local, Foreign (Dropdown CoO), and Mixed (Indonesia & Foreign (Dropdown CoO))', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    // 1. Initial State parsing
    const initial = parseCountryOfOrigin(proj.generalInfo.countryOfOrigin);
    assert.strictEqual(initial.category, 'Foreign');
    assert.strictEqual(initial.foreignCountry, 'Japan');

    // 2. Select Local
    store.updateCountryOfOrigin('Local');
    assert.strictEqual(proj.generalInfo.countryOriginCategory, 'Local');
    assert.strictEqual(proj.generalInfo.countryOfOrigin, 'Local (Indonesia)');
    const localParsed = parseCountryOfOrigin(proj.generalInfo.countryOfOrigin);
    assert.strictEqual(localParsed.category, 'Local');
    assert.strictEqual(localParsed.fullDisplay, 'Local');

    // 3. Select Foreign with specific foreign CoO
    store.updateCountryOfOrigin('Foreign', 'Germany');
    assert.strictEqual(proj.generalInfo.countryOriginCategory, 'Foreign');
    assert.strictEqual(proj.generalInfo.countryOriginForeign, 'Germany');
    assert.strictEqual(proj.generalInfo.countryOfOrigin, 'Foreign (Germany)');
    const foreignParsed = parseCountryOfOrigin(proj.generalInfo.countryOfOrigin);
    assert.strictEqual(foreignParsed.category, 'Foreign');
    assert.strictEqual(foreignParsed.foreignCountry, 'Germany');

    // 4. Select Mixed (Indonesia & Foreign CoO)
    store.updateCountryOfOrigin('Mixed', 'Netherlands');
    assert.strictEqual(proj.generalInfo.countryOriginCategory, 'Mixed');
    assert.strictEqual(proj.generalInfo.countryOriginForeign, 'Netherlands');
    assert.strictEqual(proj.generalInfo.countryOfOrigin, 'Mixed (Indonesia & Netherlands)');
    const mixedParsed = parseCountryOfOrigin(proj.generalInfo.countryOfOrigin);
    assert.strictEqual(mixedParsed.category, 'Mixed');
    assert.strictEqual(mixedParsed.foreignCountry, 'Netherlands');
    assert.strictEqual(mixedParsed.fullDisplay, 'Mixed (Indonesia & Netherlands)');

    // 5. Verify FOREIGN_COUNTRY_OPTIONS list contains key manufacturing countries
    assert.ok(Array.isArray(FOREIGN_COUNTRY_OPTIONS));
    assert.ok(FOREIGN_COUNTRY_OPTIONS.includes('Japan'));
    assert.ok(FOREIGN_COUNTRY_OPTIONS.includes('Germany'));
    assert.ok(FOREIGN_COUNTRY_OPTIONS.includes('Netherlands'));
    assert.ok(FOREIGN_COUNTRY_OPTIONS.includes('Italy'));
    assert.ok(FOREIGN_COUNTRY_OPTIONS.includes('United States'));
  });
});
