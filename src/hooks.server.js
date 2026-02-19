/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event);

	// CSP is handled by SvelteKit's built-in csp config in svelte.config.js
	// which automatically generates nonces for inline scripts.

	// Prevent MIME-type sniffing
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// Control referrer leakage
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Restrict browser features
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
}
