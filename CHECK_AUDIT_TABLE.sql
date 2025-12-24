-- Check if audit_trail table exists and its structure
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'audit_trail'
ORDER BY ordinal_position;