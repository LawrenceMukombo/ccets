import React from 'react';
import './FacilityDetailsModal.css';

function FacilityDetailsModal({ facility, onClose }) {
    if (!facility) return null;

    const locationFields = ['region', 'province', 'district'];

    const getLabel = (key) => key.replace(/_/g, ' ');

    const renderField = (key, value) => {
        if (value === null || value === undefined || value === '') return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Facility Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {/* Location Section */}
                    <div className="detail-section">
                        <h3 className="section-title">Location Hierarchy</h3>
                        <div className="detail-grid">
                            {locationFields.map(key => (
                                <div key={key} className="detail-item">
                                    <label>{getLabel(key)}</label>
                                    <div className="value">{renderField(key, facility[key])}</div>
                                </div>
                            ))}
                            <div className="detail-item">
                                <label>GPS Coordinates</label>
                                <div className="value">
                                    {facility.latitude && facility.longitude 
                                        ? `${facility.latitude}, ${facility.longitude}`
                                        : facility.gps_coordinates || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Facility Info Section */}
                    <div className="detail-section">
                        <h3 className="section-title">General Information</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Facility Name</label>
                                <div className="value" style={{ fontWeight: 600 }}>{facility.facility_name}</div>
                            </div>
                            <div className="detail-item">
                                <label>Facility Code</label>
                                <div className="value">{facility.facility_code || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Level</label>
                                <div className="value">{facility.level || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Type</label>
                                <div className="value">{facility.type || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Functional Status</label>
                                <div className={`value status-text ${facility.is_functioning ? 'success' : 'error'}`}>
                                    {facility.is_functioning ? 'Functioning' : 'Not Functioning'}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label>Ownership</label>
                                <div className="value">{facility.ownership || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Population Served</label>
                                <div className="value">{facility.population_number || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Children Under 1yr</label>
                                <div className="value">{facility.children_number || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Transport Mode</label>
                                <div className="value">{facility.transport_mode || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Power Source</label>
                                <div className="value">{facility.power_source || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Integration Metadata */}
                    <div className="detail-section">
                        <h3 className="section-title">Integration & Provenance</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>External System ID</label>
                                <div className="value" style={{ fontFamily: 'monospace' }}>{facility.external_id || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Source System</label>
                                <div className="value">
                                    <span className={`badge ${facility.source_system && facility.source_system !== 'Manual' ? 'badge-primary' : 'badge-secondary'}`}>
                                        {facility.source_system || 'Manual'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="secondary-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default FacilityDetailsModal;
