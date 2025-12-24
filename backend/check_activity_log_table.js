require('dotenv').config();
const db = require('./src/db');

async function checkTable() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ticket_activity_log'
        `);

        if (res.rows.length === 0) {
            console.log('Table ticket_activity_log DOES NOT EXIST');
        } else {
            console.log('Table ticket_activity_log Exists with columns:');
            console.log(res.rows);
        }
    } catch (err) {
        console.error(err);
    }
}

checkTable();
