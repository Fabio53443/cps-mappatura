<script>
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';
	import LocationSidebar from '$lib/components/LocationSidebar.svelte';
	import { tipoValues } from '$lib/config/tipoConfig';
	import { getColorForTipo } from '$lib/config/tipoConfig';
	
	let selectedLocation = $state(null);
	let locationImages = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let isSidebarOpen = $state(false);
	let isClosingMobileSheet = $state(false); // For close animation
	
	// Geolocation state
	let userLocation = $state(null);
	let isLocating = $state(false);
	let locationError = $state(null);
	let nearbyLocations = $state([]);
	let showNearbyPanel = $state(false);
	
	// Mobile bottom sheet drag handling
	let sheetTranslateY = $state(0);
	let isDragging = $state(false);
	let dragStartY = $state(0);
	
	// Calculate mobile offset to center marker in visible area above bottom sheet
	// The bottom sheet takes 70% of viewport, leaving 30% visible at top
	// We want to center the marker in that 30% visible area
	function getMobileMapOffset() {
		if (window.innerWidth >= 768) return [0, 0]; // No offset on desktop
		
		const viewportHeight = window.innerHeight;
		const cardHeight = viewportHeight * 0.7; // 70vh card
		const visibleMapHeight = viewportHeight - cardHeight; // 30% visible
		
		// The map center is at viewportHeight/2
		// We want the marker at visibleMapHeight/2 (center of visible area)
		// So we need to move it UP by: (viewportHeight/2) - (visibleMapHeight/2)
		// Which simplifies to: (viewportHeight - visibleMapHeight) / 2 = cardHeight / 2
		const offsetY = -(cardHeight / 2);
		
		return [0, offsetY];
	}
	
	// Search functionality
	let searchTerm = $state('');
	let searchResults = $state([]);
	let showSearchResults = $state(false);
	let searchInput;
	
	// Filter functionality
	let allLocations = $state([]); // Store all locations unfiltered
	let selectedTipos = $state([]);
	let selectedMunicipios = $state([]);
	let showTipoDropdown = $state(false);
	let showMunicipioDropdown = $state(false);
	let municipioValues = $state([]); // Will be populated from data
	
	// Apply all filters (search + tipo + municipio)
	let filteredLocations = $derived(applyFilters(allLocations, searchTerm, selectedTipos, selectedMunicipios));
	
	// Always update the locations displayed on map when filters change
	let locations = $derived(filteredLocations);
	
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
			// If no municipios selected, zoom back out to Rome
			if (selectedMunicipios.length === 0 && mapComponent) {
				mapComponent.flyTo(12.4964, 41.9028, 11);
			}
		} else {
			selectedMunicipios = [...selectedMunicipios, municipio];
			// Fly to the selected municipio
			flyToMunicipio(municipio);
		}
	}
	
	// Municipio approximate center coordinates
	const municipioCenters = {
		'I': { lat: 41.8967, lng: 12.4822, zoom: 14 },      // Centro Storico
		'II': { lat: 41.9246, lng: 12.5097, zoom: 13.5 },   // Parioli, Flaminio
		'III': { lat: 41.9410, lng: 12.5520, zoom: 13 },    // Monte Sacro
		'IV': { lat: 41.8955, lng: 12.5550, zoom: 13 },     // Tiburtina
		'V': { lat: 41.8750, lng: 12.5650, zoom: 13 },      // Prenestino, Centocelle
		'VI': { lat: 41.8650, lng: 12.6650, zoom: 12.5 },   // Tor Bella Monaca
		'VII': { lat: 41.8550, lng: 12.5550, zoom: 13 },    // Appio Latino, Tuscolano
		'VIII': { lat: 41.8450, lng: 12.4650, zoom: 13 },   // Garbatella, Ostiense
		'IX': { lat: 41.7950, lng: 12.4550, zoom: 12.5 },   // EUR, Laurentino
		'X': { lat: 41.7450, lng: 12.2950, zoom: 12 },      // Ostia
		'XI': { lat: 41.8550, lng: 12.4350, zoom: 13 },     // Portuense, Marconi
		'XII': { lat: 41.8650, lng: 12.4550, zoom: 13 },    // Monteverde, Gianicolense
		'XIII': { lat: 41.9150, lng: 12.4250, zoom: 13 },   // Aurelio, Boccea
		'XIV': { lat: 41.9450, lng: 12.4450, zoom: 13 },    // Trionfale, Monte Mario
		'XV': { lat: 41.9850, lng: 12.4850, zoom: 12.5 }    // Cassia, Flaminia Nord
	};
	
	function flyToMunicipio(municipio) {
		if (!mapComponent) return;
		
		const center = municipioCenters[municipio];
		if (center) {
			mapComponent.flyTo(center.lng, center.lat, center.zoom);
		}
	}
	
	// Clear all filters
	function clearFilters() {
		selectedTipos = [];
		selectedMunicipios = [];
		searchTerm = '';
		showSearchResults = false;
		// Zoom back to full Rome view
		if (mapComponent) {
			mapComponent.flyTo(12.4964, 41.9028, 11);
		}
	}
	
	// Calculate distance between two points using Haversine formula
	function calculateDistance(lat1, lon1, lat2, lon2) {
		const R = 6371; // Earth's radius in km
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLon = (lon2 - lon1) * Math.PI / 180;
		const a = 
			Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
			Math.sin(dLon/2) * Math.sin(dLon/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c; // Distance in km
	}
	
	// Format distance for display
	function formatDistance(km) {
		if (km < 1) {
			return `${Math.round(km * 1000)} m`;
		}
		return `${km.toFixed(1)} km`;
	}
	
	// Geolocate user and find nearest spots
	async function geolocateUser() {
		if (!navigator.geolocation) {
			locationError = 'La geolocalizzazione non è supportata dal tuo browser';
			return;
		}
		
		isLocating = true;
		locationError = null;
		
		try {
			const position = await new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 60000
				});
			});
			
			userLocation = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			
			// Calculate distances and sort locations
			const locationsWithDistance = allLocations.map(loc => ({
				...loc,
				distance: calculateDistance(
					userLocation.lat, userLocation.lng,
					loc.latitude, loc.longitude
				)
			}));
			
			// Sort by distance and take top 5
			nearbyLocations = locationsWithDistance
				.sort((a, b) => a.distance - b.distance)
				.slice(0, 5);
			
			showNearbyPanel = true;
			
			// Fly to user location
			if (mapComponent) {
				mapComponent.flyTo(userLocation.lng, userLocation.lat, 14);
				// Also show user marker if the map supports it
				mapComponent.setUserLocation?.(userLocation.lat, userLocation.lng);
			}
			
		} catch (err) {
			console.error('Geolocation error:', err);
			if (err.code === 1) {
				locationError = 'Accesso alla posizione negato. Abilita la geolocalizzazione nelle impostazioni.';
			} else if (err.code === 2) {
				locationError = 'Impossibile determinare la posizione. Riprova.';
			} else if (err.code === 3) {
				locationError = 'Richiesta di posizione scaduta. Riprova.';
			} else {
				locationError = 'Errore di geolocalizzazione. Riprova.';
			}
		} finally {
			isLocating = false;
		}
	}
	
	function closeNearbyPanel() {
		showNearbyPanel = false;
		userLocation = null;
		nearbyLocations = [];
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
	let showBackToTop = $state(false);
	
	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}
	
	function handleScroll() {
		showBackToTop = window.scrollY > 30;
	}
	
	// Fix iOS keyboard viewport shift issue
	function handleInputBlur() {
		if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
			// Reset scroll position when keyboard closes on iOS
			setTimeout(() => {
				window.scrollTo(0, 0);
				document.body.scrollTop = 0;
				document.documentElement.scrollTop = 0;
			}, 50);
		}
	}
	
	// Track original viewport height to detect keyboard
	let originalViewportHeight = 0;

	onMount(async () => {
		// Add map-page class to html to lock scrolling
		document.documentElement.classList.add('map-page');
		
		// Store original viewport height for iOS keyboard detection
		originalViewportHeight = window.innerHeight;
		
		// iOS keyboard fix using visualViewport API
		if (/iPhone|iPad|iPod/.test(navigator.userAgent) && window.visualViewport) {
			const handleViewportResize = () => {
				// When keyboard closes (viewport returns to original size)
				if (window.visualViewport.height >= originalViewportHeight - 50) {
					window.scrollTo(0, 0);
					document.body.scrollTop = 0;
					document.documentElement.scrollTop = 0;
				}
			};
			window.visualViewport.addEventListener('resize', handleViewportResize);
		}
		
		// Collapse iOS Safari navbar by scrolling slightly
		// This triggers the minimal UI mode on iOS
		if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
			setTimeout(() => {
				window.scrollTo(0, 1);
				// Then scroll back to ensure we're at top
				setTimeout(() => window.scrollTo(0, 0), 50);
			}, 100);
		}
		
		try {
			const response = await fetch('/api/locations');
			if (!response.ok) throw new Error('Failed to load locations');
			allLocations = await response.json();
			
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
				document.documentElement.classList.remove('map-page');
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

	// Add this function to handle the filter-tipo event from LocationSidebar
	function handleTipoFilter(event) {
		if (event && event.detail && event.detail.tipo) {
			filterByTipo(event.detail.tipo);
		}
	}

	// Calculate desktop offset to center map in visible area
	// Accounts for list panel (right side, 24rem = 384px) and location card (24rem = 384px)
	function getDesktopMapOffset(listOpen, cardOpen) {
		if (window.innerWidth < 768) return [0, 0]; // Use mobile offset instead
		
		// Both panels are on the right side
		// List panel: 24rem (384px) + 1rem gap (16px) = 400px from right
		// Card panel: 24rem (384px) + 1rem gap (16px) = 400px, shifts left if list is open
		
		let totalRightOffset = 0;
		if (listOpen) totalRightOffset += 400; // List panel width + gap
		if (cardOpen) totalRightOffset += 400; // Card panel width + gap
		
		// Offset is half of the total panel width to center in remaining space
		// Negative X moves the center LEFT (away from the panels on the right)
		const offsetX = -(totalRightOffset / 2);
		
		return [offsetX, 0];
	}
	
	// Unified function to get current map offset based on UI state
	// This is passed to the Map component so it can calculate correct offset
	function getCurrentMapOffset() {
		if (typeof window === 'undefined') return [0, 0];
		
		if (window.innerWidth < 768) {
			// Mobile: offset for bottom sheet (when card will be open)
			return getMobileMapOffset();
		} else {
			// Desktop: offset for side panels
			// When clicking a marker, the card WILL be open, so account for it
			return getDesktopMapOffset(viewMode === 'list', true);
		}
	}

	async function handleMarkerClick(location, fromListView = false) {
		// Store if the sidebar was previously closed
		const wasSidebarClosed = !isSidebarOpen;
		
		// Set the selected location immediately
		selectedLocation = location;
		
		// Update URL with location ID (without reloading page)
		const url = new URL(window.location.href);
		url.searchParams.set('location', location.id);
		window.history.replaceState({}, '', url);
		
		// First fetch the images in the background
		const imagesPromise = fetch(`/api/locations/${location.id}/images`)
			.then(response => {
				if (!response.ok) throw new Error('Failed to load images');
				return response.json();
			})
			.catch(err => {
				console.error('Error loading images:', err);
				return [];
			});
		
		// If clicking from list view on MOBILE, switch to map view
		if (fromListView && viewMode === 'list' && window.innerWidth < 768) {
			viewMode = 'map';
			
			// Wait for map to be visible and initialized, then fly to location
			setTimeout(() => {
				if (mapComponent && mapComponent.flyTo) {
					// Use calculated offset to center in visible area above bottom sheet
					const offset = getMobileMapOffset();
					mapComponent.flyTo(location.longitude, location.latitude, 15, offset);
				}
				
				// Open sidebar after map animation starts
				setTimeout(() => {
					isSidebarOpen = true;
				}, 200);
			}, 100);
			
			// Wait for images to load and update
			locationImages = await imagesPromise;
			return;
		}
		
		// On DESKTOP from list view, keep the list open and show the card
		if (fromListView && viewMode === 'list' && window.innerWidth >= 768) {
			// Open the location card (list stays open)
			isSidebarOpen = true;
			
			// Fly to location with offset accounting for both panels
			setTimeout(() => {
				if (mapComponent && mapComponent.flyTo) {
					const offset = getDesktopMapOffset(true, true); // list open, card open
					mapComponent.flyTo(location.longitude, location.latitude, 15, offset);
				}
			}, 100);
			
			// Wait for images to load and update
			locationImages = await imagesPromise;
			return;
		}
		
		// If sidebar was closed, let the map animation start before opening sidebar
		if (wasSidebarClosed) {
			// Wait a moment before showing the sidebar to let map animation start
			setTimeout(() => {
				isSidebarOpen = true;
				
				// On desktop, ensure map is centered after sidebar animation completes
				if (window.innerWidth >= 768) {
					setTimeout(() => {
						if (mapComponent && mapComponent.flyTo) {
							const offset = getDesktopMapOffset(viewMode === 'list', true);
							mapComponent.flyTo(selectedLocation.longitude, selectedLocation.latitude, null, offset);
						}
					}, 300); // Time for sidebar animation to complete
				}
			}, 400); // Delay opening sidebar
		} else {
			// Sidebar was already open, just update content
			isSidebarOpen = true;
			
			// Re-center on desktop if needed
			if (window.innerWidth >= 768) {
				setTimeout(() => {
					if (mapComponent && mapComponent.flyTo) {
						const offset = getDesktopMapOffset(viewMode === 'list', true);
						mapComponent.flyTo(location.longitude, location.latitude, 15, offset);
					}
				}, 100);
			}
		}
		
		// Wait for images to load and update
		locationImages = await imagesPromise;
	}

	function closeSidebar() {
		// Remove location from URL
		const url = new URL(window.location.href);
		url.searchParams.delete('location');
		window.history.replaceState({}, '', url);
		
		// On mobile, trigger close animation from current position
		if (window.innerWidth < 768) {
			isClosingMobileSheet = true;
			// Animate to bottom of screen (use a large value to push it off)
			sheetTranslateY = window.innerHeight;
			setTimeout(() => {
				isSidebarOpen = false;
				selectedLocation = null;
				locationImages = [];
				isClosingMobileSheet = false;
				sheetTranslateY = 0;
			}, 300);
		} else {
			// Desktop: close the card
			isSidebarOpen = false;
			selectedLocation = null;
			locationImages = [];
			
			// Re-center map if list is still open
			if (viewMode === 'list') {
				setTimeout(() => {
					if (mapComponent && mapComponent.resize) {
						mapComponent.resize();
					}
				}, 300);
			}
		}
		
		// Wait for sidebar to finish closing animation before resizing map
		if (viewMode === 'map') {
			setTimeout(() => {
				if (mapComponent && mapComponent.resize) {
					mapComponent.resize();
				}
			}, 300);
		}
	}
	
	// Share location function
	async function shareLocation() {
		if (!selectedLocation) return;
		
		const url = new URL(window.location.href);
		url.searchParams.set('location', selectedLocation.id);
		const shareUrl = url.toString();
		
		// Try native share API first (works on mobile)
		if (navigator.share) {
			try {
				await navigator.share({
					title: selectedLocation.name,
					text: `Scopri ${selectedLocation.name} sulla mappa degli spazi`,
					url: shareUrl
				});
			} catch (err) {
				// User cancelled or share failed, fall back to clipboard
				if (err.name !== 'AbortError') {
					await copyToClipboard(shareUrl);
				}
			}
		} else {
			// Fall back to clipboard
			await copyToClipboard(shareUrl);
		}
	}
	
	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			// Show a brief toast notification
			showCopiedToast = true;
			setTimeout(() => {
				showCopiedToast = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
	
	let showCopiedToast = $state(false);
	
	// Mobile bottom sheet drag handlers
	let sheetContentElement;
	
	function handleTouchStart(e) {
		// Allow drag from anywhere on the card
		const sheetContent = e.target.closest('.sheet-content');
		const isAtTop = !sheetContent || sheetContent.scrollTop <= 0;
		
		// Start drag if touching the handle OR if content is scrolled to top
		if (e.target.closest('.drag-handle') || isAtTop) {
			isDragging = true;
			dragStartY = e.touches[0].clientY;
		}
	}
	
	function handleTouchMove(e) {
		if (!isDragging) return;
		
		const currentY = e.touches[0].clientY;
		const diff = currentY - dragStartY;
		
		// Only allow dragging down
		if (diff > 0) {
			// Prevent pull-to-refresh and scrolling while dragging down
			e.preventDefault();
			sheetTranslateY = diff;
		} else {
			// If trying to drag up, stop dragging and allow normal scroll
			isDragging = false;
			sheetTranslateY = 0;
		}
	}
	
	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;
		// If dragged more than 100px, close the sheet
		if (sheetTranslateY > 100) {
			// Continue from current position - animate to off-screen
			isClosingMobileSheet = true;
			sheetTranslateY = window.innerHeight;
			setTimeout(() => {
				isSidebarOpen = false;
				selectedLocation = null;
				locationImages = [];
				isClosingMobileSheet = false;
				sheetTranslateY = 0;
			}, 300);
		} else {
			// Snap back
			sheetTranslateY = 0;
		}
	}

	// View mode (map or list)
	let viewMode = $state('map');
	// Reference to map component
	let mapComponent;
	
	function toggleViewMode() {
		viewMode = viewMode === 'map' ? 'list' : 'map';
	}
	
	// Effect to handle map resize when switching back to map view
	$effect(() => {
		if (viewMode === 'map' && mapComponent) {
			// Use requestAnimationFrame to ensure DOM is updated before resizing
			requestAnimationFrame(() => {
				if (mapComponent.resize) {
					mapComponent.resize();
				}
			});
		}
	});
</script>

<svelte:head>
	<title>I nostri spazi</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Main content area - extends behind header -->
	<div class="flex-grow relative overflow-hidden">
		<!-- Floating controls on map (Desktop) - positioned below header -->
		<div class="hidden md:flex absolute top-16 left-4 z-40 items-center gap-2 flex-wrap">
			<!-- Search bar -->
			<div class="relative">
				<input 
					bind:this={searchInput}
					type="text" 
					placeholder="Cerca spazi..." 
					class="w-64 px-4 py-2 border border-gray-200 rounded-full bg-white shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-lg transition-shadow"
					value={searchTerm}
					oninput={handleSearch}
					onfocus={() => showSearchResults = searchResults.length > 0}
					onblur={handleInputBlur}
				/>
				
				{#if showSearchResults}
					<div class="search-results absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
						{#each searchResults as result}
							<button 
								class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex flex-col"
								onclick={() => selectLocation(result)}
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

			<!-- Tipo filter dropdown -->
			<div class="relative">
				<button 
					class="tipo-dropdown-button flex items-center px-4 py-2 border border-gray-200 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
					onclick={() => showTipoDropdown = !showTipoDropdown}
				>
					<span class="font-medium">Tipo</span>
					{#if selectedTipos.length > 0}
						<span class="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
							{selectedTipos.length}
						</span>
					{/if}
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if showTipoDropdown}
					<div class="tipo-dropdown absolute mt-2 z-50 w-64 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
						<div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
							<span class="font-semibold text-gray-700">Filtra per tipo</span>
							{#if selectedTipos.length > 0}
								<button 
									class="text-xs text-blue-500 hover:text-blue-700 font-medium" 
									onclick={() => selectedTipos = []}
								>
									Cancella
								</button>
							{/if}
						</div>
						<div class="max-h-60 overflow-y-auto p-2">
							{#each tipoValues as tipo}
								<div class="flex items-center py-2 px-2 hover:bg-gray-50 rounded">
									<input 
										type="checkbox" 
										id={`tipo-${tipo}`} 
										class="mr-3"
										checked={selectedTipos.includes(tipo)}
										onchange={() => toggleTipo(tipo)}
									/>
									<label for={`tipo-${tipo}`} class="select-none text-sm cursor-pointer flex-grow">{tipo}</label>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Municipio filter dropdown -->
			<div class="relative">
				<button 
					class="municipio-dropdown-button flex items-center px-4 py-2 border border-gray-200 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
					onclick={() => showMunicipioDropdown = !showMunicipioDropdown}
				>
					<span class="font-medium">Municipio</span>
					{#if selectedMunicipios.length > 0}
						<span class="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
							{selectedMunicipios.length}
						</span>
					{/if}
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if showMunicipioDropdown}
					<div class="municipio-dropdown absolute mt-2 z-50 w-64 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
						<div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
							<span class="font-semibold text-gray-700">Filtra per municipio</span>
							{#if selectedMunicipios.length > 0}
								<button 
									class="text-xs text-blue-500 hover:text-blue-700 font-medium" 
									onclick={() => selectedMunicipios = []}
								>
									Cancella
								</button>
							{/if}
						</div>
						<div class="max-h-60 overflow-y-auto p-2">
							{#each municipioValues as municipio}
								<div class="flex items-center py-2 px-2 hover:bg-gray-50 rounded">
									<input 
										type="checkbox" 
										id={`municipio-${municipio}`} 
										class="mr-3"
										checked={selectedMunicipios.includes(municipio)}
										onchange={() => toggleMunicipio(municipio)}
									/>
									<label for={`municipio-${municipio}`} class="select-none text-sm cursor-pointer flex-grow">Municipio {municipio}</label>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Results counter toggle button -->
			<button 
				class="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer {viewMode === 'list' ? 'ring-2 ring-blue-500 border-blue-300' : ''}"
				onclick={() => viewMode = viewMode === 'list' ? 'map' : 'list'}
				aria-label="Mostra elenco spazi"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
				</svg>
				<span class="font-medium text-gray-700">
					{locations.length} {locations.length === 1 ? 'spazio' : 'spazi'}
				</span>
				{#if locations.length !== allLocations.length}
					<span class="text-gray-500">/ {allLocations.length}</span>
				{/if}
			</button>

			<!-- Clear filters button -->
			{#if selectedTipos.length > 0 || selectedMunicipios.length > 0 || searchTerm}
				<button 
					class="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md border border-red-200 transition-colors flex items-center text-sm font-medium"
					onclick={clearFilters}
				>
					<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Cancella filtri
				</button>
			{/if}
		</div>

		<!-- Active filter tags (floating below filter buttons) -->
		{#if selectedTipos.length > 0 || selectedMunicipios.length > 0}
			<div class="hidden md:flex absolute top-16 left-4 z-40 flex-wrap gap-2 max-w-md">
				{#each selectedTipos as tipo}
					<div class="inline-flex items-center px-3 py-1 bg-white text-gray-700 text-sm rounded-full shadow-md border border-gray-200">
						<span class="w-2 h-2 rounded-full mr-2" style="background-color: {getColorForTipo(tipo)};"></span>
						<span>{tipo}</span>
						<button 
							class="ml-2 hover:text-red-500" 
							onclick={() => toggleTipo(tipo)} 
							aria-label={`Remove ${tipo} filter`}
						>
							<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				{/each}
				
				{#each selectedMunicipios as municipio}
					<div class="inline-flex items-center px-3 py-1 bg-white text-gray-700 text-sm rounded-full shadow-md border border-gray-200">
						<span>Municipio {municipio}</span>
						<button 
							class="ml-2 hover:text-red-500" 
							onclick={() => toggleMunicipio(municipio)} 
							aria-label={`Remove Municipio ${municipio} filter`}
						>
							<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Map View (fullscreen on desktop) -->
		<div class="h-full w-full relative {viewMode !== 'map' ? 'hidden md:block' : ''}">
			<Map 
				bind:this={mapComponent}
				{locations} 
				onMarkerClick={handleMarkerClick}
				selectedId={selectedLocation?.id}
				getMapOffset={getCurrentMapOffset}
			/>
			
			<!-- Geolocation button (floating on map, desktop only - left side) -->
			<button 
				class="hidden md:flex absolute bottom-6 left-4 z-40 items-center justify-center w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all disabled:bg-blue-300 disabled:cursor-wait"
				onclick={geolocateUser}
				disabled={isLocating}
				aria-label="Trova spazi vicini a me"
			>
				{#if isLocating}
					<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- List View (desktop - overlay panel, mobile - fullscreen with slide-up animation) -->
		{#if viewMode === 'list'}
			<div class="absolute inset-0 md:inset-auto md:top-16 md:right-4 md:bottom-4 md:w-[26rem] bg-white md:rounded-lg md:shadow-xl overflow-hidden z-30 flex flex-col animate-list-slide-up md:animate-none">
				<div class="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
					<h3 class="font-bold text-lg">Elenco spazi ({locations.length})</h3>
					<button 
						class="hidden md:flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
						onclick={() => viewMode = 'map'}
						aria-label="Chiudi elenco"
					>
						<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="flex-grow overflow-y-auto p-4">
					<div class="space-y-3">
						{#each locations as location}
							<button 
								class="w-full text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-200 {selectedLocation?.id === location.id ? 'ring-2 ring-blue-500' : ''}"
								onclick={() => handleMarkerClick(location, true)}
							>
								<div class="flex justify-between items-start">
									<h4 class="font-semibold text-gray-800">{location.name}</h4>
									{#if location.tipo}
										<span 
											class="px-2 py-0.5 rounded-full text-white text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] flex-shrink-0"
											style="background-color: {getColorForTipo(location.tipo)};"
											title={location.tipo}
										>
											{location.tipo}
										</span>
									{/if}
								</div>
								{#if location.street}
									<p class="text-sm text-gray-500 mt-1">{location.street}</p>
								{/if}
								{#if location.municipio}
									<p class="text-xs text-gray-400 mt-1">Municipio {location.municipio}</p>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Location Sidebar (when a location is selected) -->
		{#if isSidebarOpen && selectedLocation}
			<!-- Desktop: floating panel, shifts left if list is open -->
			<div class="hidden md:flex absolute top-16 bottom-4 {viewMode === 'list' ? 'right-[28rem]' : 'right-4'} w-[26rem] bg-white rounded-lg shadow-xl z-40 flex-col transition-all duration-300" bind:this={contentContainer}>
				<LocationSidebar
					location={selectedLocation}
					images={locationImages}
					onClose={closeSidebar}
					onShare={shareLocation}
				/>
			</div>
			
			<!-- Mobile: bottom sheet card -->
			<div 
				class="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col {!isClosingMobileSheet && sheetTranslateY === 0 ? 'animate-slide-up' : ''}"
				style="transform: translateY({sheetTranslateY}px); {isDragging ? '' : 'transition: transform 0.3s ease-out;'} max-height: calc(70vh - env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
				ontouchstart={handleTouchStart}
				ontouchmove={handleTouchMove}
				ontouchend={handleTouchEnd}
			>
				<div class="drag-handle flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
					<div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
				</div>
				<div class="sheet-content flex-grow overflow-y-auto overscroll-contain">
					<LocationSidebar
						location={selectedLocation}
						images={locationImages}
						onClose={closeSidebar}
						onShare={shareLocation}
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- Mobile floating controls (on top of map) -->
	<div class="md:hidden fixed bottom-0 left-0 right-0 z-30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none">
		<div class="flex flex-col gap-2 pointer-events-auto">
			<!-- Search bar -->
			<div class="relative">
				<input 
					type="text" 
					placeholder="Cerca..." 
					class="w-full px-4 py-2 border border-gray-200 rounded-full bg-white shadow-lg"
					value={searchTerm}
					oninput={handleSearch}
					onblur={handleInputBlur}
				/>
			</div>
			
			<!-- Filter and view controls -->
			<div class="flex items-center justify-between gap-2 relative">
				<div class="flex gap-2">
					<!-- Tipo filter -->
					<button 
						class="tipo-dropdown-button flex items-center px-3 py-1.5 border border-gray-200 rounded-full bg-white text-sm shadow-md"
						onclick={() => showTipoDropdown = !showTipoDropdown}
					>
						Tipo
						{#if selectedTipos.length > 0}
							<span class="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{selectedTipos.length}</span>
						{/if}
					</button>
					
					<!-- Municipio filter -->
					<button 
						class="municipio-dropdown-button flex items-center px-3 py-1.5 border border-gray-200 rounded-full bg-white text-sm shadow-md"
						onclick={() => showMunicipioDropdown = !showMunicipioDropdown}
					>
						Mun.
						{#if selectedMunicipios.length > 0}
							<span class="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{selectedMunicipios.length}</span>
						{/if}
					</button>
				</div>

				<!-- Results count toggle -->
				<button 
					class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-md {viewMode === 'list' ? 'ring-2 ring-blue-500 border-blue-300' : ''}"
					onclick={() => viewMode = viewMode === 'map' ? 'list' : 'map'}
					aria-label="Mostra elenco spazi"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					{locations.length} spazi
				</button>
			</div>
			
			<!-- Mobile Tipo dropdown -->
			{#if showTipoDropdown}
				<div class="tipo-dropdown bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 mt-2 animate-dropdown">
					<div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
						<span class="font-semibold text-gray-700">Filtra per tipo</span>
						{#if selectedTipos.length > 0}
							<button 
								class="text-xs text-blue-500 hover:text-blue-700 font-medium" 
								onclick={() => selectedTipos = []}
							>
								Cancella
							</button>
						{/if}
					</div>
					<div class="max-h-48 overflow-y-auto p-2">
						{#each tipoValues as tipo}
							<div class="flex items-center py-2 px-2 hover:bg-gray-50 rounded active:bg-gray-100">
								<input 
									type="checkbox" 
									id={`mobile-tipo-${tipo}`} 
									class="mr-3 w-5 h-5"
									checked={selectedTipos.includes(tipo)}
									onchange={() => toggleTipo(tipo)}
								/>
								<label for={`mobile-tipo-${tipo}`} class="select-none text-sm cursor-pointer flex-grow">{tipo}</label>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			
			<!-- Mobile Municipio dropdown -->
			{#if showMunicipioDropdown}
				<div class="municipio-dropdown bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 mt-2 animate-dropdown">
					<div class="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
						<span class="font-semibold text-gray-700">Filtra per municipio</span>
						{#if selectedMunicipios.length > 0}
							<button 
								class="text-xs text-blue-500 hover:text-blue-700 font-medium" 
								onclick={() => selectedMunicipios = []}
							>
								Cancella
							</button>
						{/if}
					</div>
					<div class="max-h-48 overflow-y-auto p-2">
						{#each municipioValues as municipio}
							<div class="flex items-center py-2 px-2 hover:bg-gray-50 rounded active:bg-gray-100">
								<input 
									type="checkbox" 
									id={`mobile-mun-${municipio}`} 
									class="mr-3 w-5 h-5"
									checked={selectedMunicipios.includes(municipio)}
									onchange={() => toggleMunicipio(municipio)}
								/>
								<label for={`mobile-mun-${municipio}`} class="select-none text-sm cursor-pointer flex-grow">Municipio {municipio}</label>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Mobile geolocation button (floating on map, left side, above filters) - hidden when list or dropdowns are open -->
		{#if viewMode !== 'list' && !showTipoDropdown && !showMunicipioDropdown}
			<button 
				class="absolute bottom-[calc(120px+env(safe-area-inset-bottom))] left-4 z-10 flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-lg transition-all disabled:bg-blue-300 pointer-events-auto"
				onclick={geolocateUser}
				disabled={isLocating}
				aria-label="Trova spazi vicini a me"
			>
				{#if isLocating}
					<svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				{/if}
			</button>
		{/if}
	</div>
	
	<!-- Nearby locations panel (shows after geolocation) -->
	{#if showNearbyPanel && nearbyLocations.length > 0}
		<!-- Desktop: Nearby panel as sidebar -->
		<div class="hidden md:flex absolute top-16 right-4 bottom-4 w-[26rem] bg-white rounded-lg shadow-xl overflow-hidden z-30 flex-col">
			<div class="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
				<div>
					<h3 class="font-bold text-lg">Vicino a te</h3>
				</div>
				<button 
					class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
					onclick={closeNearbyPanel}
					aria-label="Chiudi"
				>
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="flex-grow overflow-y-auto p-4">
				<div class="space-y-3">
					{#each nearbyLocations as location, index}
						<button 
							class="w-full text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-200"
							onclick={() => { closeNearbyPanel(); handleMarkerClick(location); }}
						>
							<div class="flex justify-between items-start">
								<div class="flex items-center gap-2">
									<span class="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
										{index + 1}
									</span>
									<h4 class="font-semibold text-gray-800">{location.name}</h4>
								</div>
								<span class="text-sm font-medium text-blue-600">{formatDistance(location.distance)}</span>
							</div>
							{#if location.street}
								<p class="text-sm text-gray-500 mt-1 ml-8">{location.street}</p>
							{/if}
							<div class="flex items-center gap-2 mt-2 ml-8">
								{#if location.tipo}
									<span 
										class="px-2 py-0.5 rounded-full text-white text-xs font-medium"
										style="background-color: {getColorForTipo(location.tipo)};"
									>
										{location.tipo}
									</span>
								{/if}
								{#if location.municipio}
									<span class="text-xs text-gray-400">Municipio {location.municipio}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
		
		<!-- Mobile: Nearby panel as bottom sheet -->
		<div 
			class="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col animate-slide-up"
			style="max-height: 70vh; padding-bottom: env(safe-area-inset-bottom);"
		>
			<div class="flex justify-center pt-3 pb-2">
				<div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
			</div>
			<div class="px-4 pb-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
				<div>
					<h3 class="font-bold text-lg">Vicino a te</h3>
				</div>
				<button 
					class="p-2 hover:bg-gray-100 rounded-full transition-colors"
					onclick={closeNearbyPanel}
					aria-label="Chiudi"
				>
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="flex-grow overflow-y-auto p-4">
				<div class="space-y-3">
					{#each nearbyLocations as location, index}
						<button 
							class="w-full text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 active:bg-gray-200 transition-colors border border-gray-200"
							onclick={() => { closeNearbyPanel(); handleMarkerClick(location); }}
						>
							<div class="flex justify-between items-start">
								<div class="flex items-center gap-2">
									<span class="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
										{index + 1}
									</span>
									<h4 class="font-semibold text-gray-800">{location.name}</h4>
								</div>
								<span class="text-sm font-medium text-blue-600">{formatDistance(location.distance)}</span>
							</div>
							{#if location.street}
								<p class="text-sm text-gray-500 mt-1 ml-8">{location.street}</p>
							{/if}
							<div class="flex items-center gap-2 mt-2 ml-8">
								{#if location.tipo}
									<span 
										class="px-2 py-0.5 rounded-full text-white text-xs font-medium"
										style="background-color: {getColorForTipo(location.tipo)};"
									>
										{location.tipo}
									</span>
								{/if}
								{#if location.municipio}
									<span class="text-xs text-gray-400">Municipio {location.municipio}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Location error toast -->
	{#if locationError}
		<div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span class="text-sm">{locationError}</span>
			<button 
				class="p-1 hover:bg-red-600 rounded transition-colors"
				onclick={() => locationError = null}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}
	
	<!-- Copied to clipboard toast -->
	{#if showCopiedToast}
		<div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="text-sm">Link copiato!</span>
		</div>
	{/if}
</div>

<style>
	/* Search results dropdown */
	.search-results {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e2e8f0;
	}
	
	/* Dropdown styles */
	.municipio-dropdown, .tipo-dropdown {
		max-height: 300px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
	}
	
	/* Custom checkbox styles */
	input[type="checkbox"] {
		accent-color: #3b82f6;
		width: 16px;
		height: 16px;
		cursor: pointer;
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
	
	/* Mobile bottom sheet animation */
	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	
	.animate-slide-up {
		animation: slideUp 0.3s ease-out;
	}
	
	/* Dropdown animation */
	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-dropdown {
		animation: dropdownFadeIn 0.2s ease-out;
	}
	
	/* List slide up animation (mobile only) */
	@keyframes listSlideUp {
		from {
			opacity: 0;
			transform: translateY(100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-list-slide-up {
		animation: listSlideUp 0.3s ease-out;
	}
	
	/* Toast fade in animation */
	.animate-fade-in {
		animation: fadeIn 0.3s ease-out;
	}
</style>
