import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  isConfigured, 
  getSyncStatus, 
  queueForSync, 
  getOfflineQueue, 
  clearOfflineQueue,
  transformProjectForPostgres,
  transformProjectFromPostgres
} from '../src/js/supabaseClient.js';

describe('Supabase PostgreSQL Integration & Offline Queue Tests', () => {
  beforeEach(() => {
    clearOfflineQueue();
    setSupabaseConfig({ url: '', anonKey: '', enabled: false });
  });

  test('Configuration Management: Save, Retrieve, and Check Status', () => {
    assert.strictEqual(isConfigured(), false);

    setSupabaseConfig({
      url: 'https://test-project.supabase.co',
      anonKey: 'sample-anon-key-12345',
      enabled: true
    });

    assert.strictEqual(isConfigured(), true);
    const config = getSupabaseConfig();
    assert.strictEqual(config.url, 'https://test-project.supabase.co');
    assert.strictEqual(config.anonKey, 'sample-anon-key-12345');
    assert.strictEqual(config.enabled, true);
  });

  test('Offline Queue: Buffer changes when disconnected', () => {
    assert.strictEqual(getOfflineQueue().length, 0);

    const project = {
      id: 'proj-001',
      title: 'Sheeted Fryer Line',
      docNumber: '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024'
    };

    queueForSync(project, 'UPDATE');
    const queue = getOfflineQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].project.id, 'proj-001');
    assert.strictEqual(queue[0].action, 'UPDATE');
    assert.ok(queue[0].timestamp);

    const status = getSyncStatus();
    assert.strictEqual(status.pendingCount, 1);
  });

  test('Data Transformation: Map Frontend Model to PostgreSQL Schema', () => {
    const frontendProject = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Supply of Sheeted Pellet Fryer',
      subtitle: 'Semarang Plant Expansion',
      status: 'Draft',
      progress: 85,
      documentInfo: {
        docNumber: '006/RAP/TRSA – 1402/MFG-IFM/VIII/2024',
        companyName: 'PT. Indofood Fortuna Makmur',
        createdBy: 'Refin A Putra'
      },
      siteInvoicing: {
        plantCode: '1402',
        plantLocation: 'Semarang Plant',
        invoicingAddress: 'Jl. Tambak Aji IV No. 10',
        shippingPort: 'Semarang Port'
      },
      productSpecifications: [{ shape: '3D Chicken Legs' }],
      processParameters: { frying: {}, seasoning: {} },
      scopeOfSupply: { fryer: [], seasoning: [] },
      commercialTerms: { warranty: '12 months' }
    };

    const pgRow = transformProjectForPostgres(frontendProject);

    assert.strictEqual(pgRow.id, '550e8400-e29b-41d4-a716-446655440000');
    assert.strictEqual(pgRow.doc_number, '006/RAP/TRSA – 1402/MFG-IFM/VIII/2024');
    assert.strictEqual(pgRow.title, 'Supply of Sheeted Pellet Fryer');
    assert.strictEqual(pgRow.company_name, 'PT. Indofood Fortuna Makmur');
    assert.strictEqual(pgRow.plant_code, '1402');
    assert.strictEqual(pgRow.plant_location, 'Semarang Plant');
    assert.strictEqual(pgRow.status, 'Draft');
    assert.strictEqual(pgRow.progress, 85);
    assert.strictEqual(pgRow.created_by, 'Refin A Putra');
    assert.ok(Array.isArray(pgRow.product_specifications));
    assert.ok(typeof pgRow.process_parameters === 'object');
    assert.ok(typeof pgRow.scope_of_supply === 'object');
  });

  test('Data Transformation: Map PostgreSQL Row back to Frontend Model', () => {
    const pgRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      doc_number: '006/RAP/TRSA – 1402/MFG-IFM/VIII/2024',
      title: 'Supply of Sheeted Pellet Fryer',
      subtitle: 'Semarang Plant Expansion',
      company_name: 'PT. Indofood Fortuna Makmur',
      plant_code: '1402',
      plant_location: 'Semarang Plant',
      invoicing_address: 'Jl. Tambak Aji IV No. 10',
      shipping_port: 'Semarang Port',
      status: 'Published',
      progress: 100,
      created_by: 'Refin A Putra',
      product_specifications: [{ shape: '3D Chicken Legs' }],
      process_parameters: { frying: {}, seasoning: {} },
      scope_of_supply: { fryer: [], seasoning: [] },
      commercial_terms: { warranty: '12 months' },
      milestones: {},
      performance_acceptance: {},
      required_documentation: []
    };

    const frontend = transformProjectFromPostgres(pgRow);

    assert.strictEqual(frontend.id, pgRow.id);
    assert.strictEqual(frontend.title, pgRow.title);
    assert.strictEqual(frontend.documentInfo.docNumber, pgRow.doc_number);
    assert.strictEqual(frontend.siteInvoicing.plantCode, '1402');
    assert.strictEqual(frontend.status, 'Published');
    assert.strictEqual(frontend.progress, 100);
  });
});
