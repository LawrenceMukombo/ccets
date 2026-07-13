-- Migration: Create Offline-First Idempotency and ODK Submission Staging Tables
-- Created: 2026-07-12
-- ============================================================================

DO $$
DECLARE
    schema_record RECORD;
    query_str TEXT;
BEGIN
    FOR schema_record IN 
        SELECT schema_name FROM public.tenants WHERE is_active = true
    LOOP
        -- 1. Add idempotency_key column to tickets table in each active tenant's schema
        query_str := 'ALTER TABLE ' || quote_ident(schema_record.schema_name) || '.tickets 
                      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100)';
        EXECUTE query_str;

        -- 2. Create index on tickets.idempotency_key
        query_str := 'CREATE INDEX IF NOT EXISTS idx_tickets_idempotency_key 
                      ON ' || quote_ident(schema_record.schema_name) || '.tickets(idempotency_key)';
        EXECUTE query_str;

        -- 3. Create staging_odk_submissions table inside each active tenant's schema
        query_str := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_record.schema_name) || '.staging_odk_submissions (
            id SERIAL PRIMARY KEY,
            kobo_id VARCHAR(100) UNIQUE,
            payload JSONB NOT NULL,
            status VARCHAR(50) DEFAULT ''pending'',
            validation_errors JSONB,
            import_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        EXECUTE query_str;

        -- 4. Create index on staging_odk_submissions.kobo_id
        query_str := 'CREATE INDEX IF NOT EXISTS idx_staging_odk_submissions_kobo_id 
                      ON ' || quote_ident(schema_record.schema_name) || '.staging_odk_submissions(kobo_id)';
        EXECUTE query_str;

    END LOOP;
END $$;
