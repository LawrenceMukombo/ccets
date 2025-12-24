import React from 'react';
import '../pages/Tickets.css';

const TicketsTable = ({
    tickets,
    selectedIds = new Set(),
    onToggleSelectAll,
    onToggleSelectOne,
    sortConfig,
    onSort,
    onRowClick,
    onAction, // (type, ticket) => {}
    activeDropdown,
    onToggleDropdown
}) => {

    const getSortIndicator = (key) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const requestSort = (key) => {
        if (onSort) onSort(key);
    };

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

    return (
        <table className="tickets-table">
            <thead>
                <tr>
                    <th style={{ width: '40px' }}>
                        {onToggleSelectAll && (
                            <input
                                type="checkbox"
                                checked={tickets.length > 0 && selectedIds.size === tickets.length}
                                onChange={onToggleSelectAll}
                            />
                        )}
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
                {tickets.map((ticket) => (
                    <tr
                        key={ticket.ticket_id}
                        onClick={() => onRowClick && onRowClick(ticket)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                        className={selectedIds.has(ticket.ticket_id) ? 'selected-row' : ''}
                    >
                        <td onClick={(e) => e.stopPropagation()}>
                            {onToggleSelectOne && (
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(ticket.ticket_id)}
                                    onChange={() => onToggleSelectOne(ticket.ticket_id)}
                                />
                            )}
                        </td>
                        <td><div className="ticket-ref">{ticket.ticket_reference_number || `TKT-${ticket.ticket_id}`}</div></td>
                        <td>{ticket.region_name || '-'}</td>
                        <td>{ticket.province_name || '-'}</td>
                        <td>{ticket.district_name || '-'}</td>
                        <td>{ticket.facility_name || '-'}</td>
                        <td>
                            <div className="fault-info">
                                <div className="fault-icon-title">
                                    <span className="fault-title">{ticket.equipment_manufacturer || ticket.equipment_type || 'Equipment'}</span>
                                </div>
                                <div className="fault-description">{ticket.fault_description}</div>
                            </div>
                        </td>
                        <td>
                            <span className={`status-badge ${getStatusBadgeClass(ticket.ticket_status || ticket.status)}`}>
                                {ticket.ticket_status || ticket.status}
                            </span>
                        </td>
                        <td>{ticket.assigned_to_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}</td>
                        <td>{formatDate(ticket.created_at)}</td>
                        <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="actions-dropdown">
                                <button className="actions-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleDropdown) onToggleDropdown(ticket.ticket_id);
                                }}>•••</button>
                                {activeDropdown === ticket.ticket_id && (
                                    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                        <button className="dropdown-item" onClick={() => onAction && onAction('view', ticket)}>View Details</button>
                                        <button className="dropdown-item" onClick={() => onAction && onAction('edit', ticket)}>Edit</button>

                                        {ticket.assigned_to_name ? (
                                            <>
                                                <button className="dropdown-item" onClick={() => onAction && onAction('assign', ticket)}>Reassign</button>
                                                <button className="dropdown-item" onClick={() => onAction && onAction('escalate', ticket)}>Escalate</button>
                                            </>
                                        ) : (
                                            <button className="dropdown-item" onClick={() => onAction && onAction('assign', ticket)}>Assign</button>
                                        )}

                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item dropdown-item-danger" onClick={() => onAction && onAction('delete', ticket)}>Delete</button>
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default TicketsTable;
