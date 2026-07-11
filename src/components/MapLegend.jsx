import React from 'react';

const MapLegend = ({ activeStatus, onToggleStatus, showBoundaries = true, counts = {}, hierarchy = [] }) => {
    // Colors - Unified Palette (Each status DISTINCT)
    const LEGEND_ITEMS = [
        { status: 'Escalated', color: '#ef4444', description: 'Critical Attention' },
        { status: 'New', color: '#3b82f6', description: 'Just Created' },
        { status: 'Assigned', color: '#8b5cf6', description: 'Has Technician' },
        { status: 'In Progress', color: '#6366f1', description: 'Actively Working' },
        { status: 'On Hold', color: '#f59e0b', description: 'Paused' },
        { status: 'Resolved', color: '#10b981', description: 'Fixed' },
        { status: 'Closed', color: '#64748b', description: 'Archived' },
        { status: 'No Tickets', color: '#94a3b8', description: 'No Data' }
    ];

    return (
        <div style={{
            position: 'absolute',
            bottom: '30px',
            right: '20px',
            background: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 2000,
            fontSize: '12px',
            minWidth: '220px',
            maxWidth: '260px',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                    Ticket Status
                </h4>
                {activeStatus && (
                    <button 
                        onClick={() => onToggleStatus(null)}
                        style={{ 
                            fontSize: '10px', 
                            background: '#f1f5f9', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '4px', 
                            padding: '2px 6px', 
                            cursor: 'pointer',
                            color: '#64748b'
                        }}
                    >
                        Clear
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {LEGEND_ITEMS.map(item => {
                    const isActive = activeStatus === item.status;
                    const count = counts[item.status];
                    
                    return (
                        <div 
                            key={item.status} 
                            onClick={() => onToggleStatus(isActive ? null : item.status)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isActive ? `${item.color}15` : 'transparent',
                                border: isActive ? `1px solid ${item.color}` : '1px solid transparent',
                                opacity: activeStatus && !isActive ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: item.color,
                                border: '2px solid white',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                                flexShrink: 0,
                                transform: isActive ? 'scale(1.2)' : 'scale(1)',
                                transition: 'transform 0.2s'
                            }}></div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{
                                        fontWeight: isActive ? '700' : '600',
                                        color: isActive ? item.color : '#334155',
                                        lineHeight: '1.2'
                                    }}>
                                        {item.status}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        color: '#64748b',
                                        lineHeight: '1.2',
                                        marginTop: '1px'
                                    }}>
                                        {item.description}
                                    </div>
                                </div>
                                {count !== undefined && (
                                    <span style={{ 
                                        background: isActive ? item.color : '#f1f5f9', 
                                        color: isActive ? 'white' : '#64748b',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        minWidth: '20px',
                                        textAlign: 'center'
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showBoundaries && hierarchy && hierarchy.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                    <div style={{ marginBottom: '8px', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boundaries</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {hierarchy.map(level => (
                            <div key={level.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '20px', height: '3px', background: level.color || '#64748b', borderRadius: '2px' }}></div>
                                <span style={{ color: '#475569', fontWeight: '500' }}>{level.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapLegend;
