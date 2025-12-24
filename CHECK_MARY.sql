-- Check mary.numa.provincial.manager data
SELECT user_id,
    username,
    password,
    role_id,
    is_national_access,
    accessible_regions,
    accessible_provinces,
    accessible_districts,
    accessible_facilities,
    r.role_name
FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
WHERE username = 'mary.numa.provincial.manager';