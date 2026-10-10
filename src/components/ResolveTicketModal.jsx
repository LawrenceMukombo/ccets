import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './Modal.css';
import './ModalExtensions.css';

const ResolveTicketModal = ({ isOpen, onClose, ticket, onSubmit }) => {
    const { tenantCode } = useTenant();
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [workPerformed, setWorkPerformed] = useState('');
    const [closeTicket, setCloseTicket] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fault Categorization State
    const [functionalStatuses, setFunctionalStatuses] = useState([]);
    const [faultCategories, setFaultCategories] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedIssues, setSelectedIssues] = useState([]); // Array of issue IDs
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Fetch options when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchOptions();
        }
    }, [isOpen]);

    const fetchOptions = async () => {
        setLoadingOptions(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statusRes, categoriesRes] = await Promise.all([
                fetch(`/api/${tenantCode}/faults/functional-statuses`, { headers }),
                fetch(`/api/${tenantCode}/faults/categories`, { headers })
            ]);

            if (statusRes.ok && categoriesRes.ok) {
                const statusData = await statusRes.json();
                const categoriesData = await categoriesRes.json();

                setFunctionalStatuses(statusData.statuses || []);
                setFaultCategories(categoriesData.categories || []);

                // Set default status if available
                if (statusData.statuses && statusData.statuses.includes('Functional')) {
                    setSelectedStatus('Functional');
                }
            }
        } catch (err) {
            console.error('Error fetching fault options:', err);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleIssueToggle = (issueId) => {
        setSelectedIssues(prev => {
            if (prev.includes(issueId)) {
                return prev.filter(id => id !== issueId);
            } else {
                return [...prev, issueId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!resolutionNotes.trim()) {
            setError('Please provide resolution notes');
            return;
        }

        if (!selectedStatus) {
            setError('Please select the equipment functional status');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 1. Save Fault Categorization (safe optional step)
            try {
                if (selectedIssues.length > 0 || selectedStatus) {
                    await fetch(`/api/${tenantCode}/faults/ticket/${ticket.ticket_id}/issues`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            ticketId: ticket.ticket_id,
                            issueIds: selectedIssues,
                            functionalStatus: selectedStatus,
                            resolutionNotes: resolutionNotes
                        })
                    });
                }
            } catch (faultErr) {
                console.warn('Fault categorization save failed (proceeding to resolve):', faultErr);
            }

            // 2. Resolve Ticket
            const response = await fetch(`/api/${tenantCode}/tickets/${ticket.ticket_id}/resolve`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    resolution_notes: resolutionNotes,
                    work_performed: workPerformed,
                    close_ticket: closeTicket,
                    functional_status: selectedStatus // Also pass to resolve endpoint
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detailMsg = data.detail ? ` (${data.detail})` : '';
                const fullMsg = data.error 
                    ? `${data.message || 'Error'}: ${data.error}${detailMsg}`
                    : (data.message || 'Failed to resolve ticket');
                throw new Error(fullMsg);
            }

            onSubmit();
            setResolutionNotes('');
            setWorkPerformed('');
            setCloseTicket(false);
            setSelectedIssues([]);
        } catch (err) {
            setError(err.message || 'Failed to resolve ticket');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Resolve Ticket</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Status Alert */}
                        <div className="success-banner">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>You're about to mark this ticket as resolved. Please maximize detail for equipment history.</span>
                        </div>

                        {/* Ticket Info */}
                        <div className="grid-row">
                            <div className="form-group">
                                <label>Ticket Reference</label>
                                <input
                                    type="text"
                                    value={ticket?.ticket_reference_number || `#${ticket?.ticket_id}`}
                                    disabled
                                    className="form-control"
                                />
                            </div>
                            <div className="form-group">
                                <label>Facility</label>
                                <input
                                    type="text"
                                    value={ticket?.facility_name || ''}
                                    disabled
                                    className="form-control"
                                />
                            </div>
                        </div>

                        {/* Functional Status */}
                        <div className="form-group">
                            <label>Post-Repair Equipment Status *</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="form-control"
                                required
                                disabled={loadingOptions}
                            >
                                <option value="">Select Status...</option>
                                {functionalStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fault Categorization */}
                        <div className="form-group">
                            <label>Diagnosed Faults (Select all that apply)</label>
                            <div className="fault-category-list">
                                {loadingOptions ? (
                                    <div className="loading-spinner-small">Loading fault categories...</div>
                                ) : (
                                    faultCategories.map(category => (
                                        <div key={category.category_id} className="fault-category-group">
                                            <h5 className="fault-category-title">{category.category_name}</h5>
                                            <div className="fault-issues-grid">
                                                {category.issues.map(issue => (
                                                    <label key={issue.issue_id} className="fault-issue-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIssues.includes(issue.issue_id)}
                                                            onChange={() => handleIssueToggle(issue.issue_id)}
                                                        />
                                                        <span>{issue.issue_name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Resolution Details */}
                        <div className="form-group">
                            <label>Work Performed *</label>
                            <textarea
                                value={workPerformed}
                                onChange={(e) => setWorkPerformed(e.target.value)}
                                className="form-control"
                                rows="3"
                                placeholder="Describe the actual work done (e.g., Replaced compressor, refilled gas...)"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Resolution Notes</label>
                            <textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="form-control"
                                rows="3"
                                placeholder="Additional notes, recommendations, or observations..."
                                required
                            />
                        </div>

                        {/* Close Ticket Checkbox */}
                        <div className="form-group checkbox-wrapper">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={closeTicket}
                                    onChange={(e) => setCloseTicket(e.target.checked)}
                                />
                                <span>Close ticket immediately (mark as completed)</span>
                            </label>
                            {!closeTicket && (
                                <p className="help-text">
                                    If unchecked, ticket will be "Resolved" pending verification.
                                </p>
                            )}
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
                            {loading ? 'Processing...' : (closeTicket ? 'Resolve & Close' : 'Mark as Resolved')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResolveTicketModal;
