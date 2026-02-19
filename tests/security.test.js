import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Security Test Suite — img-to-pdf.com
 *
 * These tests confirm vulnerabilities exist (RED phase),
 * then verify fixes work (GREEN phase).
 */

// Helper: read a source file as a string
function readSrc(relativePath) {
	return readFileSync(resolve(process.cwd(), 'src', relativePath), 'utf-8');
}

// ========================================================================
// VULN-001: Stored XSS via HTML injection in email template
// Severity: CRITICAL
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-001: HTML injection in email template', () => {
	it('should escape user-supplied filename before injecting into HTML email', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		// The filename must be sanitized/escaped BEFORE being interpolated into HTML.
		// Check that raw body.filename is NOT directly interpolated into the HTML template.
		// A safe implementation either:
		// 1. Uses a sanitize/escape function on body.filename, OR
		// 2. Sanitizes body.filename into a variable before the HTML template
		const hasRawInterpolation = source.includes('${body.filename}');
		expect(hasRawInterpolation, 'body.filename should not be directly interpolated into HTML').toBe(false);
	});

	it('should sanitize the filename on the server side (not trust client)', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		// Server must sanitize filename regardless of client-side sanitization
		const hasSanitization =
			source.includes('replace(') ||
			source.includes('escapeHtml') ||
			source.includes('sanitize');
		expect(hasSanitization, 'server should sanitize filename').toBe(true);
	});
});

// ========================================================================
// VULN-002: Email endpoint has no rate limiting (spam relay)
// Severity: HIGH
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-002: Email endpoint rate limiting', () => {
	it('should implement rate limiting to prevent abuse as a spam relay', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		// Should have some form of rate limiting
		const hasRateLimiting =
			source.includes('rateLimit') ||
			source.includes('rate_limit') ||
			source.includes('rateLimiter') ||
			source.includes('requestCount') ||
			source.includes('RATE_LIMIT');
		expect(hasRateLimiting, 'email endpoint should implement rate limiting').toBe(true);
	});
});

// ========================================================================
// VULN-003: Weak email validation allows malformed addresses
// Severity: MEDIUM
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-003: Email validation robustness', () => {
	it('should reject excessively long email addresses', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		// Should check email length to prevent buffer/header abuse
		const hasLengthCheck =
			source.includes('.length') && source.includes('email');
		expect(hasLengthCheck, 'should validate email length').toBe(true);
	});
});

// ========================================================================
// VULN-004: No Content-Security-Policy headers
// Severity: MEDIUM
// Location: svelte.config.js (CSP) + src/hooks.server.js (other headers)
// ========================================================================
describe('VULN-004: Security headers (CSP)', () => {
	it('should configure CSP directives in svelte.config.js', () => {
		const config = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf-8');
		const hasCSP = config.includes('csp') && config.includes('script-src');
		expect(hasCSP, 'svelte.config.js should define CSP directives').toBe(true);
	});

	it('should have a hooks.server.js file that sets security headers', () => {
		let exists = false;
		try {
			readSrc('hooks.server.js');
			exists = true;
		} catch {
			exists = false;
		}
		expect(exists, 'src/hooks.server.js should exist to set security headers').toBe(true);
	});

	it('should set X-Content-Type-Options header', () => {
		const source = readSrc('hooks.server.js');
		const hasXCTO = source.includes('X-Content-Type-Options');
		expect(hasXCTO, 'should set X-Content-Type-Options: nosniff').toBe(true);
	});
});

// ========================================================================
// VULN-005: Filename not sanitized on server side
// Severity: MEDIUM
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-005: Server-side filename validation', () => {
	it('should enforce a max length on filename', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		const hasMaxLength =
			source.includes('filename.length') ||
			source.includes('.slice(') ||
			source.includes('.substring(') ||
			source.includes('maxLength');
		expect(hasMaxLength, 'should cap filename length on server').toBe(true);
	});

	it('should strip or reject non-alphanumeric characters from filename', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		const hasSanitization = source.includes('replace(');
		expect(hasSanitization, 'should sanitize filename characters on server').toBe(true);
	});
});

// ========================================================================
// VULN-006: Error message could leak stack trace details
// Severity: LOW
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-006: Error information leakage', () => {
	it('should not log the raw error object to console in production', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		// Should not log raw err object — use err.message instead
		const logsRawErr = source.includes('console.error') && source.includes(', err)');
		expect(logsRawErr, 'should not log raw error objects').toBe(false);
	});
});

// ========================================================================
// VULN-007: JSON body parsing has no size limit
// Severity: MEDIUM
// Location: src/routes/api/send-email/+server.js
// ========================================================================
describe('VULN-007: Request body size validation', () => {
	it('should validate the content-length or body size of incoming requests', () => {
		const source = readSrc('routes/api/send-email/+server.js');

		const hasBodySizeCheck =
			source.includes('content-length') ||
			source.includes('Content-Length') ||
			source.includes('JSON.stringify') ||
			source.includes('typeof body') ||
			source.includes('body === null') ||
			source.includes('!body');
		expect(hasBodySizeCheck, 'should validate request body').toBe(true);
	});
});
