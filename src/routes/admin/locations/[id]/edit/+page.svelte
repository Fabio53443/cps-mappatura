<script>
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import LocationForm from '$lib/components/LocationForm.svelte';

	let location = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	const locationId = $derived($page.params.id);

	onMount(async () => {
		await loadLocation();
	});

	async function loadLocation() {
		loading = true;
		error = '';

		try {
			const res = await fetch('/api/locations');
			if (!res.ok) throw new Error('Failed to load locations');
			
			const locations = await res.json();
			const found = locations.find((l) => l.id === Number(locationId));
			
			if (!found) {
				throw new Error('Location not found');
			}
			
			location = found;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(data) {
		saving = true;
		error = '';

		try {
			let token;
			auth.token.subscribe((t) => (token = t))();

			const res = await fetch(`/api/locations/${locationId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(data)
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to update location');
			}

			goto('/admin');
		} catch (err) {
			error = err.message;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{location?.name ? `Modifica ${location.name}` : 'Modifica Spazio'} - Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Modifica Spazio</h1>
		{#if location}
			<p class="text-gray-500 mt-1">Modifica i dettagli di <strong>{location.name}</strong></p>
		{/if}
	</div>

	{#if error}
		<div class="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
			{error}
			<button onclick={() => (error = '')} class="ml-2 text-red-500 hover:text-red-700">×</button>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if location}
		<div class="bg-white shadow rounded-lg p-6">
			<LocationForm
				initialData={location}
				onSubmit={handleSubmit}
				submitLabel="Salva Modifiche"
				loading={saving}
			/>
		</div>
	{:else}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<p class="text-gray-500">Spazio non trovato</p>
			<a href="/admin" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">← Torna alla lista</a>
		</div>
	{/if}
</div>
