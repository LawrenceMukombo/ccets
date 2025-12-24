import React, { useState, useEffect, useMemo } from 'react';
import './Repairs.css';
import GlobalFilter from '../components/GlobalFilter';
import { useLocationFilter } from '../hooks/useLocationFilter';
import LocationFilter from '../components/LocationFilter';

// Modals
import CreateTicketModal from '../components/Tickets/CreateTicketModal';
import TicketDetailsModal from '../components/TicketDetailsModal';
import EquipmentHistoryModal from '../components/EquipmentHistoryModal';

function Repairs() {
    const [repairs, setRepairs] = useState([]);
    const [filteredRepairs, setFilteredRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View State
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'facility', 'equipment'

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);

    const [filters, setFilters] = useState({
        status: 'all',
        facility: 'all',
        search: '',
        dateStart: '',
        dateEnd: ''
    });

    // Location Filter Hook
    const {
        filters: locationFilters,
        handleFilterChange: handleLocationFilterChange,
        filteredData: locationFilteredRepairs,
        options: locationOptions
    } = useLocationFilter(repairs, {
        regionField: 'region_name',
        provinceField: 'province',
        districtField: 'district'
    });

    useEffect(() => {
        fetchRepairs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, locationFilteredRepairs, activeTab]);

    const fetchRepairs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch('/api/tickets', { headers });

            if (response.ok) {
                const data = await response.json();
                const allTickets = data.tickets || [];
                const processed = allTickets.map(t => ({
                    ...t,
                    status: t.ticket_status === 'Pending Assignment' ? 'New' : t.ticket_status,
                    equipment_name: t.equipment_name || t.equipment_manufacturer || 'Unknown Equipment',
                    district: t.district_name || t.district,
                    province: t.province_name || t.province
                }));

                setRepairs(processed);
                setFilteredRepairs(processed);
            } else {
                setError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching repairs:', err);
            setError('Failed to load repairs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...locationFilteredRepairs];

        if (filters.facility && filters.facility !== 'all') {
            filtered = filtered.filter(r => r.facility_name === filters.facility);
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(r => r.status === filters.status);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(r =>
                r.ticket_reference_number?.toLowerCase().includes(searchLower) ||
                r.facility_name?.toLowerCase().includes(searchLower) ||
                r.equipment_name?.toLowerCase().includes(searchLower) ||
                r.fault_description?.toLowerCase().includes(searchLower)
            );
        }



        if (filters.dateStart) {
            const start = new Date(filters.dateStart);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(r => new Date(r.created_at) >= start);
        }

        if (filters.dateEnd) {
            const end = new Date(filters.dateEnd);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => new Date(r.created_at) <= end);
        }

        setFilteredRepairs(filtered);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const getStatusClass = (status) => {
        const map = {
            'New': 'status-new',
            'Assigned': 'status-assigned',
            'In Progress': 'status-in-progress',
            'Escalated': 'status-escalated',
            'Resolved': 'status-resolved',
            'Closed': 'status-closed',
            'On Hold': 'status-on-hold'
        };
        return map[status] || 'status-default';
    };

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'N/A';
        const options = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        if (includeTime) {
            options.hour = 'numeric';
            options.minute = 'numeric';
        }

        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const handleTicketCreated = (newTicket) => {
        const processed = { ...newTicket, status: newTicket.ticket_status };
        setRepairs(prev => [processed, ...prev]);
        setShowCreateModal(false);
    };

    const handleTicketUpdated = (updatedTicket) => {
        const processed = { ...updatedTicket, status: updatedTicket.ticket_status };
        setRepairs(prev => prev.map(t => t.ticket_id === processed.ticket_id ? processed : t));
        setSelectedTicket(null);
    };

    // Grouping Helpers
    const getGroupedByFacility = () => {
        const groups = {};
        filteredRepairs.forEach(r => {
            const fac = r.facility_name || 'Unknown Facility';
            if (!groups[fac]) groups[fac] = { items: [] };
            groups[fac].items.push(r);
        });
        return groups;
    };

    const getGroupedByEquipment = () => {
        const groups = {};
        filteredRepairs.forEach(r => {
            const eqName = r.equipment_model || r.equipment_manufacturer || 'Equipment';
            const facility = r.facility_name || 'Unknown';
            // Use composite key for grouping but store object for display
            const key = `${facility} - ${eqName}`;

            if (!groups[key]) {
                groups[key] = {
                    name: eqName,
                    facility: facility,
                    equipmentId: r.equipment_id,
                    items: []
                };
            }
            groups[key].items.push(r);
        });
        return groups;
    };

    const renderGridView = () => (
        <div className="repairs-grid">
            {filteredRepairs.map((repair) => (
                <div key={repair.ticket_id} className="repair-card" onClick={() => setSelectedTicket(repair)}>
                    <div className="repair-header">
                        <div className="repair-id">
                            <span className="ref-number">#{repair.ticket_reference_number || repair.ticket_id}</span>
                        </div>
                        <span className={`status-badge ${getStatusClass(repair.status)}`}>
                            {repair.status}
                        </span>
                    </div>

                    <div className="repair-details">
                        <h3>{repair.facility_name || 'Unknown Facility'}</h3>
                        <p className="equipment-type">{repair.equipment_name}</p>
                        <p className="fault-desc" title={repair.fault_description}>
                            {repair.fault_description || 'No description provided'}
                        </p>
                    </div>

                    <div className="repair-meta">
                        <div className="meta-item">
                            <span>📅 {formatDate(repair.created_at)}</span>
                        </div>
                        <div className="meta-item">
                            <span>👤 {repair.assigned_to_name || 'Unassigned'}</span>
                        </div>
                    </div>

                    <div className="repair-actions">
                        <button className="action-btn view-btn">View Details</button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderGroupedView = (groups, type) => (
        <div className="grouped-container">
            {Object.entries(groups).map(([key, group]) => {
                const isEquipmentGroup = type === 'equipment';
                const items = group.items;
                const groupTitle = isEquipmentGroup ? key : key;

                return (
                    <div key={key} className="group-section">
                        <div className="group-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3>{groupTitle} <span className="count-badge">{items.length}</span></h3>
                                {isEquipmentGroup && group.equipmentId && (
                                    <button
                                        className="history-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEquipment({
                                                id: group.equipmentId,
                                                name: group.name,
                                                facility: group.facility
                                            });
                                        }}
                                        style={{ fontSize: '11px', padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        View History 📜
                                    </button>
                                )}
                            </div>
                            <div className="group-stats">
                                {type === 'facility' && (
                                    <>
                                        <span className="mini-stat pending">{items.filter(i => ['New', 'Assigned'].includes(i.status)).length} Pending</span>
                                        <span className="mini-stat progress">{items.filter(i => i.status === 'In Progress').length} Active</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="group-cards-row">
                            {items.map(repair => (
                                <div key={repair.ticket_id} className="repair-card mini" onClick={() => setSelectedTicket(repair)}>
                                    <div className="repair-header">
                                        <span className={`status-dot ${getStatusClass(repair.status)}`}></span>
                                        <span className="ref-number">#{repair.ticket_reference_number}</span>
                                    </div>
                                    <div className="repair-mini-details">
                                        <p className="mini-desc">{repair.fault_description}</p>
                                        <small>{formatDate(repair.created_at)}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const facilityOptions = useMemo(() => {
        return [...new Set(locationFilteredRepairs.map(r => r.facility_name).filter(Boolean))].sort();
    }, [locationFilteredRepairs]);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading...</p></div>;

    return (
        <div className="repairs-container">
            <div className="sticky-header">
                <div className="repairs-header">
                    <div className="header-content">
                        <div>
                            <h1>Repairs & Maintenance</h1>
                            <p className="header-subtitle">Active maintenance oversight</p>
                        </div>
                        <button className="create-button" onClick={() => setShowCreateModal(true)}>
                            + New Ticket
                        </button>
                    </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="repairs-controls">
                    <div className="tabs-bar">
                        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Repairs</button>
                        <button className={`tab-btn ${activeTab === 'facility' ? 'active' : ''}`} onClick={() => setActiveTab('facility')}>By Facility</button>
                        <button className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>By Equipment</button>
                    </div>

                    <GlobalFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    >
                        <LocationFilter
                            filters={locationFilters}
                            options={locationOptions}
                            onFilterChange={handleLocationFilterChange}
                            compactMode={true}
                            className="filter-item"
                        />

                        <div className="filter-group">
                            <span className="filter-label">Facility</span>
                            <select
                                className="filter-input"
                                style={{ cursor: 'pointer' }}
                                value={filters.facility}
                                onChange={(e) => handleFilterChange('facility', e.target.value)}
                            >
                                <option value="all">All Facilities</option>
                                {facilityOptions.map(fac => (
                                    <option key={fac} value={fac}>{fac}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <span className="filter-label">Status</span>
                            <select
                                className="filter-input"
                                style={{ cursor: 'pointer' }}
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="New">New</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                                <option value="On Hold">On Hold</option>
                            </select>
                        </div>
                    </GlobalFilter>
                </div>
            </div>

            <div className="repairs-content-area">
                {filteredRepairs.length === 0 ? (
                    <div className="empty-state">No repairs found matching your filters.</div>
                ) : (
                    <>
                        {activeTab === 'all' && renderGridView()}
                        {activeTab === 'facility' && renderGroupedView(getGroupedByFacility(), 'facility')}
                        {activeTab === 'equipment' && renderGroupedView(getGroupedByEquipment(), 'equipment')}
                    </>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateTicketModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleTicketCreated}
                />
            )}

            {selectedTicket && (
                <TicketDetailsModal
                    isOpen={true} // FIX: Explicitly passing isOpen
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={handleTicketUpdated}
                />
            )}

            {selectedEquipment && (
                <EquipmentHistoryModal
                    isOpen={true}
                    onClose={() => setSelectedEquipment(null)}
                    equipmentId={selectedEquipment.id}
                    equipmentName={selectedEquipment.name}
                    facilityName={selectedEquipment.facility}
                />
            )}
        </div>
    );
}

export default Repairs;
