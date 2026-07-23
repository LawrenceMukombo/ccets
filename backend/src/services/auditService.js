const db = require('../db');

const logAudit = async (userId, action, entityType, entityId, details, req = null) => {
    try {
        // Ensure details is a string if it's an object
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

        // Preserve the original entityId string for non-integer IDs (e.g. UUIDs).
        // parseInt silently converts "abc-123" to NaN which becomes null, losing the reference.
        const recordId = entityId != null
            ? (/^\d+$/.test(String(entityId)) ? parseInt(entityId, 10) : String(entityId))
            : null;

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
