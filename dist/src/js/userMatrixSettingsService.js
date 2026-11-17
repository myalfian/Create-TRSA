/**
 * TRSA Studio - Per-User Compliance Matrix Settings Service
 * Allows Admins to configure Compliance Matrix access, allowed plants,
 * allowed vendor origins, assigned clauses (I-XIX), and edit permissions per user.
 */

import { TRSA_COMPLIANCE_MATRIX, resolvePlantCode, normalizeOriginMode } from './trsaMatrixService.js';

export const USER_MATRIX_SETTINGS_KEY = 'TRSA_USER_MATRIX_SETTINGS_V1';
export const MATRIX_PLANT_CODES = ['1402', '1403', '1405', '1411'];
export const MATRIX_ORIGIN_MODES = ['Foreign', 'Local', 'Mixed'];

export function getAllMatrixClauseIds() {
  return TRSA_COMPLIANCE_MATRIX.map(row => row.id);
}

const TECHNICAL_CLAUSE_PREFIXES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function isTechnicalClauseId(id = '') {
  const prefix = String(id).split('.')[0];
  return TECHNICAL_CLAUSE_PREFIXES.includes(prefix);
}

export const MATRIX_USER_PRESETS = Object.freeze({
  full_access: {
    key: 'full_access',
    label: 'Full Matrix Access',
    description: 'All 4 plants, all 3 sourcing origins, all 19 clauses, edit & align enabled'
  },
  engineering_tech: {
    key: 'engineering_tech',
    label: 'Engineering (Clauses I–XII)',
    description: 'All plants & origins with focus on technical specifications (Clauses I–XII)'
  },
  purchasing_commercial: {
    key: 'purchasing_commercial',
    label: 'Purchasing (Clauses XIII–XIX)',
    description: 'Commercial, shipment, tax & documentation clauses (Clauses XIII–XIX), read-only alignment'
  },
  plant_1403_local: {
    key: 'plant_1403_local',
    label: 'Plant 1403 Local Only',
    description: 'Restricted to Semarang Plant (1403) and Local sourcing mode'
  },
  read_only: {
    key: 'read_only',
    label: 'Read-Only Viewer',
    description: 'Can inspect full Compliance Matrix and Deep Audit without modifying alignments'
  },
  no_access: {
    key: 'no_access',
    label: 'Restricted (No Matrix Access)',
    description: 'Blocks access to the Compliance Matrix workspace for this user'
  }
});

export function getUserSettingKey(user) {
  if (!user) return '';
  if (typeof user === 'string') return user.trim().toLowerCase();
  const key = user.email || user.name || '';
  return String(key).trim().toLowerCase();
}

export function getDefaultUserMatrixSetting(member = {}) {
  const allClauses = getAllMatrixClauseIds();
  return {
    userKey: getUserSettingKey(member),
    name: member.name || '',
    email: member.email || '',
    role: member.role || 'Project Engineer',
    dept: member.dept || 'MFG',
    canViewMatrix: true,
    canEditMatrix: true,
    allowedPlants: [...MATRIX_PLANT_CODES],
    allowedOrigins: [...MATRIX_ORIGIN_MODES],
    defaultPlantCode: '1403',
    defaultOrigin: 'Foreign',
    assignedClauses: [...allClauses],
    customNotes: '',
    updatedBy: 'System Default',
    updatedAt: null
  };
}

