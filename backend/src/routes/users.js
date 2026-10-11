const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Get all users (with optional role filter, search, and pagination)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit || req.query.pageSize) || 25));
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE u.is_active = true';
        const queryParams = [];
        let paramIndex = 1;

        const { role, search } = req.query;

        // Filter by role if provided
        if (role && role !== 'all') {
            whereClause += ` AND LOWER(r.role_name) = LOWER($${paramIndex})`;
            queryParams.push(role);
            paramIndex++;
        }

        // Search filter
        if (search) {
            whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Count Total
        const countQuery = `
            SELECT COUNT(*) 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        // Sorting Allowlist
        const sortByAllowlist = {
            username: 'u.username',
            email: 'u.email',
            first_name: 'u.first_name',
            last_name: 'u.last_name',
            role: 'r.role_name',
            created_at: 'u.created_at'
        };
        const sortBy = sortByAllowlist[req.query.sortBy] || 'u.first_name';
        const sortDirection = req.query.sortDirection === 'desc' ? 'DESC' : 'ASC';

        const dataQuery = `
            SELECT
                u.user_id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.phone_number,
                r.role_name as role,
                u.is_active,
                u.created_at,
                u.last_login
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataParams = [...queryParams, limit, offset];
        const result = await db.query(dataQuery, dataParams);

        const users = result.rows.map(user => ({
            ...user,
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
        }));

        res.json({
            success: true,
            users,
            data: users,
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
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users', error: error.message });
    }
});

// Create new user
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            username, email, password, first_name, last_name,
            phone_number, role_id, is_national_access,
            location_level,
            assigned_region_id, assigned_province_id, assigned_district_id, assigned_facility_id,
            accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
        } = req.body;

        // Rigorous field validation
        if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(String(username).trim())) {
            return res.status(400).json({ message: 'Username must be 3-50 characters and contain only letters, numbers, dots, dashes, or underscores' });
        }

        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!email || !emailRegex.test(String(email).trim())) {
            return res.status(400).json({ message: 'Please provide a valid email address (e.g. user@domain.com)' });
        }

        if (!role_id) {
            return res.status(400).json({ message: 'Role selection is required' });
        }

        // Password strength enforcement (min 8 chars, mixed case, number, special char)
        if (!password || String(password).length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain both uppercase and lowercase letters' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one digit (0-9)' });
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one special character (!@#$%^&*...)' });
        }

        // Phone number validation (7 to 15 digits)
        if (phone_number) {
            const digitsOnly = String(phone_number).replace(/\D/g, '');
            if (digitsOnly.length < 7 || digitsOnly.length > 15) {
                return res.status(400).json({ message: 'Phone number must contain between 7 and 15 digits' });
            }
        }

        // Check availability
        const check = await db.query(
            'SELECT 1 FROM users WHERE username = $1 OR email = $2',
            [username.trim(), email.trim()]
        );
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Username or Email already exists' });
        }

        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 10);

        const isNational = Boolean(is_national_access || location_level === 'national');

        let finalRegion = null;
        let finalProvince = null;
        let finalDistrict = null;
        let finalFacility = null;
        let accRegions = null;
        let accProvinces = null;
        let accDistricts = null;
        let accFacilities = null;

        if (!isNational) {
            finalRegion = assigned_region_id ? parseInt(assigned_region_id, 10) : null;
            finalProvince = assigned_province_id ? parseInt(assigned_province_id, 10) : null;
            finalDistrict = assigned_district_id ? parseInt(assigned_district_id, 10) : null;
            finalFacility = assigned_facility_id ? parseInt(assigned_facility_id, 10) : null;

            if (Array.isArray(accessible_regions) && accessible_regions.length > 0) {
                accRegions = accessible_regions.map(Number);
            } else if (finalRegion) {
                accRegions = [finalRegion];
            }

            if (Array.isArray(accessible_provinces) && accessible_provinces.length > 0) {
                accProvinces = accessible_provinces.map(Number);
            } else if (finalProvince) {
                accProvinces = [finalProvince];
            }

            if (Array.isArray(accessible_districts) && accessible_districts.length > 0) {
                accDistricts = accessible_districts.map(Number);
            } else if (finalDistrict) {
                accDistricts = [finalDistrict];
            }

            if (Array.isArray(accessible_facilities) && accessible_facilities.length > 0) {
                accFacilities = accessible_facilities.map(Number);
            } else if (finalFacility) {
                accFacilities = [finalFacility];
            }
        }

        await db.query('BEGIN');

        // Insert User with assigned location columns and accessible arrays
        const userResult = await db.query(`
            INSERT INTO users (
                username, email, password_hash, first_name, last_name, 
                phone_number, role_id, is_active, is_national_access, must_change_password,
                assigned_region_id, assigned_province_id, assigned_district_id, assigned_facility_id,
                accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, true, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING user_id, username
        `, [
            username,
            email || null,
            password_hash,
            first_name,
            last_name,
            phone_number,
            role_id,
            isNational,
            finalRegion,
            finalProvince,
            finalDistrict,
            finalFacility,
            accRegions,
            accProvinces,
            accDistricts,
            accFacilities
        ]);

        const newUser = userResult.rows[0];

        // Synchronize user_scopes table
        if (!isNational) {
            if (accFacilities && accFacilities.length > 0) {
                for (const facId of accFacilities) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, $4, $5)`,
                        [newUser.user_id, finalRegion, finalProvince, finalDistrict, facId]
                    );
                }
            } else if (accDistricts && accDistricts.length > 0) {
                for (const distId of accDistricts) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, $4, null)`,
                        [newUser.user_id, finalRegion, finalProvince, distId]
                    );
                }
            } else if (accProvinces && accProvinces.length > 0) {
                for (const provId of accProvinces) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, null, null)`,
                        [newUser.user_id, finalRegion, provId]
                    );
                }
            } else if (accRegions && accRegions.length > 0) {
                for (const regId of accRegions) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, null, null, null)`,
                        [newUser.user_id, regId]
                    );
                }
            }
        }

        await db.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error creating user', error: error.message });
    }
});

