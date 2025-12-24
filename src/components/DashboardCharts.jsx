import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import './DashboardCharts.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];

const DashboardCharts = () => {
    const [equipmentData, setEquipmentData] = useState([]);
    const [faultData, setFaultData] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [healthData, setHealthData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const [equipRes, faultRes, trendsRes, healthRes] = await Promise.all([
                fetch('/api/tickets/stats/equipment-distribution', { headers }),
                fetch('/api/tickets/stats/fault-categories', { headers }),
                fetch('/api/tickets/stats/monthly-trends', { headers }),
                fetch('/api/tickets/stats/equipment-health', { headers })
            ]);

            const [equipData, faultData, trendsData, healthData] = await Promise.all([
                equipRes.json(),
                faultRes.json(),
                trendsRes.json(),
                healthRes.json()
            ]);

            console.log('Equipment Data:', equipData);
            console.log('Fault Data:', faultData);
            console.log('Trends Data:', trendsData);
            console.log('Health Data:', healthData);

            if (equipData.success) setEquipmentData(equipData.data);
            if (faultData.success) setFaultData(faultData.data);
            if (trendsData.success) setTrendsData(trendsData.data);
            if (healthData.success) setHealthData(healthData.data);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="charts-loading">
                <div className="spinner"></div>
                <p>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-charts">
            {/* Row 1: Equipment Distribution & Fault Categories */}
            <div className="charts-row">
                {/* Equipment Type Distribution - Donut Chart */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h3>🔧 Equipment Distribution</h3>
                        <p>Types of equipment in system</p>
                    </div>
                    <div className="chart-content">
                        {equipmentData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={equipmentData}
                                        dataKey="count"
                                        nameKey="item_type"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        label={({ item_type, percent }) => `${item_type}: ${(percent * 100).toFixed(0)}%`}
                                        labelLine={true}
                                    >
                                        {equipmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No equipment data available</div>
                        )}
                    </div>
                </div>

                {/* Top Fault Categories - Horizontal Bar Chart */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h3>⚠️ Top Fault Categories</h3>
                        <p>Most common equipment issues</p>
                    </div>
                    <div className="chart-content">
                        {faultData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={faultData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" fontSize={11} />
                                    <YAxis dataKey="fault_category" type="category" width={120} fontSize={11} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No fault data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Monthly Trends */}
            <div className="charts-row">
                <div className="chart-card chart-card-full">
                    <div className="chart-card-header">
                        <h3>📈 Monthly Ticket Trends</h3>
                        <p>Last 6 months breakdown by priority</p>
                    </div>
                    <div className="chart-content">
                        {trendsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" fontSize={11} />
                                    <YAxis fontSize={11} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="high_priority" name="High Priority" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="medium_priority" name="Medium Priority" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="low_priority" name="Low Priority" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No trends data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Equipment Health by Region */}
            <div className="charts-row">
                <div className="chart-card chart-card-full">
                    <div className="chart-card-header">
                        <h3>🏥 Equipment Health by Region</h3>
                        <p>Functioning vs not functioning equipment per region</p>
                    </div>
                    <div className="chart-content">
                        {healthData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={healthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="region" fontSize={11} />
                                    <YAxis fontSize={11} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="functioning" name="Functioning" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="not_functioning" name="Not Functioning" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No equipment health data available</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