function normalizeSetting(raw = {}, member = {}) {
  const defaults = getDefaultUserMatrixSetting(member);
  const allClauses = getAllMatrixClauseIds();

  const canViewMatrix = typeof raw.canViewMatrix === 'boolean' ? raw.canViewMatrix : defaults.canViewMatrix;
  const canEditMatrix = canViewMatrix && (typeof raw.canEditMatrix === 'boolean' ? raw.canEditMatrix : defaults.canEditMatrix);

  let allowedPlants = Array.isArray(raw.allowedPlants)
    ? raw.allowedPlants.map(p => resolvePlantCode(p)).filter(code => MATRIX_PLANT_CODES.includes(code))
    : [...defaults.allowedPlants];
  allowedPlants = Array.from(new Set(allowedPlants));
  if (allowedPlants.length === 0) {
    allowedPlants = ['1403'];
  }

  let allowedOrigins = Array.isArray(raw.allowedOrigins)
    ? raw.allowedOrigins.map(o => normalizeOriginMode(o)).filter(o => MATRIX_ORIGIN_MODES.includes(o))
    : [...defaults.allowedOrigins];
  allowedOrigins = Array.from(new Set(allowedOrigins));
  if (allowedOrigins.length === 0) {
    allowedOrigins = ['Foreign'];
  }

  const defaultPlantCode = allowedPlants.includes(resolvePlantCode(raw.defaultPlantCode))
    ? resolvePlantCode(raw.defaultPlantCode)
    : allowedPlants[0];

  const defaultOrigin = allowedOrigins.includes(normalizeOriginMode(raw.defaultOrigin))
    ? normalizeOriginMode(raw.defaultOrigin)
    : allowedOrigins[0];

  const assignedClauses = Array.isArray(raw.assignedClauses)
    ? Array.from(new Set(raw.assignedClauses.filter(id => allClauses.includes(id))))
    : [...defaults.assignedClauses];

  return {
    userKey: getUserSettingKey(member) || String(raw.userKey || '').trim().toLowerCase(),
    name: member.name || raw.name || '',
    email: member.email || raw.email || '',
    role: member.role || raw.role || defaults.role,
    dept: member.dept || raw.dept || defaults.dept,
    canViewMatrix,
    canEditMatrix,
    allowedPlants,
    allowedOrigins,
    defaultPlantCode,
    defaultOrigin,
    assignedClauses,
    customNotes: typeof raw.customNotes === 'string' ? raw.customNotes : '',
    updatedBy: raw.updatedBy || defaults.updatedBy,
    updatedAt: raw.updatedAt || null
  };
}

export function loadUserMatrixSettings(teamMembers = []) {
  let storedMap = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(USER_MATRIX_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          storedMap = parsed;
        }
      }
    }
  } catch (e) {
    storedMap = {};
  }

  const result = {};
  for (const member of teamMembers) {
    const key = getUserSettingKey(member);
    if (!key) continue;
    const saved = storedMap[key] || storedMap[String(member.name || '').toLowerCase()] || {};
    result[key] = normalizeSetting(saved, member);
  }

  for (const [k, val] of Object.entries(storedMap)) {
    if (!result[k] && val && typeof val === 'object') {
      result[k] = normalizeSetting(val, val);
    }
  }

  return result;
}

export function saveUserMatrixSettings(settingsMap = {}) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_MATRIX_SETTINGS_KEY, JSON.stringify(settingsMap));
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function getUserMatrixSetting(userOrKey, teamMembers = []) {
  const settingsMap = loadUserMatrixSettings(teamMembers);
  if (!userOrKey) {
    const first = teamMembers[0] ? getUserSettingKey(teamMembers[0]) : '';
    return settingsMap[first] || getDefaultUserMatrixSetting(teamMembers[0] || {});
  }

  const directKey = getUserSettingKey(userOrKey);
  if (settingsMap[directKey]) return settingsMap[directKey];

  const byName = teamMembers.find(
    m => String(m.name || '').toLowerCase() === directKey || String(m.email || '').toLowerCase() === directKey
  );
  if (byName) {
    const k = getUserSettingKey(byName);
    return settingsMap[k] || getDefaultUserMatrixSetting(byName);
  }

  const memberObj = typeof userOrKey === 'object' ? userOrKey : { name: String(userOrKey) };
  return getDefaultUserMatrixSetting(memberObj);
}

export function isUserSettingCustomized(setting, member = {}) {
  if (!setting) return false;
  const def = getDefaultUserMatrixSetting(member);
  if (setting.canViewMatrix !== def.canViewMatrix) return true;
  if (setting.canEditMatrix !== def.canEditMatrix) return true;
  if (setting.defaultPlantCode !== def.defaultPlantCode) return true;
  if (setting.defaultOrigin !== def.defaultOrigin) return true;
  if (String(setting.customNotes || '').trim() !== '') return true;
  if (setting.allowedPlants.length !== def.allowedPlants.length) return true;
  if (setting.allowedOrigins.length !== def.allowedOrigins.length) return true;
  if (setting.assignedClauses.length !== def.assignedClauses.length) return true;
  return false;
}

