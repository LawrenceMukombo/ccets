import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './Modal.css';

const AssignTicketModal = ({ isOpen, onClose, ticket, ticketIds, onAssign }) => {
    const { tenantCode } = useTenant();
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechnician, setSelectedTechnician] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const targets = ticketIds && ticketIds.length > 0 ? ticketIds : (ticket ? [ticket.ticket_id] : []);
    const isBulk = targets.length > 1;

    useEffect(() => {
        if (isOpen) {
            fetchTechnicians();
            // If single ticket, check current assignment
            if (!isBulk && ticket?.assigned_to) {
                setSelectedTechnician(ticket.assigned_to);
            } else {
                setSelectedTechnician('');
            }
        }
    }, [isOpen, ticket, ticketIds, isBulk]);

    const fetchTechnicians = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/users?role=technician`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            const techList = data.users || data || [];
            setTechnicians(Array.isArray(techList) ? techList : []);
        } catch (err) {
            console.error('Error fetching technicians:', err);
            setError('Failed to load technicians');
            setTechnicians([]);
        }
    };

    const handleAssign = async () => {
        if (!selectedTechnician) {
            setError('Please select a technician');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            // Loop through all targets
            // In a better implementation, use a bulk API endpoint
            const promises = targets.map(id =>
                fetch(`/api/${tenantCode}/tickets/${id}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ assigned_to: selectedTechnician })
                })
            );

            const results = await Promise.all(promises);
            for (const res of results) {
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    const detailMsg = errData.detail ? ` (${errData.detail})` : '';
                    const fullMsg = errData.error 
                        ? `${errData.message || 'Error'}: ${errData.error}${detailMsg}`
                        : (errData.message || 'Failed to assign ticket(s)');
                    throw new Error(fullMsg);
                }
            }

            onAssign(); // Refresh list
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to assign ticket(s)');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isBulk ? `Assign ${targets.length} Tickets` : 'Assign Ticket'}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {!isBulk && ticket && (
                        <>
                            <div className="form-group">
                                <label>Ticket Reference</label>
                                <input
                                    type="text"
                                    value={ticket.ticket_reference_number || `TKT-${ticket.ticket_id}`}
                                    disabled
                                    className="form-control"
                                />
                            </div>

                            <div className="form-group">
                                <label>Facility</label>
                                <input
                                    type="text"
                                    value={ticket.facility_name || ''}
                                    disabled
                                    className="form-control"
                                />
                            </div>
                        </>
                    )}

                    {isBulk && (
                        <div className="form-group">
                            <p style={{ marginBottom: '10px' }}>You are assigning <strong>{targets.length}</strong> tickets.</p>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Select Technician *</label>
                        <select
                            value={selectedTechnician}
                            onChange={(e) => setSelectedTechnician(e.target.value)}
                            className="form-control"
                        >
                            <option value="">-- Select Technician --</option>
                            {technicians.map(tech => (
                                <option key={tech.user_id} value={tech.user_id}>
                                    {tech.full_name || tech.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleAssign}
                        disabled={loading || !selectedTechnician}
                    >
                        {loading ? 'Assigning...' : 'Assign'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignTicketModal;
