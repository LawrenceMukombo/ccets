const db = require('../db');

// Get all equipment across all facilities
const getEquipment = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit || req.query.pageSize) || 50));
        const offset = (page - 1) * limit;

        const locationScope = req.user?.locationScope;

        let whereClause = 'WHERE e.is_del = false';
        const queryParams = [];
        let paramIndex = 1;

        if (locationScope && locationScope.level !== 'national') {
            const { scopes } = locationScope;
            const conditions = [];

            if (scopes.facilities?.length > 0) {
                conditions.push(`f.facility_id = ANY($${paramIndex})`);
                queryParams.push(scopes.facilities);
                paramIndex++;
            }
            if (scopes.districts?.length > 0) {
                conditions.push(`f.district_id = ANY($${paramIndex})`);
                queryParams.push(scopes.districts);
                paramIndex++;
            }
            if (scopes.provinces?.length > 0) {
                conditions.push(`f.province_id = ANY($${paramIndex})`);
                queryParams.push(scopes.provinces);
                paramIndex++;
            }
            if (scopes.regions?.length > 0) {
                conditions.push(`r.region_id = ANY($${paramIndex})`);
                queryParams.push(scopes.regions);
                paramIndex++;
            }

            if (conditions.length > 0) {
                whereClause += ` AND (${conditions.join(' OR ')})`;
            } else {
                whereClause += ' AND 1=0';
            }
        }

        // Search filter
        if (req.query.search) {
            whereClause += ` AND (e.asset_code ILIKE $${paramIndex} OR e.serial_number ILIKE $${paramIndex} OR e.manufacturer ILIKE $${paramIndex} OR e.model ILIKE $${paramIndex} OR e.item_type ILIKE $${paramIndex} OR f.facility_name ILIKE $${paramIndex})`;
            queryParams.push(`%${req.query.search}%`);
            paramIndex++;
        }

        // Functioning status filter
        if (req.query.status && req.query.status !== 'all') {
            const isFunc = req.query.status === 'functioning' || req.query.status === 'true';
            whereClause += ` AND e.is_functioning = $${paramIndex}`;
            queryParams.push(isFunc);
            paramIndex++;
        }

        // Location cascading filters
        if (req.query.region && req.query.region !== 'all') {
            whereClause += ` AND r.region_name = $${paramIndex}`;
            queryParams.push(req.query.region);
            paramIndex++;
        }

        if (req.query.province && req.query.province !== 'all') {
            whereClause += ` AND p.province_name = $${paramIndex}`;
            queryParams.push(req.query.province);
            paramIndex++;
        }

        if (req.query.district && req.query.district !== 'all') {
            whereClause += ` AND d.district_name = $${paramIndex}`;
            queryParams.push(req.query.district);
            paramIndex++;
        }

        if (req.query.facility && req.query.facility !== 'all') {
            whereClause += ` AND f.facility_name = $${paramIndex}`;
            queryParams.push(req.query.facility);
            paramIndex++;
        }

        // Get Total Count
        const countResult = await db.query(`
            SELECT COUNT(*) 
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN districts d ON f.district_id = d.district_id
            LEFT JOIN regions r ON p.region_id = r.region_id
            ${whereClause}
        `, queryParams);

        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        // Unique facilities that match the current filter (consistent with the result set below)
        const uniqueFacilitiesResult = await db.query(`
            SELECT COUNT(DISTINCT f.facility_id) as unique_facilities
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN districts d ON f.district_id = d.district_id
            LEFT JOIN regions r ON p.region_id = r.region_id
            ${whereClause}
        `, queryParams);
        const uniqueFacilities = parseInt(uniqueFacilitiesResult.rows[0].unique_facilities);

        // Sorting
        const sortByAllowlist = {
            item_type: 'e.item_type',
            manufacturer: 'e.manufacturer',
            model: 'e.model',
            serial_number: 'e.serial_number',
            asset_code: 'e.asset_code',
            is_functioning: 'e.is_functioning',
            facility_name: 'f.facility_name',
            region: 'r.region_name',
            province: 'p.province_name',
            district: 'd.district_name'
        };
        const sortBy = sortByAllowlist[req.query.sortBy] || 'f.facility_name';
        const sortDirection = req.query.sortDirection === 'desc' ? 'DESC' : 'ASC';

        // Get Data
        const dataQuery = `
            SELECT 
                e.*,
                f.facility_name,
                f.facility_code,
                p.province_name as province,
                d.district_name as district,
                r.region_name as region
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN districts d ON f.district_id = d.district_id
            LEFT JOIN regions r ON p.region_id = r.region_id
            ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataParams = [...queryParams, limit, offset];
        const result = await db.query(dataQuery, dataParams);

        res.json({
            success: true,
            count: result.rows.length,
            total: totalRecords,
            uniqueFacilities,
            page,
            totalPages,
            equipment: result.rows,
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
        console.error('Error fetching equipment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch equipment data',
            error: error.message
        });
    }
};

// Get equipment statistics
const getEquipmentStats = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                COUNT(*)::int                                                  AS total_equipment,
                COUNT(CASE WHEN is_functioning = true  THEN 1 END)::int       AS functioning,
                COUNT(CASE WHEN is_functioning = false THEN 1 END)::int       AS not_functioning,
                COUNT(DISTINCT facility_id)::int                              AS facilities_with_equipment
            FROM equipment
        `);

        res.json({
            success: true,
            stats: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching equipment stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch equipment statistics',
            error: error.message
        });
    }
};

module.exports = {
    getEquipment,
    getEquipmentStats
};
