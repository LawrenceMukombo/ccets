import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import './Login.css';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { tenantCode, config, loading: configLoading, error: configError } = useTenant();

    useEffect(() => {
        const notice = sessionStorage.getItem('login_notice');
        if (notice) {
            setError(notice);
            sessionStorage.removeItem('login_notice');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`/api/${tenantCode}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin();
                navigate('/dashboard');
            } else {
                setError(data.message || 'Invalid username or password');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (configLoading) {
        return (
            <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="login-card" style={{ maxWidth: '520px' }}>
                    <div className="login-header">
                        <div className="logo-section">
                            <h1>Unable to load country configuration</h1>
                            <p className="subtitle">{configError || 'The API server may be offline, or no country is selected.'}</p>
                        </div>
                    </div>
                    <div className="login-form">
                        <div className="error-message">Check that the backend and frontend servers are running, then refresh this page.</div>
                        <button type="button" className="login-button" onClick={() => navigate('/switch')}>Switch Country</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="gradient-overlay"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="logo-section">
                        <div className="logo-icon">
                            <img src={config.emblem} alt={`${config.name} Emblem`} style={{ width: '80px', height: 'auto' }} />
                        </div>
                        <h1>Cold Chain Equipment Ticketing System</h1>
                        <p className="subtitle">{config.name} Ministry of Health • EPI</p>
                        <div style={{ marginTop: '1rem' }}>
                            <button 
                                onClick={() => navigate('/switch')}
                                style={{ 
                                    background: 'rgba(255,255,255,0.1)', 
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '20px',
                                    padding: '4px 12px',
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            >
                                ⇄ Switch Country
                            </button>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="error-message">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div className="login-footer">
                        <p className="forgot-password-info">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Forgot your password? Contact your system administrator at <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
