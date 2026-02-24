<script>
	import { ShieldCheck } from 'lucide-svelte';
</script>

<div class="mb-10 p-4 bg-safety-bg border border-green-100 rounded-xl flex items-center gap-4">
	<div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-safety-text">
		<ShieldCheck size={24} />
	</div>
	<div>
		<h3 class="text-sm font-bold text-safety-text uppercase tracking-wide">Privacy Guaranteed</h3>
		<p class="text-slate-600 text-sm">Your images never leave your browser. Processing is 100% client-side and secure.</p>
	</div>
</div>
