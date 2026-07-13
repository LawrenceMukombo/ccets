const db = require('../db');

// Helper for logging activity
const logActivity = async (ticketId, userId, action, details) => {
    try {
        if (!userId) return;
        await db.query(`
            INSERT INTO ticket_activity_log (ticket_id, action_by, action, details, timestamp)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, [ticketId, userId, action, details]);
    } catch (error) {
        console.error('Error logging activity:', error.message);
    }
};
const { sendNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

// Get all tickets (with location-based filtering for security)
exports.getAllTickets = async (req, res) => {
    try {
        const locationScope = req.user?.locationScope;

        // Build location filter conditions
        let locationFilter = '';
        let queryParams = [];

        if (locationScope && locationScope.level !== 'national') {
            const { scopes } = locationScope;
            const conditions = [];
            let paramIndex = 1;

            // Add all assigned scopes (not just most restrictive)
            if (scopes.facilities && scopes.facilities.length > 0) {
                conditions.push(`t.facility_id = ANY($${paramIndex})`);
                queryParams.push(scopes.facilities);
                paramIndex++;
            }

            if (scopes.districts && scopes.districts.length > 0) {
                conditions.push(`f.district_id = ANY($${paramIndex})`);
                queryParams.push(scopes.districts);
                paramIndex++;
            }

            if (scopes.provinces && scopes.provinces.length > 0) {
                conditions.push(`f.province_id = ANY($${paramIndex})`);
                queryParams.push(scopes.provinces);
                paramIndex++;
            }

            if (scopes.regions && scopes.regions.length > 0) {
                conditions.push(`EXISTS (SELECT 1 FROM provinces p WHERE p.province_id = f.province_id AND p.region_id = ANY($${paramIndex}))`);
                queryParams.push(scopes.regions);
                paramIndex++;
            }

            if (conditions.length > 0) {
                locationFilter = ' AND (' + conditions.join(' OR ') + ')';
            }
        }

        // Build where clause and filters
        let whereClause = 'WHERE (t.is_deleted = false OR t.is_deleted IS NULL)';
        let paramIndex = queryParams.length + 1;

        // Add filter for equipment_id if provided in query
        if (req.query.equipment_id) {
            whereClause += ` AND t.selected_equipment_id = $${paramIndex}`;
            queryParams.push(parseInt(req.query.equipment_id));
            paramIndex++;
        }

        // search filter
        if (req.query.search) {
            whereClause += ` AND (t.ticket_reference_number ILIKE $${paramIndex} OR t.fault_description ILIKE $${paramIndex} OR f.facility_name ILIKE $${paramIndex})`;
            queryParams.push(`%${req.query.search}%`);
            paramIndex++;
        }

        // status filter
        if (req.query.status && req.query.status !== 'all') {
            whereClause += ` AND t.ticket_status = $${paramIndex}`;
            queryParams.push(req.query.status);
            paramIndex++;
        }

        // priority filter
        if (req.query.priority && req.query.priority !== 'all') {
            whereClause += ` AND t.priority = $${paramIndex}`;
            queryParams.push(req.query.priority);
            paramIndex++;
        }

        // location filters (cascading)
        if (req.query.region && req.query.region !== 'all') {
            whereClause += ` AND r_facility.region_name = $${paramIndex}`;
            queryParams.push(req.query.region);
            paramIndex++;
        }

        if (req.query.province && req.query.province !== 'all') {
            whereClause += ` AND p_facility.province_name = $${paramIndex}`;
            queryParams.push(req.query.province);
            paramIndex++;
        }

        if (req.query.district && req.query.district !== 'all') {
            whereClause += ` AND d_facility.district_name = $${paramIndex}`;
            queryParams.push(req.query.district);
            paramIndex++;
        }

        if (req.query.facility && req.query.facility !== 'all') {
            whereClause += ` AND f.facility_name = $${paramIndex}`;
            queryParams.push(req.query.facility);
            paramIndex++;
        }

        // Count Total Records
        const countQuery = `
            SELECT COUNT(*) 
            FROM tickets t
            LEFT JOIN facilities f ON t.facility_id = f.facility_id
            LEFT JOIN provinces p_facility ON f.province_id = p_facility.province_id
            LEFT JOIN districts d_facility ON f.district_id = d_facility.district_id
            LEFT JOIN regions r_facility ON p_facility.region_id = r_facility.region_id
            ${whereClause} ${locationFilter}
        `;

        const countResult = await db.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].count);

        // Sorting
        const sortByAllowlist = {
            ticket_reference_number: 't.ticket_reference_number',
            created_at: 't.created_at',
            priority: 't.priority',
            ticket_status: 't.ticket_status',
            assigned_to_name: 'assigned_to_name',
            facility_name: 'facility_name',
            region_name: 'region_name',
            province_name: 'province_name',
            district_name: 'district_name'
        };
        const sortBy = sortByAllowlist[req.query.sortBy] || 't.created_at';
        const sortDirection = req.query.sortDirection === 'asc' ? 'ASC' : 'DESC';

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100000, Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 25));
        const offset = (page - 1) * pageSize;

        const isMinimal = req.query.minimal === 'true';

        let dataQuery;
        if (isMinimal) {
            dataQuery = `
                SELECT 
                    t.ticket_id,
                    t.ticket_reference_number,
                    t.facility_id,
                    f.facility_name,
                    r_facility.region_name as region_name,
                    p_facility.province_name as province_name,
                    d_facility.district_name as district_name,
                    t.priority,
                    t.ticket_status,
                    t.created_at,
                    t.date_resolved,
                    f.latitude,
                    f.longitude,
                    t.assigned_to_name,
                    t.fault_description as description
                FROM tickets t
                LEFT JOIN facilities f ON t.facility_id = f.facility_id
                LEFT JOIN districts d_facility ON f.district_id = d_facility.district_id
                LEFT JOIN provinces p_facility ON f.province_id = p_facility.province_id
                LEFT JOIN regions r_facility ON p_facility.region_id = r_facility.region_id
                ${whereClause} ${locationFilter}
                ORDER BY ${sortBy} ${sortDirection}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
        } else {
            dataQuery = `
                SELECT 
                    t.ticket_id,
                    t.ticket_reference_number,
                    t.facility_id,
                    CASE 
                        WHEN f.facility_id IN (1, 2) THEN NULL 
                        ELSE f.facility_name 
                    END as facility_name,
                    r_facility.region_name as region_name,
                    p_facility.province_name as province_name,
                    d_facility.district_name as district_name,
                    t.fault_description,
                    t.selected_equipment_id as equipment_id,
                    COALESCE(e.manufacturer, t.equipment_manufacturer) as equipment_manufacturer,
                    e.model as equipment_model,
                    t.priority,
                    t.ticket_status,
                    t.assigned_to,
                    t.created_at,
                    COALESCE(t.assigned_to_name, CASE WHEN u.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) ELSE NULL END) as assigned_to_name,
                    COALESCE(t.assigned_to_email, u.email) as assigned_to_email,
                    COALESCE(t.assigned_to_phone, u.phone_number) as assigned_to_phone,
                    t.date_resolved,
                    f.latitude,
                    f.longitude
                FROM tickets t
                LEFT JOIN facilities f ON t.facility_id = f.facility_id
                LEFT JOIN equipment e ON t.selected_equipment_id = e.equipment_id
                LEFT JOIN districts d_facility ON f.district_id = d_facility.district_id
                LEFT JOIN provinces p_facility ON f.province_id = p_facility.province_id
                LEFT JOIN regions r_facility ON p_facility.region_id = r_facility.region_id
                LEFT JOIN users u ON t.assigned_to = u.user_id
                ${whereClause} ${locationFilter}
                ORDER BY ${sortBy} ${sortDirection}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
        }

        const dataParams = [...queryParams, pageSize, offset];
        const result = await db.query(dataQuery, dataParams);
        const totalPages = Math.ceil(totalRecords / pageSize);

        res.json({
            success: true,
            tickets: result.rows,
            data: result.rows,
            pagination: {
                page,
                pageSize,
                totalRecords,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ message: 'Server error fetching tickets', error: error.message });
    }
};

// Create a new ticket
exports.createTicket = async (req, res) => {
    const {
        facilityId,
        equipmentId,
        priority,
        description,
        createdByUserId,
        // Reporter Details
        reportedByName,
        reportedByPhone,
        reportedByEmail,
        // Equipment Snapshot
        manufacturer,
        model,
        serialNumber,
        refrigerantGas,
        idempotencyKey
    } = req.body;

    // Manual validation
    if (!facilityId || !priority || !description) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await db.pool.connect();
    try {
        const tenant = require('../middleware/tenantStore').getStore();
        const schema = tenant && tenant.schema_name ? tenant.schema_name : 'public';
        await client.query(`SET search_path TO "${schema}", public`);

        await client.query('BEGIN');

        // Idempotency check
        if (idempotencyKey) {
            const dupCheck = await client.query('SELECT * FROM tickets WHERE idempotency_key = $1', [idempotencyKey]);
            if (dupCheck.rows.length > 0) {
                await client.query('COMMIT');
                console.log(`ℹ️ Duplicate ticket submission intercepted for idempotency key: ${idempotencyKey}`);
                return res.status(200).json(dupCheck.rows[0]);
            }
        }

        const query = `
      INSERT INTO tickets (
        facility_id, 
        selected_equipment_id,
        priority, 
        fault_description, 
        created_by,
        ticket_status,
        reported_by_name,
        reported_by_phone,
        reported_by_email,
        equipment_manufacturer,
        equipment_model,
        equipment_serial_number,
        equipment_refrigerant_gas,
        idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

        const values = [
            facilityId,
            equipmentId || null,
            priority,
            description,
            createdByUserId || req.user?.userId,
            reportedByName || null,
            reportedByPhone || null,
            reportedByEmail || null,
            manufacturer || null,
            model || null,
            serialNumber || null,
            refrigerantGas || null,
            idempotencyKey || null
        ];

        const result = await client.query(query, values);

        // REFRESH the ticket to get the generated reference number (from the trigger)
        const newTicketId = result.rows[0].ticket_id;
        const refreshedTicketRes = await client.query('SELECT * FROM tickets WHERE ticket_id = $1', [newTicketId]);
        const newTicket = refreshedTicketRes.rows[0];

        // Audit Log
        await logAudit(
            req.user?.userId || createdByUserId,
            'Created',
            'Ticket',
            newTicket.ticket_id,
            `Ticket ${newTicket.ticket_reference_number} created`,
            req
        );

        await client.query('COMMIT');

        // Send notifications in the background (non-blocking)
        notifyTicketCreation(req.app, newTicket, facilityId).catch(notifError => {
            console.error('Background notification error:', notifError);
        });

        res.status(201).json(newTicket);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating ticket:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        res.status(500).json({ message: 'Server error creating ticket', error: error.message });
    } finally {
        client.release();
    }
};

// Helper function to notify users when a ticket is created
async function notifyTicketCreation(app, ticket, facilityId) {
    const { sendNotification } = require('../services/notificationService');

    try {
        // Get facility location information
        const facilityQuery = await db.query(`
            SELECT facility_name, region, province, district 
            FROM facilities 
            WHERE facility_id = $1
        `, [facilityId]);

        if (facilityQuery.rows.length === 0) return;

        const facility = facilityQuery.rows[0];
        const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.ticket_id}`;

        // 1. Fetch all users who need notification in parallel
        const [nationalQuery, regionalQuery, provincialQuery, adminQuery] = await Promise.all([
            db.query(`SELECT u.user_id, u.email, u.phone FROM users u INNER JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'National Helpdesk Officer' AND u.is_active = true`),
            db.query(`SELECT u.user_id, u.email, u.phone FROM users u INNER JOIN roles r ON u.role_id = r.role_id INNER JOIN user_location_scope uls ON u.user_id = uls.user_id WHERE r.role_name = 'Regional Manager' AND u.is_active = true AND (uls.region = $1 OR uls.scope_level = 'national')`, [facility.region]),
            db.query(`SELECT u.user_id, u.email, u.phone FROM users u INNER JOIN roles r ON u.role_id = r.role_id INNER JOIN user_location_scope uls ON u.user_id = uls.user_id WHERE r.role_name = 'Provincial Manager' AND u.is_active = true AND (uls.province = $1 OR uls.region = $2 OR uls.scope_level = 'national')`, [facility.province, facility.region]),
            db.query(`SELECT u.user_id, u.email, u.phone FROM users u INNER JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'Administrator' AND u.is_active = true`)
        ]);

        const message = `New ${ticket.priority} priority ticket (#${ticket.ticket_id}) created at ${facility.facility_name} (${facility.province}, ${facility.region}).`;
        const emailSubject = `New Ticket #${ticket.ticket_id} - ${facility.facility_name}`;
        const emailHtml = `<h2>New Ticket Created</h2><p><strong>Ticket #:</strong> ${ticket.ticket_id}</p><p><strong>Priority:</strong> ${ticket.priority}</p><p><strong>Facility:</strong> ${facility.facility_name}</p><p><a href="${ticketUrl}" style="background: #003087; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Assign Technician</a></p>`;

        const notificationPromises = [];

        // National, Regional, Provincial (Full Notifications)
        [...nationalQuery.rows, ...regionalQuery.rows, ...provincialQuery.rows].forEach(user => {
            notificationPromises.push(sendNotification(app, {
                userId: user.user_id,
                ticketId: ticket.ticket_id,
                type: 'ticket_created',
                message,
                email: user.email,
                phone: user.phone,
                emailSubject,
                emailHtml
            }));
        });

        // Administrators (In-app only)
        adminQuery.rows.forEach(user => {
            notificationPromises.push(sendNotification(app, {
                userId: user.user_id,
                ticketId: ticket.ticket_id,
                type: 'ticket_created',
                message: `New ticket #${ticket.ticket_id} created at ${facility.facility_name}.`,
                email: null,
                phone: null
            }));
        });

        await Promise.all(notificationPromises);
        console.log(`✅ All ${notificationPromises.length} notifications sent for ticket #${ticket.ticket_id}`);
    } catch (error) {
        console.error('Error in background notification task:', error);
    }
}


exports.getTicketById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
        SELECT t.*, 
             f.facility_name, 
             d.district_name, 
             p.province_name,
             u.username as created_by_username
      FROM tickets t
      LEFT JOIN facilities f ON t.facility_id = f.facility_id
      LEFT JOIN districts d ON t.district_id = d.district_id
      LEFT JOIN provinces p ON t.province_id = p.province_id
      LEFT JOIN users u ON t.created_by = u.user_id
      WHERE t.ticket_id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ message: 'Server error fetching ticket' });
    }
};

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
                t.equipment_model,
                t.equipment_serial_number,
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
            'SELECT user_id, first_name, last_name, email, phone_number FROM users WHERE user_id = $1',
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
                    WHEN ticket_status::text IN ('New', 'Open', 'Pending Assignment', 'Reopened') THEN 'Assigned'
                    ELSE ticket_status
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $4
            RETURNING *
        `, [assigned_to, fullName, technician.email, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Send notification to technician
        await sendNotification(req.app, {
            userId: technician.user_id,
            ticketId: result.rows[0].ticket_id,
            type: 'ticket_assigned',
            message: `You have been assigned to Ticket #${result.rows[0].ticket_reference_number || result.rows[0].ticket_id}`,
            email: technician.email,
            phone: technician.phone_number
        });
        // Audit Log
        await logAudit(
            req.user?.userId,
            'Assigned',
            'Ticket',
            result.rows[0].ticket_id,
            `Ticket assigned to ${fullName}`,
            req
        );

        // Activity Log for Ticket History
        await logActivity(
            result.rows[0].ticket_id,
            req.user?.userId || req.user?.user_id,
            'Assigned',
            `Ticket assigned to ${fullName}`
        );

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

        const userId = req.user?.user_id || req.user?.userId;
        await logActivity(id, userId, 'Work Started', 'Technician started work');

        if (result.rows[0].created_by) {
            sendNotification(req.app, {
                userId: result.rows[0].created_by,
                ticketId: id,
                type: 'work_started',
                message: `Work started on Ticket #${result.rows[0].ticket_reference_number || id}`
            });
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
                updated_at = CURRENT_TIMESTAMP,
                ticket_status = 'Assigned'
            WHERE ticket_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const userId = req.user?.user_id || req.user?.userId;
        await logActivity(id, userId, 'Work Paused', 'Technician paused work');

        if (result.rows[0].created_by) {
            sendNotification(req.app, {
                userId: result.rows[0].created_by,
                ticketId: id,
                type: 'work_paused',
                message: `Work paused on Ticket #${result.rows[0].ticket_reference_number || id}`
            });
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
        // Notify creator for now
        const ticketRes = await db.query('SELECT created_by, ticket_reference_number FROM tickets WHERE ticket_id = $1', [id]);
        if (ticketRes.rows.length > 0 && ticketRes.rows[0].created_by) {
            sendNotification(req.app, {
                userId: ticketRes.rows[0].created_by,
                ticketId: id,
                type: 'parts_request',
                message: `Parts requested for Ticket #${ticketRes.rows[0].ticket_reference_number || id}`
            });
        }

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
                from_user_id,
                reason,
                status
            ) VALUES ($1, $2, $3, 'pending')
            RETURNING *
        `, [id, userId, reason]);

        // Update ticket status if needed
        await db.query(`
            UPDATE tickets 
            SET ticket_status = 'Escalated',
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $1
        `, [id]);

        // TODO: Send notification to supervisor
        const ticketRes = await db.query('SELECT created_by, ticket_reference_number FROM tickets WHERE ticket_id = $1', [id]);
        if (ticketRes.rows.length > 0 && ticketRes.rows[0].created_by) {
            sendNotification(req.app, {
                userId: ticketRes.rows[0].created_by,
                ticketId: id,
                type: 'ticket_escalated',
                message: `Ticket #${ticketRes.rows[0].ticket_reference_number || id} has been escalated: ${reason}`
            });
        }

        // Activity Log
        await logActivity(id, userId, 'Escalated', `Ticket escalated: ${reason}`);

        // Audit Log
        await logAudit(
            userId,
            'Escalated',
            'Ticket',
            id,
            `Ticket #${ticketRes.rows.length > 0 ? ticketRes.rows[0].ticket_reference_number : id} escalated: ${reason}`,
            req
        );

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
            SET ticket_status = $1::ticket_status_enum,
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

        // Send notification to requester and supervisor
        if (result.rows[0].created_by) {
            sendNotification(req.app, {
                userId: result.rows[0].created_by,
                ticketId: id,
                type: 'ticket_resolved',
                message: `Ticket #${result.rows[0].ticket_reference_number || id} has been ${newStatus.toLowerCase()}`
            });
        }
        const userId = req.user?.user_id || req.user?.userId;
        await logActivity(id, userId, newStatus, `Resolution: ${resolution_notes}`);
        // Audit Log
        await logAudit(
            req.user?.userId,
            'Resolved',
            'Ticket',
            result.rows[0].ticket_id,
            `Ticket ${newStatus.toLowerCase()} with note: ${resolution_notes}`,
            req
        );

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

        // Audit Log
        await logAudit(
            req.user?.userId,
            'Deleted',
            'Ticket',
            result.rows[0].ticket_id,
            `Ticket ${result.rows[0].ticket_reference_number} deleted`,
            req
        );

        res.json({
            message: 'Ticket deleted successfully',
            ticket: result.rows[0]
        });

        // Notify Creator
        // (Note: ticket is deleted/hidden, but we might want to tell them)

    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ message: 'Server error deleting ticket', error: error.message });
    }
};

