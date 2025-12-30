<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);
	let checking = $state(true);

	onMount(async () => {
		// Check if setup is needed
		try {
			const res = await fetch('/api/auth/setup');
			const data = await res.json();
			
			if (!res.ok) {
				// API error - but we might still need setup, show the form
				console.error('Setup check failed:', data.error);
				error = data.error || 'Errore nel controllo dello stato di setup';
				checking = false;
				return;
			}
			
			if (!data.needsSetup) {
				// Setup already done, redirect to login
				goto('/admin/login');
				return;
			}
			checking = false;
		} catch (err) {
			console.error('Setup check error:', err);
			error = 'Impossibile verificare lo stato di setup. Riprova.';
			checking = false;
		}
	});

	async function handleSetup(e) {
		e.preventDefault();
		error = '';

		if (password !== confirmPassword) {
			error = 'Le password non corrispondono';
			return;
		}

		if (password.length < 8) {
			error = 'La password deve essere di almeno 8 caratteri';
			return;
		}

		loading = true;

		try {
			const res = await fetch('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Setup failed');
			}

			// Success! Redirect to login
			goto('/admin/login?setup=success');
		} catch (err) {
			error = err.message || 'Setup failed';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Setup Admin - I nostri spazi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	{#if checking}
		<div class="flex flex-col items-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="mt-4 text-gray-500">Verifica in corso...</p>
		</div>
	{:else}
		<div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
			<div class="text-center mb-8">
				<div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
					<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-gray-900">Configurazione Iniziale</h1>
				<p class="text-gray-500 mt-2">Crea il primo account amministratore</p>
			</div>

			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSetup} class="space-y-6">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="admin"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						minlength="8"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="••••••••"
					/>
					<p class="text-xs text-gray-500 mt-1">Minimo 8 caratteri</p>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					{loading ? 'Creazione in corso...' : 'Crea Account Admin'}
				</button>
			</form>

			<div class="mt-6 text-center">
				<a href="/" class="text-sm text-gray-500 hover:text-gray-700">← Torna alla mappa</a>
			</div>
		</div>
	{/if}
</div>
