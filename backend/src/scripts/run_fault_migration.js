const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    port: parseInt(process.env.DB_PORT || '5433'),
});

async function run() {
    const sqlPath = path.join(__dirname, '..', '..', 'sql', 'setup_fault_categorization.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`SQL file not found at ${sqlPath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const schemas = ['png', 'zambia'];
    for (const schema of schemas) {
        console.log(`\n⏳ Running fault categorization migration for schema "${schema}"...`);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Set search path to target schema
            await client.query(`SET search_path TO "${schema}", public`);

            // Execute the schema setup SQL
            await client.query(sqlContent);

            await client.query('COMMIT');
            console.log(`✅ Schema "${schema}" fault categorization setup successfully completed.`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ Schema "${schema}" migration failed:`, err.message);
        } finally {
            client.release();
        }
    }
    pool.end();
}

run();
