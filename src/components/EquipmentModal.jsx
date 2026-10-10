import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../context/TenantContext';
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
    const { config } = useTenant();

    // Dynamic Hierarchy setup
    const hierarchy = config?.hierarchy || [
        { id: 'province', name: 'Province' },
        { id: 'district', name: 'District' }
    ];

    const isFilterableLevel = (level) => {
        if (!level || !level.id) return false;
        const idLower = level.id.toLowerCase();
        const nameLower = (level.name || '').toLowerCase();
        const nonFilteringTerms = [
            'national', 'country', 'facility', 'health_facility', 'healthfacility', 'system'
        ];
        return !nonFilteringTerms.some(term => idLower.includes(term) || nameLower.includes(term));
    };

    const locationLevels = useMemo(() => hierarchy.filter(isFilterableLevel), [hierarchy]);
    
    // Smart detection: check if hierarchy includes region OR if any facility has non-empty region
    const hasRegion = useMemo(() => {
        const hierarchyHasRegion = locationLevels.some(l => l.id.toLowerCase() === 'region');
        const dataHasRegion = facilities.some(f => Boolean(f.region && String(f.region).trim() !== '' && String(f.region).toLowerCase() !== 'null'));
        return hierarchyHasRegion || dataHasRegion;
    }, [locationLevels, facilities]);

    const regionLevel = useMemo(() => locationLevels.find(l => l.id.toLowerCase() === 'region') || { id: 'region', name: 'Region' }, [locationLevels]);
    const provinceLevel = useMemo(() => locationLevels.find(l => l.id.toLowerCase().includes('prov') || l.id.toLowerCase().includes('state')) || { id: 'province', name: 'Province' }, [locationLevels]);
    const districtLevel = useMemo(() => locationLevels.find(l => l.id.toLowerCase().includes('dist') || l.id.toLowerCase().includes('count')) || { id: 'district', name: 'District' }, [locationLevels]);

    // Cascading Location Filter states
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [facilitySearch, setFacilitySearch] = useState('');

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

    // Initialize or Pre-populate modal
    useEffect(() => {
        if (!isOpen) return;

        if (isEdit && equipment) {
            setFormData({
                facility_id: equipment.facility_id ? String(equipment.facility_id) : '',
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

            // Automatically resolve and set cascading location filters from the assigned facility
            if (equipment.facility_id && facilities.length > 0) {
                const assignedFac = facilities.find(f => String(f.facility_id) === String(equipment.facility_id));
                if (assignedFac) {
                    if (hasRegion && assignedFac.region) setSelectedRegion(assignedFac.region);
                    if (assignedFac.province) setSelectedProvince(assignedFac.province);
                    if (assignedFac.district) setSelectedDistrict(assignedFac.district);
                }
            }
        } else {
            setFormData({
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
            setSelectedRegion('');
            setSelectedProvince('');
            setSelectedDistrict('');
            setFacilitySearch('');
        }
        setError('');
    }, [isEdit, equipment, isOpen, facilities, hasRegion]);

    // 1. Unique Region Options (only when hasRegion is true)
    const regionOptions = useMemo(() => {
        if (!hasRegion) return [];
        return Array.from(new Set(facilities.map(f => f.region).filter(Boolean))).sort();
    }, [facilities, hasRegion]);

    // 2. Cascaded Province Options
    const provinceOptions = useMemo(() => {
        return Array.from(new Set(
            facilities
                .filter(f => !hasRegion || !selectedRegion || f.region === selectedRegion)
                .map(f => f.province)
                .filter(Boolean)
        )).sort();
    }, [facilities, hasRegion, selectedRegion]);

    // 3. Cascaded District Options
    const districtOptions = useMemo(() => {
        return Array.from(new Set(
            facilities
                .filter(f => {
                    if (hasRegion && selectedRegion && f.region !== selectedRegion) return false;
                    if (selectedProvince && f.province !== selectedProvince) return false;
                    return true;
                })
                .map(f => f.district)
                .filter(Boolean)
        )).sort();
    }, [facilities, hasRegion, selectedRegion, selectedProvince]);

    // 4. Cascaded Facilities List
    const filteredFacilities = useMemo(() => {
        return facilities.filter(f => {
            if (hasRegion && selectedRegion && f.region !== selectedRegion) return false;
            if (selectedProvince && f.province !== selectedProvince) return false;
            if (selectedDistrict && f.district !== selectedDistrict) return false;
            if (facilitySearch.trim()) {
                const q = facilitySearch.toLowerCase().trim();
                const nameMatch = (f.facility_name || '').toLowerCase().includes(q);
                const codeMatch = (f.facility_code || '').toLowerCase().includes(q);
                if (!nameMatch && !codeMatch) return false;
            }
            return true;
        });
    }, [facilities, hasRegion, selectedRegion, selectedProvince, selectedDistrict, facilitySearch]);

    // Cascade change handlers
    const handleRegionChange = (e) => {
        const val = e.target.value;
        setSelectedRegion(val);
        setSelectedProvince('');
        setSelectedDistrict('');
        if (formData.facility_id) {
            const currentFac = facilities.find(f => String(f.facility_id) === String(formData.facility_id));
            if (currentFac && val && currentFac.region !== val) {
                setFormData(prev => ({ ...prev, facility_id: '' }));
            }
        }
    };

    const handleProvinceChange = (e) => {
        const val = e.target.value;
        setSelectedProvince(val);
        setSelectedDistrict('');
        if (formData.facility_id) {
            const currentFac = facilities.find(f => String(f.facility_id) === String(formData.facility_id));
            if (currentFac && val && currentFac.province !== val) {
                setFormData(prev => ({ ...prev, facility_id: '' }));
            }
        }
    };

    const handleDistrictChange = (e) => {
        const val = e.target.value;
        setSelectedDistrict(val);
        if (formData.facility_id) {
            const currentFac = facilities.find(f => String(f.facility_id) === String(formData.facility_id));
            if (currentFac && val && currentFac.district !== val) {
                setFormData(prev => ({ ...prev, facility_id: '' }));
            }
        }
    };

    const handleResetLocationFilters = () => {
        setSelectedRegion('');
        setSelectedProvince('');
        setSelectedDistrict('');
        setFacilitySearch('');
    };

    const handleFacilitySelect = (e) => {
        const facId = e.target.value;
        setFormData(prev => ({ ...prev, facility_id: facId }));
        if (facId) {
            const selectedFac = facilities.find(f => String(f.facility_id) === String(facId));
            if (selectedFac) {
                if (hasRegion && selectedFac.region) setSelectedRegion(selectedFac.region);
                if (selectedFac.province) setSelectedProvince(selectedFac.province);
                if (selectedFac.district) setSelectedDistrict(selectedFac.district);
            }
        }
    };

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
            setError('Please select an assigned health facility.');
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

                        {/* SMART CASCADE LOCATION SELECTOR */}
                        <div className="cascade-location-card">
                            <div className="cascade-card-header">
                                <div className="cascade-title-group">
                                    <span className="cascade-icon">📍</span>
                                    <div>
                                        <strong>Health Facility Hierarchy Cascade</strong>
                                        <div className="cascade-subtitle">
                                            {hasRegion 
                                                ? `${regionLevel?.name || 'Region'} → ${provinceLevel?.name || 'Province'} → ${districtLevel?.name || 'District'} → Facility`
                                                : `${provinceLevel?.name || 'Province'} → ${districtLevel?.name || 'District'} → Facility`
                                            }
                                        </div>
                                    </div>
                                </div>
                                {(selectedRegion || selectedProvince || selectedDistrict || facilitySearch) && (
                                    <button
                                        type="button"
                                        className="btn-clear-cascade"
                                        onClick={handleResetLocationFilters}
                                    >
                                        ↺ Reset Filters
                                    </button>
                                )}
                            </div>

                            {/* Cascading Filter Selectors: Region > Province > District */}
                            <div className={hasRegion ? 'cascade-grid-3' : 'cascade-grid-2'}>
                                {hasRegion && (
                                    <div className="cascade-select-group">
                                        <label>{regionLevel?.name || 'Region'}</label>
                                        <select
                                            value={selectedRegion}
                                            onChange={handleRegionChange}
                                        >
                                            <option value="">All Regions ({regionOptions.length})</option>
                                            {regionOptions.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="cascade-select-group">
                                    <label>{provinceLevel?.name || 'Province'}</label>
                                    <select
                                        value={selectedProvince}
                                        onChange={handleProvinceChange}
                                    >
                                        <option value="">All {provinceLevel?.name || 'Province'}s ({provinceOptions.length})</option>
                                        {provinceOptions.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cascade-select-group">
                                    <label>{districtLevel?.name || 'District'}</label>
                                    <select
                                        value={selectedDistrict}
                                        onChange={handleDistrictChange}
                                        disabled={!selectedProvince && !selectedRegion && districtOptions.length > 50}
                                    >
                                        <option value="">All {districtLevel?.name || 'District'}s ({districtOptions.length})</option>
                                        {districtOptions.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Search and Facility Choice */}
                            <div className="facility-picker-group">
                                <div className="facility-picker-label-row">
                                    <label>
                                        Assigned Health Facility <span className="req">*</span>
                                    </label>
                                    <span className="facility-counter-badge">
                                        {filteredFacilities.length} {filteredFacilities.length === 1 ? 'facility' : 'facilities'} matching
                                    </span>
                                </div>

                                <div className="facility-search-wrapper">
                                    <input
                                        type="text"
                                        className="facility-search-input"
                                        placeholder="🔍 Type facility name or code to narrow list..."
                                        value={facilitySearch}
                                        onChange={(e) => setFacilitySearch(e.target.value)}
                                    />
                                    {facilitySearch && (
                                        <button
                                            type="button"
                                            className="facility-search-clear"
                                            onClick={() => setFacilitySearch('')}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                <select
                                    name="facility_id"
                                    value={formData.facility_id}
                                    onChange={handleFacilitySelect}
                                    className="facility-select-main"
                                    required
                                >
                                    <option value="">-- Choose Health Facility ({filteredFacilities.length} in scope) --</option>
                                    {filteredFacilities.map(f => (
                                        <option key={f.facility_id} value={f.facility_id}>
                                            {f.facility_name} {f.facility_code ? `(${f.facility_code})` : ''} - {f.district ? `${f.district}, ` : ''}{f.province || ''}
                                        </option>
                                    ))}
                                </select>

                                {formData.facility_id && (
                                    <div className="facility-selected-preview">
                                        <span className="preview-check">✓</span>
                                        <span>
                                            Assigned: <strong>{facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.facility_name}</strong>
                                            {facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.facility_code ? ` (${facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.facility_code})` : ''}
                                            {facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.district ? ` • ${facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.district}, ${facilities.find(f => String(f.facility_id) === String(formData.facility_id))?.province || ''}` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EQUIPMENT ATTRIBUTES */}
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
