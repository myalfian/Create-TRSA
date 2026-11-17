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
globalThis.window.localStorage = globalThis.localStorage;
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  ACTIVITY_DOMAINS,
  ACTIVITY_DOMAIN_LABELS,
  resolveActivityDomain,
  resolveActivitySeverity,
  normalizeAuditEntry,
  createAuditEntry,
  detectDetailedProjectChanges,
  appendAuditLog,
  getAuditLogs,
  clearAuditLogs,
  filterAuditLogs,
  computeActivityStats,
  getDistinctAuditActions,
  exportAuditLogsToJSON,
  exportAuditLogsToCSV
} from '../src/js/auditService.js';
import { TRSAStore } from '../src/js/app.js';

describe('Enterprise Activity Logging System Tests', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    clearAuditLogs();
  });

  test('Domain & severity classification across User Actions, Project Changes, and Compliance Matrix Updates', () => {
    assert.strictEqual(ACTIVITY_DOMAIN_LABELS[ACTIVITY_DOMAINS.ALL], 'All Activity');
    assert.strictEqual(ACTIVITY_DOMAIN_LABELS[ACTIVITY_DOMAINS.USER_ACTION], 'User Actions');
    assert.strictEqual(ACTIVITY_DOMAIN_LABELS[ACTIVITY_DOMAINS.PROJECT_CHANGE], 'Project Changes');
    assert.strictEqual(ACTIVITY_DOMAIN_LABELS[ACTIVITY_DOMAINS.COMPLIANCE_MATRIX], 'Compliance Matrix');

    // User Actions
    assert.strictEqual(resolveActivityDomain('USER_LOGIN'), ACTIVITY_DOMAINS.USER_ACTION);
    assert.strictEqual(resolveActivityDomain('USER_LOGIN_FAILED'), ACTIVITY_DOMAINS.USER_ACTION);
    assert.strictEqual(resolveActivityDomain('USER_SWITCH'), ACTIVITY_DOMAINS.USER_ACTION);
    assert.strictEqual(resolveActivityDomain('MASTER_DEPT_UPDATE'), ACTIVITY_DOMAINS.USER_ACTION);
    assert.strictEqual(resolveActivityDomain('DRAFT_SAVE'), ACTIVITY_DOMAINS.USER_ACTION);
    assert.strictEqual(resolveActivityDomain('EXPORT_BUNDLE'), ACTIVITY_DOMAINS.USER_ACTION);

    // Compliance Matrix Updates
    assert.strictEqual(resolveActivityDomain('USER_MATRIX_SETTING'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(resolveActivityDomain('MATRIX_PLANT_ACCESS'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(resolveActivityDomain('MATRIX_ORIGIN_ACCESS'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(resolveActivityDomain('MATRIX_CLAUSE_ACCESS'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(resolveActivityDomain('MATRIX_POLICY_BLOCK'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(resolveActivityDomain('VENDOR_ORIGIN_CHANGE'), ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);

    // Project Changes
    assert.strictEqual(resolveActivityDomain('CREATE'), ACTIVITY_DOMAINS.PROJECT_CHANGE);
    assert.strictEqual(resolveActivityDomain('UPDATE'), ACTIVITY_DOMAINS.PROJECT_CHANGE);
    assert.strictEqual(resolveActivityDomain('PLANT_CHANGE'), ACTIVITY_DOMAINS.PROJECT_CHANGE);
    assert.strictEqual(resolveActivityDomain('REVISION_STAMP'), ACTIVITY_DOMAINS.PROJECT_CHANGE);

    // Severities
    assert.strictEqual(resolveActivitySeverity('USER_LOGIN_FAILED'), 'security');
    assert.strictEqual(resolveActivitySeverity('MATRIX_POLICY_BLOCK'), 'security');
    assert.strictEqual(resolveActivitySeverity('DELETE'), 'warning');
    assert.strictEqual(resolveActivitySeverity('USER_MATRIX_RESET_ALL'), 'warning');
    assert.strictEqual(resolveActivitySeverity('CREATE'), 'success');
    assert.strictEqual(resolveActivitySeverity('USER_LOGIN'), 'success');
    assert.strictEqual(resolveActivitySeverity('UPDATE'), 'info');
  });

  test('normalizeAuditEntry enriches legacy entries missing domain/severity/targetEntity', () => {
    const legacy = {
      id: 'legacy-1',
      projectId: 'trsa-99',
      projectDocNumber: '009/RAP/TRSA',
      action: 'USER_MATRIX_PRESET',
      userName: 'Moh Yusuf Alfian',
      createdAt: '2026-11-16T08:00:00.000Z'
    };
    const normalized = normalizeAuditEntry(legacy);
    assert.strictEqual(normalized.domain, ACTIVITY_DOMAINS.COMPLIANCE_MATRIX);
    assert.strictEqual(normalized.severity, 'info');
    assert.strictEqual(normalized.targetEntity, '009/RAP/TRSA');
    assert.deepStrictEqual(normalized.changedFields, ['General Update']);
    assert.deepStrictEqual(normalized.diffDetails, []);
  });

  test('detectDetailedProjectChanges captures expanded Step 1-6 fields (status, contacts, site, commercial, signOff)', () => {
    const prev = {
      documentInfo: {
        title: 'Fryer A',
        status: 'Draft',
        revisionHistory: [{ revision: '0.0', description: 'Init', originatedBy: 'Refin', date: '2026-11-01' }]
      },
      keyContacts: [{ name: 'A', role: 'PIC' }],
      siteDescription: {
        address: 'Old Plant Street 1',
        deliveryPort: 'Semarang Port'
      },
      commercialTerms: {
        shipmentTerms: 'FOB',
        warranty: '12 months mechanical warranty'
      },
      signOff: {
        seller: { companyName: 'Vendor X', quotationNo: 'Q-01' },
        purchaser: { name: 'Moh Yusuf Alfian', position: 'Manager' }
      }
    };

    const next = {
      documentInfo: {
        title: 'Fryer A',
        status: 'Approved',
        revisionHistory: [{ revision: '0.0', description: 'Init', originatedBy: 'Refin', date: '2026-11-17' }]
      },
      keyContacts: [{ name: 'A', role: 'PIC' }, { name: 'B', role: 'Buyer' }],
      siteDescription: {
        address: 'Jl. Bhumimas II No. 12',
        deliveryPort: 'Tanjung Priok Port'
      },
      commercialTerms: {
        shipmentTerms: 'CIF Tanjung Priok',
        warranty: '24 months comprehensive warranty'
      },
      signOff: {
        seller: { companyName: 'Vendor X', quotationNo: 'Q-02' },
        purchaser: { name: 'Natalia Happy', position: 'Purchasing Spv' }
      }
    };

    const diffs = detectDetailedProjectChanges(prev, next);
    const categories = diffs.map(d => d.category);

    assert.ok(categories.includes('Project Status'));
    assert.ok(categories.includes('Revision History'));
    assert.ok(categories.includes('Key Contacts'));
    assert.ok(categories.includes('Site Address'));
    assert.ok(categories.includes('Delivery Port'));
    assert.ok(categories.includes('Shipment Terms'));
    assert.ok(categories.includes('Warranty Terms'));
    assert.ok(categories.includes('Sign-Off (Seller)'));
    assert.ok(categories.includes('Sign-Off (Buyer)'));
  });

  test('filterAuditLogs & computeActivityStats work accurately across multi-criteria filters', () => {
    const admin = { name: 'Moh Yusuf Alfian', role: 'Super Admin', dept: 'MFG', email: 'yusuf@indofood.co.id' };
    const eng = { name: 'Refin A Putra', role: 'Project & Engineering Team', dept: 'MFG', email: 'refin@indofood.co.id' };

    appendAuditLog(createAuditEntry('p1', 'USER_LOGIN', ['Signed in'], admin, 'DOC-1'));
    appendAuditLog(createAuditEntry('p1', 'PLANT_CHANGE', [{ category: 'Plant Location', description: 'Moved to Cikupa', from: '1403', to: '1405' }], eng, 'DOC-1'));
    appendAuditLog(createAuditEntry('p2', 'USER_MATRIX_SETTING', [{ category: 'User Matrix Config', description: 'Restricted plant scope', from: 'All', to: '1403' }], admin, 'DOC-2'));
    appendAuditLog(createAuditEntry('p1', 'MATRIX_POLICY_BLOCK', [{ category: 'Plant Access Restriction', description: 'Blocked 1405 switch', from: '1403', to: 'Blocked' }], eng, 'DOC-1'));

    const all = getAuditLogs();
    assert.strictEqual(all.length, 4);

    // Filter by domain
    const matrixOnly = filterAuditLogs(all, { domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    assert.strictEqual(matrixOnly.length, 2);

    const userOnly = filterAuditLogs(all, { domain: ACTIVITY_DOMAINS.USER_ACTION });
    assert.strictEqual(userOnly.length, 1);
    assert.strictEqual(userOnly[0].action, 'USER_LOGIN');

    const projOnly = filterAuditLogs(all, { domain: ACTIVITY_DOMAINS.PROJECT_CHANGE });
    assert.strictEqual(projOnly.length, 1);

    // Filter by severity
    const securityOnly = filterAuditLogs(all, { severity: 'security' });
    assert.strictEqual(securityOnly.length, 1);
    assert.strictEqual(securityOnly[0].action, 'MATRIX_POLICY_BLOCK');

    // Filter by projectId + free text search
    const searchHits = filterAuditLogs(all, { projectId: 'p1', searchQuery: 'Cikupa' });
    assert.strictEqual(searchHits.length, 1);
    assert.strictEqual(searchHits[0].action, 'PLANT_CHANGE');

    // Stats computation
    const stats = computeActivityStats(all);
    assert.strictEqual(stats.total, 4);
    assert.strictEqual(stats.byDomain[ACTIVITY_DOMAINS.USER_ACTION], 1);
    assert.strictEqual(stats.byDomain[ACTIVITY_DOMAINS.PROJECT_CHANGE], 1);
    assert.strictEqual(stats.byDomain[ACTIVITY_DOMAINS.COMPLIANCE_MATRIX], 2);
    assert.strictEqual(stats.bySeverity.security, 1);
    assert.strictEqual(stats.uniqueActors, 2);
    assert.strictEqual(stats.last24hCount, 4);

    // Distinct actions sorted
    const actions = getDistinctAuditActions(all);
    assert.deepStrictEqual(actions, ['MATRIX_POLICY_BLOCK', 'PLANT_CHANGE', 'USER_LOGIN', 'USER_MATRIX_SETTING']);
  });

  test('Filtered CSV and JSON exports include Domain & Severity metadata', () => {
    const admin = { name: 'Moh Yusuf Alfian', role: 'Super Admin', dept: 'MFG' };
    appendAuditLog(createAuditEntry('p1', 'USER_LOGIN', ['Signed in'], admin, 'DOC-1'));
    appendAuditLog(createAuditEntry('p1', 'MATRIX_PLANT_ACCESS', [{ category: 'Plant Matrix Scope', description: 'Toggled 1405', from: '[1403]', to: '[1403, 1405]' }], admin, 'DOC-1'));

    const csv = exportAuditLogsToCSV(null, { domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    const lines = csv.trim().split('\n');
    assert.strictEqual(lines.length, 2, 'Header + 1 filtered row');
    assert.ok(lines[0].includes('Domain') && lines[0].includes('Severity'));
    assert.ok(lines[1].includes('Compliance Matrix'));
    assert.ok(lines[1].includes('MATRIX_PLANT_ACCESS'));

    const json = JSON.parse(exportAuditLogsToJSON(null, { domain: ACTIVITY_DOMAINS.USER_ACTION }));
    assert.strictEqual(json.length, 1);
    assert.strictEqual(json[0].action, 'USER_LOGIN');
    assert.strictEqual(json[0].domain, ACTIVITY_DOMAINS.USER_ACTION);
  });

  test('TRSAStore automatically logs User Actions, Master Directory CRUD, and Failed Logins', () => {
    const store = new TRSAStore();

    // 1. Failed login logs security event under USER_ACTION
    const failRes = store.login('unknown@indofood.co.id', 'wrong-pass');
    assert.strictEqual(failRes.success, false);

    // 2. Switch user logs USER_SWITCH
    store.setCurrentUser('Refin A Putra');

    // 3. Switch back to Admin and manage Department & Job Title masters
    store.setCurrentUser('Moh Yusuf Alfian');
    const savedDept = store.saveDepartmentRecord({ code: 'QA', name: 'Quality Assurance', costCenter: 'CC-QA-1403' });
    assert.ok(savedDept);
    store.removeDepartmentRecord('QA');

    const savedJob = store.saveJobTitleRecord({ code: 'JOB-QA', title: 'QA Lead', defaultDept: 'MFG', defaultRole: 'PIC Project' });
    assert.ok(savedJob);
    store.removeJobTitleRecord(savedJob.id);

    // 4. Draft manual save & delete & clear
    const draft = store.saveDraftSnapshot({ label: 'Checkpoint Test', notify: true });
    assert.ok(draft);
    store.deleteDraft(draft.id);
    store.clearAllDrafts();

    const userLogs = filterAuditLogs(getAuditLogs(), { domain: ACTIVITY_DOMAINS.USER_ACTION });
    const actions = new Set(userLogs.map(l => l.action));

    assert.ok(actions.has('USER_LOGIN_FAILED'), 'Must log failed login');
    assert.ok(actions.has('USER_SWITCH'), 'Must log user switch');
    assert.ok(actions.has('MASTER_DEPT_UPDATE'), 'Must log department save');
    assert.ok(actions.has('MASTER_DEPT_DELETE'), 'Must log department delete');
    assert.ok(actions.has('MASTER_JOB_UPDATE'), 'Must log job title save');
    assert.ok(actions.has('MASTER_JOB_DELETE'), 'Must log job title delete');
    assert.ok(actions.has('DRAFT_SAVE'), 'Must log manual draft save');
    assert.ok(actions.has('DRAFT_DELETE'), 'Must log draft delete');
    assert.ok(actions.has('DRAFT_CLEAR'), 'Must log draft clear');

    const failedLog = userLogs.find(l => l.action === 'USER_LOGIN_FAILED');
    assert.strictEqual(failedLog.severity, 'security');
  });

  test('TRSAStore automatically logs Project Changes and Compliance Matrix Updates including RBAC policy blocks', () => {
    const store = new TRSAStore();
    store.setCurrentUser('Moh Yusuf Alfian');

    // Compliance Matrix changes by Super Admin
    store.toggleMatrixPlantForUser('Refin A Putra', '1405');
    store.toggleMatrixOriginForUser('Refin A Putra', 'Local');
    store.toggleMatrixClauseForUser('Refin A Putra', 'XVI.duty');
    store.resetMatrixForUser('Refin A Putra');

    // Restricted user tries unauthorized matrix setting change & restricted plant switch
    store.setCurrentUser('Refin A Putra');
    store.updateMatrixSettingsForUser('Natalia Happy', { canEditMatrix: true }); // unauthorized -> MATRIX_POLICY_BLOCK
    // Refin's default allowed plants are ['1403'] or role-restricted; restrict explicitly to 1403 first as admin:
    store.setCurrentUser('Moh Yusuf Alfian');
    store.updateMatrixSettingsForUser('Refin A Putra', { allowedPlants: ['1403'] });
    store.setCurrentUser('Refin A Putra');
    store.updatePlantLocation('Cikupa Plant'); // 1405 blocked -> MATRIX_POLICY_BLOCK

    // Project Changes: Revision stamp & Reset template
    store.setCurrentUser('Moh Yusuf Alfian');
    store.addRevisionRow();
    store.resetToDefault(store.activeProjectId);

    const allLogs = getAuditLogs();
    const matrixLogs = filterAuditLogs(allLogs, { domain: ACTIVITY_DOMAINS.COMPLIANCE_MATRIX });
    const matrixActions = new Set(matrixLogs.map(l => l.action));

    assert.ok(matrixActions.has('MATRIX_PLANT_ACCESS'), 'Must log plant matrix toggle');
    assert.ok(matrixActions.has('MATRIX_ORIGIN_ACCESS'), 'Must log origin matrix toggle');
    assert.ok(matrixActions.has('MATRIX_CLAUSE_ACCESS'), 'Must log clause matrix toggle');
    assert.ok(matrixActions.has('USER_MATRIX_RESET'), 'Must log user matrix reset');
    assert.ok(matrixActions.has('USER_MATRIX_SETTING'), 'Must log user matrix config update');
    assert.ok(matrixActions.has('MATRIX_POLICY_BLOCK'), 'Must log policy enforcement blocks');

    const policyBlocks = matrixLogs.filter(l => l.action === 'MATRIX_POLICY_BLOCK');
    assert.ok(policyBlocks.length >= 2);
    assert.ok(policyBlocks.every(b => b.severity === 'security'));

    const projectLogs = filterAuditLogs(allLogs, { domain: ACTIVITY_DOMAINS.PROJECT_CHANGE });
    const projectActions = new Set(projectLogs.map(l => l.action));
    assert.ok(projectActions.has('REVISION_STAMP'), 'Must log revision additions');
    assert.ok(projectActions.has('RESET_TEMPLATE'), 'Must log template reset');
  });
});
