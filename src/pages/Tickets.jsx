import React, { useState, useEffect, useMemo } from 'react';
import './Tickets.css';
import '../components/TicketActionsDropdown.css';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';
import GlobalFilter from '../components/GlobalFilter';
import AssignTicketModal from '../components/AssignTicketModal';
import TicketDetailsModal from '../components/TicketDetailsModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import CreateTicketModal from '../components/Tickets/CreateTicketModal';
import EditTicketModal from '../components/EditTicketModal';
import EscalateTicketModal from '../components/EscalateTicketModal';

function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Bulk Actions State
    const [selectedTicketIds, setSelectedTicketIds] = useState(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });



    // Use the custom hook for location filtering
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        clearFilters: clearLocationFilters,
        filteredData: locationFilteredTickets,
        options: locationOptions
    } = useLocationFilter(tickets, {
        regionField: 'region_name',
        provinceField: 'province_name',
        districtField: 'district_name'
    });

    const [filters, setFilters] = useState({
        search: '',
        facility: 'all',
        status: 'all',
        assignee: 'all',
        equipmentType: 'all',
        dateStart: '',
        dateEnd: ''
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, locationFilteredTickets]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch('/api/tickets', { headers });
            const data = await response.json();
            const ticketsList = data.tickets || data || [];
            setTickets(ticketsList);
            setError(null);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setError('Failed to load tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter Options
    const filterOptions = useMemo(() => {
        const facilities = [...new Set(locationFilteredTickets.map(t => t.facility_id).filter(Boolean))].sort();
        const statuses = [...new Set(tickets.map(t => t.ticket_status || t.status).filter(Boolean))];
        const assignees = [...new Set(tickets.map(t => t.assigned_to_name).filter(Boolean))];
        const equipmentTypes = [...new Set(tickets.map(t => t.equipment_manufacturer || t.equipment_type).filter(Boolean))];

        return {
            facilities,
            statuses: statuses.sort(),
            assignees: assignees.sort(),
            equipmentTypes: equipmentTypes.sort()
        };
    }, [tickets, locationFilteredTickets]);

    const applyFilters = () => {
        let filtered = [...locationFilteredTickets];

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                t.ticket_id?.toString().includes(searchLower) ||
                t.ticket_reference_number?.toLowerCase().includes(searchLower) ||
                t.facility_id?.toString().includes(searchLower) ||
                t.fault_description?.toLowerCase().includes(searchLower) ||
                t.equipment_manufacturer?.toLowerCase().includes(searchLower) ||
                t.assigned_to_name?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.dateStart) {
            const start = new Date(filters.dateStart);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => new Date(t.created_at) >= start);
        }
        if (filters.dateEnd) {
            const end = new Date(filters.dateEnd);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.created_at) <= end);
        }

        if (filters.facility !== 'all') filtered = filtered.filter(t => t.facility_id?.toString() === filters.facility);
        if (filters.status !== 'all') filtered = filtered.filter(t => (t.ticket_status || t.status) === filters.status);
        if (filters.assignee !== 'all') filtered = filtered.filter(t => t.assigned_to_name === filters.assignee);
        if (filters.equipmentType !== 'all') filtered = filtered.filter(t => (t.equipment_manufacturer || t.equipment_type) === filters.equipmentType);

        setFilteredTickets(filtered);
    };

    // Sorting Logic
    const sortedTickets = useMemo(() => {
        let sorted = [...filteredTickets];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredTickets, sortConfig]);

    const requestSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => {
        setFilters({ search: '', facility: 'all', status: 'all', assignee: 'all', equipmentType: 'all' });
        clearLocationFilters();
        setSortConfig({ key: 'created_at', direction: 'desc' });
    };

    const getStatusColor = (status) => {
        const statusMap = {
            'New': 'status-new',
            'Assigned': 'status-assigned',
            'In Progress': 'status-in-progress',
            'Escalated': 'status-escalated',
            'Resolved': 'status-resolved',
            'Closed': 'status-closed',
            'On Hold': 'status-on-hold'
        };
        return statusMap[status] || 'status-default';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Actions
    const handleViewTicket = (ticket) => { setSelectedTicket(ticket); setShowDetailsModal(true); setActiveDropdown(null); };
    const handleAssignTicket = (ticket) => { setSelectedTicket(ticket); setShowAssignModal(true); setActiveDropdown(null); };
    const handleEscalateTicket = (ticket) => { setSelectedTicket(ticket); setShowEscalateModal(true); setActiveDropdown(null); };
    const handleEditTicket = (ticket) => { setSelectedTicket(ticket); setShowEditModal(true); setActiveDropdown(null); setShowDetailsModal(false); };
    const handleDeleteTicket = (ticket) => { setSelectedTicket(ticket); setShowDeleteModal(true); setActiveDropdown(null); };
    const handleCreateTicket = () => setShowCreateModal(true);
    const handleCreateSuccess = () => { fetchTickets(); setShowCreateModal(false); };
    const handleModalClose = () => { setShowAssignModal(false); setShowEscalateModal(false); setShowDetailsModal(false); setShowDeleteModal(false); setShowCreateModal(false); setShowEditModal(false); setSelectedTicket(null); };
    const handleTicketUpdated = () => { fetchTickets(); handleModalClose(); setSelectedTicketIds(new Set()); };
    const toggleDropdown = (ticketId) => setActiveDropdown(activeDropdown === ticketId ? null : ticketId);

    // Bulk Handlers
    const toggleSelectAll = () => {
        if (selectedTicketIds.size === sortedTickets.length && sortedTickets.length > 0) {
            setSelectedTicketIds(new Set());
        } else {
            setSelectedTicketIds(new Set(sortedTickets.map(t => t.ticket_id)));
        }
    };

    const toggleSelectOne = (id) => {
        const newSet = new Set(selectedTicketIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedTicketIds(newSet);
    };

    const handleBulkAssign = () => {
        setSelectedTicket(null); // Clear single selection
        setShowAssignModal(true);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedTicketIds.size} tickets?`)) return;
        setIsBulkProcessing(true);
        try {
            const token = localStorage.getItem('token');
            for (const id of selectedTicketIds) {
                await fetch(`/api/tickets/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            fetchTickets();
            setSelectedTicketIds(new Set());
        } catch (e) {
            console.error("Bulk delete failed", e);
            setError("Some tickets could not be deleted");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        if (activeDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [activeDropdown]);

    if (loading) return <div className="tickets-container"><div className="loading-spinner"><div className="spinner"></div><p>Loading tickets...</p></div></div>;

    return (
        <>
            <div className={`tickets-container`}>
                <div className="tickets-header">
                    <div className="header-content">
                        <div>
                            <h1>Tickets Management</h1>
                            <p className="header-subtitle">Manage and track all equipment tickets</p>
                        </div>

                    </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                {/* Bulk Actions Bar or Filters */}
                {selectedTicketIds.size > 0 ? (
                    <div className="filters-bar bulk-mode" style={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9', color: '#0d47a1' }}>
                        <div className="filter-item" style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', marginRight: '20px' }}>
                            {selectedTicketIds.size} Selected
                        </div>
                        <button className="btn btn-primary filter-item" onClick={handleBulkAssign} style={{ marginRight: '10px' }}>
                            Assign Selected
                        </button>
                        <button className="btn btn-danger filter-item" onClick={handleBulkDelete} disabled={isBulkProcessing}>
                            {isBulkProcessing ? 'Deleting...' : 'Delete Selected'}
                        </button>
                        <button className="btn btn-secondary filter-item" onClick={() => setSelectedTicketIds(new Set())} style={{ marginLeft: 'auto' }}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <GlobalFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        showLocation={false}
                        showDate={true}
                    >
                        <LocationFilter
                            filters={locationFilters}
                            options={locationOptions}
                            onFilterChange={handleLocationFilterChange}
                            compactMode={true}
                            className="filter-item"
                        />

                        <div className="filter-group" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                            <select className="filter-input" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px' }} value={filters.facility} onChange={(e) => handleFilterChange('facility', e.target.value)}>
                                <option value="all">Facility</option>
                                {filterOptions.facilities.map(fid => <option key={fid} value={fid}>{fid}</option>)}
                            </select>
                        </div>

                        <div className="filter-group" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                            <select className="filter-input" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px' }} value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                                <option value="all">Status</option>
                                {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="filter-group" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                            <select className="filter-input" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px' }} value={filters.equipmentType} onChange={(e) => handleFilterChange('equipmentType', e.target.value)}>
                                <option value="all">Equipment</option>
                                {filterOptions.equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="filter-group" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                            <select className="filter-input" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px' }} value={filters.assignee} onChange={(e) => handleFilterChange('assignee', e.target.value)}>
                                <option value="all">Assignee</option>
                                {filterOptions.assignees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <button className="clear-filters-btn filter-item" onClick={clearFilters} title="Clear Global Filters">
                            Clear
                        </button>

                        <button className="create-button filter-item" onClick={handleCreateTicket} style={{ marginLeft: 'auto' }}>
                            + Create
                        </button>
                    </GlobalFilter>
                )}

                <div className="results-count-bar">
                    Showing {sortedTickets.length} tickets
                </div>

                <div className="tickets-table-container">
                    {sortedTickets.length === 0 ? (
                        <div className="empty-state"><p>No tickets found</p></div>
                    ) : (
                        <table className="tickets-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTicketIds.size === sortedTickets.length && sortedTickets.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th onClick={() => requestSort('ticket_reference_number')} className="sortable">
                                        REF {getSortIndicator('ticket_reference_number')}
                                    </th>
                                    <th onClick={() => requestSort('region_name')} className="sortable">
                                        REGION {getSortIndicator('region_name')}
                                    </th>
                                    <th onClick={() => requestSort('province_name')} className="sortable">
                                        PROVINCE {getSortIndicator('province_name')}
                                    </th>
                                    <th onClick={() => requestSort('district_name')} className="sortable">
                                        DISTRICT {getSortIndicator('district_name')}
                                    </th>
                                    <th onClick={() => requestSort('facility_name')} className="sortable">
                                        FACILITY {getSortIndicator('facility_name')}
                                    </th>
                                    <th onClick={() => requestSort('fault_description')} className="sortable">
                                        FAULT {getSortIndicator('fault_description')}
                                    </th>
                                    <th onClick={() => requestSort('ticket_status')} className="sortable">
                                        STATUS {getSortIndicator('ticket_status')}
                                    </th>
                                    <th onClick={() => requestSort('assigned_to_name')} className="sortable">
                                        ASSIGNEE {getSortIndicator('assigned_to_name')}
                                    </th>
                                    <th onClick={() => requestSort('created_at')} className="sortable">
                                        CREATED {getSortIndicator('created_at')}
                                    </th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTickets.map((ticket) => (
                                    <tr
                                        key={ticket.ticket_id}
                                        onClick={() => handleViewTicket(ticket)}
                                        style={{ cursor: 'pointer' }}
                                        className={selectedTicketIds.has(ticket.ticket_id) ? 'selected-row' : ''}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTicketIds.has(ticket.ticket_id)}
                                                onChange={() => toggleSelectOne(ticket.ticket_id)}
                                            />
                                        </td>
                                        <td><div className="ticket-ref">{ticket.ticket_reference_number || `TKT-${ticket.ticket_id}`}</div></td>
                                        <td>{ticket.region_name || '-'}</td>
                                        <td>{ticket.province_name || '-'}</td>
                                        <td>{ticket.district_name || '-'}</td>
                                        <td>{ticket.facility_name || '-'}</td>
                                        <td>
                                            <div className="fault-info">
                                                <div className="fault-icon-title">
                                                    <span className="fault-title">{ticket.equipment_manufacturer || 'Equipment'}</span>
                                                </div>
                                                <div className="fault-description">{ticket.fault_description}</div>
                                            </div>
                                        </td>
                                        <td><span className={`status-badge ${getStatusColor(ticket.ticket_status)}`}>{ticket.ticket_status}</span></td>
                                        <td>{ticket.assigned_to_name || 'Unassigned'}</td>
                                        <td>{formatDate(ticket.created_at)}</td>
                                        <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="actions-dropdown">
                                                <button className="actions-btn" onClick={(e) => { e.stopPropagation(); toggleDropdown(ticket.ticket_id); }}>•••</button>
                                                {activeDropdown === ticket.ticket_id && (
                                                    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                        <button className="dropdown-item" onClick={() => handleViewTicket(ticket)}>View Details</button>

                                                        {ticket.ticket_status !== 'Closed' && (
                                                            <>
                                                                <button className="dropdown-item" onClick={() => handleEditTicket(ticket)}>Edit</button>
                                                                {ticket.assigned_to ? (
                                                                    <>
                                                                        <button className="dropdown-item" onClick={() => handleAssignTicket(ticket)}>Reassign</button>
                                                                        <button className="dropdown-item" onClick={() => handleEscalateTicket(ticket)}>Escalate</button>
                                                                    </>
                                                                ) : (
                                                                    <button className="dropdown-item" onClick={() => handleAssignTicket(ticket)}>Assign</button>
                                                                )}
                                                            </>
                                                        )}

                                                        <div className="dropdown-divider"></div>
                                                        <button className="dropdown-item dropdown-item-danger" onClick={() => handleDeleteTicket(ticket)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div >

            {/* Modals - Order determines z-index stacking. Details first, then actions on top. */}
            <TicketDetailsModal isOpen={showDetailsModal} onClose={handleModalClose} ticket={selectedTicket} onAssign={handleAssignTicket} onEdit={handleEditTicket} />
            <AssignTicketModal
                isOpen={showAssignModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                ticketIds={showAssignModal && !selectedTicket ? Array.from(selectedTicketIds) : []}
                onAssign={handleTicketUpdated}
            />
            <EscalateTicketModal
                isOpen={showEscalateModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSubmit={handleTicketUpdated}
            />
            <DeleteConfirmationModal isOpen={showDeleteModal} onClose={handleModalClose} ticket={selectedTicket} onDelete={handleTicketUpdated} />
            {showCreateModal && <CreateTicketModal onClose={handleModalClose} onSuccess={handleCreateSuccess} />}
            {showEditModal && <EditTicketModal ticket={selectedTicket} onClose={() => setShowEditModal(false)} onSuccess={handleTicketUpdated} />}
        </>
    );
}

export default Tickets;
