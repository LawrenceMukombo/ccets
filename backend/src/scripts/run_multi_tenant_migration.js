require('dotenv').config({ path: '../../.env' }); // try resolving .env in root or backend
const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

async function migrate() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'png_ccets',
        password: 'S@mund3ng0',
        port: 5432,
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
            // Dump the png schema (schema-only or with data if needed, here we use full dump to get lookup tables, but let's just do schema-only for structure)
            // Wait, we probably want data as well for lookup tables. Let's do full dump.
            execSync(`pg_dump -U postgres -h localhost -d png_ccets -n png -f temp_dump.sql`, {
                env: { ...process.env, PGPASSWORD: 'S@mund3ng0' }
            });

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

            // Import back to the database
            execSync(`psql -U postgres -h localhost -d png_ccets -f temp_zambia_dump.sql`, {
                env: { ...process.env, PGPASSWORD: 'S@mund3ng0' }
            });
            
            // Clean up
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
