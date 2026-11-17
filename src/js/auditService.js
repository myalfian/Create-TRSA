/**
 * TRSA Studio - Enterprise Activity Logging, Audit Trail & Forensic Traceability Service
 * Tracks User Actions, Project Changes, and Compliance Matrix Updates with immutable logging,
 * domain classification, multi-criteria filtering, analytics, and CSV/JSON export.
 */

export const ACTIVITY_DOMAINS = Object.freeze({
  ALL: 'all',
  USER_ACTION: 'user_action',
  PROJECT_CHANGE: 'project_change',
  COMPLIANCE_MATRIX: 'compliance_matrix'
});

export const ACTIVITY_DOMAIN_LABELS = Object.freeze({
  [ACTIVITY_DOMAINS.ALL]: 'All Activity',
  [ACTIVITY_DOMAINS.USER_ACTION]: 'User Actions',
  [ACTIVITY_DOMAINS.PROJECT_CHANGE]: 'Project Changes',
  [ACTIVITY_DOMAINS.COMPLIANCE_MATRIX]: 'Compliance Matrix'
});

const COMPLIANCE_MATRIX_ACTIONS = new Set([
  'MATRIX_ALIGNMENT',
  'USER_MATRIX_SETTING',
  'USER_MATRIX_PRESET',
  'MATRIX_PLANT_ACCESS',
  'MATRIX_ORIGIN_ACCESS',
  'MATRIX_CLAUSE_ACCESS',
  'USER_MATRIX_RESET',
  'USER_MATRIX_RESET_ALL',
  'MATRIX_POLICY_BLOCK',
  'VENDOR_ORIGIN_CHANGE'
]);

const USER_ACTION_ACTIONS = new Set([
  'USER_LOGIN',
  'USER_LOGIN_FAILED',
  'USER_LOGOUT',
  'USER_SWITCH',
  'MASTER_USER_UPDATE',
  'MASTER_USER_DELETE',
  'MASTER_VENDOR_UPDATE',
  'MASTER_VENDOR_DELETE',
  'MASTER_PLANT_UPDATE',
  'MASTER_DEPT_UPDATE',
  'MASTER_DEPT_DELETE',
  'MASTER_JOB_UPDATE',
  'MASTER_JOB_DELETE',
  'DRAFT_SAVE',
  'DRAFT_DELETE',
  'DRAFT_CLEAR',
  'EXPORT_JSON',
  'EXPORT_BUNDLE',
  'AUDIT_EXPORT',
  'ACCESS_DENIED'
]);

const SECURITY_ACTIONS = new Set([
  'USER_LOGIN_FAILED',
  'ACCESS_DENIED',
  'MATRIX_POLICY_BLOCK'
]);

const WARNING_ACTIONS = new Set([
  'DELETE',
  'BULK_DELETE',
  'MASTER_USER_DELETE',
  'MASTER_VENDOR_DELETE',
  'MASTER_DEPT_DELETE',
  'MASTER_JOB_DELETE',
  'DRAFT_DELETE',
  'DRAFT_CLEAR',
  'RESET_TEMPLATE',
  'USER_MATRIX_RESET',
  'USER_MATRIX_RESET_ALL'
]);

const SUCCESS_ACTIONS = new Set([
  'CREATE',
  'USER_LOGIN',
  'MATRIX_ALIGNMENT',
  'STATUS_CHANGE',
  'BULK_STATUS_CHANGE',
  'REVISION_STAMP'
]);

let inMemoryAuditLogs = [];

export function resolveActivityDomain(action = '') {
  const act = String(action || '').toUpperCase();
  if (COMPLIANCE_MATRIX_ACTIONS.has(act) || act.includes('MATRIX')) {
    return ACTIVITY_DOMAINS.COMPLIANCE_MATRIX;
  }
  if (
    USER_ACTION_ACTIONS.has(act) ||
    act.startsWith('USER_') ||
    act.startsWith('MASTER_') ||
    act.startsWith('DRAFT_') ||
    act.startsWith('EXPORT_')
  ) {
    return ACTIVITY_DOMAINS.USER_ACTION;
  }
  return ACTIVITY_DOMAINS.PROJECT_CHANGE;
}

