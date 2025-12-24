import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import './Dashboard.css';
import '../pages/Tickets.css'; // inherit badge styles
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import FacilityPopupContent from '../components/FacilityPopupContent';
import MapLegend from '../components/MapLegend';
import TicketsByProvinceChart from '../components/TicketsByProvinceChart';
import OperationsOverview from '../components/Dashboard/OperationsOverview';

import DashboardCharts from '../components/DashboardCharts';
import TicketsTable from '../components/TicketsTable';
// Modals
import TicketDetailsModal from '../components/TicketDetailsModal';
import AssignTicketModal from '../components/AssignTicketModal';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-measure';

// Leaflet Icon Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- HELPER FUNCTIONS ---

const getEffectiveStatus = (ticket) => {
    const s = ticket.status || ticket.ticket_status || 'New';
    return s === 'Pending Assignment' ? 'New' : s;
};

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

const MeasureControl = () => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        // Only add the control once
        if (!map._measureControlAdded && L.Control.Measure) {
            const measureControl = new L.Control.Measure({ position: 'topleft' });
            measureControl.addTo(map);
            map._measureControlAdded = true;
            return () => {
                if (map._measureControlAdded) {
                    map.removeControl(measureControl);
                    map._measureControlAdded = false;
                }
            };
        }
    }, []); // Empty dependency array - only run once
    return null;
};

// Locate control (GPS/My Location)
const LocateControl = () => {
    const map = useMap();
    useEffect(() => {
        const locateButton = L.control({ position: 'topleft' });
        locateButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="#" title="Find my location" class="locate-button" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:18px;">📍</a>`;
            div.onclick = function (e) {
                e.preventDefault();
                map.locate({ setView: true, maxZoom: 13 });
            };
            return div;
        };
        locateButton.addTo(map);
        map.on('locationfound', (e) => {
            L.circle(e.latlng, { radius: e.accuracy / 2 }).addTo(map);
            L.marker(e.latlng).addTo(map).bindPopup("You are within " + Math.round(e.accuracy) + " meters from this point").openPopup();
        });
        map.on('locationerror', () => alert('Location access denied or unavailable'));
        return () => { locateButton.remove(); };
    }, [map]);
    return null;
};

// Fullscreen control
const FullscreenControl = () => {
    const map = useMap();
    useEffect(() => {
        const fullscreenButton = L.control({ position: 'topleft' });
        fullscreenButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="#" title="Toggle fullscreen" class="fullscreen-button" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px;">⛶</a>`;
            div.onclick = function (e) {
                e.preventDefault();
                const container = map.getContainer().parentElement;
                if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(err => console.log(err));
                } else {
                    document.exitFullscreen();
                }
            };
            return div;
        };
        fullscreenButton.addTo(map);
        return () => { fullscreenButton.remove(); };
    }, [map]);
    return null;
};

// Reset view control (return to PNG center)
const ResetViewControl = () => {
    const map = useMap();
    useEffect(() => {
        const resetButton = L.control({ position: 'topleft' });
        resetButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="#" title="Reset to PNG view" class="reset-button" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px;">🏠</a>`;
            div.onclick = function (e) {
                e.preventDefault();
                map.setView([-6.314993, 143.95555], 8);
            };
            return div;
        };
        resetButton.addTo(map);
        return () => { resetButton.remove(); };
    }, [map]);
    return null;
};

