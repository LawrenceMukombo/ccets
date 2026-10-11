import React from 'react';
import './GlobalFilter.css';

import { validateDateRange } from '../utils/validation';

const GlobalFilter = ({ filters, onFilterChange, children, showLocation = true, showDate = true }) => {

    const handleChange = (key, value) => {
        onFilterChange(key, value);
    };

    const rangeCheck = validateDateRange(filters.dateStart, filters.dateEnd);

    return (
        <div className="global-filter-container">
            {/* Search Filter */}
            <div className="filter-group">
                <span className="filter-label">Search</span>
                <input
                    type="text"
                    className="filter-input"
                    placeholder="Ref #, Equip, Desc..."
                    value={filters.search || ''}
                    onChange={(e) => handleChange('search', e.target.value)}
                />
            </div>

            {/* Date Range Filter */}
            {showDate && (
                <div className="filter-group">
                    <span className="filter-label">Date Range</span>
                    <div className="date-range-container">
                        <input
                            type="date"
                            className="filter-date-input"
                            value={filters.dateStart || ''}
                            onChange={(e) => handleChange('dateStart', e.target.value)}
                            title="Start Date"
                            style={!rangeCheck.isValid ? { borderColor: '#ef4444' } : {}}
                        />
                        <span className="filter-separator">-</span>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={filters.dateEnd || ''}
                            onChange={(e) => handleChange('dateEnd', e.target.value)}
                            title="End Date"
                            style={!rangeCheck.isValid ? { borderColor: '#ef4444' } : {}}
                        />
                    </div>
                    {!rangeCheck.isValid && (
                        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: 500 }}>
                            ⚠️ {rangeCheck.message}
                        </div>
                    )}
                </div>
            )}

            {/* Extra Filters (Status, etc.) passed as children */}
            {children}
        </div>
    );
};

export default GlobalFilter;
