import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, ScaleControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-measure';
import './Map.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import FacilityPopupContent from '../components/FacilityPopupContent';
import MapLegend from '../components/MapLegend';
import DistanceMeasurementTool from '../components/DistanceMeasurementTool';
import MapBoundsFitter from '../components/MapBoundsFitter';
import { useTenant } from '../context/TenantContext';
import { getEffectiveStatus } from '../utils/statusUtils';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[-\s]/g, '');
};

// Measurement control component
function MeasureControl() {
    const map = useMap();
    useEffect(() => {
        // Only add the control once
        if (!map._measureControlAdded) {
            const measureControl = new L.Control.Measure({
                position: 'topleft',
                primaryLengthUnit: 'kilometers',
                secondaryLengthUnit: 'meters',
                primaryAreaUnit: 'sqkilometers',
                secondaryAreaUnit: 'hectares'
            });
            measureControl.addTo(map);
            map._measureControlAdded = true;

            return () => {
                if (map._measureControlAdded) {
                    measureControl.remove();
                    map._measureControlAdded = false;
                }
            };
        }
    }, []);  // Empty dependency array - only run once
    return null;
}

// Locate control (GPS/My Location)
function LocateControl() {
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
            L.marker(e.latlng).addTo(map)
                .bindPopup("You are within " + Math.round(e.accuracy) + " meters from this point").openPopup();
        });

        map.on('locationerror', () => {
            alert('Location access denied or unavailable');
        });

        return () => {
            locateButton.remove();
        };
    }, [map]);

    return null;
}

// Fullscreen control
function FullscreenControl() {
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

        return () => {
            fullscreenButton.remove();
        };
    }, [map]);

    return null;
}

// Reset view control (return to default center)
function ResetViewControl() {
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

        return () => {
            resetButton.remove();
        };
    }, [map]);

    return null;
}

function RecenterMap({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 8);
        }
    }, [center, zoom, map]);
    return null;
}

