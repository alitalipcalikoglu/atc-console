<script>
  /** Import a flat or nested JSON object into one locale; shows the service's report afterwards. */
  import Dialog from '#lib/components/Dialog.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, ns: any, busy?: boolean, report?: any, onsubmit: (locale: string, strings: object) => void, onclose: () => void }} */
  let { open, ns, busy = false, report = null, onsubmit, onclose } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  let locale = $state('');
  let text = $state('');
  $effect(() => { if (!open) return; locale = ns?.defaultLocale ?? ''; text = ''; });
  const parsed = $derived.by(() => { try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } });
  /** @param {Event} e */
  async function pick(e) {
    const file = /** @type {HTMLInputElement} */ (e.currentTarget).files?.[0];
    if (file) text = await file.text();
  }
</script>

<Dialog help={t('help.dialog.ctImport')} {open} title={t('ct.import')} {onclose} wide>
  <div class="stack">
    <p class="small muted" style="margin:0">{t('ct.importHint')}</p>
    <div class="row wrap">
      <select id="ct-import-locale" class="select" style="width:auto" bind:value={locale} aria-label={t('ct.locale')}>{#each ns?.locales ?? [] as l (l.locale)}<option value={l.locale}>{l.locale}{l.locale === ns.defaultLocale ? ` (${t('ct.default')})` : ''}</option>{/each}</select><HelpTip text={t('help.ct.importLocale')} for="ct-import-locale" />
      <label class="btn sm"><input id="ct-import-file" data-help-group="ct-import" type="file" accept="application/json,.json" class="sr-only" onchange={pick} />{t('ct.importFile')}</label>
    </div>
    <textarea id="ct-import" class="textarea mono" rows="12" bind:value={text} placeholder={'{\n  "nav": { "home": "Home" },\n  "cart.items": "{count} items"\n}'} aria-label={t('ct.import')}></textarea><HelpTip text={t('help.ct.importText')} for="ct-import" />
    {#if text.trim() && !parsed}<span class="small danger-text">{t('ct.importInvalid')}</span>{:else if parsed}<span class="small faint">{t('ct.importReady', { n: fmt.int(Object.keys(parsed).length) })}</span>{/if}
    {#if report}
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">
        <Stat label={t('ct.added')} value={fmt.int(report.added)} />
        <Stat label={t('common.updated')} value={fmt.int(report.updated)} />
        <Stat label={t('ct.unchanged')} value={fmt.int(report.unchanged)} />
        <Stat label={t('ct.invalid')} value={fmt.int(report.invalidCount)} tone={report.invalidCount ? 'warn' : ''} />
      </div>
      {#if report.invalid.length}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('ct.key')}</th><th>{t('common.details')}</th></tr></thead>
          <tbody>{#each report.invalid as i, n (n)}<tr><td><code class="truncate" style="max-width:220px;display:block">{i.key}</code></td><td class="small">{i.reason}</td></tr>{/each}</tbody>
        </table></div>
      {/if}
    {/if}
  </div>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.close')}</button>
    <button class="btn primary" onclick={() => parsed && onsubmit(locale, parsed)} disabled={busy || !parsed || !locale}>{t('ct.import')}</button>
  {/snippet}
</Dialog>
