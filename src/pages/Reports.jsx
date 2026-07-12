import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { useTenant } from '../context/TenantContext';
import { STATUS_COLORS, SEMANTIC_COLORS } from '../constants/colors';
import TicketDetailsModal from '../components/TicketDetailsModal';
import Map from './Map';
import './Reports.css';

// Import the hook and component
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';

// Chart Colors matching the platform theme
const CHART_COLORS = [
    STATUS_COLORS['New'],        // Blue
    STATUS_COLORS['Resolved'],   // Emerald
    STATUS_COLORS['Escalated'],  // Red
    STATUS_COLORS['On Hold'],    // Amber
    STATUS_COLORS['Assigned']    // Violet
];

function Reports() {
    const { tenantCode } = useTenant();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'regional', 'equipment', 'operations', 'map'

    // Processed Data
    const [allTickets, setAllTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [techStats, setTechStats] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [faultDistribution, setFaultDistribution] = useState([]);
    const [regionStats, setRegionStats] = useState([]);
    const [provinceStats, setProvinceStats] = useState([]);
    const [modelStats, setModelStats] = useState([]);
    const [priorityStats, setPriorityStats] = useState([]);
    const [facilityStats, setFacilityStats] = useState([]);

    // Interactive State
    const [activeMetric, setActiveMetric] = useState(null); // 'total', 'resolved', 'outstanding', 'technician'
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedTechName, setSelectedTechName] = useState(null);
    const [DrillDownData, setDrillDownData] = useState([]);

    const [kpi, setKpi] = useState({
        total: 0,
        resolved: 0,
        avgTime: 0,
        outstanding: 0
    });

    // Use the custom hook for location filtering
    const {
        filters: locationFilters,
        handleFilterChange,
        options: locationOptions
    } = useLocationFilter(allTickets, {
        regionField: 'region_name',
        provinceField: 'province_name',
        districtField: 'district_name',
        facilityField: 'facility_name'
    });

    // Initial Fetch
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-process on filter changes
    useEffect(() => {
        if (allTickets.length > 0) {
            processData(allTickets);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allTickets, dateRange, customStartDate, customEndDate, statusFilter, priorityFilter, locationFilters]); // Updated dependency

    // Note: No need for manual smart filter population useEffect anymore!

    useEffect(() => {
        if (activeMetric && activeMetric !== 'technician') {
            filterDrillDown(activeMetric);
            setSelectedTechName(null);
        } else if (!activeMetric) {
            setDrillDownData([]);
            setSelectedTechName(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMetric]); // Keep this simple

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const response = await fetch(`/api/${tenantCode}/tickets`, { headers });
            const data = await response.json();
            const tickets = data.tickets || [];

            setAllTickets(tickets);

        } catch (err) {
            console.error("Failed to load reports", err);
            setError("Could not load report data.");
        } finally {
            setLoading(false);
        }
    };

    const processData = (tickets) => {
        let filtered = tickets;

        if (dateRange === 'custom') {
            const start = customStartDate ? new Date(customStartDate) : null;
            const end = customEndDate ? new Date(customEndDate) : null;

            if (start) {
                // Start of day
                start.setHours(0, 0, 0, 0);
                filtered = filtered.filter(t => new Date(t.created_at) >= start);
            }
            if (end) {
                // End of day
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(t => new Date(t.created_at) <= end);
            }
        } else if (dateRange !== 'all') {
            const days = parseInt(dateRange);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            filtered = filtered.filter(t => new Date(t.created_at) >= cutoff);
        }

        // Status Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'open') {
                filtered = filtered.filter(t => !['Resolved', 'Closed'].includes(t.ticket_status));
            } else if (statusFilter === 'closed') {
                filtered = filtered.filter(t => ['Resolved', 'Closed'].includes(t.ticket_status));
            } else {
                filtered = filtered.filter(t => t.ticket_status === statusFilter);
            }
        }

        // Priority Filter
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }

        // Location Filters (Using hook state)
        if (locationFilters.region !== 'all') {
            filtered = filtered.filter(t => t.region_name === locationFilters.region);
        }
        if (locationFilters.province !== 'all') {
            filtered = filtered.filter(t => t.province_name === locationFilters.province);
        }
        if (locationFilters.district !== 'all') {
            filtered = filtered.filter(t => t.district_name === locationFilters.district);
        }
        if (locationFilters.facility !== 'all') {
            filtered = filtered.filter(t => t.facility_name === locationFilters.facility);
        }

        setFilteredTickets(filtered);

        // 1. KPI Calculation
        const resolved = filtered.filter(t => ['Resolved', 'Closed'].includes(t.ticket_status));
        const outstanding = filtered.filter(t => ['New', 'Assigned', 'In Progress', 'Escalated'].includes(t.ticket_status));

        let totalTime = 0;
        resolved.forEach(t => {
            if (t.date_resolved && t.created_at) {
                totalTime += (new Date(t.date_resolved) - new Date(t.created_at)) / (1000 * 3600 * 24);
            }
        });

        setKpi({
            total: filtered.length,
            resolved: resolved.length,
            avgTime: resolved.length ? (totalTime / resolved.length).toFixed(1) : 0,
            outstanding: outstanding.length
        });

        // 2. Technician Performance
        const techMap = {};
        filtered.forEach(t => {
            const tech = t.assigned_to_name || 'Unassigned';
            if (tech === 'Unassigned') return;

            if (!techMap[tech]) techMap[tech] = { name: tech, assigned: 0, resolved: 0, totalResTime: 0 };

            techMap[tech].assigned++;
            if (['Resolved', 'Closed'].includes(t.ticket_status)) {
                techMap[tech].resolved++;
                if (t.date_resolved) {
                    techMap[tech].totalResTime += (new Date(t.date_resolved) - new Date(t.created_at)) / (1000 * 3600 * 24);
                }
            }
        });

        const techArray = Object.values(techMap)
            .map(t => ({
                ...t,
                avgTime: t.resolved ? (t.totalResTime / t.resolved).toFixed(1) : 0,
                efficiency: t.assigned ? Math.round((t.resolved / t.assigned) * 100) : 0
            }))
            .sort((a, b) => b.resolved - a.resolved)
            .slice(0, 5); // Top 5

        setTechStats(techArray);

        // 3. Trends (Daily)
        const trendMap = {};
        filtered.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString();
            if (!trendMap[date]) trendMap[date] = { date, created: 0, resolved: 0 };
            trendMap[date].created++;
            if (['Resolved', 'Closed'].includes(t.ticket_status)) trendMap[date].resolved++;
        });

        const sortedTrend = Object.values(trendMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        setTrendData(sortedTrend);

        // 4. Fault Breakdown
        const faultMap = {};
        filtered.forEach(t => {
            const key = t.equipment_manufacturer || t.equipment_model || 'General Fault';
            if (!faultMap[key]) faultMap[key] = 0;
            faultMap[key]++;
        });

        const faultArray = Object.entries(faultMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        setFaultDistribution(faultArray);

        // 5. Regional Analysis
        const regionMap = {};
        const provinceMap = {};
        filtered.forEach(t => {
            const reg = t.region_name || 'Unknown';
            if (!regionMap[reg]) regionMap[reg] = 0;
            regionMap[reg]++;

            const prov = t.province_name || 'Unknown';
            if (!provinceMap[prov]) provinceMap[prov] = 0;
            provinceMap[prov]++;
        });
        setRegionStats(Object.entries(regionMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
        setProvinceStats(Object.entries(provinceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)); // Top 10

        // 6. Equipment Models
        const modelMap = {};
        filtered.forEach(t => {
            const mod = t.equipment_model || 'Unknown';
            if (!modelMap[mod]) modelMap[mod] = 0;
            modelMap[mod]++;
        });
        setModelStats(Object.entries(modelMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10));

        // 7. Priority Analysis
        const priorityMap = {};
        filtered.forEach(t => {
            const p = t.priority || 'Normal';
            if (!priorityMap[p]) priorityMap[p] = 0;
            priorityMap[p]++;
        });

        // Sort by Severity
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Normal': 0 };
        setPriorityStats(Object.entries(priorityMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => (priorityOrder[b.name] || 0) - (priorityOrder[a.name] || 0))
        );

        // 8. Top Facilities
        const facMap = {};
        filtered.forEach(t => {
            const f = t.facility_name || 'Unknown Facility';
            if (!facMap[f]) facMap[f] = 0;
            facMap[f]++;
        });
        setFacilityStats(Object.entries(facMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10));

    };

    const filterDrillDown = (metricType) => {
        let drilledData = [];
        switch (metricType) {
            case 'total':
                drilledData = filteredTickets;
                break;
            case 'resolved':
                drilledData = filteredTickets.filter(t => ['Resolved', 'Closed'].includes(t.ticket_status));
                break;
            case 'outstanding':
                drilledData = filteredTickets.filter(t => !['Resolved', 'Closed'].includes(t.ticket_status));
                break;
            case 'avgTime':
                // Show resolved tickets to see their times
                drilledData = filteredTickets.filter(t => ['Resolved', 'Closed'].includes(t.ticket_status));
                break;
            default:
                drilledData = [];
        }
        setDrillDownData(drilledData);
    };

    // New handler for technician row clicks
    const handleTechClick = (techName) => {
        const techTickets = filteredTickets.filter(t => t.assigned_to_name === techName);
        // Sort: Active tickets first, then resolved
        const sorted = techTickets.sort((a, b) => {
            const isActiveA = !['Resolved', 'Closed'].includes(a.ticket_status);
            const isActiveB = !['Resolved', 'Closed'].includes(b.ticket_status);
            return isActiveB - isActiveA;
        });

        setDrillDownData(sorted);
        setSelectedTechName(techName); // Store name
        setActiveMetric('technician'); // Set special metric type

        // Smooth scroll to the drill down section
        setTimeout(() => {
            const element = document.querySelector('.drill-down-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const getDateRangeLabel = () => {
        if (dateRange === 'all') return 'all ticket history';
        if (dateRange === 'custom') return 'the selected custom range';
        return `the last ${dateRange} days`;
    };

    const handleExport = () => {
        if (techStats.length === 0) return;
        const headers = ['Technician Name', 'Tickets Assigned', 'Tickets Resolved', 'Efficiency (%)', 'Avg Resolution Time (Days)'];
        const rows = techStats.map(t => [`"${t.name}"`, t.assigned, t.resolved, `${t.efficiency}%`, t.avgTime]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", dateRange === 'all' ? 'technician_performance_report_all_time.csv' : `technician_performance_report_${dateRange}days.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="reports-container">
            <div className="loading-box">
                <div className="spinner"></div>
                <p>Analyzing maintenance data...</p>
            </div>
        </div>
    );

    return (
        <div className="reports-container">
            <div className="reports-header sticky-header-shadow">
                <div className="header-content">
                    <div>
                        <h1>📊 Analytics & Reports</h1>
                        <p className="header-subtitle">Performance insights for {getDateRangeLabel()}</p>
                    </div>
                    <div className="header-actions">
                        <LocationFilter
                            filters={locationFilters}
                            options={locationOptions}
                            onFilterChange={handleFilterChange}
                            compactMode={true}
                        />

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="date-range-select"
                            style={{ marginRight: '8px' }}
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open (Active)</option>
                            <option value="closed">Closed (Resolved)</option>
                            <option value="New">New</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Escalated">Escalated</option>
                            <option value="Resolved">Resolved</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="date-range-select"
                            style={{ marginRight: '8px' }}
                        >
                            <option value="all">All Priorities</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>

                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="date-range-select"
                        >
                            <option value="all">All Time</option>
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="365">Last Year</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {dateRange === 'custom' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="date-input-custom"
                                />
                                <span style={{ display: 'flex', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="date-input-custom"
                                />
                            </div>
                        )}
                        <button className="export-button" onClick={handleExport}>
                            <span>📥</span> Export
                        </button>
                    </div>
                </div>
            </div>

            <div className="reports-content">

                {/* Navigation Tabs */}
                <div className="tabs-navigation">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'regional' ? 'active' : ''}`}
                        onClick={() => setActiveTab('regional')}
                    >
                        Regional Analysis
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('equipment')}
                    >
                        Equipment Insights
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('operations')}
                    >
                        Operations & SLA
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                        onClick={() => setActiveTab('map')}
                    >
                        Geospatial Map
                    </button>
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="tab-content">
                        {/* Interactive KPI Cards */}
                        <div className="metrics-grid">
                            <div
                                className={`metric-card metric-primary ${activeMetric === 'total' ? 'active' : ''}`}
                                onClick={() => setActiveMetric(activeMetric === 'total' ? null : 'total')}
                            >
                                <div className="metric-icon">📋</div>
                                <div className="metric-content">
                                    <p className="metric-label">Total Tickets</p>
                                    <p className="metric-value">{kpi.total}</p>
                                    <p className="metric-subtitle">Click to view all</p>
                                </div>
                            </div>

                            <div
                                className={`metric-card metric-success ${activeMetric === 'resolved' ? 'active' : ''}`}
                                onClick={() => setActiveMetric(activeMetric === 'resolved' ? null : 'resolved')}
                            >
                                <div className="metric-icon">✅</div>
                                <div className="metric-content">
                                    <p className="metric-label">Resolved</p>
                                    <p className="metric-value">{kpi.resolved}</p>
                                    <p className="metric-subtitle">{kpi.total > 0 ? ((kpi.resolved / kpi.total) * 100).toFixed(0) : 0}% success rate</p>
                                </div>
                            </div>

                            <div
                                className={`metric-card metric-info ${activeMetric === 'avgTime' ? 'active' : ''}`}
                                onClick={() => setActiveMetric(activeMetric === 'avgTime' ? null : 'avgTime')}
                            >
                                <div className="metric-icon">⏱️</div>
                                <div className="metric-content">
                                    <p className="metric-label">Avg. Time</p>
                                    <p className="metric-value">{kpi.avgTime}</p>
                                    <p className="metric-subtitle">Days to resolve</p>
                                </div>
                            </div>

                            <div
                                className={`metric-card metric-warning ${activeMetric === 'outstanding' ? 'active' : ''}`}
                                onClick={() => setActiveMetric(activeMetric === 'outstanding' ? null : 'outstanding')}
                            >
                                <div className="metric-icon">⚠️</div>
                                <div className="metric-content">
                                    <p className="metric-label">Outstanding</p>
                                    <p className="metric-value">{kpi.outstanding}</p>
                                    <p className="metric-subtitle">Requires action</p>
                                </div>
                            </div>
                        </div>

                        {/* Drill Down Section - Only shows when a card OR TECHNICIAN is clicked */}
                        {activeMetric && (
                            <div className="drill-down-section fade-in">
                                <div className="section-header">
                                    <h3>
                                        {activeMetric === 'total' && '📋 All Tickets in Period'}
                                        {activeMetric === 'resolved' && '✅ Resolved Tickets'}
                                        {activeMetric === 'outstanding' && '⚠️ Outstanding Issues'}
                                        {activeMetric === 'avgTime' && '⏱️ Resolution Time Analysis'}
                                        {activeMetric === 'technician' && (
                                            <span>
                                                👨‍🔧 Work History for <span style={{ color: '#3b82f6' }}>{selectedTechName}</span>
                                            </span>
                                        )}
                                    </h3>
                                    <button className="close-btn-small" onClick={() => setActiveMetric(null)}>Close View</button>
                                </div>
                                <div className="drill-down-table-container">
                                    <table className="tech-table">
                                        <thead>
                                            <tr>
                                                <th>Ticket #</th>
                                                <th>Facility</th>
                                                <th>Issue</th>
                                                <th>Status</th>
                                                <th>Assigned To</th>
                                                <th>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {DrillDownData.length > 0 ? (
                                                DrillDownData.map(t => (
                                                    <tr key={t.ticket_id} onClick={() => setSelectedTicket(t)} style={{ cursor: 'pointer' }}>
                                                        <td style={{ fontWeight: 'bold', color: STATUS_COLORS['New'] }}>#{t.ticket_reference_number}</td>
                                                        <td>{t.facility_name}</td>
                                                        <td>{t.fault_description}</td>
                                                        <td>
                                                            <span className="status-badge-small" style={{
                                                                backgroundColor: STATUS_COLORS[t.ticket_status] + '20', // 20% opacity
                                                                color: STATUS_COLORS[t.ticket_status],
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                                                            }}>
                                                                {t.ticket_status}
                                                            </span>
                                                        </td>
                                                        <td>{t.assigned_to_name || 'Unassigned'}</td>
                                                        <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No records found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Charts Area */}
                        <div className="charts-row">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Ticket Volume Trends</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={STATUS_COLORS['New']} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={STATUS_COLORS['New']} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={STATUS_COLORS['Resolved']} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={STATUS_COLORS['Resolved']} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="created" stroke={STATUS_COLORS['New']} fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                                        <Area type="monotone" dataKey="resolved" stroke={STATUS_COLORS['Resolved']} fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Issue Distribution</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={faultDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {faultDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend layout="vertical" verticalAlign="bottom" align="center" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Technician Table */}
                        <div className="data-table-container">
                            <div className="table-header-row">
                                <h3>🏆 Top Performing Technicians</h3>
                            </div>
                            <table className="tech-table">
                                <thead>
                                    <tr>
                                        <th>Technician</th>
                                        <th>Assigned</th>
                                        <th>Resolved</th>
                                        <th>Success Rate</th>
                                        <th>Avg Time (Days)</th>
                                        <th>Rank</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {techStats.map((tech, index) => (
                                        <tr key={tech.name} className="tech-row-interactive" onClick={() => handleTechClick(tech.name)}>
                                            <td>
                                                <div className="tech-name">
                                                    <div className="tech-avatar">{tech.name.charAt(0)}</div>
                                                    {tech.name}
                                                </div>
                                            </td>
                                            <td>{tech.assigned}</td>
                                            <td>{tech.resolved}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', width: '60px' }}>
                                                        <div style={{ width: `${tech.efficiency}%`, height: '100%', background: tech.efficiency > 80 ? STATUS_COLORS['Resolved'] : STATUS_COLORS['New'], borderRadius: '3px' }}></div>
                                                    </div>
                                                    <span>{tech.efficiency}%</span>
                                                </div>
                                            </td>
                                            <td>{tech.avgTime}</td>
                                            <td>
                                                {index === 0 && <span className="rank-badge rank-top">🥇 #1 Top Tech</span>}
                                                {index === 1 && <span className="rank-badge rank-mid">🥈 #2</span>}
                                                {index === 2 && <span className="rank-badge rank-mid">🥉 #3</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {techStats.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>No technician data available for this period.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* REGIONAL ANALYSIS TAB */}
                {activeTab === 'regional' && (
                    <div className="tab-content">
                        <div className="charts-row">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Tickets by Region</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={regionStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill={STATUS_COLORS['New']} name="Tickets" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Top 10 Provinces by Volume</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={provinceStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={120} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill={STATUS_COLORS['Escalated']} name="Tickets" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* EQUIPMENT INSIGHTS TAB */}
                {activeTab === 'equipment' && (
                    <div className="tab-content">
                        <div className="charts-row">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Most Problematic Models</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={modelStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={150} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill={STATUS_COLORS['On Hold']} name="Faults" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Fault Distribution Breakdown</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={faultDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {faultDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* OPERATIONS & SLA TAB */}
                {activeTab === 'operations' && (
                    <div className="tab-content">
                        <div className="charts-row">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Ticket Priority Breakdown</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={priorityStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Legend />
                                        <Bar dataKey="value" name="Tickets" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40}>
                                            {priorityStats.map((entry, index) => {
                                                const name = entry.name;
                                                let color = '#94a3b8'; // Default
                                                if (name === 'Critical') color = '#7f1d1d'; // Dark Red
                                                else if (name === 'High') color = '#ef4444'; // Red
                                                else if (name === 'Medium') color = '#f97316'; // Orange
                                                else if (name === 'Low') color = '#22c55e'; // Green
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Top 10 Most Active Facilities</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={facilityStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill={STATUS_COLORS['Assigned']} name="Tickets" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* GEOSPATIAL MAP TAB */}
                {activeTab === 'map' && (
                    <div className="tab-content" style={{ padding: 0 }}>
                        <div style={{ height: 'calc(100vh - 250px)', width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Map tickets={filteredTickets} />
                        </div>
                    </div>
                )}

                {selectedTicket && (
                    <TicketDetailsModal
                        isOpen={true}
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                    />
                )}
            </div>
        </div>
    );
}

export default Reports;
