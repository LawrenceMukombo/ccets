require('dotenv').config();
const db = require('../src/db');

async function checkSchema() {
    try {
        console.log('--- CHECKING TICKETS TABLE SCHEMA ---');
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tickets'
        `);
        console.log(res.rows.map(r => r.column_name).join('\n'));
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
