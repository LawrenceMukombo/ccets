const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'png_ccets',
    user: 'postgres',
    password: 'password_change_me_in_prod'
});

async function run() {
    try {
        await client.connect();

        // Drop redundant reference triggers
        await client.query('DROP TRIGGER IF EXISTS set_ticket_reference ON tickets');
        await client.query('DROP TRIGGER IF EXISTS set_ticket_reference_number ON tickets');
        await client.query('DROP TRIGGER IF EXISTS trg_generate_ticket_reference ON tickets');

        await client.query('DROP TRIGGER IF EXISTS trg_ticket_audit_log ON tickets');
        await client.query('DROP TRIGGER IF EXISTS trg_ticket_sla ON tickets');
        await client.query('DROP TRIGGER IF EXISTS trigger_update_ticket_timing ON tickets');
        await client.query('DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets');
        await client.query('DROP TRIGGER IF EXISTS trg_audit_tickets ON tickets');
        await client.query('DROP TRIGGER IF EXISTS trg_compute_ticket_reference ON tickets');
        console.log('Dropped ALL triggers.');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
