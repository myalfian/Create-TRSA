import { test, describe } from 'node:test';
import assert from 'node:assert';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';

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
});
