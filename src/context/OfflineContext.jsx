import React, { createContext, useContext, useState, useEffect } from 'react';
import { getOfflineTickets, deleteOfflineTicket, cacheMetadata, getCachedMetadata } from '../utils/offlineDb';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLogs, setSyncLogs] = useState([]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addLog('🌐 Connection restored. Ready to sync.');
            syncOfflineQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
            addLog('🔌 Offline mode activated. Working from local cache.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        updatePendingCount();
        
        // Auto sync on mount if online
        if (navigator.onLine) {
            syncOfflineQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const addLog = (message) => {
        setSyncLogs(prev => [
            { id: Date.now() + Math.random(), text: message, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 19) // Limit to 20 logs
        ]);
    };

    const updatePendingCount = async () => {
        try {
            const list = await getOfflineTickets();
            setPendingCount(list.length);
        } catch (err) {
            console.error('Failed to read offline queue size', err);
        }
    };

    const syncOfflineQueue = async () => {
        const list = await getOfflineTickets();
        if (list.length === 0) {
            setPendingCount(0);
            return;
        }

        if (!navigator.onLine) {
            addLog('⚠️ Cannot sync: Device is offline.');
            return;
        }

        setIsSyncing(true);
        addLog(`🔄 Found ${list.length} offline tickets. Synchronizing...`);

        const token = localStorage.getItem('token');
        const tenantCode = localStorage.getItem('tenantCode') || 'png';

        let successCount = 0;
        let failCount = 0;

        for (const ticket of list) {
            try {
                addLog(`Sending ticket: "${ticket.description.substring(0, 30)}..."`);
                const response = await fetch(`/api/tickets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                        facilityId: ticket.facilityId,
                        equipmentId: ticket.equipmentId,
                        priority: ticket.priority,
                        description: ticket.description,
                        reportedByName: ticket.reportedByName,
                        reportedByPhone: ticket.reportedByPhone,
                        reportedByEmail: ticket.reportedByEmail,
                        manufacturer: ticket.manufacturer,
                        model: ticket.model,
                        serialNumber: ticket.serialNumber,
                        refrigerantGas: ticket.refrigerantGas,
                        idempotencyKey: ticket.uuid
                    })
                });

                if (response.ok) {
                    await deleteOfflineTicket(ticket.uuid);
                    successCount++;
                    addLog(`✅ Successfully synchronized offline ticket.`);
                } else {
                    const errData = await response.json().catch(() => ({}));
                    failCount++;
                    addLog(`❌ Failed to sync ticket: ${errData.message || response.statusText}`);
                }
            } catch (err) {
                failCount++;
                addLog(`❌ Sync error (network failure): ${err.message}`);
                break; // Stop sync loop if we get network exception
            }
        }

        setIsSyncing(false);
        updatePendingCount();
        addLog(`📊 Sync finished. Success: ${successCount}, Failures: ${failCount}`);
    };

    // Helper to cache core metadata for offline searches
    const refreshOfflineCache = async () => {
        if (!navigator.onLine) return;
        try {
            const token = localStorage.getItem('token');
            const tenantCode = localStorage.getItem('tenantCode') || 'png';
            if (!token) return;

            addLog('📥 Refreshing offline metadata cache...');
            
            // 1. Fetch facilities
            const facRes = await fetch(`/api/facilities?limit=10000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (facRes.ok) {
                const data = await facRes.json();
                const list = data.data || data.facilities || [];
                await cacheMetadata('facilities', list);
            }

            // 2. Fetch equipment
            const equipRes = await fetch(`/api/equipment?limit=10000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (equipRes.ok) {
                const data = await equipRes.json();
                const list = data.data || data.equipment || [];
                await cacheMetadata('equipment', list);
            }

            addLog('✅ Offline metadata cache refreshed successfully.');
        } catch (e) {
            console.error('Failed to refresh offline cache', e);
            addLog('⚠️ Failed to cache metadata for offline use.');
        }
    };

    return (
        <OfflineContext.Provider value={{
            isOnline,
            pendingCount,
            isSyncing,
            syncLogs,
            triggerSync: syncOfflineQueue,
            updatePendingCount,
            refreshOfflineCache
        }}>
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};
