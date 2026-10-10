import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
    { 
        path: '/dashboard', 
        label: 'Dashboard', 
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
    },
    { 
        path: '/workspace', 
        label: 'My Workspace', 
        icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' 
    },
    { 
        path: '/tickets', 
        label: 'Tickets', 
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' 
    },
    { 
        path: '/repairs', 
        label: 'Repairs', 
        icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z' 
    },
    { 
        path: '/facilities', 
        label: 'Facilities', 
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' 
    },
    { 
        path: '/equipment', 
        label: 'Equipment', 
        icon: 'M20 7h-9M14 17H5M16 21V3M3 21V9m0 12h18M3 9l9-6 9 6' 
    },
    { 
        path: '/map', 
        label: 'Map', 
        icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' 
    },
    { 
        path: '/reports', 
        label: 'Reports', 
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' 
    },
    { 
        path: '/notifications', 
        label: 'Alerts', 
        icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' 
    },
    {
        path: '/audit',
        label: 'Audit',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        roles: ['Administrator', 'National Manager', 'Admin', 'SuperAdmin']
    },
    {
        path: '/user-management',
        label: 'Users',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        roles: ['Administrator', 'National Manager', 'Admin', 'SuperAdmin'],
        permission: 'manage_users'
    },
    { 
        path: '/settings', 
        label: 'Settings', 
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' 
    }
];

const Sidebar = ({ user, isCollapsed, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Filter items based on user role or permissions
    const filteredItems = menuItems.filter(item => {
        if (!item.roles && !item.permission) return true;
        if (!user || !user.role_name) return false;

        const hasRole = item.roles 
            ? item.roles.some(r => r.toLowerCase() === user.role_name?.toLowerCase()) 
            : false;
        const hasPermission = item.permission && user.permissions 
            ? user.permissions.includes(item.permission) 
            : false;

        return hasRole || hasPermission;
    });

    return (
        <aside className={`ccets-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            <div className="sidebar-header">
                {!isCollapsed && <span className="sidebar-section-title">Navigation Menu</span>}
                <button
                    type="button"
                    className="sidebar-collapse-toggle"
                    onClick={toggleSidebar}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isCollapsed ? (
                            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        ) : (
                            <path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                        )}
                    </svg>
                </button>
            </div>

            <nav className="sidebar-nav-list" role="navigation" aria-label="Main Navigation">
                {filteredItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            type="button"
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                            title={isCollapsed ? item.label : undefined}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <span className="sidebar-item-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d={item.icon} />
                                </svg>
                            </span>
                            {!isCollapsed && (
                                <span className="sidebar-item-label">{item.label}</span>
                            )}
                            {isActive && <span className="sidebar-active-indicator" />}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button
                    type="button"
                    className="sidebar-footer-toggle-btn"
                    onClick={toggleSidebar}
                    title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isCollapsed ? (
                            <path d="M9 18l6-6-6-6" />
                        ) : (
                            <path d="M15 18l-6-6 6-6" />
                        )}
                    </svg>
                    {!isCollapsed && <span>Collapse Sidebar</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
