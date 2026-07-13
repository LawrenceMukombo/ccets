const db = require('../db');
const { logAudit } = require('../services/auditService');
const crypto = require('crypto');

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

        // Query current configuration before updating to store in audit trail previous values
        const currentConfigRes = await db.query(
            'SELECT * FROM tenant_config WHERE tenant_code = $1',
            [tenant_code.toLowerCase()]
        );
        const currentConfig = currentConfigRes.rows[0] || null;

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

        // Log to audit trail with full previous configuration object
        await logAudit(
            req.user.userId || req.user.user_id,
            'Updated',
            'System Settings',
            tenant_code,
            { 
                previous: currentConfig,
                changes: result.rows[0]
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

// Get hierarchy impact (Admin only)
const getHierarchyImpact = async (req, res) => {
    try {
        const { levelId } = req.params;
        const colName = `${levelId.toLowerCase()}_id`;

        // Check if the column exists in information_schema to prevent SQL injection/errors
        const colCheck = await db.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'facilities' AND column_name = $1`,
            [colName]
        );

        if (colCheck.rows.length === 0) {
            return res.json({
                success: true,
                impact: { facilities: 0, tickets: 0 }
            });
        }

        // Count facilities at this level
        const facilityRes = await db.query(
            `SELECT COUNT(*)::int as count FROM facilities WHERE ${colName} IS NOT NULL AND is_deleted = false`
        );

        // Count tickets at this level
        const ticketRes = await db.query(
            `SELECT COUNT(*)::int as count FROM tickets WHERE ${colName} IS NOT NULL AND is_deleted = false`
        );

        res.json({
            success: true,
            impact: {
                facilities: facilityRes.rows[0].count,
                tickets: ticketRes.rows[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching hierarchy impact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hierarchy impact'
        });
    }
};

// Get system settings configuration audit history (Admin only)
const getSettingsHistory = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                al.audit_id AS id,
                al.action,
                al.old_value,
                al.new_value,
                al.timestamp,
                u.email as user_email,
                u.username as user_name
             FROM audit_trail al
             LEFT JOIN users u ON al.user_id = u.user_id
             WHERE al.table_name = 'System Settings'
             ORDER BY al.timestamp DESC
             LIMIT 50`
        );

        res.json({
            success: true,
            history: result.rows
        });
    } catch (error) {
        console.error('Error fetching settings history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings history'
        });
    }
};

