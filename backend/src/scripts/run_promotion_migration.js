const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    port: parseInt(process.env.DB_PORT || '5433'),
});

async function run() {
    try {
        console.log('Reading migration file...');
        const migrationPath = path.join(__dirname, '..', '..', 'migrations', 'add_promotion_and_integration_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration in database...');
        await pool.query(sql);

        console.log('Migration successfully completed!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

run();
