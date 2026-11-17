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
  TRSA_COMPLIANCE_MATRIX,
  resolvePlantCode,
  isClauseApplicable,
  resolveContactsForPlant,
  buildLegalAndTaxProvisions,
  auditProjectMatrixCompliance
} from '../src/js/trsaMatrixService.js';
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

    // Verify 1402 Cikokol contacts (4 Eng + 2 Proj + 3 Pur = 9)
    const p1402 = resolveContactsForPlant('1402');
    assert.strictEqual(p1402.contacts.length, 9);
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
});
