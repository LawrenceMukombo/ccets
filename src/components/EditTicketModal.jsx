import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import './Modal.css';

const EditTicketModal = ({ ticket, onClose, onSuccess, onSubmit }) => {
    const { tenantCode } = useTenant();
    const [formData, setFormData] = useState({
        priority: ticket.priority || 'Medium',
        description: ticket.fault_description || ticket.description || '',
        status: ticket.ticket_status || ticket.status || 'New'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/tickets/${ticket.ticket_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const detailMsg = data.detail ? ` (${data.detail})` : '';
                const fullMsg = data.error 
                    ? `${data.message || 'Error'}: ${data.error}${detailMsg}`
                    : (data.message || 'Failed to update ticket');
                throw new Error(fullMsg);
            }

            const callback = onSuccess || onSubmit;
            if (typeof callback === 'function') callback();
            if (typeof onClose === 'function') onClose();
        } catch (err) {
            setError(err.message || 'Failed to update ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Edit Ticket #{ticket.ticket_reference_number}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                            <select
                                className="form-control"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="New">New</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Escalated">Escalated</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Priority</label>
                            <select
                                className="form-control"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Fault Description</label>
                            <textarea
                                className="form-control"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="5"
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                            ></textarea>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditTicketModal;
