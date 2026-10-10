const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/context', async (req, res) => {
    try {
        const deploymentMode = process.env.CCETS_DEPLOYMENT_MODE || 'global_multi_tenant';
        const instanceName = process.env.CCETS_INSTANCE_NAME || 'CCETS Global cold chain';
        const defaultTenant = process.env.CCETS_DEFAULT_TENANT || 'png';
        
        const host = req.headers.host || req.hostname;
        const domain = host.split(':')[0].toLowerCase();
        
        let resolvedTenant = null;
        let redirectUrl = null;

        // Check if there is a domain mapping for the incoming hostname.
        // Local development must stay selectable from the tenant picker; otherwise a
        // localhost domain row can pin every login attempt to one country.
        const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(domain);
        const domainQuery = isLocalhost ? { rows: [] } : await db.pool.query(
            `SELECT d.is_primary, d.is_active, t.code, t.name, t.schema_name 
             FROM public.instance_domains d
             JOIN public.tenants t ON d.tenant_id = t.id
             WHERE d.domain_name = $1 AND d.is_active = true AND t.is_active = true`,
            [domain]
        );

        if (domainQuery.rows.length > 0) {
            const match = domainQuery.rows[0];
            if (!match.is_primary) {
                // Find primary domain to redirect the user
                const primaryQuery = await db.pool.query(
                    `SELECT domain_name FROM public.instance_domains 
                     WHERE tenant_id = (SELECT id FROM public.tenants WHERE code = $1)
                       AND is_primary = true AND is_active = true`,
                    [match.code]
                );
                if (primaryQuery.rows.length > 0) {
                    const protocol = req.secure ? 'https' : 'http';
                    const port = host.split(':')[1];
                    redirectUrl = `${protocol}://${primaryQuery.rows[0].domain_name}`;
                    if (port) {
                        redirectUrl += `:${port}`;
                    }
                }
            } else {
                resolvedTenant = {
                    code: match.code,
                    name: match.name,
                    schema_name: match.schema_name
                };
            }
        }

        // Fetch tenants from public.tenants table joined with tenant_config
        const result = await db.pool.query(`
            SELECT 
                t.id, t.code, t.name, t.schema_name, t.is_active,
                COALESCE(tc.emblem, CASE WHEN t.code = 'png' THEN '/png_emblem.png' WHEN t.code = 'zambia' THEN '/zambia_emblem.png' ELSE '/default_emblem.png' END) as emblem,
                tc.currency_code, tc.currency_symbol, tc.time_zone, tc.phone_prefix, tc.contact_email, tc.map_center, tc.map_zoom
            FROM public.tenants t
            LEFT JOIN public.tenant_config tc ON t.code = tc.tenant_code
            ORDER BY t.name
        `);

        res.json({
            success: true,
            deploymentMode,
            instanceName,
            defaultTenant,
            resolvedTenant,
            redirectUrl,
            tenants: result.rows
        });
    } catch (error) {
        console.error('Error fetching platform context:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch platform context',
            error: error.message
        });
    }
});

// List all tenants with config
router.get('/tenants', async (req, res) => {
    try {
        const result = await db.pool.query(`
            SELECT 
                t.id, t.code, t.name, t.schema_name, t.is_active, t.created_at,
                COALESCE(tc.emblem, CASE WHEN t.code = 'png' THEN '/png_emblem.png' WHEN t.code = 'zambia' THEN '/zambia_emblem.png' ELSE '/default_emblem.png' END) as emblem,
                tc.currency_code, tc.currency_symbol, tc.time_zone, tc.phone_prefix, tc.contact_email, tc.map_center, tc.map_zoom
            FROM public.tenants t
            LEFT JOIN public.tenant_config tc ON t.code = tc.tenant_code
            ORDER BY t.name
        `);
        res.json({ success: true, tenants: result.rows });
    } catch (err) {
        console.error('Error fetching tenants list:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch tenants', error: err.message });
    }
});

// Onboard new country / tenant
const adminController = require('../controllers/admin.controller');
router.post('/tenants', adminController.createTenant);

// Update existing country / tenant
router.put('/tenants/:code', async (req, res) => {
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
});

const fs = require('fs');
const path = require('path');

