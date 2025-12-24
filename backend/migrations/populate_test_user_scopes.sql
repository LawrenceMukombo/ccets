-- =====================================================================
-- POPULATE TEST USERS WITH ROLES AND LOCATION SCOPES
-- =====================================================================
-- This script assigns roles and location scopes to existing test users
-- For development/testing purposes only - will be deleted in production
-- =====================================================================
-- First, let's check what we have and create roles if needed
-- =====================================================================
-- Ensure roles table has all necessary roles
INSERT INTO roles (role_name, role_description)
VALUES ('Admin', 'System Administrator with full access'),
    (
        'National Manager',
        'National level manager with countrywide access'
    ),
    (
        'Regional Coordinator',
        'Regional level coordinator'
    ),
    (
        'Provincial ICT Officer',
        'Provincial ICT officer'
    ),
    ('District Officer', 'District level officer'),
    ('Technician', 'Field technician'),
    ('Facility Manager', 'Health facility manager'),
    ('Viewer', 'Read-only access') ON CONFLICT (role_name) DO NOTHING;
-- =====================================================================
-- ASSIGN ROLES TO USERS
-- =====================================================================
-- Update users without roles (assuming typical test user setup)
-- Assign roles based on user patterns or manually
-- Admin users (user_id 1-2)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Admin'
        LIMIT 1
    )
WHERE user_id IN (1, 2)
    AND role_id IS NULL;
-- National Manager (user_id 3)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'National Manager'
        LIMIT 1
    )
WHERE user_id = 3
    AND role_id IS NULL;
-- Regional Coordinators (user_id 4-7, one per region)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Regional Coordinator'
        LIMIT 1
    )
WHERE user_id BETWEEN 4 AND 7
    AND role_id IS NULL;
-- Provincial ICT Officers (user_id 8-15)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Provincial ICT Officer'
        LIMIT 1
    )
WHERE user_id BETWEEN 8 AND 15
    AND role_id IS NULL;
-- District Officers (user_id 16-25)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'District Officer'
        LIMIT 1
    )
WHERE user_id BETWEEN 16 AND 25
    AND role_id IS NULL;
-- Technicians (user_id 26-40)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Technician'
        LIMIT 1
    )
WHERE user_id BETWEEN 26 AND 40
    AND role_id IS NULL;
-- Facility Managers (user_id 41-50)
UPDATE users
SET role_id = (
        SELECT role_id
        FROM roles
        WHERE role_name = 'Facility Manager'
        LIMIT 1
    )
WHERE user_id BETWEEN 41 AND 50
    AND role_id IS NULL;
-- =====================================================================
-- ASSIGN LOCATION SCOPES
-- =====================================================================
-- Admin users (1-2): No scope needed (national access by role)
-- National Manager (3): No scope needed (national access by role)
-- Regional Coordinators: Assign to different regions
-- User 4 -> Southern Region (region_id = 1)
INSERT INTO user_scopes (user_id, region_id)
SELECT 4,
    region_id
FROM regions
WHERE region_name ILIKE '%southern%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 5 -> Highlands Region (region_id = 2)
INSERT INTO user_scopes (user_id, region_id)
SELECT 5,
    region_id
FROM regions
WHERE region_name ILIKE '%highlands%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 6 -> MOMASE Region (region_id = 3)
INSERT INTO user_scopes (user_id, region_id)
SELECT 6,
    region_id
FROM regions
WHERE region_name ILIKE '%momase%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 7 -> Islands Region (region_id = 4)
INSERT INTO user_scopes (user_id, region_id)
SELECT 7,
    region_id
FROM regions
WHERE region_name ILIKE '%islands%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- Provincial ICT Officers: Assign to various provinces
-- User 8 -> Central Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 8,
    province_id
FROM provinces
WHERE province_name ILIKE '%central%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 9 -> Madang Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 9,
    province_id
FROM provinces
WHERE province_name ILIKE '%madang%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 10 -> East Sepik Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 10,
    province_id
FROM provinces
WHERE province_name ILIKE '%east sepik%'
    OR province_name ILIKE '%sepik east%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 11 -> Western Highlands Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 11,
    province_id
FROM provinces
WHERE province_name ILIKE '%western highlands%'
    OR province_name ILIKE '%highlands western%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 12 -> Morobe Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 12,
    province_id
FROM provinces
WHERE province_name ILIKE '%morobe%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 13 -> Eastern Highlands Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 13,
    province_id
FROM provinces
WHERE province_name ILIKE '%eastern highlands%'
    OR province_name ILIKE '%highlands eastern%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 14 -> Gulf Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 14,
    province_id
