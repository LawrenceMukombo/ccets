const db = require('../db');

exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;
        const { filter = 'all' } = req.query;

        // Map recipient_user_id to userId filter
        let query = `
            SELECT 
                notification_id as id,
                ticket_id,
                event_type as type,
                message,
                is_read,
                created_at,
                link
            FROM notifications 
            WHERE recipient_user_id = $1
        `;
        const params = [userId];

        if (filter === 'unread') {
            query += ' AND is_read = false';
        } else if (filter === 'read') {
            query += ' AND is_read = true';
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.user_id || req.user?.userId;

        await db.query(
            'UPDATE notifications SET is_read = true WHERE notification_id = $1 AND recipient_user_id = $2',
            [id, userId]
        );

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;

        await db.query(
            'UPDATE notifications SET is_read = true WHERE recipient_user_id = $1',
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
