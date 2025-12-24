const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

async function runUpdate() {
    try {
        const sqlPath = path.join(__dirname, 'sql', 'update_spareparts_categories.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Updating spare parts categories...');
        await db.query(sql);
        console.log('✅ Categories updated successfully.');
    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        process.exit();
    }
}
runUpdate();
