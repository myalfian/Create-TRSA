/**
 * TRSA Studio - Enterprise Security, Hardening & RBAC Module
 * Implements Principle of Least Privilege, XSS Sanitization, and Role Management
 */

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  PURCHASER: 'purchaser'
});

let sessionRole = ROLES.ADMIN;
let sessionUser = {
  name: 'Refin A Putra',
  role: ROLES.ADMIN,
  department: 'MFG',
  email: 'refin.putra@icbp.indofood.co.id'
};

/**
 * Get the active session role
 */
export function getCurrentRole() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('trsa_user_role');
    if (saved && Object.values(ROLES).includes(saved)) {
      sessionRole = saved;
    }
  }
  return sessionRole;
}

/**
 * Set the active session role
 */
export function setCurrentRole(role) {
  if (Object.values(ROLES).includes(role)) {
    sessionRole = role;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('trsa_user_role', role);
    }
    if (sessionUser) {
      sessionUser.role = role;
    }
  }
  return sessionRole;
}

/**
 * Get the current user profile
 */
export function getCurrentUser() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('trsa_user_session');
    if (saved) {
      try {
        sessionUser = JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
  }
  return sessionUser;
}

/**
 * Set the current user profile
 */
export function setCurrentUser(user) {
  sessionUser = { ...sessionUser, ...user };
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('trsa_user_session', JSON.stringify(sessionUser));
  }
  if (sessionUser.role) {
    sessionRole = sessionUser.role;
  }
  return sessionUser;
}

/**
 * RBAC: Can edit Custom Clearance & Shipping Clause? (Strictly Admin only)
 */
export function canEditCustomClearance(role = getCurrentRole()) {
  return role === ROLES.ADMIN;
}

/**
 * RBAC: Can delete project? (Strictly Admin only)
 */
export function canDeleteProject(role = getCurrentRole()) {
  return role === ROLES.ADMIN;
}

/**
 * RBAC: Can change project status to target status?
 */
export function canChangeProjectStatus(role = getCurrentRole(), targetStatus) {
  if (role === ROLES.ADMIN) return true;
  
  // Engineers & Purchasers can only toggle between Draft and Under Review
  const permittedNonAdminStatuses = ['Draft', 'Under Review'];
  return permittedNonAdminStatuses.includes(targetStatus);
}

/**
 * RBAC: Can edit technical specifications?
 */
export function canEditTechnicalSpecs(role = getCurrentRole()) {
  return [ROLES.ADMIN, ROLES.ENGINEER].includes(role);
}

/**
 * Security: Sanitize a single string against HTML injection and XSS
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;

  // If input contains malicious HTML tags or javascript event attributes
  let cleaned = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(["'])?[^"'>\s]+\1?/gi, '');

  return cleaned;
}

/**
 * Security: Deep recursive sanitization of a project object before persisting
 */
export function sanitizeProject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeProject(item));
  }

  if (typeof obj === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(obj)) {
      sanitizedObj[key] = sanitizeProject(val);
    }
    return sanitizedObj;
  }

  return obj;
}
