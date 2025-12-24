const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

async function runMigration() {
    try {
        console.log('Reading migration script...');
        const sqlPath = path.join(__dirname, 'sql', 'update_spareparts_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration...');
        await db.query(sql);

        console.log('✅ Migration successful! Columns added.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

runMigration();
