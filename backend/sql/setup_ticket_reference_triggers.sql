-- =====================================================
-- Ticket Reference Number Generation Triggers
-- =====================================================
-- This script sets up automatic ticket reference number generation
-- Format: REG-PRO-DIS-FAC-YYYYMMDD-HHMMSS-NNNN
-- Example: SOU-NCD-POM-PM001-20250122-143055-0001
-- =====================================================
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trg_generate_ticket_reference ON tickets;
DROP FUNCTION IF EXISTS generate_ticket_reference();
DROP TRIGGER IF EXISTS trg_compute_ticket_reference ON tickets;
DROP FUNCTION IF EXISTS compute_ticket_reference();
-- Create the trigger function
-- Create the trigger (fires AFTER INSERT on tickets table)
-- We need AFTER INSERT because we rely on the generated ticket_id for the suffix
CREATE OR REPLACE FUNCTION generate_ticket_reference_after() RETURNS TRIGGER AS $$
DECLARE reg_abbrev TEXT;
prov_abbrev TEXT;
dist_abbrev TEXT;
fac_abbrev TEXT;
ts_local TEXT;
serial_sfx TEXT;
BEGIN -- Build location abbreviations
SELECT UPPER(LEFT(COALESCE(r.region_name, 'UNK'), 3)),
    UPPER(LEFT(COALESCE(p.province_name, 'UNK'), 3)),
    UPPER(LEFT(COALESCE(d.district_name, 'UNK'), 3)),
    UPPER(
        COALESCE(f.facility_code, LEFT(f.facility_name, 3), 'UNK')
    ) INTO reg_abbrev,
    prov_abbrev,
    dist_abbrev,
    fac_abbrev
FROM facilities f
    LEFT JOIN provinces p ON f.province_id = p.province_id
    LEFT JOIN regions r ON p.region_id = r.region_id
    LEFT JOIN districts d ON f.district_id = d.district_id
WHERE f.facility_id = NEW.facility_id;
-- Generate local timestamp
ts_local := TO_CHAR(
    (NOW() AT TIME ZONE 'Pacific/Port_Moresby'),
    'YYYYMMDD-HH24MISS'
);
-- Serial suffix from the now-existing ticket_id
serial_sfx := LPAD(NEW.ticket_id::TEXT, 4, '0');
-- Update the row
UPDATE tickets
SET ticket_reference_number = reg_abbrev || '-' || prov_abbrev || '-' || dist_abbrev || '-' || fac_abbrev || '-' || ts_local || '-' || serial_sfx
WHERE ticket_id = NEW.ticket_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_generate_ticket_reference
AFTER
INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_reference_after();
-- Add comment to document the trigger
COMMENT ON TRIGGER trg_generate_ticket_reference ON tickets IS 'Automatically generates ticket reference number in format: REG-PRO-DIS-FAC-YYYYMMDD-HHMMSS-NNNN';
COMMENT ON FUNCTION generate_ticket_reference() IS 'Generates unique ticket reference number based on location and timestamp';
PRINT 'Ticket reference number triggers successfully created!';