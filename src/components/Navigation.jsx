import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

import UserProfileModal from './UserProfileModal';
import { useSocket } from '../hooks/useSocket';
import { useTenant } from '../context/TenantContext';
import { useOffline } from '../context/OfflineContext';

function Navigation({ user: propUser, onLogout, onSwitchCountry, theme, toggleTheme, isSidebarCollapsed, toggleSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfile, setShowProfile] = useState(false);
    const [emblemFailed, setEmblemFailed] = useState(false);
    const { tenantCode, config, platformContext } = useTenant();
    const { isOnline, pendingCount, isSyncing, triggerSync } = useOffline();

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications, unreadCount, markAllRead } = useSocket(propUser?.user_id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).user_id : null));

    // Country Switcher Dropdown State
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const countryDropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
                setShowCountryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const defaultTenants = [
        { code: 'png', name: 'Papua New Guinea' },
        { code: 'zambia', name: 'Zambia' },
        { code: 'malawi', name: 'Malawi' }
    ];
    const availableTenants = (platformContext?.tenants && platformContext.tenants.length > 0)
        ? platformContext.tenants
        : defaultTenants;

    const getCountryFlag = (code) => {
        const c = String(code || '').toLowerCase();
        if (c === 'png') return '🇵🇬';
        if (c === 'zambia') return '🇿🇲';
        if (c === 'malawi') return '🇲🇼';
        return '🌍';
    };

    const handleSelectCountry = (newCode) => {
        setShowCountryDropdown(false);
        if (newCode?.toLowerCase() === tenantCode?.toLowerCase()) return;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.setItem('tenantCode', newCode);
        window.location.href = '/login';
    };

    // Use prop user if available, fallback to localStorage scan
    const [localUser, setLocalUser] = useState(() => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });

    const user = propUser || localUser;

    React.useEffect(() => { setEmblemFailed(false); }, [config?.emblem]);

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

    return (
        <>
            <nav className="top-navigation">
                <div className="nav-container">
                    <div className="nav-brand" style={{ flex: '0 0 auto' }}>
                        {toggleSidebar && (
                            <button
                                type="button"
                                className="sidebar-hamburger-btn"
                                onClick={toggleSidebar}
                                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                aria-label="Toggle navigation menu"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    marginRight: '10px',
                                    flexShrink: 0
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                            </button>
                        )}
                        <div className="brand-icon" aria-hidden="true">
                            {config?.emblem && !emblemFailed ? (
                                <img src={config.emblem} alt="" onError={() => setEmblemFailed(true)} />
                            ) : (
                                <span>{(config?.name || 'CCETS').slice(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="brand-text">
                            <h1 title={(config?.name || 'CCETS') + ' CCETS'}>{config?.name?.toUpperCase() === 'PAPUA NEW GUINEA' ? 'PNG' : config?.name?.toUpperCase() || 'CCETS'} CCETS</h1>
                            <p>Cold Chain Equipment Ticketing System</p>
                        </div>
                    </div>

                    <div className="nav-user">
                        {/* Country Switcher Dropdown */}
                        {platformContext?.deploymentMode !== 'standalone_country' && (
                            <div className="tenant-switcher-container" ref={countryDropdownRef} style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className="nav-item switch-country-pill"
                                    onClick={() => setShowCountryDropdown(prev => !prev)}
                                    title="Switch Country Workspace"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        background: 'rgba(255, 255, 255, 0.16)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        color: '#ffffff',
                                        fontSize: '0.82rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginRight: '8px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <span style={{ fontSize: '1rem' }}>{getCountryFlag(tenantCode)}</span>
                                    <span>{config?.name || tenantCode?.toUpperCase() || 'Country'}</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>▼</span>
                                </button>

                                {showCountryDropdown && (
                                    <div
                                        className="country-dropdown-menu"
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 8px)',
                                            right: 0,
                                            background: 'var(--card-bg, #ffffff)',
                                            color: 'var(--text-primary, #0f172a)',
                                            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                                            borderRadius: '12px',
                                            minWidth: '220px',
                                            zIndex: 1100,
                                            border: '1px solid var(--border-color, #e2e8f0)',
                                            padding: '6px 0',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            padding: '8px 16px',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            color: '#64748b',
                                            letterSpacing: '0.5px',
                                            borderBottom: '1px solid var(--border-color, #e2e8f0)'
                                        }}>
                                            Switch Country Workspace
                                        </div>
                                        {availableTenants.map(t => {
                                            const isCurrent = t.code?.toLowerCase() === tenantCode?.toLowerCase();
                                            return (
                                                <button
                                                    key={t.code}
                                                    type="button"
                                                    onClick={() => handleSelectCountry(t.code)}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '10px 16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: isCurrent ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                                                        color: isCurrent ? '#0284c7' : 'inherit',
                                                        fontWeight: isCurrent ? '700' : '500',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '0.88rem'
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>{getCountryFlag(t.code)}</span>
                                                        <span>{t.name || t.code?.toUpperCase()}</span>
                                                    </span>
                                                    {isCurrent && <span style={{ color: '#0284c7', fontWeight: 'bold' }}>✓</span>}
                                                </button>
                                            );
                                        })}
                                        <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: '4px', paddingTop: '4px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCountryDropdown(false);
                                                    if (onSwitchCountry) {
                                                        onSwitchCountry();
                                                    } else {
                                                        window.location.href = '/switch';
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '8px 16px',
                                                    color: '#64748b',
                                                    fontSize: '0.8rem',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <span>⇄</span> All Countries (Portal Home)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Offline Status Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
                            <span 
                                className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}
                                style={{ 
                                    background: isOnline ? '#e6f4ea' : '#fce8e6', 
                                    color: isOnline ? '#137333' : '#c5221f',
                                    border: `1px solid ${isOnline ? '#34a853' : '#ea4335'}`,
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span style={{ 
                                    width: '6px', 
                                    height: '6px', 
                                    borderRadius: '50%', 
                                    background: isOnline ? '#34a853' : '#ea4335',
                                    display: 'inline-block'
                                }}></span>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>

                            {!isOnline && pendingCount > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#c5221f', fontWeight: '500' }}>
                                    ({pendingCount} queued)
                                </span>
                            )}

                            {isOnline && pendingCount > 0 && (
                                <button 
                                    className="btn btn-primary"
                                    onClick={triggerSync}
                                    disabled={isSyncing}
                                    style={{ 
                                        padding: '4px 10px', 
                                        fontSize: '0.75rem', 
                                        borderRadius: '6px',
                                        background: '#0284c7',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isSyncing ? '🔄 Syncing...' : `⚡ Sync (${pendingCount})`}
                                </button>
                            )}
                        </div>

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
