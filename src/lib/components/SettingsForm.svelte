<script>
	import { appState, setFilename, setPageSize, setEmail } from '$lib/stores/app-state.svelte.js';

	let { emailEnabled = false } = $props();
</script>

<section class="bg-white border border-border-grey rounded-2xl p-6 sm:p-10 mb-12 shadow-sm">
	<h3 class="text-xl font-bold mb-8 text-slate-900 flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">tune</span>
		Document Settings
	</h3>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- PDF Filename -->
		<div class="flex flex-col gap-2.5">
			<label class="text-sm font-bold text-slate-700 ml-1" for="filename">PDF Filename</label>
			<div class="relative group">
				<input
					class="w-full pl-4 pr-12 py-3.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
					id="filename"
					placeholder="Holiday-Memories"
					type="text"
					value={appState.pdfFilename}
					oninput={(e) => setFilename(e.target.value)}
				/>
				<span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">.pdf</span>
			</div>
		</div>

		<!-- Page Size -->
		<div class="flex flex-col gap-2.5">
			<label class="text-sm font-bold text-slate-700 ml-1" for="pagesize">Page Size</label>
			<select
				class="w-full px-4 py-3.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 appearance-none"
				id="pagesize"
				value={appState.pageSize}
				onchange={(e) => setPageSize(e.target.value)}
			>
				<option value="a4">A4 (Standard 210 x 297mm)</option>
				<option value="letter">Letter (US 8.5 x 11in)</option>
				<option value="fit">Fit to Image Size</option>
			</select>
		</div>

		<!-- Email Address (only shown when Resend API key is configured) -->
		{#if emailEnabled}
			<div class="flex flex-col gap-2.5 md:col-span-2">
				<label class="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1" for="email">
					Email Address
					<span class="text-slate-400 text-xs font-normal">(optional)</span>
				</label>
				<div class="relative group">
					<span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">mail</span>
					<input
						class="w-full pl-12 pr-4 py-4 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
						id="email"
						placeholder="john@example.com"
						type="email"
						value={appState.email}
						oninput={(e) => setEmail(e.target.value)}
					/>
				</div>
				<p class="text-xs text-slate-400 mt-1 pl-1">Receive a confirmation email when your PDF is generated.</p>
			</div>
		{/if}
	</div>
</section>
