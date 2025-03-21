<script>
	import { onMount, onDestroy, afterUpdate } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import { tipoValues, tipoColorMap, getColorForTipo, defaultColor } from '$lib/config/tipoConfig';
	
	export let locations = [];
	export let onMarkerClick = (location) => {};
	export let selectedId = null; // Add prop for two-way binding
	
	let mapContainer;
	let map;
	let markers = [];
	let resizeObserver;
	let resizeTimeout;
	let previousLocationsLength = 0;
	let previousLocations = [];
	
	// Watch for changes to selectedId from outside the component
	$: if (map && map.getSource('locations')) {
		updateMapPointStyling();
	}
	
	// Watch for changes in the filtered locations
	$: if (map && locations && 
		(previousLocationsLength !== locations.length || 
		JSON.stringify(locations.map(l => l.id).sort()) !== JSON.stringify(previousLocations))) {
		updateLocationsSource();
		previousLocationsLength = locations.length;
		previousLocations = locations.map(l => l.id).sort();
	}
	
	// Function to update the map source with filtered locations
	function updateLocationsSource() {
		if (!map || !map.getSource('locations')) return;
		
		console.log("Updating map with filtered locations:", locations.length);
		
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
	
	// Function to update map point styling based on selected state
	function updateMapPointStyling() {
		if (!map || !map.getSource('locations')) return;
		
		console.log("Updating map point styling");
		
		// Build a simpler match expression
		const matchExpression = ['match', ['get', 'tipo']];
		
		// Add each tipo exactly as it appears in the data
		Object.keys(tipoColorMap).forEach(tipo => {
			matchExpression.push(tipo, tipoColorMap[tipo]);
		});
		
		// Add the default color as the last value in the match expression
		matchExpression.push(defaultColor);
		
		console.log("Match expression:", JSON.stringify(matchExpression));
		
		// Fallback to a simple static color if match expression is too complex
		const circleColor = [
			'case',
			['==', ['get', 'id'], selectedId],
			'#93c5fd', // Light blue for selected point
			['coalesce', 
				// Try to match tipo first
				matchExpression,
				// Fallback to default color if match fails
				['literal', defaultColor]
			]
		];
		
		map.setPaintProperty('unclustered-point', 'circle-color', circleColor);
		
		map.setPaintProperty('unclustered-point', 'circle-radius', [
			'case',
			['==', ['get', 'id'], selectedId],
			15, // Bigger radius for selected point
			10  // Default radius for unselected points
		]);
	}
	
	// Debounce function to handle resize events
	function debounceResize() {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			if (map) map.resize();
		}, 100); // 100ms delay - this should be after most CSS transitions
	}
	
	// Add more detailed debug function
	function logLocationTypes() {
		console.log("Available tipos in locations:", locations.map(loc => loc.tipo));
		console.log("tipoColorMap:", tipoColorMap);
		console.log("Sample location:", locations.length > 0 ? locations[0] : "No locations");
	}
	
	onMount(() => {
		if (!mapContainer) return;
		
		// Log locations tipos for debugging
		logLocationTypes();
		
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://api.maptiler.com/maps/0195b586-7726-7e5a-9540-34bcd35b6fd1/style.json?key=smD4WHiCeTEFri6vpiIm',
			center: [12.4964, 41.9028], // Center of Rome
			zoom: 11, // Closer zoom to see Rome's details
			preserveDrawingBuffer: true // This helps with smoother rendering during resize
		});
		
		// Add navigation controls
		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		
		map.on('load', () => {
			// Make sure the map is fully loaded before adding layers
			if (!map.isStyleLoaded()) {
				map.once('styledata', addLayers);
			} else {
				addLayers();
			}
		});
		
		function addLayers() {
			console.log("Adding map layers, locations count:", locations.length);
			previousLocationsLength = locations.length;
			previousLocations = locations.map(l => l.id).sort();
			
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
			
			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'locations',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#3b82f6', // Always blue for clusters as requested
					'circle-radius': [
						'step',
						['get', 'point_count'],
						20,
						100,
						30,
						750,
						40
					]
				}
			});
			
			map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'locations',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': '{point_count_abbreviated}',
					'text-font': ['DM Sans Bold', 'Arial Unicode MS Bold'],
					'text-size': 12
				}
			});
			
			map.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: 'locations',
				filter: ['!', ['has', 'point_count']],
				paint: {
						// Use a simple static color for initial rendering to debug
					'circle-color': '#3b82f6',
					'circle-radius': 10,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#fff'
				}
			});
			
			// Apply the styling after a short delay to ensure the layer is fully loaded
			setTimeout(() => {
				updateMapPointStyling();
			}, 500);
			
			// Add hover effect
			map.on('mouseenter', 'unclustered-point', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			
			map.on('mouseleave', 'unclustered-point', () => {
				map.getCanvas().style.cursor = '';
			});
			
			map.on('mouseenter', 'clusters', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			
			map.on('mouseleave', 'clusters', () => {
				map.getCanvas().style.cursor = '';
			});
			
			map.on('click', 'unclustered-point', (e) => {
				const coordinates = e.features[0].geometry.coordinates.slice();
				const { id, name } = e.features[0].properties;
				const location = locations.find(loc => loc.id === id);
				
				// Update the selected location
				selectedId = id;
				
				 // Explicitly call the update function to ensure styling changes are applied
				updateMapPointStyling();
				
				// Call the click handler
				onMarkerClick(location);
			});
			
			map.on('click', 'clusters', (e) => {
				const features = map.queryRenderedFeatures(e.point, {
					layers: ['clusters']
					});
					
					if (!features.length || !features[0].properties.cluster_id) return;
					
					const clusterId = features[0].properties.cluster_id;
					
					// Optional: show a loading indicator or cursor change
					map.getCanvas().style.cursor = 'wait';
					
					map.getSource('locations').getClusterExpansionZoom(clusterId, (err, zoom) => {
						// Reset cursor regardless of success or error
						map.getCanvas().style.cursor = '';
						
						if (err) {
							console.error("Error expanding cluster:", err);
							return;
						}
						
						// Smooth animation to the cluster
						map.easeTo({
							center: features[0].geometry.coordinates,
							zoom: zoom,
							duration: 800, // Animation duration in milliseconds
							easing: (t) => t * (2 - t) // Ease-out function for smoother animation
						});
					});
				});
				
				// Add a visual indicator on hover for clusters too
				map.on('mouseenter', 'clusters', () => {
					map.getCanvas().style.cursor = 'pointer';
				});
				
				map.on('mouseleave', 'clusters', () => {
					map.getCanvas().style.cursor = '';
				});
		}
		
		// Create a ResizeObserver to handle map resizing with debouncing
		resizeObserver = new ResizeObserver(() => {
			debounceResize();
		});
		
		resizeObserver.observe(mapContainer);
		
		return () => {
			if (resizeTimeout) clearTimeout(resizeTimeout);
			map.remove();
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	});
	
	onDestroy(() => {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		if (map) map.remove();
		if (resizeObserver) {
			resizeObserver.disconnect();
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
		will-change: transform; /* Helps with GPU acceleration */
	}
	
	:global(.custom-popup) {
		border-radius: 8px;
		padding: 10px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
	
	@media (max-width: 768px) {
		.map-container {
			min-height: 300px;
		}
	}
</style>
