-- Create or update admin user
INSERT INTO users (
        username,
        password_hash,
        email,
        first_name,
        last_name,
        phone_number,
        is_active,
        is_national_access,
        created_at,
        updated_at
    )
VALUES (
        'admin',
        '$2a$10$VGxxGz.zzehbrz.26e.tXYrTyChVRox',
        'admin@ccets.pg',
        'System',
        'Administrator',
        '+675 7000 0000',
        true,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (username) DO
UPDATE
SET password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    is_active = true,
    is_national_access = true,
    updated_at = NOW()
RETURNING user_id,
    username,
    email,
    is_national_access;