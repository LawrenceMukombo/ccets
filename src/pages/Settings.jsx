import React, { useState, useEffect } from 'react';
import './Settings.css';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useTenant } from '../context/TenantContext';

const ADMIN_LEVEL_PRESETS = [
    { id: 'level_0', name: 'National', color: '#1d4ed8' },
    { id: 'level_1', name: 'State / Province', color: '#be123c' },
    { id: 'level_2', name: 'County / District', color: '#0369a1' },
    { id: 'level_3', name: 'Payam / Sub-district', color: '#7c3aed' },
    { id: 'level_4', name: 'Boma / Community', color: '#15803d' }
];

const createDefaultHierarchy = () => ADMIN_LEVEL_PRESETS.slice(0, 3).map(level => ({ ...level, enabled: true }));

const normalizeHierarchy = (hierarchy) => {
    if (!Array.isArray(hierarchy) || hierarchy.length === 0) return createDefaultHierarchy();
    return hierarchy.map((level, index) => ({
        id: level.id || ADMIN_LEVEL_PRESETS[index]?.id || 'level_' + index,
        name: level.name || ADMIN_LEVEL_PRESETS[index]?.name || 'Level ' + index,
        color: level.color || ADMIN_LEVEL_PRESETS[index]?.color || '#3b82f6',
        enabled: level.enabled !== false
    }));
};

