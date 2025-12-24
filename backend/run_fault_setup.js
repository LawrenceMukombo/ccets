const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

async function runFaultSetup() {
    try {
        console.log('Reading fault setup SQL...');
        const sqlPath = path.join(__dirname, 'sql', 'setup_fault_categorization.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing fault setup (this might take a moment)...');
        await db.query(sql);

        console.log('✅ Fault categorization system set up successfully!');
    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        process.exit();
    }
}

runFaultSetup();
