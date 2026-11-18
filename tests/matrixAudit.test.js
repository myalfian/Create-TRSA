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
import {
  USER_ENGINEERING_PICS,
  PLANT_MATRIX_PROFILES,
  DOCUMENT_SUBMISSION_COMPLIANCE,
  CONFIDENTIALITY_STANDARD,
  LANGUAGE_REQUIREMENT_STANDARD,
  TECHNICAL_HYGIENIC_REQUIREMENTS_12,
  FINAL_ACCEPTANCE_RULES,
  REMEDIES_CONSEQUENCES_STANDARD,
  INVOICING_AND_BG_CONDITIONS,
  WARRANTY_STANDARD,
  TRSA_COMPLIANCE_MATRIX,
  resolvePlantCode,
  isClauseApplicable,
  resolveContactsForPlant,
  buildLegalAndTaxProvisions,
  auditProjectMatrixCompliance,
  PROJECT_CONTACT_ROLES,
  resolveProjectKeyContacts,
  formatSiteAddressLines,
  getShipmentPortForPlant,
  resolveShipmentItemsForMatrix
} from '../src/js/trsaMatrixService.js';
import {
  DEFAULT_TEAM_MEMBERS,
  loadPaymentTerms,
  getPaymentTermByCode
} from '../src/js/masterDataService.js';
import { TRSAStore } from '../src/js/app.js';

