require('dotenv').config();
const db = require('./src/db');

async function checkMomaseOrphans() {
    try {
        console.log('--- Checking Region 4 (MOMASE) Tickets ---');

        // Count unassigned
        const res = await db.query(`
            SELECT count(*) 
            FROM tickets t
            JOIN facilities f ON t.facility_id = f.facility_id
            JOIN provinces p ON f.province_id = p.province_id
            WHERE p.region_id = 4 AND assigned_to IS NULL
        `);
        console.log(`Unassigned MOMASE Tickets: ${res.rows[0].count}`);

        // Count assigned to others
        const res2 = await db.query(`
            SELECT count(*) 
            FROM tickets t
            JOIN facilities f ON t.facility_id = f.facility_id
            JOIN provinces p ON f.province_id = p.province_id
            WHERE p.region_id = 4 AND assigned_to IS NOT NULL AND assigned_to != 21
        `);
        console.log(`Assigned to OTHERS in MOMASE: ${res2.rows[0].count}`);

    } catch (err) {
        console.error(err);
    }
}

checkMomaseOrphans();
