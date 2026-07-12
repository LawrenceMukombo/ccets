const db = require('../db');
const { logAudit } = require('../services/auditService');

// Get all audit logs with filtering
const getAuditLogs = async (req, res) => {
    try {
        const { action, user_id, entity_type, limit = 100 } = req.query;

        let query = `
            SELECT 
                al.audit_id AS id,
                al.action,
                al.table_name AS entity_type,
                al.record_id AS entity_id,
                json_build_object('old_value', al.old_value, 'new_value', al.new_value) AS details,
                NULL::text AS ip_address,
                NULL::text AS user_agent,
                al.timestamp AS created_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') as user_name,
                u.email as user_email
            FROM audit_trail al
            LEFT JOIN users u ON al.user_id = u.user_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (action && action !== 'all') {
            query += ` AND al.action = $${paramCount}`;
            params.push(action);
            paramCount++;
        }

        if (user_id && user_id !== 'all') {
            query += ` AND al.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }

        if (entity_type && entity_type !== 'all') {
            query += ` AND al.table_name = $${paramCount}`;
            params.push(entity_type);
            paramCount++;
        }

        query += ` ORDER BY al.timestamp DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await db.query(query, params);

        res.json({
            success: true,
            logs: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};

// Export logs (formatted for CSV)
const exportAuditLogs = async (req, res) => {
    try {
        const logs = await db.query(`
            SELECT 
                al.timestamp AS created_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') as user_name,
                al.action,
                al.table_name AS entity_type,
                al.record_id AS entity_id,
                NULL::text AS ip_address,
                json_build_object('old_value', al.old_value, 'new_value', al.new_value) AS details
            FROM audit_trail al
            LEFT JOIN users u ON al.user_id = u.user_id
            ORDER BY al.timestamp DESC
            LIMIT 1000
        `);

        res.json({
            success: true,
            logs: logs.rows
        });
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export logs'
        });
    }
};

module.exports = {
    getAuditLogs,
    createAuditLog: logAudit, // Expose service function if needed elsewhere via controller, though importing service is better
    exportAuditLogs
};
