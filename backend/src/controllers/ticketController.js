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
            if (req.query.status.toLowerCase() === 'assigned') {
                whereClause += ` AND (t.ticket_status::text = 'Assigned' OR (t.ticket_status::text = 'New' AND t.assigned_to IS NOT NULL))`;
            } else if (req.query.status.toLowerCase() === 'new') {
                whereClause += ` AND (t.ticket_status::text = 'New' AND t.assigned_to IS NULL)`;
            } else {
                whereClause += ` AND LOWER(t.ticket_status::text) = LOWER($${paramIndex})`;
                queryParams.push(req.query.status);
                paramIndex++;
            }
        }

        // priority filter
        if (req.query.priority && req.query.priority !== 'all') {
            whereClause += ` AND t.priority = $${paramIndex}`;
            queryParams.push(req.query.priority);
            paramIndex++;
        }

        // assignee filter
        if (req.query.assignee && req.query.assignee !== 'all') {
            const rawAssignee = req.query.assignee.trim();
            if (rawAssignee === 'unassigned' || rawAssignee === '-') {
                whereClause += ` AND (t.assigned_to IS NULL AND (t.assigned_to_name IS NULL OR t.assigned_to_name = '' OR t.assigned_to_name = '-'))`;
            } else {
                whereClause += ` AND (
                    t.assigned_to_name ILIKE $${paramIndex}
                    OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex}
                    OR u.username ILIKE $${paramIndex}
                    OR CAST(t.assigned_to AS TEXT) = $${paramIndex + 1}
                )`;
                queryParams.push(`%${rawAssignee}%`);
                queryParams.push(rawAssignee);
                paramIndex += 2;
            }
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
            LEFT JOIN users u ON t.assigned_to = u.user_id
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
            district_name: 'district_name',
            latest_activity: 'latest_activity',
            latest_activity_date: 'latest_activity_date'
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
                    CASE 
                        WHEN t.ticket_status::text = 'New' AND t.assigned_to IS NOT NULL THEN 'Assigned'
                        ELSE t.ticket_status::text 
                    END as ticket_status,
                    t.created_at,
                    t.updated_at,
                    COALESCE(act.action, CASE 
                        WHEN t.date_resolved IS NOT NULL THEN 'Resolved'
                        WHEN t.date_escalated IS NOT NULL THEN 'Escalated'
                        WHEN t.work_started_at IS NOT NULL THEN 'Work Started'
                        WHEN t.date_assigned IS NOT NULL THEN 'Assigned'
                        WHEN t.updated_at IS NOT NULL AND t.updated_at > t.created_at THEN 'Updated'
                        ELSE 'Created'
                    END) as latest_activity,
                    COALESCE(act.timestamp, t.updated_at, t.created_at) as latest_activity_date,
                    t.date_resolved,
                    f.latitude,
                    f.longitude,
                    COALESCE(t.assigned_to_name, CASE WHEN u.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) ELSE NULL END) as assigned_to_name,
                    t.fault_description as description
                FROM tickets t
                LEFT JOIN facilities f ON t.facility_id = f.facility_id
                LEFT JOIN districts d_facility ON f.district_id = d_facility.district_id
                LEFT JOIN provinces p_facility ON f.province_id = p_facility.province_id
                LEFT JOIN regions r_facility ON p_facility.region_id = r_facility.region_id
                LEFT JOIN users u ON t.assigned_to = u.user_id
                LEFT JOIN LATERAL (
                    SELECT al.action, al.timestamp
                    FROM ticket_activity_log al
                    WHERE al.ticket_id = t.ticket_id
                    ORDER BY al.timestamp DESC, al.log_id DESC
                    LIMIT 1
                ) act ON true
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
                    f.facility_name,
                    r_facility.region_name as region_name,
                    p_facility.province_name as province_name,
                    d_facility.district_name as district_name,
                    t.fault_description,
                    t.selected_equipment_id as equipment_id,
                    COALESCE(e.manufacturer, t.equipment_manufacturer) as equipment_manufacturer,
                    e.model as equipment_model,
                    t.priority,
                    CASE 
                        WHEN t.ticket_status::text = 'New' AND t.assigned_to IS NOT NULL THEN 'Assigned'
                        ELSE t.ticket_status::text 
                    END as ticket_status,
                    t.assigned_to,
                    t.created_at,
                    t.updated_at,
                    COALESCE(act.action, CASE 
                        WHEN t.date_resolved IS NOT NULL THEN 'Resolved'
                        WHEN t.date_escalated IS NOT NULL THEN 'Escalated'
                        WHEN t.work_started_at IS NOT NULL THEN 'Work Started'
                        WHEN t.date_assigned IS NOT NULL THEN 'Assigned'
                        WHEN t.updated_at IS NOT NULL AND t.updated_at > t.created_at THEN 'Updated'
                        ELSE 'Created'
                    END) as latest_activity,
                    COALESCE(act.timestamp, t.updated_at, t.created_at) as latest_activity_date,
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
                LEFT JOIN LATERAL (
                    SELECT al.action, al.timestamp
                    FROM ticket_activity_log al
                    WHERE al.ticket_id = t.ticket_id
                    ORDER BY al.timestamp DESC, al.log_id DESC
                    LIMIT 1
                ) act ON true
                ${whereClause} ${locationFilter}
                ORDER BY ${sortBy} ${sortDirection}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
        }

        const dataParams = [...queryParams, pageSize, offset];
        let result;
        try {
            result = await db.query(dataQuery, dataParams);
        } catch (queryErr) {
            console.warn('getAllTickets with activity log lateral join failed, falling back to base columns:', queryErr.message);
            const fallbackQuery = `
                SELECT 
                    t.ticket_id,
                    t.ticket_reference_number,
                    t.facility_id,
                    f.facility_name,
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
                    t.updated_at,
                    CASE 
                        WHEN t.date_resolved IS NOT NULL THEN 'Resolved'
                        WHEN t.date_escalated IS NOT NULL THEN 'Escalated'
                        WHEN t.work_started_at IS NOT NULL THEN 'Work Started'
                        WHEN t.date_assigned IS NOT NULL THEN 'Assigned'
                        WHEN t.updated_at IS NOT NULL AND t.updated_at > t.created_at THEN 'Updated'
                        ELSE 'Created'
                    END as latest_activity,
                    COALESCE(t.updated_at, t.created_at) as latest_activity_date,
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
                ORDER BY t.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            result = await db.query(fallbackQuery, dataParams);
        }
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

    // Manual validation with clear, non-generic error responses
    if (!facilityId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Facility is required to create a ticket', 
            error: 'Missing required field: facilityId' 
        });
    }
    if (!description || !description.trim()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Fault description is required to create a ticket', 
            error: 'Missing required field: description' 
        });
    }

    const facId = parseInt(facilityId, 10);
    const eqId = equipmentId ? parseInt(equipmentId, 10) : null;
    if (isNaN(facId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid facility ID provided', 
            error: `facilityId must be a number, received: ${facilityId}` 
        });
    }

    const client = await db.pool.connect();
    try {
        const tenant = require('../middleware/tenantStore').getStore();
        const schema = tenant && tenant.schema_name ? tenant.schema_name : 'public';
        await client.query(`SET search_path TO "${schema}", public`);

        const rawUserId = req.user?.userId || req.user?.user_id || createdByUserId || (tenant && (tenant.userId || tenant.user_id));
        const safeUserId = rawUserId ? String(rawUserId).replace(/[^0-9]/g, '') : '1';
        await client.query(`SELECT set_config('app.user_id', $1, false)`, [safeUserId || '1']);

        await client.query('BEGIN');

        // Safe idempotency check (wrapped in try/catch in case column is not yet present)
        if (idempotencyKey) {
            try {
                const dupCheck = await client.query('SELECT * FROM tickets WHERE idempotency_key = $1', [idempotencyKey]);
                if (dupCheck.rows.length > 0) {
                    await client.query('COMMIT');
                    console.log(`ℹ️ Duplicate ticket submission intercepted for idempotency key: ${idempotencyKey}`);
                    return res.status(200).json(dupCheck.rows[0]);
                }
            } catch (dupErr) {
                // Table might not have idempotency_key column; continue safely
            }
        }

        const creator = req.user?.email || (req.user?.userId ? String(req.user.userId) : null) || (createdByUserId ? String(createdByUserId) : 'system');
        const prio = priority || 'Medium';

        let result = null;
        let lastInsertError = null;

        // Tier 1: Full insert with idempotency_key
        try {
            result = await client.query(`
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
            `, [
                facId,
                eqId,
                prio,
                description,
                creator,
                reportedByName || null,
                reportedByPhone || null,
                reportedByEmail || null,
                manufacturer || null,
                model || null,
                serialNumber || null,
                refrigerantGas || null,
                idempotencyKey || null
            ]);
        } catch (err1) {
            lastInsertError = err1;
        }

        // Tier 2: Insert without idempotency_key (most common issue when column is not migrated)
        if (!result) {
            try {
                result = await client.query(`
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
                        equipment_refrigerant_gas
                    ) VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `, [
                    facId,
                    eqId,
                    prio,
                    description,
                    creator,
                    reportedByName || null,
                    reportedByPhone || null,
                    reportedByEmail || null,
                    manufacturer || null,
                    model || null,
                    serialNumber || null,
                    refrigerantGas || null
                ]);
            } catch (err2) {
                lastInsertError = err2;
            }
        }

        // Tier 3: Insert with standard columns (without equipment_refrigerant_gas)
        if (!result) {
            try {
                result = await client.query(`
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
                        equipment_serial_number
                    ) VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9, $10, $11)
                    RETURNING *
                `, [
                    facId,
                    eqId,
                    prio,
                    description,
                    creator,
                    reportedByName || null,
                    reportedByPhone || null,
                    reportedByEmail || null,
                    manufacturer || null,
                    model || null,
                    serialNumber || null
                ]);
            } catch (err3) {
                lastInsertError = err3;
            }
        }

        // Tier 4: Insert with explicit enum cast for ticket_status
        if (!result) {
            try {
                result = await client.query(`
                    INSERT INTO tickets (
                        facility_id, 
                        selected_equipment_id,
                        priority, 
                        fault_description, 
                        created_by,
                        ticket_status
                    ) VALUES ($1, $2, $3, $4, $5, 'New'::ticket_status_enum)
                    RETURNING *
                `, [
                    facId,
                    eqId,
                    prio,
                    description,
                    creator
                ]);
            } catch (err4) {
                lastInsertError = err4;
            }
        }

        // Tier 5: Minimal insert with core required columns
        if (!result) {
            try {
                result = await client.query(`
                    INSERT INTO tickets (
                        facility_id, 
                        priority, 
                        fault_description, 
                        created_by
                    ) VALUES ($1, $2, $3, $4)
                    RETURNING *
                `, [
                    facId,
                    prio,
                    description,
                    creator
                ]);
            } catch (err5) {
                lastInsertError = err5;
            }
        }

        if (!result || !result.rows || result.rows.length === 0) {
            throw lastInsertError || new Error('Failed to create ticket record in database');
        }

        const newTicketId = result.rows[0].ticket_id;
        let newTicket = result.rows[0];

        // Ensure ticket reference number is populated
        try {
            const refreshedTicketRes = await client.query('SELECT * FROM tickets WHERE ticket_id = $1', [newTicketId]);
            if (refreshedTicketRes.rows.length > 0) {
                newTicket = refreshedTicketRes.rows[0];
            }
        } catch (refErr) {
            // Keep original result row if re-select fails
        }

        // If ticket_reference_number was not generated by trigger, set a standard fallback
        if (!newTicket.ticket_reference_number) {
            try {
                const now = new Date();
                const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
                const fallbackRef = `TCK-${datePart}-${String(newTicketId).padStart(4, '0')}`;
                await client.query('UPDATE tickets SET ticket_reference_number = $1 WHERE ticket_id = $2', [fallbackRef, newTicketId]);
                newTicket.ticket_reference_number = fallbackRef;
            } catch (refUpdErr) {
                // Non-fatal
            }
        }

        // Audit Log - non-fatal so it never fails the ticket creation
        try {
            await logAudit(
                req.user?.userId || createdByUserId,
                'Created',
                'Ticket',
                newTicket.ticket_id,
                `Ticket ${newTicket.ticket_reference_number || newTicket.ticket_id} created`,
                req
            );
        } catch (auditErr) {
            console.error('Audit log failed for ticket creation (non-fatal):', auditErr.message);
        }

        await client.query('COMMIT');

        // Send notifications in the background (non-blocking)
        try {
            notifyTicketCreation(req.app, newTicket, facId).catch(notifError => {
                console.error('Background notification error:', notifError);
            });
        } catch (notifErr) {
            // Non-fatal
        }

        res.status(201).json(newTicket);

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error creating ticket:', error);
        res.status(500).json({ 
            success: false,
            message: `Failed to create ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
    } finally {
        await client.query(`SET search_path TO public; SELECT set_config('app.user_id', '', false)`).catch(() => {});
        client.release();
    }
};

