const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');

async function inspect() {
    try {
        console.log('Checking for equipment table...');
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'equipment'
        `);

        if (res.rows.length === 0) {
            console.log('Table "equipment" NOT FOUND.');
            // Maybe it's called 'assets'?
            const resAssets = await db.query(`
                SELECT table_name FROM information_schema.tables WHERE table_schema='public'
            `);
            console.log('Tables found:', resAssets.rows.map(r => r.table_name).join(', '));
        } else {
            console.log('Table "equipment" found. Columns:');
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }

    } catch (e) { console.error(e); }
}

inspect().then(() => process.exit());
