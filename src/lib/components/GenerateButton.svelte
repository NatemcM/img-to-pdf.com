<script>
	import { appState, setError } from '$lib/stores/app-state.svelte.js';
	import { generatePdf } from '$lib/utils/pdf-generator.js';
	import { downloadBlob } from '$lib/utils/file-helpers.js';

	let canGenerate = $derived(appState.images.length > 0 && !appState.isGenerating);
	let hasEmail = $derived(appState.email.trim().length > 0);

	async function handleGenerate() {
		try {
			setError('');
			const pdfBytes = await generatePdf();
			const filename = `${appState.pdfFilename || 'combined'}.pdf`;

			if (hasEmail) {
				await sendPdfByEmail(pdfBytes, filename);
			} else {
				const blob = new Blob([pdfBytes], { type: 'application/pdf' });
				downloadBlob(blob, filename);
			}
		} catch (err) {
			setError(`PDF generation failed: ${err.message}`);
		}
	}

	async function sendPdfByEmail(pdfBytes, filename) {
		const base64 = btoa(
			pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
		);

		const response = await fetch('/api/send-email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: appState.email,
				filename,
				pdfData: base64
			})
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || 'Failed to send email.');
		}
	}
</script>

<div class="flex flex-col gap-6">
	<button
		onclick={handleGenerate}
		disabled={!canGenerate}
		class="w-full py-5 text-white text-xl font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 {canGenerate ? 'bg-primary hover:bg-primary-hover shadow-blue-200 active:scale-[0.99] cursor-pointer' : 'bg-slate-300 cursor-not-allowed shadow-none'}"
	>
		{#if appState.isGenerating}
			<div class="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
			Generating PDF... {appState.progress}%
		{:else if hasEmail}
			<span class="material-symbols-outlined text-2xl">send</span>
			Send to Email
		{:else}
			<span class="material-symbols-outlined text-2xl">download</span>
			Generate &amp; Download PDF
		{/if}
	</button>

	<div class="flex items-center justify-center gap-4 text-xs text-slate-500">
		<span class="flex items-center gap-1">
			<span class="material-symbols-outlined text-[14px]">lock</span> 100% Secure
		</span>
		<span class="flex items-center gap-1">
			<span class="material-symbols-outlined text-[14px]">bolt</span> Instant Processing
		</span>
		<span class="flex items-center gap-1">
			<span class="material-symbols-outlined text-[14px]">done_all</span> High Resolution
		</span>
	</div>

	<p class="text-center text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
		By clicking &quot;Generate&quot;, you agree to our <a class="underline hover:text-primary transition-colors" href="/terms">Terms</a>. We respect your privacy: images are deleted from browser memory upon closing this tab.
	</p>
</div>