// Get user by ID (Enhanced for Edit)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const userResult = await db.query(`
            SELECT
                u.user_id, u.username, u.email, u.first_name, u.last_name, 
                u.phone_number, u.role_id, u.is_active, u.is_national_access,
                u.last_login,
                u.assigned_region_id, u.assigned_province_id,
                u.assigned_district_id, u.assigned_facility_id,
                u.accessible_regions, u.accessible_provinces, 
                u.accessible_districts, u.accessible_facilities,
                r.role_name as role,
                ARRAY(SELECT region_id FROM user_scopes WHERE user_id = u.user_id AND region_id IS NOT NULL) as scope_regions,
                ARRAY(SELECT province_id FROM user_scopes WHERE user_id = u.user_id AND province_id IS NOT NULL) as scope_provinces,
                ARRAY(SELECT district_id FROM user_scopes WHERE user_id = u.user_id AND district_id IS NOT NULL) as scope_districts,
                ARRAY(SELECT facility_id FROM user_scopes WHERE user_id = u.user_id AND facility_id IS NOT NULL) as scope_facilities
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = $1
        `, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error fetching user', error: error.message });
    }
});

// Update User
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            email, first_name, last_name, phone_number,
            role_id, is_national_access,
            location_level,
            assigned_region_id, assigned_province_id, assigned_district_id, assigned_facility_id,
            accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
        } = req.body;

        if (email) {
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
            if (!emailRegex.test(String(email).trim())) {
                return res.status(400).json({ message: 'Please provide a valid email address (e.g. user@domain.com)' });
            }
        }

        if (phone_number) {
            const digitsOnly = String(phone_number).replace(/\D/g, '');
            if (digitsOnly.length < 7 || digitsOnly.length > 15) {
                return res.status(400).json({ message: 'Phone number must contain between 7 and 15 digits' });
            }
        }

        const isNational = Boolean(is_national_access || location_level === 'national');

        let finalRegion = null;
        let finalProvince = null;
        let finalDistrict = null;
        let finalFacility = null;
        let accRegions = null;
        let accProvinces = null;
        let accDistricts = null;
        let accFacilities = null;

        if (!isNational) {
            finalRegion = assigned_region_id ? parseInt(assigned_region_id, 10) : null;
            finalProvince = assigned_province_id ? parseInt(assigned_province_id, 10) : null;
            finalDistrict = assigned_district_id ? parseInt(assigned_district_id, 10) : null;
            finalFacility = assigned_facility_id ? parseInt(assigned_facility_id, 10) : null;

            if (Array.isArray(accessible_regions) && accessible_regions.length > 0) {
                accRegions = accessible_regions.map(Number);
            } else if (finalRegion) {
                accRegions = [finalRegion];
            }

            if (Array.isArray(accessible_provinces) && accessible_provinces.length > 0) {
                accProvinces = accessible_provinces.map(Number);
            } else if (finalProvince) {
                accProvinces = [finalProvince];
            }

            if (Array.isArray(accessible_districts) && accessible_districts.length > 0) {
                accDistricts = accessible_districts.map(Number);
            } else if (finalDistrict) {
                accDistricts = [finalDistrict];
            }

            if (Array.isArray(accessible_facilities) && accessible_facilities.length > 0) {
                accFacilities = accessible_facilities.map(Number);
            } else if (finalFacility) {
                accFacilities = [finalFacility];
            }
        }

        await db.query('BEGIN');

        // Update User Details including assigned location and accessible arrays
        const updateQuery = `
            UPDATE users SET
                email = $1, first_name = $2, last_name = $3, 
                phone_number = $4, role_id = $5, is_national_access = $6,
                assigned_region_id = $7, assigned_province_id = $8,
                assigned_district_id = $9, assigned_facility_id = $10,
                accessible_regions = $11, accessible_provinces = $12,
                accessible_districts = $13, accessible_facilities = $14
            WHERE user_id = $15
            RETURNING user_id, username
        `;

        const result = await db.query(updateQuery, [
            email, first_name, last_name, phone_number,
            role_id, isNational,
            finalRegion, finalProvince,
            finalDistrict, finalFacility,
            accRegions, accProvinces,
            accDistricts, accFacilities,
            id
        ]);

        if (result.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }

        // Re-synchronize user_scopes
        await db.query('DELETE FROM user_scopes WHERE user_id = $1', [id]);

        if (!isNational) {
            if (accFacilities && accFacilities.length > 0) {
                for (const facId of accFacilities) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, $4, $5)`,
                        [id, finalRegion, finalProvince, finalDistrict, facId]
                    );
                }
            } else if (accDistricts && accDistricts.length > 0) {
                for (const distId of accDistricts) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, $4, null)`,
                        [id, finalRegion, finalProvince, distId]
                    );
                }
            } else if (accProvinces && accProvinces.length > 0) {
                for (const provId of accProvinces) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, $3, null, null)`,
                        [id, finalRegion, provId]
                    );
                }
            } else if (accRegions && accRegions.length > 0) {
                for (const regId of accRegions) {
                    await db.query(
                        `INSERT INTO user_scopes (user_id, region_id, province_id, district_id, facility_id) VALUES ($1, $2, null, null, null)`,
                        [id, regId]
                    );
                }
            }
        }

        await db.query('COMMIT');
        res.json({ message: 'User updated successfully', user: result.rows[0] });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error updating user', error: error.message });
    }
});

// Delete User
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
});

// Update user status (activate/deactivate)
router.post('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const result = await db.query(`
            UPDATE users
            SET is_active = $1
            WHERE user_id = $2
            RETURNING user_id, username, is_active
        `, [is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User status updated', user: result.rows[0] });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reset user password
router.post('/:id/reset-password', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(new_password, 10);

        const result = await db.query(`
            UPDATE users
            SET password_hash = $1, must_change_password = true
            WHERE user_id = $2
            RETURNING user_id, username
        `, [password_hash, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password reset successfully', user: result.rows[0] });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
