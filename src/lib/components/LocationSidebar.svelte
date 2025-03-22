<script>
	import { getColorForTipo } from '$lib/config/tipoConfig';
	import { createEventDispatcher } from 'svelte';
	
	export let location = null;
	export let images = [];
	export let onClose = () => {};
	
	const dispatch = createEventDispatcher();
	
	let currentImageIndex = 0;
	
	$: hasImages = images && images.length > 0;
	$: currentImage = hasImages ? images[currentImageIndex] : null;
	
	function nextImage() {
		if (!hasImages) return;
		currentImageIndex = (currentImageIndex + 1) % images.length;
	}
	
	function prevImage() {
		if (!hasImages) return;
		currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
	}
	
	// Function to extract domain from URL
	function extractDomain(url) {
		try {
			// Add protocol if missing
			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				url = 'https://' + url;
			}
			
			const domain = new URL(url).hostname;
			return domain.replace(/^www\./, ''); // Remove www. if present
		} catch (e) {
			return url; // Return original string if URL parsing fails
		}
	}
	
	// Function to filter by tipo/category
	function filterByTipo(tipo) {
		dispatch('filter-tipo', { tipo });
	}
</script>

{#if location}
	<div class="sidebar bg-white p-5 overflow-y-auto shadow-lg rounded-lg">
		<div class="flex justify-between items-start mb-2">
			<div>
				<h2 class="text-xl font-bold">{location.name}</h2>
				{#if location.tipo}
					<button 
						class="tipo-pill inline-block px-3 py-1 mt-2 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2"
						style="background-color: {getColorForTipo(location.tipo)};"
						on:click={() => filterByTipo(location.tipo)}
						aria-label="Filtra per {location.tipo}"
					>
						{location.tipo}
					</button>
				{/if}
			</div>
			<button 
				class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
				on:click={onClose}
				aria-label="Close"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
		
		{#if hasImages}
			<div class="image-gallery mb-5 relative">
				<div class="image-container rounded-lg overflow-hidden bg-gray-100">
					<img 
						src={currentImage.url} 
						alt={currentImage.caption || location.name} 
						class="w-full h-56 object-cover transition-opacity duration-300"
					/>
				</div>
				
				{#if currentImage.caption}
					<p class="text-sm italic mt-2 text-gray-600">{currentImage.caption}</p>
				{/if}
				
				{#if images.length > 1}
					<div class="navigation flex justify-between absolute top-1/2 w-full px-3 transform -translate-y-1/2">
						<button 
							class="bg-white bg-opacity-70 text-gray-800 p-2 rounded-full hover:bg-opacity-100 transition-all shadow-md"
							on:click={prevImage}
							aria-label="Previous image"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						</button>
						<button 
							class="bg-white bg-opacity-70 text-gray-800 p-2 rounded-full hover:bg-opacity-100 transition-all shadow-md"
							on:click={nextImage}
							aria-label="Next image"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
					
					<div class="image-counter flex justify-center mt-3 gap-1">
						{#each images as _, i}
							<button 
								class={`h-2 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-blue-500' : 'w-2 bg-gray-300'}`}
								on:click={() => currentImageIndex = i}
								aria-label={`Image ${i + 1}`}
							></button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		
		{#if location.description}
			<div class="description mt-5 prose prose-sm max-w-none">
				<h3 class="text-lg font-semibold mb-2">Descrizione</h3>
				<p class="text-gray-700">{location.description}</p>
			</div>
		{/if}
		
		<!-- Location Details Section -->
		<div class="location-details mt-5">
			<h3 class="text-lg font-semibold mb-2">Dove si trova
			</h3>
			{#if location.street}
				<div class="flex items-start mb-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
					</svg>
					<div>
						<p class="text-gray-700">{location.street}</p>
						{#if location.municipio}
							<p class="text-gray-600 text-sm">Municipio {location.municipio}</p>
						{/if}
					</div>
				</div>
			{/if}
			
			{#if location.managedby}
				<div class="flex items-center mb-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
						<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
					</svg>
					<p class="text-gray-700">Gestito da: {location.managedby}</p>
				</div>
			{/if} 
			
			{#if location.link}
				<div class="flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
					</svg>
					<a 
						href={location.link.startsWith('http') ? location.link : 'https://' + location.link} 
						target="_blank" 
						rel="noopener noreferrer" 
						class="text-blue-600 hover:underline group"
					>
						Visita sito <span class="text-gray-500 font-normal">({extractDomain(location.link)})</span>
						<svg class="inline-block h-3 w-3 ml-1 text-gray-400 group-hover:text-blue-500 transition-colors transform translate-y-[-2px]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
							<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
							<path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
						</svg>
					</a>
				</div>
			{/if}
		</div>
		
		<div class="coordinates mt-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex items-center">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
		</div>
		
		<a 
			href="https://www.google.com/maps/dir/?api=1&destination={location.latitude},{location.longitude}" 
			target="_blank" 
			rel="noopener noreferrer" 
			class="mt-3 flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clip-rule="evenodd" />
			</svg>
			Naviga qui
		</a>
	</div>
{/if}

<style>
	.sidebar {
		height: 100%;
		width: 100%;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform, opacity;
		transform: translateZ(0);
		backface-visibility: hidden;
	}
	
	@media (min-width: 768px) {
		.sidebar {
			max-width: 100%;
		}
	}
	
	@media (min-width: 1024px) {
		.sidebar {
			max-width: 100%;
		}
	}
	
	.image-container img {
		will-change: opacity;
		transform: translateZ(0);
	}
	
	/* Hide scrollbars on mobile but keep functionality */
	@media (max-width: 767px) {
		.sidebar {
			scrollbar-width: none; /* Firefox */
			-ms-overflow-style: none; /* IE and Edge */
		}
		
		.sidebar::-webkit-scrollbar {
			display: none; /* Chrome, Safari, Opera */
		}
		
		/* Animate content when it first appears */
		.sidebar > * {
			animation: fadeIn 0.5s ease-out forwards;
			opacity: 0;
		}
		
		@keyframes fadeIn {
			0% { opacity: 0; transform: translateY(10px); }
			100% { opacity: 1; transform: translateY(0); }
		}
		
		/* Stagger the animations */
		.sidebar > *:nth-child(1) { animation-delay: 0.05s; }
		.sidebar > *:nth-child(2) { animation-delay: 0.1s; }
		.sidebar > *:nth-child(3) { animation-delay: 0.15s; }
		.sidebar > *:nth-child(4) { animation-delay: 0.2s; }
		.sidebar > *:nth-child(5) { animation-delay: 0.25s; }
		.sidebar > *:nth-child(6) { animation-delay: 0.3s; }
		.sidebar > *:nth-child(7) { animation-delay: 0.35s; }
	}
	
	/* Add a subtle bounce effect for interaction elements on mobile */
	@media (max-width: 767px) {
		button:active, a:active {
			transform: scale(0.96);
			transition: transform 0.1s ease;
		}
	}
	
	.tipo-pill {
		transition: all 0.2s ease-in-out;
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
		text-transform: capitalize;
		cursor: pointer;
	}
</style>
