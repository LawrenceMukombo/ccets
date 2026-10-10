const db = require('../db');

exports.getAllFacilities = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit || req.query.pageSize) || 50));
        const offset = (page - 1) * limit;

        const locationScope = req.user?.locationScope;

        // LBAC Filter Construction
        let mainWhere = 'WHERE 1=1';
        let ghostWhere = 'WHERE 1=1';
        let queryParams = [];
        let paramIndex = 1;

        if (locationScope && locationScope.level !== 'national') {
            const { scopes } = locationScope;
            const mainConditions = [];
            const ghostConditions = [];

            if (scopes.facilities && scopes.facilities.length > 0) {
                mainConditions.push(`f.facility_id = ANY($${paramIndex})`);
                ghostConditions.push(`t.facility_id = ANY($${paramIndex})`);
                queryParams.push(scopes.facilities);
                paramIndex++;
            }
            if (scopes.districts && scopes.districts.length > 0) {
                mainConditions.push(`f.district_id = ANY($${paramIndex})`);
                ghostConditions.push(`t.district_id = ANY($${paramIndex})`);
                queryParams.push(scopes.districts);
                paramIndex++;
            }
            if (scopes.provinces && scopes.provinces.length > 0) {
                mainConditions.push(`f.province_id = ANY($${paramIndex})`);
                ghostConditions.push(`t.province_id = ANY($${paramIndex})`);
                queryParams.push(scopes.provinces);
                paramIndex++;
            }
            if (scopes.regions && scopes.regions.length > 0) {
                mainConditions.push(`r.region_id = ANY($${paramIndex})`);
                ghostConditions.push(`r.region_id = ANY($${paramIndex})`);
                queryParams.push(scopes.regions);
                paramIndex++;
            }

            if (mainConditions.length > 0) {
                mainWhere += ' AND (' + mainConditions.join(' OR ') + ')';
                ghostWhere += ' AND (' + ghostConditions.join(' OR ') + ')';
            }
        }

        // Build outer query filters
        let outerWhere = 'WHERE 1=1';

        // search filter
        if (req.query.search) {
            outerWhere += ` AND (uf.facility_name ILIKE $${paramIndex} OR uf.facility_code ILIKE $${paramIndex})`;
            queryParams.push(`%${req.query.search}%`);
            paramIndex++;
        }

        // status filter
        if (req.query.status && req.query.status !== 'all') {
            const isFunc = req.query.status === 'functioning' || req.query.status === 'true';
            outerWhere += ` AND uf.is_functioning = $${paramIndex}`;
            queryParams.push(isFunc);
            paramIndex++;
        }

        // location cascading filters
        if (req.query.region && req.query.region !== 'all') {
            outerWhere += ` AND uf.region = $${paramIndex}`;
            queryParams.push(req.query.region);
            paramIndex++;
        }

        if (req.query.province && req.query.province !== 'all') {
            outerWhere += ` AND uf.province = $${paramIndex}`;
            queryParams.push(req.query.province);
            paramIndex++;
        }

        if (req.query.district && req.query.district !== 'all') {
            outerWhere += ` AND uf.district = $${paramIndex}`;
            queryParams.push(req.query.district);
            paramIndex++;
        }

        // Count query
        const countQuery = `
            SELECT COUNT(*) FROM (
                -- Real Facilities
                SELECT 
                    f.facility_id,
                    f.facility_name,
                    f.facility_code,
                    f.type,
                    f.is_functioning,
                    p.province_name as province,
                    d.district_name as district,
                    r.region_name as region
                FROM facilities f
                LEFT JOIN provinces p ON f.province_id = p.province_id
                LEFT JOIN districts d ON f.district_id = d.district_id
                LEFT JOIN regions r ON p.region_id = r.region_id
                ${mainWhere}

                UNION ALL

                -- Implied Facilities from Tickets (Ghosts)
                SELECT
                    t.facility_id,
                    'Facility #' || t.facility_id as facility_name,
                    'UNKNOWN' as facility_code,
                    'Unknown' as type,
                    NULL as is_functioning,
                    p.province_name as province,
                    d.district_name as district,
                    r.region_name as region
                FROM (
                    SELECT DISTINCT ON (facility_id)
                        facility_id,
                        province_id,
                        district_id,
                        region_id
                    FROM tickets
                    WHERE facility_id IS NOT NULL
                    AND facility_id NOT IN (SELECT facility_id FROM facilities)
                ) t
                LEFT JOIN provinces p ON t.province_id = p.province_id
                LEFT JOIN districts d ON t.district_id = d.district_id
                LEFT JOIN regions r ON t.region_id = r.region_id
                ${ghostWhere}
            ) uf
            ${outerWhere}
        `;

        const countResult = await db.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        // Sorting
        const sortByAllowlist = {
            facility_name: 'uf.facility_name',
            facility_code: 'uf.facility_code',
            type: 'uf.type',
            is_functioning: 'uf.is_functioning',
            province: 'uf.province',
            district: 'uf.district',
            region: 'uf.region',
            equipment_count: 'uf.equipment_count'
        };
        const sortBy = sortByAllowlist[req.query.sortBy] || 'uf.facility_name';
        const sortDirection = req.query.sortDirection === 'desc' ? 'DESC' : 'ASC';

        // Data query
        const dataQuery = `
            SELECT * FROM (
                -- Real Facilities
                SELECT 
                    f.facility_id,
                    f.facility_name,
                    f.facility_code,
                    f.type,
                    f.is_functioning,
                    f.gps_coordinates,
                    f.latitude,
                    f.longitude,
                    f.external_id,
                    f.source_system,
                    p.province_name as province,
                    d.district_name as district,
                    r.region_name as region,
                    (SELECT COUNT(*) FROM equipment e WHERE e.facility_id = f.facility_id) as equipment_count
                FROM facilities f
                LEFT JOIN provinces p ON f.province_id = p.province_id
                LEFT JOIN districts d ON f.district_id = d.district_id
                LEFT JOIN regions r ON p.region_id = r.region_id
                ${mainWhere}

                UNION ALL

                -- Implied Facilities from Tickets (Ghosts)
                SELECT
                    t.facility_id,
                    'Facility #' || t.facility_id as facility_name,
                    'UNKNOWN' as facility_code,
                    'Unknown' as type,
                    NULL as is_functioning,
                    NULL as gps_coordinates,
                    NULL as latitude,
                    NULL as longitude,
                    NULL as external_id,
                    'Manual' as source_system,
                    p.province_name as province,
                    d.district_name as district,
                    r.region_name as region,
                    (SELECT COUNT(*) FROM equipment e WHERE e.facility_id = t.facility_id) as equipment_count
                FROM (
                    SELECT DISTINCT ON (facility_id)
                        facility_id,
                        province_id,
                        district_id,
                        region_id
                    FROM tickets
                    WHERE facility_id IS NOT NULL
                    AND facility_id NOT IN (SELECT facility_id FROM facilities)
                ) t
                LEFT JOIN provinces p ON t.province_id = p.province_id
                LEFT JOIN districts d ON t.district_id = d.district_id
                LEFT JOIN regions r ON t.region_id = r.region_id
                ${ghostWhere}
            ) uf
            ${outerWhere}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataParams = [...queryParams, limit, offset];
        const result = await db.query(dataQuery, dataParams);

        // Keep direct array support for backward compatibility with older pages, but provide full pagination object
        res.json({
            success: true,
            facilities: result.rows,
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
        console.error('Error fetching facilities:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch facilities: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getFacilityById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM facilities WHERE facility_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Facility not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching facility:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch facility: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getFacilityEquipment = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM equipment WHERE facility_id = $1', [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch equipment: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getRegions = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM regions ORDER BY region_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch regions: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getProvinces = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM provinces ORDER BY province_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch provinces: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getDistricts = async (req, res) => {
    const { provinceId } = req.params;
    try {
        const result = await db.query('SELECT * FROM districts WHERE province_id = $1 ORDER BY district_name ASC', [provinceId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch districts: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const promises = [
            db.query('SELECT COUNT(*) FROM facilities'),
            db.query('SELECT COUNT(*) FROM equipment'),
            db.query('SELECT COUNT(*) FROM facilities WHERE is_functioning = true'),
            db.query('SELECT COUNT(*) FROM equipment WHERE is_functioning = true')
        ];

        const [facCount, eqCount, facFunc, eqFunc] = await Promise.all(promises);

        const stats = {
            totalFacilities: parseInt(facCount.rows[0].count),
            totalEquipment: parseInt(eqCount.rows[0].count),
            functioningFacilities: parseInt(facFunc.rows[0].count),
            functioningEquipment: parseInt(eqFunc.rows[0].count)
        };

        stats.facilityFunctionalityRate = stats.totalFacilities ? Math.round((stats.functioningFacilities / stats.totalFacilities) * 100) : 0;
        stats.equipmentFunctionalityRate = stats.totalEquipment ? Math.round((stats.functioningEquipment / stats.totalEquipment) * 100) : 0;

        res.json(stats);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch statistics: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.getFacilitiesByDistrict = async (req, res) => {
    const { districtId } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                f.facility_id,
                f.facility_name,
                f.facility_code,
                f.type,
                f.is_functioning,
                (SELECT COUNT(*) FROM equipment e WHERE e.facility_id = f.facility_id) as equipment_count
            FROM facilities f
            WHERE f.district_id = $1
            ORDER BY f.facility_name ASC
        `, [districtId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching facilities by district:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch facilities by district: ${error.message}`, 
            error: error.message 
        });
    }
};

exports.createFacility = async (req, res) => {
    try {
        const {
            facility_name,
            facility_code,
            type,
            region_id,
            province_id,
            district_id,
            latitude,
            longitude,
            gps_coordinates,
            is_functioning
        } = req.body;

        if (!facility_name || !facility_name.trim()) {
            return res.status(400).json({ success: false, message: 'Facility name is required.' });
        }

        if (facility_code && facility_code.trim()) {
            const dup = await db.query('SELECT facility_id FROM facilities WHERE facility_code = $1 LIMIT 1', [facility_code.trim()]);
            if (dup.rows.length > 0) {
                return res.status(400).json({ success: false, message: `Facility code '${facility_code}' already exists.` });
            }
        }

        const coords = gps_coordinates || (latitude && longitude ? `${latitude},${longitude}` : null);
        const lat = latitude !== undefined && latitude !== '' ? Number(latitude) : null;
        const lng = longitude !== undefined && longitude !== '' ? Number(longitude) : null;
        const functioning = is_functioning !== false;

        const result = await db.query(`
            INSERT INTO facilities (
                facility_name, facility_code, type, region_id, province_id, district_id,
                latitude, longitude, gps_coordinates, is_functioning
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            facility_name.trim(),
            facility_code ? facility_code.trim() : null,
            type ? type.trim() : null,
            region_id ? parseInt(region_id, 10) : null,
            province_id ? parseInt(province_id, 10) : null,
            district_id ? parseInt(district_id, 10) : null,
            lat,
            lng,
            coords,
            functioning
        ]);

        res.status(201).json({
            success: true,
            message: 'Facility created successfully.',
            facility: result.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating facility:', error);
        res.status(500).json({ success: false, message: 'Failed to create facility', error: error.message });
    }
};

