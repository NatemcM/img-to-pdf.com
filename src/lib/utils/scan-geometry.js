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
