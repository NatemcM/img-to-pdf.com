<script>
	import { onMount } from 'svelte';
	import { X, Loader2, RotateCcw } from 'lucide-svelte';
	import { loadOpenCV, detectCorners, warpAndFilter } from '$lib/utils/scan-processor.js';
	import { defaultCorners, isValidQuad } from '$lib/utils/scan-geometry.js';
	import { setScanResult, resetScan } from '$lib/stores/app-state.svelte.js';

	let { image, onclose } = $props();

	const FILTERS = [
		{ id: 'original', label: 'Original' },
		{ id: 'enhanced', label: 'Enhanced' },
		{ id: 'grayscale', label: 'Grayscale' },
		{ id: 'bw', label: 'Black & white' }
	];

	let status = $state('loading'); // 'loading' | 'ready' | 'error' | 'applying'
	let errorMessage = $state('');
	let corners = $state(null); // natural-pixel coords {tl,tr,br,bl}
	let filter = $state('enhanced');
	let previewUrl = $state('');
	let previewPending = $state(false);

	/** @type {HTMLImageElement} */
	let imgEl = $state(null); // the displayed original image element
	let displayWidth = $state(1);
	let naturalWidth = 1;
	let naturalHeight = 1;
	let sourceImg = null; // offscreen full-res image for processing
	let debounceTimer;
	let dragging = null; // corner key while dragging
	let destroyed = false; // true once the modal has been unmounted
	let previewToken = 0; // increments per preview request; guards against stale warpAndFilter results

	const scale = $derived(displayWidth / naturalWidth);
	const quadValid = $derived(corners ? isValidQuad(corners) : false);

	async function init() {
		try {
			await loadOpenCV();
			if (destroyed) return;
			sourceImg = new Image();
			await new Promise((resolve, reject) => {
				sourceImg.onload = resolve;
				sourceImg.onerror = () => reject(new Error('Failed to load image'));
				sourceImg.src = image.preview; // always the original, not the scan
			});
			if (destroyed) return;
			naturalWidth = sourceImg.naturalWidth;
			naturalHeight = sourceImg.naturalHeight;

			if (image.scanSettings) {
				corners = $state.snapshot(image.scanSettings).corners;
				filter = image.scanSettings.filter;
			} else {
				corners = (await detectCorners(sourceImg)) ?? defaultCorners(naturalWidth, naturalHeight);
				if (destroyed) return;
			}
			status = 'ready';
			refreshPreview();
		} catch (err) {
			if (destroyed) return;
			status = 'error';
			errorMessage = err.message;
		}
	}

	onMount(() => {
		init();
		return () => {
			destroyed = true;
			clearTimeout(debounceTimer);
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	});

	function refreshPreview() {
		clearTimeout(debounceTimer);
		previewPending = true;
		debounceTimer = setTimeout(async () => {
			if (!quadValid) {
				previewPending = false;
				return;
			}
			const token = ++previewToken;
			try {
				const blob = await warpAndFilter(sourceImg, $state.snapshot(corners), filter);
				if (destroyed || token !== previewToken) {
					// Modal was closed, or a newer preview request has superseded
					// this one, while this warp was in flight; bail out before
					// creating an object URL so nothing needs revoking.
					return;
				}
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				previewUrl = URL.createObjectURL(blob);
				errorMessage = '';
			} catch (err) {
				if (destroyed || token !== previewToken) return;
				errorMessage = err.message;
			} finally {
				if (!destroyed && token === previewToken) previewPending = false;
			}
		}, 250);
	}

	function setFilter(id) {
		filter = id;
		refreshPreview();
	}

	function startDrag(key, e) {
		dragging = key;
		e.target.setPointerCapture(e.pointerId);
	}

	function onDrag(e) {
		if (!dragging || !imgEl) return;
		const rect = imgEl.getBoundingClientRect();
		const x = Math.min(naturalWidth, Math.max(0, (e.clientX - rect.left) / scale));
		const y = Math.min(naturalHeight, Math.max(0, (e.clientY - rect.top) / scale));
		corners[dragging] = { x, y };
	}

	function endDrag() {
		if (!dragging) return;
		dragging = null;
		refreshPreview();
	}

	async function apply() {
		if (!quadValid) return;
		status = 'applying';
		try {
			const blob = await warpAndFilter(sourceImg, $state.snapshot(corners), filter);
			setScanResult(image.id, blob, { corners: $state.snapshot(corners), filter });
			onclose();
		} catch (err) {
			status = 'ready';
			errorMessage = err.message;
		}
	}

	function handleReset() {
		resetScan(image.id);
		onclose();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
	onclick={onclose}
	role="dialog"
	aria-modal="true"
	aria-label="Scan document"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div
		class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6"
		role="document"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-bold text-slate-900">Scan document</h3>
			<button
				onclick={onclose}
				class="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full"
				aria-label="Close scan editor"
			>
				<X size={18} />
			</button>
		</div>

		{#if status === 'loading'}
			<div class="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
				<Loader2 size={32} class="animate-spin" />
				<p class="text-sm">Loading scanner… first use only</p>
			</div>
		{:else if status === 'error'}
			<div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between gap-4">
				<span>{errorMessage}</span>
				<button
					onclick={() => { status = 'loading'; errorMessage = ''; init(); }}
					class="shrink-0 px-3 py-1.5 text-sm font-medium bg-white border border-red-200 rounded-lg hover:bg-red-100"
				>
					Retry
				</button>
			</div>
		{:else}
			{#if errorMessage}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between gap-4">
					<span>{errorMessage}</span>
					<button
						onclick={() => (errorMessage = '')}
						class="shrink-0 w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-100 rounded-full"
						aria-label="Dismiss error"
					>
						<X size={14} />
					</button>
				</div>
			{/if}
			<div class="grid sm:grid-cols-2 gap-6">
				<!-- Corner adjustment pane -->
				<div>
					<p class="text-xs font-semibold text-slate-500 uppercase mb-2">Adjust corners</p>
					<div class="relative select-none touch-none inline-block" onpointermove={onDrag} onpointerup={endDrag}>
						<img
							bind:this={imgEl}
							bind:clientWidth={displayWidth}
							src={image.preview}
							alt={image.name}
							class="max-w-full max-h-[55vh] rounded-lg"
							draggable="false"
						/>
						{#if corners}
							<svg class="absolute inset-0 w-full h-full pointer-events-none">
								<polygon
									points={['tl', 'tr', 'br', 'bl']
										.map((k) => `${corners[k].x * scale},${corners[k].y * scale}`)
										.join(' ')}
									class={quadValid ? 'fill-teal-500/15 stroke-teal-500' : 'fill-red-500/15 stroke-red-500'}
									stroke-width="2"
								/>
							</svg>
							{#each ['tl', 'tr', 'br', 'bl'] as key (key)}
								<div
									class="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-white border-2 {quadValid
										? 'border-teal-500'
										: 'border-red-500'} shadow cursor-grab active:cursor-grabbing"
									style="left: {corners[key].x * scale}px; top: {corners[key].y * scale}px"
									onpointerdown={(e) => startDrag(key, e)}
									role="slider"
									aria-label="Corner {key}"
									aria-valuenow={Math.round(corners[key].x)}
									tabindex="0"
								></div>
							{/each}
						{/if}
					</div>
					{#if !quadValid}
						<p class="text-xs text-red-500 mt-2">Corners must form a convex shape.</p>
					{/if}
				</div>

				<!-- Preview pane -->
				<div>
					<p class="text-xs font-semibold text-slate-500 uppercase mb-2">Preview</p>
					<div class="bg-slate-100 rounded-lg min-h-48 flex items-center justify-center relative">
						{#if previewUrl}
							<img src={previewUrl} alt="Scan preview" class="max-w-full max-h-[45vh] rounded-lg" class:opacity-50={previewPending} />
						{:else}
							<Loader2 size={24} class="animate-spin text-slate-400" />
						{/if}
					</div>

					<div class="flex flex-wrap gap-2 mt-4">
						{#each FILTERS as f (f.id)}
							<button
								onclick={() => setFilter(f.id)}
								class="px-3 py-1.5 text-sm rounded-full border transition-colors {filter === f.id
									? 'bg-slate-900 text-white border-slate-900'
									: 'bg-white text-slate-600 border-border-grey hover:border-slate-400'}"
							>
								{f.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border-grey">
				{#if image.scannedBlob}
					<button
						onclick={handleReset}
						class="mr-auto text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1"
					>
						<RotateCcw size={16} />
						Reset to original
					</button>
				{/if}
				<button onclick={onclose} class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
					Cancel
				</button>
				<button
					onclick={apply}
					disabled={!quadValid || status === 'applying'}
					class="px-5 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-40 flex items-center gap-2"
				>
					{#if status === 'applying'}<Loader2 size={16} class="animate-spin" />{/if}
					Apply
				</button>
			</div>
		{/if}
	</div>
</div>
