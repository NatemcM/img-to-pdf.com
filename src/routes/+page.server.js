import { env } from '$env/dynamic/private';

export function load() {
	return {
		emailEnabled: !!env.RESEND_API_KEY
	};
}
