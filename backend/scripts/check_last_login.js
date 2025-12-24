const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'png_ccets',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod'
});

async function checkLastLogin() {
    try {
        const res = await pool.query(`SELECT user_id, username, last_login FROM users`);
        console.log('Users last_login:', res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkLastLogin();
