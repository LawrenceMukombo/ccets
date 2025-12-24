-- PNG has exactly 4 regions and 22 provinces
-- This script identifies and removes duplicates
-- Step 1: Check current regions (should be 4)
SELECT 'Current Regions:' as info;
SELECT region_id,
    region_name,
    COUNT(*)
FROM regions
GROUP BY region_id,
    region_name
ORDER BY region_name;
-- Step 2: Check current provinces (should be 22)
SELECT 'Current Provinces:' as info;
SELECT province_id,
    province_name,
    region_id
FROM provinces
ORDER BY province_name;
-- Step 3: Identify facilities with NULL or invalid province/region
SELECT 'Facilities with NULL province:' as info;
SELECT facility_id,
    facility_name,
    province_id,
    district_id
FROM facilities
WHERE province_id IS NULL
LIMIT 10;
-- Step 4: Delete the extra/duplicate region (likely "Unknown" or similar)
-- We'll identify which one after seeing the data
DELETE FROM regions
WHERE region_name IN ('Unknown', 'UNKNOWN', 'None', 'N/A', '')
    OR region_id NOT IN (
        SELECT DISTINCT region_id
        FROM provinces
        WHERE region_id IS NOT NULL
    );
-- Step 5: Delete the extra/duplicate province
DELETE FROM provinces
WHERE province_name IN ('Unknown', 'UNKNOWN', 'None', 'N/A', '')
    OR province_id NOT IN (
        SELECT DISTINCT province_id
        FROM facilities
        WHERE province_id IS NOT NULL
        UNION
        SELECT DISTINCT province_id
        FROM districts
        WHERE province_id IS NOT NULL
    );
-- Step 6: Clean up facilities with invalid references
UPDATE facilities
SET province_id = NULL,
    district_id = NULL
WHERE province_id NOT IN (
        SELECT province_id
        FROM provinces
    );
-- Step 7: Verify counts
SELECT 'Final Region Count:' as info,
    COUNT(*) as count
FROM regions;
SELECT 'Final Province Count:' as info,
    COUNT(*) as count
FROM provinces;