<script>
  import { FileText, ShieldCheck } from 'lucide-svelte';
</script>

<header
  class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border-grey"
>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <a
        href="/"
        class="flex items-center gap-3"
      >
        <div class="bg-primary p-2 rounded-lg text-white shadow-sm">
          <FileText size={24} />
        </div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          PDF Converter
        </h1>
      </a>

      <nav class="hidden md:flex items-center gap-8">
        <a
          class="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/how-it-works">How it works</a
        >
        <a
          class="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/privacy">Privacy</a
        >
      </nav>

      <div class="flex items-center gap-4">
        <div
          class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-safety-bg text-safety-text rounded-full border border-green-200"
        >
          <ShieldCheck size={14} />
          <span class="text-xs font-bold uppercase tracking-wider"
            >On-Device Processing</span
          >
        </div>
      </div>
    </div>
  </div>
</header>
