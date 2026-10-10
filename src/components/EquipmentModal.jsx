import React, { useState, useEffect } from 'react';
import './EquipmentModal.css';

const EquipmentModal = ({
    isOpen,
    onClose,
    mode = 'create', // 'create' | 'edit'
    equipment = null,
    facilities = [],
    tenantCode,
    onSuccess
}) => {
    const isEdit = mode === 'edit';

    const [formData, setFormData] = useState({
        facility_id: '',
        item_class: 'Cold Chain',
        item_type: 'Refrigerator',
        manufacturer: '',
        model: '',
        serial_number: '',
        asset_code: '',
        year_installed: new Date().getFullYear(),
        energy_source: 'Electric (Grid)',
        is_functioning: true
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const itemTypes = [
        'Refrigerator',
        'Ice Pack Freezer',
        'Solar Refrigerator',
        'Freezer',
        'Vaccine Carrier',
        'Cold Box',
        'Ultra-Low Freezer (ULT)',
        'Solar Direct Drive (SDD)'
    ];

    const energySources = [
        'Electric (Grid)',
        'Solar Direct Drive',
        'Solar + Battery',
        'Gas / Kerosene',
        'Hybrid (Solar + Grid)',
        'Passive / Icepack'
    ];

    useEffect(() => {
        if (isEdit && equipment) {
            setFormData({
                facility_id: equipment.facility_id || '',
                item_class: equipment.item_class || 'Cold Chain',
                item_type: equipment.item_type || 'Refrigerator',
                manufacturer: equipment.manufacturer || '',
                model: equipment.model || '',
                serial_number: equipment.serial_number || '',
                asset_code: equipment.asset_code || '',
                year_installed: equipment.year_installed || new Date().getFullYear(),
                energy_source: equipment.energy_source || 'Electric (Grid)',
                is_functioning: equipment.is_functioning !== false
            });
        } else {
            setFormData({
                facility_id: facilities.length > 0 ? String(facilities[0].facility_id) : '',
                item_class: 'Cold Chain',
                item_type: 'Refrigerator',
                manufacturer: '',
                model: '',
                serial_number: '',
                asset_code: '',
                year_installed: new Date().getFullYear(),
                energy_source: 'Electric (Grid)',
                is_functioning: true
            });
        }
        setError('');
    }, [isEdit, equipment, isOpen, facilities]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.facility_id) {
            setError('Please select a health facility.');
            return;
        }

        if (!formData.item_type) {
            setError('Equipment Type is required.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = isEdit 
                ? `/api/${tenantCode}/equipment/${equipment.equipment_id}` 
                : `/api/${tenantCode}/equipment`;
            const method = isEdit ? 'PUT' : 'POST';

            const payload = {
                facility_id: parseInt(formData.facility_id, 10),
                item_class: formData.item_class || 'Cold Chain',
                item_type: formData.item_type,
                manufacturer: formData.manufacturer.trim() || null,
                model: formData.model.trim() || null,
                serial_number: formData.serial_number.trim() || null,
                asset_code: formData.asset_code.trim() || null,
                year_installed: formData.year_installed ? parseInt(formData.year_installed, 10) : null,
                energy_source: formData.energy_source || null,
                is_functioning: formData.is_functioning
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to save equipment');
            }

            if (onSuccess) onSuccess(data.equipment || data);
            onClose();
        } catch (err) {
            console.error('Error saving equipment:', err);
            setError(err.message || 'An error occurred while saving.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="equipment-modal-overlay" onClick={onClose}>
            <div className="equipment-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="equipment-modal-header">
                    <div>
                        <h3>{isEdit ? '✏️ Edit Cold Chain Equipment' : '📦 Register New Equipment'}</h3>
                        <p>{isEdit ? 'Update equipment specifications and operating status' : 'Add new cold chain refrigeration or transport unit to inventory'}</p>
                    </div>
                    <button className="equipment-modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="equipment-modal-body">
                        {error && (
                            <div className="equipment-error-alert">
                                <span>⚠️ {error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Assigned Health Facility <span className="req">*</span></label>
                            <select
                                name="facility_id"
                                value={formData.facility_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">-- Choose Health Facility --</option>
                                {facilities.map(f => (
                                    <option key={f.facility_id} value={f.facility_id}>
                                        {f.facility_name} {f.facility_code ? `(${f.facility_code})` : ''} - {f.district || f.province || ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Equipment Type <span className="req">*</span></label>
                                <select
                                    name="item_type"
                                    value={formData.item_type}
                                    onChange={handleChange}
                                    required
                                >
                                    {itemTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Manufacturer</label>
                                <input
                                    type="text"
                                    name="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={handleChange}
                                    placeholder="e.g. Dometic, Vestfrost, B Medical"
                                />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    placeholder="e.g. TCW 3000, MK 144"
                                />
                            </div>

                            <div className="form-group">
                                <label>Serial Number</label>
                                <input
                                    type="text"
                                    name="serial_number"
                                    value={formData.serial_number}
                                    onChange={handleChange}
                                    placeholder="e.g. ZMB-SN-9982"
                                />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Asset Code / Tag</label>
                                <input
                                    type="text"
                                    name="asset_code"
                                    value={formData.asset_code}
                                    onChange={handleChange}
                                    placeholder="e.g. MOH-EQ-0045"
                                />
                            </div>

                            <div className="form-group">
                                <label>Energy Source</label>
                                <select
                                    name="energy_source"
                                    value={formData.energy_source}
                                    onChange={handleChange}
                                >
                                    {energySources.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Year Installed</label>
                                <input
                                    type="number"
                                    name="year_installed"
                                    value={formData.year_installed}
                                    onChange={handleChange}
                                    min="1990"
                                    max="2035"
                                    placeholder="e.g. 2024"
                                />
                            </div>

                            <div className="form-group">
                                <label>Functioning Status</label>
                                <div className="toggle-status-container">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            name="is_functioning"
                                            checked={formData.is_functioning}
                                            onChange={handleChange}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className={`status-text ${formData.is_functioning ? 'active' : 'inactive'}`}>
                                        {formData.is_functioning ? '🟢 Functioning' : '🔴 Not Functioning'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="equipment-modal-footer">
                        <button
                            type="button"
                            className="btn-equipment-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-equipment-save"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Register Equipment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EquipmentModal;
