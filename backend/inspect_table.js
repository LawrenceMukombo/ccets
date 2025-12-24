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
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tickets';
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
