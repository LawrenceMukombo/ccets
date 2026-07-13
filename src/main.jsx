import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TenantProvider } from './context/TenantContext';
import { OfflineProvider } from './context/OfflineContext';

// --- Global Fetch Interceptor for Multi-Tenancy ---
const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    
    // Check if it's an API call and we have a tenant
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
        const tenantCode = localStorage.getItem('tenantCode');
        
        // Skip prefixing for:
        // 1. Admin routes
        // 2. Public tenants list
        // 3. Requests that already have a tenant code in the URL
        const isPublicTenants = resource === '/api/tenants' || resource === '/api/tenants/';
        const isAdmin = resource.startsWith('/api/admin') && (resource === '/api/admin' || resource.startsWith('/api/admin/'));
        const isPlatform = resource.startsWith('/api/platform') && (resource === '/api/platform' || resource.startsWith('/api/platform/'));
        // Safely check if it already starts with the specific tenant code
        const isAlreadyPrefixed = tenantCode && resource.startsWith(`/api/${tenantCode}/`);

        if (tenantCode && !isAdmin && !isPublicTenants && !isPlatform && !isAlreadyPrefixed) {
            resource = resource.replace('/api/', `/api/${tenantCode}/`);
        }
    }
    
    return originalFetch.apply(this, [resource, config]);
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered successfully', reg.scope))
            .catch(err => console.error('❌ Service Worker registration failed', err));
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <TenantProvider>
            <OfflineProvider>
                <App />
            </OfflineProvider>
        </TenantProvider>
    </React.StrictMode>
);
