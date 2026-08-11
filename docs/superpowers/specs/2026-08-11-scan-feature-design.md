# Scan Feature — Design Spec

**Date:** 2026-08-11
**Status:** Approved

## Summary

Add an optional per-image "scan" flow to img-to-pdf.com: auto-detect a document's
edges in a photo, let the user fine-tune the four corners, perspective-correct the
crop, and apply a scan-look enhancement filter — so photos of paper documents come
out looking like flatbed scans in the final PDF. Everything runs client-side,
preserving the app's privacy guarantee (no image data ever leaves the browser).

## Goals

- CamScanner-style scan pipeline: detect → adjust corners → dewarp → enhance.
- Per-image and fully optional; images that aren't scanned behave exactly as today.
- Zero impact on initial page load (engine is lazy-loaded on first use).
- No external network requests for image processing (self-hosted engine).

## Non-Goals (YAGNI)

- Batch "scan all" action.
- Curved-page dewarping (only flat perspective correction).
- Rotation / manual crop controls beyond the four corner handles.
- Server-side processing of any kind.

## Engine

- **OpenCV.js (WASM)** provides contour-based document detection (jscanify's
  approach) and perspective warping.
- The ~8MB `opencv.js` build is **self-hosted under `static/`** — the site promises
  no external requests and ships CSP headers, so no CDN.
- Lazy-loaded via a singleton `loadOpenCV()` in a new
  `src/lib/utils/scan-processor.js`. The script is injected only when the user
  first opens the scan editor. A loading state ("Loading scanner… first use only")
  covers the one-time download; subsequent opens are instant (browser cache +
  in-memory singleton).

### `scan-processor.js` API

| Function | Purpose |
|----------|---------|
| `loadOpenCV()` | Idempotent lazy loader; resolves when `cv` is ready, rejects on load failure. |
| `detectCorners(imgElement)` | Returns four corner points `{tl,tr,br,bl}` of the largest document-like contour, or `null` if none found. |
| `warpAndFilter(imgElement, corners, filter)` | Perspective-warps the quad to a rectangle (longest side capped at 1600px, matching the existing pipeline) and applies the chosen filter. Returns a JPEG `Blob`. |

Pure geometry helpers (corner ordering, quad validity, output-size math) live in a
separate `src/lib/utils/scan-geometry.js` so they are unit-testable without OpenCV.

### Filters

- **Original color** — warp only, no color changes.
- **Enhanced** — white-balance + contrast stretch (the "clean scan" default).
- **Grayscale** — desaturated + contrast stretch.
- **Black & white** — adaptive threshold (photocopy look).

## UI

New `src/lib/components/ScanEditor.svelte` modal, opened from a new "Scan" button
on each `ImageThumbnail` (hover-reveal, same pattern as the existing remove
button; lucide `ScanLine` icon).

Modal contents:

1. The image with four draggable corner handles connected by a quad outline.
   Handles are pre-positioned by `detectCorners()`; if detection fails, they
   default to a 10%-inset rectangle for manual adjustment. Handles are draggable
   with pointer events (mouse + touch).
2. Filter picker (the four filters above) with a live preview of the warped +
   filtered result.
3. Actions: **Apply**, **Reset to original** (only shown if the image was
   previously scanned), **Cancel**.

Thumbnails and the existing preview modal show the scanned version when present,
with a small "scanned" badge. Reopening the editor on a scanned image restores its
saved corners and filter.

## State & Data Flow

Image entries in `app-state.svelte.js` gain optional fields:

- `scannedBlob` — JPEG blob of the warped + filtered result.
- `scannedPreview` — object URL for the scanned blob.
- `scanSettings` — `{ corners, filter }` for editor re-entry.

Flow: thumbnail Scan button → modal opens → `loadOpenCV()` (spinner on first use)
→ auto-detect corners → user adjusts / picks filter → live preview → Apply →
store `scannedBlob` + `scannedPreview` + `scanSettings` → thumbnail updates.

PDF pipeline: `processImage()` consumes `scannedBlob` when present, otherwise the
original `file`. No other changes to `pdf-generator.js`.

Cleanup: Reset deletes scanned fields and revokes `scannedPreview`;
`removeImage()` and `clearAll()` revoke scanned object URLs alongside the
existing preview URLs.

## Error Handling

- **OpenCV load failure** — error message inside the modal; image untouched;
  user can retry or cancel.
- **Detection failure** — non-fatal; fall back to the 10%-inset default corners.
- **Degenerate quads** (self-intersecting / near-zero area after user dragging) —
  Apply is disabled with a hint until the quad is valid.
- **Memory** — warp output capped at 1600px longest side; all object URLs revoked
  on replace/remove/clear.

## Testing

- Vitest unit tests for `scan-geometry.js`: corner ordering from unordered
  points, quad validity checks, output dimension math.
- Vitest tests for state actions: scanned-field lifecycle (apply, reset, remove,
  clearAll revoke URLs — object URLs mocked).
- OpenCV-dependent paths (`detectCorners`, `warpAndFilter`, the modal) are
  verified manually in the browser; they require real canvas + WASM.
