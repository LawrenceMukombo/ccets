CREATE TABLE IF NOT EXISTS tenant_config (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    emblem VARCHAR(255),
    map_center JSONB NOT NULL DEFAULT '[-6.314993, 143.95555]',
    map_zoom INTEGER DEFAULT 6,
    contact_email VARCHAR(255),
    hierarchy JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
INSERT INTO tenant_config (tenant_code, name, emblem, map_center, map_zoom, contact_email, hierarchy)
VALUES 
('png', 'Papua New Guinea', '/png_emblem.png', '[-6.314993, 143.95555]', 6, 'ict@health.gov.pg', '[{"id": "province", "name": "Province", "color": "#be123c"}, {"id": "district", "name": "District", "color": "#0369a1"}]'),
('zambia', 'Zambia', '/zambia_emblem.png', '[-13.133897, 27.849332]', 6, 'support@moh.gov.zm', '[{"id": "province", "name": "Province", "color": "#be123c"}, {"id": "district", "name": "District", "color": "#0369a1"}]'),
('malawi', 'Malawi', '/malawi_emblem.png', '[-13.254308, 34.301525]', 7, 'it.support@health.gov.mw', '[{"id": "region", "name": "Region", "color": "#9d174d"}, {"id": "district", "name": "District", "color": "#0369a1"}]')
ON CONFLICT (tenant_code) DO UPDATE SET
    name = EXCLUDED.name,
    emblem = EXCLUDED.emblem,
    map_center = EXCLUDED.map_center,
    map_zoom = EXCLUDED.map_zoom,
    contact_email = EXCLUDED.contact_email,
    hierarchy = EXCLUDED.hierarchy,
    updated_at = CURRENT_TIMESTAMP;
