/**
 * TRSA Studio - Supabase PostgreSQL Integration & Offline-First Sync Client
 * Adheres to Supabase Best Practices, RESTful Upserts, and Offline Queue Fallback
 */

const CONFIG_KEY = 'trsa_supabase_config';
const QUEUE_KEY = 'trsa_offline_queue';

let inMemoryConfig = {
  url: '',
  anonKey: '',
  enabled: false
};

let inMemoryQueue = [];

/**
 * Retrieve active Supabase connection configuration
 */
export function getSupabaseConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(CONFIG_KEY);
      if (stored) {
        inMemoryConfig = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read Supabase config from localStorage:', e);
    }
  }
  return { ...inMemoryConfig };
}

/**
 * Save Supabase connection configuration
 */
export function setSupabaseConfig(config = {}) {
  inMemoryConfig = {
    url: (config.url || '').trim().replace(/\/+$/, ''),
    anonKey: (config.anonKey || '').trim(),
    enabled: Boolean(config.enabled)
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(inMemoryConfig));
    } catch (e) {
      console.warn('Could not save Supabase config to localStorage:', e);
    }
  }

  return { ...inMemoryConfig };
}

/**
 * Check if Supabase PostgreSQL integration is configured and enabled
 */
export function isConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.enabled && config.url && config.anonKey);
}

/**
 * Ping Supabase PostgreSQL instance to verify credentials and connectivity
 */
export async function testConnection(url, anonKey) {
  const cleanUrl = (url || inMemoryConfig.url || '').trim().replace(/\/+$/, '');
  const cleanKey = (anonKey || inMemoryConfig.anonKey || '').trim();

  if (!cleanUrl || !cleanKey) {
    return { success: false, message: 'URL and Anon Key must not be empty.' };
  }

  try {
    const endpoint = `${cleanUrl}/rest/v1/trsa_plant_locations?select=code,name&limit=1`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': cleanKey,
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: 'Connected to PostgreSQL (Supabase) successfully!' };
    } else {
      const errText = await response.text();
      return { success: false, message: `PostgreSQL connection error: HTTP ${response.status} - ${errText}` };
    }
  } catch (err) {
    return { success: false, message: `Network/CORS error reaching Supabase: ${err.message}` };
  }
}

/**
 * Get offline pending sync queue
 */
export function getOfflineQueue() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(QUEUE_KEY);
      if (stored) {
        inMemoryQueue = JSON.parse(stored);
      }
    } catch (e) {
      // fallback
    }
  }
  return [...inMemoryQueue];
}

/**
 * Clear offline sync queue
 */
export function clearOfflineQueue() {
  inMemoryQueue = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(QUEUE_KEY);
  }
}

/**
 * Add a project modification to the offline sync queue
 */
export function queueForSync(project, action = 'UPDATE') {
  if (!project) return;
  const item = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    project,
    action,
    timestamp: new Date().toISOString()
  };

  inMemoryQueue.push(item);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(inMemoryQueue));
    } catch (e) {
      console.warn('Could not persist offline queue:', e);
    }
  }
  return item;
}

/**
 * Get current sync health status
 */
export function getSyncStatus() {
  const configured = isConfigured();
  const queue = getOfflineQueue();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    isConfigured: configured,
    isOnline,
    isConnected: configured && isOnline,
    pendingCount: queue.length,
    statusText: configured 
      ? (isOnline ? 'PostgreSQL Connected (Supabase)' : 'Offline (LocalStorage Fallback)') 
      : 'Offline LocalStorage Mode'
  };
}

/**
 * Transform frontend project object into PostgreSQL schema row
 */
export function transformProjectForPostgres(p) {
  return {
    id: p.id,
    doc_number: p.documentInfo?.docNumber || p.docNumber || `TRSA-${Date.now()}`,
    title: p.title || 'Untitled TRSA Project',
    subtitle: p.subtitle || '',
    company_name: p.documentInfo?.companyName || 'PT. Indofood Fortuna Makmur',
    plant_code: p.siteInvoicing?.plantCode || p.plantCode || '1402',
    plant_location: p.siteInvoicing?.plantLocation || p.plantLocation || '',
    invoicing_address: p.siteInvoicing?.invoicingAddress || '',
    shipping_port: p.siteInvoicing?.shippingPort || '',
    status: p.status || 'Draft',
    progress: typeof p.progress === 'number' ? p.progress : 0,
    created_by: p.documentInfo?.createdBy || p.createdBy || 'Unknown Author',
    
    milestones: p.projectOverview?.keyDates || p.milestones || {},
    product_specifications: p.productSpecifications || [],
    process_parameters: p.processParameters || {},
    scope_of_supply: p.scopeOfSupply || {},
    commercial_terms: p.commercialTerms || {},
    performance_acceptance: p.performanceAcceptance || {},
    required_documentation: p.requiredDocumentation || []
  };
}

/**
 * Transform PostgreSQL schema row into frontend project object
 */
export function transformProjectFromPostgres(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    progress: row.progress,
    documentInfo: {
      docNumber: row.doc_number,
      companyName: row.company_name,
      createdBy: row.created_by,
      revisionHistory: []
    },
    siteInvoicing: {
      plantCode: row.plant_code,
      plantLocation: row.plant_location,
      invoicingAddress: row.invoicing_address,
      shippingPort: row.shipping_port
    },
    projectOverview: {
      keyDates: row.milestones || {}
    },
    keyContacts: [],
    productSpecifications: row.product_specifications || [],
    processParameters: row.process_parameters || {},
    scopeOfSupply: row.scope_of_supply || {},
    commercialTerms: row.commercial_terms || {},
    performanceAcceptance: row.performance_acceptance || {},
    requiredDocumentation: row.required_documentation || []
  };
}

/**
 * Sync project to Supabase PostgreSQL (or queue if offline)
 */
export async function syncProjectToPostgres(project, action = 'UPDATE') {
  if (!isConfigured()) {
    queueForSync(project, action);
    return { success: true, mode: 'local', message: 'Saved to LocalStorage (PostgreSQL unconfigured)' };
  }

  const config = getSupabaseConfig();
  const row = transformProjectForPostgres(project);

  try {
    const endpoint = `${config.url}/rest/v1/trsa_projects`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      queueForSync(project, action);
      const errText = await response.text();
      return { success: false, mode: 'offline_queued', error: errText };
    }

    const data = await response.json();
    return { success: true, mode: 'postgres', data };
  } catch (err) {
    queueForSync(project, action);
    return { success: false, mode: 'offline_queued', error: err.message };
  }
}

/**
 * Fetch projects from Supabase PostgreSQL
 */
export async function fetchProjectsFromPostgres() {
  if (!isConfigured()) return { success: false, message: 'Supabase unconfigured' };

  const config = getSupabaseConfig();
  try {
    const endpoint = `${config.url}/rest/v1/trsa_projects?select=*&order=updated_at.desc`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText };
    }

    const rows = await response.json();
    const projects = rows.map(transformProjectFromPostgres);
    return { success: true, projects };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
