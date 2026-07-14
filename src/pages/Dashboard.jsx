import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, ScaleControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import '../pages/Tickets.css'; // inherit badge styles
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import FacilityPopupContent from '../components/FacilityPopupContent';
import MapLegend from '../components/MapLegend';
import TicketsByProvinceChart from '../components/TicketsByProvinceChart';
import OperationsOverview from '../components/Dashboard/OperationsOverview';
import { useTenant } from '../context/TenantContext';
import { getEffectiveStatus, getWeekNumber } from '../utils/statusUtils';
import { getCachedData, setCachedData } from '../utils/cache';

import DashboardCharts from '../components/DashboardCharts';
import TicketsTable from '../components/TicketsTable';
// Modals
import TicketDetailsModal from '../components/TicketDetailsModal';
import AssignTicketModal from '../components/AssignTicketModal';
import MapBoundsFitter from '../components/MapBoundsFitter';
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

const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[-\s]/g, '');
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

// Reset view control (return to default center)
const ResetViewControl = () => {
    const map = useMap();
    const { tenantCode, config } = useTenant();

    useEffect(() => {
        const resetButton = L.control({ position: 'topleft' });
        resetButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="#" title="Reset to default view" class="reset-button" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px;">🏠</a>`;
            div.onclick = function (e) {
                e.preventDefault();
                map.setView(config?.mapCenter || [0,0], config?.mapZoom || 8);
            };
            return div;
        };
        resetButton.addTo(map);
        return () => { resetButton.remove(); };
    }, [map, config]);
    return null;
};

const RecenterMap = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 8);
        }
    }, [center, zoom, map]);
    return null;
};