export function resolveActivitySeverity(action = '') {
  const act = String(action || '').toUpperCase();
  if (SECURITY_ACTIONS.has(act)) return 'security';
  if (WARNING_ACTIONS.has(act)) return 'warning';
  if (SUCCESS_ACTIONS.has(act)) return 'success';
  return 'info';
}

export function normalizeAuditEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const action = entry.action || 'UPDATE';
  return {
    ...entry,
    action,
    domain: entry.domain || resolveActivityDomain(action),
    severity: entry.severity || resolveActivitySeverity(action),
    targetEntity: entry.targetEntity || entry.projectDocNumber || entry.projectId || '',
    changedFields: Array.isArray(entry.changedFields) && entry.changedFields.length > 0
      ? entry.changedFields
      : ['General Update'],
    diffDetails: Array.isArray(entry.diffDetails) ? entry.diffDetails : []
  };
}

/**
 * Reset logs (primarily for test environments)
 */
export function clearAuditLogs() {
  inMemoryAuditLogs = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('trsa_audit_logs');
  }
}

/**
 * Format ISO timestamp into clean professional human string
 */
export function formatAuditTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Get relative time string (e.g. "Just now", "5 mins ago", "2 hours ago")
 */
export function getRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const now = Date.now();
    const time = new Date(isoString).getTime();
    const diffSec = Math.floor((now - time) / 1000);

    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch (e) {
    return '';
  }
}

/**
 * Generate a structured immutable activity / audit entry capturing:
 * - Domain ('user_action' | 'project_change' | 'compliance_matrix')
 * - Severity ('info' | 'success' | 'warning' | 'security')
 * - When (createdAt timestamp)
 * - Who (userName, userRole, userDept, userEmail)
 * - What changed (action, targetEntity, changedFields, diffDetails with from/to)
 */
export function createAuditEntry(projectId, action = 'UPDATE', diffs = [], user = {}, projectDocNumber = '', meta = {}) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const structuredDiffs = Array.isArray(diffs) ? diffs.map(d => {
    if (typeof d === 'string') {
      return { category: 'Field Update', description: d, from: '', to: '' };
    }
    return d;
  }) : [];

  const changeCategories = [...new Set(structuredDiffs.map(d => d.category || 'General Update'))];
  const domain = meta?.domain || resolveActivityDomain(action);
  const severity = meta?.severity || resolveActivitySeverity(action);

  return {
    id,
    projectId: projectId || 'workspace',
    projectDocNumber: projectDocNumber || '',
    targetEntity: meta?.targetEntity || projectDocNumber || projectId || 'System',
    domain,
    severity,
    userName: user.name || 'Anonymous User',
    userRole: user.role || 'Project Engineer',
    userDept: user.dept || 'MFG',
    userEmail: user.email || '',
    userInitials: user.initials || (user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase() : 'ENG'),
    action,
    changedFields: changeCategories.length > 0 ? changeCategories : ['General Update'],
    diffDetails: structuredDiffs,
    metadata: meta?.metadata || null,
    createdAt: new Date().toISOString()
  };
}

/**
 * Detect granular diffs between project updates (backward-compatible key array)
 */
export function detectProjectChanges(prev = {}, next = {}) {
  const detailed = detectDetailedProjectChanges(prev, next);
  if (detailed.length > 0) {
    const keys = new Set();
    detailed.forEach(d => {
      if (d.category.includes('Title')) keys.add('title');
      else if (d.category.includes('Plant')) keys.add('plantCode');
      else if (d.category.includes('Product')) keys.add('productSpecifications');
      else if (d.category.includes('Frying') || d.category.includes('Seasoning')) keys.add('processParameters');
      else if (d.category.includes('Scope')) keys.add('scopeOfSupply');
      else keys.add(d.category);
    });
    return Array.from(keys);
  }

  const changes = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'lastModified') continue;
    const valPrev = prev[key];
    const valNext = next[key];
    if (JSON.stringify(valPrev) !== JSON.stringify(valNext)) {
      changes.push(key);
    }
  }
  return changes;
}

/**
 * Deep semantic change detector: exactly what changed, from what value, to what value
 */
