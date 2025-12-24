const db = require('../db');

// Get all equipment across all facilities
const getEquipment = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
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

        // Get Total Count
        // Count query does not need LIMIT/OFFSET parameters, reusing queryParams is safe.
        const countResult = await db.query(`
            SELECT COUNT(*) 
            FROM equipment e
            LEFT JOIN facilities f ON e.facility_id = f.facility_id
            LEFT JOIN provinces p ON f.province_id = p.province_id
            LEFT JOIN regions r ON p.region_id = r.region_id
            ${whereClause}
        `, queryParams);

        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get Total Facility Count (all facilities in system)
        const uniqueFacilitiesResult = await db.query(`
            SELECT COUNT(*) as unique_facilities
            FROM facilities
        `);

        const uniqueFacilities = parseInt(uniqueFacilitiesResult.rows[0].unique_facilities);

        // Get Data
        // Add Limit and Offset to params. Spread existing queryParams then add Limit and Offset.
        const dataParams = [...queryParams, limit, offset];
        // paramIndex for LIMIT is (queryParams.length + 1), OFFSET is (queryParams.length + 2)
        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;

        const result = await db.query(`
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
            ORDER BY f.facility_name ASC, e.item_type ASC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `, dataParams);

        res.json({
            success: true,
            count: result.rows.length,
            total: totalRecords,
            uniqueFacilities,
            page,
            totalPages,
            equipment: result.rows
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
        const result = await db.query('SELECT COUNT(*) as total_facilities FROM facilities');

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
