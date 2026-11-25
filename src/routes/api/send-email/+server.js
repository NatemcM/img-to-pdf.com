import { error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { RESEND_API_KEY, ALLOWED_EMAIL } from '$app/env/private';

// --- VULN-002 FIX: In-memory rate limiter ---
const RATE_LIMIT = { maxRequests: 3, windowMs: 15 * 60 * 1000 }; // 3 per 15 min
const requestCounts = new Map();

function isRateLimited(ip) {
	const now = Date.now();
	const entry = requestCounts.get(ip);

	if (!entry || now - entry.firstRequest > RATE_LIMIT.windowMs) {
		requestCounts.set(ip, { count: 1, firstRequest: now });
		return false;
	}

	if (entry.count >= RATE_LIMIT.maxRequests) {
		return true;
	}

	entry.count++;
	return false;
}

// Periodically clean up stale entries (every 30 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of requestCounts) {
		if (now - entry.firstRequest > RATE_LIMIT.windowMs) {
			requestCounts.delete(ip);
		}
	}
}, 30 * 60 * 1000);

// --- VULN-001 / VULN-005 FIX: Server-side filename sanitization + HTML escaping ---
function sanitizeFilename(raw) {
	if (typeof raw !== 'string') return 'document.pdf';
	return raw.replace(/[^a-zA-Z0-9_\-\s.]/g, '').trim().slice(0, 100) || 'document.pdf';
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, getClientAddress }) {
	// --- VULN-002 FIX: Check rate limit ---
	const clientIp = getClientAddress();
	if (isRateLimited(clientIp)) {
		return Response.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
	}

	// --- VULN-007 FIX: Validate body exists ---
	let body;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid request body.');
	}

	if (!body || typeof body !== 'object') {
		error(400, 'Invalid request body.');
	}

	// --- VULN-003 FIX: Stronger email validation with length check ---
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		error(400, 'A valid email address is required.');
	}

	// Restrict to allowed recipient if configured
	if (ALLOWED_EMAIL) {
		const allowed = ALLOWED_EMAIL.toLowerCase();
		if (email !== allowed) {
			return Response.json({ success: false, message: 'This email address is not authorized to receive PDFs.' }, { status: 403 });
		}
	}

	// --- VULN-005 FIX: Sanitize filename server-side ---
	const filename = sanitizeFilename(body.filename);

	// Validate PDF attachment data
	const pdfData = typeof body.pdfData === 'string' ? body.pdfData : '';
	if (!pdfData) {
		error(400, 'PDF data is required.');
	}

	// Limit attachment size (10MB base64 ≈ ~7.5MB raw)
	const MAX_PDF_BASE64_SIZE = 10 * 1024 * 1024;
	if (pdfData.length > MAX_PDF_BASE64_SIZE) {
		error(400, 'PDF file is too large to send by email.');
	}

	// Validate base64 format
	if (!/^[A-Za-z0-9+/=]+$/.test(pdfData)) {
		error(400, 'Invalid PDF data.');
	}

	if (!RESEND_API_KEY) {
		return Response.json({ success: false, message: 'Email service not configured.' }, { status: 503 });
	}

	try {
		const resend = new Resend(RESEND_API_KEY);

		// --- VULN-001 FIX: HTML-escape filename before interpolation ---
		const safeFilename = escapeHtml(filename);
		const pdfBuffer = Buffer.from(pdfData, 'base64');

		await resend.emails.send({
			from: 'img-to-pdf <noreply@img-to-pdf.com>',
			to: email,
			subject: `Your PDF is ready: ${filename}`,
			html: `
				<h2>Your PDF has been generated!</h2>
				<p>Your file <strong>${safeFilename}</strong> is attached to this email.</p>
				<p>It was created using
				   <a href="https://img-to-pdf.com">img-to-pdf.com</a>.</p>
				<p>Need to create another PDF? Visit
				   <a href="https://img-to-pdf.com">img-to-pdf.com</a> anytime.</p>
				<hr />
				<p style="color: #666; font-size: 12px;">
					img-to-pdf.com
				</p>
			`,
			attachments: [
				{
					filename,
					content: pdfBuffer
				}
			]
		});

		return Response.json({ success: true, message: 'Email sent successfully.' });
	} catch (err) {
		// --- VULN-006 FIX: Only log error message, not full object ---
		console.error('Email send error:', err.message);
		return Response.json({ success: false, message: 'Failed to send email.' }, { status: 500 });
	}
}
