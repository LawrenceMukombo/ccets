const db = require('../db');
const { logAudit } = require('../services/auditService');

// Get all audit logs with filtering
const getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit || req.query.pageSize) || 25));
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        const action = req.query.action || req.query.action_filter;
        if (action && action !== 'all') {
            whereClause += ` AND al.action = $${paramIndex}`;
            queryParams.push(action);
            paramIndex++;
        }

        const userId = req.query.user_id || req.query.user;
        if (userId && userId !== 'all') {
            whereClause += ` AND al.user_id = $${paramIndex}`;
            queryParams.push(parseInt(userId));
            paramIndex++;
        }

        const entityType = req.query.entity_type || req.query.entity;
        if (entityType && entityType !== 'all') {
            whereClause += ` AND al.table_name = $${paramIndex}`;
            queryParams.push(entityType);
            paramIndex++;
        }

        // search filter
        if (req.query.search) {
            whereClause += ` AND (al.action ILIKE $${paramIndex} OR al.table_name ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
            queryParams.push(`%${req.query.search}%`);
            paramIndex++;
        }

        // Count Total Records
        const countQuery = `
            SELECT COUNT(*) 
            FROM audit_trail al
            LEFT JOIN users u ON al.user_id = u.user_id
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        // Sorting
        const sortByAllowlist = {
            created_at: 'al.timestamp',
            action: 'al.action',
            entity_type: 'al.table_name',
            user_name: 'user_name'
        };
        const sortBy = sortByAllowlist[req.query.sortBy] || 'al.timestamp';
        const sortDirection = req.query.sortDirection === 'asc' ? 'ASC' : 'DESC';

        const dataQuery = `
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
            ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataParams = [...queryParams, limit, offset];
        const result = await db.query(dataQuery, dataParams);

        res.json({
            success: true,
            logs: result.rows,
            count: result.rows.length,
            data: result.rows,
            pagination: {
                page,
                pageSize: limit,
                totalRecords,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
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