// Helper function to notify users when a ticket is created
async function notifyTicketCreation(app, ticket, facilityId) {
    const { sendNotification } = require('../services/notificationService');

    try {
        // Get facility location information via proper FK joins
        // (facilities does not have direct region/province/district text columns)
        const facilityQuery = await db.query(`
            SELECT 
                f.facility_name,
                f.region_id,
                f.province_id,
                f.district_id,
                r.region_name,
                p.province_name,
                d.district_name
            FROM facilities f
            LEFT JOIN regions   r ON f.region_id   = r.region_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN districts d ON f.district_id = d.district_id
            WHERE f.facility_id = $1
        `, [facilityId]);

        if (facilityQuery.rows.length === 0) return;

        const facility = facilityQuery.rows[0];
        const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.ticket_id}`;

        // 1. Fetch all users who need notification in parallel
        // user_scopes is the correct table (not user_location_scope)
        const [nationalQuery, regionalQuery, provincialQuery, adminQuery] = await Promise.all([
            db.query(`
                SELECT u.user_id, u.email, u.phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                WHERE r.role_name = 'National Helpdesk Officer'
                  AND u.is_active = true
            `),
            db.query(`
                SELECT DISTINCT u.user_id, u.email, u.phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                LEFT JOIN user_scopes us ON u.user_id = us.user_id
                WHERE r.role_name = 'Regional Manager'
                  AND u.is_active = true
                  AND (
                    u.is_national_access = true
                    OR us.region_id = $1
                  )
            `, [facility.region_id]),
            db.query(`
                SELECT DISTINCT u.user_id, u.email, u.phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                LEFT JOIN user_scopes us ON u.user_id = us.user_id
                WHERE r.role_name = 'Provincial Manager'
                  AND u.is_active = true
                  AND (
                    u.is_national_access = true
                    OR us.province_id = $1
                    OR us.region_id   = $2
                  )
            `, [facility.province_id, facility.region_id]),
            db.query(`
                SELECT u.user_id, u.email, u.phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                WHERE r.role_name = 'Administrator'
                  AND u.is_active = true
            `)
        ]);

        const locationLabel = [facility.province_name, facility.region_name].filter(Boolean).join(', ');
        const message = `New ${ticket.priority} priority ticket (#${ticket.ticket_id}) created at ${facility.facility_name} (${locationLabel}).`;
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

// Helper to notify supervisors/managers when a ticket is escalated or parts are requested
async function notifySupervisors(app, ticketId, eventType, messageText, subjectText, emailHtmlBody) {
    try {
        // Get ticket details and facility location
        const ticketQuery = await db.query(`
            SELECT t.ticket_id, t.ticket_reference_number, t.facility_id,
                   f.facility_name, f.region_id, f.province_id
            FROM tickets t
            LEFT JOIN facilities f ON t.facility_id = f.facility_id
            WHERE t.ticket_id = $1
        `, [ticketId]);

        if (ticketQuery.rows.length === 0) return;
        const ticket = ticketQuery.rows[0];
        const facilityId = ticket.facility_id;

        if (!facilityId) return;

        // Fetch managers/supervisors who have scope over this facility
        const [nationalQuery, regionalQuery, provincialQuery] = await Promise.all([
            db.query(`
                SELECT u.user_id, u.email, u.phone_number as phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                WHERE r.role_name = 'National Helpdesk Officer'
                  AND u.is_active = true
            `),
            db.query(`
                SELECT DISTINCT u.user_id, u.email, u.phone_number as phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                LEFT JOIN user_scopes us ON u.user_id = us.user_id
                WHERE r.role_name = 'Regional Manager'
                  AND u.is_active = true
                  AND (
                    u.is_national_access = true
                    OR us.region_id = $1
                  )
            `, [ticket.region_id]),
            db.query(`
                SELECT DISTINCT u.user_id, u.email, u.phone_number as phone
                FROM users u
                INNER JOIN roles r ON u.role_id = r.role_id
                LEFT JOIN user_scopes us ON u.user_id = us.user_id
                WHERE r.role_name = 'Provincial Manager'
                  AND u.is_active = true
                  AND (
                    u.is_national_access = true
                    OR us.province_id = $1
                    OR us.region_id = $2
                  )
            `, [ticket.province_id, ticket.region_id])
        ]);

        const allSupervisors = [...nationalQuery.rows, ...regionalQuery.rows, ...provincialQuery.rows];
        const uniqueSupervisors = Array.from(new Map(allSupervisors.map(u => [u.user_id, u])).values());

        const { sendNotification } = require('../services/notificationService');
        const notificationPromises = uniqueSupervisors.map(supervisor => 
            sendNotification(app, {
                userId: supervisor.user_id,
                ticketId: ticketId,
                type: eventType,
                message: messageText,
                email: supervisor.email,
                phone: supervisor.phone,
                emailSubject: subjectText || `Ticket #${ticket.ticket_reference_number || ticketId} Update`,
                emailHtml: emailHtmlBody || `<p>${messageText}</p>`
            })
        );

        await Promise.all(notificationPromises);
        console.log(`✅ Sent ${notificationPromises.length} supervisor notifications for ticket #${ticketId} (${eventType})`);
    } catch (err) {
        console.error('Error sending supervisor notifications:', err);
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
      LEFT JOIN users u ON (t.created_by = CAST(u.user_id AS VARCHAR) OR t.created_by = u.email OR t.created_by = u.username)
      WHERE t.ticket_id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch ticket: ${error.message}`, 
            error: error.message 
        });
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
                t.updated_at,
                t.work_started_at,
                t.work_paused_at,
                t.work_duration_seconds,
                t.assigned_to,
                COALESCE(act.action, CASE 
                    WHEN t.date_resolved IS NOT NULL THEN 'Resolved'
                    WHEN t.date_escalated IS NOT NULL THEN 'Escalated'
                    WHEN t.work_started_at IS NOT NULL THEN 'Work Started'
                    WHEN t.date_assigned IS NOT NULL THEN 'Assigned'
                    WHEN t.updated_at IS NOT NULL AND t.updated_at > t.created_at THEN 'Updated'
                    ELSE 'Created'
                END) as latest_activity,
                COALESCE(act.timestamp, t.updated_at, t.created_at) as latest_activity_date,
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
            LEFT JOIN LATERAL (
                SELECT al.action, al.timestamp
                FROM ticket_activity_log al
                WHERE al.ticket_id = t.ticket_id
                ORDER BY al.timestamp DESC, al.log_id DESC
                LIMIT 1
            ) act ON true
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

    const ticketId = parseInt(id, 10);
    const techId = parseInt(assigned_to, 10);

    if (isNaN(ticketId) || isNaN(techId)) {
        return res.status(400).json({ message: 'Valid ticket ID and technician ID are required' });
    }

    try {
        // Get technician details (with column fallback for users table)
        let userResult;
        try {
            userResult = await db.query(
                'SELECT user_id, first_name, last_name, email, phone_number FROM users WHERE user_id = $1',
                [techId]
            );
        } catch (uErr) {
            userResult = await db.query(
                'SELECT user_id, first_name, last_name, email FROM users WHERE user_id = $1',
                [techId]
            );
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        const technician = userResult.rows[0];
        const fullName = `${technician.first_name || ''} ${technician.last_name || ''}`.trim() || 'Technician';

        // Update ticket with schema-tolerant fallback tiers
        let result = null;
        let updateError = null;

        // Tier 1: Full update with public.ticket_status_enum cast
        try {
            result = await db.query(`
                UPDATE tickets 
                SET assigned_to = $1,
                    assigned_to_name = $2,
                    assigned_to_email = $3,
                    assigned_to_phone = $4,
                    date_assigned = CURRENT_DATE,
                    assignment_status = 'Assigned',
                    ticket_status = CASE 
                        WHEN LOWER(TRIM(ticket_status::text)) IN ('closed', 'resolved') THEN ticket_status
                        ELSE 'Assigned'::public.ticket_status_enum
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $5
                RETURNING *
            `, [techId, fullName, technician.email || null, technician.phone_number || null, ticketId]);
        } catch (err1) {
            updateError = err1;
        }

        // Tier 2: Full update with ticket_status_enum cast (without schema qualifier)
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1,
                        assigned_to_name = $2,
                        assigned_to_email = $3,
                        assigned_to_phone = $4,
                        date_assigned = CURRENT_DATE,
                        assignment_status = 'Assigned',
                        ticket_status = CASE 
                            WHEN LOWER(TRIM(ticket_status::text)) IN ('closed', 'resolved') THEN ticket_status
                            ELSE 'Assigned'::ticket_status_enum
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $5
                    RETURNING *
                `, [techId, fullName, technician.email || null, technician.phone_number || null, ticketId]);
            } catch (err2) {
                updateError = err2;
            }
        }

        // Tier 3: Full update without explicit enum cast
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1,
                        assigned_to_name = $2,
                        assigned_to_email = $3,
                        date_assigned = CURRENT_DATE,
                        assignment_status = 'Assigned',
                        ticket_status = CASE 
                            WHEN LOWER(TRIM(ticket_status::text)) IN ('closed', 'resolved') THEN ticket_status
                            ELSE 'Assigned'
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $4
                    RETURNING *
                `, [techId, fullName, technician.email || null, ticketId]);
            } catch (err3) {
                updateError = err3;
            }
        }

        // Tier 4: Without date_assigned & assignment_status columns
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1,
                        assigned_to_name = $2,
                        assigned_to_email = $3,
                        ticket_status = 'Assigned'::public.ticket_status_enum,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $4
                    RETURNING *
                `, [techId, fullName, technician.email || null, ticketId]);
            } catch (err4) {
                updateError = err4;
            }
        }

        // Tier 5: Direct assignment without enum cast
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1,
                        assigned_to_name = $2,
                        ticket_status = 'Assigned',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $3
                    RETURNING *
                `, [techId, fullName, ticketId]);
            } catch (err5) {
                updateError = err5;
            }
        }

        // Tier 6: Core update guaranteeing ticket_status and assigned_to_name
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1,
                        assigned_to_name = $2,
                        ticket_status = 'Assigned'
                    WHERE ticket_id = $3
                    RETURNING *
                `, [techId, fullName, ticketId]);
            } catch (err6) {
                updateError = err6;
            }
        }

        // Tier 7: Bare minimum update
        if (!result) {
            try {
                result = await db.query(`
                    UPDATE tickets 
                    SET assigned_to = $1
                    WHERE ticket_id = $2
                    RETURNING *
                `, [techId, ticketId]);
            } catch (err7) {
                updateError = err7;
            }
        }

        if (!result) {
            throw updateError || new Error('Failed to update ticket assignment');
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const updatedTicket = result.rows[0];

        // Secondary side-effects (notifications and audit log) wrapped safely so they never fail the request
        try {
            await sendNotification(req.app, {
                userId: technician.user_id,
                ticketId: updatedTicket.ticket_id,
                type: 'ticket_assigned',
                message: `You have been assigned to Ticket #${updatedTicket.ticket_reference_number || updatedTicket.ticket_id}`,
                email: technician.email,
                phone: technician.phone_number
            });
            await logAudit(
                req.user?.userId || req.user?.user_id,
                'Assigned',
                'Ticket',
                updatedTicket.ticket_id,
                `Ticket assigned to ${fullName}`,
                req
            );
            await logActivity(
                updatedTicket.ticket_id,
                req.user?.userId || req.user?.user_id,
                'Assigned',
                `Ticket assigned to ${fullName}`
            );
        } catch (notifyErr) {
            console.error('Error during assignment notification/audit (non-fatal):', notifyErr.message);
        }

        res.json({
            success: true,
            message: 'Ticket assigned successfully',
            ticket: updatedTicket
        });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ 
            success: false,
            message: `Failed to assign ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
    }
};

// Start work on a ticket
exports.startWork = async (req, res) => {
    const { id } = req.params;

    try {
        let result;
        try {
            result = await db.query(`
                UPDATE tickets 
                SET ticket_status = 'In Progress'::ticket_status_enum,
                    work_started_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $1
                RETURNING *
            `, [id]);
        } catch (err) {
            result = await db.query(`
                UPDATE tickets 
                SET ticket_status = 'In Progress',
                    work_started_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $1
                RETURNING *
            `, [id]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        try {
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
        } catch (sideErr) {
            console.error('Error during start work logging (non-fatal):', sideErr.message);
        }

        res.json({
            success: true,
            message: 'Work started successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error starting work:', error);
        res.status(500).json({ 
            success: false,
            message: `Failed to start work: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
    }
};

