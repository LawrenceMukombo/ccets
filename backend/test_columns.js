const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

async function test() {
    try {
        console.log('Checking columns in spareparts...');
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'spareparts'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Columns:', columns);

        if (columns.includes('category')) {
            console.log('✅ "category" column exists.');
        } else {
            console.log('❌ "category" column is MISSING!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
