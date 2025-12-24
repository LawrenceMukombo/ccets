require('dotenv').config();
const db = require('../src/db');

async function checkData() {
    try {
        console.log('--- CHECKING TICKETS ---');
        const tickets = await db.query('SELECT count(*) FROM tickets');
        console.log('Total Tickets:', tickets.rows[0].count);

        const statusCounts = await db.query('SELECT status, count(*) FROM tickets GROUP BY status');
        console.log('Tickets by Status:', statusCounts.rows);

        const provinceJoin = await db.query(`
            SELECT p.province_name, count(*) 
            FROM tickets t 
            LEFT JOIN facilities f ON t.facility_id = f.facility_id 
            LEFT JOIN provinces p ON f.province_id = p.province_id 
            GROUP BY p.province_name
        `);
        console.log('Tickets by Province (Joined):', provinceJoin.rows);

        console.log('--- CHECKING EQUIPMENT ---');
        const equipment = await db.query('SELECT count(*) FROM equipment');
        console.log('Total Equipment:', equipment.rows[0].count);

    } catch (err) {
        console.error('Error checking data:', err);
    } finally {
        process.exit();
    }
}

checkData();
