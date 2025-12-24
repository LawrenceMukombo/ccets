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
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tickets'
            ORDER BY column_name;
        `);
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
