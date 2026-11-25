import { defineEnvVars } from '@sveltejs/kit/env';

/** Treat unset or empty values as undefined so these stay optional. */
const optional = (/** @type {string | undefined} */ value) => value || undefined;

export const variables = defineEnvVars({
	RESEND_API_KEY: {
		schema: optional,
		description: 'Resend API key. When unset, the email-a-PDF feature is disabled.'
	},
	ALLOWED_EMAIL: {
		schema: optional,
		description: 'If set, PDFs may only be emailed to this address.'
	}
});
