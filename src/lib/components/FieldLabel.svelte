<script>
  /** A form label with its HelpTip on the same line: what the field means, the format and the default. */
  import HelpTip from './HelpTip.svelte';
  /** @type {{ for: string, help: string, children: import('svelte').Snippet }} */
  let { for: target, help, children } = $props();
</script>

<span class="label-line"><label for={target}>{@render children()}</label><HelpTip text={help} for={target} /></span>

<style>
  .label-line { display: flex; align-items: center; gap: 2px; min-width: 0; }
  .label-line label { min-width: 0; }
</style>
