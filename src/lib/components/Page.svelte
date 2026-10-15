<script>
  /** Registers title, description, back link and actions with the app bar, then renders the body. */
  import { page } from '#lib/client/page.svelte.js';
  /** @type {{ title: string, help: string, docs?: string, desc?: string, back?: string, actions?: import('svelte').Snippet, children: import('svelte').Snippet }} `help` explains the page (a HelpTip next to the title); `docs` is the service id whose API reference the app bar links. */
  let { title, help, docs, desc, back, actions, children } = $props();
  $effect(() => {
    page.set({ title, help, docs, desc, back, actions });
    return () => page.clear();
  });
</script>

<svelte:head><title>{title} · Console</title></svelte:head>

{@render children()}
