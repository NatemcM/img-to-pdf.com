<script>
	import { removeImage } from '$lib/stores/app-state.svelte.js';

	let { image, number, onpreview } = $props();
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
			src={image.preview}
		/>
	</button>

	<!-- Number badge -->
	<div class="absolute top-2 left-2 bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md border border-border-grey">
		#{number}
	</div>

	<!-- Remove button — fixed size circle -->
	<button
		onclick={(e) => { e.stopPropagation(); removeImage(image.id); }}
		class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
		aria-label="Remove {image.name}"
	>
		<span class="material-symbols-outlined text-sm">close</span>
	</button>

	<!-- Drag handle -->
	<div class="drag-handle absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
		<span class="material-symbols-outlined text-white bg-slate-900/40 rounded-full p-1">drag_indicator</span>
	</div>
</div>
