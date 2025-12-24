const db = require('../db');
const { logAudit } = require('../services/auditService');

// Get all audit logs with filtering
const getAuditLogs = async (req, res) => {
    try {
        const { action, user_id, entity_type, limit = 100 } = req.query;

        let query = `
            SELECT 
                al.id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
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
            query += ` AND al.entity_type = $${paramCount}`;
            params.push(entity_type);
            paramCount++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
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
                al.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                al.action,
                al.entity_type,
                al.entity_id,
                al.ip_address,
                al.details
            FROM audit_trail al
            LEFT JOIN users u ON al.user_id = u.user_id
            ORDER BY al.created_at DESC
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