function Dashboard() {
    // Data State
    const [allTickets, setAllTickets] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [boundaries, setBoundaries] = useState({}); // Dynamic boundaries object { levelId: geojson }
    const boundaryCache = React.useRef({});
    const [boundariesLoading, setBoundariesLoading] = useState(false);
    // Initialize to false - fetchDashboardData sets it true when it runs
    const [loading, setLoading] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('operations');
    const [selectedStatus, setSelectedStatus] = useState(null); // Filter by clicking card
    const [trendYear, setTrendYear] = useState(new Date().getFullYear());
    const { tenantCode, config, loading: tenantLoading } = useTenant();

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
        hierarchy: config?.hierarchy,
        facilityField: 'facility_name'
    });

    // --- DATA FETCHING ---
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Check cache first
            const cachedTickets = getCachedData('tickets', tenantCode);
            const cachedFacilities = getCachedData('facilities', tenantCode);

            if (cachedTickets && cachedFacilities) {
                setAllTickets(cachedTickets);
                setFacilities(cachedFacilities);
                return;
            }

            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };

            const promises = [];
            if (cachedTickets) {
                setAllTickets(cachedTickets);
            } else {
                promises.push(
                    fetch(`/api/${tenantCode}/tickets?limit=100000&minimal=true`, { headers })
                        .then(res => res.json())
                        .then(data => {
                            const list = data.tickets || data || [];
                            setAllTickets(list);
                            setCachedData('tickets', tenantCode, list);
                        })
                );
            }

            if (cachedFacilities) {
                setFacilities(cachedFacilities);
            } else {
                promises.push(
                    fetch(`/api/${tenantCode}/facilities?limit=10000`, { headers })
                        .then(res => res.json())
                        .then(data => {
                            const list = data.facilities || data || [];
                            setFacilities(list);
                            setCachedData('facilities', tenantCode, list);
                        })
                );
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBoundaries = async () => {
        if (!config?.hierarchy || boundariesLoading) return;
        
        // Check if all needed boundaries are already in cache
        const missingLevels = config.hierarchy.filter(level => !boundaryCache.current[level.id]);
        if (missingLevels.length === 0) {
            setBoundaries(boundaryCache.current);
            return;
        }

        try {
            setBoundariesLoading(true);
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };

            const promises = missingLevels.map(level => 
                fetch(`/api/${tenantCode}/boundaries?level=${level.id}`, { headers })
                    .then(res => res.ok ? res.json() : null)
            );

            const results = await Promise.all(promises);
            
            missingLevels.forEach((level, i) => {
                if (results[i] && results[i].type === 'FeatureCollection') {
                    boundaryCache.current[level.id] = results[i];
                }
            });

            setBoundaries({ ...boundaryCache.current });
        } catch (err) {
            console.error('Error fetching boundaries:', err);
        } finally {
            setBoundariesLoading(false);
        }
    };

    useEffect(() => { 
        // Only fetch core dashboard data when config is available
        if (config && !tenantLoading) fetchDashboardData(); 
    }, [config?.id, tenantCode, tenantLoading]);

    useEffect(() => {
        // Fetch boundaries only when map tab is active
        if (activeTab === 'map' && config && !tenantLoading) {
            fetchBoundaries();
        }
    }, [activeTab, config, tenantLoading]);

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
            if (t.priority === 'Critical') counts.Critical++;
        });

        return counts;
    }, [dateFilteredTickets]);

    // 3. Optimized Map Boundaries (Pre-filter features to improve performance)
    const filteredBoundariesData = useMemo(() => {
        if (!config?.hierarchy) return {};
        const results = {};
        
        config.hierarchy.forEach((level, index) => {
            const rawData = boundaries[level.id];
            if (!rawData || !rawData.features) return;

            const currentFilterValue = locationFilters[level.id];
            const lowerLevels = config.hierarchy.slice(index + 1);
            const isLowerLevelSelected = lowerLevels.some(l => locationFilters[l.id] && locationFilters[l.id] !== 'all');

            if (isLowerLevelSelected) {
                results[level.id] = { ...rawData, features: [] };
                return;
            }

            const filteredFeatures = rawData.features.filter(feature => {
                const props = feature.properties || {};
                
                // If this level is specifically selected, show only that feature
                if (currentFilterValue && currentFilterValue !== 'all') {
                    const normalizedTarget = normalizeString(currentFilterValue);
                    const possibleNames = [props.name, props.NAME, props.NAME_1, props.NAME_2, props.PROVINCE, props.DISTRICT, props.ADM1_EN, props.ADM2_EN, props.adm1_name, props.adm2_name];
                    return possibleNames.some(name => name && normalizeString(name) === normalizedTarget);
                }

                // Otherwise, if parent is selected, show its children
                const parentLevel = index > 0 ? config.hierarchy[index - 1] : null;
                if (parentLevel) {
                    const parentFilterValue = locationFilters[parentLevel.id];
                    if (parentFilterValue && parentFilterValue !== 'all') {
                        const normalizedTarget = normalizeString(parentFilterValue);
                        const possibleParentNames = [props.parent, props.province, props.region, props.NAME_1, props.PROVINCE, props.ADM1_EN, props.adm1_name];
                        return possibleParentNames.some(name => name && normalizeString(name) === normalizedTarget);
                    }
                }

                // Base level (e.g. all Provinces)
                return index === 0;
            });

            results[level.id] = { ...rawData, features: filteredFeatures };
        });
        return results;
    }, [boundaries, locationFilters, config]);

    // 4. Filter by Selected Status (Drill Down for Charts/Table)
    const fullyFilteredTickets = useMemo(() => {
        if (!selectedStatus) return dateFilteredTickets;
        return dateFilteredTickets.filter(t => t.effectiveStatus === selectedStatus);
    }, [dateFilteredTickets, selectedStatus]);

    // --- CHART DATA PREP ---

    // Weekly Trend Data (Filtered by Year)
    const dashboardFilters = useMemo(() => ({
        dateRange,
        location: locationFilters
    }), [dateRange, locationFilters]);

    const weeklyTrendData = useMemo(() => {
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
    
    // Facility status counts for Map Legend (Ticket counts instead of dominant status to match dashboard cards)
    const facilityStatusCounts = useMemo(() => {
        const counts = { 'Escalated': 0, 'New': 0, 'Assigned': 0, 'In Progress': 0, 'On Hold': 0, 'Resolved': 0, 'Closed': 0, 'No Tickets': 0 };
        
        dateFilteredTickets.forEach(t => {
            if (counts[t.effectiveStatus] !== undefined) {
                counts[t.effectiveStatus]++;
            }
        });

        const facilitiesWithTickets = new Set(dateFilteredTickets.map(t => String(t.facility_id)));
        let noTicketsCount = 0;
        facilities.forEach(fac => {
            if (!facilitiesWithTickets.has(String(fac.facility_id))) {
                noTicketsCount++;
            }
        });
        counts['No Tickets'] = noTicketsCount;

        return counts;
    }, [dateFilteredTickets, facilities]);


    // --- MAP MARKERS PREP ---
    // --- MAP MARKERS PREP ---
    const mapMarkers = useMemo(() => {
        return facilities.map(fac => {
            let lat = null, lng = null;
            if (fac.latitude && fac.longitude) { lat = parseFloat(fac.latitude); lng = parseFloat(fac.longitude); }
            else if (fac.lat && fac.lng) { lat = parseFloat(fac.lat); lng = parseFloat(fac.lng); }
            else if (fac.gps_coordinates) {
                const parts = fac.gps_coordinates.toString().replace(/[()]/g, '').split(',');
                if (parts.length === 2) { lat = parseFloat(parts[0]); lng = parseFloat(parts[1]); }
            }

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                // Get all tickets for this facility that match CURRENT DATE/LOCATION filters
                const facTickets = dateFilteredTickets.filter(t => String(t.facility_id) === String(fac.facility_id));
                
                // Determine dominant status for this facility (regardless of selectedStatus)
                let dominantStatus = 'No Tickets';
                let markerColor = '#94a3b8'; // Grey

                if (facTickets.length > 0) {
                    const openTickets = facTickets.filter(t => !['Resolved', 'Closed'].includes(t.effectiveStatus));
                    if (openTickets.length === 0) {
                        dominantStatus = 'Resolved';
                        markerColor = '#10b981'; // Green
                    } else {
                        // Distribute colors deterministically by facility ID for a varied map visualization
                        const openList = [...openTickets];
                        openList.sort((a, b) => (a.ticket_id || 0) - (b.ticket_id || 0));
                        const index = fac.facility_id % openList.length;
                        const chosenTicket = openList[index];
                        dominantStatus = chosenTicket.effectiveStatus;
                        
                        const statusColors = {
                            'Escalated': '#ef4444',
                            'New': '#3b82f6',
                            'Assigned': '#8b5cf6',
                            'In Progress': '#6366f1',
                            'On Hold': '#f59e0b',
                            'Resolved': '#10b981',
                            'Closed': '#64748b'
                        };
                        markerColor = statusColors[dominantStatus] || '#3b82f6';
                    }
                }

                // Apply status filter: if a legend/card filter is active, only show markers matching that status
                if (selectedStatus) {
                    if (selectedStatus === 'No Tickets') {
                        if (facTickets.length > 0) return null;
                    } else {
                        const hasMatchingTicket = facTickets.some(t => t.effectiveStatus === selectedStatus);
                        if (!hasMatchingTicket) return null;
                    }
                    // Color the pin by the selected status for visual clarity
                    const statusColors = {
                        'Escalated': '#ef4444',
                        'New': '#3b82f6',
                        'Assigned': '#8b5cf6',
                        'In Progress': '#6366f1',
                        'On Hold': '#f59e0b',
                        'Resolved': '#10b981',
                        'Closed': '#64748b',
                        'No Tickets': '#94a3b8'
                    };
                    markerColor = statusColors[selectedStatus] || markerColor;
                }

                const icon = L.divIcon({
                    className: 'custom-health-marker',
                    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));"><circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/><path d="M12 7V17M7 12H17" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
                    iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
                });

                return (
                    <Marker key={fac.facility_id} position={[lat, lng]} icon={icon}>
                        <Popup maxWidth={400} maxHeight={400}>
                            <FacilityPopupContent facility={fac} tickets={facTickets} />
                        </Popup>
                    </Marker>
                );
            }
            return null;
        });
    }, [dateFilteredTickets, facilities, selectedStatus]);

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Dashboard</h1>
                        <div className="ticket-count-badge">
                            <span className="count-value">{fullyFilteredTickets.length}</span>
                            <span className="count-label">Selected Tickets</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#ffffff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        {activeTab === 'operations' ? 'Live Operations Overview' : `${selectedStatus ? `Filtering by ${selectedStatus}` : 'Showing all status types'}`}
                    </div>
                </div>

                <div className="header-controls">
                    <div className="date-inputs">
                        <div className="date-input-group">
                            <label htmlFor="start-date">From</label>
                            <input 
                                id="start-date"
                                type="date" 
                                value={dateRange.start} 
                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })} 
                            />
                        </div>
                        <div className="date-input-group">
                            <label htmlFor="end-date">To</label>
                            <input 
                                id="end-date"
                                type="date" 
                                value={dateRange.end} 
                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })} 
                            />
                        </div>
                    </div>
                    <div className="filter-divider"></div>
                    <LocationFilter filters={locationFilters} options={locationOptions} onFilterChange={handleLocationFilterChange} compactMode={true} labelColor="white" />
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
                <button className={`tab-button ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>Geospatial View</button>
                <button className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>Ticket List</button>
            </div>

            {/* 4. Tab Content (Scrolls internally) */}
            <div className="dashboard-content">

                {activeTab === 'operations' && (
                    <OperationsOverview 
                        filters={dashboardFilters}
                        onStatusSelect={setSelectedStatus}
                        onLocationChange={handleLocationFilterChange}
                    />
                )}

                {activeTab === 'analytics' && (
                    <div className="analytics-layout">
                        {/* Top: Weekly Trend */}
                        <div className="chart-container">
                            <div className="chart-header">
                                <span className="chart-title">Weekly Trends {selectedStatus ? `(${selectedStatus})` : ''} - {trendYear}</span>
                                <div className="chart-actions">
                                    <select value={trendYear} onChange={e => setTrendYear(e.target.value)}>
                                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={weeklyTrendData}>
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
                                <div className="chart-body">
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
                                <div className="chart-body">
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
                    <div className="map-full-container">
                        {loading ? (
                            <div className="map-loading-overlay">
                                <div className="spinner"></div>
                                <p>Loading Geospatial Data...</p>
                            </div>
                        ) : null}
                        <div className="chart-header" style={{
                            padding: '16px 24px',
                            background: 'var(--header-gradient)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            margin: 0,
                            flexShrink: 0
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>Geospatial Map</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>Interactive visualization of facility status and tickets</p>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', minHeight: 0, height: '100%' }}>
                            {config && config.mapCenter && (
                                <MapContainer 
                                    key={`map-${config.id}-${config.mapCenter[0]}-${config.mapCenter[1]}`}
                                    center={config.mapCenter} 
                                    zoom={config.mapZoom || 8} 
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <RecenterMap center={config.mapCenter} zoom={config.mapZoom} />
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
                                        {/* Dynamic Boundary Layers */}
                                        {(config.hierarchy || []).map((level, index) => {
                                            const data = filteredBoundariesData[level.id];
                                            if (!data || !data.features || data.features.length === 0) return null;

                                            return (
                                                <LayersControl.Overlay checked key={level.id} name={level.name}>
                                                    <GeoJSON
                                                        data={data}
                                                        style={(feature) => {
                                                            const isSelected = locationFilters[level.id] && locationFilters[level.id] !== 'all';
                                                            return {
                                                                color: level.color || '#475569',
                                                                weight: isSelected ? 3 : 1.5,
                                                                opacity: 0.8,
                                                                fillOpacity: isSelected ? 0.1 : 0,
                                                                dashArray: index > 0 ? '3, 5' : ''
                                                            };
                                                        }}
                                                    />
                                                </LayersControl.Overlay>
                                            );
                                        })}
                                    </LayersControl>

                                    {/* Map Controls */}
                                    <ScaleControl position="bottomleft" imperial={false} metric={true} />
                                    <LocateControl />
                                    <FullscreenControl />
                                    <ResetViewControl />
                                    <MapBoundsFitter 
                                        filters={locationFilters} 
                                        boundaries={boundaries} 
                                        hierarchy={config?.hierarchy}
                                        defaultCenter={config.mapCenter}
                                        defaultZoom={config.mapZoom || 8}
                                    />

                                    {mapMarkers}
                                </MapContainer>
                            )}
                            {!config && (
                                <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                                    <div className="spinner"></div>
                                </div>
                            )}
                            {boundariesLoading && (
                                <div style={{
                                    position: 'absolute',
                                    top: '70px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    zIndex: 3000,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#334155',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div className="spinner-small"></div> Loading geographic data...
                                </div>
                            )}
                            <MapLegend 
                                activeStatus={selectedStatus} 
                                onToggleStatus={setSelectedStatus} 
                                counts={facilityStatusCounts}
                                hierarchy={config?.hierarchy}
                            />
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
