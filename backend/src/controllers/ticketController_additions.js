
// ============================================================================
// NEW METHODS FOR TECHNICIAN WORKSPACE
// ============================================================================

// Get tickets assigned to the logged-in technician
exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const result = await db.query(`
            SELECT 
                t.ticket_id,
                t.ticket_reference_number,
                t.facility_id,
                f.facility_name,
                COALESCE(r_ticket.region_name, r_facility.region_name, t.region_name) as region_name,
                COALESCE(p_ticket.province_name, p_facility.province_name, t.province_name) as province_name,
                COALESCE(d_ticket.district_name, d_facility.district_name, t.district_name) as district_name,
                t.fault_description as description,
                t.equipment_manufacturer,
                t.priority,
                t.ticket_status as status,
                t.created_at,
                t.work_started_at,
                t.work_paused_at,
                t.work_duration_seconds,
                t.assigned_to,
                COALESCE(t.assigned_to_name, CONCAT(u.first_name, ' ', u.last_name)) as assigned_to_name
            FROM tickets t
            LEFT JOIN facilities f ON t.facility_id = f.facility_id
            LEFT JOIN regions r_ticket ON t.region_id = r_ticket.region_id
            LEFT JOIN provinces p_ticket ON t.province_id = p_ticket.province_id
            LEFT JOIN districts d_ticket ON t.district_id = d_ticket.district_id
            LEFT JOIN provinces p_facility ON f.province_id = p_facility.province_id
            LEFT JOIN regions r_facility ON p_facility.region_id = r_facility.region_id
            LEFT JOIN districts d_facility ON f.district_id = d_facility.district_id
            LEFT JOIN users u ON t.assigned_to = u.user_id
            WHERE t.assigned_to = $1 
            AND (t.is_deleted = false OR t.is_deleted IS NULL)
            ORDER BY 
                CASE t.ticket_status 
                    WHEN 'In Progress' THEN 1
                    WHEN 'Assigned' THEN 2
                    WHEN 'Resolved' THEN 3
                    ELSE 4
                END,
                t.created_at DESC
        `, [userId]);

        res.json({ tickets: result.rows });
    } catch (error) {
        console.error('Error fetching my tickets:', error);
        res.status(500).json({ message: 'Server error fetching tickets', error: error.message });
    }
};

// Assign ticket to a technician
exports.assignTicket = async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (!assigned_to) {
        return res.status(400).json({ message: 'assigned_to is required' });
    }

    try {
        // Get technician details
        const userResult = await db.query(
            'SELECT user_id, first_name, last_name, email FROM users WHERE user_id = $1',
            [assigned_to]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        const technician = userResult.rows[0];
        const fullName = `${technician.first_name} ${technician.last_name}`;

        // Update ticket
        const result = await db.query(`
            UPDATE tickets 
            SET assigned_to = $1,
                assigned_to_name = $2,
                assigned_to_email = $3,
                ticket_status = CASE 
                    WHEN ticket_status = 'New' THEN 'Assigned'
                    ELSE ticket_status
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $4
            RETURNING *
        `, [assigned_to, fullName, technician.email, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // TODO: Send notification to technician (implement notification service)

        res.json({
            message: 'Ticket assigned successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ message: 'Server error assigning ticket', error: error.message });
    }
};

// Start work on a ticket
exports.startWork = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(`
            UPDATE tickets 
            SET ticket_status = 'In Progress',
                work_started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.json({
            message: 'Work started successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error starting work:', error);
        res.status(500).json({ message: 'Server error starting work', error: error.message });
    }
};

// Pause work on a ticket
exports.pauseWork = async (req, res) => {
    const { id } = req.params;

    try {
        // Calculate duration if work was started
        const result = await db.query(`
            UPDATE tickets 
            SET work_paused_at = CURRENT_TIMESTAMP,
                work_duration_seconds = COALESCE(work_duration_seconds, 0) + 
                    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(work_started_at, CURRENT_TIMESTAMP)))::INTEGER,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.json({
            message: 'Work paused successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error pausing work:', error);
        res.status(500).json({ message: 'Server error pausing work', error: error.message });
    }
};

// Request spare parts for a ticket
exports.requestSpareParts = async (req, res) => {
    const { id } = req.params;
    const { parts, notes } = req.body;
    const userId = req.user?.user_id || req.user?.userId;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ message: 'Parts list is required' });
    }

    try {
        const result = await db.query(`
            INSERT INTO spare_parts_requests (
                ticket_id,
                requested_by,
                parts_list,
                notes,
                status
            ) VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING *
        `, [id, userId, JSON.stringify(parts), notes || null]);

        // TODO: Send notification to supervisor/parts manager

        res.status(201).json({
            message: 'Spare parts request submitted successfully',
            request: result.rows[0]
        });
    } catch (error) {
        console.error('Error requesting spare parts:', error);
        res.status(500).json({ message: 'Server error requesting spare parts', error: error.message });
    }
};

// Escalate a ticket
exports.escalateTicket = async (req, res) => {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user?.user_id || req.user?.userId;

    if (!reason || !description) {
        return res.status(400).json({ message: 'Reason and description are required' });
    }

    try {
        // Create escalation record
        const result = await db.query(`
            INSERT INTO ticket_escalations (
                ticket_id,
                escalated_by,
                reason,
                description,
                status
            ) VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING *
        `, [id, userId, reason, description]);

        // Update ticket status if needed
        await db.query(`
            UPDATE tickets 
            SET ticket_status = 'Escalated',
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $1
        `, [id]);

        // TODO: Send notification to supervisor

        res.status(201).json({
            message: 'Ticket escalated successfully',
            escalation: result.rows[0]
        });
    } catch (error) {
        console.error('Error escalating ticket:', error);
        res.status(500).json({ message: 'Server error escalating ticket', error: error.message });
    }
};

// Resolve a ticket
exports.resolveTicket = async (req, res) => {
    const { id } = req.params;
    const { resolution_notes, work_performed, close_ticket } = req.body;

    if (!resolution_notes || !work_performed) {
        return res.status(400).json({ message: 'Resolution notes and work performed are required' });
    }

    try {
        const newStatus = close_ticket ? 'Closed' : 'Resolved';

        const result = await db.query(`
            UPDATE tickets 
            SET ticket_status = $1,
                resolution_notes = $2,
                work_performed = $3,
                date_resolved = CURRENT_TIMESTAMP,
                closed_at = CASE WHEN $1 = 'Closed' THEN CURRENT_TIMESTAMP ELSE NULL END,
                work_duration_seconds = COALESCE(work_duration_seconds, 0) + 
                    CASE 
                        WHEN work_started_at IS NOT NULL AND work_paused_at IS NULL 
                        THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - work_started_at))::INTEGER
                        ELSE 0
                    END,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $4
            RETURNING *
        `, [newStatus, resolution_notes, work_performed, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // TODO: Send notification to requester and supervisor

        res.json({
            message: `Ticket ${newStatus.toLowerCase()} successfully`,
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error resolving ticket:', error);
        res.status(500).json({ message: 'Server error resolving ticket', error: error.message });
    }
};

// Delete a ticket
exports.deleteTicket = async (req, res) => {
    const { id } = req.params;

    try {
        // Soft delete by setting is_deleted flag
        const result = await db.query(`
            UPDATE tickets 
            SET is_deleted = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $1
            RETURNING ticket_id, ticket_reference_number
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Alternatively, for hard delete:
        // await db.query('DELETE FROM tickets WHERE ticket_id = $1', [id]);

        res.json({
            message: 'Ticket deleted successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ message: 'Server error deleting ticket', error: error.message });
    }
};
