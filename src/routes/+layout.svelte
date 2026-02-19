<script>
  import "../app.css";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import DecorativeBlobs from "$lib/components/DecorativeBlobs.svelte";

  let { children } = $props();
</script>

<div class="min-h-screen flex flex-col text-slate-800 relative">
  <Header />
  <DecorativeBlobs />
  {@render children()}
  <Footer />
</div>
