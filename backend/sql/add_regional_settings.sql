-- Migration: Add Regional Settings to tenant_config
ALTER TABLE tenant_config 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'PGK',
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'K',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'Pacific/Port_Moresby',
ADD COLUMN IF NOT EXISTS phone_prefix VARCHAR(10) DEFAULT '+675',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Update existing tenants with correct defaults
UPDATE tenant_config SET 
    currency_code = 'ZMW', 
    currency_symbol = 'ZK', 
    time_zone = 'Africa/Lusaka', 
    phone_prefix = '+260' 
WHERE tenant_code = 'zambia';

UPDATE tenant_config SET 
    currency_code = 'MWK', 
    currency_symbol = 'MK', 
    time_zone = 'Africa/Blantyre', 
    phone_prefix = '+265' 
WHERE tenant_code = 'malawi';
