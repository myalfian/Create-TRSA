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
  TRSA_COMPLIANCE_MATRIX,
  resolvePlantCode,
  isClauseApplicable,
  resolveContactsForPlant,
  buildLegalAndTaxProvisions,
  auditProjectMatrixCompliance,
  PROJECT_CONTACT_ROLES,
  resolveProjectKeyContacts,
  formatSiteAddressLines
} from '../src/js/trsaMatrixService.js';
import { DEFAULT_TEAM_MEMBERS } from '../src/js/masterDataService.js';
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

  test('Verify Plant x Origin Clause XVI gating across 1402/1403/1405 vs 1411', () => {
    const dutyRow = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.duty');
    const pph26Row = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.pph26');
    const localRow = TRSA_COMPLIANCE_MATRIX.find(r => r.id === 'XVI.local');

    assert.strictEqual(isClauseApplicable(dutyRow, '1411', 'Foreign'), true);
    assert.strictEqual(isClauseApplicable(dutyRow, '1411', 'Local'), false);
    assert.strictEqual(isClauseApplicable(dutyRow, '1403', 'Foreign'), false);

    assert.strictEqual(isClauseApplicable(pph26Row, '1411', 'Foreign'), true);
    assert.strictEqual(isClauseApplicable(pph26Row, '1405', 'Foreign'), false);

    assert.strictEqual(isClauseApplicable(localRow, '1402', 'Local'), true);
    assert.strictEqual(isClauseApplicable(localRow, '1403', 'Local'), true);
    assert.strictEqual(isClauseApplicable(localRow, '1405', 'Local'), true);
    assert.strictEqual(isClauseApplicable(localRow, '1411', 'Local'), false);

    const p1411Foreign = buildLegalAndTaxProvisions('1411', 'Foreign');
    assert.ok(p1411Foreign.some(p => p.matrixId === 'XVI.duty'));
    assert.ok(p1411Foreign.some(p => p.matrixId === 'XVI.pph26'));
    assert.ok(!p1411Foreign.some(p => p.matrixId === 'XVI.local'));

    const p1405Local = buildLegalAndTaxProvisions('1405', 'Local');
    assert.ok(p1405Local.some(p => p.matrixId === 'XVI.local'));
    assert.ok(!p1405Local.some(p => p.matrixId === 'XVI.duty'));
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
});
