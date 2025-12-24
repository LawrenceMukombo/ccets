-- Verify user 16's location access data
SELECT user_id,
    username,
    is_national_access,
    accessible_regions,
    accessible_provinces,
    accessible_districts,
    accessible_facilities,
    role_id
FROM users
WHERE user_id = 16;