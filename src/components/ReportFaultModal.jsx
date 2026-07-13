
import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './ReportFaultModal.css';

function ReportFaultModal({ isOpen, onClose, equipment, onSuccess }) {
    const { tenantCode } = useTenant();
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedIssue, setSelectedIssue] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [description, setDescription] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');

    // Reporter details (auto-filled if possible, but editable)
    const [reporterName, setReporterName] = useState('');
    const [reporterPhone, setReporterPhone] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchFaultCategories();
            // Pre-fill reporter info from user profile if available in local storage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.first_name) setReporterName(`${user.first_name} ${user.last_name}`);
            if (user.phone) setReporterPhone(user.phone);
        }
    }, [isOpen]);

    const fetchFaultCategories = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/faults/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setCategories(data.categories);
            } else {
                setError('Failed to load fault categories');
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Error loading options');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCategory || !selectedIssue) {
            setError('Please select a fault category and specific issue');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            // Find selected issue name/details
            const category = categories.find(c => c.category_id === parseInt(selectedCategory));
            const issue = category?.issues.find(i => i.issue_id === parseInt(selectedIssue));

            const payload = {
                facilityId: equipment.facility_id,
                equipmentId: equipment.equipment_id,
                priority: priority,
                // Construct a detailed description
                description: `${category?.category_name} - ${issue?.issue_name}\n\n${description}`,

                // Reporter details
                reportedByName: reporterName || user.full_name,
                reportedByPhone: reporterPhone,
                reportedByEmail: user.email,

                // Equipment Snapshot
                manufacturer: equipment.manufacturer,
                model: equipment.model,
                serialNumber: equipment.serial_number,
                refrigerantGas: equipment.refrigerant_gas
            };

            const response = await fetch(`/api/${tenantCode}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // Determine functional status based on the selected fault/user input?
                // For now, the backend 'createTicket' doesn't automatically link the fault_issue rows 
                // unless we update the controller. 
                // But we can update the ticket immediately after creation to link the fault issues.

                // Link the fault issue
                if (data.ticket_id) {
                    await fetch(`/api/${tenantCode}/faults/ticket/${data.ticket_id}/issues`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            ticketId: data.ticket_id,
                            issueIds: [parseInt(selectedIssue)],
                            resolutionNotes: null, // Not resolving yet
                            functionalStatus: 'Not Functioning' // Default assumption for faults? Or ask user.
                        })
                    });
                }

                if (onSuccess) onSuccess(data);
                onClose();
            } else {
                setError(data.message || 'Failed to create ticket');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError('Failed to submit report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content report-fault-modal">
                <div className="modal-header">
                    <h2>Report Equipment Fault</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {equipment && (
                        <div className="equipment-summary-banner">
                            <strong>{equipment.item_type}</strong>
                            <span>{equipment.manufacturer} {equipment.model}</span>
                            <span className="serial">S/N: {equipment.serial_number}</span>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    {loading ? (
                        <div className="loading-spinner">Loading options...</div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Fault Category <span className="required">*</span></label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedIssue(''); // Reset issue
                                    }}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.category_id} value={cat.category_id}>
                                            {cat.category_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Specific Issue <span className="required">*</span></label>
                                <select
                                    value={selectedIssue}
                                    onChange={(e) => setSelectedIssue(e.target.value)}
                                    disabled={!selectedCategory}
                                    required
                                >
                                    <option value="">Select Issue</option>
                                    {selectedCategory && categories
                                        .find(c => c.category_id === parseInt(selectedCategory))
                                        ?.issues.map(issue => (
                                            <option key={issue.issue_id} value={issue.issue_id}>
                                                {issue.issue_name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description / Additional Details</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the problem in more detail..."
                                    rows={4}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="section-divider">
                                <span>Reporter Information</span>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Your Name</label>
                                    <input
                                        type="text"
                                        value={reporterName}
                                        onChange={(e) => setReporterName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        value={reporterPhone}
                                        onChange={(e) => setReporterPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                                <button type="submit" className="primary-btn" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReportFaultModal;