describe('IFM 19-Clause TRSA Compliance Matrix & Deep Audit Tests', () => {
  test('Verify all 4 Plants (1402, 1403, 1405, 1411) profiles and authorized PIC emails', () => {
    const codes = Object.keys(PLANT_MATRIX_PROFILES);
    assert.deepStrictEqual(codes.sort(), ['1402', '1403', '1405', '1411']);

    assert.strictEqual(USER_ENGINEERING_PICS.length, 4);
    assert.strictEqual(resolvePlantCode('Cikokol Plant'), '1402');
    assert.strictEqual(resolvePlantCode('Semarang Plant'), '1403');
    assert.strictEqual(resolvePlantCode('Cikupa Plant'), '1405');
    assert.strictEqual(resolvePlantCode('Agro Plant'), '1411');

    // Verify 1402 Cikokol profile, address, and Purchasing Attn
    const p1402 = resolveContactsForPlant('1402');
    assert.strictEqual(p1402.contacts.length, 9);
    assert.strictEqual(p1402.profile.siteTitle, 'PT Indofood Fortuna Makmur – Cikokol');
    assert.strictEqual(p1402.purchasingAttn.length, 2);
    assert.strictEqual(p1402.purchasingAttn[0].email, 'natania.ws@icbp.indofood.co.id');
    assert.strictEqual(p1402.purchasingAttn[1].email, 'arief.setyawan@icbp.indofood.co.id');
    assert.ok(p1402.contacts.some(c => c.email === 'angga.wicaksono@icbp.indofood.co.id'));
    assert.ok(p1402.contacts.some(c => c.email === 'natania.ws@icbp.indofood.co.id'));
    assert.ok(p1402.contacts.some(c => c.email === 'arief.setyawan@icbp.indofood.co.id'));

    // Verify 1405 Cikupa contacts (4 Eng + 1 Proj + 2 Pur = 7)
    const p1405 = resolveContactsForPlant('1405');
    assert.strictEqual(p1405.contacts.length, 7);
    assert.ok(p1405.contacts.some(c => c.email === 'muhammad.alfatih@icbp.indofood.co.id'));

    // Verify 1411 Agro contacts & Wisma Damatex address
    const p1411 = resolveContactsForPlant('1411');
    assert.strictEqual(p1411.contacts.length, 7);
    assert.ok(p1411.profile.address.includes('Wisma Damatex'));
  });

  test('Verify Origin-driven Clause XVII (Tax & Regulatory) gating across 1402/1403/1405/1411', () => {
    const dutyRow = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.duty');
    const pph26Row = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.pph26');
    const localRow = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.local');

    ['1402', '1403', '1405', '1411'].forEach(code => {
      assert.strictEqual(isClauseApplicable(dutyRow, code, 'Foreign'), true);
      assert.strictEqual(isClauseApplicable(dutyRow, code, 'Local'), false);
      assert.strictEqual(isClauseApplicable(pph26Row, code, 'Foreign'), true);
      assert.strictEqual(isClauseApplicable(pph26Row, code, 'Local'), false);
      assert.strictEqual(isClauseApplicable(localRow, code, 'Local'), true);
      assert.strictEqual(isClauseApplicable(localRow, code, 'Foreign'), false);

      const foreignProvs = buildLegalAndTaxProvisions(code, 'Foreign');
      assert.strictEqual(foreignProvs.length, 5);
      assert.ok(foreignProvs.some(p => p.matrixId === 'XVI.duty'));
      assert.ok(foreignProvs.some(p => p.matrixId === 'XVI.pph26'));
      assert.ok(!foreignProvs.some(p => p.matrixId === 'XVI.local'));
      const foreignVisa = foreignProvs.find(p => p.matrixId === 'XVI.visa');
      assert.ok(foreignVisa.description.includes('Working Visa'));
      assert.ok(!foreignVisa.description.includes('Local Company Engineers'));

      const localProvs = buildLegalAndTaxProvisions(code, 'Local');
      assert.strictEqual(localProvs.length, 4);
      assert.ok(localProvs.some(p => p.matrixId === 'XVI.local'));
      assert.ok(!localProvs.some(p => p.matrixId === 'XVI.duty'));
      assert.ok(!localProvs.some(p => p.matrixId === 'XVI.pph26'));
      const localMob = localProvs.find(p => p.matrixId === 'XVI.visa');
      assert.ok(!localMob.description.includes('Working Visa'));
      assert.ok(localMob.description.includes('All mobilization costs'));
    });

    const p1403Mixed = buildLegalAndTaxProvisions('1403', 'Mixed');
    assert.strictEqual(p1403Mixed.length, 7);
    assert.ok(p1403Mixed.some(p => p.matrixId === 'XVI.mixed'));
    assert.ok(p1403Mixed.some(p => p.matrixId === 'XVI.duty'));
    assert.ok(p1403Mixed.some(p => p.matrixId === 'XVI.pph26'));
    assert.ok(p1403Mixed.some(p => p.matrixId === 'XVI.local'));
  });

  test('Deep Audit achieves 100% score on defaultTRSAProject and detects legacy discrepancies', () => {
    const cleanAudit = auditProjectMatrixCompliance(defaultTRSAProject);
    assert.strictEqual(cleanAudit.complianceScore, 100);
    assert.strictEqual(cleanAudit.discrepancies.length, 0);
    assert.strictEqual(cleanAudit.totalChecks, 10);

    // Simulate a legacy project missing matrix extensions
    const legacy = JSON.parse(JSON.stringify(defaultTRSAProject));
    legacy.keyContacts = legacy.keyContacts.slice(0, 2);
    legacy.hygieneAndQuality.generalTechnicalHygienic12 = [];
    legacy.appendices = [];
    legacy.requiredDocumentation = legacy.requiredDocumentation.slice(0, 5);

    const legacyAudit = auditProjectMatrixCompliance(legacy);
    assert.ok(legacyAudit.complianceScore < 100, 'Legacy project should report discrepancies');
    assert.ok(legacyAudit.discrepancies.length >= 4);
  });

  test('TRSAStore alignProjectWithMatrix restores 100% compliance on non-compliant projects', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();

    proj.keyContacts = [];
    proj.hygieneAndQuality.generalTechnicalHygienic12 = [];
    proj.appendices = [];
    proj.requiredDocumentation = [];

    const beforeAudit = auditProjectMatrixCompliance(proj);
    assert.ok(beforeAudit.complianceScore < 100);

    const alignedAudit = store.alignProjectWithMatrix();
    assert.strictEqual(alignedAudit.complianceScore, 100);
    assert.strictEqual(alignedAudit.discrepancies.length, 0);
  });

  test('IV. Key Contacts shows only project-assigned PIC Project, Project & Engineering Team, and Purchasing Plant', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj1403 = store.getActiveProject();

    // Default project is Plant 1403 originated by Refin A Putra
    const resolved1403 = resolveProjectKeyContacts(proj1403, DEFAULT_TEAM_MEMBERS);
    assert.ok(resolved1403.length >= 3);
    assert.ok(resolved1403.every(c => PROJECT_CONTACT_ROLES.includes(c.projectRole)), 'Every displayed contact must belong to the 3 project execution roles');
    assert.ok(!resolved1403.some(c => c.name === 'Moh Yusuf Alfian'), 'Super Admin should not appear in IV. Key Contacts');
    assert.ok(resolved1403.some(c => c.name === 'Ayodya Maulana Gunoro' && c.projectRole === 'PIC Project'));
    assert.ok(resolved1403.some(c => c.name === 'Refin A Putra' && c.projectRole === 'Project & Engineering Team'));
    assert.ok(resolved1403.some(c => c.name === 'Natalia Happy' && c.projectRole === 'Purchasing Plant'));

    // Switch plant to Cikokol (1402) and confirm Key Contacts + Site Description + VI. Document Submission Compliance
    store.updatePlantLocation('Cikokol Plant');
    const resolved1402 = resolveProjectKeyContacts(proj1403, DEFAULT_TEAM_MEMBERS);
    assert.ok(resolved1402.some(c => c.name === 'Angga Dwiki Wicaksono' && c.projectRole === 'PIC Project'));
    assert.ok(resolved1402.some(c => c.name === 'Murdani' && c.projectRole === 'Project & Engineering Team'));
    assert.ok(resolved1402.some(c => c.name === 'Natania WS' && c.projectRole === 'Purchasing Plant'));
    assert.ok(resolved1402.some(c => c.name === 'Arief Setyawan' && c.projectRole === 'Purchasing Plant'));
    assert.ok(!resolved1402.some(c => c.name === 'Ayodya Maulana Gunoro'), 'Semarang PIC must not appear when working on Cikokol Plant');

    // Toggle a specific team member for this project & verify custom persistence + reset
    store.toggleProjectTeamMember('mohammad.faiz@icbp.indofood.co.id');
    const customResolved = resolveProjectKeyContacts(proj1403, DEFAULT_TEAM_MEMBERS);
    assert.ok(customResolved.some(c => c.name === 'Mohammad Faiz' && c.projectRole === 'PIC Project'));

    store.resetProjectTeamContacts();
    const afterReset = resolveProjectKeyContacts(proj1403, DEFAULT_TEAM_MEMBERS);
    assert.ok(!afterReset.some(c => c.name === 'Mohammad Faiz'));
  });

  test('V. Site Description & VI. Document Submission Compliance content and Matrix numbering (V, VI, VII–XX)', () => {
    const profile1402 = PLANT_MATRIX_PROFILES['1402'];
    assert.strictEqual(profile1402.siteTitle, 'PT Indofood Fortuna Makmur – Cikokol');
    const lines = formatSiteAddressLines(profile1402, profile1402.address);
    assert.deepStrictEqual(lines, [
      'Jl. Wisma Damatex, RT.001/RW.001, Cikokol,',
      'Kec. Tangerang, Kota Tangerang, Banten 15117, Indonesia'
    ]);

    assert.strictEqual(profile1402.purchasingAttn.length, 2);
    assert.strictEqual(`${profile1402.purchasingAttn[0].name} (${profile1402.purchasingAttn[0].email})`, 'Natania WS (natania.ws@icbp.indofood.co.id)');
    assert.strictEqual(`${profile1402.purchasingAttn[1].name} (${profile1402.purchasingAttn[1].email})`, 'Arief Setyawan (arief.setyawan@icbp.indofood.co.id)');
    assert.ok(DOCUMENT_SUBMISSION_COMPLIANCE.includes('submitted directly to the designated Purchasing recipients above'));
    assert.ok(DOCUMENT_SUBMISSION_COMPLIANCE.includes('softcopy drafts for IFM review and approval prior to dispatching original hardcopies'));

    const vSite = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'V.site');
    const viInv = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'V.invoice');
    const viSub = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'V.submission');
    const viiConf = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'VI');
    const xxApp = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XIX');
    assert.strictEqual(vSite.itemNo, 'V');
    assert.strictEqual(viInv.itemNo, 'VI');
    assert.strictEqual(viSub.itemNo, 'VI');
    assert.strictEqual(viiConf.itemNo, 'VII');
    assert.strictEqual(xxApp.itemNo, 'XX');
  });

  test('XIV. Term of Payment database CRUD and dropdown option selection', () => {
    globalThis.localStorage.clear();
    const defaults = loadPaymentTerms();
    assert.strictEqual(defaults.length, 3);
    assert.strictEqual(getPaymentTermByCode('Option 1').breakdown[0].percent, '85%');

    const store = new TRSAStore();
    store.setCurrentUser('Moh Yusuf Alfian');
    const created = store.savePaymentTermRecord({
      code: 'Option 3',
      label: 'Option 3 (Local IDR 30/60/10)',
      currencyNote: 'IDR (Local Bank Transfer)',
      breakdown: [
        { percent: '30%', stage: 'Down Payment', method: 'T/T upon PO confirmation' },
        { percent: '60%', stage: 'Delivery Payment', method: 'T/T upon site delivery & BAST' },
        { percent: '10%', stage: 'Final Acceptance', method: 'T/T after SAT sign-off' }
      ]
    });
    assert.ok(created);
    assert.strictEqual(loadPaymentTerms().length, 4);

    const applied = store.setPaymentTermOption('Option 3');
    assert.strictEqual(applied.code, 'Option 3');
    const active = store.getActiveProject();
    assert.strictEqual(active.commercialTerms.selectedPaymentOption, 'Option 3');
    assert.strictEqual(active.commercialTerms.activePaymentBreakdown.length, 3);
    assert.strictEqual(active.commercialTerms.activePaymentBreakdown[1].percent, '60%');

    // Audit compliance still remains 100% since matrixEquipmentSchedule is preserved
    const audit = auditProjectMatrixCompliance(active);
    assert.strictEqual(audit.complianceScore, 100);
  });

  test('XV. Shipment and Delivery automates by Vendor Origin (Local/Foreign) and Plant (1402/1403/1405/1411) without duplicate clauses', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();
    store.setCurrentUser('Moh Yusuf Alfian');

    // Foreign + 1403 Semarang
    assert.strictEqual(getShipmentPortForPlant('1403'), 'Semarang Port, Indonesia');
    assert.strictEqual(proj.commercialTerms.shipmentItems.length, 6);
    assert.strictEqual(proj.commercialTerms.shipmentItems[0].title, 'Equipment Ex-works vendor Factory');
    assert.ok(proj.commercialTerms.shipmentItems[1].description.includes('CIF / CIP / CFR Semarang Port, Indonesia'));
    assert.ok(proj.commercialTerms.shipmentItems[3].description.includes('110%'));
    assert.ok(proj.commercialTerms.shipmentItems[4].description.includes('25 years'));
    assert.ok(proj.commercialTerms.shipmentItems[5].description.includes('back-charged to the Seller'));

    // Ensure no duplicate clause titles or repeated 110%/25-year rules across items
    const foreignTitles = proj.commercialTerms.shipmentItems.map(i => i.title);
    assert.strictEqual(new Set(foreignTitles).size, foreignTitles.length);
    assert.strictEqual(proj.commercialTerms.shipmentItems.filter(i => i.description.includes('110%')).length, 1);
    assert.strictEqual(proj.commercialTerms.shipmentItems.filter(i => i.description.includes('25 years')).length, 1);

    // Foreign + 1402 / 1405 / 1411 switches port to Tanjung Priok Port, Jakarta, Indonesia
    ['Cikokol Plant', 'Cikupa Plant', 'Agro Plant'].forEach(plantName => {
      store.updatePlantLocation(plantName);
      assert.strictEqual(proj.commercialTerms.shipmentItems.length, 6);
      assert.ok(proj.commercialTerms.shipmentItems[1].description.includes('CIF / CIP / CFR Tanjung Priok Port, Jakarta, Indonesia'));
    });

    // Switch to Local + Cikokol (1402): exactly 2 items (EXW vendor factory + Franco Site to 1402)
    store.updatePlantLocation('Cikokol Plant');
    store.updateVendorOrigin('Local');
    assert.strictEqual(proj.commercialTerms.shipmentItems.length, 2);
    assert.strictEqual(proj.commercialTerms.shipmentItems[0].title, 'Equipment Ex-works vendor Factory');
    assert.ok(proj.commercialTerms.shipmentItems[1].description.includes('Franco Site basis (Local Vendor)'));
    assert.ok(proj.commercialTerms.shipmentItems[1].description.includes('PT Indofood Fortuna Makmur – Cikokol'));

    // Local compliance audit stays 100%
    const localAudit = auditProjectMatrixCompliance(proj);
    assert.strictEqual(localAudit.complianceScore, 100);
  });

  test('XVIII. Required Documentation excludes Operator Work Instructions and migrates legacy saved projects', () => {
    globalThis.localStorage.clear();
    const legacy = JSON.parse(JSON.stringify(defaultTRSAProject));
    legacy.requiredDocumentation.splice(7, 0, {
      id: 9,
      title: 'Operator Work Instructions',
      desc: 'Detailed step-by-step SOP / working instructions for line operators',
      required: true
    });
    globalThis.localStorage.setItem('TRSA_ENTERPRISE_PROJECTS_V1', JSON.stringify([legacy]));

    const store = new TRSAStore();
    const loaded = store.getActiveProject();
    assert.ok(!loaded.requiredDocumentation.some(d => /operator\s*work\s*instructions/i.test(d.title)));
    assert.strictEqual(loaded.requiredDocumentation.length, 12);
    assert.strictEqual(loaded.requiredDocumentation[11].id, 12);
  });

  test('XVII. Administrative, Tax & Regulatory Provisions render detailed item-by-item bullets by Origin and migrate legacy projects', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    store.setCurrentUser('Moh Yusuf Alfian');

    // Foreign Vendor: 5 clauses with detailed sub-items [1, 3, 3, 2, 2]
    const foreignProj = store.getActiveProject();
    assert.strictEqual(foreignProj.legalAndTaxProvisions.length, 5);
    assert.deepStrictEqual(
      foreignProj.legalAndTaxProvisions.map(p => p.items.length),
      [1, 3, 3, 2, 2]
    );
    assert.ok(foreignProj.legalAndTaxProvisions[2].items.some(i => i.includes('DGT-1') && i.includes('5% Switzerland')));
    assert.ok(foreignProj.legalAndTaxProvisions[2].items.some(i => i.includes('PMK No. 35/PMK.03/2019')));
    assert.ok(foreignProj.legalAndTaxProvisions[3].items.some(i => i.includes('Working Visa')));

    // Local Vendor: 4 clauses with detailed sub-items [1, 3, 1, 2]
    store.updateVendorOrigin('Local');
    assert.strictEqual(foreignProj.legalAndTaxProvisions.length, 4);
    assert.deepStrictEqual(
      foreignProj.legalAndTaxProvisions.map(p => p.items.length),
      [1, 3, 1, 2]
    );
    assert.ok(foreignProj.legalAndTaxProvisions[1].items.some(i => i.includes('PP No. 44 Tahun 2022')));
    assert.ok(foreignProj.legalAndTaxProvisions[1].items.some(i => i.includes('Kwitansi')));
    assert.ok(foreignProj.legalAndTaxProvisions[3].items.some(i => i.includes('thirty (30) calendar days')));

    // Mixed Vendor: 7 clauses combining Offshore + Onshore bullet lists
    store.updateVendorOrigin('Mixed');
    assert.strictEqual(foreignProj.legalAndTaxProvisions.length, 7);
    assert.ok(foreignProj.legalAndTaxProvisions.every(p => Array.isArray(p.items) && p.items.length >= 1));

    // Legacy project migration when saved provisions lack items[]
    const legacy = JSON.parse(JSON.stringify(defaultTRSAProject));
    legacy.legalAndTaxProvisions = legacy.legalAndTaxProvisions.map(({ items, ...rest }) => rest);
    globalThis.localStorage.setItem('TRSA_ENTERPRISE_PROJECTS_V1', JSON.stringify([legacy]));
    const migratedStore = new TRSAStore();
    const migratedProj = migratedStore.getActiveProject();
    assert.ok(migratedProj.legalAndTaxProvisions.every(p => Array.isArray(p.items) && p.items.length > 0));
  });

  test('Global terminology enforces "must" instead of "shall" across standards, matrix outputs, and migrated projects', () => {
    const hasShall = val => /\bshall\b/i.test(JSON.stringify(val));

    assert.strictEqual(hasShall(defaultTRSAProject), false);
    assert.strictEqual(hasShall(PLANT_MATRIX_PROFILES), false);
    assert.strictEqual(hasShall(DOCUMENT_SUBMISSION_COMPLIANCE), false);
    assert.strictEqual(hasShall(CONFIDENTIALITY_STANDARD), false);
    assert.strictEqual(hasShall(LANGUAGE_REQUIREMENT_STANDARD), false);
    assert.strictEqual(hasShall(TECHNICAL_HYGIENIC_REQUIREMENTS_12), false);
    assert.strictEqual(hasShall(FINAL_ACCEPTANCE_RULES), false);
    assert.strictEqual(hasShall(REMEDIES_CONSEQUENCES_STANDARD), false);
    assert.strictEqual(hasShall(INVOICING_AND_BG_CONDITIONS), false);
    assert.strictEqual(hasShall(WARRANTY_STANDARD), false);

    ['1402', '1403', '1405', '1411'].forEach(code => {
      ['Local', 'Foreign', 'Mixed'].forEach(origin => {
        assert.strictEqual(hasShall(buildLegalAndTaxProvisions(code, origin)), false);
        assert.strictEqual(hasShall(resolveShipmentItemsForMatrix(code, origin)), false);
      });
    });

    // Legacy saved project containing "shall" is automatically converted to "must" on load
    globalThis.localStorage.clear();
    const legacy = JSON.parse(JSON.stringify(defaultTRSAProject));
    legacy.commercialTerms.warranty = 'The Seller shall warrant equipment. Shall remain valid.';
    legacy.performanceAcceptance.failureConsequence = 'Seller shall refund 100%.';
    globalThis.localStorage.setItem('TRSA_ENTERPRISE_PROJECTS_V1', JSON.stringify([legacy]));

    const store = new TRSAStore();
    const loaded = store.getActiveProject();
    assert.strictEqual(hasShall(loaded), false);
    assert.ok(loaded.commercialTerms.warranty.includes('Seller must warrant equipment. Must remain valid.'));
    assert.ok(loaded.performanceAcceptance.failureConsequence.includes('Seller must refund 100%.'));
  });
});


