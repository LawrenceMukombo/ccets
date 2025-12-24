require('dotenv').config();
const db = require('./src/db');

const fs = require('fs');

async function debugUser() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        const userId = 21; // Lawrence.Mukombo.Technician

        log(`--- Debugging User ID: ${userId} ---`);

        // 1. Check User Details & Assigned Columns
        const userRes = await db.query(`
            SELECT 
                u.user_id, u.username, u.email, r.role_name,
                u.assigned_region_id, u.assigned_province_id,
                u.assigned_district_id, u.assigned_facility_id
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = $1
        `, [userId]);
        log('User Table Info: ' + JSON.stringify(userRes.rows[0], null, 2));

        // 2. Check Permissions Table Existence
        const tablesRes = await db.query(`
             SELECT table_name FROM information_schema.tables 
             WHERE table_name IN ('user_scopes', 'user_location_scopes', 'user_location_scope')
        `);
        log('Found Tables: ' + JSON.stringify(tablesRes.rows.map(t => t.table_name), null, 2));

        // 3. Check Tickets Assigned to User with Region Info
        const ticketRes = await db.query(`
            SELECT t.ticket_id, t.ticket_reference_number, 
                   f.facility_name, r.region_name, r.region_id
            FROM tickets t
            JOIN facilities f ON t.facility_id = f.facility_id
            JOIN provinces p ON f.province_id = p.province_id
            JOIN regions r ON p.region_id = r.region_id
            WHERE t.assigned_to = $1
        `, [userId]);

        log(`\nFound ${ticketRes.rows.length} tickets assigned to user.`);
        ticketRes.rows.forEach(t => {
            log(`- Ticket #${t.ticket_id} (Ref: ${t.ticket_reference_number}): Facility: ${t.facility_name}, Region: ${t.region_name} (ID: ${t.region_id})`);
        });

    } catch (err) {
        log('CRITICAL ERROR: ' + err);
    } finally {
        fs.writeFileSync('debug_output.txt', output);
    }
}

debugUser();
