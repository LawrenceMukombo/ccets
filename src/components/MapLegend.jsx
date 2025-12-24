import React from 'react';

const MapLegend = () => {
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
            minWidth: '200px',
            maxWidth: '240px',
            border: '1px solid #e2e8f0'
        }}>
            <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '700',
                color: '#1e293b',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '6px'
            }}>
                Ticket Status
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {LEGEND_ITEMS.map(item => (
                    <div key={item.status} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '2px 0'
                    }}>
                        <div style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: item.color,
                            border: '2px solid white',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                            flexShrink: 0
                        }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontWeight: '600',
                                color: '#334155',
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
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MapLegend;
