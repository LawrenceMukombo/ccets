-- Migration: Create schema_migrations Table
-- Created: 2026-07-12
-- Description: Creates the public schema_migrations table to track applied schema migrations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed baseline migrations as already applied since we're upgrading an existing DB
INSERT INTO public.schema_migrations (migration_name) VALUES 
('init_schema'),
('create_user_scopes'),
('add_technician_workspace_features')
ON CONFLICT (migration_name) DO NOTHING;
