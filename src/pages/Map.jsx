import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, ScaleControl } from 'react-leaflet';
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

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

// Reset view control (return to PNG center)
function ResetViewControl() {
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

        return () => {
            resetButton.remove();
        };
    }, [map]);

    return null;
}

function Map({ tickets: propTickets }) {
    const [rawFacilities, setRawFacilities] = useState([]); // Store all facilities
    const [facilities, setFacilities] = useState([]); // Computed facilities to show
    const [tickets, setTickets] = useState([]);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use the custom hook for location filtering
    const {
        filters: locationFilters,
        handleFilterChange,
        filteredData: locationFilteredFacilities,
        options
    } = useLocationFilter(facilities);

    // Sync prop tickets to state if provided
    useEffect(() => {
        if (propTickets) {
            setTickets(propTickets);
        }
    }, [propTickets]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Always fetch facilities. Only fetch tickets if not provided via props.
            const promises = [fetch('/api/facilities', { headers })];
            if (!propTickets) {
                promises.push(fetch('/api/tickets', { headers }));
            }

            const results = await Promise.all(promises);
            const facilitiesData = await results[0].json();
            const facilitiesList = facilitiesData.facilities || facilitiesData || [];
            setRawFacilities(facilitiesList);

            let ticketsList = [];
            if (!propTickets) {
                const ticketsData = await results[1].json();
                ticketsList = ticketsData.tickets || ticketsData || [];
                setTickets(ticketsList);
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

        // Filter to only facilities that have tickets AND have coordinates
        const filtered = rawFacilities.filter(f => {
            const hasTickets = facilitiesWithTickets.has(f.facility_id);
            const hasCoords = (f.latitude && f.longitude) || (f.lat && f.lng) || f.gps_coordinates;
            return hasTickets && hasCoords;
        });

        setFacilities(filtered);

    }, [rawFacilities, tickets]);

    // All facilities already filtered to have tickets AND coords
    const filteredFacilities = locationFilteredFacilities;

    // Helper for status logic (Shared with Dashboard)
    const getEffectiveStatus = (ticket) => {
        const s = ticket.status || ticket.ticket_status;
        return s === 'Pending Assignment' ? 'New' : s;
    };

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
    }, [filteredFacilities, tickets]);

    if (loading) {
        return (
            <div className="map-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading map...</p>
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
                    <span className="facility-count-badge">{filteredFacilities.length} facilities with tickets</span>
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
                    center={[-6.314993, 143.95555]}
                    zoom={8}
                    style={{ height: '100%', width: '100%', flex: 1, minHeight: 0 }}
                    zoomControl={true}
                    attributionControl={true}
                >
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
                    </LayersControl>

                    {/* Map Controls */}
                    <ScaleControl position="bottomleft" imperial={false} metric={true} />
                    <DistanceMeasurementTool />
                    <LocateControl />
                    <FullscreenControl />
                    <ResetViewControl />

                    {mapMarkers}
                </MapContainer>

                <MapLegend />

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
