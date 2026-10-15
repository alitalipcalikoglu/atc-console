<script>
  /** Create a key or edit one key's description and per-locale values; only changed locales are sent. */
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, ns: any, entry?: any, busy?: boolean, onsubmit: (key: string, body: { description?: string, values?: Record<string, string|null> }) => void, ondelete?: () => void, onclose: () => void }} */
  let { open, ns, entry = null, busy = false, onsubmit, ondelete, onclose } = $props();
  let key = $state('');
  let description = $state('');
  /** @type {Record<string, string>} */ let values = $state({});
  $effect(() => {
    if (!open) return;
    key = entry?.key ?? '';
    description = entry?.description ?? '';
    values = Object.fromEntries((ns?.locales ?? []).map((/** @type {any} */ l) => [l.locale, entry?.values?.[l.locale] ?? '']));
  });
  // Default locale first: it is the source the others are checked against.
  const locales = $derived(/** @type {string[]} */ ((ns?.locales ?? []).map((/** @type {any} */ l) => l.locale).sort((/** @type {string} */ a, /** @type {string} */ b) => Number(b === ns.defaultLocale) - Number(a === ns.defaultLocale))));
  const placeholders = $derived([...new Set(Array.from((values[ns?.defaultLocale] ?? '').matchAll(/\{([A-Za-z_][A-Za-z0-9_]{0,63})\}/g), (m) => m[1]))].sort());
  /** @param {string} l */
  const changed = (l) => (values[l] ?? '') !== (entry?.values?.[l] ?? '');
  function submit() {
    /** @type {Record<string, string|null>} */ const patch = {};
    for (const l of locales) if (changed(l)) patch[l] = values[l] === '' ? null : values[l];
    onsubmit(entry ? entry.key : key.trim(), {
      ...(description.trim() !== (entry?.description ?? '') ? { description: description.trim() } : {}),
      ...(Object.keys(patch).length ? { values: patch } : {}),
    });
  }
</script>

<Dialog help={t('help.dialog.ctKey')} {open} title={entry ? entry.key : t('ct.addKey')} {onclose} wide>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !entry}
      <div class="field"><FieldLabel for="ck-key" help={t('help.ct.key')}>{t('ct.key')}</FieldLabel><input id="ck-key" class="input mono" bind:value={key} required maxlength="128" pattern={'[a-z0-9][a-z0-9._\\-]{0,127}'} placeholder="cart.items" /><span class="hint">{t('ct.keyHint')}</span></div>
    {/if}
    <div class="field"><FieldLabel for="ck-desc" help={t('help.ct.keyDescription')}>{t('ct.description')}</FieldLabel><input id="ck-desc" class="input" bind:value={description} maxlength="500" /></div>
    <p class="xs faint" style="margin:0">{t('ct.placeholdersHint', { p: placeholders.length ? placeholders.map((p) => `{${p}}`).join(' ') : t('ct.noPlaceholders') })} {t('ct.emptyMeansNone')}</p>
    {#each locales as l (l)}
      <div class="field"><FieldLabel for="ck-{l}" help={t('help.ct.value')}>{l}{#if l === ns.defaultLocale}<span class="faint note">({t('ct.default')})</span>{/if}{#if entry?.mismatched?.includes(l)}<span class="danger-text xs note">· {t('ct.mismatch')}</span>{/if}</FieldLabel>
        <textarea id="ck-{l}" class="textarea" rows="2" bind:value={values[l]} maxlength="100000"></textarea></div>
    {/each}
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    {#if entry && ondelete}<button class="btn danger" onclick={ondelete} disabled={busy}>{t('ct.deleteKey')}</button><span class="grow"></span>{/if}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || (!entry && !key.trim())}>{entry ? t('common.save') : t('ct.addKey')}</button>
  {/snippet}
</Dialog>

<style>
  .note { margin-left: 6px; }
</style>
