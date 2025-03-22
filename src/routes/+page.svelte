<script>
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';
	import LocationSidebar from '$lib/components/LocationSidebar.svelte';
	import { tipoValues } from '$lib/config/tipoConfig';
	import { getColorForTipo } from '$lib/config/tipoConfig';
	
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
	
	// Filter functionality
	let allLocations = []; // Store all locations unfiltered
	let selectedTipos = [];
	let selectedMunicipios = [];
	let showTipoDropdown = false;
	let showMunicipioDropdown = false;
	let municipioValues = []; // Will be populated from data
	
	// Apply all filters (search + tipo + municipio)
	$: filteredLocations = applyFilters(allLocations, searchTerm, selectedTipos, selectedMunicipios);
	
	// Always update the locations displayed on map when filters change
	$: locations = filteredLocations;
	
	// Get unique municipio values from the data
	function extractMunicipioValues(locations) {
		const uniqueMunicipios = new Set();
		locations.forEach(loc => {
			if (loc.municipio) uniqueMunicipios.add(loc.municipio);
		});
		// Roman numerals are already stored in the database (I through XV)
		return Array.from(uniqueMunicipios).sort((a, b) => {
			// Convert Roman numerals to numbers for proper sorting
			const romanToNum = (roman) => {
				const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
				let num = 0;
				for (let i = 0; i < roman.length; i++) {
					const current = map[roman[i]];
					const next = map[roman[i + 1]];
					if (next && current < next) {
						num -= current;
					} else {
						num += current;
					}
				}
				return num;
			};
			return romanToNum(a) - romanToNum(b);
		});
	}
	
	// Apply all filters
	function applyFilters(locations, term, tipos, municipios) {
		let result = [...locations];
		
		// Apply search term filter
		if (term && term.length >= 2) {
			const searchLower = term.toLowerCase();
			result = result.filter(loc => 
				loc.name.toLowerCase().includes(searchLower) || 
				(loc.description && loc.description.toLowerCase().includes(searchLower)) ||
				(loc.street && loc.street.toLowerCase().includes(searchLower)) ||
				(loc.municipio && loc.municipio.toLowerCase().includes(searchLower))
			);
		}
		
		// Apply tipo filter
		if (tipos.length > 0) {
			result = result.filter(loc => tipos.includes(loc.tipo));
		}
		
		// Apply municipio filter
		if (municipios.length > 0) {
			result = result.filter(loc => municipios.includes(loc.municipio));
		}
		
		return result;
	}
	
	// Toggle tipo selection
	function toggleTipo(tipo) {
		if (selectedTipos.includes(tipo)) {
			selectedTipos = selectedTipos.filter(t => t !== tipo);
		} else {
			selectedTipos = [...selectedTipos, tipo];
		}
	}
	
	// Toggle municipio selection
	function toggleMunicipio(municipio) {
		if (selectedMunicipios.includes(municipio)) {
			selectedMunicipios = selectedMunicipios.filter(m => m !== municipio);
		} else {
			selectedMunicipios = [...selectedMunicipios, municipio];
		}
	}
	
	// Clear all filters
	function clearFilters() {
		selectedTipos = [];
		selectedMunicipios = [];
		searchTerm = '';
		showSearchResults = false;
	}
	
	function handleSearch(event) {
		searchTerm = event.target.value;
		
		if (searchTerm.length < 2) {
			searchResults = [];
			showSearchResults = false;
			return;
		}
		
		// Filter locations that match the search term
		const term = searchTerm.toLowerCase();
		searchResults = allLocations
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
		
		// Close tipo dropdown if clicking outside
		if (!event.target.closest('.tipo-dropdown') && !event.target.closest('.tipo-dropdown-button')) {
			showTipoDropdown = false;
		}
		
		// Close municipio dropdown if clicking outside
		if (!event.target.closest('.municipio-dropdown') && !event.target.closest('.municipio-dropdown-button')) {
			showMunicipioDropdown = false;
		}
	}
	
	// Back to top functionality
	let showBackToTop = false;
	
	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}
	
	function handleScroll() {
		showBackToTop = window.scrollY > 30;
	}
	
	onMount(async () => {
		console.log('Component mounted, fetching locations...');
		try {
			const response = await fetch('/api/locations');
			if (!response.ok) throw new Error('Failed to load locations');
			allLocations = await response.json();
			locations = allLocations; // Initially show all locations
			console.log('Locations loaded:', locations.length);
			
			// Extract unique municipio values
			municipioValues = extractMunicipioValues(allLocations);
			
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
			window.addEventListener('scroll', handleScroll);
			
			return () => {
				document.removeEventListener('location-selected', handleLocationSelected);
				document.removeEventListener('click', handleClickOutside);
				window.removeEventListener('scroll', handleScroll);
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
	
	// Reference to content container
	let contentContainer;
	
	// Function to filter by a specific tipo
	function filterByTipo(tipo) {
		// Reset any other filters first
		selectedMunicipios = [];
		searchTerm = '';
		showSearchResults = false;
		
		// Apply the selected tipo filter
		selectedTipos = [tipo];
		
		// If we're in list view, switch to map view to see the filtered results better
		if (viewMode === 'list') {
			viewMode = 'map';
		}
		
		// If sidebar is open, close it to see the filtered results
		isSidebarOpen = false;
	}
	
	async function handleMarkerClick(location) {
		selectedLocation = location;
		isSidebarOpen = true;
		
			// Only scroll to the top in list view if it's not triggered by clicking a card
		if (viewMode === 'list') {
			// Don't scroll at all for card clicks - just load the sidebar
			// The setTimeout block has been removed to prevent unwanted scrolling
		}
		
		try {
			const response = await fetch(`/api/locations/${location.id}/images`);
			if (!response.ok) throw new Error('Failed to load images');
			locationImages = await response.json();
		} catch (err) {
			console.error('Error loading images:', err);
			locationImages = [];
		}
	}
	
	// Handle tipo filter event from LocationSidebar
	function handleTipoFilter(event) {
		if (event.detail && event.detail.tipo) {
			filterByTipo(event.detail.tipo);
		}
	}
	
	function closeSidebar() {
		isSidebarOpen = false;
	}

	// View mode (map or list)
	let viewMode = 'map';
	// Reference to map component
	let mapComponent;
	
	function toggleViewMode() {
		viewMode = viewMode === 'map' ? 'list' : 'map';
	}
	
	// Reactive statement to handle map resize when switching back to map view
	$: if (viewMode === 'map' && mapComponent) {
		// Use requestAnimationFrame to ensure DOM is updated before resizing
		requestAnimationFrame(() => {
			if (mapComponent.resize) {
				mapComponent.resize();
			}
		});
	}
</script>

<svelte:head>
	<title>I nostri spazi</title>
</svelte:head>

<div class="relative">
	<h2 class="text-2xl font-bold mb-4">Scopri gli spazi dedicati ai giovani</h2>
	
	<!-- View Mode Toggle - moved to top and aligned right -->
	<div class="mb-4 flex justify-end">
		<div class="view-toggle-container inline-flex bg-gray-200 p-1 rounded-full shadow-sm">
			<button 
				class="view-toggle-btn py-1 px-4 rounded-full text-sm font-medium transition-all {viewMode === 'map' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}"
				on:click={() => viewMode = 'map'}
				aria-label="Vista mappa"
			>
				<div class="flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
					</svg>
					Mappa
				</div>
			</button>
			<button 
				class="view-toggle-btn py-1 px-4 rounded-full text-sm font-medium transition-all {viewMode === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}"
				on:click={() => viewMode = 'list'}
				aria-label="Vista elenco"
			>
				<div class="flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					Elenco
				</div>
			</button>
		</div>
	</div>
	
	<!-- Search and filter bar -->
	<div class="flex flex-col lg:flex-row gap-3 mb-2">
		<!-- Search bar - removed max-w-xl to allow full expansion -->
		<div class="relative flex-grow">
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
		
		<!-- Filter dropdowns - added whitespace-nowrap to prevent wrapping -->
		<div class="flex gap-2 whitespace-nowrap">
			<!-- Tipo filter dropdown -->
			<div class="relative">
				<button 
					class="tipo-dropdown-button flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
					on:click={() => showTipoDropdown = !showTipoDropdown}
				>
					<span>Tipo</span>
					{#if selectedTipos.length > 0}
						<span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
							{selectedTipos.length}
						</span>
					{/if}
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if showTipoDropdown}
					<div class="tipo-dropdown absolute mt-1 z-20 w-64 bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
						<div class="p-2 border-b border-gray-200 flex justify-between items-center">
							<span class="font-medium">Filtra per tipo</span>
							{#if selectedTipos.length > 0}
								<button 
									class="text-xs text-blue-500 hover:text-blue-700" 
									on:click={() => selectedTipos = []}
								>
									Cancella
								</button>
							{/if}
						</div>
						<div class="max-h-60 overflow-y-auto p-2">
							{#each tipoValues as tipo}
								<div class="flex items-center py-1">
									<input 
										type="checkbox" 
										id={`tipo-${tipo}`} 
										class="mr-2"
										checked={selectedTipos.includes(tipo)}
										on:change={() => toggleTipo(tipo)}
									/>
									<label for={`tipo-${tipo}`} class="select-none text-sm">{tipo}</label>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Municipio filter dropdown -->
			<div class="relative">
				<button 
					class="municipio-dropdown-button flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
					on:click={() => showMunicipioDropdown = !showMunicipioDropdown}
				>
					<span>Municipio</span>
					{#if selectedMunicipios.length > 0}
						<span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
							{selectedMunicipios.length}
						</span>
					{/if}
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if showMunicipioDropdown}
					<div class="municipio-dropdown absolute mt-1 z-20 w-64 bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
						<div class="p-2 border-b border-gray-200 flex justify-between items-center">
							<span class="font-medium">Filtra per municipio</span>
							{#if selectedMunicipios.length > 0}
								<button 
									class="text-xs text-blue-500 hover:text-blue-700" 
									on:click={() => selectedMunicipios = []}
								>
									Cancella
								</button>
							{/if}
						</div>
						<div class="max-h-60 overflow-y-auto p-2">
							{#each municipioValues as municipio}
								<div class="flex items-center py-1">
									<input 
										type="checkbox" 
										id={`municipio-${municipio}`} 
										class="mr-2"
										checked={selectedMunicipios.includes(municipio)}
										on:change={() => toggleMunicipio(municipio)}
									/>
									<label for={`municipio-${municipio}`} class="select-none text-sm">Municipio {municipio}</label>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Clear filters button (shown only when filters are active) -->
			{#if selectedTipos.length > 0 || selectedMunicipios.length > 0 || searchTerm}
				<button 
					class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors flex items-center"
					on:click={clearFilters}
				>
					<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Cancella filtri
				</button>
			{/if}
		</div>
		
	</div>

	<!-- Results counter moved here, under the search bar -->
	<div class="mb-4">
		<div class="text-sm text-gray-500">
			{locations.length} {locations.length === 1 ? 'spazio trovato' : 'spazi trovati'}
			{#if locations.length !== allLocations.length}
				<span> (su {allLocations.length} totali)</span>
			{/if}
		</div>
	</div>

	<div class="relative" bind:this={contentContainer}>
		
		<div class="lg:flex gap-4 relative">
			<!-- Map View - Always in DOM but hidden when in list view -->
			<div class={`map-container w-full ${isSidebarOpen ? 'lg:w-2/3' : 'w-full'} ${isSidebarOpen && 'hidden lg:block'} ${viewMode !== 'map' ? 'hidden lg:block' : ''} sticky-top`}>
				<Map 
					bind:this={mapComponent}
					{locations} 
					onMarkerClick={handleMarkerClick}
					selectedId={selectedLocation?.id}
				/>
			</div>
			
			<!-- List View -->
			{#if viewMode === 'list'}
				<div class={`locations-list-container w-full ${isSidebarOpen ? 'lg:w-2/3' : 'w-full'} ${isSidebarOpen && 'hidden lg:block'} lg:pr-4`}>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
						{#each locations as location}
							<div 
								class="location-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all cursor-pointer relative"
								on:click={() => handleMarkerClick(location)}
							>
								<div class="p-4">
									<div class="flex justify-between items-start">
										<h3 class="text-lg font-bold mb-1 text-gray-800">{location.name}</h3>
										{#if location === selectedLocation}
											<div class="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full pulse-animation"></div>
										{/if}
									</div>
									
									{#if location.tipo}
										<button 
											class="tipo-pill inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium mb-2 hover:opacity-90 transition-opacity focus:outline-none"
											style="background-color: {getColorForTipo(location.tipo)};"
											on:click|stopPropagation={() => filterByTipo(location.tipo)}
											aria-label="Filtra per {location.tipo}"
										>
											{location.tipo}
										</button>
									{/if}
									
									{#if location.street}
										<div class="flex items-start mb-2 text-sm text-gray-600">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
											</svg>
											<div>
												<p class="line-clamp-1">{location.street}</p>
												{#if location.municipio}
													<p class="text-xs">Municipio {location.municipio}</p>
												{/if}
											</div>
										</div>
									{/if}
									
									{#if location.description}
										<p class="text-sm text-gray-600 line-clamp-2 mb-2">{location.description}</p>
									{/if}
									
									<button class="text-sm text-blue-600 hover:text-blue-800 mt-1 flex items-center">
										Dettagli
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
					
					{#if locations.length === 0}
						<div class="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<p class="text-lg font-medium">Nessun risultato trovato</p>
							<p class="mt-1">Prova a modificare i filtri o la ricerca</p>
							<button 
								class="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors"
								on:click={clearFilters}
							>
								Cancella filtri
							</button>
						</div>
					{/if}
				</div>
			{/if}
			
			{#if isSidebarOpen}
				<div class="sidebar-container w-full lg:w-1/3 h-full mt-4 lg:mt-0 mobile-animate-in sticky-top">
					<LocationSidebar 
						location={selectedLocation} 
						images={locationImages} 
						onClose={closeSidebar}
						on:filter-tipo={handleTipoFilter}
					/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Filter summary (shows active filters) -->
	{#if selectedTipos.length > 0 || selectedMunicipios.length > 0}
		<div class="mb-4 flex flex-wrap gap-2">
			{#each selectedTipos as tipo}
				<div class="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
					<span>{tipo}</span>
					<button 
						class="ml-1" 
						on:click={() => toggleTipo(tipo)} 
						aria-label={`Remove ${tipo} filter`}
					>
						<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			{/each}
			
			{#each selectedMunicipios as municipio}
				<div class="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
					<span>Municipio {municipio}</span>
					<button 
						class="ml-1" 
						on:click={() => toggleMunicipio(municipio)} 
						aria-label={`Remove Municipio ${municipio} filter`}
					>
						<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

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
	{/if}
</div>

<!-- Back to top button -->
{#if showBackToTop}
	<button 
		class="back-to-top-btn fixed bottom-6 right-6 bg-custom-blue hover:bg-custom-blue-dark text-white rounded-full p-3 shadow-lg transition-all z-30 focus:outline-none focus:ring-2 focus:ring-custom-blue-light"
		on:click={scrollToTop}
		aria-label="Torna in cima"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
		</svg>
	</button>
{/if}

<style>
	.map-container {
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: width;
		transform: translateZ(0);
		min-height: 500px;
	}
	
	.sidebar-container {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform, opacity;
		transform: translateZ(0);
	}
	
	.search-results {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e2e8f0;
	}
	
	/* Mobile animations */
	@media (max-width: 1023px) {
		.mobile-animate-in {
			animation: slideInUp 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
			will-change: transform, opacity;
		}
		
		@keyframes slideInUp {
			from {
				transform: translateY(20px);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}
	}
	
	/* Location card animations */
	.location-card {
		transition: all 0.2s ease-in-out;
		animation: fadeIn 0.5s ease-out forwards;
	}
	
	.location-card:hover {
		transform: translateY(-2px);
	}
	
	.location-card:nth-child(1) { animation-delay: 0.05s; }
	.location-card:nth-child(2) { animation-delay: 0.1s; }
	.location-card:nth-child(3) { animation-delay: 0.15s; }
	.location-card:nth-child(4) { animation-delay: 0.2s; }
	.location-card:nth-child(5) { animation-delay: 0.25s; }
	
	/* View toggle pill styling */
	.view-toggle-container {
		transition: background-color 0.3s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12); 
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}
	
	.view-toggle-btn {
		min-width: 90px;
	}
	
	/* Pulse animation for selected location */
	.pulse-animation {
		animation: pulse 1.5s infinite;
	}
	
	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
		}
		70% {
			box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
		}
	}
	
	/* Line clamp utility for truncating text */
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	/* Dropdown styles */
	.municipio-dropdown, .tipo-dropdown {
		max-height: 300px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
	
	/* Custom checkbox styles */
	input[type="checkbox"] {
		accent-color: #c2273d;
		width: 16px;
		height: 16px;
	}
	
	/* Back to top button animation */
	.back-to-top-btn {
		animation: fadeIn 0.3s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Custom color for back to top button */
	.bg-custom-blue {
		background-color: #3059a7;
	}
	
	.bg-custom-blue-dark:hover {
		background-color: #254780; /* Darker shade for hover */
	}
	
	.focus\:ring-custom-blue-light:focus {
		--tw-ring-color: rgba(48, 89, 167, 0.5); /* Lighter version with opacity for focus ring */
	}

	/* Sticky positioning - with higher z-index */
	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background-color: transparent;
	}
	
	.sticky-top {
		position: sticky;
		top: 4rem; /* Adjust based on your header height */
		height: calc(100vh - 8rem); /* Adjust to leave space for header and some padding */
		overflow-y: auto;
	}
	
	/* Ensure list container can scroll independently */
	.locations-list-container {
		max-height: calc(100vh - 8rem);
		overflow-y: auto;
		padding-bottom: 2rem;
	}
	
	/* When both list and map are visible, adjust heights */
	@media (min-width: 1024px) {
		.locations-list-container {
			margin-top: 0;
		}
		
		.sticky-top {
			align-self: flex-start;
		}
	}

	/* Make tipo pills interactive */
	.tipo-pill {
		cursor: pointer;
	}
</style>
