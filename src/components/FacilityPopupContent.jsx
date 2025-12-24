import React from 'react';

const FacilityPopupContent = ({ facility, tickets }) => {
    const facilityTickets = tickets.filter(t => String(t.facility_id) === String(facility.facility_id));

    const getEffectiveStatus = (ticket) => {
        const s = ticket.status || ticket.ticket_status;
        return s === 'Pending Assignment' ? 'New' : s;
    };

    // Determine aggregate status
    const openTickets = facilityTickets.filter(t => {
        const status = getEffectiveStatus(t);
        return !['Resolved', 'Closed'].includes(status);
    });

    let aggregateStatus = 'Healthy';
    let headerColor = '#10b981'; // Green

    if (openTickets.length > 0) {
        const priorities = openTickets.map(t => t.priority);
        const statuses = openTickets.map(t => getEffectiveStatus(t));

        if (priorities.includes('Critical')) {
            aggregateStatus = 'Critical Issues';
            headerColor = '#dc2626'; // Red-600
        } else if (statuses.includes('Escalated')) {
            aggregateStatus = 'Escalated Issues';
            headerColor = '#ef4444'; // Red
        } else if (priorities.includes('High')) {
            aggregateStatus = 'High Priority Issues';
            headerColor = '#ea580c'; // Orange-600
        } else if (statuses.includes('On Hold')) {
            aggregateStatus = 'On Hold';
            headerColor = '#f59e0b'; // Amber
        } else {
            aggregateStatus = 'Active Tickets';
            headerColor = '#3b82f6'; // Blue
        }
    } else if (facilityTickets.length === 0) {
        aggregateStatus = 'No Records';
        headerColor = '#94a3b8';
    }

    const statusColors = {
        'New': { bg: '#dbeafe', text: '#1e3a8a' },              // Blue (Brand new)
        'Assigned': { bg: '#f3e8ff', text: '#6b21a8' },         // Violet (Has technician)
        'In Progress': { bg: '#e0e7ff', text: '#3730a3' },      // Indigo (Being worked on)
        'On Hold': { bg: '#fef3c7', text: '#92400e' },          // Amber
        'Escalated': { bg: '#fee2e2', text: '#991b1b' },        // Red (Critical)
        'Resolved': { bg: '#d1fae5', text: '#065f46' },         // Emerald (Fixed)
        'Closed': { bg: '#e2e8f0', text: '#475569' },           // Slate (Archived)
        'Reassigned': { bg: '#fef9c3', text: '#854d0e' }        // Yellow (Transferred)
    };

    const priorityColors = {
        'Critical': { bg: '#fee2e2', text: '#dc2626' },
        'High': { bg: '#fed7aa', text: '#ea580c' },
        'Medium': { bg: '#fef3c7', text: '#d97706' },
        'Low': { bg: '#dbeafe', text: '#2563eb' }
    };

    return (
        <div style={{ minWidth: '300px', maxHeight: '380px', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', borderBottom: `3px solid ${headerColor}`, paddingBottom: '8px' }}>
                {facility.facility_name}
            </h3>
            <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: headerColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: headerColor, display: 'inline-block' }}></span>
                {aggregateStatus}
            </div>
            <p style={{ margin: '4px 0 8px 0', fontSize: '12px', color: '#64748b' }}>
                📍 {facility.district}, {facility.province}
            </p>
            {facility.facility_code && (
                <p style={{ margin: '4px 0 12px 0', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Code: {facility.facility_code}
                </p>
            )}

            <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    🎫 Tickets ({facilityTickets.length})
                </h4>
                {facilityTickets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {facilityTickets.map((ticket, idx) => {
                            const effectiveStatus = getEffectiveStatus(ticket);
                            const statusColor = statusColors[effectiveStatus] || { bg: '#f3f4f6', text: '#6b7280' };
                            const priorityColor = priorityColors[ticket.priority] || { bg: '#f3f4f6', text: '#6b7280' };

                            return (
                                <div key={ticket.ticket_id} style={{
                                    padding: '10px',
                                    background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '11px'
                                }}>
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong style={{ fontSize: '12px', color: '#1e293b' }}>
                                            #{ticket.ticket_reference_number}
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            background: statusColor.bg,
                                            color: statusColor.text
                                        }}>
                                            {effectiveStatus}
                                        </span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            background: priorityColor.bg,
                                            color: priorityColor.text
                                        }}>
                                            {ticket.priority}
                                        </span>
                                    </div>

                                    {ticket.description && (
                                        <p style={{ margin: '4px 0', color: '#475569', fontSize: '11px', lineHeight: '1.4' }}>
                                            {ticket.description.length > 80
                                                ? ticket.description.substring(0, 80) + '...'
                                                : ticket.description}
                                        </p>
                                    )}

                                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#94a3b8' }}>
                                        Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                                    </div>

                                    {ticket.assigned_to_name && (
                                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
                                            👤 Assigned to:{ticket.assigned_to_name}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No tickets found</p>
                )}
            </div>
        </div>
    );
};

export default FacilityPopupContent;