export function detectDetailedProjectChanges(prev = {}, next = {}) {
  const diffs = [];
  if (!prev || !next) return diffs;

  // 1. Document Title
  const prevTitle = prev.documentInfo?.title || prev.title;
  const nextTitle = next.documentInfo?.title || next.title;
  if (prevTitle !== nextTitle && nextTitle !== undefined) {
    diffs.push({
      category: 'Document Title',
      description: 'Document title modified',
      from: prevTitle || 'Untitled',
      to: nextTitle
    });
  }

  // 2. Document Control Number (No. TRSA)
  const prevDocNum = prev.documentInfo?.docNumber || prev.docNumber;
  const nextDocNum = next.documentInfo?.docNumber || next.docNumber;
  if (prevDocNum !== nextDocNum && nextDocNum) {
    diffs.push({
      category: 'Document Control No.',
      description: 'Official TRSA Document Number updated',
      from: prevDocNum || 'None',
      to: nextDocNum
    });
  }

  // 3. Plant Location & Invoicing
  const prevPlant = prev.documentInfo?.plantLocation || prev.siteInvoicing?.plantLocation;
  const nextPlant = next.documentInfo?.plantLocation || next.siteInvoicing?.plantLocation;
  if (prevPlant !== nextPlant && nextPlant) {
    diffs.push({
      category: 'Plant Location',
      description: 'Factory site location & invoicing recipient changed',
      from: prevPlant || 'None',
      to: nextPlant
    });
  }

  // 3b. General Information (Country of Origin, Machine Type, Vendor Name, etc.)
  const prevGen = prev.generalInfo || {};
  const nextGen = next.generalInfo || {};
  if (prevGen.countryOfOrigin !== nextGen.countryOfOrigin && nextGen.countryOfOrigin) {
    diffs.push({
      category: 'Country of Origin',
      description: 'Machinery manufacturing country of origin updated',
      from: prevGen.countryOfOrigin || 'None',
      to: nextGen.countryOfOrigin
    });
  }
  const prevEquip = prevGen.equipmentType || prevGen.machineType;
  const nextEquip = nextGen.equipmentType || nextGen.machineType;
  if (prevEquip !== nextEquip && nextEquip) {
    diffs.push({
      category: 'Equipment Type',
      description: 'Equipment type classification modified',
      from: prevEquip || 'None',
      to: nextEquip
    });
  }
  if (prevGen.vendorName !== nextGen.vendorName && nextGen.vendorName) {
    diffs.push({
      category: 'Vendor Name',
      description: 'Vendor / OEM manufacturer name updated',
      from: prevGen.vendorName || 'None',
      to: nextGen.vendorName
    });
  }
  if (prevGen.modelNumber !== nextGen.modelNumber && nextGen.modelNumber !== undefined) {
    diffs.push({
      category: 'Model / Line Tag',
      description: 'Machine model number or line tag modified',
      from: prevGen.modelNumber || 'None',
      to: nextGen.modelNumber
    });
  }
  if (prevGen.designCapacity !== nextGen.designCapacity && nextGen.designCapacity !== undefined) {
    diffs.push({
      category: 'Design Capacity',
      description: 'Rated equipment design capacity updated',
      from: prevGen.designCapacity || 'None',
      to: nextGen.designCapacity
    });
  }
  if (Array.isArray(nextGen.equipmentModels) && JSON.stringify(prevGen.equipmentModels) !== JSON.stringify(nextGen.equipmentModels)) {
    diffs.push({
      category: 'Equipment Models',
      description: `Equipment models & capacities updated (${nextGen.equipmentModels.length} units)`,
      from: `${(prevGen.equipmentModels || []).length} units`,
      to: `${nextGen.equipmentModels.length} units`
    });
  }

  // 4. Project Workflow Status (top-level or documentInfo.status)
  const prevStatus = prev.documentInfo?.status || prev.status;
  const nextStatus = next.documentInfo?.status || next.status;
  if (prevStatus !== nextStatus && nextStatus) {
    diffs.push({
      category: 'Project Status',
      description: 'Workflow state changed',
      from: prevStatus || 'Draft',
      to: nextStatus
    });
  }

  // 5. Revision History
  const prevRevs = prev.documentInfo?.revisionHistory || [];
  const nextRevs = next.documentInfo?.revisionHistory || [];
  if (prevRevs.length !== nextRevs.length) {
    diffs.push({
      category: 'Revision History',
      description: nextRevs.length > prevRevs.length ? 'New revision stamped' : 'Revision record deleted',
      from: `${prevRevs.length} revisions`,
      to: `${nextRevs.length} revisions`
    });
  } else if (nextRevs.length > 0) {
    const lastP = prevRevs[prevRevs.length - 1];
    const lastN = nextRevs[nextRevs.length - 1];
    if (lastP && lastN && (lastP.description !== lastN.description || lastP.revision !== lastN.revision || lastP.date !== lastN.date)) {
      diffs.push({
        category: 'Revision History',
        description: `Revision ${lastN.revision} updated (${lastN.originatedBy || 'Author'})`,
        from: `${lastP.revision}: ${lastP.description || ''} (${lastP.date || ''})`,
        to: `${lastN.revision}: ${lastN.description || ''} (${lastN.date || ''})`
      });
    }
  }

  // 6. Site Location, Stakeholders & Customs Clause
  const prevContacts = prev.keyContacts || [];
  const nextContacts = next.keyContacts || [];
  if (JSON.stringify(prevContacts) !== JSON.stringify(nextContacts)) {
    diffs.push({
      category: 'Key Contacts',
      description: `Stakeholder PIC list modified (${nextContacts.length} contacts)`,
      from: `${prevContacts.length} contacts`,
      to: `${nextContacts.length} contacts`
    });
  }

  const prevSite = prev.siteDescription || {};
  const nextSite = next.siteDescription || {};
  if (prevSite.address !== nextSite.address && nextSite.address !== undefined) {
    diffs.push({
      category: 'Site Address',
      description: 'Plant delivery & site address modified',
      from: prevSite.address || 'None',
      to: nextSite.address
    });
  }
  if (prevSite.deliveryPort !== nextSite.deliveryPort && nextSite.deliveryPort !== undefined) {
    diffs.push({
      category: 'Delivery Port',
      description: 'Port of discharge / delivery destination updated',
      from: prevSite.deliveryPort || 'None',
      to: nextSite.deliveryPort
    });
  }

  const prevCustoms = prev.siteDescription?.customClearanceNote || prev.commercialTerms?.customClearanceClause;
  const nextCustoms = next.siteDescription?.customClearanceNote || next.commercialTerms?.customClearanceClause;
  if (prevCustoms !== nextCustoms && nextCustoms !== undefined) {
    diffs.push({
      category: 'Customs Clause (RBAC)',
      description: 'Port customs clearance & demurrage liability terms updated',
      from: (prevCustoms || '').slice(0, 45) + '...',
      to: (nextCustoms || '').slice(0, 45) + '...'
    });
  }

  // 7. Product Specifications Matrix
  const prevProds = prev.productSpecifications || [];
  const nextProds = next.productSpecifications || [];
  if (prevProds.length !== nextProds.length) {
    diffs.push({
      category: 'Product Specs',
      description: 'Product shapes list count modified',
      from: `${prevProds.length} products`,
      to: `${nextProds.length} products`
    });
  } else {
    nextProds.forEach((np, i) => {
      const pp = prevProds[i];
      if (pp) {
        if (pp.shape !== np.shape) {
          diffs.push({
            category: 'Product Specs',
            description: `Product shape #${i + 1} renamed`,
            from: pp.shape,
            to: np.shape
          });
        }
        if (pp.moistureOutput !== np.moistureOutput) {
          diffs.push({
            category: 'Product Specs',
            description: `${np.shape} moisture output target changed`,
            from: pp.moistureOutput || 'N/A',
            to: np.moistureOutput
          });
        }
        if (pp.oilContentOutput !== np.oilContentOutput) {
          diffs.push({
            category: 'Product Specs',
            description: `${np.shape} oil uptake percentage changed`,
            from: pp.oilContentOutput || 'N/A',
            to: np.oilContentOutput
          });
        }
        if (pp.capacityOutput !== np.capacityOutput) {
          diffs.push({
            category: 'Product Specs',
            description: `${np.shape} throughput capacity changed`,
            from: pp.capacityOutput || 'N/A',
            to: np.capacityOutput
          });
        }
      }
    });
  }

  // 8. Frying Process Operating Parameters
  const prevFrying = prev.processParameters?.frying || {};
  const nextFrying = next.processParameters?.frying || {};
  if (prevFrying.dwellTime !== nextFrying.dwellTime && nextFrying.dwellTime) {
    diffs.push({
      category: 'Frying Parameters',
      description: 'Fryer dwell / immersion time modified',
      from: prevFrying.dwellTime || 'N/A',
      to: nextFrying.dwellTime
    });
  }
  if (prevFrying.temperatureRange !== nextFrying.temperatureRange && nextFrying.temperatureRange) {
    diffs.push({
      category: 'Frying Parameters',
      description: 'Frying oil temperature modified',
      from: prevFrying.temperatureRange || 'N/A',
      to: nextFrying.temperatureRange
    });
  }
  if (prevFrying.feederRate !== nextFrying.feederRate && nextFrying.feederRate) {
    diffs.push({
      category: 'Frying Parameters',
      description: 'Pellet feeder rate modified',
      from: prevFrying.feederRate || 'N/A',
      to: nextFrying.feederRate
    });
  }

  // 9. Seasoning Process Operating Parameters
  const prevSeas = prev.processParameters?.seasoning || {};
  const nextSeas = next.processParameters?.seasoning || {};
  if (prevSeas.seasoningApplicationRate !== nextSeas.seasoningApplicationRate && nextSeas.seasoningApplicationRate) {
    diffs.push({
      category: 'Seasoning Parameters',
      description: 'Dry seasoning application rate modified',
      from: prevSeas.seasoningApplicationRate || 'N/A',
      to: nextSeas.seasoningApplicationRate
    });
  }
  if (prevSeas.saltContentBaseExcluded !== nextSeas.saltContentBaseExcluded && nextSeas.saltContentBaseExcluded) {
    diffs.push({
      category: 'Seasoning Parameters',
      description: 'Salt content target modified',
      from: prevSeas.saltContentBaseExcluded || 'N/A',
      to: nextSeas.saltContentBaseExcluded
    });
  }

  // 10. Scope of Supply
  const prevFryerScope = prev.scopeOfSupply?.fryer || [];
  const nextFryerScope = next.scopeOfSupply?.fryer || [];
  if (prevFryerScope.length !== nextFryerScope.length) {
    diffs.push({
      category: 'Project Scope',
      description: 'Fryer equipment breakdown items count changed',
      from: `${prevFryerScope.length} items`,
      to: `${nextFryerScope.length} items`
    });
  }

  const prevSeasScope = prev.scopeOfSupply?.seasoning || [];
  const nextSeasScope = next.scopeOfSupply?.seasoning || [];
  if (prevSeasScope.length !== nextSeasScope.length) {
    diffs.push({
      category: 'Project Scope',
      description: 'Seasoning equipment breakdown items count changed',
      from: `${prevSeasScope.length} items`,
      to: `${nextSeasScope.length} items`
    });
  }

  // 11. Hygiene, Acceptance & Commercial Terms
  const prevOption = prev.commercialTerms?.selectedPaymentOption;
  const nextOption = next.commercialTerms?.selectedPaymentOption;
  if (prevOption !== nextOption && nextOption) {
    diffs.push({
      category: 'Commercial Terms',
      description: 'Commercial payment schedule option changed',
      from: prevOption || 'None',
      to: nextOption
    });
  }

  if (prev.commercialTerms?.shipmentTerms !== next.commercialTerms?.shipmentTerms && next.commercialTerms?.shipmentTerms) {
    diffs.push({
      category: 'Shipment Terms',
      description: 'Incoterms / shipping delivery obligation updated',
      from: prev.commercialTerms?.shipmentTerms || 'None',
      to: next.commercialTerms.shipmentTerms
    });
  }

  if (prev.commercialTerms?.warranty !== next.commercialTerms?.warranty && next.commercialTerms?.warranty) {
    diffs.push({
      category: 'Warranty Terms',
      description: 'Warranty coverage clause updated',
      from: (prev.commercialTerms?.warranty || '').slice(0, 40),
      to: next.commercialTerms.warranty.slice(0, 40)
    });
  }

  // 12. Sign-Off Details
  if (JSON.stringify(prev.signOff?.seller) !== JSON.stringify(next.signOff?.seller)) {
    diffs.push({
      category: 'Sign-Off (Seller)',
      description: 'Seller signatory or quotation reference modified',
      from: `${prev.signOff?.seller?.companyName || ''} (${prev.signOff?.seller?.quotationNo || 'N/A'})`,
      to: `${next.signOff?.seller?.companyName || ''} (${next.signOff?.seller?.quotationNo || 'N/A'})`
    });
  }

  if (JSON.stringify(prev.signOff?.purchaser) !== JSON.stringify(next.signOff?.purchaser)) {
    diffs.push({
      category: 'Sign-Off (Buyer)',
      description: 'Purchaser signatory details updated',
      from: `${prev.signOff?.purchaser?.name || ''} - ${prev.signOff?.purchaser?.position || ''}`,
      to: `${next.signOff?.purchaser?.name || ''} - ${next.signOff?.purchaser?.position || ''}`
    });
  }

  // Fallback if content was modified but no specific field was caught
  if (diffs.length === 0 && JSON.stringify(prev) !== JSON.stringify(next)) {
    diffs.push({
      category: 'General Update',
      description: 'Engineering specifications updated',
      from: 'Previous state',
      to: 'Saved state'
    });
  }

  return diffs;
}

