import React, { useState, useEffect } from 'react';
import './TechnicianTicketCard.css';

const TechnicianTicketCard = ({ ticket, onStartWork, onPauseWork, onRequestParts, onEscalate, onResolve, onViewDetails }) => {
    const [workTimer, setWorkTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setWorkTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const formatTimer = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = (status) => {
        const colors = {
            'Assigned': '#f59e0b',
            'In Progress': '#3b82f6',
            'Resolved': '#10b981',
            'Closed': '#10b981'
        };
        return colors[status] || '#6b7280';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'Critical': '#dc2626',
            'High': '#ea580c',
            'Medium': '#f59e0b',
            'Low': '#3b82f6'
        };
        return colors[priority] || '#6b7280';
    };

    const handleStartWork = (e) => {
        e.stopPropagation();
        setIsTimerRunning(true);
        onStartWork(ticket.ticket_id);
    };

    const handlePauseWork = (e) => {
        e.stopPropagation();
        setIsTimerRunning(false);
        onPauseWork(ticket.ticket_id);
    };

    const handleResolve = (e) => {
        e.stopPropagation();
        onResolve(ticket);
    };

    const handleRequestParts = (e) => {
        e.stopPropagation();
        onRequestParts(ticket);
    };

    const handleEscalate = (e) => {
        e.stopPropagation();
        onEscalate(ticket);
    };

    const isInProgress = ticket.status === 'In Progress';
    const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';
    const isPaused = !isInProgress && !isResolved && ticket.work_paused_at && ticket.work_started_at &&
        new Date(ticket.work_paused_at) > new Date(ticket.work_started_at);

    return (
        <div className="tech-ticket-card" onClick={() => onViewDetails(ticket)} style={{ cursor: 'pointer' }}>
            {/* Card Header */}
            <div className="card-header">
                <div className="ticket-ref-badge">
                    #{ticket.ticket_reference_number}
                </div>
                <div className="card-badges">
                    <span
                        className="status-badge-small"
                        style={{ backgroundColor: getStatusColor(ticket.status) }}
                    >
                        {ticket.status === 'Closed' ? 'Resolved' : ticket.status}
                    </span>
                    <span
                        className="priority-badge-small"
                        style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                    >
                        {ticket.priority}
                    </span>
                </div>
            </div>

            {/* Facility Info */}
            <div className="card-facility">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{ticket.facility_name}</span>
            </div>

            {/* Equipment Info */}
            {(ticket.equipment_manufacturer || ticket.equipment_model) && (
                <div className="card-equipment">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span>{ticket.equipment_manufacturer || 'Equipment'} {ticket.equipment_model ? `- ${ticket.equipment_model}` : ''}</span>
                </div>
            )}

            {/* Description */}
            <div className="card-description">
                {ticket.description || ticket.fault_description || 'No description provided'}
            </div>

            {/* Work Timer */}
            {isInProgress && (
                <div className="work-timer">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Time: {formatTimer(workTimer)}</span>
                </div>
            )}

            {/* Ticket On Hold Banner */}
            {isPaused && (
                <div className="on-hold-banner">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Ticket is on Hold</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="card-actions">
                {!isResolved && (
                    <>
                        {!isInProgress ? (
                            <button className="action-btn primary-action" onClick={handleStartWork}>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                {isPaused ? 'Resume Work' : 'Start Work'}
                            </button>
                        ) : (
                            <>
                                <button className="action-btn secondary-action" onClick={handlePauseWork}>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Pause
                                </button>
                                <button className="action-btn success-action" onClick={handleResolve}>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Resolve
                                </button>
                            </>
                        )}
                    </>
                )}

                {isResolved && (
                    <div className="resolved-message">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Ticket Resolved</span>
                    </div>
                )}
            </div>

            {/* Additional Actions */}
            {!isResolved && (
                <div className="card-secondary-actions">
                    <button className="secondary-btn" onClick={handleRequestParts} title="Request Spare Parts">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        </svg>
                        Parts
                    </button>
                    <button className="secondary-btn" onClick={handleEscalate} title="Escalate Ticket">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Escalate
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="card-footer">
                <div className="footer-item">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                {(ticket.district || ticket.district_name) && (
                    <div className="footer-item">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{ticket.district || ticket.district_name}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicianTicketCard;
