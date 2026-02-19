import { PDFDocument, PageSizes } from 'pdf-lib';
import { processImage } from './image-processor.js';
import { appState, setIsGenerating, setProgress } from '$lib/stores/app-state.svelte.js';

const PAGE_SIZE_MAP = {
	a4: PageSizes.A4, // [595.28, 841.89]
	letter: PageSizes.Letter // [612, 792]
};

// Margin for fixed-size pages in points (~0.5 inch)
const MARGIN = 36;

/**
 * Generate a PDF from the current images in the store.
 * @returns {Promise<Uint8Array>}
 */
export async function generatePdf() {
	setIsGenerating(true);
	setProgress(0);

	try {
		const pdfDoc = await PDFDocument.create();
		const totalImages = appState.images.length;

		for (let i = 0; i < totalImages; i++) {
			const imageObj = appState.images[i];

			// Process image: resize + JPEG compress
			const { bytes, width: imgW, height: imgH } = await processImage(imageObj.file);
			setProgress(Math.round(((i + 0.5) / totalImages) * 100));

			// Embed JPEG into PDF
			const embeddedImage = await pdfDoc.embedJpg(bytes);

			if (appState.pageSize === 'fit') {
				// Page size matches image dimensions
				// Convert pixels to points at 150 DPI: points = pixels * 72 / 150
				const pageW = imgW * (72 / 150);
				const pageH = imgH * (72 / 150);
				const page = pdfDoc.addPage([pageW, pageH]);
				page.drawImage(embeddedImage, {
					x: 0,
					y: 0,
					width: pageW,
					height: pageH
				});
			} else {
				// Fixed page size (A4 or Letter)
				const [pageW, pageH] = PAGE_SIZE_MAP[appState.pageSize];
				const page = pdfDoc.addPage([pageW, pageH]);

				// Available drawing area
				const availW = pageW - 2 * MARGIN;
				const availH = pageH - 2 * MARGIN;

				// Scale image to fit within available area preserving aspect ratio
				const imgAspect = imgW / imgH;
				const areaAspect = availW / availH;

				let drawW, drawH;
				if (imgAspect > areaAspect) {
					drawW = availW;
					drawH = availW / imgAspect;
				} else {
					drawH = availH;
					drawW = availH * imgAspect;
				}

				// Center on page (PDF origin is bottom-left)
				const x = (pageW - drawW) / 2;
				const y = (pageH - drawH) / 2;

				page.drawImage(embeddedImage, {
					x,
					y,
					width: drawW,
					height: drawH
				});
			}

			setProgress(Math.round(((i + 1) / totalImages) * 100));
		}

		const pdfBytes = await pdfDoc.save();
		return pdfBytes;
	} finally {
		setIsGenerating(false);
		setProgress(0);
	}
}
