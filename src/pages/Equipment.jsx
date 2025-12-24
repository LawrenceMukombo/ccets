import React, { useState, useEffect } from 'react';
import './Equipment.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import EquipmentDetailsModal from '../components/EquipmentDetailsModal';
import ReportFaultModal from '../components/ReportFaultModal';

function Equipment() {
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [selectedEquipmentForReport, setSelectedEquipmentForReport] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [uniqueFacilityCount, setUniqueFacilityCount] = useState(0);

    // Use the custom hook for location filtering
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        filteredData: locationFilteredEquipment,
        options
    } = useLocationFilter(equipment);

    useEffect(() => {
        fetchEquipment();
    }, []); // Only fetch once on mount

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Fetch ALL equipment data (no pagination on backend)
            const response = await fetch(`/api/equipment?limit=10000`, { headers });
            const data = await response.json();

            console.log('API Response:', { status: response.status, data });

            if (data.success) {
                const equipmentList = data.equipment || [];
                setEquipment(equipmentList);
                setTotalCount(data.total || equipmentList.length);
                setUniqueFacilityCount(data.uniqueFacilities || 0);
                setError(null);
            } else {
                console.error('API Error:', data);
                setError(data.message || 'Failed to load equipment');
            }
        } catch (err) {
            console.error('Fetch Error:', err);
            setError('Failed to load equipment data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        const maxPage = Math.ceil(filteredEquipment.length / limit);
        if (newPage >= 1 && newPage <= maxPage) {
            setPage(newPage);
        }
    };

    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1); // Reset to first page when changing limit
    };

    // Pagination Controls Component
    const PaginationControls = ({ position }) => {
        const displayTotal = filteredEquipment.length;
        const displayTotalPages = calculatedTotalPages;
        const start = displayTotal > 0 ? (page - 1) * limit + 1 : 0;
        const end = Math.min(page * limit, displayTotal);

        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(displayTotalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className={`pagination-controls ${position}`}>
                <div className="pagination-info">
                    Showing {start}-{end} of {displayTotal} equipment items
                </div>
                <div className="pagination-actions">
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(1)}
                        disabled={page === 1}
                    >
                        First
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                    >
                        ← Prev
                    </button>

                    <select
                        className="page-select"
                        value={page}
                        onChange={(e) => handlePageChange(parseInt(e.target.value))}
                    >
                        {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>
                                Page {num}
                            </option>
                        ))}
                    </select>

                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === displayTotalPages}
                    >
                        Next →
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(displayTotalPages)}
                        disabled={page === displayTotalPages}
                    >
                        Last
                    </button>

                    <select
                        className="page-select"
                        value={limit}
                        onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                    >
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                        <option value={200}>200 per page</option>
                    </select>
                </div>
            </div>
        );
    };

    // Apply search filter on top of location filters (but NOT status filter yet)
    const searchFilteredEquipment = locationFilteredEquipment.filter(item => {
        if (searchFilter) {
            const searchLower = searchFilter.toLowerCase();
            return (
                item.facility_name?.toLowerCase().includes(searchLower) ||
                item.serial_number?.toLowerCase().includes(searchLower) ||
                item.model?.toLowerCase().includes(searchLower) ||
                item.item_type?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    // Calculate stats from searchFilteredEquipment (before status filter)
    // This ensures stats are accurate regardless of which status card is clicked
    const stats = {
        totalEquipment: searchFilteredEquipment.length,
        totalFacilities: new Set(searchFilteredEquipment.map(e => e.facility_name)).size,
        functioning: searchFilteredEquipment.filter(e => e.is_functioning !== false).length,
        notFunctioning: searchFilteredEquipment.filter(e => e.is_functioning === false).length
    };

    // NOW apply status filter for display
    const filteredEquipment = searchFilteredEquipment.filter(item => {
        if (statusFilter !== 'all') {
            return statusFilter === 'functioning' ? (item.is_functioning !== false) : (item.is_functioning === false);
        }
        return true;
    });

    // Handle stat card clicks to filter equipment
    const handleStatCardClick = (filterType) => {
        setStatusFilter(filterType);
        setPage(1); // Reset to first page when filtering
    };

    // Calculate totalPages based on filtered results
    const calculatedTotalPages = Math.ceil(filteredEquipment.length / limit);

    // Get paginated slice of filtered equipment for display
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEquipment = filteredEquipment.slice(startIndex, endIndex);

    console.log('Equipment Stats:', {
        totalFromBackend: totalCount,
        uniqueFacilitiesFromBackend: uniqueFacilityCount,
        allEquipmentLoaded: equipment.length,
        locationFilters,
        locationFilteredCount: locationFilteredEquipment.length,
        finalFilteredCount: filteredEquipment.length,
        currentPage: page,
        totalPages: calculatedTotalPages,
        displayingItems: paginatedEquipment.length,
        statsShown: stats
    });

    if (loading) {
        return (
            <div className="equipment-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading equipment data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="equipment-container">
            {/* Header ... */}
            <div className="equipment-header">
                <div className="header-content">
                    <div>
                        <h1>📦 Equipment Inventory</h1>
                        <p className="header-subtitle">
                            View and manage cold chain equipment across all health facilities
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

            {/* Filters ... */}
            <div className="filters-section">
                <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search equipment..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="status-filter"
                    >
                        <option value="all">All Status</option>
                        <option value="functioning">Functioning</option>
                        <option value="not-functioning">Not Functioning</option>
                    </select>

                    <LocationFilter
                        filters={locationFilters}
                        options={options}
                        onFilterChange={handleLocationFilterChange}
                    />
                </div>
            </div>

            {/* Equipment Table */}
            {filteredEquipment.length === 0 ? (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M20 7h-9M14 17H5M16 21V3M3 21V9m0 12h18M3 9l9-6 9 6" />
                    </svg>
                    <p>No equipment data found</p>
                    <span>Try adjusting your filters</span>
                </div>
            ) : (
                <>
                    <PaginationControls position="top" />
                    <div className="table-container">
                        <table className="equipment-table">
                            <thead>
                                <tr>
                                    <th>FACILITY</th>
                                    <th>TYPE</th>
                                    <th>MANUFACTURER</th>
                                    <th>MODEL</th>
                                    <th>SERIAL NO</th>
                                    <th>STATUS</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEquipment.map((item) => (
                                    <tr
                                        key={item.equipment_id}
                                        onClick={() => setSelectedItem(item)}
                                        style={{ cursor: 'pointer' }}
                                        className="equipment-row-clickable"
                                    >
                                        <td>
                                            <div className="facility-name-cell">
                                                {item.facility_name || 'Unnamed Facility'}
                                                <span style={{ fontSize: '11px', display: 'block', color: '#64748b' }}>
                                                    {item.province}, {item.district}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{item.item_type || '-'}</td>
                                        <td>{item.manufacturer || '-'}</td>
                                        <td>{item.model || '-'}</td>
                                        <td className="font-mono text-sm">{item.serial_number || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${item.is_functioning !== false ? 'status-functioning' : 'status-not-functioning'}`}>
                                                {item.is_functioning !== false ? 'Functioning' : 'Not Functioning'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="icon-btn view-btn"
                                                    title="View Details"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(item);
                                                    }}
                                                >
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
                    <PaginationControls position="bottom" />
                </>
            )}

            {/* Modal */}
            <EquipmentDetailsModal
                equipment={selectedItem}
                onClose={(action) => {
                    if (action === 'report_fault') {
                        setSelectedEquipmentForReport(selectedItem);
                        setReportModalOpen(true);
                    }
                    setSelectedItem(null);
                }}
            />

            <ReportFaultModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                equipment={selectedEquipmentForReport}
                onSuccess={() => {
                    // Refresh data to show updated status potentially? 
                    // Though tickets don't immediately change equipment status unless we program it.
                    fetchEquipment();
                }}
            />
        </div>
    );
}

export default Equipment; // Ensure export works cleanly if mistakenly nested or duplicate

