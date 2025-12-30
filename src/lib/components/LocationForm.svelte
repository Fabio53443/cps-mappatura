<script>
	import { onMount, onDestroy } from 'svelte';
	import { getColorForTipo, tipoValues } from '$lib/config/tipoConfig';
	import { auth } from '$lib/stores/auth';

	// Props
	let {
		initialData = null,
		onSubmit,
		submitLabel = 'Salva',
		loading = false
	} = $props();

	// Form state - initialize from initialData
	let name = $state('');
	let description = $state('');
	let latitude = $state('');
	let longitude = $state('');
	let street = $state('');
	let municipio = $state('');
	let tipo = $state('');
	let managedby = $state('');
	let link = $state('');
	
	// Image state
	let images = $state([]);
	let uploadingImages = $state(false);
	let imageError = $state('');
	let pendingFiles = $state([]); // Files to upload after location is created
	
	// Initialize form fields when initialData is available
	$effect(() => {
		if (initialData) {
			name = initialData.name || '';
			description = initialData.description || '';
			latitude = initialData.latitude || '';
			longitude = initialData.longitude || '';
			street = initialData.street || '';
			municipio = initialData.municipio || '';
			tipo = initialData.tipo || '';
			managedby = initialData.managedby || '';
			link = initialData.link || '';
			
			// Load images for existing location
			if (initialData.id) {
				loadImages(initialData.id);
			}
		}
	});
	
	async function loadImages(locationId) {
		try {
			const res = await fetch(`/api/locations/${locationId}/images`);
			if (res.ok) {
				images = await res.json();
			}
		} catch (err) {
			console.error('Error loading images:', err);
		}
	}
	
	async function uploadImage(file) {
		if (!initialData?.id) {
			// Queue file for later upload after location is saved
			pendingFiles = [...pendingFiles, file];
			return;
		}
		
		uploadingImages = true;
		imageError = '';
		
		try {
			let token;
			auth.token.subscribe(t => token = t)();
			
			const formData = new FormData();
			formData.append('file', file);
			
			const res = await fetch(`/api/locations/${initialData.id}/images`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`
				},
				body: formData
			});
			
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Upload failed');
			}
			
			const newImage = await res.json();
			images = [...images, newImage];
		} catch (err) {
			imageError = err.message;
		} finally {
			uploadingImages = false;
		}
	}
	
	async function deleteImageHandler(imageId) {
		if (!confirm('Sei sicuro di voler eliminare questa immagine?')) return;
		
		try {
			let token;
			auth.token.subscribe(t => token = t)();
			
			const res = await fetch(`/api/locations/${initialData.id}/images?imageId=${imageId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Delete failed');
			}
			
			images = images.filter(img => img.id !== imageId);
		} catch (err) {
			imageError = err.message;
		}
	}
	
	function handleFileSelect(e) {
		const files = Array.from(e.target.files || []);
		files.forEach(file => uploadImage(file));
		e.target.value = ''; // Reset input
	}
	
	function handleDrop(e) {
		e.preventDefault();
		const files = Array.from(e.dataTransfer?.files || []);
		const imageFiles = files.filter(f => f.type.startsWith('image/'));
		imageFiles.forEach(file => uploadImage(file));
	}
	
	function handleDragOver(e) {
		e.preventDefault();
	}

	// Address search state (Nominatim/OpenStreetMap)
	let addressSearch = $state('');
	let searchResults = $state([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let searchTimeout;

	// Validation
	let errors = $state({});

	const municipioValues = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];

	// Rome municipio boundaries (approximate for coordinate-based lookup)
	const municipioBoundaries = {
		'I': { minLat: 41.885, maxLat: 41.915, minLng: 12.46, maxLng: 12.52 },
		'II': { minLat: 41.905, maxLat: 41.945, minLng: 12.48, maxLng: 12.54 },
		'III': { minLat: 41.915, maxLat: 41.965, minLng: 12.51, maxLng: 12.60 },
		'IV': { minLat: 41.875, maxLat: 41.920, minLng: 12.52, maxLng: 12.60 },
		'V': { minLat: 41.860, maxLat: 41.905, minLng: 12.52, maxLng: 12.62 },
		'VI': { minLat: 41.840, maxLat: 41.890, minLng: 12.60, maxLng: 12.78 },
		'VII': { minLat: 41.830, maxLat: 41.880, minLng: 12.52, maxLng: 12.60 },
		'VIII': { minLat: 41.820, maxLat: 41.870, minLng: 12.42, maxLng: 12.52 },
		'IX': { minLat: 41.755, maxLat: 41.835, minLng: 12.38, maxLng: 12.52 },
		'X': { minLat: 41.715, maxLat: 41.790, minLng: 12.22, maxLng: 12.42 },
		'XI': { minLat: 41.835, maxLat: 41.880, minLng: 12.40, maxLng: 12.48 },
		'XII': { minLat: 41.845, maxLat: 41.885, minLng: 12.42, maxLng: 12.48 },
		'XIII': { minLat: 41.880, maxLat: 41.950, minLng: 12.38, maxLng: 12.46 },
		'XIV': { minLat: 41.920, maxLat: 41.985, minLng: 12.40, maxLng: 12.50 },
		'XV': { minLat: 41.955, maxLat: 42.020, minLng: 12.42, maxLng: 12.55 }
	};

	function guessMunicipioFromCoords(lat, lng) {
		let bestMatch = null;
		let bestScore = Infinity;

		for (const [mun, bounds] of Object.entries(municipioBoundaries)) {
			if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
				const centerLat = (bounds.minLat + bounds.maxLat) / 2;
				const centerLng = (bounds.minLng + bounds.maxLng) / 2;
				const score = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));
				
				if (score < bestScore) {
					bestScore = score;
					bestMatch = mun;
				}
			}
		}
		return bestMatch;
	}

	// Search addresses using Nominatim (OpenStreetMap) - FREE, no API key needed
	async function searchAddress(query) {
		if (query.length < 3) {
			searchResults = [];
			return;
		}

		isSearching = true;
		try {
			// Nominatim API - restricted to Rome area with viewbox
			const params = new URLSearchParams({
				q: query,
				format: 'json',
				addressdetails: '1',
				limit: '5',
				countrycodes: 'it',
				// Viewbox for Rome metro area (lon1,lat1,lon2,lat2)
				viewbox: '12.20,42.10,12.85,41.65',
				bounded: '1'
			});

			const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
				headers: {
					'Accept-Language': 'it',
					// Required by Nominatim usage policy
					'User-Agent': 'CPS-Mappatura-App/1.0'
				}
			});

			if (response.ok) {
				const data = await response.json();
				searchResults = data;
				showResults = data.length > 0;
			}
		} catch (error) {
			console.error('Address search error:', error);
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function handleSearchInput(e) {
		const query = e.target.value;
		addressSearch = query;
		
		// Debounce the search
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			searchAddress(query);
		}, 300);
	}

	function selectAddress(result) {
		const lat = parseFloat(result.lat);
		const lng = parseFloat(result.lon);
		
		latitude = lat.toFixed(6);
		longitude = lng.toFixed(6);
		
		// Build street address from components
		const addr = result.address || {};
		const parts = [];
		if (addr.road) parts.push(addr.road);
		if (addr.house_number) parts[0] = `${parts[0]} ${addr.house_number}`;
		if (addr.suburb) parts.push(addr.suburb);
		if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
		
		street = parts.join(', ') || result.display_name.split(',').slice(0, 2).join(',');
		
		// Try to detect municipio from address or coordinates
		const displayName = result.display_name.toLowerCase();
		let foundMunicipio = null;
		
		// Check for municipio in display name
		const munMatch = displayName.match(/municipio\s*(roma\s*)?([ivxlc]+)/i);
		if (munMatch) {
			foundMunicipio = munMatch[2].toUpperCase();
		}
		
		// Fallback: guess from coordinates
		if (!foundMunicipio) {
			foundMunicipio = guessMunicipioFromCoords(lat, lng);
		}
		
		if (foundMunicipio && municipioValues.includes(foundMunicipio)) {
			municipio = foundMunicipio;
		}
		
		// Update map
		updateMapMarker(lng, lat);
		
		// Clear search
		addressSearch = '';
		searchResults = [];
		showResults = false;
	}

	function updateMapMarker(lng, lat) {
		if (!map) return;
		
		const maplibregl = window.maplibregl;
		if (!maplibregl) return;

		if (marker) {
			marker.setLngLat([lng, lat]);
		} else {
			marker = new maplibregl.Marker({ draggable: true })
				.setLngLat([lng, lat])
				.addTo(map);
			
			marker.on('dragend', () => {
				const lngLat = marker.getLngLat();
				latitude = lngLat.lat.toFixed(6);
				longitude = lngLat.lng.toFixed(6);
			});
		}
		
		map.flyTo({ center: [lng, lat], zoom: 16 });
	}

	// Map picker state
	let mapContainer;
	let map;
	let marker;
	let mapInitialized = false;

	// Update map when initialData changes (for edit mode)
	$effect(() => {
		if (mapInitialized && initialData && initialData.latitude && initialData.longitude) {
			const lng = Number(initialData.longitude);
			const lat = Number(initialData.latitude);
			
			if (map && !isNaN(lng) && !isNaN(lat)) {
				updateMapMarker(lng, lat);
			}
		}
	});

	onMount(async () => {
		// Dynamically import maplibre-gl for the coordinate picker
		const maplibregl = (await import('maplibre-gl')).default;
		window.maplibregl = maplibregl; // Store for later use
		
		// Use initialData coordinates if available
		const initLng = initialData?.longitude || 12.4964;
		const initLat = initialData?.latitude || 41.9028;
		const hasCoords = initialData?.latitude && initialData?.longitude;
		
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=smD4WHiCeTEFri6vpiIm',
			center: [initLng, initLat],
			zoom: hasCoords ? 14 : 11
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		
		// Mark map as initialized
		mapInitialized = true;

		// Add marker if we have initial coordinates
		if (hasCoords) {
			marker = new maplibregl.Marker({ draggable: true })
				.setLngLat([initLng, initLat])
				.addTo(map);
			
			marker.on('dragend', () => {
				const lngLat = marker.getLngLat();
				latitude = lngLat.lat.toFixed(6);
				longitude = lngLat.lng.toFixed(6);
			});
		}

		// Click to place/move marker
		map.on('click', (e) => {
			const { lng, lat } = e.lngLat;
			latitude = lat.toFixed(6);
			longitude = lng.toFixed(6);

			if (marker) {
				marker.setLngLat([lng, lat]);
			} else {
				marker = new maplibregl.Marker({ draggable: true })
					.setLngLat([lng, lat])
					.addTo(map);
				
				marker.on('dragend', () => {
					const lngLat = marker.getLngLat();
					latitude = lngLat.lat.toFixed(6);
					longitude = lngLat.lng.toFixed(6);
				});
			}
		});
	});

	onDestroy(() => {
		if (map) map.remove();
	});

	function validate() {
		const newErrors = {};
		
		if (!name.trim()) newErrors.name = 'Il nome è obbligatorio';
		if (!latitude) newErrors.latitude = 'La latitudine è obbligatoria';
		else if (isNaN(Number(latitude))) newErrors.latitude = 'Latitudine non valida';
		if (!longitude) newErrors.longitude = 'La longitudine è obbligatoria';
		else if (isNaN(Number(longitude))) newErrors.longitude = 'Longitudine non valida';
		if (!street.trim()) newErrors.street = 'L\'indirizzo è obbligatorio';
		if (!municipio) newErrors.municipio = 'Il municipio è obbligatorio';
		if (!tipo) newErrors.tipo = 'Il tipo è obbligatorio';
		if (link && !isValidUrl(link)) newErrors.link = 'URL non valido';

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function isValidUrl(string) {
		try {
			new URL(string.startsWith('http') ? string : `https://${string}`);
			return true;
		} catch {
			return false;
		}
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (!validate()) return;

		onSubmit({
			name: name.trim(),
			description: description.trim() || null,
			latitude: Number(latitude),
			longitude: Number(longitude),
			street: street.trim(),
			municipio,
			tipo,
			managedby: managedby.trim() || null,
			link: link.trim() || null
		});
	}

	// Update marker when coordinates change manually
	$effect(() => {
		if (map && marker && latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
			const currentPos = marker.getLngLat();
			const newLat = Number(latitude);
			const newLng = Number(longitude);
			
			// Only update if significantly different (avoid loops)
			if (Math.abs(currentPos.lat - newLat) > 0.00001 || Math.abs(currentPos.lng - newLng) > 0.00001) {
				marker.setLngLat([newLng, newLat]);
				map.flyTo({ center: [newLng, newLat], zoom: 14 });
			}
		}
	});
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Left column: Form fields -->
		<div class="space-y-4">
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
					Nome <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.name ? 'border-red-500' : 'border-gray-300'}"
					placeholder="Nome dello spazio"
				/>
				{#if errors.name}<p class="text-red-500 text-xs mt-1">{errors.name}</p>{/if}
			</div>

			<!-- Tipo -->
			<div>
				<label for="tipo" class="block text-sm font-medium text-gray-700 mb-1">
					Tipo <span class="text-red-500">*</span>
				</label>
				<select
					id="tipo"
					bind:value={tipo}
					class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.tipo ? 'border-red-500' : 'border-gray-300'}"
				>
					<option value="">Seleziona un tipo</option>
					{#each tipoValues as t}
						<option value={t}>{t}</option>
					{/each}
				</select>
				{#if errors.tipo}<p class="text-red-500 text-xs mt-1">{errors.tipo}</p>{/if}
			</div>

			<!-- Address Search (OpenStreetMap/Nominatim - FREE) -->
			<div class="relative">
				<label for="addressSearch" class="block text-sm font-medium text-gray-700 mb-1">
					Cerca indirizzo
					<span class="text-green-600 text-xs ml-1">🗺️ OpenStreetMap</span>
				</label>
				<div class="relative">
					<input
						type="text"
						id="addressSearch"
						value={addressSearch}
						oninput={handleSearchInput}
						onfocus={() => showResults = searchResults.length > 0}
						onblur={() => setTimeout(() => showResults = false, 200)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
						placeholder="Cerca un indirizzo a Roma..."
					/>
					{#if isSearching}
						<div class="absolute right-3 top-1/2 -translate-y-1/2">
							<svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
					{/if}
				</div>
				
				<!-- Search Results Dropdown -->
				{#if showResults && searchResults.length > 0}
					<ul class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
						{#each searchResults as result}
							<li>
								<button
									type="button"
									onclick={() => selectAddress(result)}
									class="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
								>
									<div class="text-sm font-medium text-gray-900 truncate">
										{result.display_name.split(',')[0]}
									</div>
									<div class="text-xs text-gray-500 truncate">
										{result.display_name.split(',').slice(1, 4).join(',')}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="text-xs text-gray-500 mt-1">Inizia a digitare per cercare e auto-compilare indirizzo, coordinate e municipio</p>
			</div>

			<!-- Street (filled by search or manual) -->
			<div>
				<label for="street" class="block text-sm font-medium text-gray-700 mb-1">
					Indirizzo <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="street"
					bind:value={street}
					class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.street ? 'border-red-500' : 'border-gray-300'}"
					placeholder="Via Roma 1"
				/>
				{#if errors.street}<p class="text-red-500 text-xs mt-1">{errors.street}</p>{/if}
			</div>

			<!-- Municipio -->
			<div>
				<label for="municipio" class="block text-sm font-medium text-gray-700 mb-1">
					Municipio <span class="text-red-500">*</span>
				</label>
				<select
					id="municipio"
					bind:value={municipio}
					class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.municipio ? 'border-red-500' : 'border-gray-300'}"
				>
					<option value="">Seleziona un municipio</option>
					{#each municipioValues as m}
						<option value={m}>Municipio {m}</option>
					{/each}
				</select>
				{#if errors.municipio}<p class="text-red-500 text-xs mt-1">{errors.municipio}</p>{/if}
			</div>

			<!-- Coordinates -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="latitude" class="block text-sm font-medium text-gray-700 mb-1">
						Latitudine <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="latitude"
						bind:value={latitude}
						class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.latitude ? 'border-red-500' : 'border-gray-300'}"
						placeholder="41.9028"
					/>
					{#if errors.latitude}<p class="text-red-500 text-xs mt-1">{errors.latitude}</p>{/if}
				</div>
				<div>
					<label for="longitude" class="block text-sm font-medium text-gray-700 mb-1">
						Longitudine <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="longitude"
						bind:value={longitude}
						class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.longitude ? 'border-red-500' : 'border-gray-300'}"
						placeholder="12.4964"
					/>
					{#if errors.longitude}<p class="text-red-500 text-xs mt-1">{errors.longitude}</p>{/if}
				</div>
			</div>

			<!-- Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
				<textarea
					id="description"
					bind:value={description}
					rows="3"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Descrizione dello spazio..."
				></textarea>
			</div>

			<!-- Managed by -->
			<div>
				<label for="managedby" class="block text-sm font-medium text-gray-700 mb-1">Gestito da</label>
				<input
					type="text"
					id="managedby"
					bind:value={managedby}
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Comune di Roma"
				/>
			</div>

			<!-- Link -->
			<div>
				<label for="link" class="block text-sm font-medium text-gray-700 mb-1">Link</label>
				<input
					type="text"
					id="link"
					bind:value={link}
					class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.link ? 'border-red-500' : 'border-gray-300'}"
					placeholder="https://esempio.com"
				/>
				{#if errors.link}<p class="text-red-500 text-xs mt-1">{errors.link}</p>{/if}
			</div>
			
			<!-- Images -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">
					Immagini
					{#if !initialData?.id}
						<span class="text-gray-400 text-xs">(disponibile dopo il salvataggio)</span>
					{/if}
				</label>
				
				{#if imageError}
					<div class="p-2 mb-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
						{imageError}
						<button type="button" onclick={() => imageError = ''} class="ml-2 text-red-400 hover:text-red-600">×</button>
					</div>
				{/if}
				
				{#if initialData?.id}
					<!-- Drop zone -->
					<div
						ondrop={handleDrop}
						ondragover={handleDragOver}
						class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
						onclick={() => document.getElementById('file-input')?.click()}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
					>
						<input
							type="file"
							id="file-input"
							accept="image/jpeg,image/png,image/gif,image/webp"
							multiple
							onchange={handleFileSelect}
							class="hidden"
						/>
						{#if uploadingImages}
							<div class="flex items-center justify-center gap-2 text-blue-600">
								<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span>Caricamento...</span>
							</div>
						{:else}
							<svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<p class="mt-1 text-sm text-gray-500">Trascina le immagini qui o clicca per selezionare</p>
							<p class="text-xs text-gray-400">JPEG, PNG, GIF, WebP - Max 10MB</p>
						{/if}
					</div>
					
					<!-- Image gallery -->
					{#if images.length > 0}
						<div class="mt-3 grid grid-cols-3 gap-2">
							{#each images as img (img.id)}
								<div class="relative group aspect-square">
									<img
										src={img.url}
										alt={img.caption || img.filename}
										class="w-full h-full object-cover rounded-lg"
									/>
									<button
										type="button"
										onclick={() => deleteImageHandler(img.id)}
										class="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50">
						<svg class="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						<p class="mt-1 text-sm text-gray-400">Salva prima lo spazio per aggiungere immagini</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right column: Map picker -->
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">
				Posizione sulla mappa <span class="text-gray-400">(clicca per selezionare)</span>
			</p>
			<div bind:this={mapContainer} class="w-full h-96 rounded-lg border border-gray-300 overflow-hidden"></div>
			<p class="text-xs text-gray-500 mt-1">Clicca sulla mappa per posizionare il marker, oppure trascinalo per spostarlo.</p>
		</div>
	</div>

	<!-- Submit -->
	<div class="flex justify-end space-x-3 pt-4 border-t">
		<a href="/admin" class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">Annulla</a>
		<button
			type="submit"
			disabled={loading}
			class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
		>
			{loading ? 'Salvataggio...' : submitLabel}
		</button>
	</div>
</form>

<style>
	:global(.maplibregl-map) {
		font-family: inherit;
	}
</style>
