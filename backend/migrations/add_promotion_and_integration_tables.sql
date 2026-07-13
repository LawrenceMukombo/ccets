-- Migration: Create Standalone Promotion and Integration Foundation Tables
-- Created: 2026-07-12
-- ============================================================================

-- 1. Create Standalone Promotion tracker in the public schema
CREATE TABLE IF NOT EXISTS public.standalone_promotions (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'checking', 'ready', 'failed', 'exporting', 'completed'
    checklist JSONB,
    export_path VARCHAR(255),
    download_url VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dynamically provision integration foundation tables inside each active tenant's schema
DO $$
DECLARE
    schema_record RECORD;
    query_str TEXT;
BEGIN
    FOR schema_record IN 
        SELECT schema_name FROM public.tenants WHERE is_active = true
    LOOP
        -- A. Create connector registry
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.connector_registry (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            url VARCHAR(555) NOT NULL,
            credentials JSONB NOT NULL,
            location_scope JSONB,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        EXECUTE query_str;

        -- B. Create integration sync runs tracker
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.integration_sync_runs (
            id SERIAL PRIMARY KEY,
            connector_id INT NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            status VARCHAR(50) DEFAULT ''running'',
            records_processed INT DEFAULT 0,
            records_failed INT DEFAULT 0,
            error_message TEXT
        )';
        EXECUTE query_str;

        -- C. Create integration sync logs tracker
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.integration_sync_logs (
            id SERIAL PRIMARY KEY,
            run_id INT NOT NULL,
            severity VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        EXECUTE query_str;

        -- D. Create staging facilities table
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.staging_facilities (
            id SERIAL PRIMARY KEY,
            external_id VARCHAR(100) NOT NULL,
            facility_name VARCHAR(255) NOT NULL,
            facility_code VARCHAR(100),
            province_name VARCHAR(100),
            district_name VARCHAR(100),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            sync_status VARCHAR(50) DEFAULT ''pending'',
            import_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        EXECUTE query_str;

        -- E. Create staging equipment table
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.staging_equipment (
            id SERIAL PRIMARY KEY,
            external_id VARCHAR(100) NOT NULL,
            asset_code VARCHAR(100),
            serial_number VARCHAR(100),
            manufacturer VARCHAR(100),
            model VARCHAR(100),
            facility_external_id VARCHAR(100),
            sync_status VARCHAR(50) DEFAULT ''pending'',
            import_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        EXECUTE query_str;
    END LOOP;
END $$;
