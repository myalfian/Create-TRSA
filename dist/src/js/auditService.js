/**
 * TRSA Studio - Audit Trail & Event Logging Service
 * Generates immutable audit records and tracks changes between revisions
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
 * Generate a structured immutable audit entry
 */
export function createAuditEntry(projectId, action, changedFields = [], user = {}) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    projectId,
    userName: user.name || 'Anonymous User',
    userRole: user.role || 'engineer',
    action, // 'CREATE', 'UPDATE', 'DUPLICATE', 'DELETE', 'SYNC'
    changedFields: Array.isArray(changedFields) ? changedFields : [],
    createdAt: new Date().toISOString()
  };
}

/**
 * Detect diffs between previous and updated project states
 */
export function detectProjectChanges(prev = {}, next = {}) {
  const changes = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'lastModified') continue;

    const valPrev = prev[key];
    const valNext = next[key];

    if (valPrev === undefined && valNext !== undefined) {
      changes.push(key);
    } else if (valPrev !== undefined && valNext === undefined) {
      changes.push(key);
    } else if (typeof valPrev === 'object' && valPrev !== null) {
      if (JSON.stringify(valPrev) !== JSON.stringify(valNext)) {
        changes.push(key);
      }
    } else if (valPrev !== valNext) {
      changes.push(key);
    }
  }

  return changes;
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
      // Keep up to 200 logs locally
      const trimmed = list.slice(0, 200);
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
