import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Distance Measurement Tool (Stable - No Jumping)
function DistanceMeasurementTool() {
    const map = useMap();

    useEffect(() => {
        let measuring = false;
        let markers = [];
        let polyline = null;
        let tooltip = null;

        const measureButton = L.control({ position: 'topleft' });

        measureButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `<a href="#" title="Measure distance (Click to start/stop)" class="measure-button" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px; background: white;">📏</a>`;

            const link = div.querySelector('a');

            // Prevent map clicks when clicking the button
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            link.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                measuring = !measuring;
                link.style.background = measuring ? '#3b82f6' : 'white';
                link.style.color = measuring ? 'white' : 'black';

                if (!measuring) {
                    // Clear measurements
                    markers.forEach(m => map.removeLayer(m));
                    if (polyline) map.removeLayer(polyline);
                    if (tooltip) map.removeLayer(tooltip);
                    markers = [];
                    polyline = null;
                    tooltip = null;
                }
            };

            return div;
        };

        measureButton.addTo(map);

        const onMapClick = (e) => {
            if (!measuring) return;

            // Add marker
            const marker = L.circleMarker(e.latlng, {
                radius: 5,
                fillColor: '#3b82f6',
                color: 'white',
                weight: 2,
                fillOpacity: 1
            }).addTo(map);

            markers.push(marker);

            // Calculate and display distance
            if (markers.length > 1) {
                const latlngs = markers.map(m => m.getLatLng());

                // Remove old polyline
                if (polyline) map.removeLayer(polyline);

                // Draw new polyline
                polyline = L.polyline(latlngs, {
                    color: '#3b82f6',
                    weight: 3,
                    dashArray: '5, 10'
                }).addTo(map);

                // Calculate total distance
                let totalDistance = 0;
                for (let i = 0; i < latlngs.length - 1; i++) {
                    totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
                }

                // Format distance
                const distanceText = totalDistance >= 1000
                    ? `${(totalDistance / 1000).toFixed(2)} km`
                    : `${totalDistance.toFixed(0)} m`;

                // Remove old tooltip
                if (tooltip) map.removeLayer(tooltip);

                // Add tooltip at last point
                tooltip = L.tooltip({
                    permanent: true,
                    direction: 'top',
                    className: 'distance-tooltip'
                })
                    .setLatLng(e.latlng)
                    .setContent(`Total: ${distanceText}`)
                    .addTo(map);
            }
        };

        map.on('click', onMapClick);

        return () => {
            map.off('click', onMapClick);
            measureButton.remove();
            markers.forEach(m => map.removeLayer(m));
            if (polyline) map.removeLayer(polyline);
            if (tooltip) map.removeLayer(tooltip);
        };
    }, [map]);

    return null;
}

export default DistanceMeasurementTool;
