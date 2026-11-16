import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
  createAuditEntry, 
  detectProjectChanges, 
  appendAuditLog, 
  getAuditLogs, 
  clearAuditLogs 
} from '../src/js/auditService.js';

describe('Audit Trail & Event Logging Tests', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  test('Create structured and immutable audit log entry', () => {
    const user = { name: 'Refin A Putra', role: 'admin' };
    const entry = createAuditEntry('proj-001', 'UPDATE', ['productSpecifications'], user);

    assert.ok(entry.id, 'Entry must have a unique ID');
    assert.strictEqual(entry.projectId, 'proj-001');
    assert.strictEqual(entry.userName, 'Refin A Putra');
    assert.strictEqual(entry.userRole, 'admin');
    assert.strictEqual(entry.action, 'UPDATE');
    assert.deepStrictEqual(entry.changedFields, ['productSpecifications']);
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

  test('Append and retrieve audit logs for specific project', () => {
    const user = { name: 'Moh Yusuf Alfian', role: 'engineer' };
    const entry1 = createAuditEntry('proj-100', 'CREATE', [], user);
    const entry2 = createAuditEntry('proj-100', 'UPDATE', ['title'], user);
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
