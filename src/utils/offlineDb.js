const DB_NAME = 'ccets-offline-db';
const DB_VERSION = 1;

export const openDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('offline_tickets')) {
                db.createObjectStore('offline_tickets', { keyPath: 'uuid' });
            }
            if (!db.objectStoreNames.contains('cached_metadata')) {
                db.createObjectStore('cached_metadata', { keyPath: 'key' });
            }
        };
    });
};

export const saveOfflineTicket = async (ticket) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('offline_tickets', 'readwrite');
        const store = transaction.objectStore('offline_tickets');
        const uuid = crypto.randomUUID ? crypto.randomUUID() : 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const record = {
            uuid,
            ...ticket,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const request = store.put(record);
        request.onsuccess = () => resolve(record);
        request.onerror = () => reject(request.error);
    });
};

export const getOfflineTickets = async () => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('offline_tickets', 'readonly');
        const store = transaction.objectStore('offline_tickets');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteOfflineTicket = async (uuid) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('offline_tickets', 'readwrite');
        const store = transaction.objectStore('offline_tickets');
        const request = store.delete(uuid);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

export const cacheMetadata = async (key, value) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cached_metadata', 'readwrite');
        const store = transaction.objectStore('cached_metadata');
        const request = store.put({ key, value, updated_at: new Date().toISOString() });
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

export const getCachedMetadata = async (key) => {
    try {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('cached_metadata', 'readonly');
            const store = transaction.objectStore('cached_metadata');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('IndexedDB not supported or failing, returning empty cache', e);
        return null;
    }
};

export const clearMetadata = async () => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cached_metadata', 'readwrite');
        const store = transaction.objectStore('cached_metadata');
        const request = store.clear();
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};