// Reset system settings config to previous state (Admin only)
const resetTenantConfig = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { tenantCode } = req.params;
        const { auditId } = req.body;

        const tenant = require('../middleware/tenantStore').getStore();
        const schema = tenant && tenant.schema_name ? tenant.schema_name : 'public';
        await client.query(`SET search_path TO "${schema}", public`);

        await client.query('BEGIN');

        // Find the system settings audit log that has a valid config object in old_value
        let query = `SELECT old_value FROM audit_trail WHERE table_name = 'System Settings' AND old_value LIKE '{%'`;
        const params = [];

        if (auditId) {
            query += ` AND audit_id = $1`;
            params.push(auditId);
        }

        query += ` ORDER BY timestamp DESC LIMIT 1`;
        const lastAuditRes = await client.query(query, params);

        if (lastAuditRes.rows.length === 0) {
            await client.query('COMMIT');
            return res.status(404).json({
                success: false,
                message: 'No previous configuration version found to revert to.'
            });
        }

        const previousConfig = JSON.parse(lastAuditRes.rows[0].old_value);

        const result = await client.query(`
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
            previousConfig.name,
            previousConfig.emblem,
            typeof previousConfig.map_center === 'string' ? previousConfig.map_center : JSON.stringify(previousConfig.map_center),
            previousConfig.map_zoom,
            previousConfig.contact_email,
            typeof previousConfig.hierarchy === 'string' ? previousConfig.hierarchy : JSON.stringify(previousConfig.hierarchy),
            previousConfig.currency_code,
            previousConfig.currency_symbol,
            previousConfig.date_format,
            previousConfig.time_zone,
            previousConfig.phone_prefix,
            previousConfig.language,
            tenantCode.toLowerCase()
        ]);

        // Log the revert action to the audit trail
        await logAudit(
            req.user.userId || req.user.user_id,
            'Reverted',
            'System Settings',
            tenantCode,
            { 
                previous: 'System configuration was reverted to a previous version',
                changes: result.rows[0]
            },
            req
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Configuration reverted successfully',
            config: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting tenant config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset configuration',
            error: error.message
        });
    } finally {
        client.release();
    }
};

const exportTenantConfig = async (req, res) => {
    try {
        const { tenantCode } = req.params;

        const result = await db.query(
            'SELECT * FROM tenant_config WHERE tenant_code = $1',
            [tenantCode.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        const row = result.rows[0];
        
        const configPayload = {
            name: row.name,
            emblem: row.emblem,
            map_center: typeof row.map_center === 'string' ? JSON.parse(row.map_center) : row.map_center,
            map_zoom: row.map_zoom,
            contact_email: row.contact_email,
            hierarchy: typeof row.hierarchy === 'string' ? JSON.parse(row.hierarchy) : row.hierarchy,
            currency_code: row.currency_code,
            currency_symbol: row.currency_symbol,
            date_format: row.date_format,
            time_zone: row.time_zone,
            phone_prefix: row.phone_prefix,
            language: row.language
        };

        const configString = JSON.stringify(configPayload);
        const checksum = crypto.createHash('sha256').update(configString).digest('hex');

        const exportPackage = {
            manifest: {
                schemaVersion: '1.0',
                exportedAt: new Date().toISOString(),
                tenantCode: tenantCode.toLowerCase(),
                instanceName: process.env.CCETS_INSTANCE_NAME || 'CCETS Global cold chain',
                checksum
            },
            configuration: configPayload
        };

        res.json({
            success: true,
            package: exportPackage
        });
    } catch (error) {
        console.error('Error exporting tenant configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export tenant configuration',
            error: error.message
        });
    }
};

const importTenantConfig = async (req, res) => {
    try {
        const { tenantCode } = req.params;
        const { package: importPackage } = req.body;

        if (!importPackage || !importPackage.manifest || !importPackage.configuration) {
            return res.status(400).json({
                success: false,
                message: 'Invalid configuration package structure. Missing manifest or configuration.'
            });
        }

        const { manifest, configuration } = importPackage;

        if (manifest.schemaVersion !== '1.0') {
            return res.status(400).json({
                success: false,
                message: `Unsupported package schema version: ${manifest.schemaVersion}. Only version 1.0 is supported.`
            });
        }

        // Integrity checksum validation
        const configString = JSON.stringify(configuration);
        const calculatedChecksum = crypto.createHash('sha256').update(configString).digest('hex');

        if (calculatedChecksum !== manifest.checksum) {
            return res.status(400).json({
                success: false,
                message: 'Package integrity check failed. The file appears to be corrupted or tampered with.'
            });
        }

        // Fetch current config to build comparison preview
        const currentResult = await db.query(
            'SELECT * FROM tenant_config WHERE tenant_code = $1',
            [tenantCode.toLowerCase()]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Current tenant configuration not found'
            });
        }

        const curr = currentResult.rows[0];
        const currMapCenter = typeof curr.map_center === 'string' ? JSON.parse(curr.map_center) : curr.map_center;
        const currHierarchy = typeof curr.hierarchy === 'string' ? JSON.parse(curr.hierarchy) : curr.hierarchy;

        const compareFields = (cVal, iVal) => {
            const cStr = JSON.stringify(cVal);
            const iStr = JSON.stringify(iVal);
            return {
                current: cVal,
                imported: iVal,
                changed: cStr !== iStr
            };
        };

        const preview = {
            name: compareFields(curr.name, configuration.name),
            emblem: compareFields(curr.emblem, configuration.emblem),
            contact_email: compareFields(curr.contact_email, configuration.contact_email),
            map_center: compareFields(currMapCenter, configuration.map_center),
            map_zoom: compareFields(curr.map_zoom, configuration.map_zoom),
            hierarchy: compareFields(currHierarchy, configuration.hierarchy),
            currency_code: compareFields(curr.currency_code, configuration.currency_code),
            currency_symbol: compareFields(curr.currency_symbol, configuration.currency_symbol),
            date_format: compareFields(curr.date_format, configuration.date_format),
            time_zone: compareFields(curr.time_zone, configuration.time_zone),
            phone_prefix: compareFields(curr.phone_prefix, configuration.phone_prefix),
            language: compareFields(curr.language, configuration.language)
        };

        res.json({
            success: true,
            manifest,
            preview
        });
    } catch (error) {
        console.error('Error validating import package:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate import package',
            error: error.message
        });
    }
};

const applyImportConfig = async (req, res) => {
    try {
        const { tenantCode } = req.params;
        const { package: importPackage } = req.body;

        if (!importPackage || !importPackage.manifest || !importPackage.configuration) {
            return res.status(400).json({
                success: false,
                message: 'Invalid configuration package'
            });
        }

        const { manifest, configuration } = importPackage;

        // Recalculate checksum to ensure absolute integrity
        const configString = JSON.stringify(configuration);
        const calculatedChecksum = crypto.createHash('sha256').update(configString).digest('hex');

        if (calculatedChecksum !== manifest.checksum) {
            return res.status(400).json({
                success: false,
                message: 'Package integrity check failed on apply step'
            });
        }

        // Fetch current to log as old_value
        const currentRes = await db.query(
            'SELECT * FROM tenant_config WHERE tenant_code = $1',
            [tenantCode.toLowerCase()]
        );

        if (currentRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        const currentConfig = currentRes.rows[0];

        // Apply changes
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
            configuration.name,
            configuration.emblem,
            typeof configuration.map_center === 'string' ? configuration.map_center : JSON.stringify(configuration.map_center),
            configuration.map_zoom,
            configuration.contact_email,
            typeof configuration.hierarchy === 'string' ? configuration.hierarchy : JSON.stringify(configuration.hierarchy),
            configuration.currency_code,
            configuration.currency_symbol,
            configuration.date_format,
            configuration.time_zone,
            configuration.phone_prefix,
            configuration.language,
            tenantCode.toLowerCase()
        ]);

        // Log to audit trail
        await logAudit(
            req.user.userId || req.user.user_id,
            'Updated',
            'System Settings',
            tenantCode,
            { 
                previous: currentConfig,
                changes: result.rows[0],
                import_manifest: manifest
            },
            req
        );

        res.json({
            success: true,
            message: 'Configuration imported successfully',
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error applying import package:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply import package',
            error: error.message
        });
    }
};

module.exports = {
    getTenantConfig,
    updateTenantConfig,
    getHierarchyImpact,
    getSettingsHistory,
    resetTenantConfig,
    exportTenantConfig,
    importTenantConfig,
    applyImportConfig
};
