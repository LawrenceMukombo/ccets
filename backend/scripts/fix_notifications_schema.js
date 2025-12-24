const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');

async function fixSchema() {
    console.log('Fixing notifications schema...');

    try {
        await db.query('DROP TABLE IF EXISTS notifications CASCADE');
        console.log('Dropped old table.');

        await db.query(`
            CREATE TABLE notifications (
                notification_id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(ticket_id),
                recipient_user_id INTEGER REFERENCES users(user_id),
                message TEXT,
                sent_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE,
                link VARCHAR(255),
                status VARCHAR(50) DEFAULT 'sent',
                notification_type VARCHAR(50) DEFAULT 'in_app',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                event_type VARCHAR(50),
                priority VARCHAR(20) DEFAULT 'medium'
            )
        `);
        console.log('Created table with correct schema.');

        // Add indexes
        await db.query('CREATE INDEX ON notifications(recipient_user_id)');

        // Seed Data
        console.log('Seeding data...');
        const users = await db.query('SELECT user_id FROM users LIMIT 10');

        for (const user of users.rows) {
            console.log(`Seeding Welcome for User ID: ${user.user_id} (${typeof user.user_id})`);

            await db.query(`
                INSERT INTO notifications (recipient_user_id, message, event_type, created_at, is_read)
                VALUES ($1, 'Welcome to Notifications!', 'system', NOW(), false)
            `, [user.user_id]);
        }

        console.log('Schema fixed and seeded (Welcome only).');

    } catch (e) {
        console.error('Fix failed:', e);
    }
}

fixSchema().then(() => process.exit());
