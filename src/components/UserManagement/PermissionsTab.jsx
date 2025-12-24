import React, { useState, useEffect } from 'react';
import './PermissionsTab.css';

const PermissionsTab = () => {
    const [matrixData, setMatrixData] = useState({ roles: [], permissions: [], matrix: {} });
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/permissions/matrix', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setMatrixData(data);
        } catch (err) {
            console.error('Failed to load permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (roleId, permissionId) => {
        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/permissions/roles/${roleId}/toggle/${permissionId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Update local state optimistically
            setMatrixData(prev => {
                const newMatrix = { ...prev.matrix };
                if (!newMatrix[roleId]) newMatrix[roleId] = [];

                if (data.granted) {
                    newMatrix[roleId] = [...newMatrix[roleId], permissionId];
                } else {
                    newMatrix[roleId] = newMatrix[roleId].filter(id => id !== permissionId);
                }

                return { ...prev, matrix: newMatrix };
            });
        } catch (err) {
            console.error('Failed to toggle permission:', err);
            fetchMatrix();
        } finally {
            setUpdating(false);
        }
    };

    const hasPermission = (roleId, permissionId) => {
        return matrixData.matrix[roleId]?.includes(permissionId) || false;
    };

    // Group permissions by category
    const categorizedPermissions = matrixData.permissions.reduce((acc, perm) => {
        const cat = perm.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
    }, {});

    const categories = Object.keys(categorizedPermissions);
    const activeCategory = categoryFilter || categories[0] || '';
    const displayPermissions = activeCategory
        ? categorizedPermissions[activeCategory] || []
        : matrixData.permissions;

    const filteredPermissions = displayPermissions.filter(perm =>
        perm.permission_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="permissions-loading">
                <div className="spinner"></div>
                <p>Loading permissions matrix...</p>
            </div>
        );
    }

    return (
        <div className="permissions-tab">
            <div className="permissions-header">
                <div>
                    <h2>Permission Matrix</h2>
                    <p>Manage role-based permissions - click to toggle</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create Permission
                </button>
            </div>

            <div className="permissions-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search permissions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="category-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setCategoryFilter(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="matrix-container">
                <div className="matrix-scroll">
                    <table className="permissions-matrix">
                        <thead>
                            <tr>
                                <th className="sticky-col">Permission</th>
                                {matrixData.roles.map(role => (
                                    <th key={role.role_id} className="role-header">
                                        <div className="role-name">{role.role_name}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPermissions.length === 0 ? (
                                <tr>
                                    <td colSpan={matrixData.roles.length + 1} className="no-data">
                                        No permissions found
                                    </td>
                                </tr>
                            ) : (
                                filteredPermissions.map(permission => (
                                    <tr key={permission.permission_id}>
                                        <td className="sticky-col permission-name">
                                            <div className="perm-title">{permission.permission_name}</div>
                                            <div className="perm-desc">{permission.description}</div>
                                        </td>
                                        {matrixData.roles.map(role => {
                                            const granted = hasPermission(role.role_id, permission.permission_id);
                                            return (
                                                <td key={`${role.role_id}-${permission.permission_id}`}>
                                                    <button
                                                        className={`permission-cell ${granted ? 'granted' : 'denied'}`}
                                                        onClick={() => togglePermission(role.role_id, permission.permission_id)}
                                                        disabled={updating}
                                                        title={granted ? 'Click to revoke' : 'Click to grant'}
                                                    >
                                                        {granted ? '✓' : '✗'}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="matrix-legend">
                <div className="legend-item">
                    <span className="legend-icon granted">✓</span>
                    <span>Permission Granted</span>
                </div>
                <div className="legend-item">
                    <span className="legend-icon denied">✗</span>
                    <span>Permission Denied</span>
                </div>
                <div className="legend-note">
                    Click any cell to toggle permission
                </div>
            </div>

            {updating && (
                <div className="updating-overlay">
                    <div className="spinner-small"></div>
                    <span>Updating...</span>
                </div>
            )}

            {showCreateModal && (
                <CreatePermissionModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchMatrix}
                />
            )}
        </div>
    );
};

// Create Permission Modal
const CreatePermissionModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        permission_name: '',
        description: '',
        category: 'General'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'General', 'Users', 'Groups', 'Facilities',
        'Inventory', 'Tickets', 'Reports', 'System'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/permissions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create permission');
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
                    <h3>Create New Permission</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}
                        <div className="form-group">
                            <label>Permission Name *</label>
                            <input
                                type="text"
                                value={formData.permission_name}
                                onChange={e => setFormData({ ...formData, permission_name: e.target.value })}
                                placeholder="e.g. view_dashboard"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Category *</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what this permission allows"
                                rows="3"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Permission'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PermissionsTab;
