import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../context/TenantContext';
import './Tickets.css';
import '../components/TicketActionsDropdown.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import AssignTicketModal from '../components/AssignTicketModal';
import TicketDetailsModal from '../components/TicketDetailsModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import CreateTicketModal from '../components/Tickets/CreateTicketModal';
import EditTicketModal from '../components/EditTicketModal';
import EscalateTicketModal from '../components/EscalateTicketModal';
import EnterpriseDataTable from '../components/Common/EnterpriseDataTable';

const DEFAULT_TICKET_HIERARCHY = [
    { id: 'province', name: 'Province' },
    { id: 'district', name: 'District' }
];

function Tickets() {
    const { tenantCode, config } = useTenant();
    
    // Table states
    const [tickets, setTickets] = useState([]);
    const [allTicketsForOptions, setAllTicketsForOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination & Sort states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    // Dynamic Hierarchy
    const hierarchy = config?.hierarchy || DEFAULT_TICKET_HIERARCHY;

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

    // Modal states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Bulk Actions State
    const [selectedTicketIds, setSelectedTicketIds] = useState(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Filter states
    const [searchFilter, setSearchFilter] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        assignee: 'all',
        equipmentType: 'all'
    });

    // Location Filter options calculated from in-memory metadata list
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        clearFilters: clearLocationFilters,
        options: locationOptions
    } = useLocationFilter(allTicketsForOptions, {
        hierarchy: filterableLocationHierarchy,
        facilityField: 'facility_name'
    });

    // 1. Fetch metadata once for dropdown options
    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };
            const pageSizeForOptions = 10000;
            let currentPage = 1;
            let totalPagesForOptions = 1;
            const allOptionTickets = [];

            do {
                const params = new URLSearchParams({
                    page: String(currentPage),
                    pageSize: String(pageSizeForOptions),
                    sortBy: 'created_at',
                    sortDirection: 'desc'
                });
                const response = await fetch(`/api/${tenantCode}/tickets?${params}`, { headers });
                if (!response.ok) throw new Error('Failed to retrieve ticket metadata');
                const data = await response.json();
                const ticketsList = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.tickets) ? data.tickets : (Array.isArray(data) ? data : []));
                allOptionTickets.push(...ticketsList);
                totalPagesForOptions = data.pagination?.totalPages || (ticketsList.length === pageSizeForOptions ? currentPage + 1 : currentPage);
                currentPage += 1;
            } while (currentPage <= totalPagesForOptions);

            setAllTicketsForOptions(allOptionTickets);
        } catch (err) {
            console.error('Error fetching ticket metadata:', err);
        }
    };
    useEffect(() => {
        fetchMetadata();
    }, [tenantCode, filterableLocationHierarchy]);

    // 2. Fetch active page of data whenever pagination, sorting, or filters change
    useEffect(() => {
        fetchTableData();
    }, [page, pageSize, sortBy, sortDirection, searchFilter, filters, locationFilters, filterableLocationHierarchy]);

    const fetchTableData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const locationParams = {
                region: 'all',
                province: 'all',
                district: 'all'
            };
            filterableLocationHierarchy.forEach(level => {
                if (Object.prototype.hasOwnProperty.call(locationParams, level.id)) {
                    locationParams[level.id] = locationFilters[level.id] || 'all';
                }
            });

            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortDirection,
                search: searchFilter,
                status: filters.status,
                assignee: filters.assignee,
                ...locationParams,
                facility: locationFilters.facility || 'all'
            });

            const response = await fetch(`/api/${tenantCode}/tickets?${params}`, { headers });
            if (!response.ok) {
                throw new Error('Failed to retrieve tickets from server');
            }
            const data = await response.json();

            const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.tickets) ? data.tickets : (Array.isArray(data) ? data : []));
            setTickets(list);
            setTotalRecords(data.pagination?.totalRecords || list.length);
            setTotalPages(data.pagination?.totalPages || 1);
            setError(null);
        } catch (err) {
            console.error('Error fetching tickets table data:', err);
            setError('Failed to load tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Extract dynamic dropdown options from the raw tickets list metadata
    const dropdownOptions = useMemo(() => {
        const safeOptions = Array.isArray(allTicketsForOptions) ? allTicketsForOptions : [];
        const uniqueStatuses = [...new Set(safeOptions.map(t => t.ticket_status).filter(Boolean))].sort();
        const uniqueAssignees = [...new Set(safeOptions.map(t => t.assigned_to_name).filter(Boolean))].sort();
        return {
            statuses: uniqueStatuses,
            assignees: uniqueAssignees
        };
    }, [allTicketsForOptions]);

    const getStatusBadgeClass = (status) => {
        let s = status || 'New';
        if (s === 'Pending Assignment') s = 'New';
        const map = {
            'New': 'status-new',
            'Assigned': 'status-assigned',
            'In Progress': 'status-in-progress',
            'Escalated': 'status-escalated',
            'Resolved': 'status-resolved',
            'Closed': 'status-closed',
            'On Hold': 'status-on-hold'
        };
        return map[s] || 'status-default';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Row dropdown actions
    const rowActions = [
        {
            label: 'View Details',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â',
            action: (ticket) => { setSelectedTicket(ticket); setShowDetailsModal(true); }
        },
        {
            label: 'Assign',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤',
            action: (ticket) => { setSelectedTicket(ticket); setShowAssignModal(true); },
            disabled: (ticket) => ticket.ticket_status === 'Closed'
        },
        {
            label: 'Escalate',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€ ',
            action: (ticket) => { setSelectedTicket(ticket); setShowEscalateModal(true); },
            disabled: (ticket) => ['Resolved', 'Closed'].includes(ticket.ticket_status)
        },
        {
            label: 'Edit',
            icon: 'ÃƒÂ¢Ã…â€œÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â',
            action: (ticket) => { setSelectedTicket(ticket); setShowEditModal(true); }
        },
        {
            label: 'Delete',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â',
            action: (ticket) => { setSelectedTicket(ticket); setShowDeleteModal(true); },
            destructive: true
        }
    ];

    // Bulk actions list
    const bulkActions = [
        {
            label: 'Assign Selected',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤',
            action: (ids) => {
                setSelectedTicket(null); // Indicates bulk operation in modal
                setShowAssignModal(true);
            }
        },
        {
            label: 'Delete Selected',
            icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â',
            action: (ids) => {
                handleBulkDelete(ids);
            },
            destructive: true
        }
    ];

    const handleBulkDelete = async (ids) => {
        if (!window.confirm(`Are you sure you want to delete ${ids.size} tickets?`)) return;
        setIsBulkProcessing(true);
        try {
            const token = localStorage.getItem('token');
            for (const id of ids) {
                await fetch(`/api/${tenantCode}/tickets/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            fetchMetadata();
            fetchTableData();
            setSelectedTicketIds(new Set());
        } catch (e) {
            console.error("Bulk delete failed", e);
            setError("Some tickets could not be deleted");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchFilter('');
        setFilters({
            status: 'all',
            assignee: 'all',
            equipmentType: 'all'
        });
        clearLocationFilters();
        setPage(1);
    };

    const handleModalClose = () => {
        setShowAssignModal(false);
        setShowEscalateModal(false);
        setShowDetailsModal(false);
        setShowDeleteModal(false);
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedTicket(null);
    };

    const handleTicketUpdated = () => {
        fetchMetadata();
        fetchTableData();
        handleModalClose();
        setSelectedTicketIds(new Set());
    };

    // Columns Definition
    const columns = [
        { 
            id: 'ticket_reference_number', 
            label: 'REF', 
            sortable: true, 
            defaultVisible: true, 
            hideable: false,
            formatter: (val, item) => (
                <span className="ref-number" style={{ fontWeight: 'bold' }}>
                    #{val || item.ticket_id}
                </span>
            )
        },
        ...filterableLocationHierarchy.map(level => ({
            id: level.id === 'region' ? 'region_name' : level.id === 'province' ? 'province_name' : 'district_name',
            label: level.name.toUpperCase(),
            sortable: true,
            defaultVisible: true
        })),
        { id: 'facility_name', label: 'FACILITY', sortable: true, defaultVisible: true },
        { id: 'fault_description', label: 'FAULT INFORMATION', sortable: true, defaultVisible: true },
        { 
            id: 'ticket_status', 
            label: 'STATUS', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => (
                <span className={`status-badge ${getStatusBadgeClass(val)}`}>
                    {val || 'New'}
                </span>
            )
        },
        { id: 'assigned_to_name', label: 'ASSIGNEE', sortable: true, defaultVisible: true },
        { 
            id: 'created_at', 
            label: 'CREATED', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => formatDate(val)
        }
    ];

    return (
        <div className="tickets-container">
            {/* Header */}
            <div className="tickets-header">
                <div className="header-content">
                    <div>
                        <h1>Tickets Management</h1>
                        <p className="header-subtitle">Manage and track all equipment tickets</p>
                    </div>
                    <button className="create-button" onClick={() => setShowCreateModal(true)} style={{ height: '38px', alignSelf: 'center' }}>
                        + Create Ticket
                    </button>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* Smart Cascade Filters */}
            <div className="filters-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="filter-select"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                        >
                            <option value="all">All Statuses</option>
                            {dropdownOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Assignee</label>
                        <select
                            value={filters.assignee}
                            onChange={(e) => handleFilterChange('assignee', e.target.value)}
                            className="filter-select"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                        >
                            <option value="all">All Assignees</option>
                            {dropdownOptions.assignees.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>


                    <LocationFilter
                        filters={locationFilters}
                        options={locationOptions}
                        onFilterChange={(key, value) => { handleLocationFilterChange(key, value); setPage(1); }}
                        compactMode={false}
                        hierarchy={filterableLocationHierarchy}
                    />
                </div>
            </div>

            {/* Enterprise DataTable */}
            <EnterpriseDataTable
                tableName="tickets"
                columns={columns}
                data={tickets}
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
                        status: filters.status,
                        assignee: filters.assignee,
                        ...locationFilters
                    },
                    onChange: (key, val) => {
                        if (['status', 'assignee'].includes(key)) {
                            handleFilterChange(key, val);
                        } else {
                            handleLocationFilterChange(key, val);
                        }
                        setPage(1);
                    },
                    onClear: handleClearFilters
                }}
                selectable={true}
                selectedIds={selectedTicketIds}
                onSelectChange={setSelectedTicketIds}
                bulkActions={bulkActions}
                rowActions={rowActions}
                rowActionKey="ticket_id"
                emptyTitle="No tickets found"
                emptyMessage="No tickets matching your location and status criteria are currently active."
                onRowClick={(item) => { setSelectedTicket(item); setShowDetailsModal(true); }}
            />

            {/* Modals */}
            <AssignTicketModal
                isOpen={showAssignModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                selectedTicketIds={selectedTicket === null ? selectedTicketIds : new Set([selectedTicket.ticket_id])}
                onSuccess={handleTicketUpdated}
            />

            <EscalateTicketModal
                isOpen={showEscalateModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSuccess={handleTicketUpdated}
            />

            <TicketDetailsModal
                isOpen={showDetailsModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onAction={(type, ticket) => {
                    if (type === 'assign') handleAssignTicket(ticket);
                    else if (type === 'escalate') handleEscalateTicket(ticket);
                    else if (type === 'edit') handleEditTicket(ticket);
                    else if (type === 'delete') handleDeleteTicket(ticket);
                }}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSuccess={handleTicketUpdated}
            />

            {showCreateModal && (
                <CreateTicketModal
                    onClose={handleModalClose}
                    onSuccess={handleTicketUpdated}
                />
            )}

            {showEditModal && selectedTicket && (
                <EditTicketModal
                    onClose={handleModalClose}
                    ticket={selectedTicket}
                    onSuccess={handleTicketUpdated}
                />
            )}
        </div>
    );
}

export default Tickets;
