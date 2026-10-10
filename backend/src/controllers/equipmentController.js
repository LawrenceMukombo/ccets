const db = require('../db');

// Get all equipment across all facilities
const getEquipment = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit || req.query.pageSize) || 50));
        const offset = (page - 1) * limit;

        const locationScope = req.user?.locationScope;

        let whereClause = 'WHERE (e.is_del IS NOT TRUE)';
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
            WHERE (is_del IS NOT TRUE)
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

const createEquipment = async (req, res) => {
    try {
        const {
            facility_id,
            item_class,
            item_type,
            manufacturer,
            model,
            serial_number,
            asset_code,
            year_installed,
            energy_source,
            is_functioning
        } = req.body;

        if (!facility_id) {
            return res.status(400).json({ success: false, message: 'Facility is required.' });
        }

        if (serial_number && serial_number.trim()) {
            const dup = await db.query('SELECT equipment_id FROM equipment WHERE serial_number = $1 AND (is_del IS NOT TRUE) LIMIT 1', [serial_number.trim()]);
            if (dup.rows.length > 0) {
                return res.status(400).json({ success: false, message: `Equipment with serial number '${serial_number}' already exists.` });
            }
        }

        const functioning = is_functioning !== false;

        const result = await db.query(`
            INSERT INTO equipment (
                facility_id, item_class, item_type, manufacturer, model,
                serial_number, asset_code, year_installed, energy_source, is_functioning
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            parseInt(facility_id, 10),
            item_class ? item_class.trim() : 'Cold Chain',
            item_type ? item_type.trim() : null,
            manufacturer ? manufacturer.trim() : null,
            model ? model.trim() : null,
            serial_number ? serial_number.trim() : null,
            asset_code ? asset_code.trim() : null,
            year_installed ? parseInt(year_installed, 10) : null,
            energy_source ? energy_source.trim() : null,
            functioning
        ]);

        res.status(201).json({
            success: true,
            message: 'Equipment registered successfully.',
            equipment: result.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating equipment:', error);
        res.status(500).json({ success: false, message: 'Failed to create equipment', error: error.message });
    }
};

const updateEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            facility_id,
            item_class,
            item_type,
            manufacturer,
            model,
            serial_number,
            asset_code,
            year_installed,
            energy_source,
            is_functioning
        } = req.body;

        if (serial_number && serial_number.trim()) {
            const dup = await db.query('SELECT equipment_id FROM equipment WHERE serial_number = $1 AND equipment_id != $2 AND (is_del IS NOT TRUE) LIMIT 1', [serial_number.trim(), id]);
            if (dup.rows.length > 0) {
                return res.status(400).json({ success: false, message: `Serial number '${serial_number}' is already assigned to another equipment.` });
            }
        }

        const functioning = is_functioning !== false;

        const result = await db.query(`
            UPDATE equipment SET
                facility_id = COALESCE($1, facility_id),
                item_class = $2,
                item_type = $3,
                manufacturer = $4,
                model = $5,
                serial_number = $6,
                asset_code = $7,
                year_installed = $8,
                energy_source = $9,
                is_functioning = $10
            WHERE equipment_id = $11
            RETURNING *
        `, [
            facility_id ? parseInt(facility_id, 10) : null,
            item_class ? item_class.trim() : 'Cold Chain',
            item_type ? item_type.trim() : null,
            manufacturer ? manufacturer.trim() : null,
            model ? model.trim() : null,
            serial_number ? serial_number.trim() : null,
            asset_code ? asset_code.trim() : null,
            year_installed ? parseInt(year_installed, 10) : null,
            energy_source ? energy_source.trim() : null,
            functioning,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipment not found.' });
        }

        res.json({
            success: true,
            message: 'Equipment updated successfully.',
            equipment: result.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating equipment:', error);
        res.status(500).json({ success: false, message: 'Failed to update equipment', error: error.message });
    }
};

const deleteEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE equipment SET is_del = true WHERE equipment_id = $1', [id]);
        res.json({ success: true, message: 'Equipment removed successfully.' });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        res.status(500).json({ success: false, message: 'Failed to delete equipment', error: error.message });
    }
};

module.exports = {
    getEquipment,
    getEquipmentStats,
    createEquipment,
    updateEquipment,
    deleteEquipment
};

