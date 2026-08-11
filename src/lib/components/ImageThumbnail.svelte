<script>
	import { removeImage } from '#lib/stores/app-state.svelte.js';
	import { X, GripVertical, ScanLine } from '@lucide/svelte';

	let { image, number, onpreview, onscan } = $props();
</script>

<div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden border border-border-grey group hover:shadow-md transition-all">
	<!-- Clickable image area -->
	<button
		type="button"
		class="w-full h-full cursor-pointer"
		onclick={() => onpreview(image)}
		aria-label="Preview {image.name}"
	>
		<img
			alt={image.name}
			class="w-full h-full object-cover"
			src={image.scannedPreview ?? image.preview}
		/>
	</button>

	<!-- Number badge -->
	<div class="absolute top-2 left-2 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2 py-1 rounded-md border border-border-grey">
		#{number}
	</div>

	<!-- Scanned badge -->
	{#if image.scannedPreview}
		<div class="absolute bottom-2 right-2 bg-teal-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
			<ScanLine size={10} />
			Scanned
		</div>
	{/if}

	<!-- Scan button -->
	<button
		onclick={(e) => { e.stopPropagation(); onscan(image); }}
		class="absolute top-2 right-11 w-7 h-7 flex items-center justify-center bg-slate-900/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-slate-700"
		aria-label="Scan {image.name}"
		title="Scan — straighten & enhance"
	>
		<ScanLine size={14} />
	</button>

	<!-- Remove button — fixed size circle -->
	<button
		onclick={(e) => { e.stopPropagation(); removeImage(image.id); }}
		class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
		aria-label="Remove {image.name}"
	>
		<X size={14} />
	</button>

	<!-- Drag handle -->
	<div class="drag-handle absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
		<div class="text-white bg-slate-900/40 rounded-full p-1"><GripVertical size={20} /></div>
	</div>
</div>
