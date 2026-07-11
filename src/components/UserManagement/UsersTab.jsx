import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import './UsersTab.css';

const UsersTab = () => {
    const { tenantCode } = useTenant();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissionsMatrix, setPermissionsMatrix] = useState({ permissions: [], matrix: {} });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create, edit, view
    const [selectedUser, setSelectedUser] = useState(null);

    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    // Reset pagination when search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterRole]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
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
            fetchUsers();
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

            fetchUsers();
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

    // Sorting Logic
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = !filterRole || user.role?.toLowerCase() === filterRole.toLowerCase();

        return matchesSearch && matchesRole;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';

        // Handle nested or computed properties if necessary (simplistic for now)
        if (sortConfig.key === 'full_name') {
            aVal = ((a.first_name || '') + ' ' + (a.last_name || '')).trim().toLowerCase();
            bVal = ((b.first_name || '') + ' ' + (b.last_name || '')).trim().toLowerCase();
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination Logic
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const paginatedUsers = sortedUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
        return <span style={{ marginLeft: 4 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (loading) {
        return (
            <div className="users-loading">
                <div className="spinner"></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="users-tab">
            <div className="users-header">
                <div className="users-title">
                    <h2>Users ({sortedUsers.length})</h2>
                    <p>Manage user accounts and permissions</p>
                </div>
                <button className="btn-create" onClick={() => openModal('create')}>
                    + Create User
                </button>
            </div>

            <div className="users-filters">
                <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM16.5 16.5l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search users by name, email, or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="role-filter"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                >
                    <option value="">All Roles</option>
                    {roles.map(role => (
                        <option key={role.role_id} value={role.role_name}>
                            {role.role_name}
                        </option>
                    ))}
                </select>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th className="sortable-header" onClick={() => handleSort('full_name')}>
                                User <SortIcon column="full_name" />
                            </th>
                            <th className="sortable-header" onClick={() => handleSort('email')}>
                                Email <SortIcon column="email" />
                            </th>
                            <th className="sortable-header" onClick={() => handleSort('role')}>
                                Role <SortIcon column="role" />
                            </th>
                            <th className="sortable-header" onClick={() => handleSort('is_active')}>
                                Status <SortIcon column="is_active" />
                            </th>
                            <th className="sortable-header" onClick={() => handleSort('created_at')}>
                                Date Created <SortIcon column="created_at" />
                            </th>
                            <th className="sortable-header" onClick={() => handleSort('last_login')}>
                                Last Login <SortIcon column="last_login" />
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user.user_id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">{getInitials(user)}</div>
                                            <div className="user-info">
                                                <div className="user-name">
                                                    {user.first_name && user.last_name
                                                        ? `${user.first_name} ${user.last_name}`
                                                        : user.username}
                                                </div>
                                                <div className="user-username">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.email || '-'}</td>
                                    <td>
                                        <span className="role-badge">
                                            {user.role || 'No Role'}
                                        </span>
                                    </td>
                                    <td>
                                        <label className="status-toggle">
                                            <input
                                                type="checkbox"
                                                checked={user.is_active}
                                                onChange={() => toggleUserStatus(user.user_id, user.is_active)}
                                            />
                                            <span className={`status-slider ${user.is_active ? 'active' : ''}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </label>
                                    </td>
                                    <td>
                                        {user.created_at
                                            ? new Date(user.created_at).toLocaleDateString()
                                            : '-'}
                                    </td>
                                    <td>
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title="View Details"
                                                onClick={() => openModal('view', user)}
                                            >
                                                👁️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Edit User"
                                                onClick={() => openModal('edit', user)}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Reset Password"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowResetPasswordModal(true);
                                                }}
                                            >
                                                🔑
                                            </button>
                                            <button
                                                className="btn-icon trash"
                                                title="Delete User"
                                                onClick={() => {
                                                    setUserToDelete(user);
                                                    setShowDeleteModal(true);
                                                }}
                                                style={{ color: '#dc2626' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="table-footer">
                        <div className="pagination-info">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedUsers.length)} of {sortedUsers.length} users
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                    style={currentPage === page ? { background: '#3b82f6', color: 'white', borderColor: '#3b82f6' } : {}}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

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

            {showResetPasswordModal && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => {
                        setShowResetPasswordModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={fetchUsers}
                />
            )}
        </div>
    );
};

// Unified User Modal (Create / Edit / View)
const UserModal = ({ mode, user, roles, permissionsMatrix, onClose, onSuccess }) => {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';

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

    // History State
    const [userHistory, setUserHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [locationLevel, setLocationLevel] = useState('national');
    const [error, setError] = useState('');

    // Fetch locations once
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
                password: '', // Should be empty/ignored
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone_number: data.phone_number || '',
                role_id: data.role_id || '',
                is_national_access: data.is_national_access,
                scopes: data.scopes || []
            });

            // Determine location level from data
            if (data.is_national_access) {
                setLocationLevel('national');
            } else if (data.scopes && data.scopes.length > 0) {
                // Determine level from first scope (assuming strict one-level policy)
                setLocationLevel(data.scopes[0].level);
            } else {
                setLocationLevel('national'); // Default fallback
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

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                is_national_access: locationLevel === 'national',
                scopes: locationLevel === 'national' ? [] : formData.scopes
            };

            // API URL and Method differ for Create vs Update
            const url = isCreate ? `/api/${tenantCode}/users` : `/api/${tenantCode}/users/${user.user_id}`;
            const method = isCreate ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
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

    const handleScopeChange = (level, id, checked) => {
        if (isView) return;
        setFormData(prev => {
            let newScopes = [...prev.scopes];
            if (checked) {
                newScopes.push({ level, id });
            } else {
                newScopes = newScopes.filter(s => !(s.level === level && s.id === id));
            }
            return { ...prev, scopes: newScopes };
        });
    };

    // Validations
    const isStep1Valid = () => {
        if (isView) return true;
        const basic = formData.username && formData.email && formData.first_name &&
            formData.last_name && formData.phone_number;
        return isCreate ? (basic && formData.password) : basic; // Password only required on create
    };

    const isStep2Valid = () => {
        if (isView) return true;
        if (!formData.role_id) return false;
        if (locationLevel === 'national') return true;
        return formData.scopes.length > 0;
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
                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
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
                    <label>Access Level</label>
                    <select
                        value={locationLevel}
                        onChange={e => {
                            setLocationLevel(e.target.value);
                            setFormData(prev => ({ ...prev, scopes: [] }));
                        }}
                        className="full-width-select"
                        disabled={isView}
                    >
                        <option value="national">National (All Access)</option>
                        <option value="region">Regional (Select Regions)</option>
                        <option value="province">Provincial (Select Provinces)</option>
                    </select>
                </div>

                {locationLevel !== 'national' && (
                    <div className="location-selector">
                        <h4>
                            Locations
                            {!isView && formData.scopes.length === 0 && <span style={{ color: 'red' }}> *</span>}
                        </h4>
                        {locationLevel === 'region' && (
                            <div className="checkbox-grid">
                                {locations.regions.map(reg => (
                                    <label key={reg.region_id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.scopes.some(s => s.id === reg.region_id && s.level === 'region')}
                                            onChange={e => handleScopeChange('region', reg.region_id, e.target.checked)}
                                            disabled={isView}
                                        />
                                        {reg.region_name}
                                    </label>
                                ))}
                            </div>
                        )}
                        {locationLevel === 'province' && (
                            <div className="grouped-list">
                                {locations.regions.map(reg => {
                                    const provs = locations.provinces.filter(p => p.region_id === reg.region_id);
                                    if (provs.length === 0) return null;
                                    return (
                                        <div key={reg.region_id} className="group-section">
                                            <h5>{reg.region_name}</h5>
                                            <div className="checkbox-grid">
                                                {provs.map(prov => (
                                                    <label key={prov.province_id} className="checkbox-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.scopes.some(s => s.id === prov.province_id && s.level === 'province')}
                                                            onChange={e => handleScopeChange('province', prov.province_id, e.target.checked)}
                                                            disabled={isView}
                                                        />
                                                        {prov.province_name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
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
const ResetPasswordModal = ({ user, onClose, onSuccess }) => {
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
            const response = await fetch(`/api/users/${user.user_id}/reset-password`, {
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
