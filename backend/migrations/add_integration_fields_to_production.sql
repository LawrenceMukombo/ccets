-- Migration: Add Integration Fields to Production Facilities and Equipment Tables
-- Created: 2026-07-12
-- ============================================================================

-- 1. PNG Schema Updates
ALTER TABLE png.facilities ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE png.facilities ADD COLUMN IF NOT EXISTS source_system VARCHAR(100) DEFAULT 'Manual';

ALTER TABLE png.equipment ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE png.equipment ADD COLUMN IF NOT EXISTS source_system VARCHAR(100) DEFAULT 'Manual';
ALTER TABLE png.equipment ADD COLUMN IF NOT EXISTS asset_code VARCHAR(100);

-- 2. Zambia Schema Updates
ALTER TABLE zambia.facilities ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE zambia.facilities ADD COLUMN IF NOT EXISTS source_system VARCHAR(100) DEFAULT 'Manual';

ALTER TABLE zambia.equipment ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE zambia.equipment ADD COLUMN IF NOT EXISTS source_system VARCHAR(100) DEFAULT 'Manual';
ALTER TABLE zambia.equipment ADD COLUMN IF NOT EXISTS asset_code VARCHAR(100);
