import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

function Notifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all'); // all, read, unread
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            } else {
                setError('Failed to load notifications');
            }
        } catch (e) {
            console.error(e);
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id || n.notification_id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            console.error(e);
        }
    };

    const handleNotificationClick = (notification) => {
        // Navigate if link or ticket_id exists
        if (notification.link) {
            navigate(notification.link);
        } else if (notification.ticket_id) {
            navigate(`/tickets/${notification.ticket_id}`);
        }

        // Also mark as read if unread
        if (!notification.is_read) {
            const id = notification.id || notification.notification_id;
            if (id) markAsRead(id);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'read') return n.is_read;
        if (filter === 'unread') return !n.is_read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div className="notifications-container">
            <div className="notifications-header">
                <h2>Notifications</h2>
                {unreadCount > 0 && (
                    <button className="mark-all-btn" onClick={markAllRead}>
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="notifications-tabs">
                <button
                    className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`tab-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    Unread ({unreadCount})
                </button>
                <button
                    className={`tab-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    Read
                </button>
            </div>

            <div className="notifications-list">
                {filteredNotifications.length === 0 ? (
                    <div className="empty-state">No notifications found</div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id || notification.notification_id}
                            className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                            style={{ cursor: (notification.link || notification.ticket_id) ? 'pointer' : 'default' }}
                        >
                            <div className="notification-icon">
                                {notification.type === 'ticket_created' && '🎫'}
                                {notification.type === 'ticket_assigned' && '👤'}
                                {notification.type === 'ticket_updated' && '📝'}
                                {notification.type === 'ticket_resolved' && '✅'}
                                {!['ticket_created', 'ticket_assigned', 'ticket_updated', 'ticket_resolved'].includes(notification.type) && '🔔'}
                            </div>
                            <div className="notification-content">
                                <p className="notification-message">{notification.message}</p>
                                <p className="notification-time">{formatDate(notification.created_at)}</p>
                            </div>
                            {!notification.is_read && (
                                <button className="mark-read-btn" onClick={(e) => markAsRead(notification.id || notification.notification_id, e)}>
                                    Mark read
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Notifications;
