const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Get all permissions (categorized)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                permission_id,
                permission_name,
                description,
                category,
                is_system
            FROM permissions
            ORDER BY category, permission_name
        `);

        // Group by category
        const categorized = result.rows.reduce((acc, perm) => {
            const cat = perm.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(perm);
            return acc;
        }, {});

        res.json({ permissions: result.rows, categorized });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new permission
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { permission_name, description, category } = req.body;

        if (!permission_name || !category) {
            return res.status(400).json({ message: 'Permission name and category are required' });
        }

        const result = await db.query(`
            INSERT INTO permissions (permission_name, description, category, is_system)
            VALUES ($1, $2, $3, false)
            RETURNING *
        `, [permission_name, description, category]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new role
router.post('/roles', authMiddleware, async (req, res) => {
    try {
        const { role_name, description } = req.body;

        if (!role_name) {
            return res.status(400).json({ message: 'Role name is required' });
        }

        const result = await db.query(`
            INSERT INTO roles (role_name, description)
            VALUES ($1, $2)
            RETURNING *
        `, [role_name, description]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get permission matrix (roles × permissions)
router.get('/matrix', authMiddleware, async (req, res) => {
    try {
        const rolesResult = await db.query('SELECT * FROM roles ORDER BY role_name');
        const permsResult = await db.query('SELECT * FROM permissions ORDER BY category, permission_name');
        const mappingsResult = await db.query('SELECT role_id, permission_id FROM role_permissions');

        const matrix = {};
        mappingsResult.rows.forEach(row => {
            if (!matrix[row.role_id]) matrix[row.role_id] = [];
            matrix[row.role_id].push(row.permission_id);
        });

        res.json({
            roles: rolesResult.rows,
            permissions: permsResult.rows,
            matrix
        });
    } catch (error) {
        console.error('Error fetching permission matrix:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update role permissions (batch)
router.post('/roles/:roleId', authMiddleware, async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permission_ids } = req.body;

        await db.query('BEGIN');

        await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

        for (const permId of permission_ids) {
            await db.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
            `, [roleId, permId]);
        }

        await db.query('COMMIT');

        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating permissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Toggle specific permission for role
router.post('/roles/:roleId/toggle/:permissionId', authMiddleware, async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;

        const existing = await db.query(`
            SELECT * FROM role_permissions
            WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);

        if (existing.rows.length > 0) {
            await db.query(`
                DELETE FROM role_permissions
                WHERE role_id = $1 AND permission_id = $2
            `, [roleId, permissionId]);
            res.json({ action: 'removed', granted: false });
        } else {
            await db.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
            `, [roleId, permissionId]);
            res.json({ action: 'added', granted: true });
        }
    } catch (error) {
        console.error('Error toggling permission:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's effective permissions (role + group + overrides)
router.get('/users/:userId/effective', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await db.query(`
            SELECT DISTINCT p.*
            FROM permissions p
            WHERE p.permission_id IN (
                SELECT rp.permission_id
                FROM users u
                JOIN role_permissions rp ON u.role_id = rp.role_id
                WHERE u.user_id = $1
                
                UNION
                
                SELECT gp.permission_id
                FROM user_group_members ugm
                JOIN group_permissions gp ON ugm.group_id = gp.group_id
                WHERE ugm.user_id = $1
                
                UNION
                
                SELECT up.permission_id
                FROM user_permissions up
                WHERE up.user_id = $1
            )
            ORDER BY p.category, p.permission_name
        `, [userId]);

        res.json({ permissions: result.rows });
    } catch (error) {
        console.error('Error fetching effective permissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
