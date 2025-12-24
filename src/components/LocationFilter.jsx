import React from 'react';

/**
 * Reusable Location Filter Component
 * Renders Region, Province, District, and Facility dropdowns with cascade filtering.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter state { region, province, district, facility }
 * @param {Object} props.options - Available options { regions, provinces, districts, facilities }
 * @param {Function} props.onFilterChange - Handler for change events (key, value)
 * @param {string} props.className - Optional CSS class
 * @param {boolean} props.compactMode - If true, renders smaller fields
 */
const LocationFilter = ({ filters, options, onFilterChange, className = '', compactMode = false }) => {
    const selectStyle = compactMode
        ? { padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', minWidth: '160px', background: 'white' }
        : { padding: '8px', borderRadius: '4px', border: '1px solid #ddd' };

    const labelStyle = compactMode
        ? { display: 'none' }
        : { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' };

    const filterGroupStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: compactMode ? '4px' : '6px'
    };

    return (
        <div className={`location-filters ${className}`} style={{ display: 'flex', gap: compactMode ? '16px' : '12px', alignItems: 'flex-end' }}>
            {/* Region Filter */}
            <div style={filterGroupStyle}>
                <label style={labelStyle}>Region</label>
                <select
                    value={filters.region}
                    onChange={(e) => onFilterChange('region', e.target.value)}
                    className="filter-select"
                    style={selectStyle}
                >
                    <option value="all">All Regions</option>
                    {options.regions.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* Province Filter - Disabled if no region selected */}
            <div style={filterGroupStyle}>
                <label style={labelStyle}>Province</label>
                <select
                    value={filters.province}
                    onChange={(e) => onFilterChange('province', e.target.value)}
                    className="filter-select"
                    style={selectStyle}
                    disabled={filters.region === 'all'}
                >
                    <option value="all">All Provinces</option>
                    {options.provinces.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            {/* District Filter - Disabled if no province selected */}
            <div style={filterGroupStyle}>
                <label style={labelStyle}>District</label>
                <select
                    value={filters.district}
                    onChange={(e) => onFilterChange('district', e.target.value)}
                    className="filter-select"
                    style={selectStyle}
                    disabled={filters.province === 'all'}
                >
                    <option value="all">All Districts</option>
                    {options.districts.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>

            {/* Facility Filter - Disabled if no district selected */}
            <div style={filterGroupStyle}>
                <label style={labelStyle}>Facility</label>
                <select
                    value={filters.facility}
                    onChange={(e) => onFilterChange('facility', e.target.value)}
                    className="filter-select"
                    style={selectStyle}
                    disabled={filters.district === 'all'}
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
