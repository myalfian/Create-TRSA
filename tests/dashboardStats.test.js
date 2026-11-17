import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';
import {
  AGREEMENT_STATUSES,
  normalizeAgreementStatus,
  calculateProjectCompleteness,
  resolveProjectCreatedAt,
  formatAgreementDate,
  getRelativeAgreementAge,
  sortAgreements,
  filterAgreements,
  computeAgreementStats
} from '../src/js/dashboardStatsService.js';

function cloneProject(overrides = {}) {
  const base = JSON.parse(JSON.stringify(defaultTRSAProject));
  return {
    ...base,
    ...overrides,
    documentInfo: {
      ...base.documentInfo,
      ...(overrides.documentInfo || {})
    }
  };
}

test('TRSA Summary Dashboard Statistics Engine', async (t) => {
  await t.test('Computes total count, status distribution, and percentages accurately', () => {
    const projects = [
      cloneProject({ id: 'p-1', documentInfo: { status: 'Published', plantLocation: 'Semarang Plant', vendorOrigin: 'Foreign' } }),
      cloneProject({ id: 'p-2', documentInfo: { status: 'Approved', plantLocation: 'Cikupa Plant', vendorOrigin: 'Local' } }),
      cloneProject({ id: 'p-3', documentInfo: { status: 'Under Review', plantLocation: 'Semarang Plant', vendorOrigin: 'Mixed' } }),
      cloneProject({ id: 'p-4', documentInfo: { status: 'Draft', plantLocation: 'Cikokol Plant', vendorOrigin: 'Local' } }),
      cloneProject({ id: 'p-5', documentInfo: { status: 'Draft', plantLocation: 'Semarang Plant', vendorOrigin: 'Foreign' } })
    ];

    const stats = computeAgreementStats(projects, {
      drafts: [
        { id: 'd-1', isAutoSave: false },
        { id: 'd-2', isAutoSave: true },
        { id: 'd-3', isAutoSave: true }
      ]
    });

    assert.equal(stats.totalCount, 5);
    assert.equal(stats.publishedCount, 1);
    assert.equal(stats.approvedCount, 1);
    assert.equal(stats.underReviewCount, 1);
    assert.equal(stats.draftCount, 2);
    assert.equal(stats.finalizedCount, 2);
    assert.equal(stats.inProgressCount, 3);
    assert.equal(stats.finalizedPercentage, 40);
    assert.equal(stats.inProgressPercentage, 60);
    assert.equal(stats.avgCompleteness, 100);
    assert.equal(stats.validationSummary.validCount, 5);
    assert.equal(stats.validationSummary.invalidCount, 0);

    assert.deepEqual(
      stats.statusDistribution.map(d => [d.status, d.count, d.percentage]),
      [
        ['Published', 1, 20],
        ['Approved', 1, 20],
        ['Under Review', 1, 20],
        ['Draft', 2, 40]
      ]
    );

    assert.equal(stats.plantDistribution[0].plantLocation, 'Semarang Plant');
    assert.equal(stats.plantDistribution[0].count, 3);
    assert.equal(stats.plantDistribution[0].percentage, 60);

    assert.deepEqual(stats.draftSummary, { total: 3, manual: 1, autoSave: 2 });
  });

  await t.test('Handles empty project list cleanly without division-by-zero', () => {
    const stats = computeAgreementStats([]);
    assert.equal(stats.totalCount, 0);
    assert.equal(stats.filteredCount, 0);
    assert.equal(stats.avgCompleteness, 0);
    assert.equal(stats.finalizedPercentage, 0);
    assert.equal(stats.statusDistribution.length, AGREEMENT_STATUSES.length);
    for (const item of stats.statusDistribution) {
      assert.equal(item.count, 0);
      assert.equal(item.percentage, 0);
    }
  });

  await t.test('Filters agreements accurately by status, plant, and search query', () => {
    const projects = [
      cloneProject({ id: 'p-1', documentInfo: { title: 'Line A Fryer', docNumber: '001/TRSA', status: 'Published', plantLocation: 'Semarang Plant' } }),
      cloneProject({ id: 'p-2', documentInfo: { title: 'Line B Extruder', docNumber: '002/TRSA', status: 'Draft', plantLocation: 'Cikupa Plant' } }),
      cloneProject({ id: 'p-3', documentInfo: { title: 'Line C Packaging', docNumber: '003/TRSA', status: 'Under Review', plantLocation: 'Semarang Plant' } })
    ];

    assert.equal(filterAgreements(projects, { statusFilter: 'Draft' }).length, 1);
    assert.equal(filterAgreements(projects, { plantFilter: 'Semarang Plant' }).length, 2);
    assert.equal(filterAgreements(projects, { searchQuery: 'extruder' }).length, 1);
    assert.equal(filterAgreements(projects, { statusFilter: 'Published', plantFilter: 'Semarang Plant' })[0].id, 'p-1');
  });

  await t.test('Detects specification validation issues and normalizes missing statuses', () => {
    const incomplete = cloneProject({
      id: 'p-inc',
      documentInfo: { title: '', status: '' },
      scopeOfSupply: { fryer: [], seasoning: [] }
    });

    assert.equal(normalizeAgreementStatus(''), 'Draft');
    assert.equal(normalizeAgreementStatus('published'), 'Published');
    assert.ok(calculateProjectCompleteness(incomplete) < 100);

    const stats = computeAgreementStats([incomplete]);
    assert.equal(stats.draftCount, 1);
    assert.equal(stats.validationSummary.validCount, 0);
    assert.equal(stats.validationSummary.invalidCount, 1);
    assert.ok(stats.validationSummary.totalValidationErrors > 0);
  });

  await t.test('Resolves creation dates, formats display strings, and sorts recent TRSA projects', () => {
    const oldest = cloneProject({
      id: 'p-old',
      createdAt: undefined,
      documentInfo: {
        title: 'Zeta Older Fryer',
        status: 'Published',
        revisionHistory: [{ revision: '0.0', date: '2024-08-30', originatedBy: 'Refin A Putra' }]
      }
    });
    const middle = cloneProject({
      id: 'trsa-1750000000000',
      createdAt: undefined,
      documentInfo: {
        title: 'Alpha Extruder Line',
        status: 'Draft',
        revisionHistory: []
      }
    });
    const newest = cloneProject({
      id: 'p-new',
      createdAt: '2026-11-17T08:00:00.000Z',
      documentInfo: {
        title: 'Beta Seasoning Drum',
        status: 'Under Review',
        revisionHistory: [{ revision: '0.0', date: '2026-11-17', originatedBy: 'Moh Yusuf Alfian' }]
      }
    });

    assert.equal(resolveProjectCreatedAt(oldest), '2024-08-30T00:00:00.000Z');
    assert.equal(resolveProjectCreatedAt(middle), new Date(1750000000000).toISOString());
    assert.equal(resolveProjectCreatedAt(newest), '2026-11-17T08:00:00.000Z');

    assert.equal(formatAgreementDate('2026-11-17T08:00:00.000Z'), '17 Nov 2026');
    assert.equal(getRelativeAgreementAge('2026-11-17T08:00:00.000Z', Date.parse('2026-11-17T12:00:00.000Z')), 'Today');
    assert.equal(getRelativeAgreementAge('2026-11-10T08:00:00.000Z', Date.parse('2026-11-17T08:00:00.000Z')), '7d ago');

    const recentOrder = sortAgreements([oldest, middle, newest], 'recent');
    assert.deepEqual(recentOrder.map(p => p.id), ['p-new', 'trsa-1750000000000', 'p-old']);

    const oldestOrder = sortAgreements([oldest, middle, newest], 'oldest');
    assert.deepEqual(oldestOrder.map(p => p.id), ['p-old', 'trsa-1750000000000', 'p-new']);

    const titleOrder = sortAgreements([oldest, middle, newest], 'title');
    assert.deepEqual(titleOrder.map(p => p.id), ['trsa-1750000000000', 'p-new', 'p-old']);

    const stats = computeAgreementStats([oldest, middle, newest], { sortBy: 'recent' });
    assert.deepEqual(stats.filteredAgreements.map(p => p.id), ['p-new', 'trsa-1750000000000', 'p-old']);
  });
});
