-- Check what columns exist in tickets table
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;
-- Check what columns exist in facilities table
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'facilities'
ORDER BY ordinal_position;