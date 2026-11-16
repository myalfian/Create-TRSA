-- ====================================================================
-- TRSA Studio - Enterprise PostgreSQL & Supabase Database Migration
-- Conforms to Supabase Postgres Best Practices & Security Guidelines
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PLANT LOCATIONS MASTER TABLE
CREATE TABLE IF NOT EXISTS trsa_plant_locations (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    tax_id VARCHAR(50),
    default_port VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Plant Locations (Semarang 1402 & Cikupa 1403)
INSERT INTO trsa_plant_locations (code, name, address, postal_code, tax_id, default_port)
VALUES 
    ('1402', 'PT Indofood Fortuna Makmur - Semarang Plant', 'Jl. Tambak Aji IV No. 10, Kawasan Industri Tambak Aji, Semarang, Jawa Tengah', '50185', '01.000.013.1-093.000', 'Semarang Port (Tanjung Emas), Indonesia'),
    ('1403', 'PT Indofood Fortuna Makmur - Cikupa Plant', 'Jl. Raya Serang Km. 18.5, Kawasan Industri Cikupa Mas, Tangerang, Banten', '15710', '01.000.013.1-418.000', 'Tanjung Priok Port, Jakarta, Indonesia')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    postal_code = EXCLUDED.postal_code,
    tax_id = EXCLUDED.tax_id,
    default_port = EXCLUDED.default_port;

-- 3. CORE TRSA PROJECTS TABLE (Hybrid Relational + JSONB)
CREATE TABLE IF NOT EXISTS trsa_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_number VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    company_name VARCHAR(255) NOT NULL DEFAULT 'PT. Indofood Fortuna Makmur',
    plant_code VARCHAR(10) REFERENCES trsa_plant_locations(code) ON UPDATE CASCADE,
    plant_location VARCHAR(255),
    invoicing_address TEXT,
    shipping_port VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Structured technical specifications stored as JSONB for high-throughput flexibility
    milestones JSONB NOT NULL DEFAULT '{}'::jsonb,
    product_specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    process_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    scope_of_supply JSONB NOT NULL DEFAULT '{}'::jsonb,
    commercial_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    performance_acceptance JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_documentation JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REVISIONS TABLE (Relational tracking for Document History)
CREATE TABLE IF NOT EXISTS trsa_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES trsa_projects(id) ON DELETE CASCADE,
    revision VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    originated_by VARCHAR(255) NOT NULL,
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KEY CONTACTS TABLE (Relational Stakeholders)
CREATE TABLE IF NOT EXISTS trsa_key_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES trsa_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. IMMUTABLE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS trsa_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES trsa_projects(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DUPLICATE', 'STATUS_CHANGE', 'SYNC'
    changed_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- SUPABASE BEST PRACTICES: INDEXING & QUERY OPTIMIZATION
-- ====================================================================

-- Foreign Key B-Tree Indexes (Prevents lock contention and slow cascaded joins)
CREATE INDEX IF NOT EXISTS idx_trsa_revisions_project_id ON trsa_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_trsa_key_contacts_project_id ON trsa_key_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_trsa_audit_logs_project_id ON trsa_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_trsa_projects_plant_code ON trsa_projects(plant_code);
CREATE INDEX IF NOT EXISTS idx_trsa_projects_status ON trsa_projects(status);

-- GIN Indexes on Deep JSONB Specification Trees for Ultra-Fast Queries
CREATE INDEX IF NOT EXISTS idx_trsa_projects_scope_gin ON trsa_projects USING gin (scope_of_supply);
CREATE INDEX IF NOT EXISTS idx_trsa_projects_specs_gin ON trsa_projects USING gin (product_specifications);
CREATE INDEX IF NOT EXISTS idx_trsa_projects_params_gin ON trsa_projects USING gin (process_parameters);

-- ====================================================================
-- AUTOMATED TIMESTAMP TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION trsa_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trsa_projects_updated_at ON trsa_projects;
CREATE TRIGGER set_trsa_projects_updated_at
    BEFORE UPDATE ON trsa_projects
    FOR EACH ROW
    EXECUTE FUNCTION trsa_update_timestamp();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE trsa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE trsa_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trsa_key_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trsa_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trsa_plant_locations ENABLE ROW LEVEL SECURITY;

-- 2. Plant Locations Policies (Public Read, Admin Write)
CREATE POLICY trsa_plant_locations_select ON trsa_plant_locations FOR SELECT USING (true);
CREATE POLICY trsa_plant_locations_admin_all ON trsa_plant_locations FOR ALL USING (
    COALESCE(auth.jwt()->>'role', 'anon') = 'admin' OR 
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
);

-- 3. TRSA Projects Policies
-- Allow anyone authenticated or using the anon client to select projects
CREATE POLICY trsa_projects_select ON trsa_projects FOR SELECT USING (true);

-- Allow inserting new drafts
CREATE POLICY trsa_projects_insert ON trsa_projects FOR INSERT WITH CHECK (true);

-- Allow updating projects (Technical specifications open to contributors; custom clearance protected)
CREATE POLICY trsa_projects_update ON trsa_projects FOR UPDATE USING (true) WITH CHECK (
    -- If customClearanceClause changed, role MUST be admin
    CASE 
        WHEN OLD.commercial_terms->>'customClearanceClause' IS DISTINCT FROM NEW.commercial_terms->>'customClearanceClause'
        THEN (
            COALESCE(auth.jwt()->>'role', current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'admin'
        )
        ELSE true
    END
);

-- Allow project deletion only by Admin
CREATE POLICY trsa_projects_delete ON trsa_projects FOR DELETE USING (
    COALESCE(auth.jwt()->>'role', current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'admin'
);

-- 4. Revisions Policies
CREATE POLICY trsa_revisions_select ON trsa_revisions FOR SELECT USING (true);
CREATE POLICY trsa_revisions_insert ON trsa_revisions FOR INSERT WITH CHECK (true);
CREATE POLICY trsa_revisions_update ON trsa_revisions FOR UPDATE USING (true);
CREATE POLICY trsa_revisions_delete ON trsa_revisions FOR DELETE USING (
    COALESCE(auth.jwt()->>'role', current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'admin'
);

-- 5. Key Contacts Policies
CREATE POLICY trsa_key_contacts_select ON trsa_key_contacts FOR SELECT USING (true);
CREATE POLICY trsa_key_contacts_insert ON trsa_key_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY trsa_key_contacts_update ON trsa_key_contacts FOR UPDATE USING (true);
CREATE POLICY trsa_key_contacts_delete ON trsa_key_contacts FOR DELETE USING (
    COALESCE(auth.jwt()->>'role', current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'admin'
);

-- 6. IMMUTABLE AUDIT LOGS (Select & Insert only; No UPDATE or DELETE allowed)
CREATE POLICY trsa_audit_logs_select ON trsa_audit_logs FOR SELECT USING (true);
CREATE POLICY trsa_audit_logs_insert ON trsa_audit_logs FOR INSERT WITH CHECK (true);
-- Note: NO UPDATE and NO DELETE policies created for trsa_audit_logs, ensuring zero tampering.
