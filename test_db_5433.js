const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'password_change_me_in_prod',
    port: 5433,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection failed on 5433:', err.message);
    } else {
        console.log('Connection successful on 5433:', res.rows[0]);
    }
    pool.end();
});
