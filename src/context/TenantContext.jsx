import React, { createContext, useState, useContext, useEffect } from 'react';

const TenantContext = createContext();

const DEFAULT_TENANT_CONFIGS = {
    png: {
        name: 'Papua New Guinea',
        emblem: '/png_emblem.png',
        mapCenter: [-6.314993, 143.95555],
        mapZoom: 6,
        contactEmail: 'ict@health.gov.pg',
        hierarchy: [{ id: 'province', name: 'Province', color: '#be123c' }, { id: 'district', name: 'District', color: '#0369a1' }]
    },
    zambia: {
        name: 'Zambia',
        emblem: '/zambia_emblem.png',
        mapCenter: [-13.133897, 27.849332],
        mapZoom: 6,
        contactEmail: 'support@moh.gov.zm',
        hierarchy: [{ id: 'province', name: 'Province', color: '#be123c' }, { id: 'district', name: 'District', color: '#0369a1' }]
    },
    malawi: {
        name: 'Malawi',
        emblem: '/malawi_emblem.png',
        mapCenter: [-13.254308, 34.301525],
        mapZoom: 7,
        contactEmail: 'it.support@health.gov.mw',
        hierarchy: [{ id: 'region', name: 'Region', color: '#9d174d' }, { id: 'district', name: 'District', color: '#0369a1' }]
    }
};

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
    const [platformContext, setPlatformContext] = useState(null);

    useEffect(() => {
        const fetchPlatformContext = async () => {
            try {
                const response = await fetch('/api/platform/context');
                const data = await response.json();
                if (data.success) {
                    setPlatformContext(data);
                    
                    if (data.redirectUrl) {
                        window.location.replace(data.redirectUrl);
                        return;
                    }

                    if (data.resolvedTenant) {
                        const resolvedCode = data.resolvedTenant.code;
                        if (localStorage.getItem('tenantCode') !== resolvedCode) {
                            localStorage.setItem('tenantCode', resolvedCode);
                            setTenantCode(resolvedCode);
                        }
                    } else if (data.deploymentMode === 'standalone_country' && data.tenants?.length > 0) {
                        const defaultCode = data.defaultTenant || data.tenants[0].code;
                        if (localStorage.getItem('tenantCode') !== defaultCode) {
                            localStorage.setItem('tenantCode', defaultCode);
                            setTenantCode(defaultCode);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching platform context:', err);
            }
        };
        fetchPlatformContext();
    }, []);

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
                const fallback = DEFAULT_TENANT_CONFIGS[targetCode?.toLowerCase()];
                if (fallback) {
                    setConfig(fallback);
                    setError(null);
                } else {
                    setError(data?.message || 'Failed to load configuration');
                }
            }
        } catch (err) {
            console.error('Error fetching tenant config:', err);
            const fallback = DEFAULT_TENANT_CONFIGS[targetCode?.toLowerCase()];
            if (fallback) {
                console.info('Using default configuration fallback for:', targetCode);
                setConfig(fallback);
                setError(null);
            } else {
                setError('Connection error');
            }
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
        <TenantContext.Provider value={{ tenantCode, setTenant, config, loading, error, refreshConfig, platformContext }}>
            {children}
        </TenantContext.Provider>
    );
};
