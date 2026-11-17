/**
 * TRSA Studio - LocalStorage Draft History Service
 * Saves, lists, restores, and manages versioned TRSA draft snapshots in browser localStorage
 */

import { sanitizeProject } from './security.js';

export const DRAFT_HISTORY_KEY = 'TRSA_DRAFT_HISTORY_V1';
export const MAX_DRAFT_ENTRIES = 50;
const AUTO_SAVE_COALESCE_MS = 2 * 60 * 1000;

let inMemoryDraftHistory = [];

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

function readHistory() {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(DRAFT_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Could not read draft history from localStorage:', e);
      return [];
    }
  }
  return [...inMemoryDraftHistory];
}

function writeHistory(entries) {
  const list = Array.isArray(entries) ? entries : [];
  inMemoryDraftHistory = [...list];

  const storage = getStorage();
  if (!storage) return list;

  let candidate = [...list];
  while (candidate.length >= 0) {
    try {
      storage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(candidate));
      inMemoryDraftHistory = [...candidate];
      return candidate;
    } catch (e) {
      // Handle localStorage quota exceeded by evicting oldest drafts
      if (candidate.length > 1) {
        candidate = candidate.slice(0, candidate.length - 1);
      } else {
        console.warn('Could not persist draft history to localStorage:', e);
        return candidate;
      }
    }
  }
  return candidate;
}

/**
 * Format ISO timestamp into clean human-readable date & time
 */
export function formatDraftTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Relative time string (e.g. "Just now", "5m ago", "2h ago")
 */
export function getDraftRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const now = Date.now();
    const time = new Date(isoString).getTime();
    if (isNaN(time)) return '';
    const diffSec = Math.max(0, Math.floor((now - time) / 1000));

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
 * Get all saved draft history entries (newest first), optionally filtered by projectId
 */
export function getDraftHistory(projectId = null) {
  const list = readHistory();
  if (projectId) {
    return list.filter(entry => entry.projectId === projectId);
  }
  return list;
}

/**
 * Find a specific saved draft by ID
 */
export function getDraftById(draftId) {
  if (!draftId) return null;
  const list = readHistory();
  return list.find(entry => entry.id === draftId) || null;
}

/**
 * Save a TRSA project draft snapshot to localStorage history
 */
export function saveDraftToHistory(project, options = {}) {
  if (!project || !project.id) return null;

  const {
    user = {},
    builderStep = 1,
    progress = 0,
    label = '',
    isAutoSave = false,
    maxEntries = MAX_DRAFT_ENTRIES
  } = options;

  const sanitizedSnapshot = sanitizeProject(JSON.parse(JSON.stringify(project)));
  const nowIso = new Date().toISOString();

  const userName = user.name || 'Project Engineer';
  const userInitials = user.initials || userName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'ENG';

  const entry = {
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    projectId: sanitizedSnapshot.id,
    title: sanitizedSnapshot.documentInfo?.title || 'Untitled TRSA Draft',
    subTitle: sanitizedSnapshot.documentInfo?.subTitle || '',
    docNumber: sanitizedSnapshot.documentInfo?.docNumber || '',
    plantLocation: sanitizedSnapshot.documentInfo?.plantLocation || 'Semarang Plant',
    status: sanitizedSnapshot.documentInfo?.status || 'Draft',
    vendorName: sanitizedSnapshot.generalInfo?.vendorName || '',
    savedBy: userName,
    savedByInitials: userInitials,
    savedByRole: user.role || 'Project Engineer',
    builderStep: Math.min(6, Math.max(1, Number(builderStep) || 1)),
    progress: Math.min(100, Math.max(0, Number(progress) || 0)),
    label: String(label || '').trim() || (isAutoSave ? 'Auto-Saved Draft' : 'Manual Draft Checkpoint'),
    isAutoSave: Boolean(isAutoSave),
    savedAt: nowIso,
    snapshot: sanitizedSnapshot
  };

  const list = readHistory();
  const latest = list[0];

  // Coalesce rapid auto-saves for the same project within 2 minutes
  if (entry.isAutoSave && latest && latest.isAutoSave && latest.projectId === entry.projectId) {
    const elapsed = Date.now() - new Date(latest.savedAt).getTime();
    if (!isNaN(elapsed) && elapsed >= 0 && elapsed < AUTO_SAVE_COALESCE_MS) {
      entry.id = latest.id;
      list[0] = entry;
      writeHistory(list.slice(0, maxEntries));
      return entry;
    }
  }

  list.unshift(entry);
  writeHistory(list.slice(0, maxEntries));
  return entry;
}

/**
 * Delete a single saved draft from localStorage history
 */
export function deleteDraftFromHistory(draftId) {
  if (!draftId) return { deleted: false, history: readHistory() };
  const list = readHistory();
  const next = list.filter(entry => entry.id !== draftId);
  const deleted = next.length !== list.length;
  if (deleted) {
    writeHistory(next);
  }
  return { deleted, history: next };
}

/**
 * Clear saved drafts (all or for a specific projectId)
 */
export function clearDraftHistory(projectId = null) {
  if (projectId) {
    const next = readHistory().filter(entry => entry.projectId !== projectId);
    writeHistory(next);
    return next;
  }
  inMemoryDraftHistory = [];
  const storage = getStorage();
  if (storage) {
    storage.removeItem(DRAFT_HISTORY_KEY);
  }
  return [];
}

/**
 * Export draft history to formatted JSON
 */
export function exportDraftHistoryJSON(projectId = null) {
  return JSON.stringify(getDraftHistory(projectId), null, 2);
}
