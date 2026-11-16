/**
 * TRSA Studio - Audit Trail & Forensic Traceability Service
 * Tracks who changed what, when, and before/after values with immutable logging
 */

let inMemoryAuditLogs = [];

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
 * Generate a structured immutable audit entry capturing:
 * - Kapan (createdAt timestamp)
 * - Siapa (userName, userRole, userDept, userEmail)
 * - Apa yang diubah (action, changedFields, diffDetails with from/to)
 */
export function createAuditEntry(projectId, action = 'UPDATE', diffs = [], user = {}, projectDocNumber = '') {
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

  return {
    id,
    projectId,
    projectDocNumber: projectDocNumber || '',
    userName: user.name || 'Anonymous User',
    userRole: user.role || 'Project Engineer',
    userDept: user.dept || 'MFG',
    userEmail: user.email || '',
    userInitials: user.initials || (user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase() : 'ENG'),
    action, // 'CREATE', 'UPDATE', 'REVISION_STAMP', 'PLANT_CHANGE', 'STATUS_CHANGE', 'SYNC'
    changedFields: changeCategories.length > 0 ? changeCategories : ['General Update'],
    diffDetails: structuredDiffs,
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

  // 4. Project Workflow Status
  if (prev.status !== next.status && next.status) {
    diffs.push({
      category: 'Project Status',
      description: 'Workflow state changed',
      from: prev.status || 'Draft',
      to: next.status
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
    if (lastP && lastN && (lastP.description !== lastN.description || lastP.revision !== lastN.revision)) {
      diffs.push({
        category: 'Revision History',
        description: `Revision ${lastN.revision} description updated`,
        from: `${lastP.revision}: ${lastP.description || ''}`,
        to: `${lastN.revision}: ${lastN.description || ''}`
      });
    }
  }

  // 6. Custom Clearance & Shipping Clause (RBAC)
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

  // 11. Commercial Payment Option
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
  if (!entry) return;
  inMemoryAuditLogs.unshift(entry);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('trsa_audit_logs');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(entry);
      // Keep up to 300 logs locally
      const trimmed = list.slice(0, 300);
      window.localStorage.setItem('trsa_audit_logs', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not persist audit log to localStorage:', e);
    }
  }

  return entry;
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

  if (projectId) {
    return logs.filter(l => l.projectId === projectId);
  }
  return logs;
}

/**
 * Export audit log to JSON string
 */
export function exportAuditLogsToJSON(projectId = null) {
  const logs = getAuditLogs(projectId);
  return JSON.stringify(logs, null, 2);
}

/**
 * Export audit log to CSV format for corporate reporting
 */
export function exportAuditLogsToCSV(projectId = null) {
  const logs = getAuditLogs(projectId);
  const headers = ['Timestamp', 'Action', 'Project ID', 'Doc Number', 'User Name', 'Role', 'Department', 'Categories', 'Diff Summary'];
  
  const rows = logs.map(l => {
    const categories = (l.changedFields || []).join('; ');
    const diffSummary = (l.diffDetails || []).map(d => `${d.description}: "${d.from}" -> "${d.to}"`).join(' | ');
    return [
      `"${l.createdAt || ''}"`,
      `"${l.action || ''}"`,
      `"${l.projectId || ''}"`,
      `"${l.projectDocNumber || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.userDept || ''}"`,
      `"${categories.replace(/"/g, '""')}"`,
      `"${diffSummary.replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
