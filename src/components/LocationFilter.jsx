import React from 'react';
import { useTenant } from '../context/TenantContext';

/**
 * Reusable Location Filter Component
 * Renders dynamic location dropdowns based on tenant hierarchy.
 */
const LocationFilter = ({ filters, options, onFilterChange, className = '', compactMode = false, labelColor }) => {
    const { config } = useTenant();
    
    const hierarchy = config?.hierarchy || [
        { id: 'province', name: 'Province' },
        { id: 'district', name: 'District' }
    ];

    const selectStyle = compactMode
        ? { 
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0', 
            fontSize: '13px', 
            minWidth: '140px', 
            background: '#ffffff', 
            color: '#1e293b', 
            height: '38px', 
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            outline: 'none'
          }
        : { padding: '8px', borderRadius: '4px', border: '1px solid #ddd' };

    const labelStyle = compactMode
        ? { 
            fontSize: '12px', 
            fontWeight: '700', 
            color: labelColor || 'white', 
            marginBottom: '4px', 
            display: 'block', 
            textTransform: 'uppercase', 
            paddingLeft: '2px',
            letterSpacing: '0.05em',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }
        : { fontSize: '13px', fontWeight: '600', color: labelColor || '#334155', marginBottom: '6px', display: 'block' };

    const filterGroupStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: compactMode ? '4px' : '6px',
        minWidth: '140px'
    };

    const getOptions = (id) => {
        if (id === 'region') return options.regions || [];
        if (id === 'province') return options.provinces || [];
        if (id === 'district') return options.districts || [];
        return [];
    };

    return (
        <div className={`location-filters ${className}`} style={{ display: 'flex', gap: compactMode ? '16px' : '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {hierarchy.map((level, index) => {
                const isFirst = index === 0;
                const prevLevelId = index > 0 ? hierarchy[index-1].id : null;
                const isDisabled = !isFirst && filters[prevLevelId] === 'all';
                
                return (
                    <div key={level.id} style={filterGroupStyle}>
                        <label style={labelStyle}>{level.name}</label>
                        <select
                            value={filters[level.id] || 'all'}
                            onChange={(e) => onFilterChange(level.id, e.target.value)}
                            className="filter-select"
                            style={selectStyle}
                            disabled={isDisabled}
                        >
                            <option value="all">All {level.name}s</option>
                            {getOptions(level.id).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );
            })}

            {/* Facility Filter - Always the last level */}
            <div style={filterGroupStyle}>
                <label style={labelStyle}>Facility</label>
                <select
                    value={filters.facility || 'all'}
                    onChange={(e) => onFilterChange('facility', e.target.value)}
                    className="filter-select"
                    style={selectStyle}
                    disabled={filters[hierarchy[hierarchy.length-1].id] === 'all'}
                >
                    <option value="all">All Facilities</option>
                    {options.facilities?.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocationFilter;