exports.updateFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            facility_name,
            facility_code,
            type,
            region_id,
            province_id,
            district_id,
            latitude,
            longitude,
            gps_coordinates,
            is_functioning
        } = req.body;

        if (!facility_name || !facility_name.trim()) {
            return res.status(400).json({ success: false, message: 'Facility name is required.' });
        }

        if (facility_code && facility_code.trim()) {
            const dup = await db.query('SELECT facility_id FROM facilities WHERE facility_code = $1 AND facility_id != $2 LIMIT 1', [facility_code.trim(), id]);
            if (dup.rows.length > 0) {
                return res.status(400).json({ success: false, message: `Facility code '${facility_code}' is already assigned to another facility.` });
            }
        }

        const coords = gps_coordinates || (latitude && longitude ? `${latitude},${longitude}` : null);
        const lat = latitude !== undefined && latitude !== '' ? Number(latitude) : null;
        const lng = longitude !== undefined && longitude !== '' ? Number(longitude) : null;
        const functioning = is_functioning !== false;

        const result = await db.query(`
            UPDATE facilities SET
                facility_name = $1,
                facility_code = $2,
                type = $3,
                region_id = $4,
                province_id = $5,
                district_id = $6,
                latitude = $7,
                longitude = $8,
                gps_coordinates = $9,
                is_functioning = $10
            WHERE facility_id = $11
            RETURNING *
        `, [
            facility_name.trim(),
            facility_code ? facility_code.trim() : null,
            type ? type.trim() : null,
            region_id ? parseInt(region_id, 10) : null,
            province_id ? parseInt(province_id, 10) : null,
            district_id ? parseInt(district_id, 10) : null,
            lat,
            lng,
            coords,
            functioning,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Facility not found.' });
        }

        res.json({
            success: true,
            message: 'Facility updated successfully.',
            facility: result.rows[0],
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating facility:', error);
        res.status(500).json({ success: false, message: 'Failed to update facility', error: error.message });
    }
};

exports.deleteFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const equipCheck = await db.query('SELECT COUNT(*) FROM equipment WHERE facility_id = $1 AND (is_del IS NOT TRUE)', [id]);
        if (parseInt(equipCheck.rows[0].count, 10) > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete facility: it has ${equipCheck.rows[0].count} active equipment items assigned to it.`
            });
        }
        const ticketCheck = await db.query('SELECT COUNT(*) FROM tickets WHERE facility_id = $1', [id]);
        if (parseInt(ticketCheck.rows[0].count, 10) > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete facility: it has ${ticketCheck.rows[0].count} tickets linked to it.`
            });
        }

        await db.query('DELETE FROM facilities WHERE facility_id = $1', [id]);
        res.json({ success: true, message: 'Facility deleted successfully.' });
    } catch (error) {
        console.error('Error deleting facility:', error);
        res.status(500).json({ success: false, message: 'Failed to delete facility', error: error.message });
    }
};

