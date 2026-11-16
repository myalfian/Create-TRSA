# PostgreSQL Integration, Security Hardening & TDD Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade TRSA Studio from client-only localStorage to an enterprise PostgreSQL (Supabase) architecture with offline-first LocalStorage fallback, strict Row Level Security (RLS), RBAC (Admin vs Non-admin custom clearance lock), automated audit trail, and 40+ unit/integration tests.

---

### Task 1: PostgreSQL Schema Definition & SQL Migration Tests
- **Files:** `src/sql/schema.sql`, `tests/sqlMigration.test.js`
- [ ] Write failing test `tests/sqlMigration.test.js` validating schema tables, foreign key indexes, GIN indexes, RLS policies, and triggers.
- [ ] Run `node --test tests/sqlMigration.test.js` and verify it fails (schema file doesn't exist yet).
- [ ] Create `src/sql/schema.sql` implementing full PostgreSQL / Supabase best practices.
- [ ] Run `node --test tests/sqlMigration.test.js` and verify it passes.
- [ ] Commit: `feat(db): add PostgreSQL schema with Supabase best practices and migration tests`.

### Task 2: Security & RBAC Module (`src/js/security.js`) and Tests
- **Files:** `src/js/security.js`, `tests/securityAudit.test.js`
- [ ] Write failing test `tests/securityAudit.test.js` testing RBAC permissions, Custom Clearance restrictions for non-admins, XSS sanitization, and immutable audit logs.
- [ ] Run `node --test tests/securityAudit.test.js` and verify failure.
- [ ] Implement `src/js/security.js` with roles (`admin`, `engineer`, `purchaser`), permission checkers, and input sanitizers.
- [ ] Run `node --test tests/securityAudit.test.js` and verify it passes.
- [ ] Commit: `feat(security): implement RBAC, XSS sanitization, and permission controls`.

### Task 3: Audit Trail Service (`src/js/auditService.js`) and Tests
- **Files:** `src/js/auditService.js`, `tests/auditService.test.js`
- [ ] Write failing test `tests/auditService.test.js` validating diff detection between revisions, audit log creation, and immutability.
- [ ] Run `node --test tests/auditService.test.js` and verify failure.
- [ ] Implement `src/js/auditService.js`.
- [ ] Run `node --test tests/auditService.test.js` and verify it passes.
- [ ] Commit: `feat(audit): implement structured audit trail service and diff detection`.

### Task 4: Supabase Client & Offline-First Sync (`src/js/supabaseClient.js`) and Tests
- **Files:** `src/js/supabaseClient.js`, `tests/supabaseClient.test.js`
- [ ] Write failing test `tests/supabaseClient.test.js` covering Supabase config, connection tests, project sync, and LocalStorage offline fallback.
- [ ] Run `node --test tests/supabaseClient.test.js` and verify failure.
- [ ] Implement `src/js/supabaseClient.js`.
- [ ] Run `node --test tests/supabaseClient.test.js` and verify it passes.
- [ ] Commit: `feat(sync): add Supabase PostgreSQL client with offline-first fallback queue`.

### Task 5: UI Integration in `src/js/app.js` & `index.html`
- **Files:** `src/js/app.js`, `index.html`, `src/css/style.css`
- [ ] Integrate Supabase client, security service, and audit service into `src/js/app.js`.
- [ ] Add Database Connection status badge in top navbar (🟢 Connected / 🟡 Offline LocalStorage).
- [ ] Add Supabase Configuration Modal (URL, Anon Key, Test Connection, Sync Now button).
- [ ] Add Role Switcher selector (Admin / Engineer / Purchaser) to test permission restrictions live.
- [ ] Verify Section IV Custom Clearance clause reacts immediately to role switching.

### Task 6: Build Verification and Comprehensive Test Suite
- **Files:** `scripts/build.js`, `dist/`
- [ ] Update `scripts/build.js` to validate new modules (`src/sql/schema.sql`, `src/js/security.js`, `src/js/supabaseClient.js`, `src/js/auditService.js`).
- [ ] Run all tests: `node --test tests/*.test.js` (Verify 40+ tests pass 100%).
- [ ] Run `node scripts/build.js` to compile production assets to `dist/`.

### Task 7: Git Commit and Push to Remote
- **Files:** All modified and new files
- [ ] Verify `git status` and `git diff`.
- [ ] Stage and commit changes with conventional commit message.
- [ ] Push to `origin main`.