/**
 * Append audit log entry to storage and sync queue
 */
export function appendAuditLog(entry) {
  if (!entry) return null;
  const normalized = normalizeAuditEntry(entry);
  inMemoryAuditLogs.unshift(normalized);
  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs = inMemoryAuditLogs.slice(0, 500);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('trsa_audit_logs');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(normalized);
      const trimmed = list.slice(0, 500);
      window.localStorage.setItem('trsa_audit_logs', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not persist audit log to localStorage:', e);
    }
  }

  return normalized;
}

/**
 * Get audit logs for a project or all projects (newest first)
 */
export function getAuditLogs(projectId = null) {
  let logs = [...inMemoryAuditLogs];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('trsa_audit_logs');
      if (stored) {
        logs = JSON.parse(stored);
      }
    } catch (e) {
      // fallback to inMemory
    }
  }

  const normalized = Array.isArray(logs) ? logs.map(normalizeAuditEntry) : [];
  if (projectId) {
    return normalized.filter(l => l.projectId === projectId);
  }
  return normalized;
}

/**
 * Filter activity logs across domain, action, severity, project, actor, date range, and free text
 */
export function filterAuditLogs(logs = [], filters = {}) {
  const {
    projectId = null,
    domain = ACTIVITY_DOMAINS.ALL,
    action = 'all',
    severity = 'all',
    actor = '',
    searchQuery = '',
    dateFrom = '',
    dateTo = ''
  } = filters || {};

  const query = String(searchQuery || '').trim().toLowerCase();
  const actorQuery = String(actor || '').trim().toLowerCase();
  const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  return (Array.isArray(logs) ? logs : [])
    .map(normalizeAuditEntry)
    .filter(log => {
      if (projectId && projectId !== 'all' && log.projectId !== projectId) return false;
      if (domain && domain !== ACTIVITY_DOMAINS.ALL && log.domain !== domain) return false;
      if (action && action !== 'all' && log.action !== action) return false;
      if (severity && severity !== 'all' && log.severity !== severity) return false;
      if (actorQuery && !String(log.userName || '').toLowerCase().includes(actorQuery) &&
          !String(log.userEmail || '').toLowerCase().includes(actorQuery)) {
        return false;
      }

      if (fromTs !== null || toTs !== null) {
        const logTs = new Date(log.createdAt || 0).getTime();
        if (Number.isFinite(logTs)) {
          if (fromTs !== null && logTs < fromTs) return false;
          if (toTs !== null && logTs > toTs) return false;
        }
      }

      if (query) {
        const haystacks = [
          log.userName,
          log.userRole,
          log.userDept,
          log.userEmail,
          log.action,
          log.domain,
          log.projectDocNumber,
          log.targetEntity,
          ...(log.changedFields || []),
          ...((log.diffDetails || []).flatMap(d => [d.category, d.description, d.from, d.to]))
        ];
        const matched = haystacks.some(val => String(val || '').toLowerCase().includes(query));
        if (!matched) return false;
      }

      return true;
    });
}

