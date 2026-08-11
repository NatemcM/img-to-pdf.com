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
