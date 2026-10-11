import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import './UsersTab.css';
import EnterpriseDataTable from '../Common/EnterpriseDataTable';
import ImportDataModal from '../Common/ImportDataModal';

const UsersTab = () => {
    const { tenantCode } = useTenant();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissionsMatrix, setPermissionsMatrix] = useState({ permissions: [], matrix: {} });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Pagination & Sorting State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortBy, setSortBy] = useState('first_name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create, edit, view
    const [selectedUser, setSelectedUser] = useState(null);

    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);


    const [error, setError] = useState('');

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        fetchUsersTableData();
    }, [page, pageSize, sortBy, sortDirection, searchQuery, filterRole]);

    const fetchUsersTableData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortDirection,
                search: searchQuery,
                role: filterRole
            });
            const response = await fetch(`/api/${tenantCode}/users?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || []);
            setTotalRecords(data.pagination?.totalRecords || (data.users || []).length);
            setTotalPages(data.pagination?.totalPages || 1);
            setError('');
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = () => {
        // Callback for modal success triggers
        fetchUsersTableData();
    };

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/permissions/matrix`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setRoles(data.roles || []);
            setPermissionsMatrix({ permissions: data.permissions || [], matrix: data.matrix || {} });
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/${tenantCode}/users/${userId}/status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchUsersTableData();
        } catch (err) {
            setError('Failed to update user status');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/users/${userToDelete.user_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete user');

            fetchUsersTableData();
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (err) {
            setError('Failed to delete user');
        }
    };

    const openModal = (mode, user = null) => {
        setModalMode(mode);
        setSelectedUser(user);
        setShowUserModal(true);
    };

    const getInitials = (user) => {
        const first = user.first_name?.[0] || '';
        const last = user.last_name?.[0] || '';
        return (first + last).toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterRole('');
        setPage(1);
    };

    // Columns Definition
    const columns = [
        { 
            id: 'full_name', 
            label: 'User', 
            sortable: true, 
            defaultVisible: true, 
            hideable: false,
            formatter: (val, item) => (
                <div className="user-cell">
                    <div className="user-avatar">{getInitials(item)}</div>
                    <div className="user-info">
                        <div className="user-name">
                            {item.first_name && item.last_name
                                ? `${item.first_name} ${item.last_name}`
                                : item.username}
                        </div>
                        <div className="user-username">@{item.username}</div>
                    </div>
                </div>
            )
        },
        { id: 'email', label: 'Email', sortable: true, defaultVisible: true },
        { 
            id: 'role', 
            label: 'Role', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => (
                <span className="role-badge">
                    {val || 'No Role'}
                </span>
            )
        },
        { 
            id: 'is_active', 
            label: 'Status', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val, item) => (
                <label className="status-toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={val}
                        onChange={() => toggleUserStatus(item.user_id, val)}
                    />
                    <span className={`status-slider ${val ? 'active' : ''}`}>
                        {val ? 'Active' : 'Inactive'}
                    </span>
                </label>
            )
        },
        { 
            id: 'created_at', 
            label: 'Date Created', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => val ? new Date(val).toLocaleDateString() : '-'
        },
        { 
            id: 'last_login', 
            label: 'Last Login', 
            sortable: true, 
            defaultVisible: true,
            formatter: (val) => val ? new Date(val).toLocaleDateString() : 'Never'
        }
    ];

    // Row Actions
    const rowActions = [
        {
            label: 'View Details',
            icon: '👁️',
            action: (user) => openModal('view', user)
        },
        {
            label: 'Edit User',
            icon: '✏️',
            action: (user) => openModal('edit', user)
        },
        {
            label: 'Reset Password',
            icon: '🔑',
            action: (user) => {
                setSelectedUser(user);
                setShowResetPasswordModal(true);
            }
        },
        {
            label: 'Delete User',
            icon: '🗑️',
            action: (user) => {
                setUserToDelete(user);
                setShowDeleteModal(true);
            },
            destructive: true
        }
    ];

    return (
        <div className="users-tab">
            <div className="users-header" style={{ marginBottom: '16px' }}>
                <div className="users-title">
                    <h2>Users Management</h2>
                    <p>Manage user accounts and permissions</p>
                </div>
                <button className="btn-create" onClick={() => openModal('create')} style={{ height: '38px', alignSelf: 'center' }}>
                    + Create User
                </button>
            </div>

            {error && <div className="error-banner" style={{ marginBottom: '16px' }}>{error}</div>}

            {/* Smart Cascade Filters */}
            <div className="filters-section" style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Role</label>
                    <select
                        value={filterRole}
                        onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                        className="filter-select"
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '140px', height: '38px' }}
                    >
                        <option value="">All Roles</option>
                        {roles.map(role => (
                            <option key={role.role_id} value={role.role_name}>
                                {role.role_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Enterprise DataTable */}
            <EnterpriseDataTable
                tableName="users"
                tableTitle="User Accounts & Permissions Registry"
                columns={columns}
                data={users}
                loading={loading}
                error={error}
                serverSide={true}
                pagination={{
                    page,
                    pageSize,
                    totalRecords,
                    totalPages,
                    onPageChange: (newPage) => setPage(newPage),
                    onPageSizeChange: (newPageSize) => { setPageSize(newPageSize); setPage(1); }
                }}
                sort={{
                    sortBy,
                    sortDirection,
                    onSort: (colId, direction) => { setSortBy(colId); setSortDirection(direction); }
                }}
                searchValue={searchQuery}
                onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
                filters={{
                    values: {
                        role: filterRole
                    },
                    onChange: (key, val) => {
                        if (key === 'role') setFilterRole(val);
                        setPage(1);
                    },
                    onClear: handleClearFilters
                }}
                rowActions={rowActions}
                rowActionKey="user_id"
                emptyTitle="No users found"
                emptyMessage="No user accounts match your selected filter criteria."
                onAdd={() => openModal('create')}
                addLabel="+ Create User"
                onImport={() => setShowImportModal(true)}
                importLabel="📤 Import Users"
            />

            {/* UNIFIED USER MODAL */}
            {showUserModal && (
                <UserModal
                    mode={modalMode}
                    user={selectedUser}
                    roles={roles}
                    permissionsMatrix={permissionsMatrix}
                    onClose={() => setShowUserModal(false)}
                    onSuccess={fetchUsers}
                />
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Delete User</h3>
                            <button onClick={() => setShowDeleteModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{userToDelete?.username}</strong>?</p>
                            <p className="warning-text">This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn-primary" style={{ background: '#dc2626' }} onClick={handleDeleteUser}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {showResetPasswordModal && (
                <ResetPasswordModal
                    user={selectedUser}
                    tenantCode={tenantCode}
                    onClose={() => {
                        setShowResetPasswordModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={fetchUsers}
                />
            )}

            {/* Bulk Import Modal */}
            <ImportDataModal
                isOpen={showImportModal}
                entityType="users"
                entityTitle="Users"
                tenantCode={tenantCode}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchUsersTableData}
            />
        </div>
    );
};

// Unified User Modal (Create / Edit / View)
const UserModal = ({ mode, user, roles, permissionsMatrix, onClose, onSuccess }) => {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';
    const { tenantCode } = useTenant();

    // Title mapping
    const titles = {
        create: 'Create New User',
        edit: 'Edit User',
        view: 'User Details'
    };

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '', // Only for create
        first_name: '',
        last_name: '',
        phone_number: '',
        role_id: '',
        is_national_access: false,
        scopes: []
    });

    const [locations, setLocations] = useState({
        regions: [],
        provinces: []
    });

    // Cascading & Location Assignment States
    const [locationLevel, setLocationLevel] = useState('national');
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedFacilityId, setSelectedFacilityId] = useState('');
    const [selectedBlockProvinceIds, setSelectedBlockProvinceIds] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [facilitySearch, setFacilitySearch] = useState('');
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingFacilities, setLoadingFacilities] = useState(false);

    // History State
    const [userHistory, setUserHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [error, setError] = useState('');

    // Fetch regions & provinces once
    useEffect(() => {
        fetchLocations();
    }, []);

    // If Edit/View, fetch full user details
    useEffect(() => {
        if ((isEdit || isView) && user) {
            fetchUserDetails(user.user_id);
            if (isView) fetchUserHistory(user.user_id);
        }
    }, [mode, user]);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resRegions, resProvinces] = await Promise.all([
                fetch(`/api/${tenantCode}/facilities/regions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/${tenantCode}/facilities/provinces`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const regions = await resRegions.json();
            const provinces = await resProvinces.json();

            setLocations({
                regions: Array.isArray(regions) ? regions : [],
                provinces: Array.isArray(provinces) ? provinces : []
            });
        } catch (err) {
            console.error('Failed to fetch locations', err);
        }
    };

    const fetchDistrictsForProvince = async (provId) => {
        if (!provId) {
            setDistricts([]);
            setSelectedDistrictId('');
            setFacilities([]);
            setSelectedFacilityId('');
            return;
        }
        setLoadingDistricts(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/facilities/districts/${provId}`, {
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

    const fetchFacilitiesForDistrict = async (distId) => {
        if (!distId) {
            setFacilities([]);
            setSelectedFacilityId('');
            return;
        }
        setLoadingFacilities(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/facilities/district/${distId}`, {
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            if (res.ok) {
                const data = await res.json();
                setFacilities(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load facilities:', err);
        } finally {
            setLoadingFacilities(false);
        }
    };

    const fetchUserDetails = async (id) => {
        setFetchingDetails(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/users/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load user details');

            const data = await res.json();

            // Map backend data to form state
            setFormData({
                username: data.username,
                email: data.email || '',
                password: '',
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone_number: data.phone_number || '',
                role_id: data.role_id || '',
                is_national_access: data.is_national_access,
                scopes: data.scopes || []
            });

            // Determine location level and pre-populate selectors
            if (data.is_national_access) {
                setLocationLevel('national');
            } else if (data.assigned_facility_id) {
                setLocationLevel('facility');
                const provId = data.assigned_province_id ? String(data.assigned_province_id) : '';
                const distId = data.assigned_district_id ? String(data.assigned_district_id) : '';
                setSelectedProvinceId(provId);
                setSelectedDistrictId(distId);
                setSelectedFacilityId(String(data.assigned_facility_id));
                if (provId) fetchDistrictsForProvince(provId);
                if (distId) fetchFacilitiesForDistrict(distId);
            } else if (data.assigned_district_id) {
                setLocationLevel('district');
                const provId = data.assigned_province_id ? String(data.assigned_province_id) : '';
                setSelectedProvinceId(provId);
                setSelectedDistrictId(String(data.assigned_district_id));
                if (provId) fetchDistrictsForProvince(provId);
            } else if (data.accessible_provinces && data.accessible_provinces.length > 1) {
                setLocationLevel('region');
                setSelectedBlockProvinceIds(data.accessible_provinces.map(Number));
            } else if (data.assigned_province_id || (data.accessible_provinces && data.accessible_provinces.length === 1)) {
                setLocationLevel('province');
                const pId = data.assigned_province_id || data.accessible_provinces[0];
                setSelectedProvinceId(String(pId));
            } else if (data.assigned_region_id) {
                setLocationLevel('region');
                setSelectedRegionId(String(data.assigned_region_id));
            } else if (data.scopes && data.scopes.length > 0) {
                const firstScope = data.scopes[0];
                setLocationLevel(firstScope.level || 'national');
                if (firstScope.level === 'province') setSelectedProvinceId(String(firstScope.id));
                if (firstScope.level === 'district') setSelectedDistrictId(String(firstScope.id));
                if (firstScope.level === 'facility') setSelectedFacilityId(String(firstScope.id));
            } else {
                setLocationLevel('national');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setFetchingDetails(false);
        }
    };

    const fetchUserHistory = async (id) => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/${tenantCode}/audit?user_id=${id}&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUserHistory(data.logs || []);
        } catch (err) {
            console.error('Failed to load history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Auto-suggest Access Level when Role is selected
    const handleRoleChange = (roleId) => {
        setFormData(prev => ({ ...prev, role_id: roleId }));
        const roleObj = roles.find(r => String(r.role_id) === String(roleId));
        if (roleObj) {
            const rName = (roleObj.role_name || '').toLowerCase();
            if (rName.includes('national') || rName.includes('admin')) {
                setLocationLevel('national');
            } else if (rName.includes('region')) {
                setLocationLevel('region');
            } else if (rName.includes('provinc')) {
                setLocationLevel('province');
            } else if (rName.includes('district')) {
                setLocationLevel('district');
            } else if (rName.includes('facility') || rName.includes('technician') || rName.includes('post') || rName.includes('clinic')) {
                setLocationLevel('facility');
            }
        }
    };

    const handleLocationLevelChange = (newLevel) => {
        setLocationLevel(newLevel);
        if (newLevel === 'national') {
            // no location needed
        } else if (newLevel === 'province') {
            setSelectedDistrictId('');
            setSelectedFacilityId('');
        } else if (newLevel === 'district') {
            setSelectedFacilityId('');
        }
    };

    const handleProvinceChange = (e) => {
        const provId = e.target.value;
        setSelectedProvinceId(provId);
        setSelectedDistrictId('');
        setSelectedFacilityId('');
        setFacilities([]);
        fetchDistrictsForProvince(provId);
    };

    const handleDistrictChange = (e) => {
        const distId = e.target.value;
        setSelectedDistrictId(distId);
        setSelectedFacilityId('');
        if (locationLevel === 'facility') {
            fetchFacilitiesForDistrict(distId);
        }
    };

    const handleToggleBlockProvince = (provId) => {
        if (isView) return;
        const pNum = Number(provId);
        setSelectedBlockProvinceIds(prev =>
            prev.includes(pNum) ? prev.filter(id => id !== pNum) : [...prev, pNum]
        );
    };

    const handleSelectAllProvinces = () => {
        if (isView) return;
        setSelectedBlockProvinceIds(locations.provinces.map(p => p.province_id));
    };

    const handleClearAllProvinces = () => {
        if (isView) return;
        setSelectedBlockProvinceIds([]);
    };

    const filteredFacilities = useMemo(() => {
        if (!facilitySearch.trim()) return facilities;
        const q = facilitySearch.toLowerCase().trim();
        return facilities.filter(f =>
            (f.facility_name || '').toLowerCase().includes(q) ||
            (f.facility_code || '').toLowerCase().includes(q)
        );
    }, [facilities, facilitySearch]);

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const isNational = locationLevel === 'national';

            let assignedRegion = null;
            let assignedProvince = null;
            let assignedDistrict = null;
            let assignedFacility = null;
            let accRegions = null;
            let accProvinces = null;
            let accDistricts = null;
            let accFacilities = null;
            let scopes = [];

            if (!isNational) {
                if (locationLevel === 'region') {
                    assignedRegion = selectedRegionId ? parseInt(selectedRegionId, 10) : null;
                    accProvinces = selectedBlockProvinceIds.length > 0 ? selectedBlockProvinceIds.map(Number) : null;
                    if (accProvinces) {
                        scopes = accProvinces.map(id => ({ level: 'province', id }));
                    } else if (assignedRegion) {
                        scopes = [{ level: 'region', id: assignedRegion }];
                    }
                } else if (locationLevel === 'province') {
                    assignedProvince = parseInt(selectedProvinceId, 10);
                    accProvinces = [assignedProvince];
                    scopes = [{ level: 'province', id: assignedProvince }];
                } else if (locationLevel === 'district') {
                    assignedProvince = parseInt(selectedProvinceId, 10);
                    assignedDistrict = parseInt(selectedDistrictId, 10);
                    accProvinces = [assignedProvince];
                    accDistricts = [assignedDistrict];
                    scopes = [{ level: 'district', id: assignedDistrict }];
                } else if (locationLevel === 'facility') {
                    assignedProvince = parseInt(selectedProvinceId, 10);
                    assignedDistrict = parseInt(selectedDistrictId, 10);
                    assignedFacility = parseInt(selectedFacilityId, 10);
                    accProvinces = [assignedProvince];
                    accDistricts = [assignedDistrict];
                    accFacilities = [assignedFacility];
                    scopes = [{ level: 'facility', id: assignedFacility }];
                }
            }

            const payload = {
                ...formData,
                is_national_access: isNational,
                location_level: locationLevel,
                assigned_region_id: assignedRegion,
                assigned_province_id: assignedProvince,
                assigned_district_id: assignedDistrict,
                assigned_facility_id: assignedFacility,
                accessible_regions: accRegions,
                accessible_provinces: accProvinces,
                accessible_districts: accDistricts,
                accessible_facilities: accFacilities,
                scopes
            };

            const url = isCreate ? `/api/${tenantCode}/users` : `/api/${tenantCode}/users/${user.user_id}`;
            const method = isCreate ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to save user');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Validations
    const isStep1Valid = () => {
        if (isView) return true;
        const basic = formData.username && formData.email && formData.first_name &&
            formData.last_name && formData.phone_number;
        return isCreate ? (basic && formData.password) : basic;
    };

    const isStep2Valid = () => {
        if (isView) return true;
        if (!formData.role_id) return false;
        if (locationLevel === 'national') return true;
        if (locationLevel === 'region') {
            return selectedBlockProvinceIds.length > 0 || Boolean(selectedRegionId);
        }
        if (locationLevel === 'province') {
            return Boolean(selectedProvinceId);
        }
        if (locationLevel === 'district') {
            return Boolean(selectedProvinceId && selectedDistrictId);
        }
        if (locationLevel === 'facility') {
            return Boolean(selectedProvinceId && selectedDistrictId && selectedFacilityId);
        }
        return false;
    };

    const renderHistory = () => {
        if (loadingHistory) return <div className="spinner"></div>;
        if (userHistory.length === 0) return <p className="no-data">No history found for this user.</p>;

        return (
            <div className="history-list">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Entity</th>
                            <th>Details</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userHistory.map(log => (
                            <tr key={log.id}>
                                <td>{log.action}</td>
                                <td>{log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}</td>
                                <td>{log.details}</td>
                                <td>{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderStep1 = () => (
        <div className="form-grid">
            <div className="form-group">
                <label>Username {isCreate && '*'}</label>
                <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={isView || isEdit}
                    style={(isView || isEdit) ? { background: '#f1f5f9' } : {}}
                />
            </div>
            <div className="form-group">
                <label>Email {isCreate && '*'}</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isView}
                />
            </div>
            {isCreate && (
                <div className="form-group">
                    <label>Default Password *</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                </div>
            )}
            <div className="form-group">
                <label>First Name {isCreate && '*'}</label>
                <input
                    type="text"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    disabled={isView}
                />
            </div>
            <div className="form-group">
                <label>Last Name {isCreate && '*'}</label>
                <input
                    type="text"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    disabled={isView}
                />
            </div>
            <div className="form-group">
                <label>Phone {isCreate && '*'}</label>
                <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                    disabled={isView}
                />
            </div>
        </div>
    );

    const renderStep2 = () => {
        const selectedRolePerms = formData.role_id && permissionsMatrix?.matrix[formData.role_id]
            ? permissionsMatrix.matrix[formData.role_id]
            : [];

        const permissionNames = selectedRolePerms.map(pid =>
            permissionsMatrix?.permissions.find(p => p.permission_id === pid)?.permission_name
        ).filter(Boolean);

        return (
            <div className="step-content">
                <div className="form-group">
                    <label>Role {isCreate && '*'}</label>
                    <select
                        value={formData.role_id}
                        onChange={e => handleRoleChange(e.target.value)}
                        required
                        className="full-width-select"
                        disabled={isView}
                    >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                            <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                        ))}
                    </select>
                    {formData.role_id && (
                        <div className="role-preview">
                            <div><small><strong>Description:</strong> {roles.find(r => r.role_id == formData.role_id)?.description || 'No description'}</small></div>
                            <div style={{ marginTop: '4px' }}>
                                <small><strong>Permissions ({selectedRolePerms.length}):</strong> {permissionNames.slice(0, 10).join(', ')}{permissionNames.length > 10 ? '...' : ''}</small>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>Access Level <span className="req">*</span></label>
                    <select
                        value={locationLevel}
                        onChange={e => handleLocationLevelChange(e.target.value)}
                        className="full-width-select"
                        disabled={isView}
                    >
                        <option value="national">National (Oversees all provinces)</option>
                        <option value="region">Regional (Oversees a block of provinces)</option>
                        <option value="province">Provincial (Oversees a province)</option>
                        <option value="district">District (Oversees a district in a province)</option>
                        <option value="facility">Facility (Oversees a health facility)</option>
                    </select>
                </div>

                {/* DYNAMIC LOCATION ASSIGNMENT */}
                <div className="location-assignment-panel">
                    {locationLevel === 'national' && (
                        <div className="location-info-banner national-banner">
                            <span className="banner-icon">🌐</span>
                            <div>
                                <strong>National Oversight Scope</strong>
                                <p>This user oversees all provinces, districts, and health facilities across the nation with full country-wide visibility.</p>
                            </div>
                        </div>
                    )}

                    {locationLevel === 'region' && (
                        <div className="location-selector">
                            <div className="location-level-header">
                                <div>
                                    <h4>
                                        Assigned Block of Provinces
                                        {!isView && selectedBlockProvinceIds.length === 0 && <span className="req"> *</span>}
                                    </h4>
                                    <p className="location-level-sub">
                                        Select the block of provinces this Regional user oversees:
                                    </p>
                                </div>
                                {!isView && (
                                    <div className="block-selection-actions">
                                        <span className="block-counter-badge">
                                            {selectedBlockProvinceIds.length} of {locations.provinces.length} selected
                                        </span>
                                        <button type="button" className="btn-link-action" onClick={handleSelectAllProvinces}>Select All</button>
                                        <span className="sep">|</span>
                                        <button type="button" className="btn-link-action" onClick={handleClearAllProvinces}>Clear</button>
                                    </div>
                                )}
                            </div>

                            <div className="checkbox-grid">
                                {locations.provinces.map(prov => (
                                    <label key={prov.province_id} className={`checkbox-item ${selectedBlockProvinceIds.includes(prov.province_id) ? 'selected' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedBlockProvinceIds.includes(prov.province_id)}
                                            onChange={() => handleToggleBlockProvince(prov.province_id)}
                                            disabled={isView}
                                        />
                                        <span>{prov.province_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {locationLevel === 'province' && (
                        <div className="location-selector">
                            <h4>
                                Assigned Province
                                {!isView && !selectedProvinceId && <span className="req"> *</span>}
                            </h4>
                            <p className="location-level-sub">Select the single province this user oversees:</p>
                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <select
                                    value={selectedProvinceId}
                                    onChange={e => setSelectedProvinceId(e.target.value)}
                                    className="full-width-select"
                                    disabled={isView}
                                    required
                                >
                                    <option value="">-- Select Province --</option>
                                    {locations.provinces.map(prov => (
                                        <option key={prov.province_id} value={prov.province_id}>
                                            {prov.province_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {locationLevel === 'district' && (
                        <div className="location-selector">
                            <h4>
                                Assigned District in Province
                                {!isView && (!selectedProvinceId || !selectedDistrictId) && <span className="req"> *</span>}
                            </h4>
                            <p className="location-level-sub">Select the province and district this user oversees:</p>
                            
                            <div className="cascade-grid-2" style={{ marginTop: '10px' }}>
                                <div className="form-group">
                                    <label>Province <span className="req">*</span></label>
                                    <select
                                        value={selectedProvinceId}
                                        onChange={handleProvinceChange}
                                        className="full-width-select"
                                        disabled={isView}
                                        required
                                    >
                                        <option value="">-- Select Province --</option>
                                        {locations.provinces.map(p => (
                                            <option key={p.province_id} value={p.province_id}>{p.province_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Assigned District <span className="req">*</span></label>
                                    <select
                                        value={selectedDistrictId}
                                        onChange={handleDistrictChange}
                                        className="full-width-select"
                                        disabled={isView || !selectedProvinceId || loadingDistricts}
                                        required
                                    >
                                        <option value="">
                                            {loadingDistricts ? 'Loading districts...' : (selectedProvinceId ? '-- Select District --' : '-- Choose Province First --')}
                                        </option>
                                        {districts.map(d => (
                                            <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {locationLevel === 'facility' && (
                        <div className="location-selector">
                            <h4>
                                Assigned Health Facility
                                {!isView && (!selectedProvinceId || !selectedDistrictId || !selectedFacilityId) && <span className="req"> *</span>}
                            </h4>
                            <p className="location-level-sub">Select the province, district, and health facility this user oversees:</p>

                            <div className="cascade-grid-2" style={{ marginTop: '10px' }}>
                                <div className="form-group">
                                    <label>Province <span className="req">*</span></label>
                                    <select
                                        value={selectedProvinceId}
                                        onChange={handleProvinceChange}
                                        className="full-width-select"
                                        disabled={isView}
                                        required
                                    >
                                        <option value="">-- Select Province --</option>
                                        {locations.provinces.map(p => (
                                            <option key={p.province_id} value={p.province_id}>{p.province_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>District <span className="req">*</span></label>
                                    <select
                                        value={selectedDistrictId}
                                        onChange={handleDistrictChange}
                                        className="full-width-select"
                                        disabled={isView || !selectedProvinceId || loadingDistricts}
                                        required
                                    >
                                        <option value="">
                                            {loadingDistricts ? 'Loading districts...' : (selectedProvinceId ? '-- Select District --' : '-- Choose Province First --')}
                                        </option>
                                        {districts.map(d => (
                                            <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Health Facility <span className="req">*</span></label>
                                    {selectedDistrictId && (
                                        <span className="block-counter-badge">
                                            {filteredFacilities.length} facilities in district
                                        </span>
                                    )}
                                </div>

                                {selectedDistrictId && facilities.length > 5 && !isView && (
                                    <input
                                        type="text"
                                        className="facility-quick-search"
                                        placeholder="🔍 Type facility name or code to filter..."
                                        value={facilitySearch}
                                        onChange={e => setFacilitySearch(e.target.value)}
                                        style={{ marginBottom: '8px' }}
                                    />
                                )}

                                <select
                                    value={selectedFacilityId}
                                    onChange={e => setSelectedFacilityId(e.target.value)}
                                    className="full-width-select"
                                    disabled={isView || !selectedDistrictId || loadingFacilities}
                                    required
                                >
                                    <option value="">
                                        {loadingFacilities ? 'Loading facilities...' : (selectedDistrictId ? `-- Select Health Facility (${filteredFacilities.length}) --` : '-- Choose District First --')}
                                    </option>
                                    {filteredFacilities.map(f => (
                                        <option key={f.facility_id} value={f.facility_id}>
                                            {f.facility_name} {f.facility_code ? `(${f.facility_code})` : ''}
                                        </option>
                                    ))}
                                </select>

                                {selectedFacilityId && (
                                    <div className="facility-selected-chip">
                                        <span>✓</span>
                                        <span>
                                            Assigned: <strong>{facilities.find(f => String(f.facility_id) === String(selectedFacilityId))?.facility_name || 'Selected Facility'}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (fetchingDetails) {
        return (
            <div className="modal-overlay">
                <div className="modal-content users-loading">
                    <div className="spinner"></div>
                    <p>Loading details...</p>
                </div>
            </div>
        );
    }

    const canNavigateToStep2 = () => {
        if (isView || isEdit) return true;
        return isStep1Valid();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{titles[mode]}</h3>
                    <button onClick={onClose}>&times;</button>
                </div>

                <div className="modal-tabs">
                    <button className={`tab-btn ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
                        1. User Details
                    </button>
                    <button
                        className={`tab-btn ${step === 2 ? 'active' : ''}`}
                        onClick={() => canNavigateToStep2() && setStep(2)}
                        disabled={!canNavigateToStep2()}
                    >
                        2. Role & Location
                    </button>
                    {isView && (
                        <button
                            className={`tab-btn ${step === 3 ? 'active' : ''}`}
                            onClick={() => setStep(3)}
                        >
                            3. History
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderHistory()}
                </div>

                <div className="modal-footer">
                    {isView ? (
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={onClose}>Cancel</button>

                            {step === 1 && (
                                <button
                                    className="btn-primary"
                                    onClick={() => canNavigateToStep2() && setStep(2)}
                                    disabled={!canNavigateToStep2()}
                                >
                                    Next &rarr;
                                </button>
                            )}

                            {step === 2 && (
                                <>
                                    <button className="btn-secondary" onClick={() => setStep(1)}>&larr; Back</button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleSubmit}
                                        disabled={loading || !isStep2Valid()}
                                    >
                                        {loading ? 'Saving...' : (isCreate ? 'Create User' : 'Save Changes')}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Reset Password Modal Component
const ResetPasswordModal = ({ user, tenantCode, onClose, onSuccess }) => {
    // ... Same as before
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tempPassword, setTempPassword] = useState('');

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleReset = async () => {
        setLoading(true);
        setError('');

        const newPassword = generatePassword();
        setTempPassword(newPassword);

        try {
            const token = localStorage.getItem('token');
            const targetUrl = tenantCode 
                ? `/api/${tenantCode}/users/${user.user_id}/reset-password`
                : `/api/users/${user.user_id}/reset-password`;

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_password: newPassword })
            });


            if (!response.ok) throw new Error('Failed to reset password');

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Reset Password</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {!success ? (
                        <>
                            <p>Reset password for <strong>{user.username}</strong>?</p>
                            <p className="warning-text">This will generate a temporary password that must be changed on next login.</p>
                            {error && <div className="error-message">{error}</div>}
                        </>
                    ) : (
                        <div className="success-message">
                            <div className="success-icon">✓</div>
                            <p>Password reset successfully!</p>
                            <div className="temp-password">
                                <label>Temporary Password:</label>
                                <code>{tempPassword}</code>
                                <button onClick={() => navigator.clipboard.writeText(tempPassword)}>
                                    📋 Copy
                                </button>
                            </div>
                            <p className="info-text">Please share this password securely with the user.</p>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {!success && (
                        <>
                            <button className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleReset}
                                disabled={loading}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UsersTab;
