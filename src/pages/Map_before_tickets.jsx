import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-measure';
import './Map.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';

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
        const measureControl = new L.Control.Measure({
            position: 'topleft',
            primaryLengthUnit: 'kilometers',
            secondaryLengthUnit: 'meters',
            primaryAreaUnit: 'sqkilometers',
            secondaryAreaUnit: 'hectares'
        });
        measureControl.addTo(map);
        return () => {
            measureControl.remove();
        };
    }, [map]);
    return null;
}

function Map() {
    const [facilities, setFacilities] = useState([]);
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

            // Fetch both facilities and tickets
            const [facilitiesRes, ticketsRes] = await Promise.all([
                fetch('/api/facilities', { headers }),
                fetch('/api/tickets', { headers })
            ]);

            const facilitiesData = await facilitiesRes.json();
            const ticketsData = await ticketsRes.json();

            const facilitiesList = facilitiesData.facilities || facilitiesData || [];
            const ticketsList = ticketsData.tickets || ticketsData || [];

            // Get unique facility IDs from tickets
            const facilitiesWithTickets = new Set(ticketsList.map(t => t.facility_id));

            // Filter to only facilities that have tickets AND have coordinates
            const filteredFacilities = facilitiesList.filter(f => {
                const hasTickets = facilitiesWithTickets.has(f.facility_id);
                const hasCoords = (f.latitude && f.longitude) || (f.lat && f.lng) || f.gps_coordinates;
                return hasTickets && hasCoords;
            });

            setFacilities(filteredFacilities);
            setTickets(ticketsList);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // All facilities already filtered to have tickets
    const filteredFacilities = locationFilteredFacilities;

    // Generate map markers from facilities with coordinates
    const mapMarkers = useMemo(() => {
        const markers = [];

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
                markers.push(
                    <Marker
                        key={facility.facility_id}
                        position={[lat, lng]}
                        eventHandlers={{
                            click: () => setSelectedFacility(facility)
                        }}
                    >
                        <Popup>
                            <div style={{ minWidth: '200px' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                                    {facility.facility_name}
                                </h3>
                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                                    {facility.district}, {facility.province}
                                </p>
                                {facility.facility_code && (
                                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#888' }}>
                                        Code: {facility.facility_code}
                                    </p>
                                )}
                                {facility.equipment_count !== undefined && (
                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                        Equipment: {facility.equipment_count}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            }
        });

        console.log(`Generated ${markers.length} markers from ${filteredFacilities.length} facilities`);
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
        <div className="map-container-modern">
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

            {/* Filters in one row right above map */}
            <div className="map-filters-bar">
                <LocationFilter
                    filters={locationFilters}
                    options={options}
                    onFilterChange={handleFilterChange}
                    compactMode={true}
                />
            </div>

            {/* Full width map */}
            <div className="map-area-fullwidth">
                <MapContainer
                    center={[-6.314993, 143.95555]}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
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
                    </LayersControl>
                    <MeasureControl />
                    {mapMarkers}
                </MapContainer>

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
