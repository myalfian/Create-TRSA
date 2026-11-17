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
  ORG_ROLES,
  ORG_ROLE_LIST,
  ROLE_CAPABILITIES,
  isSuperAdminRole
} from '../src/js/security.js';
import {
  DEFAULT_PASSCODE,
  MASTER_STORAGE_KEYS,
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
} from '../src/js/masterDataService.js';
import { PLANT_MATRIX_PROFILES } from '../src/js/trsaMatrixService.js';
import { TRSAStore } from '../src/js/app.js';
import { getAuditLogs } from '../src/js/auditService.js';

describe('Master Data (Plants, Roles, Dept, Jabatan, Users, Vendors) & Login Tests', () => {
  test('All 4 IFM Plants have complete structured addressDetail profiles and support Super Admin updates', () => {
    globalThis.localStorage.clear();
    const expectedCodes = ['1402', '1403', '1405', '1411'];

    for (const code of expectedCodes) {
      const base = PLANT_MATRIX_PROFILES[code];
      assert.ok(base, `Plant ${code} must exist`);
      assert.ok(base.addressDetail, `Plant ${code} must have addressDetail`);
      assert.ok(base.addressDetail.street, `Plant ${code} needs street`);
      assert.ok(base.addressDetail.kelurahan, `Plant ${code} needs kelurahan`);
      assert.ok(base.addressDetail.kecamatan, `Plant ${code} needs kecamatan`);
      assert.ok(base.addressDetail.city, `Plant ${code} needs city`);
      assert.ok(base.addressDetail.province, `Plant ${code} needs province`);
      assert.ok(base.addressDetail.postalCode, `Plant ${code} needs postalCode`);
      assert.ok(base.addressDetail.receivingGate, `Plant ${code} needs receivingGate`);
      assert.ok(base.addressDetail.phone, `Plant ${code} needs phone`);
    }

    const store = new TRSAStore();
    store.setCurrentUser('Moh Yusuf Alfian');
    assert.strictEqual(store.isAdmin(), true);

    const updatedPlant = store.savePlantDetail('1403', {
      addressDetail: {
        receivingGate: 'Gate C - Heavy Machinery Bay',
        receivingHours: 'Mon - Sat, 07:30 - 16:30 WIB'
      }
    });
    assert.ok(updatedPlant);
    assert.strictEqual(updatedPlant.addressDetail.receivingGate, 'Gate C - Heavy Machinery Bay');

    const reloaded = getPlantProfile('1403');
    assert.strictEqual(reloaded.addressDetail.receivingGate, 'Gate C - Heavy Machinery Bay');
    assert.ok(loadPlants()['1403'].address.includes('Semarang'));
  });

  test('Standardized 4 Organizational Roles & RBAC Enforcement', () => {
    globalThis.localStorage.clear();
    assert.deepStrictEqual(ORG_ROLE_LIST, [
      'Super Admin (Project & Engineering Manager)',
      'Project & Engineering Team',
      'Purchasing Plant',
      'PIC Project'
    ]);

    for (const role of ORG_ROLE_LIST) {
      assert.ok(ROLE_CAPABILITIES[role], `Capabilities missing for role ${role}`);
      assert.ok(ROLE_CAPABILITIES[role].permissions.length > 0);
    }

    assert.strictEqual(isSuperAdminRole(ORG_ROLES.SUPER_ADMIN), true);
    assert.strictEqual(isSuperAdminRole(ORG_ROLES.PROJECT_ENGINEERING_TEAM), false);
    assert.strictEqual(isSuperAdminRole(ORG_ROLES.PURCHASING_PLANT), false);
    assert.strictEqual(isSuperAdminRole(ORG_ROLES.PIC_PROJECT), false);

    const users = loadUsers();
    const roleSet = new Set(users.map(u => u.role));
    for (const r of ORG_ROLE_LIST) {
      assert.ok(roleSet.has(r), `Expected at least one seeded user with role: ${r}`);
    }
  });

  test('Department and Jabatan User CRUD respects Super Admin permissions', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();

    // Non-admin cannot modify Department or Jabatan
    store.setCurrentUser('Refin A Putra');
    assert.strictEqual(store.isAdmin(), false);
    assert.strictEqual(store.saveDepartmentRecord({ code: 'RND', name: 'Research & Development' }), null);
    assert.strictEqual(store.saveJobTitleRecord({ code: 'RNE', title: 'R&D Engineer' }), null);

    // Super Admin can create/update/delete Department & Jabatan
    store.setCurrentUser('Moh Yusuf Alfian');
    assert.strictEqual(store.isAdmin(), true);

    const dept = store.saveDepartmentRecord({
      code: 'HSE',
      name: 'Health, Safety & Environment',
      division: 'Corporate Safety',
      headTitle: 'HSE Manager',
      costCenter: 'CC-1400-HSE'
    });
    assert.ok(dept);
    assert.strictEqual(dept.code, 'HSE');
    assert.ok(loadDepartments().some(d => d.code === 'HSE'));

    const job = store.saveJobTitleRecord({
      code: 'HSEO',
      title: 'HSE Project Officer',
      level: 'Specialist',
      defaultDept: 'HSE',
      defaultRole: ORG_ROLES.PIC_PROJECT
    });
    assert.ok(job);
    assert.strictEqual(job.title, 'HSE Project Officer');
    assert.ok(loadJobTitles().some(j => j.title === 'HSE Project Officer'));

    assert.strictEqual(store.removeDepartmentRecord('HSE'), true);
    assert.strictEqual(loadDepartments().some(d => d.code === 'HSE'), false);
    assert.strictEqual(store.removeJobTitleRecord(job.id), true);
    assert.strictEqual(loadJobTitles().some(j => j.id === job.id), false);
  });

  test('User Detail & Vendor Detail CRUD persistence', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();
    store.setCurrentUser('Moh Yusuf Alfian');

    const createdUser = store.saveUserRecord({
      employeeId: 'IFM-ENG-099',
      name: 'Bagus Prakoso',
      email: 'bagus.prakoso@icbp.indofood.co.id',
      role: ORG_ROLES.PIC_PROJECT,
      jabatan: 'Project Team PIC',
      dept: 'ENG',
      plantCode: '1405',
      phone: '+62 21 596-1405 ext. 999'
    });
    assert.ok(createdUser);
    assert.strictEqual(createdUser.departmentName, 'Corporate Engineering & Automation');
    assert.ok(loadUsers().some(u => u.email === 'bagus.prakoso@icbp.indofood.co.id'));

    const createdVendor = store.saveVendorRecord({
      vendorCode: 'VND-ID-099',
      name: 'PT Teknindo Pangan Nusantara',
      origin: 'Local',
      country: 'Indonesia',
      equipmentType: 'Packaging System',
      address: 'Jl. Industri Selatan IV Blok HH No. 2',
      city: 'Cikarang, Bekasi',
      postalCode: '17530',
      picName: 'Rudi Hartono',
      picEmail: 'rudi@teknindo.co.id',
      taxId: 'NPWP 09.111.222.3-413.000',
      certifications: ['ISO 9001', 'SUS304 Food Grade']
    });
    assert.ok(createdVendor);
    assert.deepStrictEqual(createdVendor.certifications, ['ISO 9001', 'SUS304 Food Grade']);
    assert.ok(loadVendors().some(v => v.id === createdVendor.id));

    assert.strictEqual(store.removeUserRecord('bagus.prakoso@icbp.indofood.co.id'), true);
    assert.strictEqual(store.removeVendorRecord(createdVendor.id), true);
  });

  test('Animated Login Authentication, Session Persistence, and Logout Audit Flow', () => {
    globalThis.localStorage.clear();
    const store = new TRSAStore();

    // Unauthenticated initially when AUTH_SESSION is empty
    assert.strictEqual(store.isAuthenticated, false);

    // Failed login
    const badLogin = store.login('nonexistent@indofood.co.id', 'wrong');
    assert.strictEqual(badLogin.success, false);
    assert.strictEqual(store.isAuthenticated, false);

    const wrongPwd = verifyLoginCredentials('refin.putra@icbp.indofood.co.id', 'wrong-pass');
    assert.strictEqual(wrongPwd.valid, false);

    // Valid login by email
    const okLogin = store.login('natalia.happy@icbp.indofood.co.id', DEFAULT_PASSCODE);
    assert.strictEqual(okLogin.success, true);
    assert.strictEqual(store.isAuthenticated, true);
    assert.strictEqual(store.getCurrentUser().name, 'Natalia Happy');
    assert.strictEqual(store.getCurrentUser().role, ORG_ROLES.PURCHASING_PLANT);

    // Session persists in localStorage
    const sessionRaw = globalThis.localStorage.getItem(MASTER_STORAGE_KEYS.AUTH_SESSION);
    assert.ok(sessionRaw);
    const storeReloaded = new TRSAStore();
    assert.strictEqual(storeReloaded.isAuthenticated, true);

    // Quick login helper switches user cleanly
    const quickRes = store.loginAsQuickUser('my.alfian@icbp.indofood.co.id');
    assert.strictEqual(quickRes.success, true);
    assert.strictEqual(store.isAdmin(), true);

    // Logout clears auth session and records audit entry
    assert.strictEqual(store.logout(), true);
    assert.strictEqual(store.isAuthenticated, false);
    assert.strictEqual(globalThis.localStorage.getItem(MASTER_STORAGE_KEYS.AUTH_SESSION), null);

    const logs = getAuditLogs();
    assert.ok(logs.some(l => l.action === 'USER_LOGIN'));
    assert.ok(logs.some(l => l.action === 'USER_LOGOUT'));
  });
});
