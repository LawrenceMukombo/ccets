const db = require('../db');
const tenantStore = require('./tenantStore');

const resolveTenant = async (req, res, next) => {
    const tenantCode = req.params.tenantCode;

    if (!tenantCode) {
        return res.status(400).json({ message: 'Tenant code is required in the URL' });
    }

    try {
        // Look up the tenant
        // We use a direct pool query to avoid using the `query` wrapper which uses tenantStore
        const { rows } = await db.pool.query(
            'SELECT * FROM public.tenants WHERE code = $1 AND is_active = true',
            [tenantCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: `Tenant '${tenantCode}' not found or inactive` });
        }

        const tenant = rows[0];

        // Store tenant on the request for easier access (e.g. in auth middleware)
        req.tenant = tenant;

        // Wrap the rest of the request in the tenant store context
        tenantStore.run(tenant, () => {
            next();
        });
    } catch (err) {
        console.error('Error resolving tenant:', err);
        res.status(500).json({ message: 'Internal Server Error while resolving tenant' });
    }
};

module.exports = resolveTenant;