export function updateUserMatrixSetting(userOrKey, patch = {}, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const settingsMap = loadUserMatrixSettings(teamMembers);

  let targetMember = typeof userOrKey === 'object' ? userOrKey : null;
  const rawKey = getUserSettingKey(userOrKey);
  if (!targetMember) {
    targetMember = teamMembers.find(
      m => getUserSettingKey(m) === rawKey || String(m.name || '').toLowerCase() === rawKey
    ) || { name: String(userOrKey) };
  }

  const key = getUserSettingKey(targetMember);
  const current = settingsMap[key] || getDefaultUserMatrixSetting(targetMember);
  const merged = normalizeSetting(
    {
      ...current,
      ...patch,
      updatedBy,
      updatedAt: new Date().toISOString()
    },
    targetMember
  );

  settingsMap[key] = merged;
  saveUserMatrixSettings(settingsMap);
  return merged;
}

export function toggleUserPlantAccess(userOrKey, plantCode, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const current = getUserMatrixSetting(userOrKey, teamMembers);
  const code = resolvePlantCode(plantCode);
  if (!MATRIX_PLANT_CODES.includes(code)) return current;

  const has = current.allowedPlants.includes(code);
  let nextPlants;
  if (has) {
    if (current.allowedPlants.length <= 1) {
      return current; // Keep at least 1 allowed plant
    }
    nextPlants = current.allowedPlants.filter(c => c !== code);
  } else {
    nextPlants = MATRIX_PLANT_CODES.filter(c => current.allowedPlants.includes(c) || c === code);
  }

  const nextDefault = nextPlants.includes(current.defaultPlantCode) ? current.defaultPlantCode : nextPlants[0];
  return updateUserMatrixSetting(
    userOrKey,
    { allowedPlants: nextPlants, defaultPlantCode: nextDefault },
    { teamMembers, updatedBy }
  );
}

export function toggleUserOriginAccess(userOrKey, origin, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const current = getUserMatrixSetting(userOrKey, teamMembers);
  const mode = normalizeOriginMode(origin);
  if (!MATRIX_ORIGIN_MODES.includes(mode)) return current;

  const has = current.allowedOrigins.includes(mode);
  let nextOrigins;
  if (has) {
    if (current.allowedOrigins.length <= 1) {
      return current; // Keep at least 1 allowed origin
    }
    nextOrigins = current.allowedOrigins.filter(o => o !== mode);
  } else {
    nextOrigins = MATRIX_ORIGIN_MODES.filter(o => current.allowedOrigins.includes(o) || o === mode);
  }

  const nextDefault = nextOrigins.includes(current.defaultOrigin) ? current.defaultOrigin : nextOrigins[0];
  return updateUserMatrixSetting(
    userOrKey,
    { allowedOrigins: nextOrigins, defaultOrigin: nextDefault },
    { teamMembers, updatedBy }
  );
}

export function toggleUserClauseAccess(userOrKey, clauseId, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const current = getUserMatrixSetting(userOrKey, teamMembers);
  const allClauses = getAllMatrixClauseIds();
  if (!allClauses.includes(clauseId)) return current;

  const has = current.assignedClauses.includes(clauseId);
  const nextClauses = has
    ? current.assignedClauses.filter(id => id !== clauseId)
    : allClauses.filter(id => current.assignedClauses.includes(id) || id === clauseId);

  return updateUserMatrixSetting(
    userOrKey,
    { assignedClauses: nextClauses },
    { teamMembers, updatedBy }
  );
}

