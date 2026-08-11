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
		const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf-8');
		expect(config).toContain('wasm-unsafe-eval');
	});

	it('does not weaken CSP with full unsafe-eval', () => {
		const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf-8');
		expect(/[^-]'unsafe-eval'/.test(config)).toBe(false);
	});
});