// Update ticket details
exports.updateTicket = async (req, res) => {
    const { id } = req.params;
    const {
        priority,
        description, // mapped to fault_description
        status, // mapped to ticket_status
        ticket_status,
        fault_description
    } = req.body;

    // Use mapped values or direct values
    const newPriority = priority;
    const newDescription = description || fault_description;
    const newStatus = status || ticket_status;

    try {
        // Dynamic update query construction could be better, but simpler fixed structure for now
        // Only update fields that are provided
        const result = await db.query(`
            UPDATE tickets
            SET 
                priority = COALESCE($1, priority),
                fault_description = COALESCE($2, fault_description),
                ticket_status = COALESCE($3, ticket_status),
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = $4
            RETURNING *
        `, [newPriority, newDescription, newStatus, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.json({
            message: 'Ticket updated successfully',
            ticket: result.rows[0]
        });

        if (result.rows[0].assigned_to) {
            sendNotification(req.app, {
                userId: result.rows[0].assigned_to,
                ticketId: id,
                type: 'ticket_updated',
                message: `Ticket #${result.rows[0].ticket_reference_number || id} details updated`
            });
        }

        // Audit Log
        await logAudit(
            req.user?.userId,
            'Updated',
            'Ticket',
            result.rows[0].ticket_id,
            'Ticket details updated',
            req
        );

    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ message: 'Server error updating ticket', error: error.message });
    }
};

