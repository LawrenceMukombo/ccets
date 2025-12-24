const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433, // Use 5433 as per prev context
    database: process.env.DB_NAME || 'png_ccets',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod'
});

async function backfill() {
    try {
        console.log('Starting audit trail backfill...');

        // 1. Backfill from ticket_activity_log
        const res = await pool.query(`
            INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details, created_at)
            SELECT 
                action_by,
                action,
                'Ticket',
                ticket_id::text,
                details,
                timestamp
            FROM ticket_activity_log
            WHERE NOT EXISTS (
                SELECT 1 FROM audit_trail 
                WHERE entity_type = 'Ticket' 
                AND entity_id = ticket_activity_log.ticket_id::text 
                AND created_at = ticket_activity_log.timestamp
            )
        `);
        console.log(`Backfilled ${res.rowCount} rows from ticket_activity_log`);

        // 2. Backfill from tickets (creation) if not present
        const ticketsRes = await pool.query(`
            INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details, created_at)
            SELECT 
                created_by,
                'Created',
                'Ticket',
                ticket_id::text,
                'Ticket created (backfill)',
                created_at
            FROM tickets
            WHERE NOT EXISTS (
                SELECT 1 FROM audit_trail 
                WHERE entity_type = 'Ticket' 
                AND entity_id = tickets.ticket_id::text 
                AND action = 'Created'
            )
        `);
        console.log(`Backfilled ${ticketsRes.rowCount} ticket creations`);

        console.log('Backfill complete.');
        process.exit(0);
    } catch (e) {
        console.error('Backfill error:', e);
        process.exit(1);
    }
}

backfill();
