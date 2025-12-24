require('dotenv').config();
const db = require('./src/db');
const fs = require('fs');

async function fixUserScope() {
    const userId = 21;
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        log(`--- Fixing Scope for User ID: ${userId} ---`);

        // 1. Unassign tickets from wrong regions
        log('Identifying tickets assigned to user outside of MOMASE (Region ID 4)...');

        const wrongTicketsRes = await db.query(`
            SELECT t.ticket_id, t.ticket_reference_number, r.region_name, r.region_id
            FROM tickets t
            JOIN facilities f ON t.facility_id = f.facility_id
            JOIN provinces p ON f.province_id = p.province_id
            JOIN regions r ON p.region_id = r.region_id
            WHERE t.assigned_to = $1 AND r.region_id != 4
        `, [userId]);

        if (wrongTicketsRes.rows.length === 0) {
            log('No wrongly assigned tickets found.');
        } else {
            log(`Found ${wrongTicketsRes.rows.length} tickets from other regions. Unassigning them...`);

            const ticketIds = wrongTicketsRes.rows.map(t => t.ticket_id);

            const updateRes = await db.query(`
                UPDATE tickets 
                SET assigned_to = NULL, 
                    assigned_to_name = NULL, 
                    assigned_to_email = NULL, 
                    assigned_to_phone = NULL,
                    ticket_status = CASE 
                        WHEN ticket_status = 'Assigned' THEN 'New'
                        WHEN ticket_status = 'In Progress' THEN 'New'
                        ELSE ticket_status 
                    END
                WHERE ticket_id = ANY($1)
                RETURNING ticket_id
            `, [ticketIds]);

            log(`Successfully unassigned ${updateRes.rows.length} tickets.`);
        }

        // 2. Clear any extra scopes from user_scopes table if they exist
        // (Just in case he has explicit permissions to other regions)
        const metadataRes = await db.query(`
             SELECT table_name FROM information_schema.tables WHERE table_name = 'user_scopes'
        `);

        if (metadataRes.rows.length > 0) {
            // Check if user has scopes
            const scopesRes = await db.query(`SELECT * FROM user_scopes WHERE user_id = $1`, [userId]);
            if (scopesRes.rows.length > 0) {
                log(`Found ${scopesRes.rows.length} entries in user_scopes. Clearing extra scopes...`);

                // We keep scopes that match region 4 if any, delete others
                // But typically for a technician defined by assigned_region_id, user_scopes might be empty.
                // Let's just delete rows where region_id != 4

                const deleteScopeRes = await db.query(`
                    DELETE FROM user_scopes 
                    WHERE user_id = $1 AND (region_id != 4 OR region_id IS NULL)
                 `, [userId]);

                log(`Deleted ${deleteScopeRes.rowCount} non-MOMASE entries from user_scopes.`);
            }
        }

        log('--- Fix Complete ---');

    } catch (err) {
        log('CRITICAL ERROR: ' + err);
    } finally {
        // fs.writeFileSync('fix_output.txt', output);
    }
}

fixUserScope();
