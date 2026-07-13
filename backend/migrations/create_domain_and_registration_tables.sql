-- Migration: Create Domain and Standalone Registration Tables
-- Created: 2026-07-12
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instance_domains (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.standalone_registration (
    id SERIAL PRIMARY KEY,
    instance_name VARCHAR(255) NOT NULL,
    owner_organization VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    registration_key VARCHAR(255) UNIQUE NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed domain mapping for local development subdomains
INSERT INTO public.instance_domains (tenant_id, domain_name, is_primary)
SELECT id, 'png.localhost', true FROM public.tenants WHERE code = 'png'
ON CONFLICT (domain_name) DO NOTHING;

INSERT INTO public.instance_domains (tenant_id, domain_name, is_primary)
SELECT id, 'zambia.localhost', true FROM public.tenants WHERE code = 'zambia'
ON CONFLICT (domain_name) DO NOTHING;
