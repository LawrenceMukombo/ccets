const db = require('../db');
const { buildLocationFilter } = require('../middleware/locationAccess');

// Helper to build WHERE clause based on filters
const buildFilters = (req) => {
    const { dateStart, dateEnd, region, province, district, facility, status, priority } = req.query;
    let conditions = ["(t.is_deleted IS NOT TRUE)"]; // Handle NULL or false safely
    let values = [];
    let pIndex = 1;

    // Date Range
    if (dateStart) {
        conditions.push(`t.created_at >= $${pIndex++}`);
        values.push(dateStart);
    }
    if (dateEnd) {
        // Ensure end of day
        conditions.push(`t.created_at <= ($${pIndex++}::date + INTERVAL '1 day')`);
        values.push(dateEnd);
    }

    // Location Filters (Joins required in main query)
    if (region && region !== 'all') {
        conditions.push(`f.province_id IN (SELECT province_id FROM provinces WHERE region_id = (SELECT region_id FROM regions WHERE region_name = $${pIndex++}))`);
        values.push(region);
    }
    if (province && province !== 'all') {
        conditions.push(`f.province_id = (SELECT province_id FROM provinces WHERE province_name = $${pIndex++})`);
        values.push(province);
    }
    if (district && district !== 'all') {
        conditions.push(`f.district_id = (SELECT district_id FROM districts WHERE district_name = $${pIndex++})`);
        values.push(district);
    }
    if (facility && facility !== 'all') {
        conditions.push(`t.facility_id = $${pIndex++}`); // Assuming facility ID passed
        values.push(facility);
    }

    // Ticket properties
    if (status && status !== 'all') {
        conditions.push(`t.ticket_status = $${pIndex++}`);
        values.push(status);
    }
    if (priority && priority !== 'all') {
        conditions.push(`t.priority = $${pIndex++}`);
        values.push(priority);
    }

    // Role-based Access: Apply location scope filtering
    if (req.user && req.user.locationScope) {
        console.log('User Location Scope:', JSON.stringify(req.user.locationScope));
        const { level, scopes } = req.user.locationScope;

        // TEMPORARILY DISABLED for debugging - will re-enable after verifying user scope assignments
        /*
        // Only apply filtering if user is not national-level
        if (level !== 'national') {
            if (level === 'facility' && scopes.facilities && scopes.facilities.length > 0) {
                conditions.push(`f.facility_id = ANY($${pIndex++})`);
                values.push(scopes.facilities);
            } else if (level === 'district' && scopes.districts && scopes.districts.length > 0) {
                conditions.push(`f.district_id = ANY($${pIndex++})`);
                values.push(scopes.districts);
            } else if (level === 'province' && scopes.provinces && scopes.provinces.length > 0) {
                conditions.push(`f.province_id = ANY($${pIndex++})`);
                values.push(scopes.provinces);
            } else if (level === 'region' && scopes.regions && scopes.regions.length > 0) {
                conditions.push(`p.region_id = ANY($${pIndex++})`);
                values.push(scopes.regions);
            }
        }
        */
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    return { whereClause, values };
};

exports.getOperationsOverview = async (req, res) => {
    try {
        const { whereClause, values } = buildFilters(req);

        // Base Query with Joins for Location filtering
        const joinClause = `
            LEFT JOIN facilities f ON t.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            -- LEFT JOIN regions r ON p.region_id = r.region_id -- Not explicitly needed in SELECT if not grouping by region
        `;

        const responseData = {
            kpis: {
                total_open: 0,
                new_last_7_days: 0,
                avg_response_time_hours: 0,
                avg_resolution_time_hours: 0,
                affected_facilities: 0,
                sla_compliance: 0
            },
            backlog: [],
            trends: [],
            workload: [],
            riskMap: []
        };

        // 1. KPIs
        try {
            // Explicit casting to handle potential string/varchar date columns
            const kpiQuery = `
                SELECT
                    COUNT(*) FILTER (WHERE t.ticket_status NOT IN ('Closed', 'Resolved'))::int as total_open,
                    COUNT(*) FILTER (WHERE t.created_at::TIMESTAMP >= NOW() - INTERVAL '7 days')::int as new_last_7_days,
                    0::NUMERIC(10,2) as avg_response_time_hours, 
                    AVG(
                        EXTRACT(EPOCH FROM ((CASE WHEN t.date_resolved::text = '' THEN NULL ELSE t.date_resolved::TIMESTAMP END) - t.created_at::TIMESTAMP))/3600
                    )::NUMERIC(10,2) as avg_resolution_time_hours,
                    COUNT(DISTINCT t.facility_id) FILTER (WHERE t.ticket_status NOT IN ('Closed', 'Resolved'))::int as affected_facilities,
                    
                    -- Data Quality (Geospatial Completeness)
                    (COUNT(*) FILTER (WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100)::int as data_quality_score,

                    -- SLA Compliance
                    CASE 
                        WHEN COUNT(*) FILTER (WHERE t.ticket_status IN ('Resolved', 'Closed')) = 0 THEN 0
                        ELSE (COUNT(*) FILTER (WHERE ((CASE WHEN t.date_resolved::text = '' THEN NULL ELSE t.date_resolved::TIMESTAMP END) - t.created_at::TIMESTAMP) <= INTERVAL '48 hours' AND t.ticket_status IN ('Resolved', 'Closed'))::float / 
                              COUNT(*) FILTER (WHERE t.ticket_status IN ('Resolved', 'Closed'))) * 100 
                    END as sla_compliance
                FROM tickets t
                ${joinClause}
                ${whereClause}
            `;
            const kpiResult = await db.query(kpiQuery, values);
            if (kpiResult.rows.length > 0) {
                const kpis = kpiResult.rows[0];
                responseData.kpis = {
                    ...kpis,
                    sla_compliance: parseFloat(kpis.sla_compliance || 0).toFixed(1)
                };
            }
        } catch (err) {
            console.error('KPI Query Error:', err.message);
        }

        // 2. Backlog by Age
        try {
            const backlogQuery = `
                SELECT
                    CASE 
                        WHEN NOW() - t.created_at::TIMESTAMP < INTERVAL '7 days' THEN '< 7 Days'
                        WHEN NOW() - t.created_at::TIMESTAMP < INTERVAL '30 days' THEN '7 - 30 Days'
                        ELSE '> 30 Days'
                    END as age_group,
                    COUNT(*)::int as count
                FROM tickets t
                ${joinClause}
                ${whereClause} AND ticket_status NOT IN ('Closed', 'Resolved')
                GROUP BY 1
                ORDER BY 1
            `;
            const backlogResult = await db.query(backlogQuery, values);
            responseData.backlog = backlogResult.rows;
        } catch (err) {
            console.error('Backlog Query Error:', err.message);
        }

        // 3. Ticket Volume Trends
        try {
            const trendQuery = `
                SELECT
                    TO_CHAR(t.created_at::TIMESTAMP, 'YYYY-MM') as month,
                    COUNT(*)::int as count
                FROM tickets t
                ${joinClause}
                ${whereClause}
                GROUP BY 1
                ORDER BY 1 DESC
                LIMIT 12
            `;
            const trendResult = await db.query(trendQuery, values);
            responseData.trends = trendResult.rows.reverse();
        } catch (err) {
            console.error('Trends Query Error:', err.message);
        }

        // 4. Technician Workload
        try {
            const workloadQuery = `
                SELECT
                    COALESCE(assigned_to_name, 'Unassigned') as technician,
                    COUNT(*)::int as count
                FROM tickets t
                ${joinClause}
                ${whereClause} AND ticket_status NOT IN ('Closed', 'Resolved')
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 5
            `;
            const workloadResult = await db.query(workloadQuery, values);
            responseData.workload = workloadResult.rows;
        } catch (err) {
            console.error('Workload Query Error:', err.message);
        }

        // 5. Risk Map Data
        try {
            const riskMapQuery = `
                SELECT
                    t.facility_id,
                    f.facility_name,
                    f.latitude,
                    f.longitude,
                    COUNT(*)::int as open_ticket_count,
                    MAX(case when priority='Critical' then 1 else 0 end)::int as has_critical
                FROM tickets t
                ${joinClause}
                ${whereClause} AND ticket_status NOT IN ('Closed', 'Resolved')
                GROUP BY 1, 2, 3, 4
                HAVING COUNT(*) > 0
            `;
            const riskMapResult = await db.query(riskMapQuery, values);
            responseData.riskMap = riskMapResult.rows;
        } catch (err) {
            console.error('RiskMap Query Error:', err.message);
        }

        res.json(responseData);

    } catch (err) {
        console.error('Operations Overview Critical Error:', err);
        res.status(500).json({ error: 'Server error retrieving operations data' });
    }
};