/**
 * Compute aggregate activity metrics across all domains and actors
 */
export function computeActivityStats(logs = []) {
  const normalized = (Array.isArray(logs) ? logs : []).map(normalizeAuditEntry);
  const byDomain = {
    [ACTIVITY_DOMAINS.USER_ACTION]: 0,
    [ACTIVITY_DOMAINS.PROJECT_CHANGE]: 0,
    [ACTIVITY_DOMAINS.COMPLIANCE_MATRIX]: 0
  };
  const bySeverity = { info: 0, success: 0, warning: 0, security: 0 };
  const actorMap = new Map();
  const actionCounts = {};
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let last24hCount = 0;

  normalized.forEach(log => {
    if (byDomain[log.domain] !== undefined) {
      byDomain[log.domain]++;
    } else {
      byDomain[ACTIVITY_DOMAINS.PROJECT_CHANGE]++;
    }

    if (bySeverity[log.severity] !== undefined) {
      bySeverity[log.severity]++;
    } else {
      bySeverity.info++;
    }

    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

    const actorKey = log.userName || 'Unknown';
    if (!actorMap.has(actorKey)) {
      actorMap.set(actorKey, {
        name: actorKey,
        role: log.userRole || '',
        dept: log.userDept || '',
        initials: log.userInitials || 'USR',
        count: 0,
        lastActiveAt: log.createdAt || ''
      });
    }
    const actorEntry = actorMap.get(actorKey);
    actorEntry.count++;
    if (log.createdAt && (!actorEntry.lastActiveAt || log.createdAt > actorEntry.lastActiveAt)) {
      actorEntry.lastActiveAt = log.createdAt;
    }

    const ts = new Date(log.createdAt || 0).getTime();
    if (Number.isFinite(ts) && now - ts <= oneDayMs) {
      last24hCount++;
    }
  });

  const topActors = Array.from(actorMap.values()).sort((a, b) => b.count - a.count);

  return {
    total: normalized.length,
    byDomain,
    bySeverity,
    uniqueActors: actorMap.size,
    topActors,
    actionCounts,
    last24hCount,
    recentTimestamp: normalized[0]?.createdAt || null
  };
}

