const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Get all groups with member and permission counts
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                g.group_id,
                g.group_name,
                g.description,
                g.created_at,
                COUNT(DISTINCT ugm.user_id) as member_count,
                COUNT(DISTINCT gp.permission_id) as permission_count
            FROM user_groups g
            LEFT JOIN user_group_members ugm ON g.group_id = ugm.group_id
            LEFT JOIN group_permissions gp ON g.group_id = gp.group_id
            GROUP BY g.group_id, g.group_name, g.description, g.created_at
            ORDER BY g.group_name
        `);

        res.json({ groups: result.rows });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get group by ID with members and permissions
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const groupResult = await db.query(`SELECT * FROM user_groups WHERE group_id = $1`, [id]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const membersResult = await db.query(`
            SELECT u.user_id, u.username, u.first_name, u.last_name, u.email
            FROM user_group_members ugm
            JOIN users u ON ugm.user_id = u.user_id
            WHERE ugm.group_id = $1
        `, [id]);

        const permissionsResult = await db.query(`
            SELECT p.permission_id, p.permission_name, p.description
            FROM group_permissions gp
            JOIN permissions p ON gp.permission_id = p.permission_id
            WHERE gp.group_id = $1
        `, [id]);

        res.json({
            ...groupResult.rows[0],
            members: membersResult.rows,
            permissions: permissionsResult.rows
        });
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new group
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { group_name, description } = req.body;

        const result = await db.query(`
            INSERT INTO user_groups (group_name, description)
            VALUES ($1, $2)
            RETURNING *
        `, [group_name, description]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update group
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { group_name, description } = req.body;

        const result = await db.query(`
            UPDATE user_groups
            SET group_name = $1, description = $2
            WHERE group_id = $3
            RETURNING *
        `, [group_name, description, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete group
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM user_group_members WHERE group_id = $1', [id]);
        await db.query('DELETE FROM group_permissions WHERE group_id = $1', [id]);
        await db.query('DELETE FROM user_groups WHERE group_id = $1', [id]);

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add member to group
router.post('/:id/members', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        await db.query(`
            INSERT INTO user_group_members (group_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [id, user_id]);

        res.json({ message: 'Member added successfully' });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove member from group
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
    try {
        const { id, userId } = req.params;

        await db.query(`
            DELETE FROM user_group_members
            WHERE group_id = $1 AND user_id = $2
        `, [id, userId]);

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
