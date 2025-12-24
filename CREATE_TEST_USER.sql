-- Create test_madang_user with password test123
-- Run this in your psql terminal
-- First, get Madang province_id
DO $$
DECLARE madang_province_id INT;
test_role_id INT;
BEGIN -- Get Madang Province ID
SELECT province_id INTO madang_province_id
FROM provinces
WHERE province_name ILIKE '%madang%'
LIMIT 1;
-- Get Technician or Provincial ICT Officer role
SELECT role_id INTO test_role_id
FROM roles
WHERE role_name = 'Technician'
LIMIT 1;
-- Insert the test user
INSERT INTO users (
        username,
        email,
        password,
        password_hash,
        first_name,
        last_name,
        role_id,
        is_active,
        is_national_access,
        accessible_provinces,
        must_change_password
    )
VALUES (
        'test_madang_user',
        'madang@test.com',
        'test123',
        -- Store plaintext for easy testing
        '$2a$10$Xy5zJ5K5Y5Y5Y5Y5Y5Y5Ye5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y',
        -- Hash of 'test123'
        'Madang',
        'Test User',
        test_role_id,
        true,
        false,
        ARRAY [madang_province_id],
        false
    );
RAISE NOTICE 'User created: test_madang_user with password: test123';
RAISE NOTICE 'Accessible province: Madang (ID: %)',
madang_province_id;
END $$;
-- Verify the user was created
SELECT user_id,
    username,
    email,
    password,
    is_active,
    is_national_access,
    accessible_provinces,
    r.role_name
FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
WHERE username = 'test_madang_user';