import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './Equipment.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import EquipmentDetailsModal from '../components/EquipmentDetailsModal';
import ReportFaultModal from '../components/ReportFaultModal';
import EnterpriseDataTable from '../components/Common/EnterpriseDataTable';

function Equipment() {
    const { tenantCode, config } = useTenant();
    
    // Table states
    const [equipment, setEquipment] = useState([]);
    const [allEquipmentForOptions, setAllEquipmentForOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination & Sort states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('facility_name');
    const [sortDirection, setSortDirection] = useState('asc');
    
    // Filter states
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [selectedEquipmentForReport, setSelectedEquipmentForReport] = useState(null);

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
    } = useLocationFilter(allEquipmentForOptions, {
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
                const response = await fetch(`/api/${tenantCode}/equipment?limit=10000`, { headers });
                const data = await response.json();
                setAllEquipmentForOptions(data.data || data.equipment || []);
            } catch (err) {
                console.error('Error fetching equipment metadata:', err);
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

            const response = await fetch(`/api/${tenantCode}/equipment?${params}`, { headers });
            if (!response.ok) {
                throw new Error('Failed to retrieve equipment from server');
            }
            const data = await response.json();

            setEquipment(data.data || data.equipment || []);
            setTotalRecords(data.pagination?.totalRecords || (data.data || data.equipment || []).length);
            setTotalPages(data.pagination?.totalPages || 1);
            setError(null);
        } catch (err) {
            console.error('Error fetching equipment table data:', err);
            setError('Failed to load equipment data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Columns Definition
    const columns = [
        { 
            id: 'facility_name', 
            label: 'Facility', 
            sortable: true, 
            defaultVisible: true, 
            hideable: false,
            formatter: (val, item) => (
                <div className="facility-name-cell">
                    {val || 'Unnamed Facility'}
                    <span style={{ fontSize: '11px', display: 'block', color: '#64748b' }}>
                        {hierarchy.map(level => item[level.id]).filter(Boolean).join(', ')}
                    </span>
                </div>
            )
        },
        { id: 'item_type', label: 'Type', sortable: true, defaultVisible: true },
        { id: 'manufacturer', label: 'Manufacturer', sortable: true, defaultVisible: true },
        { id: 'model', label: 'Model', sortable: true, defaultVisible: true },
        { id: 'serial_number', label: 'Serial No', sortable: true, defaultVisible: true },
        { 
            id: 'is_functioning', 
            label: 'Status', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => (
                <span className={`status-badge ${val !== false ? 'status-functioning' : 'status-not-functioning'}`}>
                    {val !== false ? 'Functioning' : 'Not Functioning'}
                </span>
            )
        }
    ];

    // Row dropdown actions
    const rowActions = [
        {
            label: 'View Details',
            icon: '👁️',
            action: (item) => {
                setSelectedItem(item);
            }
        },
        {
            label: 'Report Fault',
            icon: '⚠️',
            action: (item) => {
                setSelectedEquipmentForReport(item);
                setReportModalOpen(true);
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
        <div className="equipment-container">
            {/* Header */}
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
                            <option value="all">All Status</option>
                            <option value="functioning">Functioning</option>
                            <option value="not-functioning">Not Functioning</option>
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
                tableName="equipment"
                columns={columns}
                data={equipment}
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
                rowActionKey="equipment_id"
                emptyTitle="No equipment found"
                emptyMessage="No cold chain equipment matching your active filters was found."
                onRowClick={(item) => setSelectedItem(item)}
            />

            {/* Modals */}
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
                    fetchTableData();
                }}
            />
        </div>
    );
}

export default Equipment;
