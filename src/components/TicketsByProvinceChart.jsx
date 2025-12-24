import React, { useState, useEffect } from 'react';
import './TicketsByProvinceChart.css';

const TicketsByProvinceChart = () => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredBar, setHoveredBar] = useState(null);

    useEffect(() => {
        fetchTicketsByProvince();
    }, []);

    const fetchTicketsByProvince = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch('/api/tickets/stats/by-province', { headers });
            const data = await response.json();

            if (data.success) {
                setChartData(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching ticket stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Status colors
    const statusColors = {
        'Open': '#3b82f6',
        'In Progress': '#f59e0b',
        'Resolved': '#10b981',
        'Closed': '#6b7280'
    };

    // Calculate max value for scaling
    const maxTotal = Math.max(...chartData.map(d =>
        (d.open || 0) + (d.in_progress || 0) + (d.resolved || 0) + (d.closed || 0)
    ), 1);

    if (loading) {
        return (
            <div className="chart-container">
                <div className="chart-loading">
                    <div className="spinner"></div>
                    <p>Loading chart...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>📊 Tickets by Province & Status</h3>
                <p className="chart-subtitle">Interactive breakdown of ticket statuses across provinces</p>
            </div>

            <div className="chart-legend">
                {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: color }}></span>
                        <span className="legend-label">{status}</span>
                    </div>
                ))}
            </div>

            <div className="chart-content">
                {chartData.length === 0 ? (
                    <div className="chart-empty">
                        <p>No ticket data available</p>
                    </div>
                ) : (
                    <div className="bars-container vertical">
                        {chartData.map((province, index) => {
                            const open = province.open || 0;
                            const inProgress = province.in_progress || 0;
                            const resolved = province.resolved || 0;
                            const closed = province.closed || 0;
                            const total = open + inProgress + resolved + closed;

                            const openPercent = total > 0 ? (open / total) * 100 : 0;
                            const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
                            const resolvedPercent = total > 0 ? (resolved / total) * 100 : 0;
                            const closedPercent = total > 0 ? (closed / total) * 100 : 0;

                            // Scale bar height relative to max total
                            const barHeightPercent = (total / maxTotal) * 100;

                            return (
                                <div
                                    key={index}
                                    className="bar-column"
                                    onMouseEnter={() => setHoveredBar(index)}
                                    onMouseLeave={() => setHoveredBar(null)}
                                >
                                    <div className="bar-track-vertical" style={{ height: `${barHeightPercent}%` }}>
                                        {/* Stack order: Closed (top) -> Open (bottom) */}
                                        {closed > 0 && (
                                            <div
                                                className="bar-segment"
                                                style={{
                                                    height: `${closedPercent}%`,
                                                    backgroundColor: statusColors['Closed']
                                                }}
                                            >
                                                {closed > maxTotal * 0.05 && <span className="bar-value-vertical">{closed}</span>}
                                            </div>
                                        )}
                                        {resolved > 0 && (
                                            <div
                                                className="bar-segment"
                                                style={{
                                                    height: `${resolvedPercent}%`,
                                                    backgroundColor: statusColors['Resolved']
                                                }}
                                            >
                                                {resolved > maxTotal * 0.05 && <span className="bar-value-vertical">{resolved}</span>}
                                            </div>
                                        )}
                                        {inProgress > 0 && (
                                            <div
                                                className="bar-segment"
                                                style={{
                                                    height: `${inProgressPercent}%`,
                                                    backgroundColor: statusColors['In Progress']
                                                }}
                                            >
                                                {inProgress > maxTotal * 0.05 && <span className="bar-value-vertical">{inProgress}</span>}
                                            </div>
                                        )}
                                        {open > 0 && (
                                            <div
                                                className="bar-segment"
                                                style={{
                                                    height: `${openPercent}%`,
                                                    backgroundColor: statusColors['Open']
                                                }}
                                            >
                                                {open > maxTotal * 0.05 && <span className="bar-value-vertical">{open}</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bar-label-vertical">
                                        <span className="province-name" title={province.province}>{province.province}</span>
                                        <span className="province-total">{total}</span>
                                    </div>

                                    {hoveredBar === index && (
                                        <div className="bar-tooltip">
                                            <div className="tooltip-header">{province.province}</div>
                                            <div className="tooltip-row">
                                                <span style={{ color: statusColors['Open'] }}>●</span>
                                                <span>Open:</span>
                                                <strong>{open}</strong>
                                            </div>
                                            <div className="tooltip-row">
                                                <span style={{ color: statusColors['In Progress'] }}>●</span>
                                                <span>In Progress:</span>
                                                <strong>{inProgress}</strong>
                                            </div>
                                            <div className="tooltip-row">
                                                <span style={{ color: statusColors['Resolved'] }}>●</span>
                                                <span>Resolved:</span>
                                                <strong>{resolved}</strong>
                                            </div>
                                            <div className="tooltip-row">
                                                <span style={{ color: statusColors['Closed'] }}>●</span>
                                                <span>Closed:</span>
                                                <strong>{closed}</strong>
                                            </div>
                                            <div className="tooltip-divider"></div>
                                            <div className="tooltip-row tooltip-total">
                                                <span>Total:</span>
                                                <strong>{total}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsByProvinceChart;
