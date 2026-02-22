import { generateId } from '$lib/utils/file-helpers.js';

/**
 * Single reactive state object. Exported directly — only properties are mutated,
 * the object reference itself is never reassigned, which satisfies Svelte 5's
 * "state_invalid_export" rule.
 */
export const appState = $state({
	images: [],
	pdfFilename: 'combined',
	pageSize: 'a4',
	email: '',
	isGenerating: false,
	isSendingEmail: false,
	progress: 0,
	errorMessage: '',
	successMessage: ''
});

// --- Actions ---

/**
 * Add validated image files to the images array.
 * @param {File[]} files
 */
export function addImages(files) {
	const maxCount = 20;
	const remaining = maxCount - appState.images.length;
	const toAdd = files.slice(0, remaining);

	for (const file of toAdd) {
		const preview = URL.createObjectURL(file);
		appState.images.push({
			id: generateId(),
			file,
			name: file.name,
			preview
		});
	}
}

/**
 * Remove an image by its id and revoke its object URL.
 * @param {number} id
 */
export function removeImage(id) {
	const index = appState.images.findIndex((img) => img.id === id);
	if (index !== -1) {
		URL.revokeObjectURL(appState.images[index].preview);
		appState.images.splice(index, 1);
	}
}

/**
 * Reorder images by moving an item from oldIndex to newIndex.
 * @param {number} oldIndex
 * @param {number} newIndex
 */
export function reorderImages(oldIndex, newIndex) {
	const [item] = appState.images.splice(oldIndex, 1);
	appState.images.splice(newIndex, 0, item);
}

/** Remove all images and revoke all object URLs. */
export function clearAll() {
	for (const img of appState.images) {
		URL.revokeObjectURL(img.preview);
	}
	appState.images.length = 0;
}

/** @param {string} name */
export function setFilename(name) {
	appState.pdfFilename = name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'combined';
}

/** @param {string} size */
export function setPageSize(size) {
	appState.pageSize = size;
}

/** @param {string} addr */
export function setEmail(addr) {
	appState.email = addr;
}

/** @param {boolean} val */
export function setIsGenerating(val) {
	appState.isGenerating = val;
}

/** @param {number} val */
export function setProgress(val) {
	appState.progress = val;
}

/** @param {boolean} val */
export function setIsSendingEmail(val) {
	appState.isSendingEmail = val;
}

/** @param {string} msg */
export function setError(msg) {
	appState.errorMessage = msg;
}

/** @param {string} msg */
export function setSuccess(msg) {
	appState.successMessage = msg;
}
