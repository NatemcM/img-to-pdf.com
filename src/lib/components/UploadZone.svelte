<script>
	import { appState, addImages, setError } from '$lib/stores/app-state.svelte.js';
	import { validateFile } from '$lib/utils/file-helpers.js';

	let isDragging = $state(false);
	let fileInput;

	function handleDrop(e) {
		e.preventDefault();
		isDragging = false;
		processFiles([...e.dataTransfer.files]);
	}

	function handleDragOver(e) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleFileSelect(e) {
		processFiles([...e.target.files]);
		e.target.value = '';
	}

	function processFiles(files) {
		const maxCount = 20;
		const remaining = maxCount - appState.images.length;

		if (remaining <= 0) {
			setError('Maximum 20 images allowed.');
			return;
		}

		const errors = [];
		const valid = [];

		for (const file of files) {
			const result = validateFile(file);
			if (result.valid) {
				valid.push(file);
			} else {
				errors.push(result.error);
			}
		}

		if (valid.length > remaining) {
			errors.push(`Only ${remaining} more image(s) can be added. Some files were skipped.`);
		}

		if (valid.length > 0) {
			addImages(valid.slice(0, remaining));
		}

		if (errors.length > 0) {
			setError(errors.join(' '));
		}
	}
</script>

<div class="relative">
	<button
		type="button"
		class="upload-zone flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl bg-white transition-all cursor-pointer p-8 group {isDragging ? 'border-primary bg-soft-grey' : 'border-border-grey'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput.click()}
	>
		<div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
			<span class="material-symbols-outlined text-4xl">cloud_upload</span>
		</div>
		<h3 class="text-xl font-bold text-slate-800 mb-2">Drag and drop images here</h3>
		<p class="text-sm text-slate-500 mb-8">Up to 20 images per PDF &bull; Max 20MB per file</p>
		<span class="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all flex items-center gap-2">
			<span class="material-symbols-outlined">add_photo_alternate</span>
			Select Files
		</span>
	</button>

	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept=".jpg,.jpeg,.png,.webp"
		class="hidden"
		onchange={handleFileSelect}
	/>
</div>
