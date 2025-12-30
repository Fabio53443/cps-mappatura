<script>
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import LocationForm from '$lib/components/LocationForm.svelte';

	let loading = $state(false);
	let error = $state('');
	let showImagePrompt = $state(false);
	let createdLocationId = $state(null);

	async function handleSubmit(data) {
		loading = true;
		error = '';

		try {
			let token;
			auth.token.subscribe((t) => (token = t))();

			const res = await fetch('/api/locations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(data)
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to create location');
			}

			// Show prompt to add images
			createdLocationId = result.id;
			showImagePrompt = true;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function goToEdit() {
		goto(`/admin/locations/${createdLocationId}/edit`);
	}

	function goToAdmin() {
		goto('/admin');
	}
</script>

<svelte:head>
	<title>Nuovo Spazio - Admin</title>
</svelte:head>

{#if showImagePrompt}
	<!-- Image prompt modal -->
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<div class="text-center">
				<div class="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Spazio creato!</h3>
				<p class="text-gray-500 mb-6">Vuoi aggiungere delle immagini a questo spazio?</p>
				<div class="flex gap-3 justify-center">
					<button
						onclick={goToAdmin}
						class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						No, torna alla lista
					</button>
					<button
						onclick={goToEdit}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
					>
						Sì, aggiungi immagini
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Nuovo Spazio</h1>
		<p class="text-gray-500 mt-1">Aggiungi un nuovo spazio alla mappa</p>
	</div>

	{#if error}
		<div class="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
			{error}
			<button onclick={() => (error = '')} class="ml-2 text-red-500 hover:text-red-700">×</button>
		</div>
	{/if}

	<div class="bg-white shadow rounded-lg p-6">
		<LocationForm onSubmit={handleSubmit} submitLabel="Crea Spazio" {loading} />
	</div>
</div>
