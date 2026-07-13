const db = require('../db');

const logAudit = async (userId, action, entityType, entityId, details, req = null) => {
    try {
        // Ensure details is a string if it's an object
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

        // Parse record_id to integer safely
        const recordId = entityId && !isNaN(parseInt(entityId)) ? parseInt(entityId) : null;

        // Map details structure to old_value and new_value
        let oldValue = null;
        let newValue = detailsStr;

        if (typeof details === 'object' && details !== null) {
            oldValue = details.previous !== undefined ? (typeof details.previous === 'object' ? JSON.stringify(details.previous) : String(details.previous)) : null;
            newValue = details.changes !== undefined ? (typeof details.changes === 'object' ? JSON.stringify(details.changes) : String(details.changes)) : detailsStr;
        }

        await db.query(`
            INSERT INTO audit_trail (
                user_id, 
                action, 
                table_name, 
                record_id, 
                old_value, 
                new_value
            )
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            userId,
            action,
            entityType,
            recordId,
            oldValue,
            newValue
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
