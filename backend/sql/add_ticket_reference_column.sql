-- Ensure tickets table has ticket_reference_number column
DO $$ BEGIN -- Add ticket_reference_number column if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tickets'
        AND column_name = 'ticket_reference_number'
) THEN
ALTER TABLE tickets
ADD COLUMN ticket_reference_number VARCHAR(100) UNIQUE;
RAISE NOTICE 'Added ticket_reference_number column';
ELSE RAISE NOTICE 'ticket_reference_number column already exists';
END IF;
-- Add region_id, province_id, district_id if they don't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tickets'
        AND column_name = 'region_id'
) THEN
ALTER TABLE tickets
ADD COLUMN region_id VARCHAR(100);
RAISE NOTICE 'Added region_id column';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tickets'
        AND column_name = 'province_id'
) THEN
ALTER TABLE tickets
ADD COLUMN province_id VARCHAR(100);
RAISE NOTICE 'Added province_id column';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tickets'
        AND column_name = 'district_id'
) THEN
ALTER TABLE tickets
ADD COLUMN district_id VARCHAR(100);
RAISE NOTICE 'Added district_id column';
END IF;
END $$;