export function applyPresetToUserMatrix(userOrKey, presetKey, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const allClauses = getAllMatrixClauseIds();
  const techClauses = allClauses.filter(id => isTechnicalClauseId(id));
  const commercialClauses = allClauses.filter(id => !isTechnicalClauseId(id));

  let patch = {};
  switch (presetKey) {
    case 'engineering_tech':
      patch = {
        canViewMatrix: true,
        canEditMatrix: true,
        allowedPlants: [...MATRIX_PLANT_CODES],
        allowedOrigins: [...MATRIX_ORIGIN_MODES],
        defaultPlantCode: '1403',
        defaultOrigin: 'Foreign',
        assignedClauses: techClauses
      };
      break;
    case 'purchasing_commercial':
      patch = {
        canViewMatrix: true,
        canEditMatrix: false,
        allowedPlants: [...MATRIX_PLANT_CODES],
        allowedOrigins: [...MATRIX_ORIGIN_MODES],
        defaultPlantCode: '1403',
        defaultOrigin: 'Foreign',
        assignedClauses: commercialClauses
      };
      break;
    case 'plant_1403_local':
      patch = {
        canViewMatrix: true,
        canEditMatrix: true,
        allowedPlants: ['1403'],
        allowedOrigins: ['Local'],
        defaultPlantCode: '1403',
        defaultOrigin: 'Local',
        assignedClauses: [...allClauses]
      };
      break;
    case 'read_only':
      patch = {
        canViewMatrix: true,
        canEditMatrix: false,
        allowedPlants: [...MATRIX_PLANT_CODES],
        allowedOrigins: [...MATRIX_ORIGIN_MODES],
        defaultPlantCode: '1403',
        defaultOrigin: 'Foreign',
        assignedClauses: [...allClauses]
      };
      break;
    case 'no_access':
      patch = {
        canViewMatrix: false,
        canEditMatrix: false,
        allowedPlants: ['1403'],
        allowedOrigins: ['Foreign'],
        defaultPlantCode: '1403',
        defaultOrigin: 'Foreign',
        assignedClauses: []
      };
      break;
    case 'full_access':
    default:
      patch = {
        canViewMatrix: true,
        canEditMatrix: true,
        allowedPlants: [...MATRIX_PLANT_CODES],
        allowedOrigins: [...MATRIX_ORIGIN_MODES],
        defaultPlantCode: '1403',
        defaultOrigin: 'Foreign',
        assignedClauses: [...allClauses]
      };
      break;
  }

  return updateUserMatrixSetting(userOrKey, patch, { teamMembers, updatedBy });
}

export function resetUserMatrixSetting(userOrKey, options = {}) {
  const { teamMembers = [], updatedBy = 'Admin' } = options;
  const settingsMap = loadUserMatrixSettings(teamMembers);
  const rawKey = getUserSettingKey(userOrKey);
  const member = (typeof userOrKey === 'object' ? userOrKey : null) ||
    teamMembers.find(m => getUserSettingKey(m) === rawKey || String(m.name || '').toLowerCase() === rawKey) ||
    { name: String(userOrKey) };

  const key = getUserSettingKey(member);
  const reset = getDefaultUserMatrixSetting(member);
  reset.updatedBy = updatedBy;
  reset.updatedAt = new Date().toISOString();
  settingsMap[key] = reset;
  saveUserMatrixSettings(settingsMap);
  return reset;
}

export function resetAllUserMatrixSettings(teamMembers = []) {
  const settingsMap = {};
  for (const member of teamMembers) {
    const key = getUserSettingKey(member);
    if (key) {
      settingsMap[key] = getDefaultUserMatrixSetting(member);
    }
  }
  saveUserMatrixSettings(settingsMap);
  return settingsMap;
}

export function isPlantAllowedForUser(setting, plantLocationOrCode) {
  if (!setting) return true;
  if (!setting.canViewMatrix) return false;
  const code = resolvePlantCode(plantLocationOrCode);
  return Array.isArray(setting.allowedPlants) ? setting.allowedPlants.includes(code) : true;
}

export function isOriginAllowedForUser(setting, origin) {
  if (!setting) return true;
  if (!setting.canViewMatrix) return false;
  const mode = normalizeOriginMode(origin);
  return Array.isArray(setting.allowedOrigins) ? setting.allowedOrigins.includes(mode) : true;
}

export function isClauseAssignedToUser(setting, clauseId) {
  if (!setting) return true;
  if (!setting.canViewMatrix) return false;
  return Array.isArray(setting.assignedClauses) ? setting.assignedClauses.includes(clauseId) : true;
}
