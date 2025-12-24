-- ==============================================================================
-- COMPLETE Setup: Create Tables + Populate Test Users
-- Run this in your psql terminal connected to png_ccets
-- ==============================================================================
-- Step 1: Create user_scopes table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_scopes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(region_id),
    province_id INTEGER REFERENCES provinces(province_id),
    district_id INTEGER REFERENCES districts(district_id),
    facility_id INTEGER REFERENCES facilities(facility_id),
    created_at TIMESTAMP DEFAULT NOW(),
    -- Constraint to ensure only one scope level per row
    CONSTRAINT one_scope_per_row CHECK (
        (
            region_id IS NOT NULL
            AND province_id IS NULL
            AND district_id IS NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NOT NULL
            AND district_id IS NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NULL
            AND district_id IS NOT NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NULL
            AND district_id IS NULL
            AND facility_id IS NOT NULL
        )
    )
);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_scopes_user_id ON user_scopes(user_id);
-- Step 2: Create roles (only role_name, no description)
INSERT INTO roles (role_name)
VALUES ('Admin'),
    ('National Manager'),
    ('Regional Coordinator'),
    ('Provincial ICT Officer'),
    ('District Officer'),
    ('Technician'),
    ('Facility Manager') ON CONFLICT (role_name) DO NOTHING;
-- Step 3: Assign roles to users (only if they don't have one)
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
-- Step 4: Assign location scopes ONLY to users who exist and have appropriate roles
-- Regional Coordinators (if they exist)
DO $$
DECLARE regional_role_id INT;
user_record RECORD;
region_counter INT := 0;
BEGIN -- Get Regional Coordinator role ID
SELECT role_id INTO regional_role_id
FROM roles
WHERE role_name = 'Regional Coordinator';
-- Assign regions to users with Regional Coordinator role
FOR user_record IN
SELECT user_id
FROM users
WHERE role_id = regional_role_id
ORDER BY user_id
LIMIT 4 LOOP IF region_counter = 0 THEN
INSERT INTO user_scopes (user_id, region_id)
SELECT user_record.user_id,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%southern%' ON CONFLICT DO NOTHING;
ELSIF region_counter = 1 THEN
INSERT INTO user_scopes (user_id, region_id)
SELECT user_record.user_id,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%highlands%' ON CONFLICT DO NOTHING;
ELSIF region_counter = 2 THEN
INSERT INTO user_scopes (user_id, region_id)
SELECT user_record.user_id,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%momase%' ON CONFLICT DO NOTHING;
ELSIF region_counter = 3 THEN
INSERT INTO user_scopes (user_id, region_id)
SELECT user_record.user_id,
    MIN(region_id)
FROM regions
WHERE region_name ILIKE '%islands%' ON CONFLICT DO NOTHING;
END IF;
region_counter := region_counter + 1;
END LOOP;
END $$;
-- Provincial Officers
DO $$
DECLARE provincial_role_id INT;
user_record RECORD;
province_names TEXT [] := ARRAY ['central', 'madang', 'sepik', 'western%highlands', 'morobe', 'eastern%highlands', 'gulf', 'britain'];
province_counter INT := 1;
BEGIN
SELECT role_id INTO provincial_role_id
FROM roles
WHERE role_name = 'Provincial ICT Officer';
FOR user_record IN
SELECT user_id
FROM users
WHERE role_id = provincial_role_id
ORDER BY user_id LOOP IF province_counter <= array_length(province_names, 1) THEN EXECUTE format(
        'INSERT INTO user_scopes (user_id, province_id) SELECT %s, MIN(province_id) FROM provinces WHERE province_name ILIKE %L ON CONFLICT DO NOTHING',
        user_record.user_id,
        '%' || province_names [province_counter] || '%'
    );
province_counter := province_counter + 1;
END IF;
END LOOP;
END $$;
-- District Officers
DO $$
DECLARE district_role_id INT;
user_record RECORD;
district_names TEXT [] := ARRAY ['moresby', 'bogia', 'wewak', 'goroka', 'lae'];
district_counter INT := 1;
offset_counter INT := 0;
BEGIN
SELECT role_id INTO district_role_id
FROM roles
WHERE role_name = 'District Officer';
FOR user_record IN
SELECT user_id
FROM users
WHERE role_id = district_role_id
ORDER BY user_id LOOP IF district_counter <= array_length(district_names, 1) THEN EXECUTE format(
        'INSERT INTO user_scopes (user_id, district_id) SELECT %s, MIN(district_id) FROM districts WHERE district_name ILIKE %L ON CONFLICT DO NOTHING',
        user_record.user_id,
        '%' || district_names [district_counter] || '%'
    );
district_counter := district_counter + 1;
ELSE -- Assign random districts to remaining district officers
EXECUTE format(
    'INSERT INTO user_scopes (user_id, district_id) SELECT %s, district_id FROM districts LIMIT 1 OFFSET %s ON CONFLICT DO NOTHING',
    user_record.user_id,
    offset_counter
);
offset_counter := offset_counter + 5;
END IF;
END LOOP;
END $$;
-- Technicians and Facility Managers
DO $$
DECLARE tech_role_id INT;
fm_role_id INT;
user_record RECORD;
facility_offset INT := 0;
BEGIN
SELECT role_id INTO tech_role_id
FROM roles
WHERE role_name = 'Technician';
SELECT role_id INTO fm_role_id
FROM roles
WHERE role_name = 'Facility Manager';
FOR user_record IN
SELECT user_id
FROM users
WHERE role_id IN (tech_role_id, fm_role_id)
ORDER BY user_id LOOP EXECUTE format(
        'INSERT INTO user_scopes (user_id, facility_id) SELECT %s, facility_id FROM facilities WHERE facility_id > 2 LIMIT 1 OFFSET %s ON CONFLICT DO NOTHING',
        user_record.user_id,
        facility_offset
    );
facility_offset := facility_offset + 1;
END LOOP;
END $$;
-- VERIFICATION QUERIES
SELECT '=== ROLES ASSIGNED ===' as info;
SELECT r.role_name,
    COUNT(u.user_id) as user_count
FROM roles r
    LEFT JOIN users u ON r.role_id = u.role_id
GROUP BY r.role_name
ORDER BY user_count DESC;
SELECT '=== LOCATION SCOPES ===' as info;
SELECT CASE
        WHEN region_id IS NOT NULL THEN 'Regional'
        WHEN province_id IS NOT NULL THEN 'Provincial'
        WHEN district_id IS NOT NULL THEN 'District'
        WHEN facility_id IS NOT NULL THEN 'Facility'
    END as scope_level,
    COUNT(*) as user_count
FROM user_scopes
GROUP BY CASE
        WHEN region_id IS NOT NULL THEN 'Regional'
        WHEN province_id IS NOT NULL THEN 'Provincial'
        WHEN district_id IS NOT NULL THEN 'District'
        WHEN facility_id IS NOT NULL THEN 'Facility'
    END
ORDER BY user_count DESC;
SELECT '=== ✓ SETUP COMPLETE! ===' as final_status;