FROM provinces
WHERE province_name ILIKE '%gulf%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 15 -> West New Britain Province
INSERT INTO user_scopes (user_id, province_id)
SELECT 15,
    province_id
FROM provinces
WHERE province_name ILIKE '%west%new%britain%'
    OR province_name ILIKE '%new%britain%west%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- District Officers: Assign to various districts
-- User 16 -> Port Moresby District
INSERT INTO user_scopes (user_id, district_id)
SELECT 16,
    district_id
FROM districts
WHERE district_name ILIKE '%port moresby%'
    OR district_name ILIKE '%moresby%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 17 -> Bogia District (Madang)
INSERT INTO user_scopes (user_id, district_id)
SELECT 17,
    district_id
FROM districts
WHERE district_name ILIKE '%bogia%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 18 -> Wewak District (East Sepik)
INSERT INTO user_scopes (user_id, district_id)
SELECT 18,
    district_id
FROM districts
WHERE district_name ILIKE '%wewak%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 19 -> Goroka District (Eastern Highlands)
INSERT INTO user_scopes (user_id, district_id)
SELECT 19,
    district_id
FROM districts
WHERE district_name ILIKE '%goroka%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- User 20 -> Lae District (Morobe)
INSERT INTO user_scopes (user_id, district_id)
SELECT 20,
    district_id
FROM districts
WHERE district_name ILIKE '%lae%'
LIMIT 1 ON CONFLICT DO NOTHING;
-- Users 21-25 -> Assign to random districts
INSERT INTO user_scopes (user_id, district_id)
SELECT 21,
    district_id
FROM districts
ORDER BY RANDOM()
LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 22,
    district_id
FROM districts
ORDER BY RANDOM()
LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 23,
    district_id
FROM districts
ORDER BY RANDOM()
LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 24,
    district_id
FROM districts
ORDER BY RANDOM()
LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO user_scopes (user_id, district_id)
SELECT 25,
    district_id
FROM districts
ORDER BY RANDOM()
LIMIT 1 ON CONFLICT DO NOTHING;
-- Technicians and Facility Managers: Assign to specific facilities
-- Users 26-50 -> Assign to random facilities
DO $$
DECLARE user_record RECORD;
random_facility_id INTEGER;
BEGIN FOR user_record IN
SELECT user_id
FROM users
WHERE user_id BETWEEN 26 AND 50 LOOP -- Get a random facility
SELECT facility_id INTO random_facility_id
FROM facilities
WHERE facility_id NOT IN (1, 2) -- Exclude placeholder facilities
ORDER BY RANDOM()
LIMIT 1;
IF random_facility_id IS NOT NULL THEN
INSERT INTO user_scopes (user_id, facility_id)
VALUES (user_record.user_id, random_facility_id) ON CONFLICT DO NOTHING;
END IF;
END LOOP;
END $$;
-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
-- Check users without roles
SELECT user_id,
    username,
    email,
    first_name,
    last_name
FROM users
WHERE role_id IS NULL
ORDER BY user_id;
-- Check users without location scopes (excluding admins/national managers)
SELECT u.user_id,
    u.username,
    r.role_name
FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN user_scopes us ON u.user_id = us.user_id
WHERE us.id IS NULL
    AND r.role_name NOT IN (
        'Admin',
        'System Administrator',
        'National Manager',
        'Super Admin'
    )
ORDER BY u.user_id;
-- Summary of role assignments
SELECT r.role_name,
    COUNT(u.user_id) as user_count
FROM roles r
    LEFT JOIN users u ON r.role_id = u.role_id
GROUP BY r.role_name
ORDER BY user_count DESC;
-- Summary of location scope assignments
SELECT 'Facility' as scope_level,
    COUNT(DISTINCT user_id) as user_count
FROM user_scopes
WHERE facility_id IS NOT NULL
UNION ALL
SELECT 'District' as scope_level,
    COUNT(DISTINCT user_id) as user_count
FROM user_scopes
WHERE district_id IS NOT NULL
    AND facility_id IS NULL
UNION ALL
SELECT 'Province' as scope_level,
    COUNT(DISTINCT user_id) as user_count
FROM user_scopes
WHERE province_id IS NOT NULL
    AND district_id IS NULL
    AND facility_id IS NULL
UNION ALL
SELECT 'Region' as scope_level,
    COUNT(DISTINCT user_id) as user_count
FROM user_scopes
WHERE region_id IS NOT NULL
    AND province_id IS NULL
    AND district_id IS NULL
    AND facility_id IS NULL;
-- =====================================================================
-- END OF SCRIPT
-- =====================================================================