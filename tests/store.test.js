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
import { TRSAStore, PLANT_DATABASE, getPlantDatabase } from '../src/js/app.js';

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
    assert.strictEqual(semarang.code, '1402');
    assert.strictEqual(semarang.deliveryPort, 'Semarang Port (CIF/CIP)');
    assert.ok(semarang.address.includes('Tambak Aji IV'));

    const cikupa = getPlantDatabase('Cikupa Plant');
    assert.strictEqual(cikupa.code, '1403');
    assert.strictEqual(cikupa.deliveryPort, 'Tanjung Priok Port, Jakarta (CIF/CIP)');
    assert.ok(cikupa.address.includes('Bhumimas II'));

    // 2. Test auto-population when plant location changes to Cikupa
    store.updatePlantLocation('Cikupa Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Cikupa Plant');
    assert.strictEqual(proj.siteDescription.deliveryPort, cikupa.deliveryPort);
    assert.strictEqual(proj.siteDescription.address, cikupa.address);
    assert.strictEqual(proj.siteDescription.invoiceRecipient, cikupa.invoiceRecipient);
    assert.ok(proj.documentInfo.docNumber.includes('1403'), 'Doc Number should update plant code to 1403');

    // 3. Test auto-population when plant location changes back to Semarang
    store.updatePlantLocation('Semarang Plant');
    assert.strictEqual(proj.documentInfo.plantLocation, 'Semarang Plant');
    assert.strictEqual(proj.siteDescription.deliveryPort, semarang.deliveryPort);
    assert.strictEqual(proj.siteDescription.address, semarang.address);
    assert.ok(proj.documentInfo.docNumber.includes('1402'), 'Doc Number should update plant code to 1402');
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
});
