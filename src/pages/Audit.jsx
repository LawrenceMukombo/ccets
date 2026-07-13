import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../context/TenantContext';
import { STATUS_COLORS } from '../constants/colors';
import './Audit.css';
import EnterpriseDataTable from '../components/Common/EnterpriseDataTable';

function Audit() {
    const { tenantCode } = useTenant();
    
    // Table states
    const [auditLogs, setAuditLogs] = useState([]);
    const [allLogsForOptions, setAllLogsForOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination & Sort states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    // Filter states
    const [searchFilter, setSearchFilter] = useState('');
    const [filters, setFilters] = useState({
        action: 'all',
        entity: 'all',
        user: 'all'
    });

    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        thisWeek: 0,
        critical: 0
    });

    // 1. Fetch metadata once to populate dropdown options and stats
    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };
            const response = await fetch(`/api/${tenantCode}/audit?limit=200`, { headers });
            const data = await response.json();
            const logs = data.data || data.logs || [];
            setAllLogsForOptions(logs);
            calculateStats(logs);
        } catch (err) {
            console.error('Error fetching audit metadata:', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, [tenantCode]);

    // 2. Fetch active page of data whenever pagination, sorting, or filters change
    useEffect(() => {
        fetchTableData();
    }, [page, pageSize, sortBy, sortDirection, searchFilter, filters]);

    const fetchTableData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortDirection,
                search: searchFilter,
                action: filters.action,
                entity: filters.entity,
                user: filters.user
            });

            const response = await fetch(`/api/${tenantCode}/audit?${params}`, { headers });
            if (!response.ok) {
                throw new Error('Failed to retrieve audit logs from server');
            }
            const data = await response.json();

            setAuditLogs(data.data || data.logs || []);
            setTotalRecords(data.pagination?.totalRecords || (data.data || data.logs || []).length);
            setTotalPages(data.pagination?.totalPages || 1);
            setError(null);
        } catch (err) {
            console.error('Error fetching audit table data:', err);
            setError('Failed to load audit logs. Please try again.');
        } finally {
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

    // Extract unique users for filtering
    const uniqueUsers = useMemo(() => {
        const users = allLogsForOptions.map(log => log.user_name).filter(Boolean);
        return [...new Set(users)].sort();
    }, [allLogsForOptions]);

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/audit/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
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

        if (normalized.includes('create')) return STATUS_COLORS['Resolved'] || '#10b981';
        if (normalized.includes('update')) return STATUS_COLORS['New'] || '#3b82f6';
        if (normalized.includes('delete')) return STATUS_COLORS['Escalated'] || '#ef4444';
        if (normalized.includes('resolv')) return STATUS_COLORS['Resolved'] || '#10b981';
        if (normalized.includes('login')) return STATUS_COLORS['On Hold'] || '#f59e0b';
        if (normalized.includes('assign')) return STATUS_COLORS['Assigned'] || '#8b5cf6';
        if (normalized.includes('view')) return STATUS_COLORS['Assigned'] || '#8b5cf6';

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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchFilter('');
        setFilters({
            action: 'all',
            entity: 'all',
            user: 'all'
        });
        setPage(1);
    };

    // Columns Definition
    const columns = [
        { 
            id: 'created_at', 
            label: 'Timestamp', 
            sortable: true, 
            defaultVisible: true, 
            hideable: false,
            formatter: (val) => formatDate(val)
        },
        { 
            id: 'user_name', 
            label: 'User', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => val || 'System'
        },
        { 
            id: 'action', 
            label: 'Action', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => (
                <span className="action-badge" style={{
                    backgroundColor: getActionColor(val) + '20',
                    color: getActionColor(val),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                }}>
                    {val}
                </span>
            )
        },
        { 
            id: 'entity_type', 
            label: 'Entity', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val, item) => `${val} #${item.entity_id || 'N/A'}`
        },
        { id: 'ip_address', label: 'IP Address', sortable: true, defaultVisible: true }
    ];

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

                {/* Smart Cascade Filters */}
                <div className="filters-section" style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Action</label>
                        <select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="filter-select"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                        >
                            <option value="all">All Actions</option>
                            <option value="Created">Created</option>
                            <option value="Updated">Updated</option>
                            <option value="Deleted">Deleted</option>
                            <option value="Viewed">Viewed</option>
                            <option value="Login">Login</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Entity</label>
                        <select
                            value={filters.entity}
                            onChange={(e) => handleFilterChange('entity', e.target.value)}
                            className="filter-select"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                        >
                            <option value="all">All Entities</option>
                            <option value="Ticket">Tickets</option>
                            <option value="User">Users</option>
                            <option value="Facility">Facilities</option>
                            <option value="Equipment">Equipment</option>
                        </select>
                    </div>

                    {uniqueUsers.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>User</label>
                            <select
                                value={filters.user}
                                onChange={(e) => handleFilterChange('user', e.target.value)}
                                className="filter-select"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                            >
                                <option value="all">All Users</option>
                                {uniqueUsers.map(user => (
                                    <option key={user} value={user}>{user}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Enterprise DataTable */}
                <EnterpriseDataTable
                    tableName="audit_trail"
                    columns={columns}
                    data={auditLogs}
                    loading={loading}
                    error={error}
                    serverSide={true}
                    pagination={{
                        page,
                        pageSize,
                        totalRecords,
                        totalPages,
                        onPageChange: (newPage) => setPage(newPage),
                        onPageSizeChange: (newPageSize) => { setPageSize(newPageSize); setPage(1); }
                    }}
                    sort={{
                        sortBy,
                        sortDirection,
                        onSort: (colId, direction) => { setSortBy(colId); setSortDirection(direction); }
                    }}
                    searchValue={searchFilter}
                    onSearchChange={(val) => { setSearchFilter(val); setPage(1); }}
                    filters={{
                        values: filters,
                        onChange: handleFilterChange,
                        onClear: handleClearFilters
                    }}
                    emptyTitle="No audit logs found"
                    emptyMessage="No activity logs match your selected filter criteria."
                />

                {/* Copyright Footer */}
                <div className="audit-footer" style={{ marginTop: '20px' }}>
                    <p>© {new Date().getFullYear()} CCETS - Cold Chain Equipment Ticketing System</p>
                    <p className="footer-dev">Developed by <a href="mailto:lawrencemukombo2@gmail.com">Lawrence Mukombo</a></p>
                </div>
            </div>
        </div>
    );
}

export default Audit;
