<script>
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	
	export let locations = [];
	export let onMarkerClick = (location) => {};
	export let selectedId = null; // Add prop for two-way binding
	
	let mapContainer;
	let map;
	let markers = [];
	let resizeObserver;
	
	// Watch for changes to selectedId from outside the component
	$: if (map && map.getSource('locations')) {
		updateMapPointStyling();
	}
	
	// Function to update map point styling based on selected state
	function updateMapPointStyling() {
		if (!map || !map.getSource('locations')) return;
		
		map.setPaintProperty('unclustered-point', 'circle-color', [
			'case',
			['==', ['get', 'id'], selectedId],
			'#93c5fd', // Light blue for selected point
			'#3b82f6'  // Default blue for unselected points
		]);
		
		map.setPaintProperty('unclustered-point', 'circle-radius', [
			'case',
			['==', ['get', 'id'], selectedId],
			15, // Bigger radius for selected point
			10  // Default radius for unselected points
		]);
	}
	
	onMount(() => {
		if (!mapContainer) return;
		
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://api.maptiler.com/maps/0195b586-7726-7e5a-9540-34bcd35b6fd1/style.json?key=smD4WHiCeTEFri6vpiIm',
			center: [12.4964, 41.9028], // Center of Rome
			zoom: 11 // Closer zoom to see Rome's details
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
			map.addSource('locations', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: locations.map(loc => ({
						type: 'Feature',
						properties: { id: loc.id, name: loc.name },
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
					'circle-color': [
						'step',
						['get', 'point_count'],
						 '#3b82f6', // Primary blue
						100,
						'#10b981', // Green
						750,
						'#f59e0b' // Yellow
					],
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
					// Change circle color based on selection state
					'circle-color': [
						'case',
						['==', ['get', 'id'], selectedId],
						'#93c5fd', // Light blue for selected point
						'#3b82f6'  // Default blue for unselected points
					],
					// Change circle radius based on selection state
					'circle-radius': [
						'case',
						['==', ['get', 'id'], selectedId],
						15, // Bigger radius for selected point
						10  // Default radius for unselected points
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#fff'
				}
			});
			
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
				const clusterId = features[0].properties.cluster_id;
				map.getSource('locations').getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err) return;
					
					map.easeTo({
						center: features[0].geometry.coordinates,
						zoom: zoom
					});
				});
			});
		}
		
		// Create a ResizeObserver to handle map resizing
		resizeObserver = new ResizeObserver(() => {
			if (map) map.resize();
		});
		
		resizeObserver.observe(mapContainer);
		
		return () => {
			map.remove();
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	});
	
	onDestroy(() => {
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
