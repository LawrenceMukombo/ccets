const db = require('../db');

/**
 * Location-Based Access Control Middleware
 * 
 * Uses existing users table columns:
 * - is_national_access
 * - accessible_regions
 * - accessible_provinces
 * - accessible_districts
 * - accessible_facilities
 */

const attachLocationScope = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Fetch user with location access from database
        const userResult = await db.query(`
            SELECT 
                u.is_national_access,
                u.assigned_region_id,
                u.assigned_province_id,
                u.assigned_district_id,
                u.assigned_facility_id,
                r.role_name,
                ARRAY(SELECT region_id FROM user_scopes WHERE user_id = u.user_id AND region_id IS NOT NULL) as scope_regions,
                ARRAY(SELECT province_id FROM user_scopes WHERE user_id = u.user_id AND province_id IS NOT NULL) as scope_provinces,
                ARRAY(SELECT district_id FROM user_scopes WHERE user_id = u.user_id AND district_id IS NOT NULL) as scope_districts,
                ARRAY(SELECT facility_id FROM user_scopes WHERE user_id = u.user_id AND facility_id IS NOT NULL) as scope_facilities
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                code: 'USER_NOT_REGISTERED_IN_TENANT',
                message: `User account (ID: ${userId}) is not registered in ${req.tenant?.name || req.tenant?.code || 'this country workspace'}. Access denied.`
            });
        }

        const user = userResult.rows[0];

        // National access check
        if (user.is_national_access) {
            req.user.locationScope = { level: 'national', scopes: {} };
            return next();
        }

        // Check role for national access (case-insensitive and role_id fallback)
        const nationalRoles = ['admin', 'administrator', 'system administrator', 'national manager', 'national helpdesk', 'super admin', 'national officer'];
        const userRoleLower = (user.role_name || user.role || '').toLowerCase().trim();
        if (nationalRoles.includes(userRoleLower) || user.role_id === 1 || user.role_id === 2) {
            req.user.locationScope = { level: 'national', scopes: {} };
            return next();
        }

        // Build scopes from assigned columns AND user_scopes
        const regions = [...(user.scope_regions || [])];
        if (user.assigned_region_id) regions.push(user.assigned_region_id);

        const provinces = [...(user.scope_provinces || [])];
        if (user.assigned_province_id) provinces.push(user.assigned_province_id);

        const districts = [...(user.scope_districts || [])];
        if (user.assigned_district_id) districts.push(user.assigned_district_id);

        const facilities = [...(user.scope_facilities || [])];
        if (user.assigned_facility_id) facilities.push(user.assigned_facility_id);

        const scopes = {
            regions: [...new Set(regions)],
            provinces: [...new Set(provinces)],
            districts: [...new Set(districts)],
            facilities: [...new Set(facilities)]
        };

        // Determine primary scope level (most restrictive)
        let level = 'national';
        if (scopes.facilities.length > 0) level = 'facility';
        else if (scopes.districts.length > 0) level = 'district';
        else if (scopes.provinces.length > 0) level = 'province';
        else if (scopes.regions.length > 0) level = 'region';

        // If no scopes at all and not national, deny access
        if (level === 'national' && !user.is_national_access) {
            return res.status(403).json({
                message: 'No location access assigned. Contact administrator.'
            });
        }

        req.user.locationScope = { level, scopes };

        next();
    } catch (error) {
        console.error('Error fetching location scope:', error);
        res.status(500).json({ message: 'Error checking access permissions' });
    }
};

/**
 * Generate WHERE clause SQL conditions based on user's location scope
 *
 * @param {object} locationScope - From req.user.locationScope
 * @param {string} tableAlias - SQL table alias (e.g., 't' for tickets, 'f' for facilities)
 * @param {number} startIndex - Starting $N placeholder index (default 1). Pass your current
 *                              queryParams.length + 1 to avoid collisions when merging params.
 * @returns {object} { condition: string, params: array }
 */
const buildLocationFilter = (locationScope, tableAlias = 't', startIndex = 1) => {
    if (!locationScope || locationScope.level === 'national') {
        return { condition: '', params: [] };
    }

    const { level, scopes } = locationScope;
    const conditions = [];
    const params = [];
    let paramIndex = startIndex;

    if (level === 'facility' && scopes.facilities && scopes.facilities.length > 0) {
        conditions.push(`${tableAlias}.facility_id = ANY($${paramIndex})`);
        params.push(scopes.facilities);
        paramIndex++;
    } else if (level === 'district' && scopes.districts && scopes.districts.length > 0) {
        conditions.push(`${tableAlias}.district_id = ANY($${paramIndex})`);
        params.push(scopes.districts);
        paramIndex++;
    } else if (level === 'province' && scopes.provinces && scopes.provinces.length > 0) {
        conditions.push(`${tableAlias}.province_id = ANY($${paramIndex})`);
        params.push(scopes.provinces);
        paramIndex++;
    } else if (level === 'region' && scopes.regions && scopes.regions.length > 0) {
        conditions.push(`${tableAlias}.region_id = ANY($${paramIndex})`);
        params.push(scopes.regions);
        paramIndex++;
    }

    const condition = conditions.length > 0 ? ` AND (${conditions.join(' OR ')})` : '';

    return { condition, params };
};


module.exports = {
    attachLocationScope,
    buildLocationFilter
};
