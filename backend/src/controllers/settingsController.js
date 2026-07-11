const db = require('../db');
const { logAudit } = require('../services/auditService');

// Get configuration for a specific tenant
const getTenantConfig = async (req, res) => {
    try {
        const tenantCode = req.params.tenantCode || req.tenant?.code || req.query.tenantCode || req.user?.tenant_code || 'png';
        
        const result = await db.query(
            'SELECT * FROM tenant_config WHERE tenant_code = $1',
            [tenantCode.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Configuration for tenant ${tenantCode} not found`
            });
        }

        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching tenant config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tenant configuration'
        });
    }
};

// Update configuration (Admin only)
const updateTenantConfig = async (req, res) => {
    try {
        const { 
            tenant_code, name, emblem, map_center, map_zoom, contact_email, hierarchy,
            currency_code, currency_symbol, date_format, time_zone, phone_prefix, language
        } = req.body;
        
        if (!tenant_code) {
            return res.status(400).json({ success: false, message: 'Tenant code is required' });
        }

        const result = await db.query(`
            UPDATE tenant_config 
            SET name = $1, 
                emblem = $2, 
                map_center = $3, 
                map_zoom = $4, 
                contact_email = $5, 
                hierarchy = $6,
                currency_code = $7,
                currency_symbol = $8,
                date_format = $9,
                time_zone = $10,
                phone_prefix = $11,
                language = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE tenant_code = $13
            RETURNING *
        `, [
            name,
            emblem,
            typeof map_center === 'string' ? map_center : JSON.stringify(map_center),
            map_zoom,
            contact_email,
            typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy),
            currency_code || 'PGK',
            currency_symbol || 'K',
            date_format || 'DD/MM/YYYY',
            time_zone || 'Pacific/Port_Moresby',
            phone_prefix || '+675',
            language || 'en',
            tenant_code.toLowerCase()
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Tenant ${tenant_code} not found`
            });
        }

        // Log to audit trail
        await logAudit(
            req.user.user_id,
            'Updated',
            'System Settings',
            tenant_code,
            { 
                previous: 'System configuration was updated',
                changes: req.body 
            },
            req
        );

        res.json({
            success: true,
            message: 'Configuration updated successfully',
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating tenant config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update configuration',
            error: error.message
        });
    }
};

module.exports = {
    getTenantConfig,
    updateTenantConfig
};
