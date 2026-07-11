import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { STATUS_COLORS } from '../constants/colors';
import './Audit.css';

function Audit() {
    const { tenantCode } = useTenant();
    const [auditLogs, setAuditLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        action: 'all',
        user: 'all',
        entity: 'all',
        search: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [users, setUsers] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        thisWeek: 0,
        critical: 0
    });

    useEffect(() => {
        fetchAuditLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!loading) {
            applyFilters();
        }
    }, [filters, auditLogs, sortConfig, loading]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`/api/${tenantCode}/audit?limit=200`, { headers });

            if (response.ok) {
                const data = await response.json();
                const logs = data.logs || [];
                setAuditLogs(logs);
                setFilteredLogs(logs);

                // Extract unique users
                const uniqueUsers = [...new Set(logs.map(log => log.user_name).filter(Boolean))];
                setUsers(uniqueUsers.sort());

                // Calculate stats
                calculateStats(logs);
                setLoading(false);
            } else {
                const errData = await response.json().catch(() => ({}));
                console.error('Audit fetch error:', errData);
                setError(errData.message || errData.error || 'Failed to load audit logs');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Could not connect to audit service: ' + err.message);
            setLoading(false);
        }
    };

    const calculateStats = (logs) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayCount = logs.filter(l => new Date(l.created_at) >= today).length;
        const weekCount = logs.filter(l => new Date(l.created_at) >= weekAgo).length;
        const criticalCount = logs.filter(l => ['Deleted', 'Login'].includes(l.action)).length;

        setStats({
            total: logs.length,
            today: todayCount,
            thisWeek: weekCount,
            critical: criticalCount
        });
    };

    const applyFilters = () => {
        let filtered = [...auditLogs];

        if (filters.action !== 'all') {
            filtered = filtered.filter(log => log.action === filters.action);
        }

        if (filters.user !== 'all') {
            filtered = filtered.filter(log => log.user_name === filters.user);
        }

        if (filters.entity !== 'all') {
            filtered = filtered.filter(log => log.entity_type === filters.entity);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(log =>
                log.user_name?.toLowerCase().includes(searchLower) ||
                log.action?.toLowerCase().includes(searchLower) ||
                log.entity_type?.toLowerCase().includes(searchLower) ||
                log.ip_address?.toLowerCase().includes(searchLower)
            );
        }

        // Apply Sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle string comparisons case-insensitively
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredLogs(filtered);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/audit/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                // Convert to CSV
                const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
                const rows = data.logs.map(log => [
                    new Date(log.created_at).toLocaleString(),
                    log.user_name || 'System',
                    log.action,
                    log.entity_type,
                    log.entity_id || '',
                    log.ip_address || ''
                ]);

                const csvContent = "data:text/csv;charset=utf-8,"
                    + headers.join(",") + "\n"
                    + rows.map(e => e.map(v => `"${v}"`).join(",")).join("\n");

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const getActionColor = (action) => {
        if (!action) return '#64748b';
        const normalized = action.toLowerCase();

        if (normalized.includes('create')) return STATUS_COLORS['Resolved']; // Greenish
        if (normalized.includes('update')) return STATUS_COLORS['New']; // Blueish
        if (normalized.includes('delete')) return STATUS_COLORS['Escalated']; // Reddish
        if (normalized.includes('resolv')) return STATUS_COLORS['Resolved']; // Greenish
        if (normalized.includes('login')) return STATUS_COLORS['On Hold']; // Orangeish
        if (normalized.includes('assign')) return STATUS_COLORS['Assigned']; // Yellowish
        if (normalized.includes('view')) return STATUS_COLORS['Assigned'];

        return '#64748b';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="audit-container">
                <div className="loading-box">
                    <div className="spinner"></div>
                    <p>Loading audit trail...</p>
                </div>
            </div>
        );
    }



    // Helper to render sort arrow
    const renderSortArrow = (key) => {
        if (sortConfig.key !== key) return null;
        return <span style={{ marginLeft: '4px' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className="audit-container">
            <div className="audit-header sticky-header">
                <div className="header-content">
                    <div>
                        <h1>🔍 Audit Trail</h1>
                        <p className="header-subtitle">Complete system activity monitoring</p>
                    </div>
                    <button className="export-button" onClick={handleExport}>
                        📥 Export Logs
                    </button>
                </div>
            </div>

            <div className="audit-content">
                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card stat-primary">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <p className="stat-label">Total Events</p>
                            <p className="stat-value">{stats.total}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-success">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <p className="stat-label">Today</p>
                            <p className="stat-value">{stats.today}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-info">
                        <div className="stat-icon">📆</div>
                        <div className="stat-content">
                            <p className="stat-label">This Week</p>
                            <p className="stat-value">{stats.thisWeek}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-warning">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-content">
                            <p className="stat-label">Critical Actions</p>
                            <p className="stat-value">{stats.critical}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters-section">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)}>
                        <option value="all">All Actions</option>
                        <option value="Created">Created</option>
                        <option value="Updated">Updated</option>
                        <option value="Deleted">Deleted</option>
                        <option value="Viewed">Viewed</option>
                        <option value="Login">Login</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Resolved">Resolved</option>
                    </select>

                    <select value={filters.entity} onChange={(e) => handleFilterChange('entity', e.target.value)}>
                        <option value="all">All Entities</option>
                        <option value="Ticket">Tickets</option>
                        <option value="User">Users</option>
                        <option value="Facility">Facilities</option>
                        <option value="Equipment">Equipment</option>
                    </select>

                    {users.length > 0 && (
                        <select value={filters.user} onChange={(e) => handleFilterChange('user', e.target.value)}>
                            <option value="all">All Users</option>
                            {users.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    )}

                    <div className="results-count">
                        Showing {filteredLogs.length} of {auditLogs.length} logs
                    </div>
                </div>

                {error && <div className="error-banner">⚠️ {error}</div>}

                {/* Audit Table */}
                {filteredLogs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>No audit logs found</p>
                        <span>Try adjusting your filters</span>
                    </div>
                ) : (
                    <div className="audit-table-container">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                                        Timestamp {renderSortArrow('created_at')}
                                    </th>
                                    <th onClick={() => handleSort('user_name')} style={{ cursor: 'pointer' }}>
                                        User {renderSortArrow('user_name')}
                                    </th>
                                    <th onClick={() => handleSort('action')} style={{ cursor: 'pointer' }}>
                                        Action {renderSortArrow('action')}
                                    </th>
                                    <th onClick={() => handleSort('entity_type')} style={{ cursor: 'pointer' }}>
                                        Entity {renderSortArrow('entity_type')}
                                    </th>
                                    <th onClick={() => handleSort('ip_address')} style={{ cursor: 'pointer' }}>
                                        IP Address {renderSortArrow('ip_address')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="audit-row">
                                        <td className="timestamp">{formatDate(log.created_at)}</td>
                                        <td className="user-name">{log.user_name || 'System'}</td>
                                        <td>
                                            <span className="action-badge" style={{
                                                backgroundColor: getActionColor(log.action) + '20',
                                                color: getActionColor(log.action),
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>{log.entity_type} #{log.entity_id || 'N/A'}</td>
                                        <td className="ip-address">{log.ip_address || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                }

                {/* Copyright Footer */}
                <div className="audit-footer">
                    <p>© {new Date().getFullYear()} CCETS - Cold Chain Equipment Ticketing System</p>
                    <p className="footer-dev">Developed by <a href="mailto:lawrencemukombo2@gmail.com">Lawrence Mukombo</a></p>
                </div>
            </div >

            {selectedTicket && (
                <TicketDetailsModal
                    isOpen={true}
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )
            }
        </div >
    );
}

export default Audit;
