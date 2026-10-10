import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import './Modal.css';
import './ModalExtensions.css';

const SparePartsRequestModal = ({ isOpen, onClose, ticket, onSubmit, onSuccess }) => {
    const { tenantCode } = useTenant();
    const [parts, setParts] = useState([{ sparepart_id: '', name: '', quantity: 1, category: '' }]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sparePartsData, setSparePartsData] = useState({ parts: [], categories: {} });
    const [loadingSpareParts, setLoadingSpareParts] = useState(false);

    // Fetch spare parts when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchSpareParts();
        }
    }, [isOpen]);

    const fetchSpareParts = async () => {
        setLoadingSpareParts(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/spare-parts`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSparePartsData(data);
            }
        } catch (err) {
            console.error('Error fetching spare parts:', err);
        } finally {
            setLoadingSpareParts(false);
        }
    };

    const addPart = () => {
        setParts([...parts, { sparepart_id: '', name: '', quantity: 1, category: '' }]);
    };

    const removePart = (index) => {
        setParts(parts.filter((_, i) => i !== index));
    };

    const updatePart = (index, field, value) => {
        const updated = [...parts];

        // If selecting from dropdown, populate all fields
        if (field === 'sparepart_id' && value) {
            const selectedPart = sparePartsData.parts.find(p => p.sparepart_id === parseInt(value));
            if (selectedPart) {
                updated[index] = {
                    ...updated[index],
                    sparepart_id: selectedPart.sparepart_id,
                    name: selectedPart.sparepart_name,
                    category: selectedPart.category
                };
            }
        } else {
            updated[index][field] = value;
        }

        setParts(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validParts = parts.filter(p => p.name.trim());
        if (validParts.length === 0) {
            setError('Please add at least one spare part');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/tickets/${ticket.ticket_id}/spare-parts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    parts: validParts,
                    notes
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detailMsg = data.detail ? ` (${data.detail})` : '';
                const fullMsg = data.error 
                    ? `${data.message || 'Error'}: ${data.error}${detailMsg}`
                    : (data.message || 'Failed to submit request');
                throw new Error(fullMsg);
            }

            const callback = onSuccess || onSubmit;
            if (typeof callback === 'function') {
                callback();
            }
            setParts([{ sparepart_id: '', name: '', quantity: 1, category: '' }]);
            setNotes('');
            if (typeof onClose === 'function') {
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Failed to submit spare parts request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const categoryOptions = Object.keys(sparePartsData.categories || {});

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Request Spare Parts</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Ticket</label>
                            <input
                                type="text"
                                value={ticket?.ticket_reference_number || `#${ticket?.ticket_id}`}
                                disabled
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Spare Parts Needed</label>
                            <p className="help-text">Select parts by category or enter custom part names</p>

                            {parts.map((part, index) => (
                                <div key={index} className="parts-row-extended">
                                    <select
                                        value={part.category}
                                        onChange={(e) => updatePart(index, 'category', e.target.value)}
                                        className="form-control part-category"
                                    >
                                        <option value="">All Categories</option>
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={part.sparepart_id}
                                        onChange={(e) => updatePart(index, 'sparepart_id', e.target.value)}
                                        className="form-control part-name-select"
                                        disabled={loadingSpareParts}
                                    >
                                        <option value="">Select part or type below...</option>
                                        {sparePartsData.parts
                                            .filter(sparePart => !part.category || sparePart.category === part.category)
                                            .map(sparePart => (
                                                <option key={sparePart.sparepart_id} value={sparePart.sparepart_id}>
                                                    {sparePart.sparepart_name} {sparePart.part_number ? `(${sparePart.part_number})` : ''}
                                                </option>
                                            ))}
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="Or type custom part name"
                                        value={part.name}
                                        onChange={(e) => updatePart(index, 'name', e.target.value)}
                                        className="form-control part-name-input"
                                    />

                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Qty"
                                        value={part.quantity}
                                        onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value))}
                                        className="form-control part-quantity"
                                        required
                                    />

                                    {parts.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-btn"
                                            onClick={() => removePart(index)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="add-part-btn"
                                onClick={addPart}
                            >
                                + Add Another Part
                            </button>
                        </div>

                        {/* Quick Reference - Categorized Parts List */}
                        {categoryOptions.length > 0 && (
                            <div className="category-reference">
                                <h4>📋 Available Spare Parts by Category</h4>
                                <div className="category-grid">
                                    {categoryOptions.map(category => (
                                        <div key={category} className="category-section">
                                            <h5>{category}</h5>
                                            <ul>
                                                {sparePartsData.categories[category]
                                                    .slice(0, 5) // Show first 5
                                                    .map(sparePart => (
                                                        <li key={sparePart.sparepart_id}>
                                                            {sparePart.sparepart_name}
                                                            {sparePart.part_number && ` (${sparePart.part_number})`}
                                                        </li>
                                                    ))}
                                                {sparePartsData.categories[category].length > 5 && (
                                                    <li className="more-items">
                                                        ...and {sparePartsData.categories[category].length - 5} more
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Additional Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="form-control"
                                rows="3"
                                placeholder="Any additional information about the parts needed..."
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
                            disabled={loading || loadingSpareParts}
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SparePartsRequestModal;
