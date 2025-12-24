const db = require('../db');

// Get all fault categories with their issues
const getFaultCategoriesWithIssues = async (req, res) => {
    try {
        const query = `
            SELECT 
                fc.category_id,
                fc.category_code,
                fc.category_name,
                fc.description,
                fc.display_order,
                json_agg(
                    json_build_object(
                        'issue_id', fi.issue_id,
                        'issue_name', fi.issue_name,
                        'issue_code', fi.issue_code,
                        'display_order', fi.display_order
                    ) ORDER BY fi.display_order
                ) as issues
            FROM fault_categories fc
            LEFT JOIN fault_issues fi ON fc.category_id = fi.category_id
            GROUP BY fc.category_id, fc.category_code, fc.category_name, fc.description, fc.display_order
            ORDER BY fc.display_order
        `;

        const result = await db.query(query);
        res.json({
            success: true,
            categories: result.rows
        });
    } catch (error) {
        console.error('Error fetching fault categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fault categories',
            error: error.message
        });
    }
};

// Get equipment functional status options
const getFunctionalStatusOptions = async (req, res) => {
    try {
        const query = `
            SELECT enumlabel as status
            FROM pg_enum
            WHERE enumtypid = 'equipment_functional_status'::regtype
            ORDER BY enumsortorder
        `;

        const result = await db.query(query);
        res.json({
            success: true,
            statuses: result.rows.map(row => row.status)
        });
    } catch (error) {
        console.error('Error fetching functional status options:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch functional status options',
            error: error.message
        });
    }
};

// Save fault issues for a ticket when resolving
const saveTicketFaultIssues = async (req, res) => {
    const { ticketId, issueIds, functionalStatus, resolutionNotes } = req.body;

    if (!ticketId) {
        return res.status(400).json({ message: 'Ticket ID is required' });
    }

    try {
        // Start transaction
        await db.query('BEGIN');

        // Update ticket with functional status and resolution notes
        await db.query(`
            UPDATE tickets 
            SET equipment_functional_status = $1,
                resolution_notes = $2
            WHERE ticket_id = $3
        `, [functionalStatus, resolutionNotes, ticketId]);

        // Delete existing fault issues for this ticket
        await db.query('DELETE FROM ticket_fault_issues WHERE ticket_id = $1', [ticketId]);

        // Insert new fault issues
        if (issueIds && issueIds.length > 0) {
            const values = issueIds.map((issueId, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            const query = `
                INSERT INTO ticket_fault_issues (ticket_id, issue_id)
                VALUES ${values}
            `;

            await db.query(query, [ticketId, ...issueIds]);
        }

        await db.query('COMMIT');

        res.json({
            success: true,
            message: 'Fault issues saved successfully'
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error saving ticket fault issues:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save fault issues',
            error: error.message
        });
    }
};

// Get fault issues for a specific ticket
const getTicketFaultIssues = async (req, res) => {
    const { ticketId } = req.params;

    try {
        const query = `
            SELECT 
                fi.issue_id,
                fi.issue_code,
                fi.issue_name,
                fc.category_name,
                fc.category_code
            FROM ticket_fault_issues tfi
            INNER JOIN fault_issues fi ON tfi.issue_id = fi.issue_id
            INNER JOIN fault_categories fc ON fi.category_id = fc.category_id
            WHERE tfi.ticket_id = $1
            ORDER BY fc.display_order, fi.display_order
        `;

        const result = await db.query(query, [ticketId]);

        res.json({
            success: true,
            issues: result.rows
        });
    } catch (error) {
        console.error('Error fetching ticket fault issues:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket fault issues',
            error: error.message
        });
    }
};

module.exports = {
    getFaultCategoriesWithIssues,
    getFunctionalStatusOptions,
    saveTicketFaultIssues,
    getTicketFaultIssues
};
