<script>
  /** Shows a heartbeat monitor's ping address once, right after it was created or its token rotated. */
  import Dialog from '#lib/components/Dialog.svelte';
  import CopyButton from '#lib/components/CopyButton.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ path: string|null, onclose: () => void }} */
  let { path, onclose } = $props();
</script>

<Dialog help={t('help.dialog.stPing')} open={path !== null} title={t('stx.pingTitle')} {onclose}>
  <div class="stack">
    <p class="small muted no-margin">{t('stx.pingDesc')}</p>
    <div class="field"><span class="label">{t('stx.pingPath')}</span><div class="row sha"><code class="mono small truncate" title={path}>{path}</code>{#if path}<CopyButton text={path} />{/if}</div></div>
    <div class="field"><span class="label">{t('stx.pingCurl')}</span><code class="mono xs wrap-code">curl -fsS -X POST $STATUS_URL{path}</code></div>
  </div>
  {#snippet footer()}
    <button class="btn primary" onclick={onclose}>{t('stx.close')}</button>
  {/snippet}
</Dialog>

<style>
  .no-margin { margin: 0; }
  .sha { min-width: 0; gap: 6px; }
  .wrap-code { display: block; word-break: break-all; }
</style>
