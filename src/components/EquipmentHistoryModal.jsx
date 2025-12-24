import React, { useState, useEffect } from 'react';
import './Modal.css';

const EquipmentHistoryModal = ({ isOpen, onClose, equipmentId, facilityName, equipmentName }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total_fixes: 0, last_fixed: null });

    useEffect(() => {
        if (isOpen && equipmentId) {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch generic ticket history filtered by equipment_id
            // Ideally we'd have a specific endpoint /api/equipment/:id/history
            // But let's reuse /api/tickets/history or filter tickets
            fetch(`/api/tickets?equipment_id=${equipmentId}`, { headers })
                .then(res => res.json())
                .then(data => {
                    const tickets = data.tickets || [];
                    const resolved = tickets.filter(t => ['Resolved', 'Closed'].includes(t.ticket_status));

                    setHistory(resolved);
                    setStats({
                        total_fixes: resolved.length,
                        last_fixed: resolved.length > 0 ? resolved[0].updated_at : null
                    });
                })
                .catch(err => console.error("Failed to fetch equipment history", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, equipmentId]);

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Equipment History</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="equipment-summary-card" style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>{equipmentName}</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Located at: <strong>{facilityName}</strong></p>

                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                            <div className="stat-item">
                                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Times Fixed</span>
                                <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.total_fixes}</span>
                            </div>
                            <div className="stat-item">
                                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Last Repair</span>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                                    {formatDate(stats.last_fixed)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '12px', color: '#334155' }}>Repair Log</h4>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading history...</div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
                            No repair history found for this equipment.
                        </div>
                    ) : (
                        <div className="history-list">
                            {history.map(ticket => (
                                <div key={ticket.ticket_id} className="history-item" style={{ borderBottom: '1px solid #f1f5f9', padding: '16px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>Issue: {ticket.issue_type || 'Fault Reported'}</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(ticket.created_at)}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px 0' }}>{ticket.fault_description}</p>

                                    <div style={{ background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                                        <strong style={{ color: '#047857' }}>Resolution:</strong>
                                        <p style={{ margin: '4px 0 0 0', color: '#065f46' }}>{ticket.resolution_notes || 'Ticket resolved successfully.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default EquipmentHistoryModal;
