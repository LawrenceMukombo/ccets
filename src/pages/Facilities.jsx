import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../context/TenantContext';
import './Facilities.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import EnterpriseDataTable from '../components/Common/EnterpriseDataTable';
import FacilityDetailsModal from '../components/FacilityDetailsModal';

function Facilities() {
    const { tenantCode, config } = useTenant();
    
    // Table states
    const [facilities, setFacilities] = useState([]);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [allFacilitiesForOptions, setAllFacilitiesForOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination & Sort states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('facility_name');
    const [sortDirection, setSortDirection] = useState('asc');
    
    // Filter states
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Dynamic Hierarchy
    const hierarchy = config?.hierarchy || [
        { id: 'province', name: 'Province' },
        { id: 'district', name: 'District' }
    ];

    const isFilterableLevel = (level) => {
        if (!level || !level.id) return false;
        const idLower = level.id.toLowerCase();
        const nameLower = (level.name || '').toLowerCase();
        const nonFilteringTerms = [
            'national', 'country', 'facility', 'health_facility', 'healthfacility', 'system'
        ];
        const isExcluded = nonFilteringTerms.some(term => 
            idLower.includes(term) || nameLower.includes(term)
        );
        if (idLower === 'level_3' && nameLower === 'national') return false;
        if (idLower === 'level_4' && nameLower === 'health facility') return false;
        return !isExcluded;
    };

    const filterableLocationHierarchy = useMemo(() => {
        return hierarchy.filter(isFilterableLevel);
    }, [hierarchy]);

    // Location Filter options calculated from in-memory metadata list
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        clearFilters: clearLocationFilters,
        options
    } = useLocationFilter(allFacilitiesForOptions, {
        hierarchy: filterableLocationHierarchy,
        facilityField: 'facility_name'
    });

    // 1. Fetch metadata once for dropdown options
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                };
                const response = await fetch(`/api/${tenantCode}/facilities?limit=10000`, { headers });
                const data = await response.json();
                setAllFacilitiesForOptions(data.data || data.facilities || data || []);
            } catch (err) {
                console.error('Error fetching facility metadata:', err);
            }
        };
        fetchMetadata();
    }, [tenantCode]);

    // 2. Fetch active page of data whenever pagination, sorting, or filters change
    useEffect(() => {
        fetchTableData();
    }, [page, pageSize, sortBy, sortDirection, searchFilter, statusFilter, locationFilters]);

    const fetchTableData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortDirection,
                search: searchFilter,
                status: statusFilter,
                region: locationFilters.region || 'all',
                province: locationFilters.province || 'all',
                district: locationFilters.district || 'all',
                facility: locationFilters.facility || 'all'
            });

            const response = await fetch(`/api/${tenantCode}/facilities?${params}`, { headers });
            if (!response.ok) {
                throw new Error('Failed to retrieve facilities from server');
            }
            const data = await response.json();

            setFacilities(data.data || data.facilities || []);
            setTotalRecords(data.pagination?.totalRecords || (data.data || data.facilities || []).length);
            setTotalPages(data.pagination?.totalPages || 1);
            setError(null);
        } catch (err) {
            console.error('Error fetching facilities table data:', err);
            setError('Failed to load facilities. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Columns Definition
    const columns = [
        { id: 'facility_name', label: 'Name', sortable: true, defaultVisible: true, hideable: false },
        { id: 'facility_code', label: 'Code', sortable: true, defaultVisible: true },
        ...filterableLocationHierarchy.map(level => ({
            id: level.id,
            label: level.name.toUpperCase(),
            sortable: true,
            defaultVisible: true
        })),
        { id: 'type', label: 'Type', sortable: true, defaultVisible: true },
        { 
            id: 'is_functioning', 
            label: 'Status', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => (
                <span className={`status-badge ${val ? 'status-open' : 'status-closed'}`}>
                    {val ? 'Functioning' : 'Not Functioning'}
                </span>
            )
        },
        { id: 'equipment_count', label: 'Equip.', sortable: true, defaultVisible: true }
    ];

    // Row dropdown actions
    const rowActions = [
        {
            label: 'Edit',
            icon: '✏️',
            action: (facility) => {
                alert(`Edit Facility: ${facility.facility_name}`);
            }
        },
        {
            label: 'View Details',
            icon: '👁️',
            action: (facility) => {
                setSelectedFacility(facility);
            }
        }
    ];

    const handleClearFilters = () => {
        setSearchFilter('');
        setStatusFilter('all');
        clearLocationFilters();
        setPage(1);
    };

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

            {/* Smart Cascade Filters */}
            <div className="filters-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="functioning">Functioning</option>
                            <option value="non-functioning">Non-Functioning</option>
                        </select>
                    </div>
                    
                    <LocationFilter
                        filters={locationFilters}
                        options={options}
                        onFilterChange={(key, value) => { handleLocationFilterChange(key, value); setPage(1); }}
                        compactMode={false}
                    />
                </div>
            </div>

            {/* Enterprise DataTable */}
            <EnterpriseDataTable
                tableName="facilities"
                columns={columns}
                data={facilities}
                loading={loading}
                error={error}
                serverSide={true}
                pagination={{
                    page,
                    pageSize,
                    totalRecords,
                    totalPages,
                    onPageChange: (newPage) => setPage(newPage),
                    onPageSizeChange: (newPageSize) => { setPageSize(newPageSize); setPage(1); }
                }}
                sort={{
                    sortBy,
                    sortDirection,
                    onSort: (colId, direction) => { setSortBy(colId); setSortDirection(direction); }
                }}
                searchValue={searchFilter}
                onSearchChange={(val) => { setSearchFilter(val); setPage(1); }}
                filters={{
                    values: {
                        status: statusFilter,
                        ...locationFilters
                    },
                    onChange: (key, val) => {
                        if (key === 'status') setStatusFilter(val);
                        else handleLocationFilterChange(key, val);
                        setPage(1);
                    },
                    onClear: handleClearFilters
                }}
                rowActions={rowActions}
                rowActionKey="facility_id"
            />

            {selectedFacility && (
                <FacilityDetailsModal
                    facility={selectedFacility}
                    onClose={() => setSelectedFacility(null)}
                />
            )}
        </div>
    );
}

export default Facilities;
