# Scan Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional per-image "scan" flow — auto edge detection, draggable corner adjustment, perspective correction, and scan-look filters — so photos of documents come out looking like flatbed scans in the generated PDF.

**Architecture:** A lazy-loaded, self-hosted OpenCV.js (WASM) engine behind a small `scan-processor.js` facade; pure geometry math in a separate unit-tested `scan-geometry.js`; a `ScanEditor.svelte` modal for corner adjustment and filter preview; scanned results stored as extra optional fields on existing image entries so the PDF pipeline needs only a one-line change.

**Tech Stack:** SvelteKit (Svelte 5 runes), Tailwind CSS v4, OpenCV.js 4.x (self-hosted in `static/vendor/`), lucide-svelte icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-11-scan-feature-design.md`

## Global Constraints

- 100% client-side image processing — no image data may leave the browser.
- No external network requests for processing: OpenCV.js is self-hosted at `static/vendor/opencv.js`, never a CDN.
- No new npm dependencies.
- OpenCV.js loads lazily — zero impact on initial page load.
- Warp output longest side capped at **1600px** (matches existing `processImage` cap).
- Filters (exact ids and labels): `original` "Original", `enhanced` "Enhanced", `grayscale` "Grayscale", `bw` "Black & white". Default: `enhanced`.
- Svelte 5 runes syntax (`$state`, `$props`, `$derived`) — no legacy stores.
- Test runner: `npx vitest run` (no `test` script exists in package.json).
- Commit after each task.

---

### Task 1: Pure geometry helpers (`scan-geometry.js`)

**Files:**
- Create: `src/lib/utils/scan-geometry.js`
- Test: `tests/scan-geometry.test.js`

**Interfaces:**
- Consumes: nothing (pure functions, no imports).
- Produces (used by Tasks 4 and 5):
  - `orderCorners(points)` — `points`: array of 4 `{x, y}` in any order → returns `{tl, tr, br, bl}` (each `{x, y}`).
  - `defaultCorners(width, height)` — returns `{tl, tr, br, bl}` inset 10% from each image edge.
  - `isValidQuad(corners, minArea = 100)` — `corners`: `{tl, tr, br, bl}` → `true` if the quad is convex (in tl→tr→br→bl order) and its area ≥ `minArea`.
  - `outputSize(corners, maxDim = 1600)` — returns `{width, height}` (integers ≥ 1) sized from the quad's edge lengths, longest side capped at `maxDim`.

- [ ] **Step 1: Write the failing tests**

Create `tests/scan-geometry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
	orderCorners,
	defaultCorners,
	isValidQuad,
	outputSize
} from '../src/lib/utils/scan-geometry.js';

describe('orderCorners', () => {
	it('orders four shuffled points into tl/tr/br/bl', () => {
		const shuffled = [
			{ x: 90, y: 110 }, // br
			{ x: 10, y: 10 }, // tl
			{ x: 5, y: 100 }, // bl
			{ x: 100, y: 15 } // tr
		];
		const c = orderCorners(shuffled);
		expect(c.tl).toEqual({ x: 10, y: 10 });
		expect(c.tr).toEqual({ x: 100, y: 15 });
		expect(c.br).toEqual({ x: 90, y: 110 });
		expect(c.bl).toEqual({ x: 5, y: 100 });
	});

	it('handles an axis-aligned rectangle', () => {
		const c = orderCorners([
			{ x: 0, y: 100 },
			{ x: 100, y: 0 },
			{ x: 0, y: 0 },
			{ x: 100, y: 100 }
		]);
		expect(c.tl).toEqual({ x: 0, y: 0 });
		expect(c.br).toEqual({ x: 100, y: 100 });
	});
});

describe('defaultCorners', () => {
	it('insets 10% from each edge', () => {
		const c = defaultCorners(1000, 500);
		expect(c.tl).toEqual({ x: 100, y: 50 });
		expect(c.tr).toEqual({ x: 900, y: 50 });
		expect(c.br).toEqual({ x: 900, y: 450 });
		expect(c.bl).toEqual({ x: 100, y: 450 });
	});
});

