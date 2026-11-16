import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
  ROLES, 
  getCurrentRole, 
  setCurrentRole, 
  getCurrentUser,
  setCurrentUser,
  canEditCustomClearance,
  canDeleteProject,
  canChangeProjectStatus,
  sanitizeInput,
  sanitizeProject
} from '../src/js/security.js';

describe('Security & RBAC Enforcement Tests', () => {
  beforeEach(() => {
    setCurrentRole(ROLES.ADMIN);
    setCurrentUser({ name: 'Refin A Putra', role: ROLES.ADMIN });
  });

  test('Verify Role Management and Defaults', () => {
    assert.strictEqual(ROLES.ADMIN, 'admin');
    assert.strictEqual(ROLES.ENGINEER, 'engineer');
    assert.strictEqual(ROLES.PURCHASER, 'purchaser');

    setCurrentRole(ROLES.ENGINEER);
    assert.strictEqual(getCurrentRole(), 'engineer');

    setCurrentRole(ROLES.PURCHASER);
    assert.strictEqual(getCurrentRole(), 'purchaser');
  });

  test('RBAC: Custom Clearance & Shipping Clause is strictly Admin-only', () => {
    assert.strictEqual(canEditCustomClearance(ROLES.ADMIN), true, 'Admin MUST have permission to edit custom clearance');
    assert.strictEqual(canEditCustomClearance(ROLES.ENGINEER), false, 'Engineer MUST NOT be able to edit custom clearance');
    assert.strictEqual(canEditCustomClearance(ROLES.PURCHASER), false, 'Purchaser MUST NOT be able to edit custom clearance');
    assert.strictEqual(canEditCustomClearance(null), false, 'Unauthenticated user MUST NOT edit custom clearance');
  });

  test('RBAC: Project deletion is strictly Admin-only', () => {
    assert.strictEqual(canDeleteProject(ROLES.ADMIN), true, 'Admin can delete projects');
    assert.strictEqual(canDeleteProject(ROLES.ENGINEER), false, 'Engineer cannot delete projects');
    assert.strictEqual(canDeleteProject(ROLES.PURCHASER), false, 'Purchaser cannot delete projects');
  });

  test('RBAC: Project status transition validation', () => {
    // Engineers can move between Draft and Under Review
    assert.strictEqual(canChangeProjectStatus(ROLES.ENGINEER, 'Under Review'), true);
    assert.strictEqual(canChangeProjectStatus(ROLES.ENGINEER, 'Draft'), true);
    // Engineers cannot approve or publish
    assert.strictEqual(canChangeProjectStatus(ROLES.ENGINEER, 'Approved'), false);
    assert.strictEqual(canChangeProjectStatus(ROLES.ENGINEER, 'Published'), false);

    // Admins can change to any status
    assert.strictEqual(canChangeProjectStatus(ROLES.ADMIN, 'Approved'), true);
    assert.strictEqual(canChangeProjectStatus(ROLES.ADMIN, 'Published'), true);
  });

  test('Security Hardening: XSS Payload Sanitization', () => {
    const maliciousScript = '<script>alert("XSS Attack")</script>';
    const sanitizedScript = sanitizeInput(maliciousScript);
    assert.ok(!sanitizedScript.includes('<script>'), 'Script tag must be stripped or encoded');

    const maliciousEvent = '<img src="x" onerror="stealCookies()">';
    const sanitizedEvent = sanitizeInput(maliciousEvent);
    assert.ok(!sanitizedEvent.toLowerCase().includes('onerror='), 'Inline event handlers must be sanitized');

    const normalText = 'Indofood Semarang Plant 1402 & Fryer System';
    assert.strictEqual(sanitizeInput(normalText), normalText, 'Normal strings should remain intact');
  });

  test('Security Hardening: Deep Project Payload Sanitization', () => {
    const rawProject = {
      title: 'Sheeted Fryer <script>evil()</script>',
      documentInfo: {
        docNumber: '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024',
        companyName: 'PT. Indofood <iframe src="evil.com"></iframe>'
      },
      productSpecifications: [
        { shape: '3D Chicken <b onmouseover="hack()">Legs</b>' }
      ]
    };

    const cleaned = sanitizeProject(rawProject);
    assert.ok(!cleaned.title.includes('<script>'));
    assert.ok(!cleaned.documentInfo.companyName.includes('<iframe'));
    assert.ok(!cleaned.productSpecifications[0].shape.includes('onmouseover='));
  });
});
