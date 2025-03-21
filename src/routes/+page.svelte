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
	
	// Search functionality
	let searchTerm = '';
	let searchResults = [];
	let showSearchResults = false;
	let searchInput;
	
	function handleSearch(event) {
		searchTerm = event.target.value;
		
		if (searchTerm.length < 2) {
			searchResults = [];
			showSearchResults = false;
			return;
		}
		
		// Filter locations that match the search term
		const term = searchTerm.toLowerCase();
		searchResults = locations
			.filter(loc => 
				loc.name.toLowerCase().includes(term) || 
				(loc.description && loc.description.toLowerCase().includes(term)) ||
				(loc.street && loc.street.toLowerCase().includes(term)) ||
				(loc.municipio && loc.municipio.toLowerCase().includes(term))
			)
			.slice(0, 5); // Limit to top 5 results
			
		showSearchResults = searchResults.length > 0;
	}
	
	function selectLocation(location) {
		searchTerm = location.name;
		showSearchResults = false;
		handleMarkerClick(location);
	}
	
	function handleClickOutside(event) {
		if (searchInput && !searchInput.contains(event.target) && !event.target.closest('.search-results')) {
			showSearchResults = false;
		}
	}
	
	onMount(async () => {
		console.log('Component mounted, fetching locations...');
		try {
			const response = await fetch('/api/locations');
			if (!response.ok) throw new Error('Failed to load locations');
			locations = await response.json();
			console.log('Locations loaded:', locations.length);
			
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
			document.addEventListener('click', handleClickOutside);
			
			return () => {
				document.removeEventListener('location-selected', handleLocationSelected);
				document.removeEventListener('click', handleClickOutside);
			};
		} catch (err) {
			error = err.message;
			console.error('Error loading locations:', err);
		} finally {
			// Ensure loading is set to false
			loading = false;
			console.log('Loading complete, loading state:', loading);
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
	<h2 class="text-2xl font-bold mb-4">Scopri gli spazi dedicati ai giovani</h2>
	
	<!-- Search bar -->
	<div class="relative mb-6 max-w-xl">
		<input 
			bind:this={searchInput}
			type="text" 
			placeholder="Cerca per nome, indirizzo o municipio..." 
			class="w-full px-4 py-2 border border-gray-300 rounded-md"
			value={searchTerm}
			on:input={handleSearch}
			on:focus={() => showSearchResults = searchResults.length > 0}
		/>
		
		{#if showSearchResults}
			<div class="search-results absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden">
				{#each searchResults as result}
					<button 
						class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex flex-col"
						on:click={() => selectLocation(result)}
					>
						<span class="font-medium">{result.name}</span>
						{#if result.description}
							<span class="text-xs text-gray-500 truncate">{result.description}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	
	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
			<p>{error}</p>
		</div>
	{/if}
	
	{#if loading}
		<div class="flex justify-center items-center h-96">
			<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			<p class="ml-2">Caricamento in corso...</p>
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
	
	.search-results {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e2e8f0;
	}
</style>
