const db = require('../db');

exports.getAllFacilities = async (req, res) => {
    try {
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

        const result = await db.query(`
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

            ORDER BY 2 ASC -- Order by facility_name
        `, queryParams);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching facilities:', error);
        res.status(500).json({ message: 'Server error fetching facilities' });
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
        res.status(500).json({ message: 'Server error fetching facility' });
    }
};

exports.getFacilityEquipment = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM equipment WHERE facility_id = $1', [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ message: 'Server error fetching equipment' });
    }
};

exports.getRegions = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM regions ORDER BY region_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ message: 'Server error fetching regions' });
    }
};

exports.getProvinces = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM provinces ORDER BY province_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({ message: 'Server error fetching provinces' });
    }
};

exports.getDistricts = async (req, res) => {
    const { provinceId } = req.params;
    try {
        const result = await db.query('SELECT * FROM districts WHERE province_id = $1 ORDER BY district_name ASC', [provinceId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ message: 'Server error fetching districts' });
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
        res.status(500).json({ message: 'Server error fetching statistics' });
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
        res.status(500).json({ message: 'Server error fetching facilities' });
    }
};
