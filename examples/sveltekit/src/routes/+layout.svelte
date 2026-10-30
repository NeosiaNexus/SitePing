<script lang="ts">
  import { initSiteping } from "@siteping/widget";
  import { onMount } from "svelte";

  let { children } = $props();

  // onMount only runs in the browser, never during server rendering. In the
  // root layout, one widget follows every client-side navigation.
  onMount(() => {
    // forceShow: also show it on `npm run preview`, a production build.
    const siteping = initSiteping({ endpoint: "/api/siteping", projectName: "sveltekit-example", forceShow: true });
    return () => siteping.destroy();
  });
</script>

<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>

<main>
  {@render children()}
</main>

<style>
  :global(body) {
    font-family: system-ui, sans-serif;
    margin: 0;
  }
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem 2rem;
    border-bottom: 1px solid #e5e7eb;
  }
  main {
    max-width: 40rem;
    padding: 2rem;
  }
</style>
