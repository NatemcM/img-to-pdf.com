import { json, error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const body = await request.json();

	if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
		return error(400, { message: 'A valid email address is required.' });
	}

	if (!body.filename) {
		return error(400, { message: 'Filename is required.' });
	}

	if (!env.RESEND_API_KEY) {
		return json({ success: false, message: 'Email service not configured.' }, { status: 503 });
	}

	try {
		const resend = new Resend(env.RESEND_API_KEY);

		await resend.emails.send({
			from: 'img-to-pdf <noreply@img-to-pdf.com>',
			to: body.email,
			subject: `Your PDF is ready: ${body.filename}`,
			html: `
				<h2>Your PDF has been generated!</h2>
				<p>Your file <strong>${body.filename}</strong> was created using
				   <a href="https://img-to-pdf.com">img-to-pdf.com</a>.</p>
				<p>Since your PDF was generated entirely in your browser, we don't
				   have a copy of it. This email is a confirmation that you used our
				   service.</p>
				<p>If you need to recreate your PDF, visit
				   <a href="https://img-to-pdf.com">img-to-pdf.com</a> and upload
				   your images again.</p>
				<hr />
				<p style="color: #666; font-size: 12px;">
					img-to-pdf.com &mdash; Your images never leave your device.
				</p>
			`
		});

		return json({ success: true, message: 'Email sent successfully.' });
	} catch (err) {
		console.error('Email send error:', err);
		return json({ success: false, message: 'Failed to send email.' }, { status: 500 });
	}
}