function Dashboard() {
    // Data State
    const [allTickets, setAllTickets] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('operations');
    const [selectedStatus, setSelectedStatus] = useState(null); // Filter by clicking card
    const [trendYear, setTrendYear] = useState(new Date().getFullYear());

    // Date Range State
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Modals
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Table Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // Location Filter Hook
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        filteredData: locationFilteredTickets,
        options: locationOptions
    } = useLocationFilter(allTickets, {
        regionField: 'region_name',
        provinceField: 'province_name',
        districtField: 'district_name'
    });

    // --- DATA FETCHING ---
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };

            const [ticketsRes, facilitiesRes] = await Promise.all([
                fetch('/api/tickets', { headers }),
                fetch('/api/facilities', { headers })
            ]);

            const ticketsData = await ticketsRes.json();
            const facilitiesData = await facilitiesRes.json();

            setAllTickets(ticketsData.tickets || ticketsData || []);
            setFacilities(facilitiesData.facilities || facilitiesData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    // --- FILTERING LOGIC ---

    // 1. Filter by Date Range (Global)
    const dateFilteredTickets = useMemo(() => {
        let filtered = locationFilteredTickets;
        if (dateRange.start) {
            const start = new Date(dateRange.start);
            filtered = filtered.filter(t => new Date(t.created_at) >= start);
        }
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59); // End of day
            filtered = filtered.filter(t => new Date(t.created_at) <= end);
        }
        return filtered.map(t => ({ ...t, effectiveStatus: getEffectiveStatus(t) }));
    }, [locationFilteredTickets, dateRange]);

    // 2. Compute Metrics (Based on Global Filters, IGNORING Status selection from cards)
    const metrics = useMemo(() => {
        const counts = { Total: dateFilteredTickets.length, New: 0, Assigned: 0, 'In Progress': 0, Resolved: 0, Closed: 0, Escalated: 0, 'On Hold': 0, Critical: 0 };

        dateFilteredTickets.forEach(t => {
            const s = t.effectiveStatus;
            counts[s] = (counts[s] || 0) + 1;
            // Generalized groups if needed
            if (['New', 'Open', 'Reassigned'].includes(s)) counts.Open++; // Aggregate open? Or stick to specific?
            // "Open" usually means active/unresolved. But let's count specific statuses for cards to be precise.

            if (t.priority === 'Critical') counts.Critical++;
        });

        // Manual aggregation for "Active" card if needed, or specific status cards
        return counts;
    }, [dateFilteredTickets]);

    // 3. Filter by Selected Status (Drill Down for Charts/Table)
    const fullyFilteredTickets = useMemo(() => {
        if (!selectedStatus) return dateFilteredTickets;
        return dateFilteredTickets.filter(t => t.effectiveStatus === selectedStatus);
    }, [dateFilteredTickets, selectedStatus]);

    // --- CHART DATA PREP ---

    // Weekly Trend Data (Filtered by Year)
    const trendData = useMemo(() => {
        // Use fullyFilteredTickets (so clicking "Closed" card shows trend of Closed tickets)
        const ticketsInYear = fullyFilteredTickets.filter(t => new Date(t.created_at).getFullYear() === parseInt(trendYear));

        const weeks = {};
        // Initialize 52 weeks? Or just data points? Better to show continuous line 1-52 if selected year
        for (let i = 1; i <= 52; i++) weeks[i] = 0;

        ticketsInYear.forEach(t => {
            const d = new Date(t.created_at);
            const w = getWeekNumber(d);
            weeks[w] = (weeks[w] || 0) + 1;
        });

        return Object.entries(weeks).map(([week, count]) => ({
            name: `W${week}`,
            count
        }));
    }, [fullyFilteredTickets, trendYear]);

    // Priority Distribution
    const priorityData = useMemo(() => {
        const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        fullyFilteredTickets.forEach(t => {
            if (counts[t.priority] !== undefined) counts[t.priority]++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [fullyFilteredTickets]);

    // Status Distribution (Pie)
    const statusData = useMemo(() => {
        const counts = { 'New': 0, 'Assigned': 0, 'In Progress': 0, 'On Hold': 0, 'Escalated': 0, 'Resolved': 0, 'Closed': 0 };
        fullyFilteredTickets.forEach(t => {
            if (counts[t.effectiveStatus] !== undefined) counts[t.effectiveStatus]++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [fullyFilteredTickets]);


    // --- MAP MARKERS PREP ---
    const mapMarkers = useMemo(() => {
        const distinctFacilities = {};
        fullyFilteredTickets.forEach(t => { // Map reflects filtered data (e.g. only Closed tickets if filtered)
            if (t.facility_id) {
                const facId = String(t.facility_id);
                if (!distinctFacilities[facId]) {
                    distinctFacilities[facId] = { ...t, count: 0, facility_id: facId, tickets: [] };
                }
                distinctFacilities[facId].count++;
                distinctFacilities[facId].tickets.push(t);
            }
        });

        // Marker Color Logic
        const getMarkerParams = (tList) => {
            // Colors based on Status Presence in the facility's filtered tickets
            const statuses = tList.map(t => t.effectiveStatus);
            if (statuses.includes('Escalated')) return { color: '#ef4444' }; // Red
            if (statuses.includes('In Progress')) return { color: '#6366f1' }; // Indigo
            if (statuses.includes('Assigned')) return { color: '#8b5cf6' }; // Violet
            if (statuses.includes('New')) return { color: '#3b82f6' }; // Blue
            if (statuses.includes('On Hold')) return { color: '#f59e0b' }; // Amber
            if (statuses.includes('Resolved')) return { color: '#10b981' }; // Green
            return { color: '#94a3b8' }; // Gray/Slate (Closed/Other)
        };

        // Render markers... (Simplified for brevity, same logic as before)
        return Object.values(distinctFacilities).map(t => {
            const fac = facilities.find(f => String(f.facility_id) === String(t.facility_id)) || t;
            const lat = fac.latitude || fac.lat;
            const lng = fac.longitude || fac.lng;
            if (lat && lng) {
                const style = getMarkerParams(t.tickets);
                const icon = L.divIcon({
                    className: 'custom-health-marker',
                    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));"><circle cx="12" cy="12" r="10" fill="${style.color}" stroke="white" stroke-width="2"/><path d="M12 7V17M7 12H17" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
                    iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
                });
                return <Marker key={t.facility_id} position={[lat, lng]} icon={icon}>
                    <Popup maxWidth={400} maxHeight={400}>
                        <FacilityPopupContent facility={fac} tickets={fullyFilteredTickets} />{/* Pass filtered tickets context */}
                    </Popup>
                </Marker>;
            }
            return null;
        });
    }, [fullyFilteredTickets, facilities]);

    // --- SORTING TABLE --- (Reusing logic through TicketsTable props)
    const sortedTableTickets = useMemo(() => {
        let sorted = [...fullyFilteredTickets];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'ticket_status') { aVal = a.effectiveStatus; bVal = b.effectiveStatus; } // Sort by effective
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [fullyFilteredTickets, sortConfig]);

    // --- HANDLERS ---
    const handleCardClick = (status) => {
        setSelectedStatus(prev => prev === status ? null : status);
    };

    // Colors - Unified Distinctive Palette
    const COLORS = {
        'New': '#3b82f6', // Blue (Brand new)
        'Assigned': '#8b5cf6', // Violet (Has technician)
        'In Progress': '#6366f1', // Indigo (Being worked on)
        'On Hold': '#f59e0b', // Amber/Yellow
        'Escalated': '#ef4444', // Red (Critical)
        'Resolved': '#10b981', // Emerald (Fixed)
        'Closed': '#64748b', // Slate (Archived)
        'Critical': '#dc2626', // Red-600
        'High': '#ea580c', // Orange-600
        'Medium': '#ca8a04', // Yellow-600
        'Low': '#16a34a' // Green-600
    };

    return (
        <div className="dashboard-container">
            {/* 1. Header */}
            <header className="dashboard-header">
                {/* ... existing header content ... */}
                <div className="header-title-section">
                    <h1>Dashboard</h1>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {activeTab === 'operations' ? 'Live Operations Overview' : `${fullyFilteredTickets.length} Tickets ${selectedStatus ? `(${selectedStatus})` : ''}`}
                    </div>
                </div>

                <div className="header-controls">
                    <div className="date-inputs">
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', padding: '0 4px' }}>Periord:</span>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                        <span style={{ color: '#cbd5e1' }}>-</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }}></div>
                    <LocationFilter filters={locationFilters} options={locationOptions} onFilterChange={handleLocationFilterChange} compactMode={true} />
                </div>
            </header>

            {/* 2. Cards Row - Hidden on Operations tab (uses its own KPIs) */}
            {activeTab !== 'operations' && (
                <div className="cards-row">
                    <div className={`compact-card ${!selectedStatus ? 'selected' : ''}`} onClick={() => setSelectedStatus(null)}>
                        <div className="card-label">Total Tickets</div>
                        <div className="card-value" style={{ color: '#334155' }}>{metrics.Total}</div>
                    </div>
                    {/* ... other cards ... */}
                    <div className={`compact-card ${selectedStatus === 'New' ? 'selected' : ''}`} onClick={() => handleCardClick('New')}>
                        <span className="status-indicator" style={{ background: COLORS.New }}></span>
                        <div className="card-label">New</div>
                        <div className="card-value">{metrics['New'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'Assigned' ? 'selected' : ''}`} onClick={() => handleCardClick('Assigned')}>
                        <span className="status-indicator" style={{ background: COLORS.Assigned }}></span>
                        <div className="card-label">Assigned</div>
                        <div className="card-value">{metrics['Assigned'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'In Progress' ? 'selected' : ''}`} onClick={() => handleCardClick('In Progress')}>
                        <span className="status-indicator" style={{ background: COLORS['In Progress'] }}></span>
                        <div className="card-label">In Progress</div>
                        <div className="card-value">{metrics['In Progress'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'On Hold' ? 'selected' : ''}`} onClick={() => handleCardClick('On Hold')}>
                        <span className="status-indicator" style={{ background: COLORS['On Hold'] }}></span>
                        <div className="card-label">On Hold</div>
                        <div className="card-value">{metrics['On Hold'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'Escalated' ? 'selected' : ''}`} onClick={() => handleCardClick('Escalated')}>
                        <span className="status-indicator" style={{ background: COLORS.Escalated }}></span>
                        <div className="card-label" style={{ color: COLORS.Escalated }}>Escalated</div>
                        <div className="card-value" style={{ color: COLORS.Escalated }}>{metrics['Escalated'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'Resolved' ? 'selected' : ''}`} onClick={() => handleCardClick('Resolved')}>
                        <span className="status-indicator" style={{ background: COLORS.Resolved }}></span>
                        <div className="card-label">Resolved</div>
                        <div className="card-value">{metrics['Resolved'] || 0}</div>
                    </div>
                    <div className={`compact-card ${selectedStatus === 'Closed' ? 'selected' : ''}`} onClick={() => handleCardClick('Closed')}>
                        <span className="status-indicator" style={{ background: COLORS.Closed }}></span>
                        <div className="card-label">Closed</div>
                        <div className="card-value">{metrics['Closed'] || 0}</div>
                    </div>
                </div>
            )}

            {/* 3. Tabs Nav */}
            <div className="tabs-nav">
                <button className={`tab-button ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>Operations Overview</button>
                <button className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics & Trends</button>
                <button className={`tab-button ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>Geospacial View</button>
                <button className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>Ticket List</button>
            </div>

            {/* 4. Tab Content (Scrolls internally) */}
            <div className="dashboard-content">

                {activeTab === 'operations' && (
                    <OperationsOverview
                        filters={{ dateRange, location: locationFilters }}
                        onDateChange={setDateRange}
                        onLocationChange={handleLocationFilterChange}
                    />
                )}

                {activeTab === 'analytics' && (
                    <div className="analytics-layout">
                        {/* Top: Weekly Trend */}
                        <div className="chart-container">
                            {/* ... existing analytics content ... */}                            <div className="chart-header">
                                <span className="chart-title">Weekly Trends {selectedStatus ? `(${selectedStatus})` : ''} - {trendYear}</span>
                                <select className="chart-actions" value={trendYear} onChange={e => setTrendYear(e.target.value)}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Tickets by Province Chart */}
                        <TicketsByProvinceChart />

                        {/* Comprehensive Analytics Charts */}
                        <DashboardCharts />

                        {/* Bottom: Splits */}
                        <div className="analytics-bottom">
                            <div className="chart-container">
                                <div className="chart-header"><span className="chart-title">By Priority</span></div>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={priorityData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                            <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} barSize={30}>
                                                {priorityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="chart-container">
                                <div className="chart-header"><span className="chart-title">By Status Distribution</span></div>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'map' && (
                    <div className="map-full-container" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="chart-header" style={{
                            padding: '16px 24px',
                            background: 'linear-gradient(135deg, #1e3c72 0%, #bcc9e8 100%)',
                            borderBottom: '1px solid #e2e8f0',
                            margin: 0,
                            flexShrink: 0
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>Geospatial Map</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>Interactive visualization of facility status and tickets</p>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                            <MapContainer center={[-6.314993, 143.95555]} zoom={8} style={{ height: '100%', width: '100%' }}>
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Satellite">
                                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Terrain (OpenTopoMap)">
                                        <TileLayer
                                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>

                                {/* Map Controls */}
                                <ScaleControl position="bottomleft" imperial={false} metric={true} />
                                <LocateControl />
                                <FullscreenControl />
                                <ResetViewControl />

                                {mapMarkers}
                            </MapContainer>
                            <MapLegend />
                        </div>
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="tickets-list-container">
                        <TicketsTable
                            tickets={sortedTableTickets.map(t => ({ ...t, ticket_status: t.effectiveStatus }))}
                            sortConfig={sortConfig}
                            onSort={(key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            activeDropdown={activeDropdown}
                            onToggleDropdown={(id) => setActiveDropdown(activeDropdown === id ? null : id)}
                            onAction={(a, t) => {
                                setSelectedTicket(t);
                                if (a === 'view') setShowDetailsModal(true);
                                if (a === 'assign') setShowAssignModal(true);
                                setActiveDropdown(null);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Modal Layer */}
            {selectedTicket && (
                <>
                    <TicketDetailsModal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTicket(null); }} ticket={selectedTicket} onAssign={() => { setShowDetailsModal(false); setShowAssignModal(true); }} />
                    <AssignTicketModal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setSelectedTicket(null); }} ticket={selectedTicket} onAssign={() => { fetchDashboardData(); setShowAssignModal(false); setSelectedTicket(null); }} />
                </>
            )}
        </div>
    );
}

export default Dashboard;
