import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useOffline } from '../../context/OfflineContext';
import './CreateTicketModal.css';

const CreateTicketModal = ({ onClose, onSuccess }) => {
    const { tenantCode, config } = useTenant();
    const { isOnline, updatePendingCount } = useOffline();
    const [activeTab, setActiveTab] = useState('location'); // location, details, reporter
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Dynamic Hierarchy levels from config
    const hierarchy = config?.hierarchy || [
        { id: 'province', name: 'Province' },
        { id: 'district', name: 'District' }
    ];

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

    const hasLevel = (id) => hierarchy.some(h => h.id === id);
    const getLevelName = (id) => hierarchy.find(h => h.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1);

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

    // Load cached data when offline
    useEffect(() => {
        if (isOnline) return;
        
        const loadOfflineData = async () => {
            try {
                const { getCachedMetadata } = await import('../../utils/offlineDb');
                const cachedFacs = await getCachedMetadata('facilities') || [];
                const cachedEquips = await getCachedMetadata('equipment') || [];
                
                if (cachedFacs.length > 0) {
                    const uniqueDistricts = [];
                    const seenDistricts = new Set();
                    const uniqueProvinces = [];
                    const seenProvinces = new Set();
                    const uniqueRegions = [];
                    const seenRegions = new Set();
                    
                    cachedFacs.forEach(f => {
                        if (f.district_id && !seenDistricts.has(f.district_id)) {
                            seenDistricts.add(f.district_id);
                            uniqueDistricts.push({ district_id: f.district_id, district_name: f.district_name, province_id: f.province_id });
                        }
                        if (f.province_id && !seenProvinces.has(f.province_id)) {
                            seenProvinces.add(f.province_id);
                            uniqueProvinces.push({ province_id: f.province_id, province_name: f.province_name, region_id: f.region_id });
                        }
                        if (f.region_id && !seenRegions.has(f.region_id)) {
                            seenRegions.add(f.region_id);
                            uniqueRegions.push({ region_id: f.region_id, region_name: f.region_name });
                        }
                    });
                    
                    setRegions(uniqueRegions);
                    setProvinces(uniqueProvinces);
                    window._offlineDistricts = uniqueDistricts;
                    window._offlineFacilities = cachedFacs;
                    window._offlineEquipment = cachedEquips;
                    
                    setDistricts(uniqueDistricts);
                    setFacilities(cachedFacs);
                }
            } catch (err) {
                console.error('Error loading offline cached data', err);
            }
        };
        
        loadOfflineData();
    }, [isOnline]);

    // Fetch Regions on mount (if needed)
    useEffect(() => {
        if (!isOnline || !hasLevel('region')) return;
        const fetchRegions = async () => {
            try {
                const res = await fetch(`/api/${tenantCode}/facilities/regions`, { headers: getAuthHeaders() });
                if (res.ok) setRegions(await res.json());
            } catch (err) {
                console.error("Error fetching regions", err);
            }
        };
        fetchRegions();
    }, [isOnline]);

    // Fetch Provinces on mount (if needed) OR when Region changes
    useEffect(() => {
        if (!isOnline || !hasLevel('province')) return;
        const fetchProvinces = async () => {
            try {
                const res = await fetch(`/api/${tenantCode}/facilities/provinces`, { headers: getAuthHeaders() });
                if (res.ok) setProvinces(await res.json());
            } catch (err) {
                console.error("Error fetching provinces", err);
            }
        };
        fetchProvinces();
    }, [isOnline]);

    // Filter Provinces by selectedRegion (if region exists in hierarchy)
    const filteredProvinces = hasLevel('region') && selectedRegion
        ? provinces.filter(p => p.region_id && p.region_id.toString() === selectedRegion.toString())
        : provinces;

    // Fetch Districts when parent changes
    useEffect(() => {
        if (!hasLevel('district')) {
            setDistricts([]);
            return;
        }

        const parentId = hasLevel('province') ? selectedProvince : selectedRegion;
        if (!parentId) {
            setDistricts([]);
            return;
        }

        if (!isOnline) {
            const allDists = window._offlineDistricts || [];
            setDistricts(allDists.filter(d => d.province_id?.toString() === parentId.toString() || d.region_id?.toString() === parentId.toString()));
            return;
        }

        const fetchDistricts = async () => {
            try {
                const res = await fetch(`/api/${tenantCode}/facilities/districts/${parentId}`, { headers: getAuthHeaders() });
                if (res.ok) setDistricts(await res.json());
            } catch (err) {
                console.error("Error fetching districts", err);
            }
        };
        fetchDistricts();
    }, [selectedProvince, selectedRegion, isOnline]);

    // Fetch Facilities when District changes
    useEffect(() => {
        if (!selectedDistrict) {
            setFacilities([]);
            return;
        }

        if (!isOnline) {
            const allFacs = window._offlineFacilities || [];
            setFacilities(allFacs.filter(f => f.district_id?.toString() === selectedDistrict.toString()));
            return;
        }

        const fetchFacilities = async () => {
            try {
                const res = await fetch(`/api/${tenantCode}/facilities/district/${selectedDistrict}`, { headers: getAuthHeaders() });
                if (res.ok) setFacilities(await res.json());
            } catch (err) {
                console.error("Error fetching facilities", err);
            }
        };
        fetchFacilities();
    }, [selectedDistrict, isOnline]);

    // Fetch Equipment when Facility changes
    useEffect(() => {
        if (!formData.facilityId) {
            setEquipmentList([]);
            return;
        }

        if (!isOnline) {
            const allEquip = window._offlineEquipment || [];
            setEquipmentList(allEquip.filter(eq => eq.facility_id?.toString() === formData.facilityId.toString()));
            return;
        }

        const fetchEquipment = async () => {
            try {
                const res = await fetch(`/api/${tenantCode}/facilities/${formData.facilityId}/equipment`, { headers: getAuthHeaders() });
                if (res.ok) setEquipmentList(await res.json());
            } catch (err) {
                console.error("Error fetching equipment", err);
            }
        };
        fetchEquipment();
    }, [formData.facilityId, isOnline]);

    // --- Handlers ---
    const nextTab = (tab) => {
        setTimeout(() => setActiveTab(tab), 400);
    };

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
                // Auto-move to next tab after equipment selection
                nextTab('details');
            }
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
            if (activeTab !== 'details') setActiveTab('details');
            setLoading(false);
            return;
        }

        // Offline storage fallback
        if (!isOnline) {
            try {
                const { saveOfflineTicket } = await import('../../utils/offlineDb');
                await saveOfflineTicket({
                    facilityId: formData.facilityId,
                    equipmentId: formData.equipmentId,
                    priority: formData.priority,
                    description: formData.description,
                    reportedByName: formData.reportedByName,
                    reportedByPhone: formData.reportedByPhone,
                    reportedByEmail: formData.reportedByEmail,
                    manufacturer: formData.manufacturer,
                    model: formData.model,
                    serialNumber: formData.serialNumber,
                    refrigerantGas: formData.refrigerantGas
                });
                alert("📶 Device is offline. Ticket has been queued locally and will be synchronized automatically when connection is restored.");
                if (updatePendingCount) updatePendingCount();
                if (onSuccess) onSuccess();
                onClose();
            } catch (err) {
                setError("Failed to save ticket offline: " + err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const detailMsg = data.detail ? ` (${data.detail})` : '';
                const fullMsg = data.error 
                    ? `${data.message || 'Error'}: ${data.error}${detailMsg}` 
                    : (data.message || `Server returned status ${res.status}`);
                throw new Error(fullMsg);
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
                                {hasLevel('region') && (
                                    <div className="form-group">
                                        <label>{getLevelName('region')}</label>
                                        <select
                                            value={selectedRegion}
                                            onChange={(e) => {
                                                setSelectedRegion(e.target.value);
                                                setSelectedProvince('');
                                                setSelectedDistrict('');
                                                setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                            }}
                                        >
                                            <option value="">Select {getLevelName('region')}</option>
                                            {regions.map(r => (
                                                <option key={r.region_id} value={r.region_id}>{r.region_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {hasLevel('province') && (
                                    <div className="form-group">
                                        <label>{getLevelName('province')}</label>
                                        <select
                                            value={selectedProvince}
                                            onChange={(e) => {
                                                setSelectedProvince(e.target.value);
                                                setSelectedDistrict('');
                                                setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                            }}
                                            disabled={hasLevel('region') && !selectedRegion}
                                        >
                                            <option value="">Select {getLevelName('province')}</option>
                                            {filteredProvinces.map(p => (
                                                <option key={p.province_id} value={p.province_id}>{p.province_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-group-row">
                                {hasLevel('district') && (
                                    <div className="form-group">
                                        <label>{getLevelName('district')}</label>
                                        <select
                                            value={selectedDistrict}
                                            onChange={(e) => {
                                                setSelectedDistrict(e.target.value);
                                                setFormData(prev => ({ ...prev, facilityId: '', equipmentId: '' }));
                                            }}
                                            disabled={(hasLevel('province') && !selectedProvince) || (hasLevel('region') && !hasLevel('province') && !selectedRegion)}
                                        >
                                            <option value="">Select {getLevelName('district')}</option>
                                            {districts.map(d => (
                                                <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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
                                        disabled={hasLevel('district') && !selectedDistrict}
                                    >
                                        <option value="">Select Facility</option>
                                        {facilities.map(f => (
                                            <option key={f.facility_id} value={f.facility_id}>{f.facility_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>Equipment Selection</h3>
                                <button className="tab-next-btn" onClick={() => setActiveTab('details')}>Skip to Details &rarr;</button>
                            </div>
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
                                    onBlur={() => { if (formData.description.length > 10) nextTab('reporter'); }}
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
                                    placeholder={(config?.country === 'Zambia' || config?.tenant_code?.toLowerCase() === 'zmb' || config?.name?.includes('Zambia')) ? 'e.g. +260 977 123456' : 'e.g. +675 7000 1234'}
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
                    {activeTab === 'reporter' ? (
                        <button className="save-btn" onClick={handleSubmit} disabled={loading || !formData.facilityId || !formData.description}>
                            {loading ? 'Creating...' : 'Create Ticket'}
                        </button>
                    ) : (
                        <button className="next-footer-btn" onClick={() => setActiveTab(activeTab === 'location' ? 'details' : 'reporter')}>
                            Next Step &rarr;
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateTicketModal;
