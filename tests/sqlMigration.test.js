import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../src/sql/schema.sql');

describe('PostgreSQL / Supabase Schema & Migration Audit Tests', () => {
  test('Verify schema file exists and is readable', () => {
    assert.ok(fs.existsSync(schemaPath), 'src/sql/schema.sql must exist');
    const content = fs.readFileSync(schemaPath, 'utf8');
    assert.ok(content.length > 500, 'Schema file must contain substantial SQL content');
  });

  test('Verify core table structures exist', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const requiredTables = [
      'trsa_projects',
      'trsa_revisions',
      'trsa_key_contacts',
      'trsa_audit_logs',
      'trsa_plant_locations'
    ];

    for (const table of requiredTables) {
      const regex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}`, 'i');
      assert.ok(regex.test(sql), `Table ${table} must be defined in schema.sql`);
    }
  });

  test('Verify Supabase Best Practice: Foreign Key Indexes', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    // Supabase guideline: Unindexed foreign keys cause full table scans and lock contention
    assert.ok(/CREATE\s+INDEX\s+.*trsa_revisions.*project_id/i.test(sql), 'Index on trsa_revisions(project_id) required');
    assert.ok(/CREATE\s+INDEX\s+.*trsa_key_contacts.*project_id/i.test(sql), 'Index on trsa_key_contacts(project_id) required');
    assert.ok(/CREATE\s+INDEX\s+.*trsa_audit_logs.*project_id/i.test(sql), 'Index on trsa_audit_logs(project_id) required');
  });

  test('Verify Supabase Best Practice: GIN Indexes on JSONB Columns', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    // Supabase guideline: GIN indexing on JSONB for high-performance sub-queries
    assert.ok(/USING\s+gin\s*\(\s*scope_of_supply\s*\)/i.test(sql), 'GIN index on scope_of_supply required');
    assert.ok(/USING\s+gin\s*\(\s*product_specifications\s*\)/i.test(sql), 'GIN index on product_specifications required');
    assert.ok(/USING\s+gin\s*\(\s*process_parameters\s*\)/i.test(sql), 'GIN index on process_parameters required');
  });

  test('Verify Row Level Security (RLS) Enabled on All Tables', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const tables = [
      'trsa_projects',
      'trsa_revisions',
      'trsa_key_contacts',
      'trsa_audit_logs',
      'trsa_plant_locations'
    ];

    for (const table of tables) {
      const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      assert.ok(rlsRegex.test(sql), `RLS must be enabled on table ${table}`);
    }
  });

  test('Verify Immutability & Security Policies on Audit Logs', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    // Audit logs must be append-only: allow SELECT and INSERT, reject/disallow UPDATE and DELETE
    assert.ok(/CREATE\s+POLICY\s+.*trsa_audit_logs_select/i.test(sql), 'Audit logs SELECT policy required');
    assert.ok(/CREATE\s+POLICY\s+.*trsa_audit_logs_insert/i.test(sql), 'Audit logs INSERT policy required');
    assert.ok(!/CREATE\s+POLICY\s+.*trsa_audit_logs_update/i.test(sql), 'Audit logs must NOT have an UPDATE policy (immutable)');
    assert.ok(!/CREATE\s+POLICY\s+.*trsa_audit_logs_delete/i.test(sql), 'Audit logs must NOT have a DELETE policy (immutable)');
  });

  test('Verify Automated updated_at Trigger Function', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    assert.ok(/FUNCTION\s+update_updated_at_column/i.test(sql) || /FUNCTION\s+trsa_update_timestamp/i.test(sql), 'Timestamp trigger function required');
    assert.ok(/TRIGGER\s+.*trsa_projects.*updated_at/i.test(sql), 'Trigger on trsa_projects updated_at required');
  });
});
