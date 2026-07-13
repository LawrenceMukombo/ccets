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
            accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
        } = req.body;

        // Basic validation
        if (!username || !password || !role_id) {
            return res.status(400).json({ message: 'Username, password and role are required' });
        }

        // Check availability
        const check = await db.query(
            'SELECT 1 FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Username or Email already exists' });
        }

        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 10);

        await db.query('BEGIN');

        // Insert User with location access
        const userResult = await db.query(`
            INSERT INTO users (
                username, email, password_hash, first_name, last_name, 
                phone_number, role_id, is_active, is_national_access, must_change_password,
                accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, true, $9, $10, $11, $12)
            RETURNING user_id, username
        `, [
            username,
            email || null,
            password_hash,
            first_name,
            last_name,
            phone_number,
            role_id,
            is_national_access || false,
            accessible_regions || null,
            accessible_provinces || null,
            accessible_districts || null,
            accessible_facilities || null
        ]);

        const newUser = userResult.rows[0];

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

        // Fetch User Details with location access
        // Added last_login
        const userResult = await db.query(`
            SELECT
                u.user_id, u.username, u.email, u.first_name, u.last_name, 
                u.phone_number, u.role_id, u.is_active, u.is_national_access,
                u.last_login,
                u.accessible_regions, u.accessible_provinces, 
                u.accessible_districts, u.accessible_facilities,
                r.role_name as role
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
            accessible_regions, accessible_provinces, accessible_districts, accessible_facilities
        } = req.body;

        await db.query('BEGIN');

        // Update User Details including location access
        const updateQuery = `
            UPDATE users SET
                email = $1, first_name = $2, last_name = $3, 
                phone_number = $4, role_id = $5, is_national_access = $6,
                accessible_regions = $7, accessible_provinces = $8,
                accessible_districts = $9, accessible_facilities = $10
            WHERE user_id = $11
            RETURNING user_id, username
        `;

        const result = await db.query(updateQuery, [
            email, first_name, last_name, phone_number,
            role_id, is_national_access,
            accessible_regions || null, accessible_provinces || null,
            accessible_districts || null, accessible_facilities || null,
            id
        ]);

        if (result.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
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
