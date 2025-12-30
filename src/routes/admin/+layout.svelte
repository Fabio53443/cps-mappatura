<script>
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	// Local state derived from stores (for SSR safety)
	let isAuthenticated = $state(false);
	let canEdit = $state(false);
	let isAdmin = $state(false);
	let user = $state(null);

	// Redirect to login if not authenticated (except on login page)
	onMount(() => {
		// Force enable scrolling on admin pages
		document.documentElement.style.overflow = 'auto';
		document.documentElement.style.height = 'auto';
		document.body.style.overflow = 'auto';
		document.body.style.height = 'auto';
		document.documentElement.classList.remove('map-page');
		
		const unsubs = [
			auth.isAuthenticated.subscribe((v) => (isAuthenticated = v)),
			auth.canEdit.subscribe((v) => (canEdit = v)),
			auth.isAdmin.subscribe((v) => (isAdmin = v)),
			auth.user.subscribe((v) => (user = v))
		];

		// Check auth and redirect if needed (except login and setup pages)
		const pathname = $page.url.pathname;
		if (!isAuthenticated && !pathname.endsWith('/login') && !pathname.endsWith('/setup')) {
			goto('/admin/login');
		}

		return () => {
			unsubs.forEach((u) => u());
			// Reset styles when leaving admin
			document.documentElement.style.overflow = '';
			document.documentElement.style.height = '';
			document.body.style.overflow = '';
			document.body.style.height = '';
		};
	});

	function handleLogout() {
		auth.logout();
		goto('/admin/login');
	}

	// Check if on login or setup page (public pages)
	let isPublicPage = $derived(
		$page.url.pathname.endsWith('/login') || $page.url.pathname.endsWith('/setup')
	);
</script>

<div class="min-h-screen bg-gray-50 overflow-auto">
	{#if isAuthenticated || isPublicPage}
		<!-- Admin Header -->
		{#if isAuthenticated}
			<header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex justify-between items-center h-16">
						<div class="flex items-center space-x-4">
							<a href="/admin" class="text-xl font-bold text-gray-900">Admin Panel</a>
							<nav class="hidden md:flex space-x-4">
								<a href="/admin" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
								{#if canEdit}
									<a href="/admin/locations/new" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">+ Nuovo Spazio</a>
								{/if}
							</nav>
						</div>
						<div class="flex items-center space-x-4">
							<span class="text-sm text-gray-500">
								{user?.email}
								<span class="ml-1 px-2 py-0.5 text-xs font-medium rounded-full {isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
									{user?.role}
								</span>
							</span>
							<button
								onclick={handleLogout}
								class="text-sm text-gray-600 hover:text-gray-900"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</header>
		{/if}

		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{@render children()}
		</main>
	{:else}
		<div class="flex items-center justify-center min-h-screen">
			<p class="text-gray-500">Caricamento...</p>
		</div>
	{/if}
</div>

<style>
	/* Override the root layout's overflow-hidden for admin pages */
	:global(body) {
		overflow: auto !important;
	}
	:global(html) {
		overflow: auto !important;
	}
</style>
