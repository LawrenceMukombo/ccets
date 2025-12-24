import React, { useState, useEffect } from 'react';
import './CreateTicketModal.css';

const CreateTicketModal = ({ onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('location'); // location, details, reporter
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Data Sources
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [equipmentList, setEquipmentList] = useState([]);

    // Selection State
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        facilityId: '',
        equipmentId: '',
        priority: 'Medium', // Default
        description: '',

        // Reporter
        reportedByName: '',
        reportedByPhone: '',
        reportedByEmail: '',

        // Equipment Snapshot (Read-onlyish, populated)
        manufacturer: '',
        model: '',
        serialNumber: '',
        refrigerantGas: '',

        // Extra info for display
        yearInstalled: '',
        lastRepairDate: ''
    });

    // Helper for headers
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    });

    // --- Data Fetching ---

    // Fetch Regions & Provinces on mount
    useEffect(() => {
        const fetchInit = async () => {
            try {
                const [regRes, provRes] = await Promise.all([
                    fetch('/api/facilities/regions', { headers: getAuthHeaders() }),
                    fetch('/api/facilities/provinces', { headers: getAuthHeaders() })
                ]);

                if (regRes.ok) setRegions(await regRes.json());
                if (provRes.ok) setProvinces(await provRes.json());
            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };
        fetchInit();
    }, []);

    // Filter Provinces when selectedRegion changes? 
    // Assuming backend returns all provinces and we filter client-side if needed, 
    // OR we just show valid ones. 
    // Let's assume we filter provinces by region_id if available.
    const filteredProvinces = selectedRegion
        ? provinces.filter(p => p.region_id === parseInt(selectedRegion))
        : provinces;

    // Fetch Districts when Province changes
    useEffect(() => {
        if (!selectedProvince) {
            setDistricts([]);
            return;
        }

        const fetchDistricts = async () => {
            try {
                const res = await fetch(`/api/facilities/districts/${selectedProvince}`, { headers: getAuthHeaders() });
                if (res.ok) setDistricts(await res.json());
            } catch (err) {
                console.error("Error fetching districts", err);
            }
        };
        fetchDistricts();
    }, [selectedProvince]);

    // Fetch Facilities when District changes
    useEffect(() => {
        if (!selectedDistrict) {
            setFacilities([]);
            return;
        }

        const fetchFacilities = async () => {
            try {
                // Using the specific endpoint for filtered list
                const res = await fetch(`/api/facilities/district/${selectedDistrict}`, { headers: getAuthHeaders() });
                if (res.ok) setFacilities(await res.json());
            } catch (err) {
                console.error("Error fetching facilities", err);
            }
        };
        fetchFacilities();
    }, [selectedDistrict]);

    // Fetch Equipment when Facility changes
    useEffect(() => {
        if (!formData.facilityId) {
            setEquipmentList([]);
            return;
        }

        const fetchEquipment = async () => {
            try {
                const res = await fetch(`/api/facilities/${formData.facilityId}/equipment`, { headers: getAuthHeaders() });
                if (res.ok) setEquipmentList(await res.json());
            } catch (err) {
                console.error("Error fetching equipment", err);
            }
        };
        fetchEquipment();
    }, [formData.facilityId]);

    // --- Handlers ---

    // Auto-populate when equipment is selected
    const handleEquipmentChange = (e) => {
        const eqId = e.target.value;
        setFormData(prev => ({ ...prev, equipmentId: eqId }));

        if (eqId) {
            const eq = equipmentList.find(item => item.equipment_id.toString() === eqId.toString());
            if (eq) {
                setFormData(prev => ({
                    ...prev,
                    manufacturer: eq.manufacturer || '',
                    model: eq.model || '',
                    serialNumber: eq.serial_number || '',
                    refrigerantGas: eq.refrigerant_gas || '',
                    yearInstalled: eq.year_installed || '',
                    lastRepairDate: eq.last_repair_date || ''
                }));
            }
        } else {
            // Clear snapshot data
            setFormData(prev => ({
                ...prev,
                manufacturer: '',
                model: '',
                serialNumber: '',
                refrigerantGas: '',
                yearInstalled: '',
                lastRepairDate: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!formData.facilityId) {
            setError("Facility is required.");
            setLoading(false);
            return;
        }
        if (!formData.description) {
            setError("Fault description is required.");
            // Switch to details tab if validation fails there?
            if (activeTab !== 'details') setActiveTab('details');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to create ticket');
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content ticket-modal">
                <div className="modal-header">
                    <h2>Create New Ticket</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`}
                        onClick={() => setActiveTab('location')}
                    >
                        1. Location & Equipment
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        2. Ticket Details
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'reporter' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reporter')}
                    >
                        3. Reporter Info
                    </button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    {/* TAB 1: LOCATION */}
                    {activeTab === 'location' && (
                        <div className="tab-pane fade-in">
                            <div className="form-group-row">
                                <div className="form-group">
                                    <label>Region</label>
                                    <select
                                        value={selectedRegion}
                                        onChange={(e) => {
                                            setSelectedRegion(e.target.value);
                                            setSelectedProvince('');
                                            setSelectedDistrict('');
                                            setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                        }}
                                    >
                                        <option value="">Select Region</option>
                                        {regions.map(r => (
                                            <option key={r.region_id} value={r.region_id}>{r.region_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Province</label>
                                    <select
                                        value={selectedProvince}
                                        onChange={(e) => {
                                            setSelectedProvince(e.target.value);
                                            setSelectedDistrict('');
                                            setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                        }}
                                        disabled={!selectedRegion}
                                    >
                                        <option value="">Select Province</option>
                                        {filteredProvinces.map(p => (
                                            <option key={p.province_id} value={p.province_id}>{p.province_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group-row">
                                <div className="form-group">
                                    <label>District</label>
                                    <select
                                        value={selectedDistrict}
                                        onChange={(e) => {
                                            setSelectedDistrict(e.target.value);
                                            setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                        }}
                                        disabled={!selectedProvince}
                                    >
                                        <option value="">Select District</option>
                                        {districts.map(d => (
                                            <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Facility <span className="required">*</span></label>
                                    <select
                                        value={formData.facilityId}
                                        onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                facilityId: e.target.value,
                                                equipmentId: '' // reset equipment
                                            }));
                                        }}
                                        disabled={!selectedDistrict}
                                    >
                                        <option value="">Select Facility</option>
                                        {facilities.map(f => (
                                            <option key={f.facility_id} value={f.facility_id}>{f.facility_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr />

                            <h3>Equipment Selection</h3>
                            <div className="form-group">
                                <label>Available Equipment</label>
                                <select
                                    value={formData.equipmentId}
                                    onChange={handleEquipmentChange}
                                    disabled={!formData.facilityId}
                                >
                                    <option value="">Select Equipment (Optional)</option>
                                    {equipmentList.map(eq => (
                                        <option key={eq.equipment_id} value={eq.equipment_id}>
                                            {eq.item_type || eq.type} - {eq.manufacturer} {eq.model} (S/N: {eq.serial_number})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {formData.equipmentId && (
                                <div className="equipment-info-card">
                                    <h4>Equipment Details</h4>
                                    <div className="info-grid">
                                        <div><strong>Make:</strong> {formData.manufacturer}</div>
                                        <div><strong>Model:</strong> {formData.model}</div>
                                        <div><strong>Serial No:</strong> {formData.serialNumber}</div>
                                        <div><strong>Refrigerant:</strong> {formData.refrigerantGas}</div>
                                        <div><strong>Year Installed:</strong> {formData.yearInstalled || 'N/A'}</div>
                                        <div><strong>Last Repair:</strong> {formData.lastRepairDate || 'N/A'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: DETAILS */}
                    {activeTab === 'details' && (
                        <div className="tab-pane fade-in">
                            <div className="form-group">
                                <label>Priority <span className="required">*</span></label>
                                <div className="priority-options">
                                    {['Low', 'Medium', 'High', 'Critical'].map(level => (
                                        <label key={level} className={`priority-radio ${formData.priority === level ? level.toLowerCase() : ''}`}>
                                            <input
                                                type="radio"
                                                name="priority"
                                                value={level}
                                                checked={formData.priority === level}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            />
                                            {level}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Fault Description <span className="required">*</span></label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the issue in detail..."
                                    rows="6"
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: REPORTER */}
                    {activeTab === 'reporter' && (
                        <div className="tab-pane fade-in">
                            <div className="form-group">
                                <label>Reporter Name</label>
                                <input
                                    type="text"
                                    value={formData.reportedByName}
                                    onChange={(e) => setFormData({ ...formData, reportedByName: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label>Reporter Phone</label>
                                <input
                                    type="text"
                                    value={formData.reportedByPhone}
                                    onChange={(e) => setFormData({ ...formData, reportedByPhone: e.target.value })}
                                    placeholder="e.g. +675 1234 5678"
                                />
                            </div>
                            <div className="form-group">
                                <label>Reporter Email</label>
                                <input
                                    type="email"
                                    value={formData.reportedByEmail}
                                    onChange={(e) => setFormData({ ...formData, reportedByEmail: e.target.value })}
                                    placeholder="e.g. john@example.com"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="save-btn" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTicketModal;
