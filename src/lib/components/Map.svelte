<script>
    import { onMount, onDestroy } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import { tipoValues, tipoColorMap, getColorForTipo, defaultColor } from '$lib/config/tipoConfig';
    
    export let locations = [];
    export let onMarkerClick = (location) => {};
    export let selectedId = null;
    export let getMapOffset = () => [0, 0]; // Callback to get current offset based on UI state
    
    let mapContainer;
    let map;
    let resizeObserver;
    let isMapInitialized = false;
    let isAnimating = false; // Track animation state
    
    // Track locations for change detection
    let previousLocations = [];
    
    // Watch for changes to selectedId to update styling
    $: if (map && isMapInitialized && map.getSource('locations') && selectedId !== undefined) {
        updateSelectedPoint();
    }
    
    // Also trigger when selectedId becomes null (deselection)
    $: selectedId, (() => {
        if (map && isMapInitialized && map.getSource('locations')) {
            updateSelectedPoint();
        }
    })();
    
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
        
        // Keep original tipo-based colors for all points
        const colorExpression = [
            'match',
            ['get', 'tipo'],
            // Add each tipo with its color
            ...Object.entries(tipoColorMap).flatMap(([tipo, color]) => [tipo, color]),
            // Default color for any other values
            defaultColor
        ];
        
        // Use -1 as a safe fallback when nothing is selected (no valid ID will match -1)
        const safeSelectedId = selectedId ?? -1;
        
        const sizeExpression = [
            'case',
            ['==', ['get', 'id'], safeSelectedId],
            16, // Bigger radius for selected
            10  // Default radius for others
        ];
        
        const strokeWidthExpression = [
            'case',
            ['==', ['get', 'id'], safeSelectedId],
            5, // Thicker stroke for selected
            2  // Default stroke for others
        ];
        
        const strokeColorExpression = [
            'case',
            ['==', ['get', 'id'], safeSelectedId],
            '#1e293b', // Dark slate stroke for selected (high contrast)
            '#ffffff'  // White stroke for others
        ];
        
        map.setPaintProperty('unclustered-point', 'circle-color', colorExpression);
        map.setPaintProperty('unclustered-point', 'circle-radius', sizeExpression);
        map.setPaintProperty('unclustered-point', 'circle-stroke-width', strokeWidthExpression);
        map.setPaintProperty('unclustered-point', 'circle-stroke-color', strokeColorExpression);
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
    function flyToLocation(longitude, latitude, zoom, offset = [0, 0]) {
        if (!map) return;
        
        // Set animating flag
        isAnimating = true;
        
        // Keep current zoom if not specified
        const targetZoom = zoom || map.getZoom();
        
        // Use flyTo with better easing
        map.flyTo({
            center: [longitude, latitude],
            zoom: targetZoom,
            offset: offset, // [x, y] offset in pixels - positive y moves center up
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
            style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=smD4WHiCeTEFri6vpiIm',
            center: [12.4964, 41.9028], // Center of Rome
            zoom: 11,
            minZoom: 8,
            preserveDrawingBuffer: true,
            renderWorldCopies: false // Prevent duplicate world copies
        });
        
        // Add navigation controls at bottom-right
        map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        
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
                    
                    // Call click handler first so the UI state updates
                    // Then we can get the correct offset based on what panels will be open
                    onMarkerClick(location);
                    
                    // Use a small delay to let the parent update UI state, then fly with correct offset
                    setTimeout(() => {
                        const offset = getMapOffset();
                        flyToLocation(location.longitude, location.latitude, 15, offset);
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
            // Use the offset callback to get current offset based on UI state
            const offset = getMapOffset();
            flyToLocation(selectedLocation.longitude, selectedLocation.latitude, null, offset);
        }
    }
    
    // Method to fly to a specific location (exported for external use)
    // offset: [x, y] in pixels - positive y moves the center point UP on screen
    export function flyTo(longitude, latitude, zoom = 15, offset = [0, 0]) {
        if (!map) return;
        flyToLocation(longitude, latitude, zoom, offset);
    }
    
    // User location marker
    let userMarker = null;
    
    // Method to show user's current location on the map
    export function setUserLocation(latitude, longitude) {
        if (!map) return;
        
        // Remove existing user marker if any
        if (userMarker) {
            userMarker.remove();
        }
        
        // Create a custom element for the user marker
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.innerHTML = `
            <div class="user-marker-pulse"></div>
            <div class="user-marker-dot"></div>
        `;
        
        // Create and add the marker
        userMarker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
        })
            .setLngLat([longitude, latitude])
            .addTo(map);
    }
    
    // Method to remove user location marker
    export function clearUserLocation() {
        if (userMarker) {
            userMarker.remove();
            userMarker = null;
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
    
    /* Custom MapLibre controls styling */
    :global(.maplibregl-ctrl-group) {
        background: white !important;
        border-radius: 9999px !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        border: none !important;
        overflow: hidden;
    }
    
    :global(.maplibregl-ctrl-group button) {
        width: 36px !important;
        height: 36px !important;
        border: none !important;
        background-color: white !important;
        transition: background-color 0.15s ease;
    }
    
    :global(.maplibregl-ctrl-group button:hover) {
        background-color: #f3f4f6 !important;
    }
    
    :global(.maplibregl-ctrl-group button + button) {
        border-top: 1px solid #e5e7eb !important;
    }
    
    /* Keep the default MapLibre icons but style them */
    :global(.maplibregl-ctrl button .maplibregl-ctrl-icon) {
        filter: brightness(0) saturate(100%) invert(21%) sepia(10%) saturate(697%) hue-rotate(182deg) brightness(95%) contrast(93%);
    }
    
    /* Position controls with some margin from edges */
    :global(.maplibregl-ctrl-bottom-right) {
        right: 12px !important;
        bottom: 24px !important;
    }
    
    /* Make the attribution text smaller */
    :global(.maplibregl-ctrl-attrib) {
        font-size: 9px !important;
    }

    @media (max-width: 768px) {
        :global(.maplibregl-ctrl-bottom-right) {
            right: 8px !important;
            bottom: calc(120px + env(safe-area-inset-bottom)) !important; /* Above mobile filter bar */
        }
        
        :global(.maplibregl-ctrl-group button) {
            width: 40px !important;
            height: 40px !important;
        }
        
        :global(.maplibregl-ctrl-attrib) {
            font-size: 8px !important;
        }
    }
    
    /* User location marker styles */
    :global(.user-location-marker) {
        position: relative;
        width: 24px;
        height: 24px;
    }
    
    :global(.user-marker-dot) {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        background-color: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 2;
    }
    
    :global(.user-marker-pulse) {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background-color: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        animation: pulse 2s ease-out infinite;
        z-index: 1;
    }
    
    @keyframes pulse {
        0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
        }
    }
</style>
