<script>
	import PrivacyBanner from '$lib/components/PrivacyBanner.svelte';
	import UploadZone from '$lib/components/UploadZone.svelte';
	import ImageGrid from '$lib/components/ImageGrid.svelte';
	import SettingsForm from '$lib/components/SettingsForm.svelte';
	import GenerateButton from '$lib/components/GenerateButton.svelte';
	import { appState, setError } from '$lib/stores/app-state.svelte.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>img-to-pdf.com &mdash; Convert Images to PDF</title>
	<meta name="description" content="Convert and combine images to PDF entirely in your browser. Private, fast, and free." />
</svelte:head>

<main class="flex-1 max-w-4xl mx-auto w-full px-4 py-10 sm:px-6 lg:px-8">
	<PrivacyBanner />

	<!-- Hero -->
	<div class="text-center mb-12">
		<h2 class="text-4xl font-extrabold text-slate-900 mb-4">Convert Images to PDF</h2>
		<p class="text-slate-500 max-w-xl mx-auto text-lg">Fast, high-quality conversion for JPG, PNG, and WEBP formats.</p>
	</div>

	<!-- Error message -->
	{#if appState.errorMessage}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
			<span class="material-symbols-outlined">error</span>
			<p class="text-sm flex-1">{appState.errorMessage}</p>
			<button onclick={() => setError('')} class="text-red-400 hover:text-red-600">
				<span class="material-symbols-outlined text-lg">close</span>
			</button>
		</div>
	{/if}

	<UploadZone />

	{#if appState.images.length > 0}
		<ImageGrid />
		<SettingsForm emailEnabled={data.emailEnabled} />
		<GenerateButton />
	{/if}
</main>
