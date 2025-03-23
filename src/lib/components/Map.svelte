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
    let isAnimating = false; // Track animation state
    
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
    
    // Improved resize method with debouncing to prevent flashing
    let resizeTimeout;
    export function resize() {
        if (!map) return;
        
        // Clear any existing resize timeout
        clearTimeout(resizeTimeout);
        
        // Don't resize during animations
        if (isAnimating) return;
        
        // Delay the resize slightly to let DOM updates complete
        resizeTimeout = setTimeout(() => {
            // Preserve the current center and zoom
            const center = map.getCenter();
            const zoom = map.getZoom();
            
            // Perform the resize
            map.resize();
            
            // Restore view state after resize
            map.jumpTo({
                center: center,
                zoom: zoom
            });
        }, 50);
    }
    
    // Smooth fly to a location with proper animation handling
    function flyToLocation(longitude, latitude, zoom) {
        if (!map) return;
        
        // Set animating flag
        isAnimating = true;
        
        // Keep current zoom if not specified
        const targetZoom = zoom || map.getZoom();
        
        // Use flyTo with better easing
        map.flyTo({
            center: [longitude, latitude],
            zoom: targetZoom,
            speed: 0.8, // slower for smoother animation
            curve: 1.5, // more natural animation curve
            essential: true
        });
        
        // Clear animation flag when done
        map.once('moveend', () => {
            isAnimating = false;
        });
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
            preserveDrawingBuffer: true,
            renderWorldCopies: false // Prevent duplicate world copies
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
            
            // Improved point click handler
            map.on('click', 'unclustered-point', (e) => {
                const id = e.features[0].properties.id;
                const location = locations.find(loc => loc.id === id);
                
                if (location) {
                    // Set selectedId to trigger styling update
                    selectedId = id;
                    
                    // Fly to location first with proper animation
                    flyToLocation(location.longitude, location.latitude, 13);
                    
                    // Call click handler after the animation has started
                    // This prevents layout changes during animation start
                    setTimeout(() => {
                        onMarkerClick(location);
                    }, 50);
                }
            });
            
            // Improved cluster click handler
            map.on('click', 'clusters', function(e) {
                const feature = e.features[0];
                const coordinates = feature.geometry.coordinates;
                
                // Change the cursor during processing
                map.getCanvas().style.cursor = 'wait';
                
                try {
                    // Get current zoom and calculate target zoom
                    const currentZoom = map.getZoom();
                    const newZoom = Math.min(currentZoom + 2, 19); // Zoom in by 2 levels
                    
                    // Set animation flag
                    isAnimating = true;
                    
                    // Use flyTo with better animation parameters
                    map.flyTo({
                        center: coordinates,
                        zoom: newZoom,
                        speed: 0.7,
                        curve: 1.5,
                        essential: true
                    });
                    
                    // Reset cursor when animation completes
                    map.once('moveend', () => {
                        map.getCanvas().style.cursor = '';
                        isAnimating = false;
                    });
                } catch (error) {
                    // Reset cursor and animation flag if there's an error
                    map.getCanvas().style.cursor = '';
                    isAnimating = false;
                }
            });
            
            // Update colors based on initial selectedId
            updateSelectedPoint();
            
            // Mark initialization as complete
            isMapInitialized = true;
            previousLocations = locations.map(l => l.id).sort();
        });
        
        // Improved resize observer with debouncing
        resizeObserver = new ResizeObserver(() => {
            if (!map || isAnimating) return; // Skip during animations
            
            // Debounce resize events to prevent rapid consecutive calls
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (map) map.resize();
            }, 100);
        });
        
        resizeObserver.observe(mapContainer);
        
        return () => {
            clearTimeout(resizeTimeout);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (map) {
                map.remove();
            }
        };
    });
    
    onDestroy(() => {
        clearTimeout(resizeTimeout);
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        if (map) {
            map.remove();
        }
    });
    
    // Method to center on selected location if available
    export function centerOnSelected() {
        if (!map || !selectedId) return;
        
        const selectedLocation = locations.find(loc => loc.id === selectedId);
        if (selectedLocation) {
            flyToLocation(selectedLocation.longitude, selectedLocation.latitude);
        }
    }
</script>

<div class="map-container w-full h-full" bind:this={mapContainer}></div>

<style>
    .map-container {
        position: relative;
        min-height: 500px;
        border-radius: 8px;
        overflow: hidden;
        will-change: transform;
        /* Add hardware acceleration */
        transform: translateZ(0);
        backface-visibility: hidden;
    }
    
    @media (max-width: 768px) {
        .map-container {
            min-height: 300px;
        }
    }
</style>
