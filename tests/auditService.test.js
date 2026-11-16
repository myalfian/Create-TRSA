import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
  createAuditEntry, 
  detectProjectChanges, 
  detectDetailedProjectChanges,
  appendAuditLog, 
  getAuditLogs, 
  clearAuditLogs,
  formatAuditTimestamp,
  getRelativeTime
} from '../src/js/auditService.js';

describe('Audit Trail & Event Logging Tests', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  test('Create structured and immutable audit log entry', () => {
    const user = { 
      name: 'Refin A Putra', 
      role: 'Project Engineer', 
      dept: 'MFG', 
      email: 'refin.putra@icbp.indofood.co.id' 
    };
    const entry = createAuditEntry('proj-001', 'UPDATE', ['productSpecifications'], user, '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024');

    assert.ok(entry.id, 'Entry must have a unique ID');
    assert.strictEqual(entry.projectId, 'proj-001');
    assert.strictEqual(entry.projectDocNumber, '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024');
    assert.strictEqual(entry.userName, 'Refin A Putra');
    assert.strictEqual(entry.userRole, 'Project Engineer');
    assert.strictEqual(entry.userDept, 'MFG');
    assert.strictEqual(entry.action, 'UPDATE');
    assert.deepStrictEqual(entry.changedFields, ['Field Update']);
    assert.ok(entry.createdAt, 'Timestamp must be present');
  });

  test('Detect granular diffs between project updates', () => {
    const prev = {
      title: 'Initial Title',
      plantCode: '1402',
      productSpecifications: [{ shape: '3D Chicken Legs', capacityOutput: '600 Kg/h' }]
    };

    const next = {
      title: 'Updated Fryer Title',
      plantCode: '1402', // unchanged
      productSpecifications: [{ shape: '3D Chicken Legs', capacityOutput: '650 Kg/h' }] // modified
    };

    const changes = detectProjectChanges(prev, next);
    assert.ok(changes.includes('title'), 'Title change detected');
    assert.ok(changes.includes('productSpecifications'), 'Product specification change detected');
    assert.ok(!changes.includes('plantCode'), 'Unchanged plantCode must not be in changes');
  });

  test('Detect detailed semantic changes with exact before and after values', () => {
    const prev = {
      documentInfo: {
        title: 'Pellet Line Initial',
        docNumber: '006/RAP/TRSA – 1402/MFG-IFM/VIII/2024',
        plantLocation: 'Semarang Plant'
      },
      productSpecifications: [
        { shape: '3D Chicken Legs', moistureOutput: '1.0 – 2.1%', oilContentOutput: '28 – 40%' }
      ],
      processParameters: {
        frying: { dwellTime: '20 – 30 seconds' }
      }
    };

    const next = {
      documentInfo: {
        title: 'Pellet Line Fryer Revision',
        docNumber: '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024',
        plantLocation: 'Cikupa Plant'
      },
      productSpecifications: [
        { shape: '3D Chicken Legs', moistureOutput: '1.2 – 1.8%', oilContentOutput: '28 – 40%' }
      ],
      processParameters: {
        frying: { dwellTime: '25 seconds' }
      }
    };

    const diffs = detectDetailedProjectChanges(prev, next);
    assert.ok(diffs.length >= 4, 'Must detect at least 4 distinct detailed diffs');

    // Check title diff
    const titleDiff = diffs.find(d => d.category === 'Document Title');
    assert.ok(titleDiff);
    assert.strictEqual(titleDiff.from, 'Pellet Line Initial');
    assert.strictEqual(titleDiff.to, 'Pellet Line Fryer Revision');

    // Check plant diff
    const plantDiff = diffs.find(d => d.category === 'Plant Location');
    assert.ok(plantDiff);
    assert.strictEqual(plantDiff.from, 'Semarang Plant');
    assert.strictEqual(plantDiff.to, 'Cikupa Plant');

    // Check product specs moisture diff
    const moistureDiff = diffs.find(d => d.description.includes('moisture'));
    assert.ok(moistureDiff);
    assert.strictEqual(moistureDiff.from, '1.0 – 2.1%');
    assert.strictEqual(moistureDiff.to, '1.2 – 1.8%');

    // Check frying dwell time diff
    const dwellDiff = diffs.find(d => d.category === 'Frying Parameters');
    assert.ok(dwellDiff);
    assert.strictEqual(dwellDiff.from, '20 – 30 seconds');
    assert.strictEqual(dwellDiff.to, '25 seconds');
  });

  test('Format timestamps and relative time for human-readable audit trail', () => {
    const nowIso = new Date().toISOString();
    const rel = getRelativeTime(nowIso);
    assert.ok(rel.includes('Just now') || rel.includes('second') || rel.includes('min'));

    const formatted = formatAuditTimestamp('2026-11-16T14:30:00.000Z');
    assert.ok(formatted.includes('16') || formatted.includes('Nov'));
  });

  test('Append and retrieve audit logs for specific project', () => {
    const user = { name: 'Moh Yusuf Alfian', role: 'Project & Engineering Manager', dept: 'MFG' };
    const entry1 = createAuditEntry('proj-100', 'CREATE', [], user);
    const entry2 = createAuditEntry('proj-100', 'UPDATE', [{ category: 'Title', description: 'Updated title', from: 'A', to: 'B' }], user);
    const entryOther = createAuditEntry('proj-200', 'CREATE', [], user);

    appendAuditLog(entry1);
    appendAuditLog(entry2);
    appendAuditLog(entryOther);

    const logsProj100 = getAuditLogs('proj-100');
    assert.strictEqual(logsProj100.length, 2, 'Must retrieve only logs for proj-100');
    assert.strictEqual(logsProj100[0].action, 'UPDATE', 'Most recent log first');
    assert.strictEqual(logsProj100[1].action, 'CREATE');

    const logsAll = getAuditLogs();
    assert.strictEqual(logsAll.length, 3, 'Must retrieve all logs when no project ID specified');
  });
});
