<script>
	import { onMount, onDestroy } from 'svelte';
	import Sortable from 'sortablejs';
	import { appState, reorderImages, clearAll } from '$lib/stores/app-state.svelte.js';
	import ImageThumbnail from './ImageThumbnail.svelte';

	let gridElement;
	let sortableInstance;
	let previewImage = $state(null);

	function openPreview(image) {
		previewImage = image;
	}

	function closePreview() {
		previewImage = null;
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') closePreview();
	}

	onMount(() => {
		sortableInstance = Sortable.create(gridElement, {
			animation: 150,
			ghostClass: 'opacity-30',
			handle: '.drag-handle',
			onEnd(evt) {
				if (evt.oldIndex !== evt.newIndex) {
					reorderImages(evt.oldIndex, evt.newIndex);
				}
			}
		});
	});

	onDestroy(() => {
		if (sortableInstance) sortableInstance.destroy();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="mt-16">
	<div class="flex items-center justify-between mb-8">
		<h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
			Selected Images
			<span class="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-border-grey">
				{appState.images.length} file{appState.images.length !== 1 ? 's' : ''}
			</span>
		</h3>
		<button
			onclick={clearAll}
			class="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors"
		>
			<span class="material-symbols-outlined text-lg">delete</span>
			Clear All
		</button>
	</div>

	<div
		bind:this={gridElement}
		class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-16"
	>
		{#each appState.images as image, index (image.id)}
			<ImageThumbnail {image} number={index + 1} onpreview={openPreview} />
		{/each}
	</div>
</section>

<!-- Image preview modal -->
{#if previewImage}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm"
		onclick={closePreview}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closePreview(); }}
		role="dialog"
		aria-modal="true"
		aria-label="Image preview"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div class="relative max-w-[90vw] max-h-[90vh]" role="document" onclick={(e) => e.stopPropagation()}>
			<img
				src={previewImage.preview}
				alt={previewImage.name}
				class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
			/>
			<div class="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/80 text-sm truncate max-w-[80vw] text-center">
				{previewImage.name}
			</div>
			<button
				onclick={closePreview}
				class="absolute -top-3 -right-3 w-9 h-9 flex items-center justify-center bg-white text-slate-700 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
				aria-label="Close preview"
			>
				<span class="material-symbols-outlined text-lg">close</span>
			</button>
		</div>
	</div>
{/if}
