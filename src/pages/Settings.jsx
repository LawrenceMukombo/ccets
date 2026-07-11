import React, { useState, useEffect } from 'react';
import './Settings.css';
import { useTenant } from '../context/TenantContext';

const Settings = () => {
    const { tenantCode, config: contextConfig, refreshConfig, loading: configLoading } = useTenant();
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
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

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
                // Ensure map_center is an array
                map_center: typeof contextConfig.map_center === 'string' 
                    ? JSON.parse(contextConfig.map_center) 
                    : contextConfig.map_center,
                // Ensure hierarchy is an array
                hierarchy: typeof contextConfig.hierarchy === 'string'
                    ? JSON.parse(contextConfig.hierarchy)
                    : contextConfig.hierarchy
            });
        }
    }, [contextConfig]);

    const isAdmin = user?.role_name === 'Admin' || user?.role_name === 'SuperAdmin' || user?.is_admin;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMapCenterChange = (idx, value) => {
        const newCenter = [...formData.map_center];
        newCenter[idx] = parseFloat(value);
        setFormData(prev => ({ ...prev, map_center: newCenter }));
    };

    const handleHierarchyChange = (idx, field, value) => {
        const newHierarchy = [...formData.hierarchy];
        newHierarchy[idx] = { ...newHierarchy[idx], [field]: value };
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
    };

    const addHierarchyLevel = () => {
        setFormData(prev => ({
            ...prev,
            hierarchy: [...prev.hierarchy, { id: `level_${prev.hierarchy.length + 1}`, name: 'New Level', color: '#3498db' }]
        }));
    };

    const removeHierarchyLevel = (idx) => {
        const newHierarchy = formData.hierarchy.filter((_, i) => i !== idx);
        setFormData(prev => ({ ...prev, hierarchy: newHierarchy }));
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
                // Update local storage user
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
        
        // Show immediate feedback for preferences since they save on change
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
                                placeholder="John" 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                value={userProfile.last_name} 
                                onChange={(e) => setUserProfile({...userProfile, last_name: e.target.value})}
                                placeholder="Doe" 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                value={userProfile.email} 
                                onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                                placeholder="john.doe@example.com" 
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
                    {isAdmin && !editMode && (
                        <button className="btn btn-primary btn-sm" onClick={() => setEditMode(true)}>
                            Edit Configuration
                        </button>
                    )}
                </div>
                <p className="section-desc">Global settings and administrative hierarchy for <strong>{contextConfig.name}</strong>.</p>
                
                {message.text && (
                    <div className={`settings-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

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

                        <div className="hierarchy-edit-section">
                            <div className="section-header-row">
                                <h3>Administrative Hierarchy</h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{formData.hierarchy.length} levels defined</span>
                            </div>
                            <p className="sub-desc">Define the reporting structure. The first level is the highest (e.g. Province or Region).</p>
                            
                            <div className="hierarchy-edit-list">
                                {formData.hierarchy.map((level, idx) => (
                                    <div key={idx} className="hierarchy-edit-item">
                                        <div className="level-icon">{idx + 1}</div>
                                        <div className="level-inputs">
                                            <div className="form-group">
                                                <input 
                                                    type="text" 
                                                    placeholder="Level Label (e.g. Province)" 
                                                    value={level.name} 
                                                    onChange={(e) => handleHierarchyChange(idx, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <input 
                                                    type="text" 
                                                    placeholder="ID (e.g. province)" 
                                                    value={level.id} 
                                                    onChange={(e) => handleHierarchyChange(idx, 'id', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <input 
                                                    type="color" 
                                                    value={level.color || '#3498db'} 
                                                    onChange={(e) => handleHierarchyChange(idx, 'color', e.target.value)}
                                                    title="Theme Color for this level"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn-delete"
                                            onClick={() => removeHierarchyLevel(idx)}
                                            title="Delete Level"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-level" onClick={addHierarchyLevel}>
                                    + Add New Hierarchy Level
                                </button>
                            </div>
                        </div>

                        <div className="settings-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => {
                                setEditMode(false);
                                // Revert to context config
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
                                {formData?.hierarchy?.map((level, idx) => (
                                    <div key={level.id} className="hierarchy-item" style={{ borderLeftColor: level.color || '#3498db' }}>
                                        <div className="level-icon">{idx + 1}</div>
                                        <div className="level-info">
                                            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{level.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {level.id} | Level {idx + 1}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

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
                
                {message.text && (
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
                            onClick={() => setActiveTab('account')}
                        >
                            <span className="icon">👤</span> Account Settings
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'tenant' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tenant')}
                        >
                            <span className="icon">🌍</span> System Config
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'regional' ? 'active' : ''}`}
                            onClick={() => setActiveTab('regional')}
                        >
                            <span className="icon">🗺️</span> Regional Settings
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
                            onClick={() => setActiveTab('preferences')}
                        >
                            <span className="icon">⚙️</span> Preferences
                        </button>
                        <button 
                            className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <span className="icon">🔒</span> Security
                        </button>
                    </nav>
                </aside>

                <main className="settings-content">
                    {activeTab === 'account' && renderAccountSettings()}
                    {activeTab === 'tenant' && renderTenantConfig()}
                    {activeTab === 'regional' && renderRegionalSettings()}
                    {activeTab === 'preferences' && renderPreferences()}
                    {activeTab === 'security' && renderSecurity()}
                </main>
            </div>
        </div>
    );
};

export default Settings;
