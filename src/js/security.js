/**
 * TRSA Studio - Enterprise Security, Hardening & RBAC Module
 * Implements Principle of Least Privilege, XSS Sanitization, and Role Management
 */

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  PURCHASER: 'purchaser'
});

export const ORG_ROLES = Object.freeze({
  SUPER_ADMIN: 'Super Admin (Project & Engineering Manager)',
  PROJECT_ENGINEERING_TEAM: 'Project & Engineering Team',
  PURCHASING_PLANT: 'Purchasing Plant',
  PIC_PROJECT: 'PIC Project'
});

export const ORG_ROLE_LIST = Object.freeze([
  ORG_ROLES.SUPER_ADMIN,
  ORG_ROLES.PROJECT_ENGINEERING_TEAM,
  ORG_ROLES.PURCHASING_PLANT,
  ORG_ROLES.PIC_PROJECT
]);

export const ROLE_CAPABILITIES = Object.freeze({
  [ORG_ROLES.SUPER_ADMIN]: {
    code: 'SUPER_ADMIN',
    label: ORG_ROLES.SUPER_ADMIN,
    shortLabel: 'Super Admin',
    legacyRole: ROLES.ADMIN,
    description: 'Full governance over TRSA agreements, Compliance Matrix per-user policies, User/Vendor/Plant/Dept/Jabatan master data, status approvals, and project deletions.',
    permissions: ['View & Edit All TRSA', 'Manage Compliance Matrix Users', 'Manage Users, Vendors & Plants', 'Approve / Publish / Delete TRSA', 'Edit Customs Clearance']
  },
  [ORG_ROLES.PROJECT_ENGINEERING_TEAM]: {
    code: 'PROJECT_ENGINEERING_TEAM',
    label: ORG_ROLES.PROJECT_ENGINEERING_TEAM,
    shortLabel: 'Proj & Eng Team',
    legacyRole: ROLES.ENGINEER,
    description: 'Authors technical specifications, product matrices, equipment scope of supply, hygienic standards, and commissioning performance protocols.',
    permissions: ['Create & Edit TRSA Technical Specs', 'Manage Product & Equipment Scope', 'View & Sync Plant Compliance Matrix', 'Save & Resume Drafts']
  },
  [ORG_ROLES.PURCHASING_PLANT]: {
    code: 'PURCHASING_PLANT',
    label: ORG_ROLES.PURCHASING_PLANT,
    shortLabel: 'Purchasing Plant',
    legacyRole: ROLES.PURCHASER,
    description: 'Manages vendor directory, commercial payment milestones, SWIFT BG/Undertaking terms, tax/PPN/PPh provisions, and invoice submission compliance.',
    permissions: ['Manage Commercial & Tax Terms', 'Manage Plant Vendor Profiles', 'Inspect Compliance Matrix & Audit', 'Verify Invoicing & Delivery Terms']
  },
  [ORG_ROLES.PIC_PROJECT]: {
    code: 'PIC_PROJECT',
    label: ORG_ROLES.PIC_PROJECT,
    shortLabel: 'PIC Project',
    legacyRole: ROLES.ENGINEER,
    description: 'Plant-level Project & Engineering PIC responsible for site readiness, stakeholder coordination, FAT/SAT acceptance, and local matrix alignment.',
    permissions: ['Coordinate Plant PIC Stakeholders', 'Edit Assigned Plant TRSA', 'Review FAT/SAT & Snag List', 'Inspect Assigned Matrix Clauses']
  }
});

export function isSuperAdminRole(roleOrName = '') {
  const s = String(roleOrName || '').toLowerCase();
  return s.includes('super admin') || s.includes('manager') || s === ROLES.ADMIN || s.includes('yusuf alfian');
}

export function mapToLegacyRole(orgRole = '') {
  const s = String(orgRole || '').toLowerCase();
  if (isSuperAdminRole(s)) return ROLES.ADMIN;
  if (s.includes('purchas')) return ROLES.PURCHASER;
  return ROLES.ENGINEER;
}

let sessionRole = ROLES.ADMIN;
let sessionUser = {
  name: 'Moh Yusuf Alfian',
  role: ORG_ROLES.SUPER_ADMIN,
  department: 'MFG',
  email: 'my.alfian@icbp.indofood.co.id'
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
