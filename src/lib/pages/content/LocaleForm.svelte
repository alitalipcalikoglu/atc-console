<script>
  /** Add a locale (tag + fallback) or change an existing locale's fallback. */
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, ns: any, locale?: any, busy?: boolean, onsubmit: (locale: string, fallback: string|null) => void, onclose: () => void }} */
  let { open, ns, locale = null, busy = false, onsubmit, onclose } = $props();
  let tag = $state('');
  let fallback = $state('');
  $effect(() => { if (!open) return; tag = locale?.locale ?? ''; fallback = locale?.fallback ?? ''; });
  // The default ends every chain; a locale cannot fall back to itself.
  const options = $derived(/** @type {string[]} */ ((ns?.locales ?? []).map((/** @type {any} */ l) => l.locale).filter((/** @type {string} */ l) => l !== (locale?.locale ?? tag.trim()))));
  const isDefault = $derived(Boolean(locale && ns && locale.locale === ns.defaultLocale));
  const submit = () => onsubmit(locale ? locale.locale : tag.trim(), fallback || null);
</script>

<Dialog help={t('help.dialog.ctLocale')} {open} title={locale ? t('ct.editLocale', { l: locale.locale }) : t('ct.addLocale')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !locale}
      <div class="field"><FieldLabel for="cl-tag" help={t('help.ct.locale')}>{t('ct.locale')}</FieldLabel><input id="cl-tag" class="input mono" bind:value={tag} required maxlength="35" placeholder="tr-CY" /><span class="hint">{t('ct.defaultLocaleHint')}</span></div>
    {/if}
    {#if !isDefault}
      <div class="field"><FieldLabel for="cl-fb" help={t('help.ct.fallback')}>{t('ct.fallback')}</FieldLabel>
        <select id="cl-fb" class="select" bind:value={fallback}><option value="">{t('ct.fallbackNone')}</option>{#each options as l (l)}<option value={l}>{l}</option>{/each}</select>
        <span class="hint">{t('ct.fallbackHint')}</span></div>
    {/if}
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || (!locale && !tag.trim())}>{locale ? t('common.save') : t('ct.addLocale')}</button>
  {/snippet}
</Dialog>
