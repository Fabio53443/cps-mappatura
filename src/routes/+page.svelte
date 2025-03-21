<script>
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';
	import LocationSidebar from '$lib/components/LocationSidebar.svelte';
	
	let locations = [];
	let selectedLocation = null;
	let locationImages = [];
	let loading = true;
	let error = null;
	let isSidebarOpen = false;
	
	onMount(async () => {
		try {
			const response = await fetch('/api/locations');
			if (!response.ok) throw new Error('Failed to load locations');
			locations = await response.json();
			
			// Check if there's a location ID in the URL
			const params = new URLSearchParams(window.location.search);
			const locationId = params.get('location');
			if (locationId && locations.length > 0) {
				const location = locations.find(loc => loc.id === parseInt(locationId));
				if (location) {
					handleMarkerClick(location);
				}
			}
			
			// Listen for location selection from the search
			const handleLocationSelected = (event) => {
				if (event.detail && event.detail.location) {
					handleMarkerClick(event.detail.location);
				}
			};
			
			document.addEventListener('location-selected', handleLocationSelected);
			
			return () => {
				document.removeEventListener('location-selected', handleLocationSelected);
			};
		} catch (err) {
			error = err.message;
			console.error('Error:', err);
		} finally {
			loading = false;
		}
	});
	
	async function handleMarkerClick(location) {
		selectedLocation = location;
		isSidebarOpen = true;
		
		try {
			const response = await fetch(`/api/locations/${location.id}/images`);
			if (!response.ok) throw new Error('Failed to load images');
			locationImages = await response.json();
		} catch (err) {
			console.error('Error loading images:', err);
			locationImages = [];
		}
	}
	
	function closeSidebar() {
		isSidebarOpen = false;
	}
</script>

<svelte:head>
	<title>I nostri spazi</title>
</svelte:head>

<div class="relative">
	<h2 class="text-2xl font-bold mb-6">Scopri gli spazi dedicati ai giovani</h2>
	
	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
			<p>{error}</p>
		</div>
	{/if}
	
	{#if loading}
		<div class="flex justify-center items-center h-96">
			<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
		</div>
	{:else}
		<div class="lg:flex gap-4 h-[70vh]">
			<div class={`map-container w-full ${isSidebarOpen ? 'lg:w-2/3' : 'w-full'} ${isSidebarOpen && 'hidden lg:block'}`}>
				<Map 
					{locations} 
					onMarkerClick={handleMarkerClick}
				/>
			</div>
			
			{#if isSidebarOpen}
				<div class="sidebar-container w-full lg:w-1/3 h-full mt-4 lg:mt-0">
					<LocationSidebar 
						location={selectedLocation} 
						images={locationImages} 
						onClose={closeSidebar}
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.map-container {
		transition: width 0.3s ease-in-out;
	}
</style>
