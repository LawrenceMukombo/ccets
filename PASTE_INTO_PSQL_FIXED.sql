-- ==============================================================================
-- CORRECTED: Test Users Setup - Roles and Location Scopes
-- Run this in your psql terminal connected to png_ccets
-- ==============================================================================
-- Step 1: Create roles (without description)
INSERT INTO roles (role_name)
VALUES ('Admin'),
    ('National Manager'),
    ('Regional Coordinator'),
    ('Provincial ICT Officer'),
    ('District Officer'),
    ('Technician'),
    ('Facility Manager') ON CONFLICT (role_name) DO NOTHING;
-- Step 2: Assign roles to users
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Admin'
    )
WHERE user_id BETWEEN 1 AND 2
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'National Manager'
    )
WHERE user_id = 3
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Regional Coordinator'
    )
WHERE user_id BETWEEN 4 AND 7
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Provincial ICT Officer'
    )
WHERE user_id BETWEEN 8 AND 15
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'District Officer'
    )
WHERE user_id BETWEEN 16 AND 25
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Technician'
    )
WHERE user_id BETWEEN 26 AND 40
    AND role_id IS NULL;
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Facility Manager'
    )
WHERE user_id BETWEEN 41 AND 50
    AND role_id IS NULL;
-- Step 3: Regional Coordinators - Location Scopes
INSERT INTO user_scopes (user_id, region_id)
SELECT 4,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%southern%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, region_id)
SELECT 5,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%highlands%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, region_id)
SELECT 6,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%momase%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, region_id)
SELECT 7,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%islands%' ON CONFLICT DO NOTHING;
-- Step 4: Provincial Officers - Location Scopes  
INSERT INTO user_scopes (user_id, province_id)
SELECT 8,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%central%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 9,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%madang%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 10,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%sepik%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 11,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%western%highlands%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 12,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%morobe%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 13,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%eastern%highlands%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 14,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%gulf%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, province_id)
SELECT 15,
    MIN(province_id)
FROM provinces
WHERE province_name ILIKE '%britain%' ON CONFLICT DO NOTHING;
-- Step 5: District Officers - Location Scopes
INSERT INTO user_scopes (user_id, district_id)
SELECT 16,
    MIN(district_id)
FROM districts
WHERE district_name ILIKE '%moresby%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 17,
    MIN(district_id)
FROM districts
WHERE district_name ILIKE '%bogia%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 18,
    MIN(district_id)
FROM districts
WHERE district_name ILIKE '%wewak%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 19,
    MIN(district_id)
FROM districts
WHERE district_name ILIKE '%goroka%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 20,
    MIN(district_id)
FROM districts
WHERE district_name ILIKE '%lae%' ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 21,
    district_id
FROM districts
LIMIT 1 OFFSET 5 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 22,
    district_id
FROM districts
LIMIT 1 OFFSET 10 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 23,
    district_id
FROM districts
LIMIT 1 OFFSET 15 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 24,
    district_id
FROM districts
LIMIT 1 OFFSET 20 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 25,
    district_id
FROM districts
LIMIT 1 OFFSET 25 ON CONFLICT DO NOTHING;
-- Step 6: Technicians/Facility Managers - Facility Scopes (26-50)
INSERT INTO user_scopes (user_id, facility_id)
SELECT 26,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 0 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 27,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 1 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 28,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 2 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 29,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 3 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 30,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 4 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 31,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 5 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 32,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 6 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 33,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 7 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 34,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 8 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 35,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 9 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 36,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 10 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 37,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 11 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 38,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 12 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 39,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 13 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 40,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 14 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 41,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 15 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 42,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 16 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 43,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 17 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 44,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 18 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 45,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 19 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 46,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 20 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 47,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 21 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 48,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 22 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 49,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 23 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, facility_id)
SELECT 50,
    facility_id
FROM facilities
WHERE facility_id > 2
LIMIT 1 OFFSET 24 ON CONFLICT DO NOTHING;
-- VERIFICATION
SELECT '✓ Roles assigned' as status,
    COUNT(*) as count
FROM users
WHERE role_id IS NOT NULL;
SELECT '✓ Location scopes assigned' as status,
    COUNT(*) as count
FROM user_scopes;
SELECT '✓ COMPLETED - Test users populated!' as final_status;