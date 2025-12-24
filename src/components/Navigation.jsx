import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

import UserProfileModal from './UserProfileModal';
import { useSocket } from '../hooks/useSocket';

function Navigation({ user: propUser, onLogout, theme, toggleTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfile, setShowProfile] = useState(false);

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications, unreadCount, markAllRead } = useSocket(propUser?.user_id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).user_id : null));

    // Use prop user if available, fallback to localStorage scan
    const [localUser, setLocalUser] = useState(() => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });

    const user = propUser || localUser;

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            // Fallback if no prop provided
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { path: '/workspace', label: 'My Workspace', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { path: '/tickets', label: 'Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        { path: '/repairs', label: 'Repairs', icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z' },
        { path: '/facilities', label: 'Facilities', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { path: '/equipment', label: 'Equipment', icon: 'M20 7h-9M14 17H5M16 21V3M3 21V9m0 12h18M3 9l9-6 9 6' },
        { path: '/map', label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
        { path: '/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { path: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        {
            path: '/audit',
            label: 'Audit',
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
            roles: ['Administrator', 'National Manager']
        },
        {
            path: '/user-management',
            label: 'User Management',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            roles: ['Administrator', 'National Manager'],
            permission: 'manage_users'
        },
    ];

    // Filter items based on user role or permissions
    const filteredItems = menuItems.filter(item => {
        if (!item.roles && !item.permission) return true; // Public item
        if (!user || !user.role_name) return false; // No user/role loaded yet

        const hasRole = item.roles ? item.roles.includes(user.role_name) : false;
        const hasPermission = item.permission && user.permissions ? user.permissions.includes(item.permission) : false;

        return hasRole || hasPermission;
    });

    return (
        <>
            <nav className="top-navigation">
                <div className="nav-container">
                    <div className="nav-brand">
                        <div className="brand-icon">
                            <img src="/png_emblem.png" alt="PNG Emblem" style={{ width: '40px', height: 'auto' }} />
                        </div>
                        <div className="brand-text">
                            <h1>PNG CCETS</h1>
                            <p>Cold Chain Equipment Ticketing System</p>
                        </div>
                    </div>

                    <div className="nav-menu">
                        {filteredItems.map((item) => (
                            <button
                                key={item.path}
                                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d={item.icon} />
                                </svg>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="nav-user">
                        {/* Theme Toggle */}
                        {toggleTheme && (
                            <button
                                className="nav-item theme-toggle-btn"
                                onClick={toggleTheme}
                                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                                style={{ padding: '8px', borderRadius: '50%', marginRight: '8px', border: 'none', background: 'transparent' }}
                            >
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                        )}

                        {/* Notification Bell */}
                        <div className="notification-bell" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}

                            {showNotifications && (
                                <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                                    {notifications.length === 0 ? (
                                        <div className="notif-empty">No new notifications</div>
                                    ) : (
                                        notifications.map((n, i) => (
                                            <div key={i} className="notif-item">
                                                <div>{n.message}</div>
                                                <span className="notif-date">{new Date(n.timestamp).toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                    <div
                                        className="notif-footer"
                                        onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                                        style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #e2e8f0', cursor: 'pointer', color: '#0284c7', fontSize: '13px', fontWeight: '500' }}
                                    >
                                        View All Notifications
                                    </div>
                                </div>
                            )}
                        </div>

                        <div
                            className="user-info"
                            onClick={() => setShowProfile(true)}
                            title="View Profile"
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="user-name">{user?.first_name || user?.username || 'User'}</span>
                            <span className="user-role">{user?.role_name || 'User'}</span>
                        </div>
                        <button className="logout-button" onClick={handleLogout} title="Logout">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>
            {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
        </>
    );
}

export default Navigation;
