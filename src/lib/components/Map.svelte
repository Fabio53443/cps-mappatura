<script>
    import { onMount, onDestroy } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import { tipoValues, tipoColorMap, getColorForTipo, defaultColor } from '$lib/config/tipoConfig';
    
    export let locations = [];
    export let onMarkerClick = (location) => {};
    export let selectedId = null;
    
    let mapContainer;
    let map;
    let resizeObserver;
    let isMapInitialized = false;
    
    // Track locations for change detection
    let previousLocations = [];
    
    // Watch for changes to selectedId to update styling
    $: if (map && isMapInitialized && map.getSource('locations')) {
        updateSelectedPoint();
    }
    
    // Watch for changes in locations to update the map
    $: if (map && isMapInitialized && 
           JSON.stringify(locations.map(l => l.id).sort()) !== 
           JSON.stringify(previousLocations)) {
        updateMapData();
        previousLocations = locations.map(l => l.id).sort();
    }
    
    function updateMapData() {
        if (!map || !map.getSource('locations')) return;
        
        const geojson = {
            type: 'FeatureCollection',
            features: locations.map(loc => ({
                type: 'Feature',
                properties: { 
                    id: loc.id, 
                    name: loc.name,
                    tipo: loc.tipo || 'default'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [loc.longitude, loc.latitude]
                }
            }))
        };
        
        map.getSource('locations').setData(geojson);
    }
    
    function updateSelectedPoint() {
        if (!map || !map.getSource('locations')) return;
        
        const colorExpression = [
            'case',
            ['==', ['get', 'id'], selectedId],
            '#3b82f6', // Blue for selected point
            [
                'match',
                ['get', 'tipo'],
                // Add each tipo with its color
                ...Object.entries(tipoColorMap).flatMap(([tipo, color]) => [tipo, color]),
                // Default color for any other values
                defaultColor
            ]
        ];
        
        const sizeExpression = [
            'case',
            ['==', ['get', 'id'], selectedId],
            15, // Bigger radius for selected
            10  // Default radius for others
        ];
        
        map.setPaintProperty('unclustered-point', 'circle-color', colorExpression);
        map.setPaintProperty('unclustered-point', 'circle-radius', sizeExpression);
    }
    
    // Export resize method for parent component
    export function resize() {
        if (map) {
            map.resize();
        }
    }
    
    onMount(() => {
        if (!mapContainer) return;
        
        // Create map
        map = new maplibregl.Map({
            container: mapContainer,
            style: 'https://api.maptiler.com/maps/0195b586-7726-7e5a-9540-34bcd35b6fd1/style.json?key=smD4WHiCeTEFri6vpiIm',
            center: [12.4964, 41.9028], // Center of Rome
            zoom: 11,
            minZoom: 8,
            preserveDrawingBuffer: true
        });
        
        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Initialize map once it's loaded
        map.on('load', () => {
            // Create data source with cluster properties
            map.addSource('locations', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: locations.map(loc => ({
                        type: 'Feature',
                        properties: { 
                            id: loc.id, 
                            name: loc.name,
                            tipo: loc.tipo || 'default'
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [loc.longitude, loc.latitude]
                        }
                    }))
                },
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });
            
            // Add cluster circles
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'locations',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#c2273d',
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20, // radius for clusters up to 100 points
                        100,
                        30, // radius for clusters between 100-750 points
                        750,
                        40  // radius for clusters with 750+ points
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            
            // Add cluster counts
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'locations',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DM Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });
            
            // Add unclustered points
            map.addLayer({
                id: 'unclustered-point',
                type: 'circle',
                source: 'locations',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#c2273d',
                    'circle-radius': 10,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            
            // Set cursor to pointer when hovering over clusters or points
            map.on('mouseenter', 'clusters', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', 'clusters', () => {
                map.getCanvas().style.cursor = '';
            });
            
            map.on('mouseenter', 'unclustered-point', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', 'unclustered-point', () => {
                map.getCanvas().style.cursor = '';
            });
            
            // Handle point clicks
            map.on('click', 'unclustered-point', (e) => {
                const id = e.features[0].properties.id;
                const location = locations.find(loc => loc.id === id);
                
                if (location) {
                    selectedId = id;
                    onMarkerClick(location);
                }
            });
            
            // Clean cluster click handler without debug logging
            map.on('click', 'clusters', function(e) {
                const feature = e.features[0];
                const coordinates = feature.geometry.coordinates;
                
                // Change the cursor during processing
                map.getCanvas().style.cursor = 'wait';
                
                try {
                    // Simpler approach - just increase zoom directly
                    const currentZoom = map.getZoom();
                    const newZoom = Math.min(currentZoom + 2, 19); // Zoom in by 2 levels
                    
                    // Use flyTo for reliable animation
                    map.flyTo({
                        center: coordinates,
                        zoom: newZoom,
                        speed: 0.8,
                        essential: true
                    });
                    
                    // Reset cursor when animation completes
                    setTimeout(() => {
                        map.getCanvas().style.cursor = '';
                    }, 300);
                } catch (error) {
                    // Reset cursor if there's an error
                    map.getCanvas().style.cursor = '';
                }
            });
            
            // Update colors based on initial selectedId
            updateSelectedPoint();
            
            // Mark initialization as complete
            isMapInitialized = true;
            previousLocations = locations.map(l => l.id).sort();
        });
        
        // Handle resize events
        resizeObserver = new ResizeObserver(() => {
            if (map) map.resize();
        });
        
        resizeObserver.observe(mapContainer);
        
        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (map) {
                map.remove();
            }
        };
    });
    
    onDestroy(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        if (map) {
            map.remove();
        }
    });
</script>

<div class="map-container w-full h-full" bind:this={mapContainer}></div>

<style>
    .map-container {
        position: relative;
        min-height: 500px;
        border-radius: 8px;
        overflow: hidden;
        will-change: transform;
    }
    
    @media (max-width: 768px) {
        .map-container {
            min-height: 300px;
        }
    }
</style>
