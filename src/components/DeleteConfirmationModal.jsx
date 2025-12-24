import React, { useState } from 'react';
import './Modal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, ticket, onDelete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/tickets/${ticket.ticket_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete ticket');

            onDelete();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to delete ticket');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Delete Ticket</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="warning-icon">⚠️</div>
                    <p className="warning-text">
                        Are you sure you want to delete this ticket?
                    </p>
                    <div className="ticket-info">
                        <strong>Reference:</strong> {ticket?.ticket_reference_number}<br />
                        <strong>Facility:</strong> {ticket?.facility_name}
                    </div>
                    <p className="warning-subtext">
                        This action cannot be undone.
                    </p>

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
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
