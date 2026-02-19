<svelte:head>
  <title>How It Works &mdash; img-to-pdf.com</title>
  <meta
    name="description"
    content="Learn how img-to-pdf.com converts your images to PDF entirely in your browser with zero server uploads."
  />
</svelte:head>

<main class="flex-1 max-w-275 mx-auto w-full px-6 py-12 lg:py-20">
  <!-- Hero intro -->
  <section class="text-center mb-16 lg:mb-24">
    <div
      class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-accent/10 text-teal-accent border border-teal-accent/20 mb-6"
    >
      <span class="material-symbols-outlined text-sm">shield_lock</span>
      <span class="text-xs font-bold uppercase tracking-wider"
        >100% Privacy Focused</span
      >
    </div>
    <h1
      class="text-4xl lg:text-6xl font-black tracking-tight mb-6 text-slate-900 leading-tight"
    >
      How It Works
    </h1>
    <p
      class="text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
    >
      Converting images to PDF shouldn't mean compromising your data. Our tool
      works entirely in your browser&mdash;fast, free, and secure.
    </p>
  </section>

  <!-- Steps grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
    <!-- Step 1 -->
    <div
      class="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div
        class="mb-6 w-20 h-20 rounded-2xl bg-teal-accent/10 flex items-center justify-center text-teal-accent group-hover:scale-110 transition-transform"
      >
        <span class="material-symbols-outlined text-4xl">upload_file</span>
      </div>
      <div
        class="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md"
      >
        1
      </div>
      <h3 class="text-2xl font-bold mb-4">Upload Images</h3>
      <p class="text-slate-600 leading-relaxed">
        Drag and drop your JPG, PNG, or WebP files directly into the converter.
        Everything stays on your computer.
      </p>
    </div>

    <!-- Step 2 -->
    <div
      class="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div
        class="mb-6 w-20 h-20 rounded-2xl bg-blue-accent/10 flex items-center justify-center text-blue-accent group-hover:scale-110 transition-transform"
      >
        <span class="material-symbols-outlined text-4xl">reorder</span>
      </div>
      <div
        class="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md"
      >
        2
      </div>
      <h3 class="text-2xl font-bold mb-4">Arrange &amp; Edit</h3>
      <p class="text-slate-600 leading-relaxed">
        Reorder pages with a simple drag, choose your page size and filename,
        and remove any duplicates effortlessly.
      </p>
    </div>

    <!-- Step 3 -->
    <div
      class="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div
        class="mb-6 w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"
      >
        <span class="material-symbols-outlined text-4xl">task_alt</span>
      </div>
      <div
        class="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md"
      >
        3
      </div>
      <h3 class="text-2xl font-bold mb-4">Generate PDF</h3>
      <p class="text-slate-600 leading-relaxed">
        Click generate! Your PDF is compiled locally and downloaded instantly.
        No servers, no waiting, no tracking.
      </p>
    </div>
  </div>

  <!-- Privacy highlight section -->
  <section
    class="mt-20 lg:mt-32 p-8 lg:p-12 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/30 flex flex-col lg:flex-row items-center gap-10"
  >
    <div
      class="shrink-0 w-32 h-32 lg:w-48 lg:h-48 bg-white rounded-full flex items-center justify-center shadow-inner"
    >
      <div
        class="w-24 h-24 lg:w-36 lg:h-36 bg-primary rounded-full flex items-center justify-center text-white"
      >
        <span class="material-symbols-outlined text-5xl lg:text-7xl"
          >verified_user</span
        >
      </div>
    </div>
    <div class="text-center lg:text-left">
      <h2 class="text-2xl lg:text-3xl font-black mb-4">
        Your Data, Your Device
      </h2>
      <p class="text-lg text-slate-700 mb-6 leading-relaxed">
        Unlike other converters, we never see your images. Our client-side
        engine turns your browser into a powerful document processing station.
        This means <strong>zero risk</strong> of data breaches and
        <strong>instant results</strong>.
      </p>
      <div class="flex flex-wrap justify-center lg:justify-start gap-4">
        <div
          class="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <span class="material-symbols-outlined text-primary text-base"
            >cloud_off</span
          >
          No Server Uploads
        </div>
        <div
          class="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <span class="material-symbols-outlined text-primary text-base"
            >visibility_off</span
          >
          Zero Tracking
        </div>
        <div
          class="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <span class="material-symbols-outlined text-primary text-base"
            >speed</span
          >
          Instant Results
        </div>
      </div>
    </div>
  </section>

  <!-- Footer CTA -->
  <div class="mt-20 text-center">
    <a
      href="/"
      class="inline-flex items-center justify-center gap-3 px-10 py-5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-xl transition-all hover:scale-105 shadow-2xl shadow-primary/40 active:scale-95"
    >
      Got it, let's go!
      <span class="material-symbols-outlined">arrow_forward</span>
    </a>
    <p class="mt-6 text-sm text-slate-500">
      Ready to convert? Click above to return to the converter.
    </p>
  </div>
</main>
