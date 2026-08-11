import { orderCorners, outputSize } from './scan-geometry.js';

/**
 * Facade over OpenCV.js for the scan feature. OpenCV (~10MB WASM) is
 * self-hosted at /vendor/opencv.js and loaded lazily on first use.
 * Everything runs client-side; no image data leaves the browser.
 */

let cvPromise = null;

/**
 * Idempotent lazy loader. Injects the opencv.js script tag once and
 * resolves with the ready `cv` module. On failure the cached promise is
 * cleared so the user can retry.
 * @returns {Promise<any>}
 */
export function loadOpenCV() {
	if (cvPromise) return cvPromise;
	cvPromise = new Promise((resolve, reject) => {
		const fail = () => {
			cvPromise = null;
			reject(new Error('Failed to load the scanner engine'));
		};
		const script = document.createElement('script');
		script.src = '/vendor/opencv.js';
		script.async = true;
		script.onerror = fail;
		script.onload = () => {
			const mod = window.cv;
			// opencv.js 4.x builds expose either a thenable or an object
			// that signals readiness via onRuntimeInitialized.
			if (mod && typeof mod.then === 'function') {
				mod.then(resolve, fail);
			} else if (mod && mod.Mat) {
				resolve(mod);
			} else if (mod) {
				mod.onRuntimeInitialized = () => resolve(mod);
			} else {
				fail();
			}
		};
		document.head.appendChild(script);
	});
	return cvPromise;
}

/**
 * Detect the four corners of the most document-like contour.
 * Runs on a downscaled copy (max 800px) for speed, then scales the
 * result back to natural-image coordinates.
 * @param {HTMLImageElement} imgEl - loaded image
 * @returns {Promise<{tl,tr,br,bl} | null>}
 */
export async function detectCorners(imgEl) {
	const cv = await loadOpenCV();

	const natW = imgEl.naturalWidth;
	const natH = imgEl.naturalHeight;
	const scale = Math.min(1, 800 / Math.max(natW, natH));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(natW * scale));
	canvas.height = Math.max(1, Math.round(natH * scale));
	canvas.getContext('2d').drawImage(imgEl, 0, 0, canvas.width, canvas.height);

	const src = cv.imread(canvas);
	const gray = new cv.Mat();
	const edges = new cv.Mat();
	const contours = new cv.MatVector();
	const hierarchy = new cv.Mat();
	let best = null;

	try {
		cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
		cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
		cv.Canny(gray, edges, 75, 200);
		// Close small gaps in edges so the paper outline forms one contour
		const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
		try {
			cv.dilate(edges, edges, kernel);
		} finally {
			kernel.delete();
		}

		cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		const minArea = canvas.width * canvas.height * 0.1;
		let bestArea = minArea;
		for (let i = 0; i < contours.size(); i++) {
			let contour = null;
			let approx = null;
			try {
				contour = contours.get(i);
				const area = cv.contourArea(contour);
				if (area > bestArea) {
					approx = new cv.Mat();
					cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);
					if (approx.rows === 4 && cv.isContourConvex(approx)) {
						bestArea = area;
						const pts = [];
						for (let j = 0; j < 4; j++) {
							pts.push({
								x: approx.data32S[j * 2] / scale,
								y: approx.data32S[j * 2 + 1] / scale
							});
						}
						best = orderCorners(pts);
					}
				}
			} finally {
				if (approx) approx.delete();
				if (contour) contour.delete();
			}
		}
	} finally {
		src.delete();
		gray.delete();
		edges.delete();
		contours.delete();
		hierarchy.delete();
	}

	return best;
}

/**
 * Flatten uneven lighting and whiten the paper by dividing the image by
 * a heavily blurred copy of itself (background estimation). Works on
 * color (RGBA) and single-channel mats. Returns a new mat; caller deletes.
 */
function normalizeBackground(cv, mat) {
	const f = new cv.Mat();
	mat.convertTo(f, cv.CV_32F);
	const bg = new cv.Mat();
	cv.GaussianBlur(f, bg, new cv.Size(55, 55), 0);
	const out32 = new cv.Mat();
	cv.divide(f, bg, out32, 255);
	const out = new cv.Mat();
	out32.convertTo(out, cv.CV_8U);
	f.delete();
	bg.delete();
	out32.delete();
	return out;
}

/**
 * Perspective-correct the quad to a flat rectangle (longest side capped
 * at 1600px) and apply the chosen scan-look filter.
 * @param {HTMLImageElement} imgEl
 * @param {{tl,tr,br,bl}} corners - natural-pixel coordinates
 * @param {'original'|'enhanced'|'grayscale'|'bw'} filter
 * @returns {Promise<Blob>} JPEG blob
 */
export async function warpAndFilter(imgEl, corners, filter) {
	const cv = await loadOpenCV();
	const { width, height } = outputSize(corners, 1600);

	let src = null;
	let warped = null;
	let srcTri = null;
	let dstTri = null;
	let M = null;
	const extra = [];

	try {
		src = cv.imread(imgEl);
		warped = new cv.Mat();
		srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
			corners.tl.x, corners.tl.y,
			corners.tr.x, corners.tr.y,
			corners.br.x, corners.br.y,
			corners.bl.x, corners.bl.y
		]);
		dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
		M = cv.getPerspectiveTransform(srcTri, dstTri);

		cv.warpPerspective(
			src, warped, M, new cv.Size(width, height),
			cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar()
		);

		let out = warped;
		if (filter === 'enhanced') {
			out = normalizeBackground(cv, warped);
			extra.push(out);
		} else if (filter === 'grayscale') {
			const gray = new cv.Mat();
			cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
			extra.push(gray);
			out = normalizeBackground(cv, gray);
			extra.push(out);
		} else if (filter === 'bw') {
			const gray = new cv.Mat();
			cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
			extra.push(gray);
			out = new cv.Mat();
			cv.adaptiveThreshold(
				gray, out, 255,
				cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 25, 12
			);
			extra.push(out);
		}

		const canvas = document.createElement('canvas');
		cv.imshow(canvas, out);
		const blob = await new Promise((resolve, reject) => {
			canvas.toBlob(
				(b) => (b ? resolve(b) : reject(new Error('Failed to encode scanned image'))),
				'image/jpeg',
				0.85
			);
		});
		return blob;
	} finally {
		if (src) src.delete();
		if (warped) warped.delete();
		if (srcTri) srcTri.delete();
		if (dstTri) dstTri.delete();
		if (M) M.delete();
		for (const m of extra) m.delete();
	}
}