export function getDistinctAuditActions(logs = []) {
  const set = new Set();
  (Array.isArray(logs) ? logs : []).forEach(l => {
    if (l && l.action) set.add(l.action);
  });
  return Array.from(set).sort();
}

/**
 * Export audit log to JSON string
 */
export function exportAuditLogsToJSON(projectId = null, filters = null) {
  const logs = filters
    ? filterAuditLogs(getAuditLogs(projectId), filters)
    : getAuditLogs(projectId);
  return JSON.stringify(logs, null, 2);
}

/**
 * Export audit log to CSV format for corporate reporting
 */
export function exportAuditLogsToCSV(projectId = null, filters = null) {
  const logs = filters
    ? filterAuditLogs(getAuditLogs(projectId), filters)
    : getAuditLogs(projectId);
  const headers = [
    'Timestamp',
    'Domain',
    'Severity',
    'Action',
    'Project ID',
    'Doc Number / Target',
    'User Name',
    'Role',
    'Department',
    'Categories',
    'Diff Summary'
  ];

  const rows = logs.map(l => {
    const categories = (l.changedFields || []).join('; ');
    const diffSummary = (l.diffDetails || []).map(d => `${d.description}: "${d.from}" -> "${d.to}"`).join(' | ');
    return [
      `"${l.createdAt || ''}"`,
      `"${ACTIVITY_DOMAIN_LABELS[l.domain] || l.domain || ''}"`,
      `"${l.severity || 'info'}"`,
      `"${l.action || ''}"`,
      `"${l.projectId || ''}"`,
      `"${(l.projectDocNumber || l.targetEntity || '').replace(/"/g, '""')}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || '').replace(/"/g, '""')}"`,
      `"${(l.userDept || '').replace(/"/g, '""')}"`,
      `"${categories.replace(/"/g, '""')}"`,
      `"${diffSummary.replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
