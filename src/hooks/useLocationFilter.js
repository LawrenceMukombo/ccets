import { useState, useMemo } from 'react';

const DEFAULT_HIERARCHY = [
    { id: 'province', name: 'Province' },
    { id: 'district', name: 'District' }
];

const isFilterableLevel = (level) => {
    if (!level || !level.id) return false;
    
    const idLower = level.id.toLowerCase();
    const nameLower = (level.name || '').toLowerCase();
    
    const nonFilteringTerms = [
        'national', 'country', 'facility', 'health_facility', 'healthfacility', 'system'
    ];
    
    const isExcluded = nonFilteringTerms.some(term => 
        idLower.includes(term) || nameLower.includes(term)
    );
    
    if (idLower === 'level_3' && nameLower === 'national') return false;
    if (idLower === 'level_4' && nameLower === 'health facility') return false;
    
    return !isExcluded;
};

/**
 * Hook to manage cascading location filters with dynamic hierarchy support.
 * 
 * @param {Array} data - The dataset to filter.
 * @param {Object} config - configuration including hierarchy and field mapping.
 * @returns {Object} { filters, handleFilterChange, filteredData, options }
 */
export function useLocationFilter(data = [], config = {}) {
    const {
        hierarchy: rawHierarchy = DEFAULT_HIERARCHY,
        facilityField = 'facility_name'
    } = config;

    const hierarchy = useMemo(() => {
        return (rawHierarchy || []).filter(isFilterableLevel);
    }, [rawHierarchy]);

    // Helper to find the actual field in the data object
    const getFieldForLevel = (item, levelId) => {
        if (!item) return null;
        if (levelId in item) return levelId;
        if (levelId + '_name' in item) return levelId + '_name';
        if (levelId + 'Name' in item) return levelId + 'Name';
        return levelId;
    };

    const initialFilters = useMemo(() => {
        const base = { facility: 'all' };
        hierarchy.forEach(level => { base[level.id] = 'all'; });
        return base;
    }, [hierarchy]);

    const [filters, setFilters] = useState(initialFilters);

    // Cascading Options Logic
    const options = useMemo(() => {
        const results = {};
        
        hierarchy.forEach((level, index) => {
            const levelId = level.id;
            
            // Filter data by all parent levels
            let levelData = data;
            for (let i = 0; i < index; i++) {
                const parentLevel = hierarchy[i];
                if (filters[parentLevel.id] !== 'all') {
                    const parentField = getFieldForLevel(data[0], parentLevel.id);
                    levelData = levelData.filter(item => item[parentField] === filters[parentLevel.id]);
                }
            }
            
            // Map field name for the level
            const currentField = getFieldForLevel(data[0], levelId);
            results[levelId + 's'] = [...new Set(levelData.map(item => item[currentField]).filter(Boolean))].sort();
        });

        // Facility Options
        let facilityData = data;
        hierarchy.forEach(level => {
            if (filters[level.id] !== 'all') {
                const field = getFieldForLevel(data[0], level.id);
                facilityData = facilityData.filter(item => item[field] === filters[level.id]);
            }
        });
        results.facilities = [...new Set(facilityData.map(item => item[facilityField]).filter(Boolean))].sort();

        return results;
    }, [data, filters, hierarchy, facilityField]);

    // Filtered Data
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        return data.filter(item => {
            for (const level of hierarchy) {
                if (filters[level.id] !== 'all') {
                    const field = getFieldForLevel(item, level.id);
                    if (item[field] !== filters[level.id]) return false;
                }
            }
            if (filters.facility !== 'all' && item[facilityField] !== filters.facility) return false;
            return true;
        });
    }, [data, filters, hierarchy, facilityField]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };

            // Find index of the changed level
            const levelIndex = hierarchy.findIndex(l => l.id === key);
            
            // Reset all child levels if a parent changed
            if (levelIndex !== -1) {
                for (let i = levelIndex + 1; i < hierarchy.length; i++) {
                    newFilters[hierarchy[i].id] = 'all';
                }
                newFilters.facility = 'all';
            }

            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters(initialFilters);
    };

    return {
        filters,
        setFilters,
        handleFilterChange,
        clearFilters,
        filteredData,
        options
    };
}
