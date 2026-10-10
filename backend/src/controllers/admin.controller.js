const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Query directly from public schema without search_path wrapper since we don't have a tenant context here
        const adminResult = await db.pool.query(
            'SELECT * FROM public.super_admins WHERE username = $1 AND is_active = true',
            [username]
        );

        if (adminResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { adminId: admin.id, role: 'super-admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, admin: { id: admin.id, username: admin.username } });
    } catch (error) {
        console.error('Super-admin login error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getTenants = async (req, res) => {
    try {
        const tenantsResult = await db.pool.query(`
            SELECT 
                t.id, t.code, t.name, t.schema_name, t.is_active, t.created_at,
                tc.emblem, tc.map_center, tc.map_zoom, tc.contact_email, tc.hierarchy,
                tc.currency_code, tc.currency_symbol, tc.time_zone, tc.phone_prefix
            FROM public.tenants t
            LEFT JOIN public.tenant_config tc ON t.code = tc.tenant_code
            ORDER BY t.id
        `);
        res.json(tenantsResult.rows);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.createTenant = async (req, res) => {
    const { 
        code, 
        name, 
        currency_code, 
        currency_symbol, 
        time_zone, 
        phone_prefix, 
        map_center, 
        map_zoom, 
        hierarchy, 
        admin_email, 
        admin_password 
    } = req.body;

    if (!code || !name) {
        return res.status(400).json({ message: 'Tenant code and name are required' });
    }

    const tenantCode = code.toLowerCase().trim();
    if (!/^[a-z0-9_]+$/.test(tenantCode)) {
        return res.status(400).json({ message: 'Tenant code must contain only lowercase alphanumeric characters and underscores.' });
    }

    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Ensure tenant doesn't already exist
        const existsResult = await client.query('SELECT 1 FROM public.tenants WHERE code = $1', [tenantCode]);
        if (existsResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Tenant code already exists' });
        }

        // 1. Create tenant record
        const insertResult = await client.query(
            'INSERT INTO public.tenants (code, name, schema_name) VALUES ($1, $2, $1) RETURNING *',
            [tenantCode, name]
        );
        const newTenant = insertResult.rows[0];

        // 2. Create schema
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenantCode}"`);

        // 3. Clone all tables from template schema 'png'
        console.log(`Cloning tables from png to ${tenantCode}...`);
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'png' 
              AND table_type = 'BASE TABLE'
              AND table_name NOT IN ('spatial_ref_sys')
        `);

        for (const r of tablesResult.rows) {
            const table = r.table_name;
            await client.query(`CREATE TABLE "${tenantCode}"."${table}" (LIKE png."${table}" INCLUDING ALL)`);
        }

        // 4. Update sequence column defaults pointing to 'png'
        const seqResult = await client.query(`
            SELECT table_name, column_name, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'png' 
              AND column_default LIKE 'nextval%'
        `);

        for (const r of seqResult.rows) {
            const table = r.table_name;
            const column = r.column_name;
            const def = r.column_default;
            
            // Extract original sequence name (e.g. regions_region_id_seq)
            const match = def.match(/nextval\('"?([^'"]+)"?'::regclass\)/);
            if (match) {
                const fullSeqName = match[1];
                const seqName = fullSeqName.includes('.') ? fullSeqName.split('.')[1] : fullSeqName;
                
                await client.query(`CREATE SEQUENCE IF NOT EXISTS "${tenantCode}"."${seqName}" START 1`);
                await client.query(`ALTER TABLE "${tenantCode}"."${table}" ALTER COLUMN "${column}" SET DEFAULT nextval('"${tenantCode}"."${seqName}"')`);
                await client.query(`ALTER SEQUENCE "${tenantCode}"."${seqName}" OWNED BY "${tenantCode}"."${table}"."${column}"`);
            }
        }

        // 5. Clone views from 'png'
        const viewsResult = await client.query(`
            SELECT table_name, view_definition 
            FROM information_schema.views 
            WHERE table_schema = 'png'
        `);

        for (const r of viewsResult.rows) {
            const viewName = r.table_name;
            let def = r.view_definition;
            // Replace occurrences of png schema in view definition
            def = def.replace(/png\./g, `"${tenantCode}".`);
            def = def.replace(/"png"\./g, `"${tenantCode}".`);
            await client.query(`CREATE OR REPLACE VIEW "${tenantCode}"."${viewName}" AS ${def}`);
        }

        // 6. Seed reference data
        console.log(`Seeding reference data into ${tenantCode}...`);
        const seedTables = ['roles', 'permissions', 'role_permissions', 'fault_categories', 'fault_issues', 'energy_sources'];
        for (const table of seedTables) {
            await client.query(`INSERT INTO "${tenantCode}"."${table}" SELECT * FROM png."${table}"`);
        }

        // Fix sequence values for seeded tables
        await client.query(`SELECT setval('"${tenantCode}"."roles_role_id_seq"', COALESCE((SELECT MAX(role_id) FROM "${tenantCode}"."roles"), 1))`);
        await client.query(`SELECT setval('"${tenantCode}"."permissions_permission_id_seq"', COALESCE((SELECT MAX(permission_id) FROM "${tenantCode}"."permissions"), 1))`);
        await client.query(`SELECT setval('"${tenantCode}"."fault_categories_category_id_seq"', COALESCE((SELECT MAX(category_id) FROM "${tenantCode}"."fault_categories"), 1))`);
        await client.query(`SELECT setval('"${tenantCode}"."fault_issues_issue_id_seq"', COALESCE((SELECT MAX(issue_id) FROM "${tenantCode}"."fault_issues"), 1))`);

        // 7. Seed National Admin user if email and password are provided
        if (admin_email && admin_password) {
            console.log(`Creating national admin user ${admin_email}...`);
            const hash = await bcrypt.hash(admin_password, 10);
            const roleRes = await client.query(`SELECT role_id FROM "${tenantCode}"."roles" WHERE role_name = 'Administrator' LIMIT 1`);
            const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].role_id : 1;

            await client.query(`
                INSERT INTO "${tenantCode}"."users" 
                (username, email, password_hash, role_id, is_active, first_name, last_name, is_national_access) 
                VALUES ($1, $1, $2, $3, true, 'National', 'Admin', true)
            `, [admin_email.trim(), hash, roleId]);
        }

        // 8. Insert tenant configuration details
        const mapCenterVal = map_center ? JSON.stringify(map_center) : '[-13.133897, 27.849332]';
        const mapZoomVal = map_zoom ? parseInt(map_zoom) : 6;
        const hierarchyVal = hierarchy ? JSON.stringify(hierarchy) : '[{"id": "province", "name": "Province", "color": "#be123c"}, {"id": "district", "name": "District", "color": "#0369a1"}]';
        const emblemUrl = `/default_emblem.png`;

        await client.query(`
            INSERT INTO public.tenant_config 
            (tenant_code, name, emblem, map_center, map_zoom, contact_email, hierarchy, currency_code, currency_symbol, date_format, time_zone, phone_prefix, language)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (tenant_code) DO NOTHING
        `, [
            tenantCode,
            name,
            emblemUrl,
            mapCenterVal,
            mapZoomVal,
            admin_email || 'support@ccets.gov',
            hierarchyVal,
            currency_code || 'USD',
            currency_symbol || '$',
            'DD/MM/YYYY',
            time_zone || 'UTC',
            phone_prefix || '+1',
            'en'
        ]);

        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            message: 'Tenant and schema created and provisioned successfully.',
            tenant: newTenant
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tenant:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
    } finally {
        client.release();
    }
};

exports.updateTenant = async (req, res) => {
    const { code } = req.params;
    const { 
        name, 
        is_active, 
        currency_code, 
        currency_symbol, 
        time_zone, 
        phone_prefix, 
        contact_email, 
        emblem, 
        map_center, 
        map_zoom 
    } = req.body;

    const tenantCode = String(code || '').toLowerCase().trim();
    if (!tenantCode) {
        return res.status(400).json({ success: false, message: 'Country code is required' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check if tenant exists
        const checkRes = await client.query('SELECT * FROM public.tenants WHERE code = $1', [tenantCode]);
        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: `Country "${tenantCode}" not found` });
        }

        // 1. Update public.tenants
        if (name !== undefined || is_active !== undefined) {
            await client.query(
                `UPDATE public.tenants 
                 SET name = COALESCE($1, name), 
                     is_active = COALESCE($2, is_active) 
                 WHERE code = $3`,
                [name || null, typeof is_active === 'boolean' ? is_active : null, tenantCode]
            );
        }

        // 2. Upsert public.tenant_config
        const mapCenterStr = map_center ? (typeof map_center === 'string' ? map_center : JSON.stringify(map_center)) : null;
        const mapZoomNum = map_zoom !== undefined ? parseInt(map_zoom, 10) : null;

        await client.query(`
            INSERT INTO public.tenant_config 
            (tenant_code, name, emblem, map_center, map_zoom, contact_email, currency_code, currency_symbol, time_zone, phone_prefix)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (tenant_code) DO UPDATE SET
                name = COALESCE(EXCLUDED.name, public.tenant_config.name),
                emblem = COALESCE(EXCLUDED.emblem, public.tenant_config.emblem),
                map_center = COALESCE(EXCLUDED.map_center, public.tenant_config.map_center),
                map_zoom = COALESCE(EXCLUDED.map_zoom, public.tenant_config.map_zoom),
                contact_email = COALESCE(EXCLUDED.contact_email, public.tenant_config.contact_email),
                currency_code = COALESCE(EXCLUDED.currency_code, public.tenant_config.currency_code),
                currency_symbol = COALESCE(EXCLUDED.currency_symbol, public.tenant_config.currency_symbol),
                time_zone = COALESCE(EXCLUDED.time_zone, public.tenant_config.time_zone),
                phone_prefix = COALESCE(EXCLUDED.phone_prefix, public.tenant_config.phone_prefix)
        `, [
            tenantCode,
            name || null,
            emblem || null,
            mapCenterStr,
            mapZoomNum,
            contact_email || null,
            currency_code || null,
            currency_symbol || null,
            time_zone || null,
            phone_prefix || null
        ]);

        await client.query('COMMIT');

        const updatedRes = await db.pool.query(`
            SELECT t.id, t.code, t.name, t.schema_name, t.is_active,
                   COALESCE(tc.emblem, CASE WHEN t.code = 'png' THEN '/png_emblem.png' WHEN t.code = 'zambia' THEN '/zambia_emblem.png' ELSE '/default_emblem.png' END) as emblem,
                   tc.currency_code, tc.currency_symbol, tc.time_zone, tc.phone_prefix, tc.contact_email, tc.map_center, tc.map_zoom
            FROM public.tenants t
            LEFT JOIN public.tenant_config tc ON t.code = tc.tenant_code
            WHERE t.code = $1
        `, [tenantCode]);

        res.json({
            success: true,
            message: `Country ${name || tenantCode.toUpperCase()} configuration updated successfully`,
            tenant: updatedRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating tenant:', err);
        res.status(500).json({ success: false, message: `Failed to update country: ${err.message}` });
    } finally {
        client.release();
    }
};
