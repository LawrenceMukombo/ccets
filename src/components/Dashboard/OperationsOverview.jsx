import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import './OperationsOverview.css';

const OperationsOverview = ({ filters, onLocationChange }) => {
    const { tenantCode } = useTenant();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Construct query params
                const params = new URLSearchParams();
                if (filters.dateRange?.start) params.append('dateStart', filters.dateRange.start);
                if (filters.dateRange?.end) params.append('dateEnd', filters.dateRange.end);

                // Location filters (use 'all' if not set or null)
                if (filters.location?.region) params.append('region', filters.location.region);
                if (filters.location?.province) params.append('province', filters.location.province);
                if (filters.location?.district) params.append('district', filters.location.district);
                if (filters.location?.facility) params.append('facility', filters.location.facility);

                const token = localStorage.getItem('token');
                const res = await fetch(`/api/${tenantCode}/dashboard/operations?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch operations data');

                const jsonData = await res.json();
                setData(jsonData);
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    if (loading) return <div className="ops-loading">Loading Operations Data...</div>;
    if (error) return <div className="ops-error">{error}</div>;
    if (!data) return null;

    const { kpis, backlog, trends, workload, riskMap } = data;

    const COLORS = ['#3b82f6', '#8b5cf6', '#bbf7d0', '#facc15', '#fb923c', '#f87171'];

    return (
        <div className="ops-overview-container">
            {/* 1. KPI Cards Row */}
            <div className="ops-kpi-row">
                <div className="ops-kpi-card active-tickets">
                    <div className="kpi-label">Total Open Tickets</div>
                    <div className="kpi-value">{kpis.total_open}</div>
                    <div className="kpi-sub">Active Issues</div>
                </div>
                <div className="ops-kpi-card new-tickets">
                    <div className="kpi-label">New (7 Days)</div>
                    <div className="kpi-value">{kpis.new_last_7_days}</div>
                    <div className="kpi-sub">Last 7 Days</div>
                </div>
                <div className="ops-kpi-card avg-response">
                    <div className="kpi-label">Avg Response</div>
                    <div className="kpi-value">{kpis.avg_response_time_hours || 0} h</div>
                    <div className="kpi-sub">Time to Start</div>
                </div>
                <div className="ops-kpi-card avg-resol">
                    <div className="kpi-label">Avg Resolution</div>
                    <div className="kpi-value">{kpis.avg_resolution_time_hours || 0} h</div>
                    <div className="kpi-sub">Time to Close</div>
                </div>
                <div className="ops-kpi-card sla-comp">
                    <div className="kpi-label">SLA Compliance</div>
                    <div className="kpi-value" style={{ color: kpis.sla_compliance < 80 ? '#ef4444' : '#10b981' }}>
                        {kpis.sla_compliance}%
                    </div>
                    <div className="kpi-sub">Target: 90%</div>
                </div>
                <div className="ops-kpi-card affected-fac">
                    <div className="kpi-label">Affected Facilities</div>
                    <div className="kpi-value">{kpis.affected_facilities}</div>
                    <div className="kpi-sub">Currently Impacted</div>
                </div>
                <div className="ops-kpi-card data-qual">
                    <div className="kpi-label">Data Quality</div>
                    <div className="kpi-value">{kpis.data_quality_score || 0}%</div>
                    <div className="kpi-sub">Geospatial Completeness</div>
                </div>
            </div>

            {/* 2. Charts Row */}
            <div className="ops-charts-row">
                {/* Trend Chart */}
                <div className="ops-chart-container extended">
                    <h3>Ticket Volume Trends (Last 12 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} name="Tickets" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Backlog Chart */}
                <div className="ops-chart-container">
                    <h3>Open Ticket Backlog (Age)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={backlog}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="age_group" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" name="Tickets" radius={[4, 4, 0, 0]} barSize={40}>
                                {backlog.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#f59e0b' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Bottom Row: Workload & Risk List */}
            <div className="ops-bottom-row">
                <div className="ops-list-container">
                    <h3>Technician Workload (Top 5)</h3>
                    <table className="ops-table">
                        <thead>
                            <tr>
                                <th>Technician</th>
                                <th>Open Tickets</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workload.map((tech, i) => (
                                <tr key={i}>
                                    <td>{tech.technician}</td>
                                    <td>
                                        <div className="workload-bar-container">
                                            <span style={{ width: '30px' }}>{tech.count}</span>
                                            <div className="workload-bar-bg">
                                                <div
                                                    className="workload-bar-fill"
                                                    style={{ width: `${Math.min(tech.count * 5, 100)}%` }} // Rough scale
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="ops-list-container">
                    <h3>High Risk Facilities (Active Critical/High)</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>Click row to filter dashboard</p>
                    <table className="ops-table">
                        <thead>
                            <tr>
                                <th>Facility</th>
                                <th>Open Tickets</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riskMap.slice(0, 5).map((fac, i) => (
                                <tr
                                    key={i}
                                    onClick={() => onLocationChange('facility', fac.facility_name)}
                                    style={{ cursor: 'pointer' }}
                                    title="Filter dashboard by this facility"
                                    className="interactive-row"
                                >
                                    <td>{fac.facility_name}</td>
                                    <td>{fac.open_ticket_count}</td>
                                    <td>
                                        {fac.has_critical ?
                                            <span className="badge-critical">Critical Risk</span> :
                                            <span className="badge-high">High Load</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            {riskMap.length === 0 && <tr><td colSpan="3">No high risk facilities detected.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OperationsOverview;
