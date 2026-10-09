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
    
    const response = await originalFetch.apply(this, [resource, config]);

    // Auto-logout and clear stale token if authentication fails or user is not registered in tenant
    const isAuthFailure = response.status === 401 || response.status === 403 || 
        (response.status === 404 && typeof resource === 'string' && resource.includes('/auth/me'));

    if (isAuthFailure && typeof resource === 'string' && resource.includes('/api/')) {
        const hasToken = localStorage.getItem('token');
        if (hasToken && !resource.includes('/auth/login')) {
            try {
                response.clone().json().then(data => {
                    if (data?.message) {
                        sessionStorage.setItem('login_notice', data.message);
                    }
                }).catch(() => {});
            } catch (e) {}

            console.warn('Session expired or user not registered in current country. Clearing stale token...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
        }
    }

    return response;
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        if (import.meta.env.DEV) {
            navigator.serviceWorker.getRegistrations()
                .then(registrations => Promise.all(registrations.map(reg => reg.unregister())))
                .then(() => console.log('Service workers disabled in development'))
                .catch(err => console.error('Service worker cleanup failed', err));
            return;
        }

        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully', reg.scope))
            .catch(err => console.error('Service Worker registration failed', err));
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