const getBoundaryLevels = (hierarchy) => normalizeHierarchy(hierarchy)
    .filter(level => level.enabled !== false)
    .filter(level => !['facility', 'health_facility', 'healthfacility'].includes(String(level.id).toLowerCase()));

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const Settings = () => {
    const { tenantCode, config: contextConfig, refreshConfig, loading: configLoading, platformContext, refreshPlatformContext } = useTenant();
    const [activeTab, setActiveTab] = useState('account');
    const [user, setUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState(null);
    const [userProfile, setUserProfile] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
    const [securityData, setSecurityData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [preferences, setPreferences] = useState({ 
        landingPage: localStorage.getItem('pref_landingPage') || 'dashboard',
        compactMode: localStorage.getItem('pref_compactMode') === 'true',
        notifications: localStorage.getItem('pref_notifications') !== 'false'
    });
    
    // Upgraded Phase 3 States
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [hierarchyImpacts, setHierarchyImpacts] = useState({});
    const [impactLoading, setImpactLoading] = useState(false);

    // Portability States
    const [importPreview, setImportPreview] = useState(null);
    const [importManifest, setImportManifest] = useState(null);
    const [importError, setImportError] = useState('');
    const [importPackage, setImportPackage] = useState(null);
    const [isValidatingPackage, setIsValidatingPackage] = useState(false);
    const [isImportingPackage, setIsImportingPackage] = useState(false);

    // Standalone Promotion States
    const [promotionChecklist, setPromotionChecklist] = useState(null);
    const [isCheckingPromotion, setIsCheckingPromotion] = useState(false);
    const [isExportingPromotion, setIsExportingPromotion] = useState(false);
    const [promotionHistory, setPromotionHistory] = useState([]);
    const [promotionMsg, setPromotionMsg] = useState({ text: '', type: '' });

    // Integration States
    const [connectors, setConnectors] = useState([]);
    const [connectorsLoading, setConnectorsLoading] = useState(false);
    const [showAddConnector, setShowAddConnector] = useState(false);
    const [newConnector, setNewConnector] = useState({ name: '', type: 'ODK Central', url: '', username: '', password: '', apiKey: '' });
    const [syncRuns, setSyncRuns] = useState([]);
    const [syncLoading, setSyncLoading] = useState(false);
    const [stagingFacilities, setStagingFacilities] = useState([]);
    const [stagingEquipment, setStagingEquipment] = useState([]);
    const [stagingLoading, setStagingLoading] = useState(false);
    const [selectedRunLogs, setSelectedRunLogs] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [deploymentSubTab, setDeploymentSubTab] = useState('info'); // info, promote, integration, staging
    const [showEditCountryModal, setShowEditCountryModal] = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [isUpdatingCountry, setIsUpdatingCountry] = useState(false);

    // Country Onboarding States
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [showAddCountryModal, setShowAddCountryModal] = useState(false);
    const [newCountry, setNewCountry] = useState({
        code: '',
        name: '',
        currency_code: '',
        currency_symbol: '',
        time_zone: '',
        phone_prefix: '',
        map_center_lat: '',
        map_center_lng: '',
        map_zoom: '6',
        admin_email: '',
        admin_password: '',
        hierarchy: createDefaultHierarchy()
    });
    const [boundaryUploads, setBoundaryUploads] = useState({});
    const [boundaryUploadStatus, setBoundaryUploadStatus] = useState({});
    const [referenceImportLoading, setReferenceImportLoading] = useState({});
    const [referenceImportStatus, setReferenceImportStatus] = useState({});

    // Reconciliation Workbench States
    const [reconcileFacilities, setReconcileFacilities] = useState([]);
    const [reconcileEquipment, setReconcileEquipment] = useState([]);
    const [reconcileTab, setReconcileTab] = useState('facilities');
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [selectedStagingRecord, setSelectedStagingRecord] = useState(null);
    const [manualProductionId, setManualProductionId] = useState('');
    const [productionList, setProductionList] = useState([]);
    const [productionEquipmentList, setProductionEquipmentList] = useState([]);

    // ODK Central State
    const [odkConfig, setOdkConfig] = useState({ url: '', username: '', password: '', projectId: '', formId: '', is_active: true });
    const [odkSubmissions, setOdkSubmissions] = useState([]);
    const [odkLoading, setOdkLoading] = useState(false);
    const [isSavingOdkConfig, setIsSavingOdkConfig] = useState(false);
    const [odkStagingModalOpen, setOdkStagingModalOpen] = useState(false);
    const [selectedOdkSubmission, setSelectedOdkSubmission] = useState(null);
    const [manualOdkFacilityId, setManualOdkFacilityId] = useState('');
    const [manualOdkEquipmentId, setManualOdkEquipmentId] = useState('');
    
    // Integration Health States
    const [integrationHealth, setIntegrationHealth] = useState(null);
    const [isFetchingHealth, setIsFetchingHealth] = useState(false);
    const [healthError, setHealthError] = useState(null);

    const checkPromotionReadiness = async () => {
        setIsCheckingPromotion(true);
        setPromotionMsg({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/platform/promote/check/${tenantCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPromotionChecklist(data.checklist);
            } else {
                setPromotionMsg({ text: data.message || 'Check failed', type: 'error' });
            }
        } catch (error) {
            console.error('Readiness check failed', error);
            setPromotionMsg({ text: 'Failed to complete readiness check.', type: 'error' });
        } finally {
            setIsCheckingPromotion(false);
        }
    };

    const exportStandalonePackage = async () => {
        setIsExportingPromotion(true);
        setPromotionMsg({ text: 'Exporting standalone package, please wait...', type: 'info' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/platform/promote/export/${tenantCode}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPromotionMsg({ text: 'Export completed successfully! Downloading package...', type: 'success' });
                window.open(data.downloadUrl, '_blank');
                fetchPromotionHistory();
            } else {
                setPromotionMsg({ text: data.message || 'Export failed', type: 'error' });
            }
        } catch (error) {
            console.error('Export failed', error);
            setPromotionMsg({ text: 'Failed to export standalone package.', type: 'error' });
        } finally {
            setIsExportingPromotion(false);
        }
    };

    const fetchPromotionHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/platform/promote/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPromotionHistory(data.history || []);
            }
        } catch (error) {
            console.error('Failed to fetch promotion history', error);
        }
    };

    const fetchConnectors = async () => {
        setConnectorsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/connectors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setConnectors(data.connectors || []);
            }
        } catch (error) {
            console.error('Failed to fetch connectors', error);
        } finally {
            setConnectorsLoading(false);
        }
    };

    const saveConnector = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const credentials = newConnector.type === 'ODK Central' || newConnector.type === 'KoboToolbox' 
                ? { username: newConnector.username, password: newConnector.password }
                : { apiKey: newConnector.apiKey };

            const res = await fetch(`/api/${tenantCode}/integration/connectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newConnector.name,
                    type: newConnector.type,
                    url: newConnector.url,
                    credentials
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Connector registered successfully!', type: 'success' });
                setShowAddConnector(false);
                setNewConnector({ name: '', type: 'ODK Central', url: '', username: '', password: '', apiKey: '' });
                fetchConnectors();
            } else {
                setMessage({ text: data.message || 'Failed to save connector', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving connector', error);
            setMessage({ text: 'Server connection failed', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const deleteConnector = async (id) => {
        if (!window.confirm('Are you sure you want to delete this connector registry?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/connectors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Connector deleted successfully', type: 'success' });
                fetchConnectors();
            } else {
                setMessage({ text: data.message || 'Failed to delete connector', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to delete connector', error);
        }
    };

    const triggerSync = async (id) => {
        setMessage({ text: 'Synchronization triggered in background...', type: 'info' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/connectors/${id}/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Sync job queued successfully. Monitor runs below.', type: 'success' });
                fetchSyncRuns();
            } else {
                setMessage({ text: data.message || 'Sync failed to start', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to trigger sync', error);
        }
    };

    const fetchSyncRuns = async () => {
        setSyncLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/sync-runs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSyncRuns(data.syncRuns || []);
            }
        } catch (error) {
            console.error('Failed to fetch sync runs', error);
        } finally {
            setSyncLoading(false);
        }
    };

    const fetchStagingData = async () => {
        setStagingLoading(true);
        try {
            const token = localStorage.getItem('token');
            const resFac = await fetch(`/api/${tenantCode}/integration/staging/facilities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataFac = await resFac.json();
            if (dataFac.success) {
                setStagingFacilities(dataFac.facilities || []);
            }

            const resEquip = await fetch(`/api/${tenantCode}/integration/staging/equipment`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataEquip = await resEquip.json();
            if (dataEquip.success) {
                setStagingEquipment(dataEquip.equipment || []);
            }
        } catch (error) {
            console.error('Failed to fetch staging data', error);
        } finally {
            setStagingLoading(false);
        }
    };

    const fetchRunLogs = async (runId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/sync-runs/${runId}/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedRunLogs(data.logs || []);
                setShowLogsModal(true);
            }
        } catch (error) {
            console.error('Failed to fetch run logs', error);
        }
    };

    const downloadImportTemplate = (type) => {
        const token = localStorage.getItem('token');
        fetch(`/api/${tenantCode}/reference-import/template/${type}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to download template');
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `ccets_${type}_template.csv`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Template download failed', error);
                setReferenceImportStatus(prev => ({ ...prev, [type]: { type: 'error', text: 'Template download failed.' } }));
            });
    };

    const handleReferenceCsvImport = async (type, file) => {
        if (!file) return;

        setReferenceImportLoading(prev => ({ ...prev, [type]: true }));
        setReferenceImportStatus(prev => ({ ...prev, [type]: { type: 'info', text: 'Reading CSV file...' } }));

        try {
            const csv = await file.text();
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/reference-import/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ csv })
            });
            const data = await res.json();

            if (data.success) {
                const summary = data.summary || {};
                setReferenceImportStatus(prev => ({
                    ...prev,
                    [type]: {
                        type: summary.failed > 0 ? 'warning' : 'success',
                        text: `Imported ${summary.imported || 0}, skipped ${summary.skipped || 0}, failed ${summary.failed || 0}.`
                    }
                }));
            } else {
                setReferenceImportStatus(prev => ({ ...prev, [type]: { type: 'error', text: data.message || 'CSV import failed.' } }));
            }
        } catch (error) {
            console.error(`${type} CSV import failed`, error);
            setReferenceImportStatus(prev => ({ ...prev, [type]: { type: 'error', text: 'Upload a valid CSV file.' } }));
        } finally {
            setReferenceImportLoading(prev => ({ ...prev, [type]: false }));
        }
    };
    const handleBoundaryUpload = async (levelId, fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        setBoundaryUploads(prev => ({ ...prev, [levelId]: true }));
        setBoundaryUploadStatus(prev => ({ ...prev, [levelId]: { type: 'info', text: 'Reading boundary file...' } }));

        try {
            const token = localStorage.getItem('token');
            const firstFile = files[0];
            const lowerNames = files.map(file => file.name.toLowerCase());
            const isGeoJson = files.length === 1 && (firstFile.name.toLowerCase().endsWith('.json') || firstFile.name.toLowerCase().endsWith('.geojson'));

            let payload;
            if (isGeoJson) {
                const fileText = await firstFile.text();
                payload = { level: levelId, geojson: JSON.parse(fileText) };
            } else {
                if (!lowerNames.some(name => name.endsWith('.shp'))) {
                    throw new Error('Select a GeoJSON file or the shapefile .shp component. Include .dbf when available.');
                }

                const encodedFiles = await Promise.all(files.map(async file => ({
                    name: file.name,
                    content: await fileToBase64(file)
                })));
                payload = { level: levelId, files: encodedFiles };
            }

            const res = await fetch(`/api/${tenantCode}/boundaries/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setBoundaryUploadStatus(prev => ({
                    ...prev,
                    [levelId]: { type: 'success', text: data.message || 'Boundary layer uploaded successfully.' }
                }));
            } else {
                setBoundaryUploadStatus(prev => ({
                    ...prev,
                    [levelId]: { type: 'error', text: data.message || 'Boundary upload failed.' }
                }));
            }
        } catch (error) {
            console.error('Boundary upload failed', error);
            setBoundaryUploadStatus(prev => ({
                ...prev,
                [levelId]: { type: 'error', text: error.message || 'Upload a valid GeoJSON or shapefile boundary layer.' }
            }));
        } finally {
            setBoundaryUploads(prev => ({ ...prev, [levelId]: false }));
        }
    };
    const fetchCountries = async () => {
        setCountriesLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tenants', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setCountries(data);
            }
        } catch (error) {
            console.error('Failed to fetch countries', error);
        } finally {
            setCountriesLoading(false);
        }
    };

    useEffect(() => {
        if ((activeTab === 'onboarding' || activeTab === 'deployment') && canManageCountries) {
            fetchCountries();
        }
    }, [activeTab, canManageCountries]);

    const handleCreateCountry = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            
            const lat = parseFloat(newCountry.map_center_lat);
            const lng = parseFloat(newCountry.map_center_lng);
            if (isNaN(lat) || isNaN(lng)) {
                setMessage({ text: 'Map Center Latitude and Longitude must be valid numbers.', type: 'error' });
                setIsSaving(false);
                return;
            }

            const payload = {
                code: newCountry.code,
                name: newCountry.name,
                currency_code: newCountry.currency_code,
                currency_symbol: newCountry.currency_symbol,
                time_zone: newCountry.time_zone,
                phone_prefix: newCountry.phone_prefix,
                map_center: [lat, lng],
                map_zoom: parseInt(newCountry.map_zoom) || 6,
                hierarchy: newCountry.hierarchy,
                admin_email: newCountry.admin_email,
                admin_password: newCountry.admin_password
            };

            const res = await fetch('/api/admin/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Country onboarded and schema provisioned successfully!', type: 'success' });
                setShowAddCountryModal(false);
                fetchCountries();
                if (refreshPlatformContext) refreshPlatformContext();
                setNewCountry({
                    code: '',
                    name: '',
                    currency_code: '',
                    currency_symbol: '',
                    time_zone: '',
                    phone_prefix: '',
                    map_center_lat: '',
                    map_center_lng: '',
                    map_zoom: '6',
                    admin_email: '',
                    admin_password: '',
                    hierarchy: createDefaultHierarchy()
                });
            } else {
                setMessage({ text: data.message || 'Failed to onboard country.', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create country', error);
            setMessage({ text: 'Server error while onboarding country.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCountry = async (e) => {
        e.preventDefault();
        if (!editingCountry) return;
        setIsUpdatingCountry(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/platform/tenants/${editingCountry.code}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editingCountry.name,
                    emblem: editingCountry.emblem,
                    is_active: editingCountry.is_active,
                    currency_code: editingCountry.currency_code,
                    currency_symbol: editingCountry.currency_symbol,
                    phone_prefix: editingCountry.phone_prefix,
                    time_zone: editingCountry.time_zone,
                    contact_email: editingCountry.contact_email
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: `Country ${editingCountry.name} updated successfully!`, type: 'success' });
                setShowEditCountryModal(false);
                setEditingCountry(null);
                fetchCountries();
                if (refreshPlatformContext) refreshPlatformContext();
                if (refreshConfig) refreshConfig();
            } else {
                setMessage({ text: data.message || 'Failed to update country.', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to update country', error);
            setMessage({ text: 'Server error while updating country.', type: 'error' });
        } finally {
            setIsUpdatingCountry(false);
        }
    };

    const fetchReconciliationData = async () => {
        setReconcileLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Fetch facilities
            const facRes = await fetch(`/api/${tenantCode}/integration/reconcile/facilities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const facData = await facRes.json();
            if (facData.success) {
                setReconcileFacilities(facData.records || []);
            }

            // Fetch equipment
            const eqRes = await fetch(`/api/${tenantCode}/integration/reconcile/equipment`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const eqData = await eqRes.json();
            if (eqData.success) {
                setReconcileEquipment(eqData.records || []);
            }
        } catch (error) {
            console.error('Error fetching reconciliation data:', error);
        } finally {
            setReconcileLoading(false);
        }
    };

    const fetchProductionFacilities = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/facilities?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProductionList(data.facilities || data.data || []);
            }
        } catch (error) {
            console.error('Error fetching production facilities:', error);
        }
    };

    const fetchProductionEquipment = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/equipment?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProductionEquipmentList(data.equipment || data.data || []);
            }
        } catch (error) {
            console.error('Error fetching production equipment:', error);
        }
    };

    const applyReconciliationAction = async (type, stagingId, action, productionId = null, extraData = {}) => {
        try {
            const token = localStorage.getItem('token');
            const payload = { 
                action, 
                productionId: productionId || manualProductionId || null,
                ...extraData
            };

            const res = await fetch(`/api/${tenantCode}/integration/reconcile/${type}/${stagingId}/apply`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: `Successfully applied action: ${action}`, type: 'success' });
                fetchReconciliationData();
                fetchStagingData();
                setLinkModalOpen(false);
                setSelectedStagingRecord(null);
                setManualProductionId('');
            } else {
                setMessage({ text: data.message || 'Action failed', type: 'error' });
            }
        } catch (error) {
            console.error('Error applying action:', error);
            setMessage({ text: 'Error applying reconciliation action.', type: 'error' });
        }
    };

    const runBulkReconciliation = async (type) => {
        try {
            const token = localStorage.getItem('token');
            setMessage({ text: 'Running bulk auto-reconciliation, please wait...', type: 'info' });
            const res = await fetch(`/api/${tenantCode}/integration/reconcile/${type}/bulk-apply`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: data.message, type: 'success' });
                fetchReconciliationData();
                fetchStagingData();
            } else {
                setMessage({ text: data.message || 'Bulk sync failed', type: 'error' });
            }
        } catch (error) {
            console.error('Error in bulk reconciliation:', error);
            setMessage({ text: 'Error executing bulk auto-reconciliation.', type: 'error' });
        }
    };

    useEffect(() => {
        if (activeTab === 'deployment') {
            fetchPromotionHistory();
            fetchConnectors();
            fetchSyncRuns();
            fetchStagingData();
            fetchReconciliationData();
            fetchProductionFacilities();
            fetchProductionEquipment();
        }
    }, [activeTab]);

    useEffect(() => {
        const handleSyncAlert = (e) => {
            console.log('Received sync alert event in Settings UI:', e.detail);
            if (activeTab === 'deployment') {
                fetchIntegrationHealth();
                fetchSyncRuns();
                fetchStagingData();
            }
        };

        window.addEventListener('integration_sync_alert', handleSyncAlert);
        return () => {
            window.removeEventListener('integration_sync_alert', handleSyncAlert);
        };
    }, [activeTab]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setUserProfile({
                first_name: parsedUser.first_name || '',
                last_name: parsedUser.last_name || '',
                email: parsedUser.email || '',
                phone_number: parsedUser.phone_number || ''
            });
        }
    }, []);

    useEffect(() => {
        if (contextConfig) {
            setFormData({
                ...contextConfig,
                map_center: typeof contextConfig.map_center === 'string' 
                    ? JSON.parse(contextConfig.map_center) 
                    : contextConfig.map_center,
                hierarchy: normalizeHierarchy(typeof contextConfig.hierarchy === 'string'
                    ? JSON.parse(contextConfig.hierarchy)
                    : contextConfig.hierarchy)
            });
        }
    }, [contextConfig]);

    const isAdmin = user?.role_name === 'Admin' || user?.role_name === 'SuperAdmin' || user?.role_name === 'Administrator' || user?.role_name === 'National Manager' || user?.is_admin;
    const canManageCountries = isAdmin || user?.role_name === 'SuperAdmin' || user?.is_platform_admin === true || user?.is_national_access === true;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMapCenterChange = (idx, value) => {
        const newCenter = [...formData.map_center];
        newCenter[idx] = parseFloat(value);
        setFormData(prev => ({ ...prev, map_center: newCenter }));
    };

    // Advanced Hierarchy Controls
    const handleHierarchyChange = (idx, field, value) => {
        const newHierarchy = [...formData.hierarchy];
        newHierarchy[idx] = { ...newHierarchy[idx], [field]: value };
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    const applyLevelTemplate = () => {
        setFormData(prev => ({
            ...prev,
            hierarchy: ADMIN_LEVEL_PRESETS.map(level => ({ ...level, enabled: true }))
        }));
    };

    const addHierarchyLevel = () => {
        const newHierarchy = normalizeHierarchy(formData.hierarchy);
        const nextPreset = ADMIN_LEVEL_PRESETS.find(preset => !newHierarchy.some(level => level.id === preset.id));
        if (!nextPreset) {
            setMessage({ text: 'Administrative hierarchy supports levels 0 through 4.', type: 'warning' });
            return;
        }
        setFormData(prev => ({
            ...prev,
            hierarchy: [...newHierarchy, { ...nextPreset, enabled: true }]
        }));
    };

    const removeHierarchyLevel = (idx) => {
        const level = formData.hierarchy[idx];
        const impact = hierarchyImpacts[level.id] || { facilities: 0, tickets: 0 };
        
        if (impact.facilities > 0 || impact.tickets > 0) {
            if (!window.confirm(`Warning: Deleting this level will affect ${impact.facilities} facilities and ${impact.tickets} tickets. Are you sure you want to remove it?`)) {
                return;
            }
        }

        const newHierarchy = formData.hierarchy.filter((_, i) => i !== idx);
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    const moveHierarchyUp = (idx) => {
        if (idx === 0) return;
        const newHierarchy = [...formData.hierarchy];
        const temp = newHierarchy[idx];
        newHierarchy[idx] = newHierarchy[idx - 1];
        newHierarchy[idx - 1] = temp;
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    const moveHierarchyDown = (idx) => {
        if (idx === formData.hierarchy.length - 1) return;
        const newHierarchy = [...formData.hierarchy];
        const temp = newHierarchy[idx];
        newHierarchy[idx] = newHierarchy[idx + 1];
        newHierarchy[idx + 1] = temp;
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    const toggleHierarchyEnable = (idx) => {
        const newHierarchy = [...formData.hierarchy];
        const level = newHierarchy[idx];
        const currentlyEnabled = level.enabled !== false;
        
        if (currentlyEnabled) {
            const impact = hierarchyImpacts[level.id] || { facilities: 0, tickets: 0 };
            if (impact.facilities > 0 || impact.tickets > 0) {
                if (!window.confirm(`Warning: Disabling this level will make it unavailable for ${impact.facilities} facilities and ${impact.tickets} active tickets. Proceed?`)) {
                    return;
                }
            }
        }

        newHierarchy[idx] = { ...level, enabled: !currentlyEnabled };
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    // Load Live Impact Count for Hierarchy Items
    const fetchHierarchyImpacts = async () => {
        if (!formData?.hierarchy) return;
        setImpactLoading(true);
        const token = localStorage.getItem('token');
        const newImpacts = {};
        for (const level of formData.hierarchy) {
            if (!level.id) continue;
            try {
                const res = await fetch(`/api/${tenantCode}/settings/hierarchy-impact/${level.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    newImpacts[level.id] = data.impact;
                }
            } catch (err) {
                console.error('Error fetching impact for', level.id, err);
            }
        }
        setHierarchyImpacts(newImpacts);
        setImpactLoading(false);
    };

    useEffect(() => {
        if (editMode && activeTab === 'tenant') {
            fetchHierarchyImpacts();
        }
    }, [editMode, activeTab]);

    // Fetch and Revert Settings Modification History
    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/settings/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistory(data.history);
            }
        } catch (err) {
            console.error('Error fetching settings history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleRevert = async (auditId) => {
        if (!window.confirm('Are you sure you want to revert to this previous configuration version? This will overwrite the current settings.')) {
            return;
        }
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/settings/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ auditId })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Configuration reverted successfully!', type: 'success' });
                refreshConfig();
                fetchHistory();
                setEditMode(false);
            } else {
                setMessage({ text: data.message || 'Failed to revert configuration', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Connection error during revert.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const saveConfiguration = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/settings/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                setMessage({ text: 'Configuration updated successfully!', type: 'success' });
                setEditMode(false);
                refreshConfig();
                if (showHistory) fetchHistory();
            } else {
                setMessage({ text: data.message || 'Failed to update configuration', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Connection error. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userProfile)
            });

            const data = await response.json();
            if (data.success) {
                setMessage({ text: 'Profile updated successfully!', type: 'success' });
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setEditMode(false);
            } else {
                setMessage({ text: data.message || 'Failed to update profile', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Connection error. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (securityData.newPassword !== securityData.confirmPassword) {
            return setMessage({ text: 'Passwords do not match', type: 'error' });
        }

        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: securityData.currentPassword,
                    newPassword: securityData.newPassword
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessage({ text: 'Password changed successfully!', type: 'success' });
                setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setEditMode(false);
            } else {
                setMessage({ text: data.message || 'Failed to change password', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Connection error. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const updatePreference = (key, value) => {
        const newPrefs = { ...preferences, [key]: value };
        setPreferences(newPrefs);
        localStorage.setItem(`pref_${key}`, value);
        setMessage({ text: 'Preference saved', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    };

    const renderAccountSettings = () => (
        <div className="settings-section">
            <div className="section-header-row">
                <h2 className="section-title">
                    <span className="icon">👤</span> Account Settings
                </h2>
                {!editMode && (
                    <button className="btn btn-primary btn-sm" onClick={() => setEditMode(true)}>
                        Edit Profile
                    </button>
                )}
            </div>
            <p className="section-desc">Manage your profile information and how others see you.</p>

            {message.text && activeTab === 'account' && (
                <div className={`settings-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="profile-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px' }}>
                <div className="avatar-large" style={{ width: '80px', height: '80px', background: 'var(--primary-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 }}>
                    {user?.first_name?.charAt(0) || 'U'}
                </div>
                <div className="profile-info">
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.first_name} {user?.last_name}</h3>
                    <p style={{ margin: '0.2rem 0', color: 'var(--text-secondary)' }}>{user?.email}</p>
                    <span className="badge badge-primary">{user?.role_name}</span>
                </div>
            </div>

            {editMode ? (
                <form className="settings-form" onSubmit={saveProfile}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>First Name</label>
                            <input 
                                type="text" 
                                value={userProfile.first_name} 
                                onChange={(e) => setUserProfile({...userProfile, first_name: e.target.value})}
                                placeholder="First name" 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                value={userProfile.last_name} 
                                onChange={(e) => setUserProfile({...userProfile, last_name: e.target.value})}
                                placeholder="Last name" 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                value={userProfile.email} 
                                onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                                placeholder="email@example.com" 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input 
                                type="tel" 
                                value={userProfile.phone_number} 
                                onChange={(e) => setUserProfile({...userProfile, phone_number: e.target.value})}
                                placeholder="+1 (555) 000-0000" 
                            />
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="config-grid">
                    <div className="config-item">
                        <div className="config-label">Username</div>
                        <div className="config-value">{user?.username}</div>
                    </div>
                    <div className="config-item">
                        <div className="config-label">Phone Number</div>
                        <div className="config-value">{user?.phone_number || 'Not set'}</div>
                    </div>
                    <div className="config-item">
                        <div className="config-label">Last Login</div>
                        <div className="config-value">{user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</div>
                    </div>
                    <div className="config-item">
                        <div className="config-label">Location Access</div>
                        <div className="config-value">{user?.location || 'National'}</div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTenantConfig = () => {
        if (configLoading) return <div className="loading-placeholder">Loading configuration...</div>;
        if (!contextConfig) return <div className="error-placeholder">Failed to load configuration.</div>;

        return (
            <div className="settings-section">
                <div className="section-header-row">
                    <h2 className="section-title">
                        <span className="icon">🌍</span> System Config
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isAdmin && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { toggleHistoryLogs(); }}>
                                {showHistory ? 'Hide Change Log' : 'View Change Log'}
                            </button>
                        )}
                        {isAdmin && !editMode && (
                            <button className="btn btn-primary btn-sm" onClick={() => setEditMode(true)}>
                                Edit Configuration
                            </button>
                        )}
                    </div>
                </div>
                <p className="section-desc">Global settings and administrative hierarchy for <strong>{contextConfig.name}</strong>.</p>
                
                {message.text && activeTab === 'tenant' && (
                    <div className={`settings-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Settings Modification logs */}
                {showHistory && renderHistorySection()}

                {editMode ? (
                    <form className="settings-form" onSubmit={saveConfiguration}>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Organization Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formData.name || ''} 
                                    onChange={handleInputChange} 
                                    required 
                                    placeholder="Enter organization name"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Emblem (Logo) URL</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        name="emblem"
                                        value={formData.emblem || ''} 
                                        onChange={handleInputChange} 
                                        placeholder="/path/to/logo.png"
                                    />
                                    {formData.emblem && (
                                        <div style={{ width: '42px', height: '42px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                            <img src={formData.emblem} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Contact Email</label>
                                <input 
                                    type="email" 
                                    name="contact_email" 
                                    value={formData.contact_email || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="admin@organization.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Map Center Latitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    value={formData.map_center[0] || 0} 
                                    onChange={(e) => handleMapCenterChange(0, e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Map Center Longitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    value={formData.map_center[1] || 0} 
                                    onChange={(e) => handleMapCenterChange(1, e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Map Default Zoom</label>
                                <input 
                                    type="number" 
                                    name="map_zoom"
                                    value={formData.map_zoom || 6} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                        </div>

                        {/* Administrative Hierarchy Upgrade */}
                        <div className="hierarchy-edit-section" style={{ marginTop: '2rem' }}>
                            <div className="section-header-row">
                                <h3>Administrative Hierarchy</h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{getBoundaryLevels(formData.hierarchy).length} of 5 levels enabled</span>
                            </div>
                            <p className="sub-desc">Choose any administrative levels from level 0 to level 4, rename them for the country, then upload boundary files for each enabled level from Reference Data.</p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={applyLevelTemplate}>Use Level 0-4 Template</button>
                            </div>
                            
                            {impactLoading && <p style={{ fontSize: '12px', color: 'var(--primary-color)' }}>Loading impact analysis...</p>}

                            <div className="hierarchy-edit-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                {normalizeHierarchy(formData.hierarchy).map((level, idx) => {
                                    const impact = hierarchyImpacts[level.id] || { facilities: 0, tickets: 0 };
                                    const isEnabled = level.enabled !== false;
                                    
                                    return (
                                        <div key={idx} className={`hierarchy-edit-item ${!isEnabled ? 'disabled-level' : ''}`} style={{ opacity: isEnabled ? 1 : 0.6, borderLeft: `4px solid ${level.color || '#3b82f6'}`, padding: '1rem', background: 'var(--bg-light)', borderRadius: '8px', position: 'relative' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <div className="level-icon" style={{ background: level.color || '#3b82f6', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                    {String(level.id || '').replace('level_', 'L') || idx + 1}
                                                </div>
                                                
                                                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '240px' }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Level Label (e.g. Province)" 
                                                        value={level.name} 
                                                        onChange={(e) => handleHierarchyChange(idx, 'name', e.target.value)}
                                                        style={{ flex: 2, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Fixed level id" 
                                                        value={level.id} 
                                                        onChange={(e) => handleHierarchyChange(idx, 'id', e.target.value)}
                                                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                                        disabled // IDs should be static for database column schema binding
                                                    />
                                                    <input 
                                                        type="color" 
                                                        value={level.color || '#3b82f6'} 
                                                        onChange={(e) => handleHierarchyChange(idx, 'color', e.target.value)}
                                                        title="Theme Color"
                                                        style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                                                    />
                                                </div>

                                                {/* Reorder and Toggle Panel */}
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveHierarchyUp(idx)} disabled={idx === 0} title="Move Up">▲</button>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveHierarchyDown(idx)} disabled={idx === formData.hierarchy.length - 1} title="Move Down">▼</button>
                                                    <button type="button" className={`btn btn-sm ${isEnabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleHierarchyEnable(idx)}>
                                                        {isEnabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => removeHierarchyLevel(idx)}
                                                        title="Delete Level"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Impact Preview */}
                                            {isEnabled && (impact.facilities > 0 || impact.tickets > 0) && (
                                                <div style={{ fontSize: '11px', color: '#e11d48', marginTop: '6px', display: 'flex', gap: '12px' }}>
                                                    <span>⚠️ Active bindings: <strong>{impact.facilities}</strong> facilities, <strong>{impact.tickets}</strong> tickets.</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button type="button" className="btn btn-secondary" onClick={addHierarchyLevel} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                                    + Add New Hierarchy Level
                                </button>
                            </div>
                        </div>

                        <div className="settings-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => {
                                setEditMode(false);
                                setFormData({
                                    ...contextConfig,
                                    map_center: typeof contextConfig.map_center === 'string' ? JSON.parse(contextConfig.map_center) : contextConfig.map_center,
                                    hierarchy: typeof contextConfig.hierarchy === 'string' ? JSON.parse(contextConfig.hierarchy) : contextConfig.hierarchy
                                });
                            }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="config-grid">
                            <div className="config-item">
                                <div className="config-label">Organization</div>
                                <div className="config-value">{contextConfig.name}</div>
                            </div>
                            <div className="config-item">
                                <div className="config-label">Contact</div>
                                <div className="config-value">{contextConfig.contact_email || 'Not set'}</div>
                            </div>
                            <div className="config-item">
                                <div className="config-label">Map Center</div>
                                <div className="config-value">{formData?.map_center?.join(', ')}</div>
                            </div>
                            <div className="config-item">
                                <div className="config-label">Default Zoom</div>
                                <div className="config-value">{contextConfig.map_zoom}</div>
                            </div>
                        </div>

                        <div className="hierarchy-section" style={{ marginTop: '2.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Administrative Hierarchy</h3>
                            <div className="hierarchy-list">
                                {formData?.hierarchy?.map((level, idx) => {
                                    const isEnabled = level.enabled !== false;
                                    return (
                                        <div key={level.id} className="hierarchy-item" style={{ borderLeftColor: level.color || '#3b82f6', opacity: isEnabled ? 1 : 0.5 }}>
                                            <div className="level-icon" style={{ background: level.color || '#3b82f6' }}>{String(level.id || '').replace('level_', 'L') || idx + 1}</div>
                                            <div className="level-info">
                                                <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {level.name}
                                                    {!isEnabled && <span className="badge badge-secondary" style={{ fontSize: '10px' }}>DISABLED</span>}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {level.id} | Level {String(level.id || '').replace('level_', 'L') || idx + 1}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const toggleHistoryLogs = () => {
        if (!showHistory) {
            fetchHistory();
        }
        setShowHistory(!showHistory);
    };

    const renderHistorySection = () => (
        <div className="history-section-panel" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>System Settings Change History</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHistory(false)}>Close Log</button>
            </div>
            {historyLoading ? (
                <div>Loading configuration history logs...</div>
            ) : history.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No configuration changes recorded in the audit trail.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                    {history.map(item => (
                        <div key={item.id} style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {item.action === 'Reverted' ? '🔄 Settings Reverted' : '📝 Settings Updated'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                    By {item.user_email || item.user_name || 'System Administrator'} at {new Date(item.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRevert(item.id)} disabled={isSaving}>
                                Revert to this version
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderRegionalSettings = () => {
        if (configLoading) return <div className="loading-placeholder">Loading configuration...</div>;
        if (!contextConfig) return <div className="error-placeholder">Failed to load configuration.</div>;

        return (
            <div className="settings-section">
                <div className="section-header-row">
                    <h2 className="section-title">
                        <span className="icon">🗺️</span> Regional Settings
                    </h2>
                    {isAdmin && !editMode && (
                        <button className="btn btn-primary btn-sm" onClick={() => setEditMode(true)}>
                            Edit Regional Config
                        </button>
                    )}
                </div>
                <p className="section-desc">Manage localization, currency, and regional formatting for <strong>{contextConfig.name}</strong>.</p>
                
                {message.text && activeTab === 'regional' && (
                    <div className={`settings-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {editMode ? (
                    <form className="settings-form" onSubmit={saveConfiguration}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Default Language</label>
                                <select name="language" value={formData.language || 'en'} onChange={handleInputChange}>
                                    <option value="en">English (UK)</option>
                                    <option value="en-US">English (US)</option>
                                    <option value="fr">French</option>
                                    <option value="pt">Portuguese</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>System Timezone</label>
                                <select name="time_zone" value={formData.time_zone || ''} onChange={handleInputChange}>
                                    <option value="Pacific/Port_Moresby">Pacific/Port_Moresby (GMT+10)</option>
                                    <option value="Africa/Lusaka">Africa/Lusaka (GMT+2)</option>
                                    <option value="Africa/Blantyre">Africa/Blantyre (GMT+2)</option>
                                    <option value="UTC">Universal Coordinated Time (UTC)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Date Format</label>
                                <select name="date_format" value={formData.date_format || 'DD/MM/YYYY'} onChange={handleInputChange}>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Phone Prefix</label>
                                <input 
                                    type="text" 
                                    name="phone_prefix" 
                                    value={formData.phone_prefix || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="+675"
                                />
                            </div>

                            <div className="form-group">
                                <label>Currency Code (ISO)</label>
                                <input 
                                    type="text" 
                                    name="currency_code" 
                                    value={formData.currency_code || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="PGK"
                                />
                            </div>

                            <div className="form-group">
                                <label>Currency Symbol</label>
                                <input 
                                    type="text" 
                                    name="currency_symbol" 
                                    value={formData.currency_symbol || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="K"
                                />
                            </div>
                        </div>

                        <div className="settings-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Regional Settings'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="config-grid">
                        <div className="config-item">
                            <div className="config-label">Language</div>
                            <div className="config-value">{contextConfig.language || 'English'}</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Timezone</div>
                            <div className="config-value">{contextConfig.time_zone}</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Date Format</div>
                            <div className="config-value">{contextConfig.date_format}</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Currency</div>
                            <div className="config-value">{contextConfig.currency_code} ({contextConfig.currency_symbol})</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Phone Prefix</div>
                            <div className="config-value">{contextConfig.phone_prefix}</div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPreferences = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <span className="icon">⚙️</span> Preferences
            </h2>
            <p className="section-desc">Customize your personal viewing experience.</p>

            {message.text && activeTab === 'preferences' && (
                <div className={`settings-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-form">
                <div className="form-group">
                    <label>Landing Page</label>
                    <select 
                        value={preferences.landingPage} 
                        onChange={(e) => updatePreference('landingPage', e.target.value)}
                    >
                        <option value="dashboard">Dashboard</option>
                        <option value="facilities">Facility List</option>
                        <option value="map">Interactive Map</option>
                    </select>
                    <p className="field-hint">Choose which page you see first when logging in.</p>
                </div>

                <div className="form-group">
                    <div className="checkbox-group">
                        <input 
                            type="checkbox" 
                            id="compactMode" 
                            checked={preferences.compactMode}
                            onChange={(e) => updatePreference('compactMode', e.target.checked)}
                        />
                        <label htmlFor="compactMode">
                            <strong>Compact Mode</strong>
                            <p className="field-hint">Display more data on screen by reducing padding and font size.</p>
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <div className="checkbox-group">
                        <input 
                            type="checkbox" 
                            id="notifications" 
                            checked={preferences.notifications}
                            onChange={(e) => updatePreference('notifications', e.target.checked)}
                        />
                        <label htmlFor="notifications">
                            <strong>In-app Notifications</strong>
                            <p className="field-hint">Receive real-time alerts for ticket updates and system events.</p>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <span className="icon">🔒</span> Security
            </h2>
            <p className="section-desc">Update your password and manage account security.</p>

            {message.text && activeTab === 'security' && (
                <div className={`settings-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form className="settings-form" onSubmit={handlePasswordChange}>
                <div className="form-group">
                    <label>Current Password</label>
                    <input 
                        type="password" 
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>New Password</label>
                    <input 
                        type="password" 
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                        type="password" 
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                        required
                    />
                </div>
                <div className="settings-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );

    const renderDeploymentSettings = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <span className="icon">🛡️</span> Deployment & Instance
            </h2>
            <p className="section-desc">Technical parameters, deployment mode details, standalone promotion tools, and ODK/DHIS2 integration configuration.</p>

            {/* Sub Tabs Navigation */}
            <div className="sub-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
                <button 
                    className={`btn ${deploymentSubTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                    onClick={() => setDeploymentSubTab('info')}
                >
                    🖥️ System & Tenants
                </button>
                <button 
                    className={`btn ${deploymentSubTab === 'promote' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                    onClick={() => { setDeploymentSubTab('promote'); fetchPromotionHistory(); }}
                >
                    🚀 Standalone Promotion
                </button>
                <button 
                    className={`btn ${deploymentSubTab === 'integration' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                    onClick={() => { setDeploymentSubTab('integration'); fetchConnectors(); fetchSyncRuns(); fetchStagingData(); }}
                >
                    🔌 Integration Hub
                </button>
                <button 
                    className={`btn ${deploymentSubTab === 'odk' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                    onClick={() => { setDeploymentSubTab('odk'); fetchOdkConfig(); fetchOdkSubmissions(); }}
                >
                    📶 ODK & Offline Forms
                </button>
            </div>

            {deploymentSubTab === 'info' && (
                <>
                    <div className="config-grid">
                        <div className="config-item">
                            <div className="config-label">Instance Identity</div>
                            <div className="config-value" style={{ fontWeight: 600 }}>{platformContext?.instanceName || 'CCETS Portal'}</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Deployment Mode</div>
                            <div className="config-value">
                                <span className="badge badge-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {platformContext?.deploymentMode?.replace(/_/g, ' ') || 'GLOBAL MULTI TENANT'}
                                </span>
                            </div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Default Local Tenant</div>
                            <div className="config-value">{platformContext?.defaultTenant?.toUpperCase() || 'PNG'}</div>
                        </div>
                        <div className="config-item">
                            <div className="config-label">Database Schema Status</div>
                            <div className="config-value">
                                Active Schemas: {platformContext?.tenants?.filter(t => t.is_active !== false).map(t => t.schema_name || t.code).join(', ') || 'png, zambia'}
                            </div>
                        </div>
                    </div>

                    <div className="tenant-list-section" style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Registered Platform Tenants</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Manage onboarded country tenants, provisioned schemas, and operational settings.
                                </p>
                            </div>
                            {canManageCountries && (
                                <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setShowAddCountryModal(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600 }}
                                >
                                    <span>➕</span> Onboard New Country
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                            {platformContext?.tenants?.map(t => (
                                <div key={t.id || t.code} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.2rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <img src={t.emblem || '/png_emblem.png'} alt={`${t.name} emblem`} style={{ width: '42px', height: '42px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code: <strong>{t.code?.toUpperCase()}</strong> | Schema: <code>{t.schema_name || t.code}</code></div>
                                        </div>
                                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: t.is_active !== false ? '#22c55e' : '#ef4444' }} title={t.is_active !== false ? 'Active' : 'Inactive'} />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
                                        {t.currency_code && <span className="badge badge-secondary">💵 {t.currency_symbol || ''} {t.currency_code}</span>}
                                        {t.phone_prefix && <span className="badge badge-secondary">📞 {t.phone_prefix}</span>}
                                        {t.time_zone && <span className="badge badge-secondary">🕒 {t.time_zone}</span>}
                                    </div>
                                    {canManageCountries && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.3rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setEditingCountry({
                                                        code: t.code,
                                                        name: t.name,
                                                        emblem: t.emblem || '',
                                                        is_active: t.is_active !== false,
                                                        currency_code: t.currency_code || '',
                                                        currency_symbol: t.currency_symbol || '',
                                                        phone_prefix: t.phone_prefix || '',
                                                        time_zone: t.time_zone || '',
                                                        contact_email: t.contact_email || ''
                                                    });
                                                    setShowEditCountryModal(true);
                                                }}
                                                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                ✏️ Edit Country
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {deploymentSubTab === 'promote' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1d4ed8' }}>Tenant Promotion to Standalone</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Promoting the current tenant schema (<strong>{tenantCode.toUpperCase()}</strong>) generates a fully self-contained standalone configuration and database dump package.
                            This packages all users, settings, facilities, equipment, tickets, and administrative maps into a checksum-validated portability format ready to be deployed on an offline machine.
                        </p>
                        
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button 
                                className="btn btn-secondary" 
                                disabled={isCheckingPromotion}
                                onClick={checkPromotionReadiness}
                            >
                                {isCheckingPromotion ? 'Checking Readiness...' : '🔍 Run Readiness Check'}
                            </button>
                            <button 
                                className="btn btn-primary" 
                                disabled={isExportingPromotion || !promotionChecklist?.isReady}
                                onClick={exportStandalonePackage}
                            >
                                {isExportingPromotion ? 'Exporting Package...' : '📦 Export Standalone Package'}
                            </button>
                        </div>

                        {promotionMsg.text && (
                            <div style={{ 
                                marginTop: '1rem', 
                                padding: '0.8rem', 
                                borderRadius: '6px', 
                                background: promotionMsg.type === 'success' ? '#def7ec' : promotionMsg.type === 'info' ? '#e1effe' : '#fde8e8',
                                color: promotionMsg.type === 'success' ? '#03543f' : promotionMsg.type === 'info' ? '#1e429f' : '#9b1c1c',
                                fontSize: '0.9rem'
                            }}>
                                {promotionMsg.text}
                            </div>
                        )}
                    </div>

                    {promotionChecklist && (
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Readiness Checklist Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-light)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Users</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>{promotionChecklist.usersCount}</div>
                                    <span style={{ fontSize: '0.8rem', color: promotionChecklist.usersCount > 0 ? '#10b981' : '#ef4444' }}>
                                        {promotionChecklist.usersCount > 0 ? '✅ Ready' : '❌ Needs Users'}
                                    </span>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-light)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Facilities Logged</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>{promotionChecklist.facilitiesCount}</div>
                                    <span style={{ fontSize: '0.8rem', color: promotionChecklist.facilitiesCount > 0 ? '#10b981' : '#ef4444' }}>
                                        {promotionChecklist.facilitiesCount > 0 ? '✅ Ready' : '❌ Needs Facilities'}
                                    </span>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-light)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Equipment Assets</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>{promotionChecklist.equipmentCount}</div>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ Validated</span>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-light)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Tickets</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>{promotionChecklist.ticketsCount}</div>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ Validated</span>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-light)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Map Boundaries</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.4rem 0' }}>{promotionChecklist.boundariesStatus}</div>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ Configured</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Standalone Promotion Package Runs</h3>
                        {promotionHistory.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No past promotion exports found.</p>
                        ) : (
                            <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Run ID</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Tenant</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Export Date</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promotionHistory.map(run => (
                                        <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.8rem' }}>#{run.id}</td>
                                            <td style={{ padding: '0.8rem' }}>{run.tenant_code.toUpperCase()}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span className={`badge ${run.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.8rem' }}>{new Date(run.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                {run.download_url && (
                                                    <a href={run.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
                                                        ⬇️ Download Package
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {deploymentSubTab === 'odk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Connector Settings Card */}
                        <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚙️ ODK / Kobo Connector Credentials
                            </h3>
                            <form onSubmit={handleSaveOdkConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Server URL</label>
                                        <input 
                                            type="url" 
                                            value={odkConfig.url || ''} 
                                            onChange={e => setOdkConfig({ ...odkConfig, url: e.target.value })}
                                            placeholder="https://odk.central.org or Kobo URL"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</label>
                                        <select 
                                            value={odkConfig.is_active ? 'active' : 'inactive'} 
                                            onChange={e => setOdkConfig({ ...odkConfig, is_active: e.target.value === 'active' })}
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Username / Client ID</label>
                                        <input 
                                            type="text" 
                                            value={odkConfig.username || ''} 
                                            onChange={e => setOdkConfig({ ...odkConfig, username: e.target.value })}
                                            placeholder="ODK API User or Username"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password / Token</label>
                                        <input 
                                            type="password" 
                                            value={odkConfig.password || ''} 
                                            onChange={e => setOdkConfig({ ...odkConfig, password: e.target.value })}
                                            placeholder="••••••••••••••"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Project ID</label>
                                        <input 
                                            type="text" 
                                            value={odkConfig.projectId || ''} 
                                            onChange={e => setOdkConfig({ ...odkConfig, projectId: e.target.value })}
                                            placeholder="ODK Project ID (numeric)"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Form / Asset ID</label>
                                        <input 
                                            type="text" 
                                            value={odkConfig.formId || ''} 
                                            onChange={e => setOdkConfig({ ...odkConfig, formId: e.target.value })}
                                            placeholder="ODK XML Form ID or Kobo UID"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={isSavingOdkConfig} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                                    {isSavingOdkConfig ? 'Saving...' : '💾 Save Credentials'}
                                </button>
                            </form>
                        </div>

                        {/* Webhook Card & Offline Resources */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🔗 Inbound Webhook Endpoint
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Configure this endpoint in your ODK Central or KoboToolbox project settings under REST Services / Webhooks to receive real-time updates.
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                                    <code style={{ fontSize: '0.85rem', color: '#0369a1', wordBreak: 'break-all', flex: 1 }}>
                                        {`${window.location.origin}/api/${tenantCode}/hooks/kobo/submission`}
                                    </code>
                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '4px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/api/${tenantCode}/hooks/kobo/submission`);
                                            alert('Webhook URL copied to clipboard!');
                                        }}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📄 Offline Form Media Generators
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    PWA Offline Forms and ODK sheets reference CSV files generated dynamically from CCETS registries to filter facilities and matching equipment. Click below to refresh these CSV files.
                                </p>
                                <button className="btn btn-success" onClick={triggerGenerateOdkMedia} style={{ background: '#10b981', color: '#fff', border: 'none' }}>
                                    🔄 Re-generate Offline Media CSVs
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Staging reconciliation table */}
                    <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.2rem' }}>📥 ODK Submissions Staging Queue</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Review, validate, and import remote ODK Central or Kobo submissions before promoting them to active production tickets.
                                </p>
                            </div>
                            <button className="btn btn-primary" onClick={handlePullOdkSubmissions} disabled={odkLoading}>
                                {odkLoading ? '🔄 Syncing...' : '⚡ Pull ODK Central Submissions'}
                            </button>
                        </div>

                        {odkLoading && odkSubmissions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                Loading staged submissions, please wait...
                            </div>
                        ) : odkSubmissions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No ODK Submissions Staged</div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                    Incoming forms matching configured assets will queue here. Run a pull sync above or submit a web form.
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-white)', borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Form ID (Kobo ID)</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Received</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Facility Info</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Equipment Info</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Reported issue</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Validation Status</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Status</th>
                                            <th style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {odkSubmissions.map(sub => {
                                            const payload = sub.payload || {};
                                            const errors = sub.validation_errors || [];
                                            const hasErrors = errors.length > 0;
                                            return (
                                                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)', background: hasErrors ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                        {sub.kobo_id}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(sub.created_at).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                                        <div style={{ fontWeight: 600 }}>{payload.facilityName || 'N/A'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Code: {payload.facilityCode || 'N/A'}</div>
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                                        <div>{payload.equipmentType || 'N/A'}</div>
                                                        {payload.serialNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>S/N: {payload.serialNumber}</div>}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={payload.description || ''}>
                                                        {payload.description || 'No description provided'}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                                        {hasErrors ? (
                                                            <div style={{ color: '#ef4444' }}>
                                                                <span style={{ fontWeight: 600 }}>⚠️ Invalid:</span>
                                                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem' }}>
                                                                    {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                                                                </ul>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Validated</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span className={`badge ${sub.status === 'pending' ? 'badge-warning' : sub.status === 'imported' ? 'badge-success' : 'badge-danger'}`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        {sub.status === 'pending' && (
                                                            <button 
                                                                className="btn btn-primary"
                                                                style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#0284c7', border: 'none' }}
                                                                onClick={async () => {
                                                                    setSelectedOdkSubmission(sub);
                                                                    setManualOdkFacilityId(sub.matched_facility_id || '');
                                                                    setManualOdkEquipmentId(sub.matched_equipment_id || '');
                                                                    
                                                                    try {
                                                                        const token = localStorage.getItem('token');
                                                                        const fRes = await fetch(`/api/${tenantCode}/facilities`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                        if (fRes.ok) {
                                                                            const fData = await fRes.json();
                                                                            setProductionList(fData || []);
                                                                        }
                                                                        
                                                                        if (sub.matched_facility_id) {
                                                                            const eqRes = await fetch(`/api/${tenantCode}/facilities/${sub.matched_facility_id}/equipment`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                            if (eqRes.ok) {
                                                                                const eqData = await eqRes.json();
                                                                                setProductionEquipmentList(eqData || []);
                                                                            }
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                    }
                                                                    setOdkStagingModalOpen(true);
                                                                }}
                                                            >
                                                                🔧 Resolve & Import
                                                            </button>
                                                        )}
                                                        {sub.status === 'pending' && (
                                                            <button 
                                                                className="btn btn-secondary"
                                                                style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                                                                onClick={() => handleRejectOdkSubmission(sub.id)}
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="btn btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#f1f5f9', border: '1px solid var(--border-color)' }}
                                                            onClick={() => handleDeleteOdkSubmission(sub.id)}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {deploymentSubTab === 'health' && renderIntegrationHealth()}

            {deploymentSubTab === 'integration' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>External Integration Connectors</h3>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowAddConnector(!showAddConnector)}
                        >
                            {showAddConnector ? 'Cancel Registry' : '🔌 Add Connector Registry'}
                        </button>
                    </div>

                    {showAddConnector && (
                        <form onSubmit={saveConnector} style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Connector Name</label>
                                    <input 
                                        type="text" 
                                        value={newConnector.name}
                                        onChange={e => setNewConnector({ ...newConnector, name: e.target.value })}
                                        placeholder="e.g. ODK National Registry"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Connector Type</label>
                                    <select
                                        className="form-control"
                                        value={newConnector.type}
                                        onChange={e => setNewConnector({ ...newConnector, type: e.target.value })}
                                    >
                                        <option value="ODK Central">ODK Central</option>
                                        <option value="KoboToolbox">KoboToolbox</option>
                                        <option value="DHIS2">DHIS2 Server</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Endpoint URL</label>
                                <input 
                                    type="url" 
                                    value={newConnector.url}
                                    onChange={e => setNewConnector({ ...newConnector, url: e.target.value })}
                                    placeholder="https://odk.central.org/v1/projects/..."
                                    required
                                />
                            </div>

                            {(newConnector.type === 'ODK Central' || newConnector.type === 'KoboToolbox') ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Username</label>
                                        <input 
                                            type="text" 
                                            value={newConnector.username}
                                            onChange={e => setNewConnector({ ...newConnector, username: e.target.value })}
                                            placeholder="api-user"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <input 
                                            type="password" 
                                            value={newConnector.password}
                                            onChange={e => setNewConnector({ ...newConnector, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>API Key / Token</label>
                                    <input 
                                        type="password" 
                                        value={newConnector.apiKey}
                                        onChange={e => setNewConnector({ ...newConnector, apiKey: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                                {isSaving ? 'Registering...' : 'Complete Connector Registry'}
                            </button>
                        </form>
                    )}

                    <div>
                        {connectorsLoading ? (
                            <p>Loading registered connectors...</p>
                        ) : connectors.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No external connectors configured for this tenant schema.</p>
                        ) : (
                            <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Type</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Endpoint URL</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                                        <th style={{ textAlign: 'right', padding: '0.8rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {connectors.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.8rem', fontWeight: 600 }}>{c.name}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span className="badge badge-info">{c.type}</span>
                                            </td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.url}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.is_active ? '#10b981' : '#ef4444' }} />
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', marginRight: '0.5rem' }}
                                                    onClick={() => triggerSync(c.id)}
                                                >
                                                    🔄 Run Sync
                                                </button>
                                                <button 
                                                    className="btn btn-danger"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', background: '#fecaca', color: '#b91c1c', border: 'none' }}
                                                    onClick={() => deleteConnector(c.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Integration Runs & Job Logs</h4>
                        {syncLoading ? (
                            <p>Loading run logs...</p>
                        ) : syncRuns.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No synchronization logs found.</p>
                        ) : (
                            <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Run ID</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Connector</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Start Time</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '0.8rem' }}>Processed / Failed</th>
                                        <th style={{ textAlign: 'right', padding: '0.8rem' }}>Log Logs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {syncRuns.map(run => (
                                        <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.8rem' }}>#{run.id}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <strong>{run.connector_name}</strong>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{run.connector_type}</div>
                                            </td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{new Date(run.start_time).toLocaleString()}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span className={`badge ${run.status === 'completed' ? 'badge-success' : run.status === 'running' ? 'badge-primary' : 'badge-danger'}`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.9rem' }}>
                                                <span style={{ color: '#10b981', fontWeight: 600 }}>{run.records_processed}</span> / <span style={{ color: '#ef4444', fontWeight: 600 }}>{run.records_failed}</span>
                                            </td>
                                            <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                                                    onClick={() => fetchRunLogs(run.id)}
                                                >
                                                    📜 View Audit Logs
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Staging Records Inspector</h4>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={fetchStagingData}>
                                🔄 Refresh Staging
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-light)' }}>
                                <h5 style={{ fontWeight: 600, marginBottom: '0.8rem' }}>Staging Facilities ({stagingFacilities.length})</h5>
                                {stagingFacilities.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No staging facility records.</p>
                               ) : (
                                   <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                       {stagingFacilities.slice(0, 10).map(f => (
                                           <div key={f.id} style={{ background: 'var(--bg-white)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                                               <div style={{ fontWeight: 600 }}>{f.facility_name} ({f.facility_code})</div>
                                               <div style={{ color: 'var(--text-secondary)' }}>Region: {f.province_name} &gt; {f.district_name}</div>
                                               <span className={`badge ${f.sync_status === 'synced' ? 'badge-success' : 'badge-info'}`} style={{ marginTop: '0.2rem', display: 'inline-block' }}>{f.sync_status}</span>
                                           </div>
                                       ))}
                                   </div>
                               )}
                            </div>

                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-light)' }}>
                                <h5 style={{ fontWeight: 600, marginBottom: '0.8rem' }}>Staging Equipment ({stagingEquipment.length})</h5>
                                {stagingEquipment.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No staging equipment records.</p>
                               ) : (
                                   <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                       {stagingEquipment.slice(0, 10).map(e => (
                                           <div key={e.id} style={{ background: 'var(--bg-white)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                                               <div style={{ fontWeight: 600 }}>{e.manufacturer} {e.model}</div>
                                               <div style={{ color: 'var(--text-secondary)' }}>Serial: {e.serial_number} | Facility Ext: {e.facility_external_id}</div>
                                               <span className={`badge ${e.sync_status === 'synced' ? 'badge-success' : 'badge-info'}`} style={{ marginTop: '0.2rem', display: 'inline-block' }}>{e.sync_status}</span>
                                           </div>
                                       ))}
                                   </div>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Logs modal */}
            {showLogsModal && selectedRunLogs && (
                <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                        <div className="modal-header">
                            <h2>Synchronization Log Entries</h2>
                            <button className="modal-close" onClick={() => setShowLogsModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto', background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', padding: '1rem', borderRadius: '6px' }}>
                            {selectedRunLogs.length === 0 ? (
                                <p>No logs recorded for this run.</p>
                            ) : (
                                selectedRunLogs.map(log => (
                                    <div key={log.id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: log.severity === 'error' ? '#ef4444' : log.severity === 'warn' ? '#eab308' : '#22c55e', marginRight: '10px' }}>
                                            [{log.severity.toUpperCase()}]
                                        </span>
                                        <span style={{ color: '#888', marginRight: '10px' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                        <p style={{ margin: '0.2rem 0 0 0', whiteSpace: 'pre-wrap' }}>{log.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const handleExportConfig = async () => {
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/settings/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data.package, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `ccets_config_${tenantCode}_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                setMessage({ text: 'Configuration package exported successfully!', type: 'success' });
            } else {
                setMessage({ text: data.message || 'Export failed', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Connection error during export.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsValidatingPackage(true);
        setImportError('');
        setImportPreview(null);
        setImportManifest(null);
        setImportPackage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsedPackage = JSON.parse(event.target.result);
                setImportPackage(parsedPackage);

                const token = localStorage.getItem('token');
                const res = await fetch(`/api/${tenantCode}/settings/import`, {
                    method: 'POST',
                    headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ package: parsedPackage })
                });
                const data = await res.json();
                if (data.success) {
                    setImportPreview(data.preview);
                    setImportManifest(data.manifest);
                } else {
                    setImportError(data.message || 'Validation failed');
                }
            } catch (err) {
                setImportError('Failed to parse package file. Ensure it is a valid JSON configuration file.');
            } finally {
                setIsValidatingPackage(false);
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (!importPackage) return;
        if (!window.confirm('Are you sure you want to apply this configuration? This will overwrite the current tenant settings.')) {
            return;
        }

        setIsImportingPackage(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/settings/import/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ package: importPackage })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Configuration imported successfully!', type: 'success' });
                setImportPreview(null);
                setImportManifest(null);
                setImportPackage(null);
                refreshConfig();
            } else {
                setMessage({ text: data.message || 'Import apply failed', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Connection error during import apply.', type: 'error' });
        } finally {
            setIsImportingPackage(false);
        }
    };

    const fetchIntegrationHealth = async () => {
        setIsFetchingHealth(true);
        setHealthError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/health`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setIntegrationHealth(data.health);
            } else {
                setHealthError(data.message || 'Failed to fetch integration health telemetry.');
            }
        } catch (err) {
            console.error('Error fetching integration health:', err);
            setHealthError('Network error fetching integration health.');
        } finally {
            setIsFetchingHealth(false);
        }
    };

    const fetchOdkConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/config`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.config) {
                setOdkConfig(data.config);
            }
        } catch (err) {
            console.error('Failed to fetch ODK config', err);
        }
    };

    const handleSaveOdkConfig = async (e) => {
        e.preventDefault();
        setIsSavingOdkConfig(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(odkConfig)
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'ODK Central configuration saved successfully!', type: 'success' });
                fetchOdkConfig();
            } else {
                setMessage({ text: data.message || 'Failed to save configuration', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Connection error saving configuration.', type: 'error' });
        } finally {
            setIsSavingOdkConfig(false);
        }
    };

    const fetchOdkSubmissions = async () => {
        setOdkLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOdkSubmissions(data.submissions);
            }
        } catch (err) {
            console.error('Failed to fetch ODK submissions', err);
        } finally {
            setOdkLoading(false);
        }
    };

    const handlePullOdkSubmissions = async () => {
        setOdkLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/submissions/pull`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: data.message || 'ODK Central submissions pulled successfully.', type: 'success' });
                fetchOdkSubmissions();
            } else {
                setMessage({ text: data.message || 'Failed to pull submissions', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Connection error pulling ODK submissions.', type: 'error' });
        } finally {
            setOdkLoading(false);
        }
    };

    const handleApproveOdkSubmission = async (id, overrides = {}) => {
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/submissions/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(overrides)
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'ODK submission approved and imported successfully!', type: 'success' });
                setOdkStagingModalOpen(false);
                setSelectedOdkSubmission(null);
                fetchOdkSubmissions();
            } else {
                alert(data.message || 'Failed to approve submission');
            }
        } catch (err) {
            console.error('Approve error', err);
            alert('Connection error during approval.');
        }
    };

    const handleRejectOdkSubmission = async (id) => {
        if (!window.confirm('Are you sure you want to reject this submission? It will not be imported.')) return;
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/submissions/${id}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Submission marked as rejected.', type: 'success' });
                fetchOdkSubmissions();
            }
        } catch (err) {
            console.error('Reject error', err);
        }
    };

    const handleDeleteOdkSubmission = async (id) => {
        if (!window.confirm('Are you sure you want to delete this staging record?')) return;
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/integration/odk/submissions/${id}/delete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Staging record deleted.', type: 'success' });
                fetchOdkSubmissions();
            }
        } catch (err) {
            console.error('Delete error', err);
        }
    };

    const triggerGenerateOdkMedia = async () => {
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/hooks/kobo/generate-media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'Offline Media CSV files generated successfully!', type: 'success' });
            } else {
                setMessage({ text: data.error || 'Failed to generate files', type: 'error' });
            }
        } catch (err) {
            console.error('Generation error', err);
            setMessage({ text: 'Connection error generating ODK CSV files.', type: 'error' });
        }
    };

    const renderIntegrationHealth = () => {
        if (isFetchingHealth) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
                    <div className="loading-spinner" style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--btn-primary-bg)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading integration health metrics...</p>
                </div>
            );
        }

        if (healthError) {
            return (
                <div className="settings-message error" style={{ margin: '1rem 0' }}>
                    <p>⚠️ {healthError}</p>
                    <button className="btn btn-secondary btn-sm" onClick={fetchIntegrationHealth} style={{ marginTop: '0.5rem' }}>Retry</button>
                </div>
            );
        }

        if (!integrationHealth) return null;

        const { runs, submissions, connectors, avgDurationSeconds, errorDistribution, recentRuns } = integrationHealth;

        const lastRunFailed = recentRuns && recentRuns.length > 0 && recentRuns[0].status === 'failed';
        const lowSuccessRate = runs.successRate < 90;
        const showAlert = lastRunFailed || lowSuccessRate;

        const runsHistoryData = [...recentRuns].reverse().map((run, idx) => ({
            name: `Run #${run.id}`,
            duration: run.end_time ? Math.round((new Date(run.end_time) - new Date(run.start_time)) / 1000) : 0,
            processed: run.records_processed || 0,
            failed: run.records_failed || 0
        }));

        const donutData = errorDistribution && errorDistribution.length > 0
            ? errorDistribution.map((err, idx) => ({
                name: err.val_err.length > 30 ? err.val_err.substring(0, 30) + '...' : err.val_err,
                value: err.count
              }))
            : [{ name: 'No Validation Errors', value: 1 }];

        const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {showAlert && (
                    <div style={{ background: lastRunFailed ? '#fde8e8' : '#fffbeb', border: `1px solid ${lastRunFailed ? '#f8b4b4' : '#fef08a'}`, borderRadius: '12px', padding: '1.2rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>{lastRunFailed ? '🚨' : '⚠️'}</span>
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 600, color: lastRunFailed ? '#9b1c1c' : '#854d0e' }}>
                                {lastRunFailed ? 'High Priority Alert: Last Integration Sync Failed!' : 'Integration Sync Alert: Low Success Rate'}
                            </h4>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: lastRunFailed ? '#c81e1e' : '#a16207' }}>
                                {lastRunFailed 
                                    ? `The synchronization run #${recentRuns[0].id} encountered an error: "${recentRuns[0].error_message || 'Unknown network error'}"` 
                                    : `The overall success rate of integration synchronization runs is currently at ${runs.successRate}%, which is below the target threshold of 90%.`}
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    <div className="portability-card" style={{ padding: '1.2rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sync Success Rate</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: runs.successRate >= 90 ? '#10b981' : runs.successRate >= 75 ? '#f59e0b' : '#ef4444' }}>
                            {runs.successRate}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {runs.completed} / {runs.total} successful runs
                        </span>
                    </div>

                    <div className="portability-card" style={{ padding: '1.2rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Staging Backlog</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: submissions.pending > 0 ? '#3b82f6' : '#10b981' }}>
                            {submissions.pending} Reports
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Pending review & approval
                        </span>
                    </div>

                    <div className="portability-card" style={{ padding: '1.2rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Connectors</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {connectors.active} / {connectors.total}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Enabled external data streams
                        </span>
                    </div>

                    <div className="portability-card" style={{ padding: '1.2rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Avg Sync Duration</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {avgDurationSeconds}s
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Execution latency threshold
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>Sync Execution & Record Processing History</h4>
                        {runsHistoryData.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px', color: 'var(--text-secondary)' }}>No sync data recorded.</div>
                        ) : (
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={runsHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-white)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="processed" name="Records Imported" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="failed" name="Failed Checks" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>Validation Error Types</h4>
                        {errorDistribution && errorDistribution.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px', color: 'var(--text-secondary)' }}>No validation errors.</div>
                        ) : (
                            <div style={{ width: '100%', height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <ResponsiveContainer width="100%" height="80%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--bg-white)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ fontSize: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                    {donutData.slice(0, 3).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name} ({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <h4 style={{ margin: 0, fontWeight: 600 }}>Sync Run Telemetry Records</h4>
                        <button className="btn btn-secondary btn-sm" onClick={fetchIntegrationHealth}>🔄 Refresh Health Data</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.8rem' }}>Run ID</th>
                                    <th style={{ padding: '0.8rem' }}>Connector Name</th>
                                    <th style={{ padding: '0.8rem' }}>Sync Type</th>
                                    <th style={{ padding: '0.8rem' }}>Status</th>
                                    <th style={{ padding: '0.8rem' }}>Processed / Failed</th>
                                    <th style={{ padding: '0.8rem' }}>Start Time</th>
                                    <th style={{ padding: '0.8rem' }}>Duration</th>
                                    <th style={{ padding: '0.8rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRuns.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No integration sync runs found.</td>
                                    </tr>
                                ) : (
                                    recentRuns.map(run => {
                                        const duration = run.end_time ? Math.round((new Date(run.end_time) - new Date(run.start_time)) / 1000) : 0;
                                        return (
                                            <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.8rem', fontWeight: 600 }}>#{run.id}</td>
                                                <td style={{ padding: '0.8rem' }}>{run.connector_name}</td>
                                                <td style={{ padding: '0.8rem', textTransform: 'uppercase' }}>{run.connector_type}</td>
                                                <td style={{ padding: '0.8rem' }}>
                                                    <span className={`badge ${run.status === 'completed' ? 'badge-success' : run.status === 'failed' ? 'badge-danger' : 'badge-info'}`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.8rem' }}>
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>{run.records_processed || 0}</span> / <span style={{ color: '#ef4444', fontWeight: 600 }}>{run.records_failed || 0}</span>
                                                </td>
                                                <td style={{ padding: '0.8rem' }}>{new Date(run.start_time).toLocaleString()}</td>
                                                <td style={{ padding: '0.8rem' }}>{run.end_time ? `${duration}s` : 'In Progress'}</td>
                                                <td style={{ padding: '0.8rem' }}>
                                                    <button 
                                                        className="btn btn-secondary btn-sm" 
                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                        onClick={async () => {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                const res = await fetch(`/api/${tenantCode}/integration/sync-runs/${run.id}/logs`, {
                                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                                });
                                                                const data = await res.json();
                                                                if (data.success) {
                                                                    setSelectedRunLogs(data.logs);
                                                                    setShowLogsModal(true);
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                            }
                                                        }}
                                                    >
                                                        📋 View Logs
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderPortabilitySettings = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <span className="icon">📦</span> Configuration Portability
            </h2>
            <p className="section-desc">Export or import your system configuration (emblem, hierarchy, maps, currency, and formats) securely as a signed package.</p>

            {message.text && activeTab === 'portability' && (
                <div className={`settings-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {importError && (
                <div className="settings-message error">
                    {importError}
                </div>
            )}

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: importPreview ? '1fr' : '1fr 1fr' }}>
                {!importPreview && (
                    <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Export Configuration Package</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                            Download the current system settings (excluding active tickets, user profiles, or credentials) as a checksum-secured package. You can import this file to replicate configuration on other instances.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={handleExportConfig} disabled={isSaving}>
                            {isSaving ? 'Exporting...' : 'Export Configuration'}
                        </button>
                    </div>
                )}

                {!importPreview ? (
                    <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Import Configuration Package</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                            Upload an exported CCETS configuration package to update this tenant's settings. The package integrity and compatibility checks will be validated before you apply changes.
                        </p>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImportFileChange}
                                style={{ display: 'none' }}
                                id="import-file-input"
                            />
                            <label htmlFor="import-file-input" className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                                {isValidatingPackage ? 'Validating package...' : 'Select Package File'}
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="portability-card" style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Preview Imported Configuration</h3>
                                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                    Exported at {new Date(importManifest.exportedAt).toLocaleString()} from instance <strong>{importManifest.instanceName}</strong>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setImportPreview(null); setImportPackage(null); }}>Cancel</button>
                                <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirmImport} disabled={isImportingPackage}>
                                    {isImportingPackage ? 'Importing...' : 'Confirm & Apply Import'}
                                </button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="comparison-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                        <th style={{ padding: '8px 12px' }}>Configuration Field</th>
                                        <th style={{ padding: '8px 12px' }}>Current Value</th>
                                        <th style={{ padding: '8px 12px' }}>Imported Value</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Change Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(importPreview).map(([key, field]) => (
                                        <tr key={key} style={{ borderBottom: '1px solid var(--border-color)', background: field.changed ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>
                                                {key.replace(/_/g, ' ')}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                                {typeof field.current === 'object' ? JSON.stringify(field.current) : String(field.current || '')}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: field.changed ? 600 : 'normal' }}>
                                                {typeof field.imported === 'object' ? JSON.stringify(field.imported) : String(field.imported || '')}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                {field.changed ? (
                                                    <span className="badge badge-warning" style={{ fontSize: '10px', background: '#fef08a', color: '#854d0e', border: '1px solid #fde047' }}>Modified</span>
                                                ) : (
                                                    <span className="badge badge-secondary" style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b' }}>Unchanged</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderReferenceDataSetup = () => {
        const importTypes = [
            { key: 'facilities', title: 'Health Facilities', description: 'Import active stores, health facilities, GPS coordinates, and location IDs.' },
            { key: 'equipment', title: 'Equipment', description: 'Import cold chain assets after facilities exist, using facility_id or facility_code.' },
            { key: 'users', title: 'Users', description: 'Import tenant users with role_name or role_id. Imported users must change passwords after first sign-in.' }
        ];

        return (
            <div className="settings-section">
                <h2 className="section-title">Reference Data</h2>
                <p className="section-desc">Load setup data only for the active tenant: {tenantCode?.toUpperCase()}.</p>

                <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>Administrative boundaries</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.2rem 0', lineHeight: 1.5 }}>
                        Upload GeoJSON FeatureCollection files or shapefile components for the country you are currently signed into. For shapefiles, select the .shp file together with its .dbf/.shx/.prj companions when available.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        {getBoundaryLevels(contextConfig?.hierarchy).map(level => {
                            const status = boundaryUploadStatus[level.id];
                            return (
                                <div key={level.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-light)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    <label htmlFor={`reference-boundary-upload-${level.id}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{level.name || level.id}</label>
                                    <input
                                        id={`reference-boundary-upload-${level.id}`}
                                        type="file"
                                        accept=".json,.geojson,.shp,.dbf,.shx,.prj,application/geo+json,application/json"
                                        multiple
                                        disabled={!!boundaryUploads[level.id]}
                                        onChange={e => handleBoundaryUpload(level.id, e.target.files)}
                                        style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                                    />
                                    {status && (
                                        <span style={{ fontSize: '0.75rem', color: status.type === 'success' ? '#15803d' : status.type === 'error' ? '#b91c1c' : 'var(--text-secondary)' }}>
                                            {status.text}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {importTypes.map(item => {
                        const status = referenceImportStatus[item.key];
                        return (
                            <div key={item.key} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-light)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.title}</h4>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>{item.description}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadImportTemplate(item.key)}>Download Template</button>
                                    <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                                        {referenceImportLoading[item.key] ? 'Importing...' : 'Import CSV'}
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            disabled={!!referenceImportLoading[item.key]}
                                            onChange={e => handleReferenceCsvImport(item.key, e.target.files?.[0])}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                                {status && (
                                    <span style={{ fontSize: '0.78rem', color: status.type === 'success' ? '#15803d' : status.type === 'error' ? '#b91c1c' : status.type === 'warning' ? '#a16207' : 'var(--text-secondary)' }}>
                                        {status.text}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };
    const renderCountryOnboarding = () => {
        return (
            <div className="settings-section country-onboarding-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2 className="section-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="icon">🌐</span> Country Onboarding
                        </h2>
                        <p className="section-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>
                            Register new countries as active microplanning tenants on the CCETS platform. All settings are fully configurable — no hardcoding required.
                        </p>
                    </div>
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddCountryModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600 }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>+</span> Add New Country
                    </button>
                </div>

                {message.text && activeTab === 'onboarding' && (
                    <div className={`settings-message ${message.type}`} style={{ marginBottom: '1.5rem' }}>
                        {message.text}
                    </div>
                )}

                {/* Guide Panel */}
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e40af', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📖 How to onboard a new country
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: '1.2rem' }}>
                        A quick guide for Super Admins. Only you can add a new country — country administrators are limited to their own country.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '20px', height: '20px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600 }}>1</div>
                            <div>
                                <strong>Register the country:</strong> Click <em>Add New Country</em> and fill in the country name, a short tenant code (e.g. <code>ssd</code>), and the currency, timezone, administrative level hierarchy, and map settings.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '20px', height: '20px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600 }}>2</div>
                            <div>
                                <strong>Load administrative boundaries:</strong> Open Reference Data and upload GeoJSON or shapefile boundaries for each enabled administrative level.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '20px', height: '20px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600 }}>3</div>
                            <div>
                                <strong>Load reference data:</strong> Import facilities and equipment lists via CSV, then setup users and technicians.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '20px', height: '20px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600 }}>4</div>
                            <div>
                                <strong>Provide the first national admin:</strong> Create the first country administrator who will manage users, locations, and tickets.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reference Data Setup */}
                <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Reference data setup for {tenantCode?.toUpperCase()}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                                Upload administrative boundary GeoJSON or shapefiles for the country you are currently signed into. Facilities and equipment can be loaded through their registers or pulled through integration connectors.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-light)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Administrative boundaries</h4>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                                Use GeoJSON FeatureCollection files, or select shapefile components together (.shp plus .dbf/.shx/.prj when available).
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {getBoundaryLevels(contextConfig?.hierarchy).map(level => {
                                    const status = boundaryUploadStatus[level.id];
                                    return (
                                        <div key={level.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label htmlFor={`boundary-upload-${level.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{level.name || level.id}</label>
                                            <input
                                                id={`boundary-upload-${level.id}`}
                                                type="file"
                                                accept=".json,.geojson,.shp,.dbf,.shx,.prj,application/geo+json,application/json"
                                        multiple
                                                disabled={!!boundaryUploads[level.id]}
                                                onChange={e => handleBoundaryUpload(level.id, e.target.files)}
                                                style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                                            />
                                            {status && (
                                                <span style={{ fontSize: '0.75rem', color: status.type === 'success' ? '#15803d' : status.type === 'error' ? '#b91c1c' : 'var(--text-secondary)' }}>
                                                    {status.text}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                {(contextConfig?.hierarchy || []).length === 0 && (
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Configure the country hierarchy first, then upload boundary layers.</p>
                                )}
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-light)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Facilities</h4>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                                Review the active facility registry, then use integrations or staging reconciliation when pulling from HMIS, ODK, Kobo, or another system.
                            </p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.href = '/facilities'; }}>Open Facilities</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setActiveTab('deployment'); setDeploymentSubTab('integration'); fetchConnectors(); fetchSyncRuns(); fetchStagingData(); }}>Integration Hub</button>
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-light)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Equipment</h4>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                                Load or reconcile assets after facilities exist, so equipment can be linked to the correct store or health facility.
                            </p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { window.location.href = '/equipment'; }}>Open Equipment</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setActiveTab('deployment'); setDeploymentSubTab('integration'); fetchConnectors(); fetchSyncRuns(); fetchStagingData(); }}>Reconcile Staging</button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Active Countries Grid */}
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Active Countries <span style={{ fontSize: '0.85rem', padding: '2px 8px', background: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)' }}>{countries.length}</span>
                    </h3>

                    {countriesLoading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading countries...</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
                            {countries.map(c => (
                                <div key={c.code} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontSize: '1.8rem', width: '40px', height: '40px', background: 'var(--bg-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {c.code === 'png' ? '🇵🇳' : c.code === 'zambia' ? '🇿🇲' : c.code === 'malawi' ? '🇲🇼' : '🏳️'}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{c.name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', background: 'var(--bg-light)', padding: '2px 6px', borderRadius: '4px' }}>{c.code}</span>
                                        </div>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.4rem 0' }} />
                                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                        <div>📍 <strong>Map Center:</strong> {c.map_center ? `${c.map_center[0]}, ${c.map_center[1]}` : 'N/A'}</div>
                                        <div>💵 <strong>Currency:</strong> {c.currency_symbol} ({c.currency_code})</div>
                                        <div>🕒 <strong>Time Zone:</strong> {c.time_zone || 'N/A'}</div>
                                        <div>📞 <strong>Phone Prefix:</strong> {c.phone_prefix || 'N/A'}</div>
                                    </div>
                                    <div style={{ marginTop: '0.4rem', padding: '0.7rem', borderRadius: '8px', background: String(c.code).toLowerCase() === String(tenantCode).toLowerCase() ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.06)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4 }}>
                                        {String(c.code).toLowerCase() === String(tenantCode).toLowerCase() ? 'This is the active country. Use the reference data setup panel above to upload boundaries and manage data sources.' : 'To upload this country reference data, switch into this country and sign in with its admin account.'}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                                        <button 
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setEditingCountry({
                                                    code: c.code,
                                                    name: c.name,
                                                    emblem: c.emblem || '',
                                                    is_active: c.is_active !== false,
                                                    currency_code: c.currency_code || '',
                                                    currency_symbol: c.currency_symbol || '',
                                                    phone_prefix: c.phone_prefix || '',
                                                    time_zone: c.time_zone || '',
                                                    contact_email: c.contact_email || ''
                                                });
                                                setShowEditCountryModal(true);
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            ✏️ Edit Country
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="settings-container">
            <header className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account, system preferences, and organization settings.</p>
            </header>

            <div className="settings-layout">
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        <button 
                            className={`settings-nav-item ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('account'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                        >
                            <span className="icon">👤</span> Account Settings
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'tenant' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('tenant'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                        >
                            <span className="icon">🌍</span> System Config
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'regional' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('regional'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                        >
                            <span className="icon">🗺️</span> Regional Settings
                        </button>
                        {isAdmin && (
                            <button 
                                className={`settings-nav-item ${activeTab === 'deployment' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('deployment'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                            >
                                <span className="icon">🛡️</span> Deployment & Instance
                            </button>
                        )}
                        {isAdmin && (
                            <button 
                                className={`settings-nav-item ${activeTab === 'portability' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('portability'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                            >
                                <span className="icon">📦</span> Portability
                            </button>
                        )}
                        {isAdmin && (
                            <button 
                                className={`settings-nav-item ${activeTab === 'referenceData' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('referenceData'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                            >
                                <span className="icon">CSV</span> Reference Data
                            </button>
                        )}
                        {canManageCountries && (
                            <button 
                                className={`settings-nav-item ${activeTab === 'onboarding' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('onboarding'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                            >
                                <span className="icon">+</span> Country Onboarding
                            </button>
                        )}
                        <button 
                            className={`settings-nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('preferences'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                        >
                            <span className="icon">⚙️</span> Preferences
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('security'); setEditMode(false); setMessage({ text: '', type: '' }); }}
                        >
                            <span className="icon">🔒</span> Security
                        </button>
                    </nav>
                </aside>

                <main className="settings-content">
                    {activeTab === 'account' && renderAccountSettings()}
                    {activeTab === 'tenant' && renderTenantConfig()}
                    {activeTab === 'regional' && renderRegionalSettings()}
                    {activeTab === 'deployment' && renderDeploymentSettings()}
                    {activeTab === 'portability' && renderPortabilitySettings()}
                    {activeTab === 'preferences' && renderPreferences()}
                    {activeTab === 'security' && renderSecurity()}
                    {activeTab === 'referenceData' && renderReferenceDataSetup()}
                    {activeTab === 'onboarding' && canManageCountries && renderCountryOnboarding()}
                </main>
            </div>

            {/* ODK Reconciliation Wizard Modal */}
            {odkStagingModalOpen && selectedOdkSubmission && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-white)', width: '600px', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>🔧 ODK Submission Reconciliation Wizard</h2>
                            <button 
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                onClick={() => { setOdkStagingModalOpen(false); setSelectedOdkSubmission(null); }}
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div>
                            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>STAGED PAYLOAD DETAILS</h4>
                            <div style={{ background: 'var(--bg-light)', padding: '10px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                                <div><strong>Kobo ID:</strong> {selectedOdkSubmission.kobo_id}</div>
                                <div><strong>Received:</strong> {new Date(selectedOdkSubmission.created_at).toLocaleString()}</div>
                                <div><strong>Facility Name:</strong> {selectedOdkSubmission.payload?.facilityName || 'N/A'}</div>
                                <div><strong>Facility Code:</strong> {selectedOdkSubmission.payload?.facilityCode || 'N/A'}</div>
                                <div><strong>Equipment Type:</strong> {selectedOdkSubmission.payload?.equipmentType || 'N/A'}</div>
                                <div><strong>Serial Number:</strong> {selectedOdkSubmission.payload?.serialNumber || 'N/A'}</div>
                                <div style={{ gridColumn: 'span 2' }}><strong>Fault Description:</strong> {selectedOdkSubmission.payload?.description || 'N/A'}</div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>RESOLVE PRODUCTION LINKINGS</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Map to Facility <span style={{ color: '#ef4444' }}>*</span></label>
                                    <select
                                        value={manualOdkFacilityId}
                                        onChange={async (e) => {
                                            const facId = e.target.value;
                                            setManualOdkFacilityId(facId);
                                            setManualOdkEquipmentId('');
                                            if (facId) {
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const eqRes = await fetch(`/api/${tenantCode}/facilities/${facId}/equipment`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                    if (eqRes.ok) {
                                                        setProductionEquipmentList(await eqRes.json());
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            } else {
                                                setProductionEquipmentList([]);
                                            }
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">-- Select Production Facility --</option>
                                        {productionList.map(f => (
                                            <option key={f.facility_id} value={f.facility_id}>
                                                {f.facility_name} ({f.facility_code || 'No Code'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Map to Equipment (Optional)</label>
                                    <select
                                        value={manualOdkEquipmentId}
                                        onChange={(e) => setManualOdkEquipmentId(e.target.value)}
                                        disabled={!manualOdkFacilityId}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">-- Select Production Equipment --</option>
                                        {productionEquipmentList.map(eq => (
                                            <option key={eq.equipment_id} value={eq.equipment_id}>
                                                {eq.item_type || eq.type} - {eq.manufacturer} {eq.model} (S/N: {eq.serial_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => { setOdkStagingModalOpen(false); setSelectedOdkSubmission(null); }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                disabled={!manualOdkFacilityId}
                                onClick={() => {
                                    handleApproveOdkSubmission(selectedOdkSubmission.id, {
                                        facility_id: parseInt(manualOdkFacilityId),
                                        equipment_id: manualOdkEquipmentId ? parseInt(manualOdkEquipmentId) : null
                                    });
                                }}
                            >
                                ✅ Validate & Import Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Country Modal */}
            {showAddCountryModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem 1rem' }}>
                    <div style={{ background: 'var(--bg-white)', width: '680px', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ➕ Onboard New Country
                            </h2>
                            <button 
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                onClick={() => setShowAddCountryModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateCountry} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Country Name *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. South Sudan" 
                                        value={newCountry.name}
                                        onChange={e => setNewCountry({ ...newCountry, name: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Tenant Code * <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>(lowercase, no spaces)</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. south_sudan" 
                                        value={newCountry.code}
                                        onChange={e => setNewCountry({ ...newCountry, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Currency Code</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. SSP" 
                                        value={newCountry.currency_code}
                                        onChange={e => setNewCountry({ ...newCountry, currency_code: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Currency Symbol</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. SS£" 
                                        value={newCountry.currency_symbol}
                                        onChange={e => setNewCountry({ ...newCountry, currency_symbol: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Time Zone</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Africa/Juba" 
                                        value={newCountry.time_zone}
                                        onChange={e => setNewCountry({ ...newCountry, time_zone: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Phone Prefix</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. +211" 
                                        value={newCountry.phone_prefix}
                                        onChange={e => setNewCountry({ ...newCountry, phone_prefix: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Map Center Lat *</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        placeholder="e.g. 4.85" 
                                        value={newCountry.map_center_lat}
                                        onChange={e => setNewCountry({ ...newCountry, map_center_lat: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Map Center Lng *</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        placeholder="e.g. 31.60" 
                                        value={newCountry.map_center_lng}
                                        onChange={e => setNewCountry({ ...newCountry, map_center_lng: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Map Zoom</label>
                                    <input 
                                        type="number" 
                                        placeholder="e.g. 6" 
                                        value={newCountry.map_zoom}
                                        onChange={e => setNewCountry({ ...newCountry, map_zoom: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-light)', padding: '1.2rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>👤 First National Administrator Account</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Admin Email *</label>
                                        <input 
                                            type="email" 
                                            placeholder="e.g. admin@moh.gov.ss" 
                                            value={newCountry.admin_email}
                                            onChange={e => setNewCountry({ ...newCountry, admin_email: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Password *</label>
                                        <input 
                                            type="password" 
                                            placeholder="••••••••" 
                                            value={newCountry.admin_password}
                                            onChange={e => setNewCountry({ ...newCountry, admin_password: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button 
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddCountryModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSaving}
                                >
                                    {isSaving ? '🚀 Onboarding Country...' : '🚀 Onboard Country'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Country Modal */}
            {showEditCountryModal && editingCountry && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem 1rem' }}>
                    <div style={{ background: 'var(--bg-white)', width: '640px', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ✏️ Edit Country: {editingCountry.name}
                            </h2>
                            <button 
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                onClick={() => { setShowEditCountryModal(false); setEditingCountry(null); }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCountry} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Tenant Code (Schema)</label>
                                    <input 
                                        type="text" 
                                        value={editingCountry.code?.toUpperCase()} 
                                        disabled
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-light)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Country Name *</label>
                                    <input 
                                        type="text" 
                                        value={editingCountry.name} 
                                        onChange={e => setEditingCountry({ ...editingCountry, name: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Active Status</label>
                                    <select
                                        value={editingCountry.is_active ? 'true' : 'false'}
                                        onChange={e => setEditingCountry({ ...editingCountry, is_active: e.target.value === 'true' })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="true">Active (Online & Accessible)</option>
                                        <option value="false">Inactive (Suspended / Disabled)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Emblem / Flag URL</label>
                                    <input 
                                        type="text" 
                                        placeholder="/zambia_emblem.png" 
                                        value={editingCountry.emblem || ''} 
                                        onChange={e => setEditingCountry({ ...editingCountry, emblem: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Currency Code</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. ZMW, USD, PGK" 
                                        value={editingCountry.currency_code || ''} 
                                        onChange={e => setEditingCountry({ ...editingCountry, currency_code: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Currency Symbol</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. K, $, €" 
                                        value={editingCountry.currency_symbol || ''} 
                                        onChange={e => setEditingCountry({ ...editingCountry, currency_symbol: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Phone Prefix</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. +260, +675" 
                                        value={editingCountry.phone_prefix || ''} 
                                        onChange={e => setEditingCountry({ ...editingCountry, phone_prefix: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Time Zone</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Africa/Lusaka, Pacific/Port_Moresby" 
                                        value={editingCountry.time_zone || ''} 
                                        onChange={e => setEditingCountry({ ...editingCountry, time_zone: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Contact / Support Email</label>
                                <input 
                                    type="email" 
                                    placeholder="support@ccets.gov" 
                                    value={editingCountry.contact_email || ''} 
                                    onChange={e => setEditingCountry({ ...editingCountry, contact_email: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button 
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowEditCountryModal(false); setEditingCountry(null); }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isUpdatingCountry}
                                >
                                    {isUpdatingCountry ? 'Saving Changes...' : '💾 Save Country Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;