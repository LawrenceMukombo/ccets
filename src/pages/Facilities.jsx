import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './Facilities.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';

function Facilities() {
    const { tenantCode, config } = useTenant();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');

    // Dynamic Hierarchy
    const hierarchy = config?.hierarchy || [
        { id: 'province', name: 'Province' },
        { id: 'district', name: 'District' }
    ];

    // Use the custom hook for location filtering
    // Configure with correct field names for facilities data
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        filteredData: locationFilteredFacilities,
        options
    } = useLocationFilter(facilities, {
        hierarchy: hierarchy,
        facilityField: 'facility_name'
    });

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`/api/${tenantCode}/facilities`, { headers });
            const data = await response.json();

            const facilitiesList = data.facilities || data || [];
            console.log('Facilities Data:', facilitiesList.slice(0, 3)); // Log first 3 items
            console.log('Sample facility:', facilitiesList[0]); // Log first facility to see structure
            setFacilities(facilitiesList);
            setError(null);
        } catch (err) {
            console.error('Error fetching facilities:', err);
            setError('Failed to load facilities. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Apply search filter on top of location filters
    const filteredFacilities = locationFilteredFacilities.filter(f => {
        if (searchFilter) {
            const searchLower = searchFilter.toLowerCase();
            return (
                f.facility_name?.toLowerCase().includes(searchLower) ||
                f.facility_code?.toLowerCase().includes(searchLower) ||
                f.province?.toLowerCase().includes(searchLower) ||
                f.district?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    if (loading) {
        return (
            <div className="facilities-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading facilities...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="facilities-container">
            {/* Header */}
            <div className="facilities-header">
                <div className="header-content">
                    <div>
                        <h1>Facilities</h1>
                        <p className="header-subtitle">
                            Manage health facilities and equipment inventory
                        </p>
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

            {/* Filters */}
            <div className="filters-section">
                <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search facilities..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <LocationFilter
                        filters={locationFilters}
                        options={options}
                        onFilterChange={handleLocationFilterChange}
                    />
                </div>
            </div>

            {/* Facilities Table */}
            {filteredFacilities.length === 0 ? (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No facilities found</p>
                    <span>Try adjusting your filters or add a new facility</span>
                </div>
            ) : (
                <div className="table-container">
                    <table className="facilities-table">
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>CODE</th>
                                {hierarchy.map(level => (
                                    <th key={level.id}>{level.name.toUpperCase()}</th>
                                ))}
                                <th>TYPE</th>
                                <th>STATUS</th>
                                <th>EQUIP.</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFacilities.map((facility) => (
                                <tr key={facility.facility_id}>
                                    <td>
                                        <div className="facility-name-cell">
                                            {facility.facility_name || 'Unnamed Facility'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="code-cell">
                                            {facility.facility_code || '-'}
                                        </div>
                                    </td>
                                    {hierarchy.map(level => (
                                        <td key={level.id}>{facility[level.id] || '-'}</td>
                                    ))}
                                    <td>{facility.type || '-'}</td>
                                    <td>
                                        <span className={`status-badge ${facility.is_functioning ? 'status-open' : 'status-closed'}`}>
                                            {facility.is_functioning ? 'Functioning' : 'Not Functioning'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="equip-count-cell">
                                            {facility.equipment_count || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="icon-btn edit-btn" title="Edit">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button className="icon-btn view-btn" title="View Details">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Facilities;
