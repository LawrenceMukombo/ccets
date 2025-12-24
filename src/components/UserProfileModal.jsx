import React from 'react';
import './UserProfileModal.css';

const UserProfileModal = ({ user, onClose }) => {
    if (!user) return null;

    // Helper to get initials
    const getInitials = (firstName, lastName, username) => {
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        if (username) return username.slice(0, 2).toUpperCase();
        return 'US';
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-header">
                    <h2>User Profile</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="profile-content">
                    <div className="profile-avatar-section">
                        <div className="profile-avatar">
                            {getInitials(user.first_name, user.last_name, user.username)}
                        </div>
                        <div className="profile-main-info">
                            <h3>{user.first_name || user.username} {user.last_name}</h3>
                            <p className="profile-role">{user.role_name}</p>
                        </div>
                    </div>

                    <div className="profile-details-grid">
                        <div className="detail-item">
                            <label>Username</label>
                            <p>{user.username}</p>
                        </div>
                        <div className="detail-item">
                            <label>Email</label>
                            <p>{user.email}</p>
                        </div>
                        <div className="detail-item">
                            <label>Phone</label>
                            <p>{user.phone_number || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                            <label>IP Address</label>
                            <p>{user.ip_address || 'Unknown'}</p>
                        </div>
                        <div className="detail-item full-width">
                            <label>Location</label>
                            <p className="location-text">📍 {user.location || 'National'}</p>
                        </div>
                        {user.provinces && user.provinces.length > 0 && (
                            <div className="detail-item full-width">
                                <label>Assigned Provinces</label>
                                <div className="province-tags">
                                    {user.provinces.map((prov, i) => (
                                        <span key={i} className="province-tag">{prov}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="detail-item">
                            <label>Account Status</label>
                            <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {user.last_login && (
                            <div className="detail-item">
                                <label>Last Login</label>
                                <p>{new Date(user.last_login).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-footer">
                    <button className="close-modal-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
