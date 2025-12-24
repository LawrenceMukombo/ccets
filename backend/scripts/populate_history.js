const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');

async function populate() {
    console.log('Populating historical notifications...');
    let count = 0;

    try {
        console.log('Fetching tickets...');
        const result = await db.query('SELECT * FROM tickets');
        const tickets = result.rows;

        console.log(`Found ${tickets.length} tickets.`);

        for (const ticket of tickets) {
            // Validate User ID
            // created_by might be null
            if (!ticket.created_by) continue;

            const userId = parseInt(ticket.created_by);
            if (isNaN(userId)) continue;

            const ref = ticket.ticket_reference_number || `ID-${ticket.ticket_id}`;
            const link = `/tickets/${ticket.ticket_id}`;
            const priority = ticket.urgency || ticket.priority || 'Medium';

            try {
                // Check dupes not needed, just insert (history)
                await db.query(`
                    INSERT INTO notifications 
                    (recipient_user_id, ticket_id, message, event_type, link, created_at, is_read, notification_type, status, priority)
                    VALUES ($1, $2, $3, 'ticket_created', $4, $5, true, 'in_app', 'sent', $6)
                `, [userId, ticket.ticket_id, `Ticket ${ref} created`, link, ticket.created_at || new Date(), priority]);
                count++;
            } catch (err) {
                // console.log('Insert skipped:', err.message);
            }

            // Activity Log
            try {
                const logs = await db.query('SELECT * FROM ticket_activity_log WHERE ticket_id = $1', [ticket.ticket_id]);

                for (const log of logs.rows) {
                    let type = 'ticket_updated';
                    const action = log.action ? log.action.toLowerCase() : '';
                    if (action.includes('assign')) type = 'ticket_assigned';
                    else if (action.includes('resolve')) type = 'ticket_resolved';
                    else if (action.includes('escalate')) type = 'ticket_escalated';

                    const msg = log.details || log.action;

                    await db.query(`
                        INSERT INTO notifications 
                        (recipient_user_id, ticket_id, message, event_type, link, created_at, is_read, notification_type, status, priority)
                        VALUES ($1, $2, $3, $4, $5, $6, true, 'in_app', 'sent', $7)
                    `, [userId, ticket.ticket_id, `${msg}`, type, link, log.timestamp || new Date(), priority]);
                    count++;
                }
            } catch (e) { }
        }

        console.log(`Successfully populated ${count} historical notifications.`);

    } catch (e) {
        console.error('Population failed:', e);
    }
}

populate().then(() => process.exit());
