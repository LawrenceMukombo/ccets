import { useState, useMemo } from 'react';

/**
 * Hook to manage cascading location filters (Region -> Province -> District -> Facility).
 * 
 * @param {Array} data - The dataset to filter.
 * @param {Object} config - specific field names for the dataset.
 * @param {string} config.regionField - Field name for region (default: 'region').
 * @param {string} config.provinceField - Field name for province (default: 'province').
 * @param {string} config.districtField - Field name for district (default: 'district').
 * @param {string} config.facilityField - Field name for facility (default: 'facility_name').
 * @returns {Object} { filters, handleFilterChange, filteredData, options }
 */
export function useLocationFilter(data = [], config = {}) {
    const {
        regionField = 'region',
        provinceField = 'province',
        districtField = 'district',
        facilityField = 'facility_name'
    } = config;

    const [filters, setFilters] = useState({
        region: 'all',
        province: 'all',
        district: 'all',
        facility: 'all'
    });

    // Cascading Options Logic
    const options = useMemo(() => {
        // Unique Regions
        const regions = [...new Set(data.map(item => item[regionField]).filter(Boolean))].sort();

        // Unique Provinces (filtered by selected Region)
        const provinces = [...new Set(data
            .filter(item => filters.region === 'all' || item[regionField] === filters.region)
            .map(item => item[provinceField])
            .filter(Boolean)
        )].sort();

        // Unique Districts (filtered by selected Region AND Province)
        const districts = [...new Set(data
            .filter(item =>
                (filters.region === 'all' || item[regionField] === filters.region) &&
                (filters.province === 'all' || item[provinceField] === filters.province)
            )
            .map(item => item[districtField])
            .filter(Boolean)
        )].sort();

        // Unique Facilities (filtered by selected Region, Province, AND District)
        const facilities = [...new Set(data
            .filter(item =>
                (filters.region === 'all' || item[regionField] === filters.region) &&
                (filters.province === 'all' || item[provinceField] === filters.province) &&
                (filters.district === 'all' || item[districtField] === filters.district)
            )
            .map(item => item[facilityField])
            .filter(Boolean)
        )].sort();

        return { regions, provinces, districts, facilities };
    }, [data, filters.region, filters.province, filters.district, regionField, provinceField, districtField, facilityField]);

    // Filtered Data
    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (filters.region !== 'all' && item[regionField] !== filters.region) return false;
            if (filters.province !== 'all' && item[provinceField] !== filters.province) return false;
            if (filters.district !== 'all' && item[districtField] !== filters.district) return false;
            if (filters.facility !== 'all' && item[facilityField] !== filters.facility) return false;
            return true;
        });
    }, [data, filters, regionField, provinceField, districtField, facilityField]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };

            // Logic to reset child filters when parent changes
            if (key === 'region') {
                newFilters.province = 'all';
                newFilters.district = 'all';
                newFilters.facility = 'all';
            } else if (key === 'province') {
                newFilters.district = 'all';
                newFilters.facility = 'all';

                // Optional: Auto-select region if province belongs to only one region
                if (value !== 'all') {
                    const match = data.find(item => item[provinceField] === value);
                    if (match && match[regionField]) {
                        newFilters.region = match[regionField];
                    }
                }
            } else if (key === 'district') {
                newFilters.facility = 'all';
            }

            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters({
            region: 'all',
            province: 'all',
            district: 'all',
            facility: 'all'
        });
    };

    return {
        filters,
        setFilters, // Exposed in case manual override is needed
        handleFilterChange,
        clearFilters,
        filteredData,
        options
    };
}
