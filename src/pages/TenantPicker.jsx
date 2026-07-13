import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

const TenantPicker = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { setTenant, platformContext } = useTenant();
    const navigate = useNavigate();

    useEffect(() => {
        if (platformContext?.deploymentMode === 'standalone_country' || platformContext?.resolvedTenant) {
            navigate('/login');
        }
    }, [platformContext, navigate]);

    useEffect(() => {
        // Fetch the live tenant list from the public API endpoint
        fetch('/api/tenants')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch tenants');
                return res.json();
            })
            .then(data => {
                setTenants(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('TenantPicker fetch error:', err);
                // Fallback: use known tenants so the app is never broken
                setTenants([
                    { code: 'png',    name: 'Papua New Guinea' },
                    { code: 'zambia', name: 'Zambia' },
                    { code: 'malawi', name: 'Malawi' },
                ]);
                setLoading(false);
            });
    }, []);

    const handleSelectTenant = (code) => {
        setTenant(code);
        navigate('/login');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading countries...</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            padding: '1.5rem',
        }}>
            <div style={{
                maxWidth: '480px', width: '100%',
                background: 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1.5rem',
                border: '1px solid rgba(148,163,184,0.15)',
                padding: '2.5rem',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem', fontSize: '1.8rem',
                    }}>❄️</div>
                    <h1 style={{ 
                        fontSize: 'clamp(2rem, 8vw, 3.5rem)', 
                        fontWeight: '800', 
                        color: 'white', 
                        marginBottom: '16px', 
                        letterSpacing: '-1px' 
                    }}>
                        Global Cold Chain Portal
                    </h1>
                    <p style={{ 
                        fontSize: 'clamp(1rem, 4vw, 1.25rem)', 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        maxWidth: '600px', 
                        margin: '0 auto' 
                    }}>
                        Select your country or region to access the Cold Chain Equipment Ticketing System
                    </p>
                </div>

                <h2 style={{ color: '#cbd5e1', fontSize: '1rem', fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Select Country
                </h2>

                {error && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#fca5a5', fontSize: '0.875rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tenants.map(t => {
                        const code = t.code || t.tenant_code;
                        return (
                            <button
                                key={code}
                                onClick={() => handleSelectTenant(code)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    width: '100%', padding: '1rem 1.25rem',
                                    background: 'rgba(15,23,42,0.6)',
                                    border: '1px solid rgba(148,163,184,0.2)',
                                    borderRadius: '0.75rem', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(59,130,246,0.15)';
                                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(15,23,42,0.6)';
                                    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {/* Emblem */}
                                <img
                                    src={t.emblem || '/png_emblem.png'}
                                    alt={`${t.name} emblem`}
                                    style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                                {/* Country name */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>{t.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                                        {t.code.toUpperCase()} — Cold Chain Management
                                    </div>
                                </div>
                                {/* Arrow */}
                                <svg style={{ width: '18px', height: '18px', color: '#475569', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        );
                    })}
                </div>

                <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', marginTop: '2rem', marginBottom: 0 }}>
                    CCETS Multi-Tenant Edition v2.0
                </p>
            </div>
        </div>
    );
};

export default TenantPicker;
