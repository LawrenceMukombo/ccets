-- Check all active users with their credentials
-- Run this in your psql terminal
SELECT user_id,
    username,
    email,
    first_name || ' ' || last_name as full_name,
    CASE
        WHEN password IS NOT NULL THEN password
        ELSE '(hash only - no plaintext)'
    END as password_hint,
    is_active,
    is_national_access,
    accessible_regions,
    accessible_provinces,
    accessible_districts,
    accessible_facilities,
    r.role_name
FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
WHERE is_active = true
ORDER BY user_id;
-- Summary of users with plaintext passwords stored
SELECT user_id,
    username,
    password as plaintext_password,
    role_id
FROM users
WHERE password IS NOT NULL
    AND is_active = true
ORDER BY user_id;