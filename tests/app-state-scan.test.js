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
