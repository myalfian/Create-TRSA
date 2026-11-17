import { validateProject } from './validationService.js';

export const AGREEMENT_STATUSES = ['Published', 'Approved', 'Under Review', 'Draft'];

export function normalizeAgreementStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'Draft';
  const match = AGREEMENT_STATUSES.find(known => known.toLowerCase() === s.toLowerCase());
  return match || s;
}

export function calculateProjectCompleteness(proj) {
  if (!proj || typeof proj !== 'object') return 0;
  let score = 0;
  const total = 7;
  if (proj.documentInfo?.docNumber) score++;
  if (Array.isArray(proj.keyContacts) && proj.keyContacts.length > 0) score++;
  if (Array.isArray(proj.productSpecifications) && proj.productSpecifications.length > 0) score++;
  if (Array.isArray(proj.scopeOfSupply?.fryer) && proj.scopeOfSupply.fryer.length > 0) score++;
  if (Array.isArray(proj.scopeOfSupply?.seasoning) && proj.scopeOfSupply.seasoning.length > 0) score++;
  if (Array.isArray(proj.performanceAcceptance?.tests) && proj.performanceAcceptance.tests.length > 0) score++;
  if (proj.commercialTerms?.selectedPaymentOption) score++;
  return Math.round((score / total) * 100);
}

