import React, { useState, useEffect } from 'react';
import './TechnicianWorkspace.css';
import TechnicianTicketCard from '../components/TechnicianTicketCard';
import SparePartsRequestModal from '../components/SparePartsRequestModal';
import EscalateTicketModal from '../components/EscalateTicketModal';
import ResolveTicketModal from '../components/ResolveTicketModal';
import TicketDetailsModal from '../components/TicketDetailsModal';

function TechnicianWorkspace() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, assigned, inProgress, resolved

    // Modal states
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showSparePartsModal, setShowSparePartsModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false);

    useEffect(() => {
        fetchMyTickets();
    }, []);

    const fetchMyTickets = async () => {
        // ... (fetch logic remains same)
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/tickets/my-tickets', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch tickets');

            const data = await response.json();
            setTickets(data.tickets || data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setError('Failed to load your tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Action handlers
    const handleStartWork = async (ticketId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/tickets/${ticketId}/start-work`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchMyTickets();
        } catch (err) {
            console.error('Error starting work:', err);
        }
    };

    const handlePauseWork = async (ticketId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/tickets/${ticketId}/pause-work`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchMyTickets();
        } catch (err) {
            console.error('Error pausing work:', err);
        }
    };

    const handleRequestParts = (ticket) => {
        setSelectedTicket(ticket);
        setShowSparePartsModal(true);
    };

    const handleEscalate = (ticket) => {
        setSelectedTicket(ticket);
        setShowEscalateModal(true);
    };

    const handleResolve = (ticket) => {
        setSelectedTicket(ticket);
        setShowResolveModal(true);
    };

    const handleViewDetails = (ticket) => {
        setSelectedTicket(ticket);
        setShowTicketDetailsModal(true);
    };

    const handleModalClose = () => {
        setShowSparePartsModal(false);
        setShowEscalateModal(false);
        setShowResolveModal(false);
        setShowTicketDetailsModal(false);
        setSelectedTicket(null);
    };

    const handleActionComplete = () => {
        fetchMyTickets();
        handleModalClose();
    };

    // Get ticket counts by status - TECHNICIAN WORKFLOW
    const getStatus = (ticket) => ticket.ticket_status || ticket.status;

    // Filter to ONLY show tickets assigned to current user (exclude New/Unassigned)
    const assignedToMe = tickets.filter(t => {
        const status = getStatus(t);
        // Exclude "New", "Open", "Pending Assignment" - those stay on main Tickets page
        return status && !['New', 'Unassigned'].includes(status);
    });

    // Map to technician workflow categories
    const mapToCategory = (status) => {
        if (!status) return 'other';
        const s = status.toLowerCase();

        // Assigned (not yet started)
        if (s === 'assigned') {
            return 'assigned';
        }

        // In Progress
        if (s.includes('progress') || s.includes('working')) {
            return 'inProgress';
        }

        // Escalated
        if (s.includes('escalated')) {
            return 'escalated';
        }

        // Resolved (includes both resolved AND closed - normalized)
        if (s.includes('resolved') || s.includes('completed') || s.includes('fixed') ||
            s.includes('closed') || s.includes('done')) {
            return 'resolved';
        }

        return 'other';
    };

    const assignedTickets = assignedToMe.filter(t => mapToCategory(getStatus(t)) === 'assigned');
    const inProgressTickets = assignedToMe.filter(t => mapToCategory(getStatus(t)) === 'inProgress');
    const escalatedTickets = assignedToMe.filter(t => mapToCategory(getStatus(t)) === 'escalated');
    const resolvedTickets = assignedToMe.filter(t => mapToCategory(getStatus(t)) === 'resolved'); // Includes closed

    // Get filtered tickets based on active tab
    const getFilteredTickets = () => {
        let tabTickets = assignedToMe; // Default to ALL tickets assigned to me

        if (activeTab === 'all') tabTickets = assignedToMe;
        else if (activeTab === 'assigned') tabTickets = assignedTickets;
        else if (activeTab === 'inProgress') tabTickets = inProgressTickets;
        else if (activeTab === 'escalated') tabTickets = escalatedTickets;
        else if (activeTab === 'resolved') tabTickets = resolvedTickets; // Includes closed now

        if (searchQuery === '') return tabTickets;

        return tabTickets.filter(ticket =>
            ticket.ticket_reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ticket.description || ticket.fault_description)?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredTickets = getFilteredTickets();

    if (loading) {
        return (
            <div className="workspace-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading your tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="workspace-container">
            {/* Sticky Header */}
            <div className="workspace-header-sticky">
                <div className="workspace-header-content">
                    <h1>My Workspace</h1>
                    <p className="header-subtitle">Manage your assigned tickets and work orders</p>
                </div>

                {/* Tab Buttons - Technician Workflow */}
                <div className="workspace-tabs">
                    <button
                        className={`tab-card ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <span className="tab-value">{assignedToMe.length}</span>
                        <span className="tab-label">My Tickets</span>
                        <span className="tab-description">All assigned to me</span>
                    </button>

                    <button
                        className={`tab-card ${activeTab === 'assigned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assigned')}
                    >
                        <span className="tab-value">{assignedTickets.length}</span>
                        <span className="tab-label">Assigned</span>
                        <span className="tab-description">Not yet started</span>
                    </button>

                    <button
                        className={`tab-card ${activeTab === 'inProgress' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inProgress')}
                    >
                        <span className="tab-value">{inProgressTickets.length}</span>
                        <span className="tab-label">In Progress</span>
                        <span className="tab-description">Currently working on</span>
                    </button>

                    <button
                        className={`tab-card ${activeTab === 'escalated' ? 'active' : ''}`}
                        onClick={() => setActiveTab('escalated')}
                    >
                        <span className="tab-value">{escalatedTickets.length}</span>
                        <span className="tab-label">Escalated</span>
                        <span className="tab-description">Needs supervisor</span>
                    </button>

                    <button
                        className={`tab-card ${activeTab === 'resolved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resolved')}
                    >
                        <span className="tab-value">{resolvedTickets.length}</span>
                        <span className="tab-label">Resolved</span>
                        <span className="tab-description">Completed & Closed</span>
                    </button>
                </div>

                {/* Search Box */}
                <div className="search-box-sticky">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
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

            {/* Tickets Grid */}
            <div className="workspace-content">
                {filteredTickets.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No {activeTab.replace(/([A-Z])/g, ' $1').toLowerCase()} tickets</p>
                        <span>You don't have any {activeTab.replace(/([A-Z])/g, ' $1').toLowerCase()} tickets at the moment</span>
                    </div>
                ) : (
                    <div className="tickets-grid">
                        {filteredTickets.map(ticket => (
                            <TechnicianTicketCard
                                key={ticket.ticket_id}
                                ticket={ticket}
                                onStartWork={handleStartWork}
                                onPauseWork={handlePauseWork}
                                onRequestParts={handleRequestParts}
                                onEscalate={handleEscalate}
                                onResolve={handleResolve}
                                onViewDetails={handleViewDetails}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <SparePartsRequestModal
                isOpen={showSparePartsModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSubmit={handleActionComplete}
            />

            <EscalateTicketModal
                isOpen={showEscalateModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSubmit={handleActionComplete}
            />

            <ResolveTicketModal
                isOpen={showResolveModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
                onSubmit={handleActionComplete}
            />

            <TicketDetailsModal
                isOpen={showTicketDetailsModal}
                onClose={handleModalClose}
                ticket={selectedTicket}
            />
        </div>
    );
}

export default TechnicianWorkspace;
