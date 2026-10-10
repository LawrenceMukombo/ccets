import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import './Modal.css';
import './ModalExtensions.css';

const EscalateTicketModal = ({ isOpen, onClose, ticket, onSubmit }) => {
    const { tenantCode } = useTenant();
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const escalationReasons = [
        'Requires specialized expertise',
        'Missing equipment or tools',
        'Safety concern',
        'Parts unavailable',
        'Beyond my skill level',
        'Other'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!reason) {
            setError('Please select an escalation reason');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/tickets/${ticket.ticket_id}/escalate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason,
                    description
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detailMsg = data.detail ? ` (${data.detail})` : '';
                const fullMsg = data.error 
                    ? `${data.message || 'Error'}: ${data.error}${detailMsg}`
                    : (data.message || 'Failed to escalate ticket');
                throw new Error(fullMsg);
            }

            onSubmit();
            setReason('');
            setDescription('');
        } catch (err) {
            setError(err.message || 'Failed to escalate ticket');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Escalate Ticket</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="info-banner">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>Escalating will notify your supervisor and may reassign this ticket.</span>
                        </div>

                        <div className="form-group">
                            <label>Ticket</label>
                            <input
                                type="text"
                                value={ticket?.ticket_reference_number || ''}
                                disabled
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Escalation Reason *</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="form-control"
                                required
                            >
                                <option value="">-- Select Reason --</option>
                                {escalationReasons.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Detailed Description *</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="form-control"
                                rows="4"
                                placeholder="Please provide detailed information about why this ticket needs to be escalated..."
                                required
                            />
                        </div>

                        {error && (
                            <div className="error-message">{error}</div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Escalating...' : 'Escalate Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EscalateTicketModal;
