import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import './RolesTab.css';

const RolesTab = () => {
    const { tenantCode } = useTenant();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/permissions/matrix`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setRoles(data.roles || []);
            setPermissions(data.permissions || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="roles-loading">
                <div className="spinner"></div>
                <p>Loading roles...</p>
            </div>
        );
    }

    return (
        <div className="roles-tab">
            <div className="roles-header">
                <div>
                    <h2>Roles</h2>
                    <p>Manage system roles and permissions</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create Role
                </button>
            </div>

            <div className="roles-table-container">
                <table className="roles-table">
                    <thead>
                        <tr>
                            <th>Role Name</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="no-roles">No roles found</td>
                            </tr>
                        ) : (
                            roles.map(role => (
                                <tr key={role.role_id}>
                                    <td className="role-name-cell">
                                        <span className="role-icon-small">{getRoleIcon(role.role_name)}</span>
                                        <span className="role-name-text">{role.role_name}</span>
                                    </td>
                                    <td className="role-desc-cell">{role.description || '-'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn-manage-simple"
                                            onClick={() => {
                                                setSelectedRole(role);
                                                setShowPermissionsModal(true);
                                            }}
                                        >
                                            Manage Permissions
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showPermissionsModal && selectedRole && (
                <RolePermissionsModal
                    role={selectedRole}
                    permissions={permissions}
                    onClose={() => {
                        setShowPermissionsModal(false);
                        setSelectedRole(null);
                    }}
                    onSuccess={fetchData}
                />
            )}

            {showCreateModal && (
                <CreateRoleModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};

// Create Role Modal
const CreateRoleModal = ({ onClose, onSuccess }) => {
    const { tenantCode } = useTenant();
    const [formData, setFormData] = useState({ role_name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/permissions/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create role');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Create New Role</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}
                        <div className="form-group">
                            <label>Role Name *</label>
                            <input
                                type="text"
                                value={formData.role_name}
                                onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                                placeholder="e.g. Field Supervisor"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the role's responsibilities"
                                rows="3"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Role Permissions Modal
const RolePermissionsModal = ({ role, permissions, onClose, onSuccess }) => {
    const { tenantCode } = useTenant();
    const [rolePermissions, setRolePermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchRolePermissions();
    }, []);

    const fetchRolePermissions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/permissions/matrix`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setRolePermissions(data.matrix[role.role_id] || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (permissionId) => {
        setRolePermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            } else {
                return [...prev, permissionId];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/${tenantCode}/permissions/roles/${role.role_id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permission_ids: rolePermissions })
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to save permissions:', err);
        } finally {
            setSaving(false);
        }
    };

    // Group permissions by category
    const categorizedPermissions = permissions.reduce((acc, perm) => {
        const cat = perm.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
    }, {});

    const filteredPermissions = permissions.filter(perm =>
        perm.permission_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grantedCount = rolePermissions.length;
    const totalCount = permissions.length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>Manage Permissions - {role.role_name}</h3>
                        <p className="permission-count">
                            {grantedCount} of {totalCount} permissions granted
                        </p>
                        <p className="modal-instruction">
                            Check box to <strong>Assign</strong>. Uncheck to <strong>Revoke</strong>.
                        </p>
                    </div>
                    <button onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search permissions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="spinner-small"></div>
                    ) : (
                        <div className="permissions-list">
                            {Object.entries(categorizedPermissions).map(([category, perms]) => {
                                const visiblePerms = perms.filter(p =>
                                    filteredPermissions.includes(p)
                                );

                                if (visiblePerms.length === 0) return null;

                                return (
                                    <div key={category} className="permission-category">
                                        <h4>{category}</h4>
                                        <div className="permission-items">
                                            {visiblePerms.map(perm => (
                                                <label key={perm.permission_id} className="permission-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={rolePermissions.includes(perm.permission_id)}
                                                        onChange={() => togglePermission(perm.permission_id)}
                                                    />
                                                    <div className="permission-info">
                                                        <span className="permission-title">{perm.permission_name}</span>
                                                        <span className="permission-desc">{perm.description}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper function
const getRoleIcon = (roleName) => {
    const icons = {
        'admin': '👑',
        'administrator': '👑',
        'technician': '🔧',
        'manager': '📊',
        'supervisor': '👨‍💼',
        'user': '👤',
        'viewer': '👁️'
    };
    return icons[roleName?.toLowerCase()] || '🎭';
};

export default RolesTab;
