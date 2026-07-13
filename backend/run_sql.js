const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'password_change_me_in_prod',
    port: 5433,
});

async function run() {
    const sql = process.argv.slice(2).join(' ');
    if (!sql) {
        console.error('Please provide a SQL query.');
        process.exit(1);
    }
    try {
        const res = await pool.query(sql);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Query Error:', err.message);
    } finally {
        pool.end();
    }
}
run();
