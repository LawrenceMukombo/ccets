import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Normalizes strings for robust matching (e.g., 'North-Western' vs 'North Western')
 */
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[-\s]/g, '');
};

/**
 * Helper to find a GeoJSON feature by its name property.
 */
const findFeatureByName = (featureCollection, targetName) => {
    if (!featureCollection || !featureCollection.features || !targetName || targetName === 'all') {
        return null;
    }

    const normalizedTarget = normalizeString(targetName);

    return featureCollection.features.find(feature => {
        const props = feature.properties || {};
        const possibleNames = [
            props.name, props.NAME, props.NAME_1, props.NAME_2, 
            props.PROVINCE, props.DISTRICT, props.ADM1_EN, props.ADM2_EN, 
            props.adm1_name, props.adm2_name
        ];

        return possibleNames.some(name => name && normalizeString(name) === normalizedTarget);
    });
};

/**
 * React-Leaflet component that automatically adjusts map bounds
 * based on the hierarchy configuration and active filters.
 */
export default function MapBoundsFitter({ 
    filters, 
    boundaries, // { levelId: geojson }
    hierarchy, // [{ id: 'province', ... }, { id: 'district', ... }]
    defaultCenter, 
    defaultZoom 
}) {
    const map = useMap();

    useEffect(() => {
        if (!hierarchy || !boundaries) return;

        let targetFeature = null;

        // Iterate through hierarchy from most specific to least specific (reverse)
        // to find the first level that has a filter selected.
        const reversedHierarchy = [...hierarchy].reverse();
        
        for (const level of reversedHierarchy) {
            const filterValue = filters[level.id];
            if (filterValue && filterValue !== 'all') {
                targetFeature = findFeatureByName(boundaries[level.id], filterValue);
                if (targetFeature) break; // Found the most specific shape
            }
        }

        if (targetFeature) {
            try {
                const geoJsonLayer = L.geoJSON(targetFeature);
                const bounds = geoJsonLayer.getBounds();
                
                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [40, 40],
                        animate: true,
                        duration: 1.2
                    });
                }
            } catch (err) {
                console.error("MapBoundsFitter: Error calculating bounds:", err);
            }
        } else {
            // If no filters are active, check if we should reset to default
            const anyFilterActive = hierarchy.some(level => filters[level.id] && filters[level.id] !== 'all');
            if (!anyFilterActive && defaultCenter) {
                map.setView(defaultCenter, defaultZoom || 8, { animate: true });
            }
        }
    }, [filters, boundaries, hierarchy, map, defaultCenter, defaultZoom]);

    return null;
}
