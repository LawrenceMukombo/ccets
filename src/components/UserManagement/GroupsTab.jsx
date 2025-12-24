import React, { useState, useEffect } from 'react';
import './GroupsTab.css';

const GroupsTab = () => {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        fetchGroups();
        fetchUsers();
    }, []);

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/groups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setGroups(data.groups || []);
        } catch (err) {
            console.error('Failed to load groups:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const filteredGroups = groups.filter(group =>
        group.group_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="groups-loading"><div className="spinner"></div><p>Loading groups...</p></div>;
    }

    return (
        <div className="groups-tab">
            <div className="groups-header">
                <div>
                    <h2>User Groups ({filteredGroups.length})</h2>
                    <p>Organize users and manage group permissions</p>
                </div>
                <button className="btn-create" onClick={() => setShowCreateModal(true)}>
                    + Create Group
                </button>
            </div>

            <div className="groups-search">
                <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="groups-grid">
                {filteredGroups.length === 0 ? (
                    <div className="no-groups">No groups found</div>
                ) : (
                    filteredGroups.map(group => (
                        <div key={group.group_id} className="group-card">
                            <div className="group-card-header">
                                <h3>{group.group_name}</h3>
                                <div className="group-actions">
                                    <button onClick={() => { setSelectedGroup(group); setShowMembersModal(true); }}>
                                        👥 Members
                                    </button>
                                    <button onClick={() => { setSelectedGroup(group); setShowEditModal(true); }}>
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                            <p className="group-description">{group.description || 'No description'}</p>
                            <div className="group-stats">
                                <div className="stat">
                                    <span className="stat-number">{group.member_count || 0}</span>
                                    <span className="stat-label">Members</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-number">{group.permission_count || 0}</span>
                                    <span className="stat-label">Permissions</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateModal && (
                <CreateGroupModal onClose={() => setShowCreateModal(false)} onSuccess={fetchGroups} />
            )}

            {showEditModal && selectedGroup && (
                <EditGroupModal
                    group={selectedGroup}
                    onClose={() => { setShowEditModal(false); setSelectedGroup(null); }}
                    onSuccess={fetchGroups}
                />
            )}

            {showMembersModal && selectedGroup && (
                <ManageMembersModal
                    group={selectedGroup}
                    users={users}
                    onClose={() => { setShowMembersModal(false); setSelectedGroup(null); }}
                    onSuccess={fetchGroups}
                />
            )}
        </div>
    );
};

// Create Group Modal
const CreateGroupModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({ group_name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to create group');

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
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Create New Group</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                value={formData.group_name}
                                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Edit Group Modal
const EditGroupModal = ({ group, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        group_name: group.group_name,
        description: group.description || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/groups/${group.group_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to update group');

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/groups/${group.group_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Edit Group</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                value={formData.group_name}
                                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-danger" onClick={handleDelete}>
                            Delete Group
                        </button>
                        <div style={{ flex: 1 }}></div>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Manage Members Modal
const ManageMembersModal = ({ group, users, onClose, onSuccess }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/groups/${group.group_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setMembers(data.members || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/groups/${group.group_id}/members`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            fetchMembers();
            onSuccess();
        } catch (err) {
            console.error(err);
        }
    };

    const removeMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/groups/${group.group_id}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchMembers();
            onSuccess();
        } catch (err) {
            console.error(err);
        }
    };

    const memberIds = members.map(m => m.user_id);
    const availableUsers = users.filter(u => !memberIds.includes(u.user_id));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Manage Members - {group.group_name}</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="members-container">
                        <div className="members-section">
                            <h4>Current Members ({members.length})</h4>
                            {loading ? (
                                <div className="spinner-small"></div>
                            ) : members.length === 0 ? (
                                <p className="no-data-small">No members in this group</p>
                            ) : (
                                <div className="user-list">
                                    {members.map(member => (
                                        <div key={member.user_id} className="user-item">
                                            <span>{member.first_name} {member.last_name} ({member.username})</span>
                                            <button onClick={() => removeMember(member.user_id)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="members-section">
                            <h4>Add Members ({availableUsers.length})</h4>
                            {availableUsers.length === 0 ? (
                                <p className="no-data-small">All users are members</p>
                            ) : (
                                <div className="user-list">
                                    {availableUsers.map(user => (
                                        <div key={user.user_id} className="user-item">
                                            <span>{user.first_name} {user.last_name} ({user.username})</span>
                                            <button onClick={() => addMember(user.user_id)}>Add</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default GroupsTab;
