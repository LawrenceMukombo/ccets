const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); // resolve backend/.env
const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

async function migrate() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'png_ccets',
        password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
        port: parseInt(process.env.DB_PORT || '5433'),
    });


    try {
        console.log('Connecting to database...');
        
        // 1. Create public tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.tenants (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                schema_name VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS public.super_admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            INSERT INTO public.tenants (code, name, schema_name) 
            VALUES ('png', 'Papua New Guinea', 'png') 
            ON CONFLICT (code) DO NOTHING;
            
            INSERT INTO public.tenants (code, name, schema_name) 
            VALUES ('zambia', 'Zambia', 'zambia') 
            ON CONFLICT (code) DO NOTHING;
            
            -- Insert a default superadmin with password 'SuperAdmin123!'
            INSERT INTO public.super_admins (username, password_hash)
            VALUES ('superadmin', '$2a$10$X8O.UfF51Z5r7d5h/5V37.gL/b2U.1gV6aT/y/5x6F4/95Z6V4XhW')
            ON CONFLICT (username) DO NOTHING;
        `);

        // 2. Create png schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS png;`);
        
        // 3. Move tables from public to png
        const { rows } = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('tenants', 'super_admins');
        `);

        for (const row of rows) {
            const tableName = row.table_name;
            console.log(`Moving table: ${tableName}`);
            await pool.query(`ALTER TABLE public."${tableName}" SET SCHEMA png;`);
        }
        
        // 4. Move views from public to png
        const { rows: viewRows } = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public';
        `);

        for (const row of viewRows) {
            const viewName = row.table_name;
            console.log(`Moving view: ${viewName}`);
            await pool.query(`ALTER VIEW public."${viewName}" SET SCHEMA png;`);
        }
        
        // 5. Clone png to zambia using pg_dump logic
        console.log('Cloning png schema to zambia...');
        try {
            // Dump the png schema inside container
            execSync(`docker exec ccets_db pg_dump -U postgres -d png_ccets -n png -f /tmp/temp_dump.sql`);
            execSync(`docker cp ccets_db:/tmp/temp_dump.sql temp_dump.sql`);
            execSync(`docker exec ccets_db rm /tmp/temp_dump.sql`);

            // Read the dump and replace 'png' with 'zambia'
            let dumpContent = fs.readFileSync('temp_dump.sql', 'utf8');
            
            // Carefully replace schema references.
            // "png"
            // png.
            // SCHEMA png
            dumpContent = dumpContent.replace(/CREATE SCHEMA png;/g, 'CREATE SCHEMA zambia;');
            dumpContent = dumpContent.replace(/ALTER SCHEMA png/g, 'ALTER SCHEMA zambia');
            dumpContent = dumpContent.replace(/Schema: png;/g, 'Schema: zambia;');
            dumpContent = dumpContent.replace(/ png\./g, ' zambia.');
            
            fs.writeFileSync('temp_zambia_dump.sql', dumpContent);

            // Copy to container and import back to the database
            execSync(`docker cp temp_zambia_dump.sql ccets_db:/tmp/temp_zambia_dump.sql`);
            execSync(`docker exec ccets_db psql -U postgres -d png_ccets -f /tmp/temp_zambia_dump.sql`);
            execSync(`docker exec ccets_db rm /tmp/temp_zambia_dump.sql`);
            
            // Clean up local files
            fs.unlinkSync('temp_dump.sql');
            fs.unlinkSync('temp_zambia_dump.sql');
            
            console.log('Zambia schema cloned successfully.');
        } catch (execError) {
            console.error('Error during schema cloning:', execError.message);
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        pool.end();
    }
}

migrate();