// Get Ticket History
exports.getTicketHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const events = [];

        // 1. Ticket Creation & Lifecycle (Created, Resolved, Closed)
        // We fetch the ticket itself to get created/resolved dates
        const ticketRes = await db.query(`
            SELECT t.*, u.first_name, u.last_name 
            FROM tickets t
            LEFT JOIN users u ON CAST(t.created_by AS VARCHAR) = CAST(u.user_id AS VARCHAR)
            WHERE t.ticket_id = $1
        `, [id]);

        if (ticketRes.rows.length > 0) {
            const t = ticketRes.rows[0];
            // Created
            events.push({
                type: 'created',
                timestamp: t.created_at,
                user: `${t.first_name || 'System'} ${t.last_name || ''}`.trim(),
                details: 'Ticket created'
            });

            // Resolved
            if (t.date_resolved) {
                events.push({
                    type: 'resolved',
                    timestamp: t.date_resolved,
                    user: 'System/Technician', // We don't track resolved_by ID in tickets table explicitly yet
                    details: 'Ticket resolved'
                });
            }
            // Closed
            if (t.closed_at) {
                events.push({
                    type: 'closed',
                    timestamp: t.closed_at,
                    user: 'System',
                    details: 'Ticket closed'
                });
            }
        }

        // 2. Escalations
        const escalationsRes = await db.query(`
            SELECT e.*, u.first_name, u.last_name
            FROM ticket_escalations e
            LEFT JOIN users u ON e.from_user_id = u.user_id
            WHERE e.ticket_id = $1
        `, [id]);
        escalationsRes.rows.forEach(e => {
            events.push({
                type: 'escalated',
                timestamp: e.escalation_date || e.created_at,
                user: `${e.first_name} ${e.last_name}`,
                details: `Escalated: ${e.reason}`
            });
        });

        // 3. Spare Parts Requests
        const partsRes = await db.query(`
            SELECT sp.*, u.first_name, u.last_name
            FROM spare_parts_requests sp
            LEFT JOIN users u ON sp.requested_by = u.user_id
            WHERE sp.ticket_id = $1
        `, [id]);
        partsRes.rows.forEach(p => {
            events.push({
                type: 'parts_request',
                timestamp: p.created_at,
                user: `${p.first_name} ${p.last_name}`,
                details: `Requested parts`
            });
        });

        // 4. Work Notes / Logs
        // Ensure table exists or handle error gracefully (optional capability)
        try {
            const notesRes = await db.query(`
                SELECT n.*, u.first_name, u.last_name
                FROM ticket_work_notes n
                LEFT JOIN users u ON n.created_by = u.user_id
                WHERE n.ticket_id = $1
            `, [id]);
            notesRes.rows.forEach(n => {
                events.push({
                    type: 'note',
                    timestamp: n.created_at,
                    user: `${n.first_name} ${n.last_name}`,
                    details: n.note_text
                });
            });
        } catch (e) {
            // Ignore if table doesn't exist yet
            console.log('ticket_work_notes table may not exist yet', e.message);
        }

        // 5. Audit Log / Activity Log (New Source)
        try {
            const auditRes = await db.query(`
                SELECT al.*, u.first_name, u.last_name
                FROM ticket_activity_log al
                LEFT JOIN users u ON al.action_by = u.user_id
                WHERE al.ticket_id = $1
            `, [id]);

            auditRes.rows.forEach(a => {
                let typeLabel = 'history';
                if (a.action) {
                    const actionLower = a.action.toLowerCase();
                    if (actionLower.includes('update')) typeLabel = 'update';
                    else if (actionLower.includes('create')) typeLabel = 'created';
                    else if (actionLower.includes('assign')) typeLabel = 'assigned';
                    else typeLabel = actionLower;
                }

                events.push({
                    type: typeLabel,
                    timestamp: a.timestamp,
                    user: a.first_name ? `${a.first_name} ${a.last_name}` : (a.details?.includes('System') ? 'System' : 'Unknown'),
                    details: a.details || a.action
                });
            });
        } catch (e) {
            console.log('ticket_activity_log table may not exist or error', e.message);
        }

        // Sort by timestamp desc
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(events);

    } catch (error) {
        console.error('Error fetching ticket history:', error);
        // Don't fail the whole request if history fails, just return empty? 
        // Better to return 500 so UI knows.
        res.status(500).json({ message: 'Error fetching history' });
    }
};

