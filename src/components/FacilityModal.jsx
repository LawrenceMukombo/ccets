import React, { useState, useEffect, useMemo } from 'react';
import './FacilityModal.css';

const FacilityModal = ({
    isOpen,
    onClose,
    mode = 'create', // 'create' | 'edit'
    facility = null,
    tenantCode,
    hierarchy = [],
    onSuccess
}) => {
    const isEdit = mode === 'edit';

    // Smart hierarchy detection
    const hasRegion = useMemo(() => {
        return (hierarchy || []).some(l => l.id?.toLowerCase() === 'region');
    }, [hierarchy]);

    const regionLevel = useMemo(() => (hierarchy || []).find(l => l.id?.toLowerCase() === 'region') || { id: 'region', name: 'Region' }, [hierarchy]);
    const provinceLevel = useMemo(() => (hierarchy || []).find(l => l.id?.toLowerCase().includes('prov') || l.id?.toLowerCase().includes('state')) || { id: 'province', name: 'Province' }, [hierarchy]);
    const districtLevel = useMemo(() => (hierarchy || []).find(l => l.id?.toLowerCase().includes('dist') || l.id?.toLowerCase().includes('count')) || { id: 'district', name: 'District' }, [hierarchy]);

    const [formData, setFormData] = useState({
        facility_name: '',
        facility_code: '',
        type: 'Rural Health Post',
        region_id: '',
        province_id: '',
        district_id: '',
        latitude: '',
        longitude: '',
        is_functioning: true
    });

    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [error, setError] = useState('');

    const facilityTypes = [
        'Rural Health Post',
        'Urban Health Centre',
        'Health Post',
        'District Hospital',
        'General Hospital',
        'Specialist Hospital',
        'Level 1 Hospital',
        'Level 2 Hospital',
        'Level 3 Hospital',
        'Central Cold Store',
        'Provincial Vaccine Depot',
        'Sub-District Store',
        'Private Clinic / Mission'
    ];

    // Load Regions if tenant hierarchy supports regions
    useEffect(() => {
        if (!isOpen || !hasRegion) return;
        const fetchRegions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/${tenantCode}/facilities/regions`, {
                    headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRegions(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to load regions:', err);
            }
        };
        fetchRegions();
    }, [isOpen, hasRegion, tenantCode]);

    // Load Provinces
    useEffect(() => {
        if (!isOpen) return;
        const fetchProvinces = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/${tenantCode}/facilities/provinces`, {
                    headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProvinces(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to load provinces:', err);
            }
        };
        fetchProvinces();
    }, [isOpen, tenantCode]);

    // Populate data when editing
    useEffect(() => {
        if (isEdit && facility) {
            setFormData({
                facility_name: facility.facility_name || '',
                facility_code: facility.facility_code || '',
                type: facility.type || 'Rural Health Post',
                region_id: facility.region_id || '',
                province_id: facility.province_id || '',
                district_id: facility.district_id || '',
                latitude: facility.latitude !== null && facility.latitude !== undefined ? String(facility.latitude) : '',
                longitude: facility.longitude !== null && facility.longitude !== undefined ? String(facility.longitude) : '',
                is_functioning: facility.is_functioning !== false
            });
            if (facility.province_id) {
                fetchDistricts(facility.province_id);
            }
        } else {
            setFormData({
                facility_name: '',
                facility_code: '',
                type: 'Rural Health Post',
                region_id: '',
                province_id: '',
                district_id: '',
                latitude: '',
                longitude: '',
                is_functioning: true
            });
            setDistricts([]);
        }
        setError('');
    }, [isEdit, facility, isOpen]);

    const fetchDistricts = async (provinceId) => {
        if (!provinceId) {
            setDistricts([]);
            return;
        }
        try {
            setLoadingDistricts(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/facilities/districts/${provinceId}`, {
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            if (res.ok) {
                const data = await res.json();
                setDistricts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load districts:', err);
        } finally {
            setLoadingDistricts(false);
        }
    };

    const handleRegionChange = (e) => {
        const regId = e.target.value;
        setFormData(prev => ({ ...prev, region_id: regId, province_id: '', district_id: '' }));
        setDistricts([]);
    };

    const handleProvinceChange = (e) => {
        const provId = e.target.value;
        setFormData(prev => ({ ...prev, province_id: provId, district_id: '' }));
        fetchDistricts(provId);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Filter provinces by region if region is selected and provinces have region_id
    const filteredProvinces = useMemo(() => {
        if (!hasRegion || !formData.region_id) return provinces;
        return provinces.filter(p => !p.region_id || String(p.region_id) === String(formData.region_id));
    }, [provinces, hasRegion, formData.region_id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.facility_name.trim()) {
            setError('Facility Name is required.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = isEdit 
                ? `/api/${tenantCode}/facilities/${facility.facility_id}` 
                : `/api/${tenantCode}/facilities`;
            const method = isEdit ? 'PUT' : 'POST';

            const payload = {
                facility_name: formData.facility_name.trim(),
                facility_code: formData.facility_code.trim() || null,
                type: formData.type || null,
                region_id: formData.region_id ? parseInt(formData.region_id, 10) : null,
                province_id: formData.province_id ? parseInt(formData.province_id, 10) : null,
                district_id: formData.district_id ? parseInt(formData.district_id, 10) : null,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
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
                throw new Error(data.message || 'Failed to save facility');
            }

            if (onSuccess) onSuccess(data.facility || data);
            onClose();
        } catch (err) {
            console.error('Error saving facility:', err);
            setError(err.message || 'An error occurred while saving.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="facility-modal-overlay" onClick={onClose}>
            <div className="facility-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="facility-modal-header">
                    <div>
                        <h3>{isEdit ? '✏️ Edit Health Facility' : '🏥 Add New Health Facility'}</h3>
                        <p>{isEdit ? 'Update facility metadata and cold chain status' : 'Register a new health facility in the national hierarchy'}</p>
                    </div>
                    <button className="facility-modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="facility-modal-body">
                        {error && (
                            <div className="facility-error-alert">
                                <span>⚠️ {error}</span>
                            </div>
                        )}

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Facility Name <span className="req">*</span></label>
                                <input
                                    type="text"
                                    name="facility_name"
                                    value={formData.facility_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Kasama Urban Clinic"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Facility Code / HMIS ID</label>
                                <input
                                    type="text"
                                    name="facility_code"
                                    value={formData.facility_code}
                                    onChange={handleChange}
                                    placeholder="e.g. ZMB-KSM-001"
                                />
                            </div>
                        </div>

                        {/* Location Hierarchy Cascade: Region (if exists) > Province > District */}
                        <div className={hasRegion ? 'form-grid-3' : 'form-grid-2'}>
                            {hasRegion && (
                                <div className="form-group">
                                    <label>{regionLevel?.name || 'Region'}</label>
                                    <select
                                        name="region_id"
                                        value={formData.region_id}
                                        onChange={handleRegionChange}
                                    >
                                        <option value="">-- Select {regionLevel?.name || 'Region'} --</option>
                                        {regions.map(r => (
                                            <option key={r.region_id} value={r.region_id}>
                                                {r.region_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>{provinceLevel?.name || 'Province'}</label>
                                <select
                                    name="province_id"
                                    value={formData.province_id}
                                    onChange={handleProvinceChange}
                                >
                                    <option value="">-- Select {provinceLevel?.name || 'Province'} --</option>
                                    {filteredProvinces.map(p => (
                                        <option key={p.province_id} value={p.province_id}>
                                            {p.province_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{districtLevel?.name || 'District'}</label>
                                <select
                                    name="district_id"
                                    value={formData.district_id}
                                    onChange={handleChange}
                                    disabled={!formData.province_id || loadingDistricts}
                                >
                                    <option value="">
                                        {loadingDistricts ? 'Loading districts...' : `-- Select ${districtLevel?.name || 'District'} --`}
                                    </option>
                                    {districts.map(d => (
                                        <option key={d.district_id} value={d.district_id}>
                                            {d.district_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Facility Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                >
                                    {facilityTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Operating Status</label>
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
                                        {formData.is_functioning ? '🟢 Active & Functional' : '🔴 Non-Functional / Closed'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Latitude</label>
                                <input
                                    type="number"
                                    name="latitude"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    step="any"
                                    placeholder="e.g. -10.2134"
                                />
                            </div>

                            <div className="form-group">
                                <label>Longitude</label>
                                <input
                                    type="number"
                                    name="longitude"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    step="any"
                                    placeholder="e.g. 31.1802"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="facility-modal-footer">
                        <button
                            type="button"
                            className="btn-facility-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-facility-save"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Facility')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FacilityModal;