// 1. Check readiness
router.get('/promote/check/:tenantCode', async (req, res) => {
    try {
        const { tenantCode } = req.params;
        
        // Resolve tenant
        const tenantQuery = await db.pool.query(
            'SELECT * FROM public.tenants WHERE code = $1 AND is_active = true',
            [tenantCode.toLowerCase()]
        );
        if (tenantQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Active tenant not found' });
        }
        
        const tenant = tenantQuery.rows[0];
        const schema = tenant.schema_name;

        // Perform counts inside the tenant's schema using db.pool
        const usersCount = parseInt((await db.pool.query(`SELECT COUNT(*) FROM "${schema}".users WHERE is_active = true`)).rows[0].count);
        const facilitiesCount = parseInt((await db.pool.query(`SELECT COUNT(*) FROM "${schema}".facilities`)).rows[0].count);
        const equipmentCount = parseInt((await db.pool.query(`SELECT COUNT(*) FROM "${schema}".equipment WHERE is_del = false`)).rows[0].count);
        const ticketsCount = parseInt((await db.pool.query(`SELECT COUNT(*) FROM "${schema}".tickets WHERE is_deleted = false OR is_deleted IS NULL`)).rows[0].count);
        const groupsCount = parseInt((await db.pool.query(`SELECT COUNT(*) FROM "${schema}".user_groups`)).rows[0].count);

        // Check boundary status
        const boundaryFile = path.join(__dirname, '..', 'data', `${tenantCode.toLowerCase()}_admin_boundaries.geojson`);
        const hasBoundaries = fs.existsSync(boundaryFile);

        const checklist = {
            usersCount,
            facilitiesCount,
            equipmentCount,
            ticketsCount,
            groupsCount,
            boundariesStatus: hasBoundaries ? 'Available' : 'Missing (using default)',
            schemaStatus: 'Valid Schema Isolated',
            isReady: usersCount > 0 && facilitiesCount > 0
        };

        res.json({
            success: true,
            tenantName: tenant.name,
            tenantCode: tenant.code,
            checklist
        });

    } catch (error) {
        console.error('Error checking promote readiness:', error);
        res.status(500).json({ success: false, message: 'Readiness check failed', error: error.message });
    }
});

// 2. Export Standalone Package
router.post('/promote/export/:tenantCode', async (req, res) => {
    try {
        const { tenantCode } = req.params;
        
        const tenantQuery = await db.pool.query(
            'SELECT * FROM public.tenants WHERE code = $1 AND is_active = true',
            [tenantCode.toLowerCase()]
        );
        if (tenantQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Active tenant not found' });
        }
        
        const tenant = tenantQuery.rows[0];
        const schema = tenant.schema_name;

        // Insert initial promotion tracker entry
        const promoResult = await db.pool.query(`
            INSERT INTO public.standalone_promotions (tenant_code, status, checklist)
            VALUES ($1, 'exporting', $2)
            RETURNING id
        `, [tenantCode, JSON.stringify({ started: true })]);

        const promotionId = promoResult.rows[0].id;

        // Fetch config details
        const configQuery = await db.pool.query(
            'SELECT * FROM public.tenant_config WHERE tenant_code = $1',
            [tenantCode.toLowerCase()]
        );
        const config = configQuery.rows[0] || null;

        // Fetch all operational data from the tenant schema
        const users = (await db.pool.query(`SELECT * FROM "${schema}".users`)).rows;
        const roles = (await db.pool.query(`SELECT * FROM "${schema}".roles`)).rows;
        const groups = (await db.pool.query(`SELECT * FROM "${schema}".user_groups`)).rows;
        const facilities = (await db.pool.query(`SELECT * FROM "${schema}".facilities`)).rows;
        const equipment = (await db.pool.query(`SELECT * FROM "${schema}".equipment`)).rows;
        const tickets = (await db.pool.query(`SELECT * FROM "${schema}".tickets`)).rows;
        const repairs = (await db.pool.query(`SELECT * FROM "${schema}".repairs`)).rows;
        const auditLogs = (await db.pool.query(`SELECT * FROM "${schema}".audit_trail`)).rows;

        // Build package
        const standalonePackage = {
            manifest: {
                tenantCode,
                tenantName: tenant.name,
                exportedAt: new Date().toISOString(),
                version: '1.0.0',
                schemaEngine: 'CCETS Standalone v1',
            },
            configuration: config,
            domainMappings: [
                { domain_name: `${tenantCode.toLowerCase()}.localhost`, is_primary: true }
            ],
            data: {
                users,
                roles,
                groups,
                facilities,
                equipment,
                tickets,
                repairs,
                auditLogs
            }
        };

        // Create export directory
        const exportDir = path.join(__dirname, '..', 'data', 'exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const filename = `CCETS_Standalone_Export_${tenantCode}_${Date.now()}.json`;
        const filePath = path.join(exportDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(standalonePackage, null, 2), 'utf8');

        const downloadUrl = `/api/platform/promote/download/${filename}`;

        // Complete promotion record
        await db.pool.query(`
            UPDATE public.standalone_promotions
            SET status = 'completed', 
                export_path = $1, 
                download_url = $2,
                checklist = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `, [
            filePath, 
            downloadUrl, 
            JSON.stringify({
                usersCount: users.length,
                facilitiesCount: facilities.length,
                equipmentCount: equipment.length,
                ticketsCount: tickets.length,
                completed: true
            }),
            promotionId
        ]);

        res.json({
            success: true,
            message: 'Standalone promotion package created successfully.',
            promotionId,
            downloadUrl
        });

    } catch (error) {
        console.error('Error during promotion export:', error);
        res.status(500).json({ success: false, message: 'Promotion export failed', error: error.message });
    }
});

// 3. Download standalone package
router.get('/promote/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '..', 'data', 'exports', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Export file not found' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Error downloading promotion package:', error);
        res.status(500).json({ success: false, message: 'Download failed', error: error.message });
    }
});

// 4. View history
router.get('/promote/history', async (req, res) => {
    try {
        const result = await db.pool.query(
            'SELECT * FROM public.standalone_promotions ORDER BY created_at DESC'
        );
        res.json({ success: true, history: result.rows });
    } catch (error) {
        console.error('Error fetching promotion history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history', error: error.message });
    }
});

module.exports = router;