// Get tickets grouped by the top-level hierarchy (e.g., Province or Region) and status for chart
exports.getTicketsByProvince = async (req, res) => {
    try {
        const tenantCode = req.user?.tenant_code || 'png';
        
        // 1. Get the hierarchy from config
        const configRes = await db.query('SELECT hierarchy FROM tenant_config WHERE tenant_code = $1', [tenantCode.toLowerCase()]);
        
        let topLevelId = 'province_id';
        let topLevelNameField = 'province_name';
        let topLevelLabel = 'Province';
        let tableName = 'provinces';

        if (configRes.rows.length > 0 && configRes.rows[0].hierarchy) {
            const hierarchy = typeof configRes.rows[0].hierarchy === 'string' 
                ? JSON.parse(configRes.rows[0].hierarchy) 
                : configRes.rows[0].hierarchy;
            
            const geoHierarchy = (hierarchy || []).filter(level => 
                ['province', 'district', 'region'].includes(level.id)
            );
            
            if (geoHierarchy && geoHierarchy.length > 0) {
                const topLevel = geoHierarchy[0];
                topLevelLabel = topLevel.name;
                topLevelId = `${topLevel.id}_id`;
                topLevelNameField = `${topLevel.id}_name`;
                tableName = `${topLevel.id}s`; // Assuming plural table name convention
            }
        }

        // 2. Build dynamic query
        // We fallback to hardcoded if table doesn't exist or other issues, 
        // but for now let's try to be smart.
        
        const query = `
            SELECT 
                COALESCE(loc.${topLevelNameField}, 'Unknown ${topLevelLabel}') as location,
                COUNT(CASE WHEN LOWER(t.ticket_status::text) IN ('open', 'new') THEN 1 END)::int as open,
                COUNT(CASE WHEN LOWER(t.ticket_status::text) IN ('in_progress', 'in progress', 'assigned') THEN 1 END)::int as in_progress,
                COUNT(CASE WHEN LOWER(t.ticket_status::text) = 'resolved' THEN 1 END)::int as resolved,
                COUNT(CASE WHEN LOWER(t.ticket_status::text) = 'closed' THEN 1 END)::int as closed,
                COUNT(*)::int as total
            FROM tickets t
            LEFT JOIN facilities f ON t.facility_id = f.facility_id
            LEFT JOIN ${tableName} loc ON f.${topLevelId} = loc.${topLevelId}
            GROUP BY loc.${topLevelNameField}
            ORDER BY total DESC
            LIMIT 15
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                ...row,
                province: row.location // Keep 'province' key for frontend compatibility
            }))
        });

    } catch (error) {
        console.error('Error fetching tickets by hierarchy:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket statistics'
        });
    }
};

// Get equipment type distribution for dashboard
exports.getEquipmentDistribution = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COALESCE(manufacturer, 'Unknown') as item_type,
                COUNT(*)::int as count
            FROM equipment
            GROUP BY manufacturer
            ORDER BY count DESC
            LIMIT 8
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching equipment distribution:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch equipment distribution'
        });
    }
};

// Get top fault categories
exports.getTopFaultCategories = async (req, res) => {
    try {
        // Use fault_status as category, fallback to 'Unknown'
        const result = await db.query(`
            SELECT 
                COALESCE(fault_status, 'Unknown') as fault_category,
                COUNT(*)::int as count
            FROM tickets
            GROUP BY fault_status
            ORDER BY count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching fault categories:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fault categories'
        });
    }
};

// Get monthly ticket trends (last 6 months)
exports.getMonthlyTrends = async (req, res) => {
    try {
        // Use ticket_status instead of status
        const result = await db.query(`
            SELECT 
                TO_CHAR(created_at, 'Mon') as month,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('open', 'new') THEN 1 END)::int as high_priority,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('in_progress', 'in progress', 'assigned') THEN 1 END)::int as medium_priority,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('resolved', 'closed') THEN 1 END)::int as low_priority,
                COUNT(*)::int as total
            FROM tickets
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching monthly trends:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly trends'
        });
    }
};

// Get equipment health by region
exports.getEquipmentHealthByRegion = async (req, res) => {
    try {
        // Real data query joining tables
        const result = await db.query(`
            SELECT 
                COALESCE(r.region_name, 'Unknown') as region,
                COUNT(CASE WHEN e.is_functioning = true THEN 1 END)::int as functioning,
                COUNT(CASE WHEN e.is_functioning = false THEN 1 END)::int as not_functioning,
                COUNT(*)::int as total
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN regions r ON p.region_id = r.region_id
            GROUP BY r.region_name
            ORDER BY total DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching equipment health:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch equipment health'
        });
    }
};
