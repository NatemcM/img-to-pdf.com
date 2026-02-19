/**
 * Load a File into an HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(`Failed to load image: ${file.name}`));
		};
		img.src = url;
	});
}

/**
 * Resize an image so its longest side is at most maxDim pixels,
 * compress to JPEG at the given quality, and return as a Uint8Array.
 *
 * @param {File} file - The image File object
 * @param {number} [maxDim=1600] - Maximum dimension for longest side
 * @param {number} [quality=0.8] - JPEG quality 0-1
 * @returns {Promise<{ bytes: Uint8Array, width: number, height: number }>}
 */
export async function processImage(file, maxDim = 1600, quality = 0.8) {
	const img = await loadImage(file);

	let { width, height } = img;

	// Resize if either dimension exceeds maxDim
	if (width > maxDim || height > maxDim) {
		const scale = maxDim / Math.max(width, height);
		width = Math.round(width * scale);
		height = Math.round(height * scale);
	}

	// Draw onto canvas at new dimensions
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(img, 0, 0, width, height);

	// Export as JPEG blob, then convert to Uint8Array
	const blob = await new Promise((resolve) => {
		canvas.toBlob(resolve, 'image/jpeg', quality);
	});
	const arrayBuffer = await blob.arrayBuffer();

	return {
		bytes: new Uint8Array(arrayBuffer),
		width,
		height
	};
}
