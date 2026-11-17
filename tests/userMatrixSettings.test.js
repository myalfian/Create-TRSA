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
import {
  USER_MATRIX_SETTINGS_KEY,
  MATRIX_PLANT_CODES,
  MATRIX_ORIGIN_MODES,
  MATRIX_USER_PRESETS,
  getAllMatrixClauseIds,
  getUserSettingKey,
  getDefaultUserMatrixSetting,
  loadUserMatrixSettings,
  saveUserMatrixSettings,
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
} from '../src/js/userMatrixSettingsService.js';
import { TRSAStore } from '../src/js/app.js';
import { getAuditLogs } from '../src/js/auditService.js';

describe('Per-User Compliance Matrix Settings Tests', () => {
  test('Service defaults and localStorage persistence round-trip', () => {
    globalThis.localStorage.clear();
    const members = [
      { name: 'Moh Yusuf Alfian', email: 'yusuf@indofood.com', role: 'Project & Engineering Manager', dept: 'MFG' },
      { name: 'Refin A Putra', email: 'refin@indofood.com', role: 'Project Engineer', dept: 'MFG' }
    ];

    const loaded = loadUserMatrixSettings(members);
    const refinKey = getUserSettingKey(members[1]);
    assert.ok(loaded[refinKey]);
    assert.strictEqual(loaded[refinKey].canViewMatrix, true);
    assert.strictEqual(loaded[refinKey].canEditMatrix, true);
    assert.deepStrictEqual(loaded[refinKey].allowedPlants, MATRIX_PLANT_CODES);
    assert.deepStrictEqual(loaded[refinKey].allowedOrigins, MATRIX_ORIGIN_MODES);
    assert.strictEqual(loaded[refinKey].assignedClauses.length, getAllMatrixClauseIds().length);
    assert.strictEqual(isUserSettingCustomized(loaded[refinKey], members[1]), false);

    // Update Refin's setting and verify persistence
    const updated = updateUserMatrixSetting(
      refinKey,
      {
        canEditMatrix: false,
        allowedPlants: ['1403'],
        defaultPlantCode: '1403',
        customNotes: 'Hanya untuk project Semarang Plant'
      },
      { teamMembers: members, updatedBy: 'Moh Yusuf Alfian' }
    );

    assert.strictEqual(updated.canEditMatrix, false);
    assert.deepStrictEqual(updated.allowedPlants, ['1403']);
    assert.strictEqual(updated.customNotes, 'Hanya untuk project Semarang Plant');
    assert.strictEqual(updated.updatedBy, 'Moh Yusuf Alfian');
    assert.strictEqual(isUserSettingCustomized(updated, members[1]), true);

    const rawStored = globalThis.localStorage.getItem(USER_MATRIX_SETTINGS_KEY);
    assert.ok(rawStored, 'Settings must persist in localStorage');
    const reloaded = getUserMatrixSetting('refin@indofood.com', members);
    assert.strictEqual(reloaded.canEditMatrix, false);
    assert.deepStrictEqual(reloaded.allowedPlants, ['1403']);
  });

  test('Toggle helpers prevent empty plants/origins and apply presets accurately', () => {
    globalThis.localStorage.clear();
    const members = [
      { name: 'Refin A Putra', email: 'refin@indofood.com', role: 'Project Engineer', dept: 'MFG' },
      { name: 'Natalia Happy', email: 'natalia@indofood.com', role: 'Purchasing Supervisor', dept: 'PRC' }
    ];

    // Apply plant_1403_local preset
    const p1 = applyPresetToUserMatrix('refin@indofood.com', 'plant_1403_local', {
      teamMembers: members,
      updatedBy: 'Moh Yusuf Alfian'
    });
    assert.deepStrictEqual(p1.allowedPlants, ['1403']);
    assert.deepStrictEqual(p1.allowedOrigins, ['Local']);
    assert.strictEqual(p1.defaultPlantCode, '1403');
    assert.strictEqual(p1.defaultOrigin, 'Local');

    // Cannot toggle off the sole remaining plant or origin
    const afterPlantToggle = toggleUserPlantAccess('refin@indofood.com', '1403', { teamMembers: members });
    assert.deepStrictEqual(afterPlantToggle.allowedPlants, ['1403']);
    const afterOriginToggle = toggleUserOriginAccess('refin@indofood.com', 'Local', { teamMembers: members });
    assert.deepStrictEqual(afterOriginToggle.allowedOrigins, ['Local']);

    // Can add another plant and toggle it off again
    const added1405 = toggleUserPlantAccess('refin@indofood.com', '1405', { teamMembers: members });
    assert.deepStrictEqual(added1405.allowedPlants, ['1403', '1405']);
    const removed1403 = toggleUserPlantAccess('refin@indofood.com', '1403', { teamMembers: members });
    assert.deepStrictEqual(removed1403.allowedPlants, ['1405']);
    assert.strictEqual(removed1403.defaultPlantCode, '1405');

    // Purchasing commercial preset restricts to Clauses XIII-XIX and sets canEditMatrix false
    const p2 = applyPresetToUserMatrix('natalia@indofood.com', 'purchasing_commercial', {
      teamMembers: members,
      updatedBy: 'Moh Yusuf Alfian'
    });
    assert.strictEqual(p2.canViewMatrix, true);
    assert.strictEqual(p2.canEditMatrix, false);
    assert.strictEqual(isClauseAssignedToUser(p2, 'I.i'), false);
    assert.strictEqual(isClauseAssignedToUser(p2, 'XVI.quote'), true);

    // Toggle specific clause
    const toggledClause = toggleUserClauseAccess('natalia@indofood.com', 'I.i', { teamMembers: members });
    assert.strictEqual(isClauseAssignedToUser(toggledClause, 'I.i'), true);

    // Reset individual user and reset all
    const resetOne = resetUserMatrixSetting('natalia@indofood.com', { teamMembers: members, updatedBy: 'Moh Yusuf Alfian' });
    assert.strictEqual(resetOne.canEditMatrix, true);
    assert.strictEqual(resetOne.assignedClauses.length, getAllMatrixClauseIds().length);

    saveUserMatrixSettings({});
    const resetAll = resetAllUserMatrixSettings(members);
    assert.strictEqual(Object.keys(resetAll).length, 2);
  });

  test('TRSAStore RBAC: Only Admin can modify Compliance Matrix user settings and changes write audit logs', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const refinMember = store.teamMembers.find(m => m.name === 'Refin A Putra');
    const refinKey = getUserSettingKey(refinMember);

    // Non-admin (Refin A Putra) must be blocked from updating any matrix user settings
    store.setCurrentUser('Refin A Putra');
    assert.strictEqual(store.isAdmin(), false);
    assert.strictEqual(store.updateMatrixSettingsForUser(refinKey, { canEditMatrix: false }), null);
    assert.strictEqual(store.toggleMatrixPlantForUser(refinKey, '1405'), null);
    assert.strictEqual(store.toggleMatrixOriginForUser(refinKey, 'Local'), null);
    assert.strictEqual(store.toggleMatrixClauseForUser(refinKey, 'I.i'), null);
    assert.strictEqual(store.applyMatrixPresetForUser(refinKey, 'read_only'), null);
    assert.strictEqual(store.resetMatrixForUser(refinKey), null);
    assert.strictEqual(store.resetAllUsersMatrix(), null);

    // Switch to Admin (Moh Yusuf Alfian) and apply settings
    store.setCurrentUser('Moh Yusuf Alfian');
    assert.strictEqual(store.isAdmin(), true);

    const applied = store.applyMatrixPresetForUser(refinKey, 'plant_1403_local');
    assert.ok(applied);
    assert.deepStrictEqual(applied.allowedPlants, ['1403']);
    assert.deepStrictEqual(applied.allowedOrigins, ['Local']);

    const updated = store.updateMatrixSettingsForUser(refinKey, {
      canEditMatrix: false,
      customNotes: 'Scope terbatas untuk Semarang Local vendor'
    });
    assert.ok(updated);
    assert.strictEqual(updated.canEditMatrix, false);
    assert.strictEqual(updated.customNotes, 'Scope terbatas untuk Semarang Local vendor');

    // Audit logs must record USER_MATRIX_PRESET and USER_MATRIX_SETTING
    const logs = getAuditLogs(store.getActiveProject().id);
    assert.ok(logs.some(l => l.action === 'USER_MATRIX_PRESET' && l.userName === 'Moh Yusuf Alfian'));
    assert.ok(logs.some(l => l.action === 'USER_MATRIX_SETTING' && l.userName === 'Moh Yusuf Alfian'));
  });

  test('Runtime Enforcement: Restricted user cannot switch to disallowed Plant, Origin, or Re-Align Matrix', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    const proj = store.getActiveProject();
    const nataliaMember = store.teamMembers.find(m => m.name === 'Natalia Happy');
    const nataliaKey = getUserSettingKey(nataliaMember);

    // Admin restricts Natalia to Plant 1403, Origin Local, Read-Only
    store.setCurrentUser('Moh Yusuf Alfian');
    store.updateMatrixSettingsForUser(nataliaKey, {
      canViewMatrix: true,
      canEditMatrix: false,
      allowedPlants: ['1403'],
      allowedOrigins: ['Local'],
      defaultPlantCode: '1403',
      defaultOrigin: 'Local'
    });

    // Switch to Natalia
    store.setCurrentUser('Natalia Happy');
    const nataliaSetting = store.getCurrentUserMatrixSetting();
    assert.strictEqual(isPlantAllowedForUser(nataliaSetting, 'Semarang Plant'), true);
    assert.strictEqual(isPlantAllowedForUser(nataliaSetting, 'Cikupa Plant'), false);
    assert.strictEqual(isOriginAllowedForUser(nataliaSetting, 'Local'), true);
    assert.strictEqual(isOriginAllowedForUser(nataliaSetting, 'Foreign'), false);

    // Disallowed plant change is blocked
    const originalPlant = proj.documentInfo.plantLocation;
    const blockedPlantRes = store.updatePlantLocation('Cikupa Plant');
    assert.strictEqual(blockedPlantRes, null);
    assert.strictEqual(proj.documentInfo.plantLocation, originalPlant);

    // Disallowed origin change is blocked
    const originalOrigin = proj.documentInfo.vendorOrigin;
    const blockedOriginRes = store.updateVendorOrigin('Foreign');
    assert.strictEqual(blockedOriginRes, null);
    assert.strictEqual(proj.documentInfo.vendorOrigin, originalOrigin);

    // Allowed origin ('Local') succeeds
    const allowedOriginRes = store.updateVendorOrigin('Local');
    assert.ok(allowedOriginRes);
    assert.strictEqual(proj.documentInfo.vendorOrigin, 'Local');

    // Re-Align Matrix is blocked when canEditMatrix is false
    const blockedAlignRes = store.alignProjectWithMatrix();
    assert.strictEqual(blockedAlignRes, null);

    // Admin restores full access for Natalia and verifies alignment works
    store.setCurrentUser('Moh Yusuf Alfian');
    store.resetMatrixForUser(nataliaKey);
    store.setCurrentUser('Natalia Happy');
    const allowedAlignRes = store.alignProjectWithMatrix();
    assert.ok(allowedAlignRes);
  });
});
