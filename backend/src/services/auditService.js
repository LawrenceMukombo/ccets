const db = require('../db');

/**
 * Validates uuid only if the column type requires it.
 * Assuming entity_id in audit_trail is VARCHAR or TEXT based on usage,
 * but if it's UUID/INTEGER, specific validation is needed.
 * Based on auditController.js, it inserts it directly.
 */

const logAudit = async (userId, action, entityType, entityId, details, req = null) => {
    try {
        const ip = req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress || req?.socket?.remoteAddress || null;
        const userAgent = req?.headers['user-agent'] || null;

        // Ensure details is a string if it's an object
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

        await db.query(`
            INSERT INTO audit_trail (
                user_id, 
                action, 
                entity_type, 
                entity_id, 
                details, 
                ip_address, 
                user_agent,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
            userId,
            action,
            entityType,
            entityId ? String(entityId) : null,
            detailsStr,
            ip,
            userAgent
        ]);

        console.log(`[AUDIT] ${action} on ${entityType} ${entityId} by User ${userId}`);
    } catch (error) {
        console.error('Error creating audit log:', error.message);
        // Fail silently to not block main flow
    }
};

module.exports = {
    logAudit
};
