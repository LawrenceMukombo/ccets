import React, { useState, useEffect } from 'react';
import './Modal.css';
import './TicketDetailsModal.css';

const TicketDetailsModal = ({ isOpen, onClose, ticket }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, timeline
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'timeline' && ticket) {
            fetchHistory();
        }
    }, [isOpen, activeTab, ticket]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/tickets/${ticket.ticket_id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data.history || data || []);
                // Note: controller returns array directly in some implementations, checks logic
            }
        } catch (error) {
            console.error('Failed to fetch ticket history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (!isOpen || !ticket) return null;

    const getStatusColor = (status) => {
        const colors = {
            'Assigned': '#f59e0b',
            'In Progress': '#3b82f6',
            'Resolved': '#10b981',
            'Closed': '#10b981',
            'Escalated': '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large ticket-details-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>
                        <span>Ticket Details</span>
                        <span className="ticket-ref-badge">#{ticket.ticket_reference_number || ticket.ticket_id}</span>
                    </h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <div
                        className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </div>
                    <div
                        className={`modal-tab ${activeTab === 'timeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Timeline & History
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="modal-body-scroll">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Status Banner */}
                            <div className="status-grid">
                                <div className="status-box">
                                    <span className="status-label">Status</span>
                                    <span className="status-value" style={{ color: getStatusColor(ticket.status || ticket.ticket_status) }}>
                                        {ticket.status || ticket.ticket_status}
                                    </span>
                                </div>
                                <div className="status-box">
                                    <span className="status-label">Priority</span>
                                    <span className="status-value">{ticket.priority}</span>
                                </div>
                                <div className="status-box">
                                    <span className="status-label">Created</span>
                                    <span className="status-value">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="status-box">
                                    <span className="status-label">Assigned To</span>
                                    <span className="status-value">{ticket.assigned_to_name || 'Unassigned'}</span>
                                </div>
                            </div>

                            <div className="details-grid">
                                {/* Left Column */}
                                <div className="details-column">
                                    <div className="info-section">
                                        <h3>Issue Description</h3>
                                        <div className="description-text">
                                            {ticket.description || ticket.fault_description || 'No description provided.'}
                                        </div>
                                    </div>

                                    {(ticket.resolution_notes || ticket.work_performed) && (
                                        <div className="info-section">
                                            <h3>Resolution Details</h3>
                                            <div className="description-text" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#065f46' }}>
                                                <strong>Work Performed:</strong><br />
                                                {ticket.work_performed || 'N/A'}
                                                <br /><br />
                                                <strong>Notes:</strong><br />
                                                {ticket.resolution_notes || 'N/A'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column */}
                                <div className="details-column sidebar">
                                    <div className="info-section">
                                        <h3>Facility Information</h3>
                                        <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                                            <div className="info-item">
                                                <label>Facility Name</label>
                                                <span>{ticket.facility_name}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>Location</label>
                                                <span>{ticket.district || ''}, {ticket.province || ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-section">
                                        <h3>Equipment Details</h3>
                                        <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                                            <div className="info-item">
                                                <label>Manufacturer / Model</label>
                                                <span>{ticket.equipment_manufacturer || 'N/A'} {ticket.equipment_model ? `- ${ticket.equipment_model}` : ''}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>Serial Number</label>
                                                <span>{ticket.equipment_serial_number || 'N/A'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>Refrigerant Gas</label>
                                                <span>{ticket.equipment_refrigerant_gas || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div className="timeline-container">
                            {loadingHistory ? (
                                <div className="loading-timeline">Loading history...</div>
                            ) : (
                                <div className="timeline-list">
                                    {/* Render fetched history */}
                                    {history.map((event, index) => (
                                        <div key={index} className={`timeline-item ${event.type}`}>
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <span className="timeline-user">{event.user || 'System'}</span>
                                                    <span className="timeline-date">{new Date(event.timestamp).toLocaleString()}</span>
                                                </div>
                                                <span className={`timeline-type type-${event.type}`}>{event.type.replace('_', ' ')}</span>
                                                <div className="timeline-details">
                                                    {event.details}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    {/* Can add Edit/Action buttons here if needed */}
                </div>
            </div>
        </div>
    );
};

export default TicketDetailsModal;
