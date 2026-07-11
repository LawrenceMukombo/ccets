import React, { createContext, useState, useContext, useEffect } from 'react';

const TenantContext = createContext();

export const useTenant = () => {
    return useContext(TenantContext);
};

export const TenantProvider = ({ children }) => {
    const [tenantCode, setTenantCode] = useState(() => {
        return localStorage.getItem('tenantCode') || null;
    });

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshConfig = async (code) => {
        const targetCode = code || tenantCode;
        if (!targetCode) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/${targetCode}/settings/config`);
            const data = await response.json();
            if (data.success && data.config) {
                const rawConfig = data.config;
                const transformedConfig = { ...rawConfig };

                // Parse map_center (string to array)
                if (rawConfig.map_center) {
                    try {
                        transformedConfig.map_center = typeof rawConfig.map_center === 'string' 
                            ? JSON.parse(rawConfig.map_center) 
                            : rawConfig.map_center;
                    } catch (e) {
                        console.warn('Failed to parse map_center:', rawConfig.map_center);
                        transformedConfig.map_center = [-6.314993, 143.95555]; // Default PNG fallback
                    }
                }

                // Parse hierarchy (string to array)
                if (rawConfig.hierarchy) {
                    try {
                        transformedConfig.hierarchy = typeof rawConfig.hierarchy === 'string'
                            ? JSON.parse(rawConfig.hierarchy)
                            : rawConfig.hierarchy;
                    } catch (e) {
                        console.warn('Failed to parse hierarchy:', rawConfig.hierarchy);
                        transformedConfig.hierarchy = [];
                    }
                }

                // Map snake_case to camelCase for UI compatibility
                transformedConfig.mapCenter = transformedConfig.map_center || [-6.314993, 143.95555];
                transformedConfig.mapZoom = transformedConfig.map_zoom || 6;
                transformedConfig.contactEmail = transformedConfig.contact_email;
                transformedConfig.currencyCode = transformedConfig.currency_code;
                transformedConfig.dateFormat = transformedConfig.date_format;
                transformedConfig.timeZone = transformedConfig.time_zone;
                transformedConfig.phonePrefix = transformedConfig.phone_prefix;

                setConfig(transformedConfig);
            } else {
                setError(data.message || 'Failed to load configuration');
            }
        } catch (err) {

            console.error('Error fetching tenant config:', err);
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshConfig();
    }, [tenantCode]);

    const setTenant = (code) => {
        setTenantCode(code);
        if (code) {
            localStorage.setItem('tenantCode', code);
        } else {
            localStorage.removeItem('tenantCode');
            setConfig(null);
        }
    };

    return (
        <TenantContext.Provider value={{ tenantCode, setTenant, config, loading, error, refreshConfig }}>
            {children}
        </TenantContext.Provider>
    );
};
