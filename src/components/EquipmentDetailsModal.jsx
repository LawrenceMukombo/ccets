import React from 'react';
import './EquipmentDetailsModal.css';

function EquipmentDetailsModal({ equipment, onClose }) {
    if (!equipment) return null;

    // Field Management
    const locationPriority = ['facility_name', 'facility_code', 'region', 'province', 'district'];
    const hiddenFields = [
        'facility_id', 'equipment_id', 'province_id', 'district_id', 'region_id',
        'is_del', 'created_by', 'updated_by', 'is_functioning'
    ];

    // Status Handling (Derived)
    const statusValue = equipment.is_functioning !== false ? 'Functioning' : 'Not Functioning';

    const renderField = (key, value) => {
        if (!value && value !== 0) return '-';
        if (key === 'mechanical') return value ? 'Yes' : 'No';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    const getLabel = (key) => key.replace(/_/g, ' ');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Equipment Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {/* Location Section */}
                    <div className="detail-section">
                        <h3 className="section-title">Location</h3>
                        <div className="detail-grid">
                            {locationPriority.map(key => (
                                equipment[key] !== undefined && (
                                    <div key={key} className="detail-item">
                                        <label>{getLabel(key)}</label>
                                        <div className="value">{renderField(key, equipment[key])}</div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Equipment Section */}
                    <div className="detail-section">
                        <h3 className="section-title">Equipment Information</h3>
                        <div className="detail-grid">
                            {/* Explicit Status Field */}
                            <div className="detail-item">
                                <label>Functional Status</label>
                                <div className={`value status-text ${equipment.is_functioning !== false ? 'success' : 'error'}`}>
                                    {statusValue}
                                </div>
                            </div>

                            {/* Remaining Fields */}
                            {Object.entries(equipment).map(([key, value]) => {
                                if (locationPriority.includes(key) || hiddenFields.includes(key)) return null;
                                return (
                                    <div key={key} className="detail-item">
                                        <label>{getLabel(key)}</label>
                                        <div className="value">{renderField(key, value)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <div className="action-buttons-left">
                        <button className="danger-btn-outline" onClick={() => onClose('report_fault')}>
                            ⚠️ Report Fault
                        </button>
                    </div>
                    <button className="secondary-btn" onClick={() => onClose(null)}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default EquipmentDetailsModal;
