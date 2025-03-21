<script>
	import '../app.css';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	
	let showMobileMenu = $state(false);
	let isScrolled = $state(false);
	let scrollTimeout;
	
	function toggleMobileMenu() {
		showMobileMenu = !showMobileMenu;
	}
	
	onMount(() => {
		const handleScroll = () => {
			// Clear any existing timeout
			if (scrollTimeout) clearTimeout(scrollTimeout);
			
			// Set a timeout to debounce the scroll event
			scrollTimeout = setTimeout(() => {
				// Add a small buffer to prevent jitter
				if (window.scrollY > 25) {
					isScrolled = true;
				} else if (window.scrollY < 15) {
					isScrolled = false;
				}
				// If between 15-25px, keep the current state to prevent toggling
			}, 50);
		};
		
		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeout) clearTimeout(scrollTimeout);
		};
	});
</script>

<div class="min-h-screen flex flex-col font-['DM_Sans',sans-serif]">
	<header class="py-3 sticky top-0 z-50 bg-white transition-all duration-300 font-['DM_Sans',sans-serif] {isScrolled ? 'shadow-md py-1' : ''}" 
		aria-label="Header">
		<div class="container mx-auto px-4">
			<div class="flex justify-center items-center relative">
				<a 
					href="/progetto" 
					target="_self" 
					rel="noopener noreferrer"
					class="absolute left-4 hidden md:block font-bold text-black hover:text-[#c2273d] transition-colors font-['DM_Sans',sans-serif] group"
				>
					<span>Il Progetto</span>
					<span class="absolute left-0 bottom-0 w-0 h-[2px] bg-[#3059a7] group-hover:w-full transition-all duration-300 ease-in-out"></span>
				</a>
				
				<div class="flex items-center gap-3">
					<a href="/">
						<img src="/nostrispazi.svg" alt="Logo" 
							class="transition-all duration-300 {isScrolled ? 'h-12' : 'h-20'} w-auto" />
					</a>
				</div>
				
				<a 
					href="https://cpsroma.it" 
					target="_blank" 
					rel="noopener noreferrer"
					class="absolute right-16 md:right-4 hidden md:flex items-center gap-2 bg-white hover:bg-gray-100 text-red-600 py-2 px-4 rounded-full transition-colors shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:shadow-[0_0_15px_rgba(220,38,38,0.7)]"
					aria-label="Sito della CPS Roma"
				>
					<img src="/cps.svg" alt="CPS Logo" class="h-5 w-auto" />
					<span class="hidden md:inline">CPS Roma</span>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" transform="rotate(45 12 12)" />
					</svg>
				</a>
				
				<button 
					class="absolute right-0 block md:hidden bg-gray-100 p-2 rounded-md" 
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
					<div class="bg-white rounded-lg shadow-lg p-4 font-['DM_Sans',sans-serif]">
						<a 
							href="/progetto" 
							class="flex items-center gap-2 font-bold text-black hover:text-[#c2273d] py-3 px-4 rounded-lg transition-colors w-full mb-2 relative group"
						>
							<span>Il Progetto</span>
							<span class="absolute left-4 right-4 bottom-2 h-[2px] bg-[#3059a7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
						</a>

						<a 
							href="https://cpsroma.it" 
							target="_blank" 
							rel="noopener noreferrer"
							class="flex items-center gap-2 bg-white hover:bg-gray-100 text-red-600 py-3 px-4 rounded-lg transition-colors w-full mb-2"
							aria-label="Sito della CPS Roma"
						>
							<img src="/cps.svg" alt="CPS Logo" class="h-5 w-auto" />
							<span>CPS Roma</span>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" transform="rotate(45 12 12)" />
							</svg>
						</a>
						<!-- Additional mobile menu items can be added here -->
					</div>
				</div>
			{/if}
		</div>
	</header>
	
	<main class="container mx-auto px-4 py-6 flex-grow">
		{@render children()}
	</main>
	
	<footer class="py-8 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
		<div class="container mx-auto px-4">
			<div class="flex flex-col md:flex-row items-center justify-between gap-6">
				<div class="flex items-center gap-4">
					<img src="/cps.svg" alt="CPS Logo" class="h-12 w-auto" />
					<div class="flex flex-col">
						<span class="font-bold text-gray-800">Consulta Provinciale degli Studenti di Roma</span>
						<a 
							href="https://cpsroma.it" 
							target="_blank" 
							rel="noopener noreferrer"
							class="text-[#c2273d] hover:underline"
						>
							cpsroma.it
						</a>
					</div>
				</div>
				
				<div class="text-center md:text-right max-w-md">
					<p class="text-sm text-gray-600 mb-2">
						Questo progetto è stato elaborato dalla commissione Diritto allo Studio nel biennio 2023/2025, con il contributo dell'Assessorato alle Politiche Sociali e alla Salute del Comune di Roma.
					</p>
					<p class="text-sm text-gray-500">
						&copy; {new Date().getFullYear()} Consulta Provinciale degli Studenti di Roma
					</p>
				</div>
			</div>
		</div>
	</footer>
</div>