// Pause work on a ticket
exports.pauseWork = async (req, res) => {
    const { id } = req.params;

    try {
        // Calculate duration if work was started
        let result;
        try {
            result = await db.query(`
                UPDATE tickets 
                SET work_paused_at = CURRENT_TIMESTAMP,
                    work_duration_seconds = COALESCE(work_duration_seconds, 0) + 
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(work_started_at, CURRENT_TIMESTAMP)))::INTEGER,
                    updated_at = CURRENT_TIMESTAMP,
                    ticket_status = 'Assigned'::ticket_status_enum
                WHERE ticket_id = $1
                RETURNING *
            `, [id]);
        } catch (err) {
            result = await db.query(`
                UPDATE tickets 
                SET work_paused_at = CURRENT_TIMESTAMP,
                    work_duration_seconds = COALESCE(work_duration_seconds, 0) + 
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(work_started_at, CURRENT_TIMESTAMP)))::INTEGER,
                    updated_at = CURRENT_TIMESTAMP,
                    ticket_status = 'Assigned'
                WHERE ticket_id = $1
                RETURNING *
            `, [id]);
        }

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
        res.status(500).json({ 
            success: false,
            message: `Failed to pause work: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
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

        // Notify supervisors/parts managers who have scope over the facility
        const ticketRes = await db.query('SELECT created_by, ticket_reference_number FROM tickets WHERE ticket_id = $1', [id]);
        if (ticketRes.rows.length > 0) {
            const ticketRef = ticketRes.rows[0].ticket_reference_number || id;
            const message = `Parts requested for Ticket #${ticketRef}. Notes: ${notes || 'None'}`;
            
            // Notify creator/technician who filed the request
            if (ticketRes.rows[0].created_by) {
                sendNotification(req.app, {
                    userId: ticketRes.rows[0].created_by,
                    ticketId: id,
                    type: 'parts_request',
                    message
                });
            }

            // Notify supervisors
            notifySupervisors(
                req.app, 
                id, 
                'parts_request', 
                message, 
                `Spare Parts Request - Ticket #${ticketRef}`, 
                `<h3>Spare Parts Requested</h3><p>Parts have been requested for ticket #${ticketRef}.</p><p><strong>Notes:</strong> ${notes || 'None'}</p>`
            );
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
        // Create escalation record with schema-tolerant fallback
        let escalationRecord = null;
        try {
            const escRes = await db.query(`
                INSERT INTO ticket_escalations (
                    ticket_id,
                    from_user_id,
                    reason,
                    status
                ) VALUES ($1, $2, $3, 'pending')
                RETURNING *
            `, [id, userId, reason]);
            escalationRecord = escRes.rows[0];
        } catch (escErr1) {
            console.warn('First ticket_escalations insert attempt failed, trying escalated_by schema:', escErr1.message);
            try {
                const escRes2 = await db.query(`
                    INSERT INTO ticket_escalations (
                        ticket_id,
                        escalated_by,
                        reason,
                        description,
                        status
                    ) VALUES ($1, $2, $3, $4, 'Pending')
                    RETURNING *
                `, [id, userId, reason, description || '']);
                escalationRecord = escRes2.rows[0];
            } catch (escErr2) {
                console.error('Ticket escalations table insert failed, proceeding with ticket update:', escErr2.message);
            }
        }

        // Update ticket status
        let ticketRes;
        try {
            ticketRes = await db.query(`
                UPDATE tickets 
                SET ticket_status = 'Escalated'::ticket_status_enum,
                    escalation_reason = $1,
                    date_escalated = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $2
                RETURNING *
            `, [reason, id]);
        } catch (updErr) {
            ticketRes = await db.query(`
                UPDATE tickets 
                SET ticket_status = 'Escalated',
                    escalation_reason = $1,
                    date_escalated = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $2
                RETURNING *
            `, [reason, id]);
        }

        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const ticketRef = ticketRes.rows[0].ticket_reference_number || id;
        const message = `Ticket #${ticketRef} has been escalated: ${reason}`;

        // Notifications & logs wrapped safely so side effects never cause a 500 error
        try {
            if (ticketRes.rows[0].created_by) {
                sendNotification(req.app, {
                    userId: ticketRes.rows[0].created_by,
                    ticketId: id,
                    type: 'ticket_escalated',
                    message
                });
            }

            notifySupervisors(
                req.app, 
                id, 
                'ticket_escalated', 
                message, 
                `Escalation Alert - Ticket #${ticketRef}`, 
                `<h3>Ticket Escalation</h3><p>Ticket #${ticketRef} has been escalated.</p><p><strong>Reason:</strong> ${reason}</p><p><strong>Description:</strong> ${description || 'None'}</p>`
            );

            await logActivity(id, userId, 'Escalated', `Ticket escalated: ${reason}`);

            await logAudit(
                userId,
                'Escalated',
                'Ticket',
                id,
                `Ticket #${ticketRef} escalated: ${reason}`,
                req
            );
        } catch (sideErr) {
            console.error('Error during escalation notification/logging (non-fatal):', sideErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Ticket escalated successfully',
            escalation: escalationRecord || { ticket_id: id, reason, status: 'Escalated' }
        });
    } catch (error) {
        console.error('Error escalating ticket:', error);
        res.status(500).json({ 
            success: false,
            message: `Failed to escalate ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
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

        let result;
        try {
            result = await db.query(`
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
        } catch (resErr) {
            result = await db.query(`
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
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Safe notification and audit logging side-effects
        try {
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
            await logAudit(
                userId,
                'Resolved',
                'Ticket',
                result.rows[0].ticket_id,
                `Ticket ${newStatus.toLowerCase()} with note: ${resolution_notes}`,
                req
            );
        } catch (sideErr) {
            console.error('Non-fatal error in resolveTicket side-effects:', sideErr.message);
        }

        res.json({
            success: true,
            message: `Ticket ${newStatus.toLowerCase()} successfully`,
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error resolving ticket:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to resolve ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
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

        // Audit Log - wrapped safely so audit logging issues don't block deletion
        try {
            const currentUserId = req.user?.userId || req.user?.user_id;
            await logAudit(
                currentUserId,
                'Deleted',
                'Ticket',
                result.rows[0].ticket_id,
                `Ticket ${result.rows[0].ticket_reference_number} deleted`,
                req
            );
        } catch (auditErr) {
            console.error('Non-fatal error in deleteTicket audit log:', auditErr.message);
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully',
            ticket: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ 
            success: false,
            message: `Failed to delete ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
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
        let result;
        try {
            result = await db.query(`
                UPDATE tickets
                SET 
                    priority = COALESCE($1, priority),
                    fault_description = COALESCE($2, fault_description),
                    ticket_status = COALESCE($3, ticket_status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE ticket_id = $4
                RETURNING *
            `, [newPriority, newDescription, newStatus, id]);
        } catch (uErr1) {
            try {
                result = await db.query(`
                    UPDATE tickets
                    SET 
                        priority = COALESCE($1::priority_enum, priority),
                        fault_description = COALESCE($2, fault_description),
                        ticket_status = COALESCE($3::ticket_status_enum, ticket_status),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $4
                    RETURNING *
                `, [newPriority, newDescription, newStatus, id]);
            } catch (uErr2) {
                result = await db.query(`
                    UPDATE tickets
                    SET 
                        fault_description = COALESCE($1, fault_description),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = $2
                    RETURNING *
                `, [newDescription, id]);
            }
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Audit Log — must be awaited BEFORE sending the response so that
        // any failure is caught by the surrounding try/catch and does not
        // silently run after headers are already flushed.
        try {
            const currentUserId = req.user?.userId || req.user?.user_id;
            await logAudit(
                currentUserId,
                'Updated',
                'Ticket',
                result.rows[0].ticket_id,
                'Ticket details updated',
                req
            );
        } catch (auditErr) {
            console.error('Audit log failed for ticket update:', auditErr.message);
            // Non-fatal — continue so the user gets a response
        }

        // Notification — fire-and-forget (non-blocking) but launched BEFORE
        // res.json() so it is scoped within the live request context.
        if (result.rows[0].assigned_to) {
            sendNotification(req.app, {
                userId: result.rows[0].assigned_to,
                ticketId: id,
                type: 'ticket_updated',
                message: `Ticket #${result.rows[0].ticket_reference_number || id} details updated`
            }).catch(notifErr => {
                console.error('Notification failed for ticket update:', notifErr.message);
            });
        }

        res.json({
            success: true,
            message: 'Ticket updated successfully',
            ticket: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to update ticket: ${error.message}`, 
            error: error.message,
            detail: error.detail || error.hint || null
        });
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
                const resolverRes = await db.query(`
                    SELECT u.first_name, u.last_name 
                    FROM ticket_activity_log al 
                    LEFT JOIN users u ON al.action_by = u.user_id 
                    WHERE al.ticket_id = $1 AND al.action = 'Resolved'
                    ORDER BY al.timestamp DESC LIMIT 1
                `, [id]);
                const resolverName = resolverRes.rows.length > 0 && resolverRes.rows[0].first_name
                    ? `${resolverRes.rows[0].first_name} ${resolverRes.rows[0].last_name}`
                    : 'System/Technician';

                events.push({
                    type: 'resolved',
                    timestamp: t.date_resolved,
                    user: resolverName,
                    details: t.resolution_notes ? `Resolved: ${t.resolution_notes}` : 'Ticket resolved'
                });
            }
            // Closed
            if (t.closed_at) {
                const closerRes = await db.query(`
                    SELECT u.first_name, u.last_name 
                    FROM ticket_activity_log al 
                    LEFT JOIN users u ON al.action_by = u.user_id 
                    WHERE al.ticket_id = $1 AND al.action = 'Closed'
                    ORDER BY al.timestamp DESC LIMIT 1
                `, [id]);
                const closerName = closerRes.rows.length > 0 && closerRes.rows[0].first_name
                    ? `${closerRes.rows[0].first_name} ${closerRes.rows[0].last_name}`
                    : 'System';

                events.push({
                    type: 'closed',
                    timestamp: t.closed_at,
                    user: closerName,
                    details: 'Ticket closed'
                });
            }
        }

        // 2. Escalations (wrapped safely)
        try {
            const escalationsRes = await db.query(`
                SELECT e.*, u.first_name, u.last_name
                FROM ticket_escalations e
                LEFT JOIN users u ON (e.from_user_id = u.user_id OR e.escalated_by = u.user_id)
                WHERE e.ticket_id = $1
            `, [id]);
            escalationsRes.rows.forEach(e => {
                events.push({
                    type: 'escalated',
                    timestamp: e.escalation_date || e.created_at,
                    user: e.first_name ? `${e.first_name} ${e.last_name}` : 'Supervisor',
                    details: `Escalated: ${e.reason || e.description || 'Ticket escalated'}`
                });
            });
        } catch (escErr) {
            console.log('ticket_escalations table may not exist or column mismatch:', escErr.message);
        }

        // 3. Spare Parts Requests (wrapped safely)
        try {
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
                    user: p.first_name ? `${p.first_name} ${p.last_name}` : 'Technician',
                    details: 'Requested parts'
                });
            });
        } catch (partsErr) {
            console.log('spare_parts_requests table may not exist:', partsErr.message);
        }

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
                if (a.action === 'Resolved' || a.action === 'Closed') {
                    // Skip to avoid duplication since we handle these explicitly above with details
                    return;
                }
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
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch ticket history: ${error.message}`, 
            error: error.message 
        });
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

                // Validate against an allowlist to prevent SQL injection via corrupt DB data
                const allowedLevels = ['province', 'district', 'region'];
                if (!allowedLevels.includes(topLevel.id)) {
                    console.warn(`Unexpected hierarchy level '${topLevel.id}' — falling back to province`);
                } else {
                    topLevelId = `${topLevel.id}_id`;
                    topLevelNameField = `${topLevel.id}_name`;
                    tableName = `${topLevel.id}s`;
                }
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
                COALESCE(item_type, 'Unknown') as item_type,
                COALESCE(manufacturer, 'Unknown') as manufacturer,
                COUNT(*)::int as count
            FROM equipment
            GROUP BY item_type, manufacturer
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
        // fault_type is the descriptive category field; fault_status is a workflow state
        const result = await db.query(`
            SELECT 
                COALESCE(fault_type, 'Unknown') as fault_category,
                COUNT(*)::int as count
            FROM tickets
            GROUP BY fault_type
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
        const result = await db.query(`
            SELECT 
                TO_CHAR(created_at, 'Mon') as month,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('open', 'new') THEN 1 END)::int as open_count,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('in_progress', 'in progress', 'assigned') THEN 1 END)::int as in_progress_count,
                COUNT(CASE WHEN LOWER(ticket_status::text) IN ('resolved', 'closed') THEN 1 END)::int as resolved_count,
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
