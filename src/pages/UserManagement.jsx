import React, { useState } from 'react';
import './UserManagement.css';
import UsersTab from '../components/UserManagement/UsersTab';
import GroupsTab from '../components/UserManagement/GroupsTab';
import PermissionsTab from '../components/UserManagement/PermissionsTab';
import RolesTab from '../components/UserManagement/RolesTab';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'Users', icon: '👥', description: 'Manage user accounts' },
        { id: 'groups', label: 'Groups', icon: '👥👥', description: 'Organize users into groups' },
        { id: 'permissions', label: 'Permissions', icon: '🔐', description: 'Control access rights' },
        { id: 'roles', label: 'Roles', icon: '🎭', description: 'Define user roles' },
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="user-management-container">
            <div className="um-header">
                <div>
                    <h1>User Management</h1>
                    <p className="um-subtitle">{currentTab?.description}</p>
                </div>
            </div>

            <div className="um-tabs-container">
                <div className="um-tabs-header">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`um-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="um-tab-icon">{tab.icon}</span>
                            <span className="um-tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="um-tabs-content">
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'groups' && <GroupsTab />}
                    {activeTab === 'permissions' && <PermissionsTab />}
                    {activeTab === 'roles' && <RolesTab />}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
