<script>
  /** Export one locale's own values (draft or published, flat or nested) to copy or download. */
  import Dialog from '#lib/components/Dialog.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import CopyButton from '#lib/components/CopyButton.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import { api } from '#lib/client/api.js';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, sid: string, ns: any, onclose: () => void }} */
  let { open, sid, ns, onclose } = $props();
  let locale = $state('');
  let source = $state(/** @type {'draft'|'published'} */ ('draft'));
  let format = $state(/** @type {'flat'|'nested'} */ ('flat'));
  /** @type {string|null} */ let output = $state(null);
  /** @type {unknown} */ let error = $state(null);
  let busy = $state(false);
  $effect(() => { if (!open) return; locale = ns?.defaultLocale ?? ''; output = null; error = null; });
  async function load() {
    busy = true;
    try { const r = /** @type {any} */ (await api.get(`/services/${sid}/atc-content/namespaces/${encodeURIComponent(ns.name)}/export/${encodeURIComponent(locale)}?source=${source}&format=${format}`)); output = `${JSON.stringify(r.strings, null, 2)}\n`; error = null; }
    catch (e) { error = e; output = null; } finally { busy = false; }
  }
  function download() {
    if (output === null) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${ns.name}.${locale}.${source}.json`; a.click();
    URL.revokeObjectURL(url);
  }
</script>

<Dialog {open} title={t('ct.export')} {onclose} wide>
  <div class="stack">
    <div class="row wrap">
      <select class="select" style="width:auto" bind:value={locale} aria-label={t('ct.locale')} onchange={() => { output = null; }}>{#each ns?.locales ?? [] as l (l.locale)}<option value={l.locale}>{l.locale}</option>{/each}</select>
      <div class="seg" role="group" aria-label={t('ct.source')}><button aria-pressed={source === 'draft'} onclick={() => { source = 'draft'; output = null; }}>{t('ct.draft')}</button><button aria-pressed={source === 'published'} onclick={() => { source = 'published'; output = null; }}>{t('ct.published')}</button></div>
      <div class="seg" role="group" aria-label={t('ct.format')}><button aria-pressed={format === 'flat'} onclick={() => { format = 'flat'; output = null; }}>{t('ct.flat')}</button><button aria-pressed={format === 'nested'} onclick={() => { format = 'nested'; output = null; }}>{t('ct.nested')}</button></div>
    </div>
    {#if error}<ErrorBox {error} onretry={load} />
    {:else if output !== null}<pre class="result">{output}</pre>{/if}
  </div>
  {#snippet footer()}
    {#if output !== null}<CopyButton text={output} small={false} /><button class="btn" onclick={download}><Icon name="download" size={16} /> {t('ct.download')}</button><span class="grow"></span>{/if}
    <button class="btn" onclick={onclose}>{t('common.close')}</button>
    <button class="btn primary" onclick={load} disabled={busy || !locale}>{t('ct.exportLoad')}</button>
  {/snippet}
</Dialog>
