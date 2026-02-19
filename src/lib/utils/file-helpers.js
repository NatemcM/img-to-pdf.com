let nextId = 1;

/** Generate a unique ID for an image. */
export function generateId() {
	return nextId++;
}

/**
 * Validate a single file for upload.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
	const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
	const maxSize = 20 * 1024 * 1024; // 20MB

	if (!allowedTypes.includes(file.type)) {
		return { valid: false, error: `Unsupported file type: ${file.name}` };
	}
	if (file.size > maxSize) {
		return { valid: false, error: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, max 20MB)` };
	}
	return { valid: true };
}

/**
 * Trigger a download of a Blob as a file.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
