import { RESEND_API_KEY } from '$app/env/private';

export function load() {
	return {
		emailEnabled: !!RESEND_API_KEY
	};
}