export function resolveProjectCreatedAt(proj) {
  if (!proj || typeof proj !== 'object') return null;

  const candidates = [
    proj.createdAt,
    proj.documentInfo?.createdAt,
    Array.isArray(proj.documentInfo?.revisionHistory) ? proj.documentInfo.revisionHistory[0]?.date : null
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const str = String(cand).trim();
    if (!str) continue;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00.000Z`) : new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (typeof proj.id === 'string') {
    const match = proj.id.match(/^trsa-(\d{12,15})$/);
    if (match) {
      const ts = Number(match[1]);
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }

  return null;
}

export function resolveProjectUpdatedAt(proj) {
  if (!proj || typeof proj !== 'object') return null;
  const revList = Array.isArray(proj.documentInfo?.revisionHistory) ? proj.documentInfo.revisionHistory : [];
  const lastRevDate = revList.length > 0 ? revList[revList.length - 1]?.date : null;
  const candidates = [proj.updatedAt, proj.documentInfo?.updatedAt, lastRevDate, resolveProjectCreatedAt(proj)];

  for (const cand of candidates) {
    if (!cand) continue;
    const str = String(cand).trim();
    if (!str) continue;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00.000Z`) : new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

export function formatAgreementDate(dateVal) {
  if (!dateVal) return 'Date unavailable';
  const str = String(dateVal).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00.000Z`) : new Date(str);
  if (Number.isNaN(d.getTime())) return str || 'Date unavailable';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function getRelativeAgreementAge(dateVal, nowMs = Date.now()) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00.000Z`) : new Date(str);
  if (Number.isNaN(d.getTime())) return '';

  const diffDays = Math.floor((nowMs - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

export function sortAgreements(projects = [], sortBy = 'recent') {
  const list = Array.isArray(projects) ? [...projects] : [];
  const statusOrder = {
    Published: 0,
    Approved: 1,
    'Under Review': 2,
    Draft: 3
  };

  return list.sort((a, b) => {
    const aCreated = Date.parse(resolveProjectCreatedAt(a) || '') || 0;
    const bCreated = Date.parse(resolveProjectCreatedAt(b) || '') || 0;

    if (sortBy === 'oldest') {
      if (aCreated !== bCreated) return aCreated - bCreated;
    } else if (sortBy === 'status') {
      const aRank = statusOrder[normalizeAgreementStatus(a?.documentInfo?.status)] ?? 99;
      const bRank = statusOrder[normalizeAgreementStatus(b?.documentInfo?.status)] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      if (bCreated !== aCreated) return bCreated - aCreated;
    } else if (sortBy === 'title') {
      const aTitle = String(a?.documentInfo?.title || '').toLowerCase();
      const bTitle = String(b?.documentInfo?.title || '').toLowerCase();
      const cmp = aTitle.localeCompare(bTitle);
      if (cmp !== 0) return cmp;
    } else if (sortBy === 'completeness') {
      const aComp = calculateProjectCompleteness(a);
      const bComp = calculateProjectCompleteness(b);
      if (bComp !== aComp) return bComp - aComp;
      if (bCreated !== aCreated) return bCreated - aCreated;
    } else {
      // Default: 'recent' (newest creation date first, then updated date)
      if (bCreated !== aCreated) return bCreated - aCreated;
      const aUpdated = Date.parse(resolveProjectUpdatedAt(a) || '') || 0;
      const bUpdated = Date.parse(resolveProjectUpdatedAt(b) || '') || 0;
      if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    }

    return String(a?.documentInfo?.docNumber || a?.id || '').localeCompare(
      String(b?.documentInfo?.docNumber || b?.id || '')
    );
  });
}

export function filterAgreements(projects = [], options = {}) {
  const {
    statusFilter = 'all',
    plantFilter = 'all',
    searchQuery = '',
    sortBy = 'recent'
  } = options;
  const q = String(searchQuery || '').trim().toLowerCase();

  const matched = (Array.isArray(projects) ? projects : []).filter(proj => {
    if (!proj) return false;
    const status = normalizeAgreementStatus(proj.documentInfo?.status);
    const plant = proj.documentInfo?.plantLocation || proj.generalInfo?.plantLocation || 'Semarang Plant';

    const matchesStatus = !statusFilter || statusFilter === 'all' || status === statusFilter;
    const matchesPlant = !plantFilter || plantFilter === 'all' || plant === plantFilter;
    const matchesSearch = !q ||
      String(proj.documentInfo?.title || '').toLowerCase().includes(q) ||
      String(proj.documentInfo?.subTitle || '').toLowerCase().includes(q) ||
      String(proj.documentInfo?.docNumber || '').toLowerCase().includes(q) ||
      String(proj.projectOverview?.description || '').toLowerCase().includes(q) ||
      String(proj.generalInfo?.vendorName || '').toLowerCase().includes(q) ||
      String(plant).toLowerCase().includes(q);

    return matchesStatus && matchesPlant && matchesSearch;
  });

  return sortBy === 'none' ? matched : sortAgreements(matched, sortBy);
}

export function computeAgreementStats(projects = [], options = {}) {
  const list = Array.isArray(projects) ? projects : [];
  const drafts = Array.isArray(options.drafts) ? options.drafts : [];
  const totalCount = list.length;

  const statusCounts = {
    Published: 0,
    Approved: 0,
    'Under Review': 0,
    Draft: 0
  };
  const customStatuses = new Set();

  const plantCounts = {};
  const originCounts = {
    Foreign: 0,
    Local: 0,
    Mixed: 0
  };

  let completenessSum = 0;
  let validCount = 0;
  let invalidCount = 0;
  let totalValidationErrors = 0;
  let totalScopeModules = 0;
  let totalProductVariants = 0;
  const validationByProjectId = {};

  for (const proj of list) {
    const status = normalizeAgreementStatus(proj?.documentInfo?.status);
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
      statusCounts[status]++;
    } else {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      customStatuses.add(status);
    }

    const plant = proj?.documentInfo?.plantLocation || proj?.generalInfo?.plantLocation || 'Semarang Plant';
    plantCounts[plant] = (plantCounts[plant] || 0) + 1;

    const origin = proj?.documentInfo?.vendorOrigin || 'Foreign';
    originCounts[origin] = (originCounts[origin] || 0) + 1;

    completenessSum += calculateProjectCompleteness(proj);

    const validation = validateProject(proj);
    validationByProjectId[proj?.id] = validation;
    if (validation.valid) {
      validCount++;
    } else {
      invalidCount++;
      totalValidationErrors += validation.totalErrors;
    }

    const fryerLen = Array.isArray(proj?.scopeOfSupply?.fryer) ? proj.scopeOfSupply.fryer.length : 0;
    const seasLen = Array.isArray(proj?.scopeOfSupply?.seasoning) ? proj.scopeOfSupply.seasoning.length : 0;
    totalScopeModules += fryerLen + seasLen;

    const prodLen = Array.isArray(proj?.productSpecifications) ? proj.productSpecifications.length : 0;
    totalProductVariants += prodLen;
  }

  const orderedStatuses = [...AGREEMENT_STATUSES, ...Array.from(customStatuses)];
  const statusDistribution = orderedStatuses.map(status => {
    const count = statusCounts[status] || 0;
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return {
      status,
      count,
      percentage
    };
  });

  const publishedCount = statusCounts.Published || 0;
  const approvedCount = statusCounts.Approved || 0;
  const underReviewCount = statusCounts['Under Review'] || 0;
  const draftCount = statusCounts.Draft || 0;

  const finalizedCount = publishedCount + approvedCount;
  const inProgressCount = underReviewCount + draftCount;
  const finalizedPercentage = totalCount > 0 ? Math.round((finalizedCount / totalCount) * 100) : 0;
  const inProgressPercentage = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const avgCompleteness = totalCount > 0 ? Math.round(completenessSum / totalCount) : 0;

  const plantDistribution = Object.entries(plantCounts)
    .map(([plantLocation, count]) => ({
      plantLocation,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count || a.plantLocation.localeCompare(b.plantLocation));

  const originDistribution = Object.entries(originCounts)
    .filter(([origin, count]) => count > 0 || ['Foreign', 'Local', 'Mixed'].includes(origin))
    .map(([origin, count]) => ({
      origin,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }));

  const filteredAgreements = filterAgreements(list, options);

  const manualDrafts = drafts.filter(d => !d?.isAutoSave).length;
  const autoSaveDrafts = drafts.filter(d => Boolean(d?.isAutoSave)).length;

  return {
    totalCount,
    filteredCount: filteredAgreements.length,
    filteredAgreements,
    statusCounts,
    statusDistribution,
    publishedCount,
    approvedCount,
    underReviewCount,
    draftCount,
    finalizedCount,
    inProgressCount,
    finalizedPercentage,
    inProgressPercentage,
    avgCompleteness,
    totalScopeModules,
    totalProductVariants,
    validationSummary: {
      validCount,
      invalidCount,
      totalValidationErrors,
      byProjectId: validationByProjectId
    },
    plantDistribution,
    originDistribution,
    draftSummary: {
      total: drafts.length,
      manual: manualDrafts,
      autoSave: autoSaveDrafts
    }
  };
}
