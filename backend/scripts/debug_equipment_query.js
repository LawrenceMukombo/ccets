const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');

async function debugQuery() {
    console.log('Debugging Equipment Query...');
    try {
        // 1. Inspect Facilities Columns
        const facCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'facilities'");
        console.log('Facilities Columns:', facCols.rows.map(c => c.column_name).join(', '));

        // 2. Inspect Equipment Columns
        const eqCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'equipment'");
        console.log('Equipment Columns:');
        eqCols.rows.forEach(c => console.log(c.column_name));

        // 3. Try the failing query
        console.log('Running Controller Query...');
        const result = await db.query(`
            SELECT 
                e.*,
                f.facility_name,
                f.facility_code,
                f.region,
                f.province,
                f.district
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            WHERE e.is_del = false
            LIMIT 5
        `);
        console.log('Query Success! Rows:', result.rowCount);
    } catch (e) {
        console.error('Query Failed:', e.message);
    }
}

debugQuery().then(() => process.exit());
