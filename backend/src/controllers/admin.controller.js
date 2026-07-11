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
        const tenantsResult = await db.pool.query(
            'SELECT id, code, name, schema_name, is_active, created_at FROM public.tenants ORDER BY id'
        );
        res.json(tenantsResult.rows);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.createTenant = async (req, res) => {
    const { code, name } = req.body;

    if (!code || !name) {
        return res.status(400).json({ message: 'Tenant code and name are required' });
    }

    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Ensure tenant doesn't already exist
        const existsResult = await client.query('SELECT 1 FROM public.tenants WHERE code = $1', [code]);
        if (existsResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Tenant code already exists' });
        }

        // 1. Create tenant record
        const insertResult = await client.query(
            'INSERT INTO public.tenants (code, name, schema_name) VALUES ($1, $2, $1) RETURNING *',
            [code, name]
        );
        const newTenant = insertResult.rows[0];

        // 2. Provision schema
        // In a real production system, this would run pg_dump --schema-only on the template schema (png)
        // and apply it to the new schema. For simplicity in this controller, we just create the schema.
        // A dedicated provisioning job would normally handle the DB clone.
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${code}"`);
        
        await client.query('COMMIT');
        
        res.status(201).json({
            message: 'Tenant created successfully. Note: Schema is empty and requires provisioning script to run.',
            tenant: newTenant
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tenant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        client.release();
    }
};
