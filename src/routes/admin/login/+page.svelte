<script>
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let checking = $state(true);
	let setupSuccess = $state(false);

	onMount(async () => {
		// Check if setup is needed
		try {
			const res = await fetch('/api/auth/setup');
			const data = await res.json();
			if (data.needsSetup) {
				// No users yet, redirect to setup
				goto('/admin/setup');
				return;
			}
		} catch (err) {
			console.error('Failed to check setup status');
		} finally {
			checking = false;
		}

		// Check for setup success message
		if ($page.url.searchParams.get('setup') === 'success') {
			setupSuccess = true;
		}
	});

	async function handleLogin(e) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			await auth.login(username, password);
			goto('/admin');
		} catch (err) {
			error = err.message || 'Login failed';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login</title>
</svelte:head>

{#if checking}
	<div class="min-h-[80vh] flex items-center justify-center">
		<div class="flex flex-col items-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="mt-4 text-gray-500">Caricamento...</p>
		</div>
	</div>
{:else}
	<div class="min-h-[80vh] flex items-center justify-center">
		<div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
			<div class="text-center mb-8">
				<h1 class="text-2xl font-bold text-gray-900">Admin Login</h1>
				<p class="text-gray-500 mt-2">Accedi per gestire gli spazi</p>
			</div>

			{#if setupSuccess}
				<div class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
					Account admin creato con successo! Ora puoi accedere.
				</div>
			{/if}

			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-6">
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
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="••••••••"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				{loading ? 'Accesso in corso...' : 'Accedi'}
			</button>
		</form>

		<div class="mt-6 text-center">
			<a href="/" class="text-sm text-gray-500 hover:text-gray-700">← Torna alla mappa</a>
		</div>
	</div>
</div>
{/if}