function Map({ tickets: propTickets }) {
    const [rawFacilities, setRawFacilities] = useState([]); // Store all facilities
    const [facilities, setFacilities] = useState([]); // Computed facilities to show
    const [tickets, setTickets] = useState([]);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [boundaries, setBoundaries] = useState({}); // Dynamic boundaries object { levelId: geojson }
    // Initialize to false - fetchData sets it true when it runs
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null); // New state for legend filtering
    const { tenantCode, config, loading: tenantLoading } = useTenant();

    // Use the custom hook for location filtering
    const {
        filters: locationFilters,
        handleFilterChange,
        filteredData: locationFilteredFacilities,
        options
    } = useLocationFilter(facilities, {
        regionField: 'region_name',
        provinceField: 'province_name',
        districtField: 'district_name'
    });

    // Sync prop tickets to state if provided
    useEffect(() => {
        if (propTickets) {
            setTickets(propTickets);
        }
    }, [propTickets]);

    useEffect(() => {
        // Only fetch when config is available (not still loading from TenantContext)
        if (config && !tenantLoading) fetchData();
    }, [config, tenantLoading]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Dynamic boundary fetching based on tenant hierarchy
            const boundaryPromises = (config?.hierarchy || []).map(level => 
                fetch(`/api/${tenantCode}/boundaries?level=${level.id}`, { headers })
            );

            const promises = [
                fetch(`/api/${tenantCode}/facilities`, { headers }),
                ...boundaryPromises
            ];
            if (!propTickets) {
                promises.push(fetch(`/api/${tenantCode}/tickets`, { headers }));
            }

            const results = await Promise.all(promises);
            
            // Validate and parse facilities
            const facilitiesRes = results[0];
            if (facilitiesRes.ok) {
                const facilitiesData = await facilitiesRes.json();
                const facilitiesList = facilitiesData.facilities || (Array.isArray(facilitiesData) ? facilitiesData : []);
                setRawFacilities(facilitiesList);
            }

            // Validate and parse boundaries
            const boundaryResults = results.slice(1, 1 + (config?.hierarchy?.length || 0));
            const newBoundaries = {};
            for (let i = 0; i < boundaryResults.length; i++) {
                const res = boundaryResults[i];
                const levelId = config?.hierarchy?.[i]?.id;
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.type === 'FeatureCollection') {
                        newBoundaries[levelId] = data;
                    }
                }
            }
            setBoundaries(newBoundaries);

            // Validate and parse tickets
            let ticketsList = [];
            if (!propTickets) {
                const ticketsRes = results[1 + (config?.hierarchy?.length || 0)];
                if (ticketsRes && ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    ticketsList = ticketsData.tickets || (Array.isArray(ticketsData) ? ticketsData : []);
                    setTickets(ticketsList);
                }
            } else {
                ticketsList = propTickets;
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter facilities based on Current Tickets (reactive)
    useEffect(() => {
        if (rawFacilities.length === 0) return;

        // Get unique facility IDs from current tickets
        const facilitiesWithTickets = new Set(tickets.map(t => t.facility_id));

        // Filter to only facilities that have coordinates
        const filtered = (Array.isArray(rawFacilities) ? rawFacilities : []).filter(f => {
            const hasCoords = (f.latitude && f.longitude) || (f.lat && f.lng) || f.gps_coordinates;
            return hasCoords;
        });

        setFacilities(filtered);

    }, [rawFacilities, tickets]);

    // All facilities already filtered to have tickets AND coords
    const filteredFacilities = locationFilteredFacilities;

    // Calculate status counts for the legend
    const statusCounts = useMemo(() => {
        const counts = { 'Escalated': 0, 'New': 0, 'Assigned': 0, 'In Progress': 0, 'On Hold': 0, 'Resolved': 0, 'Closed': 0, 'No Tickets': 0 };
        
        filteredFacilities.forEach(fac => {
            const facTickets = tickets.filter(t => String(t.facility_id) === String(fac.facility_id));
            if (facTickets.length === 0) {
                counts['No Tickets']++;
            } else {
                const openTickets = facTickets.filter(t => !['Resolved', 'Closed'].includes(getEffectiveStatus(t)));
                if (openTickets.length === 0) {
                    counts['Resolved']++;
                } else {
                    const statuses = openTickets.map(t => getEffectiveStatus(t));
                    if (statuses.includes('Escalated')) counts['Escalated']++;
                    else if (statuses.includes('On Hold')) counts['On Hold']++;
                    else if (statuses.includes('In Progress')) counts['In Progress']++;
                    else if (statuses.includes('Assigned')) counts['Assigned']++;
                    else counts['New']++;
                }
            }
        });
        return counts;
    }, [filteredFacilities, tickets]);

    // Generate map markers from facilities with coordinates
    const mapMarkers = useMemo(() => {
        const markers = [];

        // Helper to determine color based on DISTINCT statuses
        const getMarkerParams = (facilityTickets) => {
            const tickets = facilityTickets || [];
            if (tickets.length === 0) return { color: '#94a3b8', fillColor: '#94a3b8' }; // Grey - No Tickets

            // Filter to only Open/Active tickets using effective status
            const openTickets = tickets.filter(t => {
                const s = getEffectiveStatus(t);
                return !['Resolved', 'Closed'].includes(s);
            });

            // If no open tickets (all resolved/closed)
            if (openTickets.length === 0) {
                return { color: '#10b981', fillColor: '#10b981' }; // Green - Resolved
            }

            // Check statuses with PRIORITY ORDER (most critical first)
            const statuses = openTickets.map(t => getEffectiveStatus(t));

            // Priority order: Escalated > Pending Assignment > In Progress > Assigned > New
            if (statuses.includes('Escalated')) return { color: '#ef4444', fillColor: '#ef4444' }; // Red
            if (statuses.includes('On Hold')) return { color: '#f59e0b', fillColor: '#f59e0b' }; // Amber
            if (statuses.includes('In Progress')) return { color: '#6366f1', fillColor: '#6366f1' }; // Indigo
            if (statuses.includes('Assigned')) return { color: '#8b5cf6', fillColor: '#8b5cf6' }; // Violet
            if (statuses.includes('New')) return { color: '#3b82f6', fillColor: '#3b82f6' }; // Blue

            // Fallback (should not happen with proper data)
            return { color: '#3b82f6', fillColor: '#3b82f6' }; // Blue
        };

        // Create custom icon

        const createHealthIcon = (color) => {
            return L.divIcon({
                className: 'custom-health-marker',
                html: `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));">
                        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
                        <path d="M12 7V17M7 12H17" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
        };

        filteredFacilities.forEach((facility) => {
            let lat = null;
            let lng = null;

            //Check for latitude/longitude
            if (facility.latitude && facility.longitude) {
                lat = parseFloat(facility.latitude);
                lng = parseFloat(facility.longitude);
            }
            // Check for lat/lng
            else if (facility.lat && facility.lng) {
                lat = parseFloat(facility.lat);
                lng = parseFloat(facility.lng);
            }
            // Check for gps_coordinates as PostgreSQL point (x,y)
            else if (facility.gps_coordinates) {
                const coordStr = facility.gps_coordinates.toString().replace(/[()]/g, '');
                const parts = coordStr.split(',');
                if (parts.length === 2) {
                    lat = parseFloat(parts[0]);
                    lng = parseFloat(parts[1]);
                }
            }

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                // Find tickets for this facility
                const facilityTickets = tickets.filter(t => String(t.facility_id) === String(facility.facility_id));
                const style = getMarkerParams(facilityTickets);

                // CROSS-FILTER: If a status filter is active, only show markers that match that status
                if (statusFilter) {
                    // Map the dominant status to the filter name
                    let dominantStatus = 'No Tickets';
                    if (facilityTickets.length > 0) {
                        const openTickets = facilityTickets.filter(t => !['Resolved', 'Closed'].includes(getEffectiveStatus(t)));
                        if (openTickets.length === 0) {
                            dominantStatus = 'Resolved'; // Or 'Closed', but the legend uses Resolved for green
                        } else {
                            const statuses = openTickets.map(t => getEffectiveStatus(t));
                            if (statuses.includes('Escalated')) dominantStatus = 'Escalated';
                            else if (statuses.includes('On Hold')) dominantStatus = 'On Hold';
                            else if (statuses.includes('In Progress')) dominantStatus = 'In Progress';
                            else if (statuses.includes('Assigned')) dominantStatus = 'Assigned';
                            else if (statuses.includes('New')) dominantStatus = 'New';
                        }
                    }

                    if (statusFilter !== dominantStatus) return;
                }

                const icon = createHealthIcon(style.fillColor);

                markers.push(
                    <Marker
                        key={facility.facility_id}
                        position={[lat, lng]}
                        icon={icon}
                        eventHandlers={{
                            click: () => setSelectedFacility(facility)
                        }}
                    >
                        <Popup maxWidth={400} maxHeight={400}>
                            <FacilityPopupContent facility={facility} tickets={tickets} />
                        </Popup>
                    </Marker>
                );
            }
        });

        return markers;
    }, [filteredFacilities, tickets, statusFilter]);

    if (loading || tenantLoading) {
        return (
            <div className="map-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading map...</p>
                </div>
            </div>
        );
    }

    // Don't render map if config is missing (shouldn't happen, but guard anyway)
    if (!config || !config.mapCenter) {
        return (
            <div className="map-container">
                <div className="loading-spinner">
                    <p>⚠️ Map configuration not available. Please check your system settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="map-container-modern" style={propTickets ? { minHeight: 0, height: '100%' } : {}}>
            {/* Header with just title */}
            <div className="map-header-modern">
                <div className="header-title">
                    <h1>Facility Map</h1>
                    <div className="stats-badges-container">
                        <div className="stats-badge">
                            <span className="stats-label">Facilities</span>
                            <span className="stats-value">{filteredFacilities.length}</span>
                        </div>
                        <div className="stats-badge secondary">
                            <span className="stats-label">Selected Tickets</span>
                            <span className="stats-value">
                                {statusFilter 
                                    ? tickets.filter(t => getEffectiveStatus(t) === statusFilter).length 
                                    : tickets.length
                                }
                            </span>
                        </div>
                        {statusFilter && (
                            <div className="stats-badge accent">
                                <span className="stats-label">Status Filter</span>
                                <span className="stats-value">{statusFilter}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Filters in one row right above map - Hide if controlled externally via props */}
            {!propTickets && (
                <div className="map-filters-bar">
                    <LocationFilter
                        filters={locationFilters}
                        options={options}
                        onFilterChange={handleFilterChange}
                        compactMode={true}
                    />
                </div>
            )}

            {/* Full width map */}
            <div className="map-area-fullwidth" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <MapContainer
                    center={config.mapCenter}
                    zoom={config.mapZoom || 8}
                    style={{ height: '100%', width: '100%', flex: 1, minHeight: 0 }}
                    zoomControl={true}
                    attributionControl={true}
                >
                        <RecenterMap center={config.mapCenter} zoom={config.mapZoom} />
                        <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="OpenStreetMap">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite (Esri)">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Terrain (OpenTopoMap)">
                            <TileLayer
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
                            />
                        </LayersControl.BaseLayer>

                        {/* Dynamic Boundary Layers */}
                        {(config?.hierarchy || []).map((level, index) => {
                            const data = boundaries[level.id];
                            if (!data) return null;

                            return (
                                <LayersControl.Overlay checked key={level.id} name={level.name}>
                                    <GeoJSON
                                        key={`bound-${level.id}-${JSON.stringify(locationFilters)}`}
                                        data={data}
                                        filter={(feature) => {
                                            const props = feature.properties || {};
                                            
                                            // 1. If a specific child level is selected, only show that specific shape
                                            // Find if any filter matches this level or lower levels
                                            const currentFilterValue = locationFilters[level.id];
                                            const lowerLevels = config?.hierarchy?.slice(index + 1) || [];
                                            const isLowerLevelSelected = lowerLevels.some(l => locationFilters[l.id] && locationFilters[l.id] !== 'all');

                                            if (isLowerLevelSelected) return false;

                                            if (currentFilterValue && currentFilterValue !== 'all') {
                                                const normalizedTarget = normalizeString(currentFilterValue);
                                                // Check for name in standard properties
                                                const possibleNames = [props.name, props.NAME, props.NAME_1, props.NAME_2, props.PROVINCE, props.DISTRICT, props.ADM1_EN, props.ADM2_EN, props.adm1_name, props.adm2_name];
                                                return possibleNames.some(name => name && normalizeString(name) === normalizedTarget);
                                            }

                                            // 2. If a parent level is selected, only show children belonging to that parent
                                            const parentLevel = index > 0 ? config?.hierarchy?.[index - 1] : null;
                                            if (parentLevel) {
                                                const parentFilterValue = locationFilters[parentLevel.id];
                                                if (parentFilterValue && parentFilterValue !== 'all') {
                                                    const normalizedTarget = normalizeString(parentFilterValue);
                                                    const possibleParentNames = [props.parent, props.province, props.region, props.NAME_1, props.PROVINCE, props.ADM1_EN, props.adm1_name];
                                                    return possibleParentNames.some(name => name && normalizeString(name) === normalizedTarget);
                                                }
                                            }

                                            // 3. Default: only show top level if nothing selected
                                            return index === 0;
                                        }}
                                        style={(feature) => {
                                            const isSelected = locationFilters[level.id] && locationFilters[level.id] !== 'all';
                                            return {
                                                color: level.color || '#475569',
                                                weight: isSelected ? 3 : 2,
                                                opacity: 0.8,
                                                fillColor: level.color || '#475569',
                                                fillOpacity: isSelected ? 0.15 : 0.05,
                                                dashArray: index > 0 ? '3, 5' : ''
                                            };
                                        }}
                                        onEachFeature={(feature, layer) => {
                                            const props = feature.properties || {};
                                            const name = props.name || props.NAME || props.NAME_1 || props.NAME_2 || props.PROVINCE || props.DISTRICT || props.ADM1_EN || props.ADM2_EN || props.adm1_name || props.adm2_name;
                                            if (name) {
                                                layer.bindTooltip(name, { 
                                                    permanent: true, 
                                                    direction: "center", 
                                                    className: `${level.id}-label-tooltip` 
                                                });
                                            }
                                        }}
                                    />
                                </LayersControl.Overlay>
                            );
                        })}
                    </LayersControl>

                    {/* Map Controls */}
                    <ScaleControl position="bottomleft" imperial={false} metric={true} />
                    <DistanceMeasurementTool />
                    <LocateControl />
                    <FullscreenControl />
                    <ResetViewControl />
                    <MapBoundsFitter 
                        filters={locationFilters} 
                        boundaries={boundaries}
                        hierarchy={config?.hierarchy}
                        defaultCenter={config?.mapCenter}
                        defaultZoom={config?.mapZoom || 8}
                    />

                    {mapMarkers}
                    </MapContainer>

                {/* Legend */}
                <MapLegend 
                    activeStatus={statusFilter} 
                    onToggleStatus={setStatusFilter} 
                    counts={statusCounts}
                    hierarchy={config?.hierarchy}
                />

                {/* Measure Control Logic */}

                {/* Facility Detail Panel */}
                {selectedFacility && (
                    <div className="facility-detail-panel">
                        <div className="panel-header">
                            <h3>{selectedFacility.facility_name}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setSelectedFacility(null)}
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="panel-content">
                            <div className="detail-section">
                                <h4>Location</h4>
                                <p>{selectedFacility.district}, {selectedFacility.province}</p>
                                {selectedFacility.facility_code && (
                                    <p className="facility-code">Code: {selectedFacility.facility_code}</p>
                                )}
                            </div>

                            {selectedFacility.equipment_count !== undefined && (
                                <div className="detail-section">
                                    <h4>Equipment</h4>
                                    <p>{selectedFacility.equipment_count} Total Equipment</p>
                                </div>
                            )}

                            <div className="panel-actions">
                                <button className="action-btn primary-btn">View Details</button>
                                <button className="action-btn secondary-btn">View Equipment</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Map;
