<script>
	import '../app.css';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	
	let showMobileMenu = $state(false);
	let locations = $state([]);
	let searchTerm = $state('');
	let searchResults = $state([]);
	let showSearchResults = $state(false);
	let searchInputDesktop;
	let searchInputMobile;
	
	function toggleMobileMenu() {
		showMobileMenu = !showMobileMenu;
	}
	
	async function fetchLocations() {
		try {
			const response = await fetch('/api/locations');
			if (response.ok) {
				locations = await response.json();
			}
		} catch (error) {
			console.error('Error fetching locations:', error);
		}
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
		searchResults = locations
			.filter(loc => 
				loc.name.toLowerCase().includes(term) || 
				(loc.description && loc.description.toLowerCase().includes(term))
			)
			.slice(0, 5); // Limit to top 5 results
			
		showSearchResults = searchResults.length > 0;
	}
	
	function selectLocation(location) {
		searchTerm = location.name;
		showSearchResults = false;
		
		 // Navigate to the main page and open the selected location
		if (window.location.pathname !== '/') {
			window.location.href = `/?location=${location.id}`;
		} else {
			// If already on the main page, dispatch a custom event to notify the page component
			const event = new CustomEvent('location-selected', { 
				detail: { location },
				bubbles: true 
			});
			document.dispatchEvent(event);
		}
	}
	
	function handleClickOutside(event) {
		const isClickOutsideSearch = 
			(!searchInputDesktop || !searchInputDesktop.contains(event.target)) &&
			(!searchInputMobile || !searchInputMobile.contains(event.target));
		
		if (isClickOutsideSearch && !event.target.closest('.search-results')) {
			showSearchResults = false;
		}
	}
	
	onMount(() => {
		fetchLocations();
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="min-h-screen flex flex-col">
	<header class="py-3">
		<div class="container mx-auto px-4">
			<div class="flex justify-between items-center">
				<h1 class="text-2xl font-bold">CPS Mappatura</h1>
				
				<div class="hidden md:block relative">
					<input 
						bind:this={searchInputDesktop}
						type="text" 
						placeholder="Cerca per nome, CAP o indirizzo..." 
						class="search-input"
						bind:value={searchTerm}
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
				
				<button 
					class="block md:hidden bg-gray-100 p-2 rounded-md" 
					on:click={toggleMobileMenu}
					aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
					</svg>
				</button>
			</div>
			
			{#if showMobileMenu}
				<div class="mt-4 md:hidden relative">
					<input 
						bind:this={searchInputMobile}
						type="text" 
						placeholder="Cerca per nome, CAP o indirizzo..." 
						class="w-full mb-3"
						bind:value={searchTerm}
						on:input={handleSearch}
						on:focus={() => showSearchResults = searchResults.length > 0}
					/>
					
					{#if showSearchResults}
						<div class="search-results absolute z-20 w-full bg-white shadow-lg rounded-md overflow-hidden">
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
			{/if}
		</div>
	</header>
	
	<main class="container mx-auto px-4 py-6 flex-grow">
		{@render children()}
	</main>
	
	<footer class="py-4">
		<div class="container mx-auto px-4 text-center text-sm">
			&copy; {new Date().getFullYear()} CPS Mappatura
		</div>
	</footer>
</div>

<style>
	.search-results {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid var(--border-color);
	}
</style>
