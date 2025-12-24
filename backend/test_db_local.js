const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'password_change_me_in_prod',
    port: 5433,
});

async function test() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful:', res.rows[0]);
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const admin = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        console.log('Admin user exists:', admin.rows.length > 0);
        if (admin.rows.length > 0) {
            console.log('Admin details:', { username: admin.rows[0].username, role: admin.rows[0].role });
        }
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

test();
