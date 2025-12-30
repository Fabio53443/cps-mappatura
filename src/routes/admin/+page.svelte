<script>
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { getColorForTipo } from '$lib/config/tipoConfig';

	let locations = $state([]);
	let loading = $state(true);
	let error = $state('');
	let deleteConfirm = $state(null);
	let deleting = $state(false);

	// Local state from stores (SSR safe)
	let canEdit = $state(false);
	let isAdmin = $state(false);
	let token = $state(null);

	onMount(async () => {
		const unsubs = [
			auth.canEdit.subscribe((v) => (canEdit = v)),
			auth.isAdmin.subscribe((v) => (isAdmin = v)),
			auth.token.subscribe((v) => (token = v))
		];
		await loadLocations();
		return () => unsubs.forEach((u) => u());
	});

	async function loadLocations() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/locations');
			if (!res.ok) throw new Error('Failed to load locations');
			locations = await res.json();
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function deleteLocation(id) {
		deleting = true;
		try {
			const res = await fetch(`/api/locations/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});
			
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Delete failed');
			}
			
			locations = locations.filter((l) => l.id !== id);
			deleteConfirm = null;
		} catch (err) {
			error = err.message;
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Gestione Spazi</h1>
			<p class="text-gray-500 mt-1">{locations.length} spazi totali</p>
		</div>
		{#if canEdit}
			<a
				href="/admin/locations/new"
				class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Nuovo Spazio
			</a>
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
	{:else if locations.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Nessuno spazio</h3>
			<p class="mt-1 text-sm text-gray-500">Inizia aggiungendo un nuovo spazio.</p>
		</div>
	{:else}
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipio</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indirizzo</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each locations as location (location.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{location.name}</div>
								{#if location.managedby}
									<div class="text-xs text-gray-500">Gestito da: {location.managedby}</div>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span
									class="px-2 py-1 text-xs font-medium rounded-full text-white"
									style="background-color: {getColorForTipo(location.tipo)}"
								>
									{location.tipo}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{location.municipio}
							</td>
							<td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
								{location.street}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
								<a href="/?lat={location.latitude}&lng={location.longitude}" target="_blank" class="text-gray-600 hover:text-gray-900">
									Mappa
								</a>
								<a href="/admin/locations/{location.id}/edit" class="text-blue-600 hover:text-blue-900">
									Modifica
								</a>
								{#if isAdmin}
									<button
										onclick={() => (deleteConfirm = location)}
										class="text-red-600 hover:text-red-900"
									>
										Elimina
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900 mb-2">Conferma eliminazione</h3>
			<p class="text-gray-500 mb-4">
				Sei sicuro di voler eliminare <strong>{deleteConfirm.name}</strong>? Questa azione non può essere annullata.
			</p>
			<div class="flex justify-end space-x-3">
				<button
					onclick={() => (deleteConfirm = null)}
					disabled={deleting}
					class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
				>
					Annulla
				</button>
				<button
					onclick={() => deleteLocation(deleteConfirm.id)}
					disabled={deleting}
					class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-md"
				>
					{deleting ? 'Eliminazione...' : 'Elimina'}
				</button>
			</div>
		</div>
	</div>
{/if}
