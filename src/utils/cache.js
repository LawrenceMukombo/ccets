// In-memory cache for heavy API responses (tickets, facilities)
const cache = {
    tickets: null,
    facilities: null,
    ticketsTimestamp: 0,
    facilitiesTimestamp: 0,
    tenantCode: null
};

export const getCachedData = (key, tenantCode, ttlMs = 45000) => {
    if (cache.tenantCode !== tenantCode) {
        clearCache();
        cache.tenantCode = tenantCode;
        return null;
    }
    const now = Date.now();
    if (key === 'tickets' && Array.isArray(cache.tickets) && (now - cache.ticketsTimestamp < ttlMs)) {
        return cache.tickets;
    }
    if (key === 'facilities' && Array.isArray(cache.facilities) && (now - cache.facilitiesTimestamp < ttlMs)) {
        return cache.facilities;
    }
    return null;
};

export const setCachedData = (key, tenantCode, data) => {
    // Only cache non-empty arrays to prevent error objects from polluting cache
    if (!Array.isArray(data) || data.length === 0) return;

    if (cache.tenantCode !== tenantCode) {
        clearCache();
        cache.tenantCode = tenantCode;
    }
    const now = Date.now();
    if (key === 'tickets') {
        cache.tickets = data;
        cache.ticketsTimestamp = now;
    } else if (key === 'facilities') {
        cache.facilities = data;
        cache.facilitiesTimestamp = now;
    }
};

export const clearCache = (key) => {
    if (key === 'tickets') {
        cache.tickets = null;
        cache.ticketsTimestamp = 0;
    } else if (key === 'facilities') {
        cache.facilities = null;
        cache.facilitiesTimestamp = 0;
    } else {
        cache.tickets = null;
        cache.facilities = null;
        cache.ticketsTimestamp = 0;
        cache.facilitiesTimestamp = 0;
    }
};

// Intercept fetch to automatically clear cache on mutations
if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
        const method = (init && init.method || 'GET').toUpperCase();
        const url = typeof input === 'string' ? input : (input && input.url || '');
        
        const response = await originalFetch.apply(this, arguments);
        
        // If the request was a mutation (POST, PUT, DELETE, PATCH) and succeeded
        if (response.ok && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            // Check if it's an API request
            if (url.includes('/api/')) {
                if (url.includes('/tickets')) {
                    clearCache('tickets');
                } else if (url.includes('/facilities')) {
                    clearCache('facilities');
                } else {
                    // For safety, clear both if we can't determine
                    clearCache('tickets');
                    clearCache('facilities');
                }
            }
        }
        return response;
    };
}