describe('isValidQuad', () => {
	const square = {
		tl: { x: 0, y: 0 },
		tr: { x: 100, y: 0 },
		br: { x: 100, y: 100 },
		bl: { x: 0, y: 100 }
	};

	it('accepts a convex quad with sufficient area', () => {
		expect(isValidQuad(square)).toBe(true);
	});

	it('rejects a self-intersecting (bowtie) quad', () => {
		// tr and br swapped horizontally -> edges cross
		const bowtie = {
			tl: { x: 0, y: 0 },
			tr: { x: 100, y: 0 },
			br: { x: 0, y: 100 },
			bl: { x: 100, y: 100 }
		};
		expect(isValidQuad(bowtie)).toBe(false);
	});

	it('rejects a quad with near-zero area', () => {
		const tiny = {
			tl: { x: 0, y: 0 },
			tr: { x: 5, y: 0 },
			br: { x: 5, y: 5 },
			bl: { x: 0, y: 5 }
		};
		expect(isValidQuad(tiny)).toBe(false); // area 25 < default minArea 100
	});
});

describe('outputSize', () => {
	it('uses the longest opposite-edge pair for each dimension', () => {
		const c = {
			tl: { x: 0, y: 0 },
			tr: { x: 400, y: 0 },
			br: { x: 400, y: 300 },
			bl: { x: 0, y: 300 }
		};
		expect(outputSize(c)).toEqual({ width: 400, height: 300 });
	});

	it('caps the longest side at maxDim preserving aspect', () => {
		const c = {
			tl: { x: 0, y: 0 },
			tr: { x: 3200, y: 0 },
			br: { x: 3200, y: 1600 },
			bl: { x: 0, y: 1600 }
		};
		expect(outputSize(c, 1600)).toEqual({ width: 1600, height: 800 });
	});

	it('never returns dimensions below 1', () => {
		const c = {
			tl: { x: 0, y: 0 },
			tr: { x: 0.4, y: 0 },
			br: { x: 0.4, y: 0.4 },
			bl: { x: 0, y: 0.4 }
		};
		const { width, height } = outputSize(c);
		expect(width).toBeGreaterThanOrEqual(1);
		expect(height).toBeGreaterThanOrEqual(1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/scan-geometry.test.js`
Expected: FAIL — cannot resolve `../src/lib/utils/scan-geometry.js`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/scan-geometry.js`:

```js
/**
 * Pure geometry helpers for the scan feature. No DOM, no OpenCV —
 * everything here is unit-testable in Node.
 * A "corners" object is { tl, tr, br, bl }, each an { x, y } point.
 */

function dist(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Order 4 unordered points into { tl, tr, br, bl }.
 * tl has the smallest x+y sum, br the largest; of the remaining two,
 * tr is the one with larger x.
 * @param {{x:number,y:number}[]} points - exactly 4 points
 */
export function orderCorners(points) {
	const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
	const tl = bySum[0];
	const br = bySum[3];
	const [p1, p2] = bySum.slice(1, 3);
	const [tr, bl] = p1.x > p2.x ? [p1, p2] : [p2, p1];
	return { tl, tr, br, bl };
}

/**
 * Default corners when auto-detection fails: a rectangle inset 10%
 * from each image edge.
 * @param {number} width
 * @param {number} height
 */
export function defaultCorners(width, height) {
	const ix = width * 0.1;
	const iy = height * 0.1;
	return {
		tl: { x: ix, y: iy },
		tr: { x: width - ix, y: iy },
		br: { x: width - ix, y: height - iy },
		bl: { x: ix, y: height - iy }
	};
}

/** Signed area via the shoelace formula (positive for tl→tr→br→bl order). */
function quadArea(c) {
	const pts = [c.tl, c.tr, c.br, c.bl];
	let sum = 0;
	for (let i = 0; i < 4; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % 4];
		sum += a.x * b.y - b.x * a.y;
	}
	return sum / 2;
}

/**
 * A quad is valid when its corners in tl→tr→br→bl order form a convex,
 * non-self-intersecting shape with at least minArea square pixels.
 * Convexity check: cross product at every vertex has the same sign.
 * @param {{tl,tr,br,bl}} corners
 * @param {number} [minArea=100]
 */
export function isValidQuad(corners, minArea = 100) {
	const pts = [corners.tl, corners.tr, corners.br, corners.bl];
	let sign = 0;
	for (let i = 0; i < 4; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % 4];
		const c = pts[(i + 2) % 4];
		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
		if (cross !== 0) {
			const s = Math.sign(cross);
			if (sign === 0) sign = s;
			else if (s !== sign) return false;
		}
	}
	return Math.abs(quadArea(corners)) >= minArea;
}

/**
 * Output dimensions for the perspective-corrected image: each dimension
 * is the longer of its two opposite quad edges, then scaled down so the
 * longest side is at most maxDim.
 * @param {{tl,tr,br,bl}} corners
 * @param {number} [maxDim=1600]
 * @returns {{width:number, height:number}}
 */
export function outputSize(corners, maxDim = 1600) {
	let width = Math.max(dist(corners.tl, corners.tr), dist(corners.bl, corners.br));
	let height = Math.max(dist(corners.tl, corners.bl), dist(corners.tr, corners.br));
	const longest = Math.max(width, height);
	if (longest > maxDim) {
		const scale = maxDim / longest;
		width *= scale;
		height *= scale;
	}
	return {
		width: Math.max(1, Math.round(width)),
		height: Math.max(1, Math.round(height))
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/scan-geometry.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `npx vitest run`
Expected: all tests pass (existing `security.test.js` + new file).

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/scan-geometry.js tests/scan-geometry.test.js
git commit -m "feat: add pure geometry helpers for scan feature"
```

---

### Task 2: Vendor OpenCV.js and allow WASM in CSP

**Files:**
- Create: `static/vendor/opencv.js` (downloaded, ~10MB)
- Modify: `svelte.config.js` (the `csp.directives['script-src']` array)
- Test: `tests/scan-setup.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `/vendor/opencv.js` served same-origin (loaded by Task 4's `loadOpenCV()`); CSP `script-src` includes `wasm-unsafe-eval` so the browser may compile OpenCV's WASM under the existing strict CSP.

**Why the CSP change:** `script-src 'self'` allows the injected same-origin `<script>` tag, but WebAssembly compilation is blocked by CSP unless `'wasm-unsafe-eval'` (or full `'unsafe-eval'`) is present. `'wasm-unsafe-eval'` permits only WASM, not JS `eval` — the right narrow grant.

- [ ] **Step 1: Write the failing tests**

Create `tests/scan-setup.test.js` (follows the source-reading style of `tests/security.test.js`):

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

describe('scan feature setup', () => {
	it('self-hosts opencv.js under static/vendor (no CDN)', () => {
		const path = resolve(process.cwd(), 'static/vendor/opencv.js');
		expect(existsSync(path), 'static/vendor/opencv.js must exist').toBe(true);
		// Sanity check it is the real build, not an empty placeholder
		expect(statSync(path).size).toBeGreaterThan(1_000_000);
	});

	it('allows WASM compilation via wasm-unsafe-eval in script-src', () => {
		const config = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf-8');
		expect(config).toContain('wasm-unsafe-eval');
	});

	it('does not weaken CSP with full unsafe-eval', () => {
		const config = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf-8');
		expect(/[^-]'unsafe-eval'/.test(config)).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/scan-setup.test.js`
Expected: FAIL — file missing and `wasm-unsafe-eval` absent.

- [ ] **Step 3: Download OpenCV.js**

```bash
mkdir -p static/vendor
curl -L https://docs.opencv.org/4.x/opencv.js -o static/vendor/opencv.js
ls -lh static/vendor/opencv.js  # expect ~10MB
head -c 200 static/vendor/opencv.js  # expect JS source, not an HTML error page
```

If the download is an HTML error page or under 1MB, use a pinned version instead: `https://docs.opencv.org/4.10.0/opencv.js`.

- [ ] **Step 4: Add `wasm-unsafe-eval` to CSP**

In `svelte.config.js`, change:

```js
'script-src': ['self'],
```

to:

```js
'script-src': ['self', 'wasm-unsafe-eval'],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/scan-setup.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify the dev server still boots**

Run: `npm run dev -- --port 5199 &` then `curl -sI http://localhost:5199/vendor/opencv.js | head -3` and kill the server.
Expected: `200 OK` for the vendor file.

- [ ] **Step 7: Commit**

```bash
git add static/vendor/opencv.js svelte.config.js tests/scan-setup.test.js
git commit -m "feat: vendor self-hosted opencv.js and allow wasm in CSP"
```

---

### Task 3: Scanned-image state lifecycle + PDF pipeline switch

**Files:**
- Modify: `src/lib/stores/app-state.svelte.js` (add `setScanResult`/`resetScan`; extend `removeImage`/`clearAll`)
- Modify: `src/lib/utils/pdf-generator.js:29` (one line — prefer `scannedBlob`)
- Test: `tests/app-state-scan.test.js`

**Interfaces:**
- Consumes: existing `appState`, `addImages`, `removeImage`, `clearAll` from `app-state.svelte.js`.
- Produces (used by Tasks 5 and 6):
  - `setScanResult(id, blob, settings)` — stores `scannedBlob` (Blob), creates `scannedPreview` (object URL, revoking any previous one), stores `scanSettings` (`{ corners: {tl,tr,br,bl}, filter: string }`) on the image entry with matching `id`.
  - `resetScan(id)` — revokes `scannedPreview` and deletes `scannedBlob`, `scannedPreview`, `scanSettings` from the entry.
  - Image entries may now carry optional `scannedBlob`, `scannedPreview`, `scanSettings`.
  - `generatePdf()` uses `imageObj.scannedBlob ?? imageObj.file` as the `processImage` input (no signature change — `processImage` already accepts any Blob since it only calls `URL.createObjectURL`).

- [ ] **Step 1: Write the failing tests**

Create `tests/app-state-scan.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	appState,
	addImages,
	removeImage,
	clearAll,
	setScanResult,
	resetScan
} from '../src/lib/stores/app-state.svelte.js';

// app-state calls URL.createObjectURL / revokeObjectURL, which don't exist in Node.
let urlCounter;
const revoked = [];
vi.stubGlobal('URL', {
	createObjectURL: vi.fn(() => `blob:mock-${urlCounter++}`),
	revokeObjectURL: vi.fn((url) => revoked.push(url))
});

function makeFile() {
	return new Blob(['x'], { type: 'image/jpeg' });
}

const SETTINGS = {
	corners: {
		tl: { x: 0, y: 0 },
		tr: { x: 10, y: 0 },
		br: { x: 10, y: 10 },
		bl: { x: 0, y: 10 }
	},
	filter: 'enhanced'
};

beforeEach(() => {
	urlCounter = 0;
	revoked.length = 0;
	clearAll();
	vi.clearAllMocks();
});

describe('setScanResult', () => {
	it('stores blob, preview URL, and settings on the matching image', () => {
		addImages([makeFile('a.jpg')]);
		const img = appState.images[0];
		const scanBlob = new Blob(['scan'], { type: 'image/jpeg' });

		setScanResult(img.id, scanBlob, SETTINGS);

		expect(img.scannedBlob).toBe(scanBlob);
		expect(img.scannedPreview).toMatch(/^blob:mock-/);
		expect(img.scanSettings).toEqual(SETTINGS);
	});

	it('revokes the previous scanned preview URL when re-scanning', () => {
		addImages([makeFile('a.jpg')]);
		const img = appState.images[0];
		setScanResult(img.id, new Blob(['s1']), SETTINGS);
		const firstUrl = img.scannedPreview;

		setScanResult(img.id, new Blob(['s2']), SETTINGS);

		expect(revoked).toContain(firstUrl);
		expect(img.scannedPreview).not.toBe(firstUrl);
	});

	it('is a no-op for an unknown id', () => {
		expect(() => setScanResult(999, new Blob(['s']), SETTINGS)).not.toThrow();
	});
});

describe('resetScan', () => {
	it('revokes the preview URL and removes scanned fields', () => {
		addImages([makeFile('a.jpg')]);
		const img = appState.images[0];
		setScanResult(img.id, new Blob(['s']), SETTINGS);
		const scannedUrl = img.scannedPreview;

		resetScan(img.id);

		expect(revoked).toContain(scannedUrl);
		expect(img.scannedBlob).toBeUndefined();
		expect(img.scannedPreview).toBeUndefined();
		expect(img.scanSettings).toBeUndefined();
	});
});

describe('cleanup of scanned URLs', () => {
	it('removeImage revokes the scanned preview too', () => {
		addImages([makeFile('a.jpg')]);
		const img = appState.images[0];
		setScanResult(img.id, new Blob(['s']), SETTINGS);
		const scannedUrl = img.scannedPreview;

		removeImage(img.id);

		expect(revoked).toContain(scannedUrl);
	});

	it('clearAll revokes all scanned previews', () => {
		addImages([makeFile('a.jpg'), makeFile('b.jpg')]);
		setScanResult(appState.images[0].id, new Blob(['s1']), SETTINGS);
		setScanResult(appState.images[1].id, new Blob(['s2']), SETTINGS);
		const urls = appState.images.map((i) => i.scannedPreview);

		clearAll();

		for (const url of urls) expect(revoked).toContain(url);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/app-state-scan.test.js`
Expected: FAIL — `setScanResult` / `resetScan` are not exported.

Note: this test imports a `.svelte.js` runes file; the `sveltekit()` plugin in `vite.config.js` compiles it for Vitest. If the run fails with a rune compilation error rather than the missing exports, run `npm run prepare` first (syncs SvelteKit) and retry before changing anything.

- [ ] **Step 3: Implement the state changes**

In `src/lib/stores/app-state.svelte.js`, extend `removeImage` (after the existing `revokeObjectURL` line) and `clearAll` (inside the loop):

```js
export function removeImage(id) {
	const index = appState.images.findIndex((img) => img.id === id);
	if (index !== -1) {
		URL.revokeObjectURL(appState.images[index].preview);
		if (appState.images[index].scannedPreview) {
			URL.revokeObjectURL(appState.images[index].scannedPreview);
		}
		appState.images.splice(index, 1);
	}
}

export function clearAll() {
	for (const img of appState.images) {
		URL.revokeObjectURL(img.preview);
		if (img.scannedPreview) URL.revokeObjectURL(img.scannedPreview);
	}
	appState.images.length = 0;
}
```

Add the two new actions (place after `reorderImages`):

```js
/**
 * Store a scan result on an image: the processed blob, a preview object
 * URL, and the editor settings so the scan editor can be reopened with
 * the same corners/filter.
 * @param {number} id
 * @param {Blob} blob
 * @param {{corners: object, filter: string}} settings
 */
export function setScanResult(id, blob, settings) {
	const img = appState.images.find((i) => i.id === id);
	if (!img) return;
	if (img.scannedPreview) URL.revokeObjectURL(img.scannedPreview);
	img.scannedBlob = blob;
	img.scannedPreview = URL.createObjectURL(blob);
	img.scanSettings = settings;
}

/**
 * Remove a scan result, restoring the original image.
 * @param {number} id
 */
export function resetScan(id) {
	const img = appState.images.find((i) => i.id === id);
	if (!img) return;
	if (img.scannedPreview) URL.revokeObjectURL(img.scannedPreview);
	delete img.scannedBlob;
	delete img.scannedPreview;
	delete img.scanSettings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/app-state-scan.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Switch the PDF pipeline to prefer the scanned blob**

In `src/lib/utils/pdf-generator.js`, change line 29:

```js
const { bytes, width: imgW, height: imgH } = await processImage(imageObj.file);
```

to:

```js
const { bytes, width: imgW, height: imgH } = await processImage(
	imageObj.scannedBlob ?? imageObj.file
);
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/app-state.svelte.js src/lib/utils/pdf-generator.js tests/app-state-scan.test.js
git commit -m "feat: scanned-image state lifecycle; PDF pipeline prefers scanned blob"
```

---

### Task 4: OpenCV facade (`scan-processor.js`)

**Files:**
- Create: `src/lib/utils/scan-processor.js`

**Interfaces:**
- Consumes: `orderCorners`, `outputSize` from `src/lib/utils/scan-geometry.js` (Task 1); `/vendor/opencv.js` (Task 2).
- Produces (used by Task 5):
  - `loadOpenCV()` → `Promise<cv>` — idempotent lazy loader; injects the script tag once, resolves when the WASM runtime is ready, rejects with `Error('Failed to load the scanner engine')` on failure (and clears the cached promise so a retry can re-attempt).
  - `detectCorners(imgEl)` → `Promise<{tl,tr,br,bl} | null>` — corners in the image's natural-pixel coordinates, or `null` when no document-like quad is found.
  - `warpAndFilter(imgEl, corners, filter)` → `Promise<Blob>` — JPEG blob of the perspective-corrected, filtered result. `filter` is one of `'original' | 'enhanced' | 'grayscale' | 'bw'`.

No unit tests: every function requires the WASM runtime and real canvas. Verified manually in Task 6's end-to-end checklist. All OpenCV `Mat` objects must be `.delete()`d — WASM memory is not garbage collected.

- [ ] **Step 1: Write the module**

Create `src/lib/utils/scan-processor.js`:

```js
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
		cv.dilate(edges, edges, kernel);
		kernel.delete();

		cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		const minArea = canvas.width * canvas.height * 0.1;
		let bestArea = minArea;
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			if (area > bestArea) {
				const approx = new cv.Mat();
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
				approx.delete();
			}
			contour.delete();
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

	const src = cv.imread(imgEl);
	const warped = new cv.Mat();
	const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
		corners.tl.x, corners.tl.y,
		corners.tr.x, corners.tr.y,
		corners.br.x, corners.br.y,
		corners.bl.x, corners.bl.y
	]);
	const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
	const M = cv.getPerspectiveTransform(srcTri, dstTri);
	const extra = [];

	try {
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
		src.delete();
		warped.delete();
		srcTri.delete();
		dstTri.delete();
		M.delete();
		for (const m of extra) m.delete();
	}
}
```

- [ ] **Step 2: Verify the module parses and the suite still passes**

Run: `npx vitest run` (confirms no import/syntax errors break the build graph)
Then: `npm run build`
Expected: tests pass; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/scan-processor.js
git commit -m "feat: add OpenCV facade with lazy load, corner detection, warp and filters"
```

---

### Task 5: `ScanEditor.svelte` modal

**Files:**
- Create: `src/lib/components/ScanEditor.svelte`

**Interfaces:**
- Consumes:
  - Props: `image` (an `appState.images` entry), `onclose` (callback, no args).
  - `loadOpenCV`, `detectCorners`, `warpAndFilter` from `scan-processor.js` (Task 4).
  - `defaultCorners`, `isValidQuad` from `scan-geometry.js` (Task 1).
  - `setScanResult`, `resetScan` from `app-state.svelte.js` (Task 3).
  - lucide icons: `X`, `Loader2`, `RotateCcw`.
- Produces: the modal component Task 6 mounts from `ImageGrid.svelte` as `<ScanEditor image={...} onclose={...} />`.

**Behavior summary:** on mount, load OpenCV (spinner with "Loading scanner… first use only"), load the ORIGINAL image (`image.preview`, never the scanned version — re-editing must start from the source), restore `image.scanSettings` corners/filter if present, otherwise auto-detect (fall back to `defaultCorners`). Left pane: original image with 4 draggable corner handles (pointer events, works for mouse + touch). Right pane: live preview, regenerated 250ms after the last corner/filter change. Apply warps at full quality and calls `setScanResult`, then closes. Reset (only when `image.scannedBlob` exists) calls `resetScan` and closes. Escape or backdrop click cancels.

- [ ] **Step 1: Write the component**

Create `src/lib/components/ScanEditor.svelte`:

```svelte
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

	const scale = $derived(displayWidth / naturalWidth);
	const quadValid = $derived(corners ? isValidQuad(corners) : false);

	async function init() {
		try {
			await loadOpenCV();
			sourceImg = new Image();
			await new Promise((resolve, reject) => {
				sourceImg.onload = resolve;
				sourceImg.onerror = () => reject(new Error('Failed to load image'));
				sourceImg.src = image.preview; // always the original, not the scan
			});
			naturalWidth = sourceImg.naturalWidth;
			naturalHeight = sourceImg.naturalHeight;

			if (image.scanSettings) {
				corners = structuredClone(image.scanSettings.corners);
				filter = image.scanSettings.filter;
			} else {
				corners = (await detectCorners(sourceImg)) ?? defaultCorners(naturalWidth, naturalHeight);
			}
			status = 'ready';
			refreshPreview();
		} catch (err) {
			status = 'error';
			errorMessage = err.message;
		}
	}

	onMount(() => {
		init();
		return () => {
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
			try {
				const blob = await warpAndFilter(sourceImg, $state.snapshot(corners), filter);
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				previewUrl = URL.createObjectURL(blob);
			} catch (err) {
				errorMessage = err.message;
			} finally {
				previewPending = false;
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no Svelte compile errors. (Interactive behavior is verified in Task 6's manual checklist once the component is reachable from the UI.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ScanEditor.svelte
git commit -m "feat: add ScanEditor modal with corner handles, filters, live preview"
```

---

### Task 6: Thumbnail/grid integration + end-to-end verification

**Files:**
- Modify: `src/lib/components/ImageThumbnail.svelte` (Scan button, scanned badge, show scanned preview)
- Modify: `src/lib/components/ImageGrid.svelte` (mount ScanEditor; preview modal shows scanned version)

**Interfaces:**
- Consumes: `ScanEditor.svelte` (Task 5); `scannedPreview` field (Task 3).
- Produces: user-facing entry point — the feature is complete after this task.

- [ ] **Step 1: Add Scan button and badge to `ImageThumbnail.svelte`**

Replace the component with:

```svelte
<script>
	import { removeImage } from '$lib/stores/app-state.svelte.js';
	import { X, GripVertical, ScanLine } from 'lucide-svelte';

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
```

- [ ] **Step 2: Wire ScanEditor into `ImageGrid.svelte`**

In the `<script>` block, add the import and state:

```js
import ScanEditor from './ScanEditor.svelte';
```

```js
let scanImage = $state(null);

function openScan(image) {
	scanImage = image;
}

function closeScan() {
	scanImage = null;
}
```

Note: `previewImage` currently uses `let previewImage = $state(null)` — keep both as runes state.

Pass the handler to each thumbnail (the `#each` line):

```svelte
<ImageThumbnail {image} number={index + 1} onpreview={openPreview} onscan={openScan} />
```

In the preview modal, show the scanned version when present — change the `<img>` src:

```svelte
<img
	src={previewImage.scannedPreview ?? previewImage.preview}
	alt={previewImage.name}
	class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
/>
```

At the bottom of the file, after the preview modal block, mount the editor:

```svelte
{#if scanImage}
	<ScanEditor image={scanImage} onclose={closeScan} />
{/if}
```

Also guard the existing `handleKeydown` so Escape closes only the topmost layer:

```js
function handleKeydown(e) {
	if (e.key === 'Escape' && !scanImage) closePreview();
}
```

(`ScanEditor` handles its own Escape.)

- [ ] **Step 3: Run the suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 4: Manual end-to-end verification**

Run `npm run dev` and verify in the browser (use a phone photo of a document at an angle; keep DevTools Network + Console open):

1. Initial page load does NOT request `/vendor/opencv.js`.
2. Upload the photo → hover thumbnail → Scan button appears → click it.
3. First open shows "Loading scanner… first use only"; `/vendor/opencv.js` loads (~10MB) with no CSP errors in the console.
4. Corners auto-snap to the document outline (or 10%-inset rectangle on a hard image).
5. Dragging each handle works with mouse; preview updates ~250ms after release. If touch hardware/emulation is available, verify a handle drag in DevTools device mode.
6. Dragging a corner across the quad turns the outline red and disables Apply; hint text appears.
7. Each filter produces a visibly different preview: Original (color, warped), Enhanced (whitened paper, still color), Grayscale, Black & white (photocopy look).
8. Apply → thumbnail shows the scanned image + teal "Scanned" badge; clicking the thumbnail previews the scanned version.
9. Re-open Scan on the same image → saved corners and filter are restored.
10. Reset to original → badge gone, original thumbnail restored.
11. Scan one of two images → Generate PDF → page 1 is the scanned version, page 2 the untouched original.
12. Second modal open (after reload with warm cache) shows no long "Loading scanner" phase.

Fix anything that fails before committing (use superpowers:systematic-debugging if the cause isn't obvious).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ImageThumbnail.svelte src/lib/components/ImageGrid.svelte
git commit -m "feat: wire scan editor into image grid and thumbnails"
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md` (Features list + Tech Stack table)

**Interfaces:** none.

- [ ] **Step 1: Update README**

Add to the Features list (after the "Page Size Options" bullet):

```markdown
- **Document Scanning** — Turn photos of documents into clean scans: automatic edge detection, adjustable corners, perspective correction, and enhancement filters (color, grayscale, black & white). Powered by a self-hosted [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) build that loads only when you use it — still 100% in your browser.
```

In the Tech Stack table, change the Image Processing row to:

```markdown
| Image Processing | Canvas API (resize + JPEG compression), OpenCV.js (document scanning, lazy-loaded) |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document the scan feature in README"
```
