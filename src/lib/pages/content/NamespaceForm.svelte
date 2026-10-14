<script>
  /** Create (name + default locale + description) or edit (description, default locale) dialog. */
  import Dialog from '#lib/components/Dialog.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (body: Record<string, unknown>) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let name = $state('');
  let defaultLocale = $state('');
  let description = $state('');
  $effect(() => { if (!open) return; name = initial?.name ?? ''; defaultLocale = initial?.defaultLocale ?? 'en'; description = initial?.description ?? ''; });
  const locales = $derived(/** @type {string[]} */ ((initial?.locales ?? []).map((/** @type {any} */ l) => l.locale)));
  function submit() {
    if (!initial) { onsubmit({ name: name.trim(), defaultLocale: defaultLocale.trim(), ...(description.trim() ? { description: description.trim() } : {}) }); return; }
    /** @type {Record<string, unknown>} */ const patch = {};
    if (description.trim() !== initial.description) patch.description = description.trim();
    if (defaultLocale !== initial.defaultLocale) patch.defaultLocale = defaultLocale;
    onsubmit(patch);
  }
</script>

<Dialog {open} title={initial ? t('ct.edit') : t('ct.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !initial}
      <div class="field"><label for="cn-name">{t('ct.name')}</label><input id="cn-name" class="input mono" bind:value={name} required pattern={'[a-z][a-z0-9\\-]{0,63}'} placeholder="web" /><span class="hint">{t('ct.nameHint')}</span></div>
      <div class="field"><label for="cn-locale">{t('ct.defaultLocale')}</label><input id="cn-locale" class="input mono" bind:value={defaultLocale} required maxlength="35" placeholder="en" /><span class="hint">{t('ct.defaultLocaleHint')}</span></div>
    {:else}
      <div class="field"><label for="cn-default">{t('ct.defaultLocale')}</label><select id="cn-default" class="select" bind:value={defaultLocale}>{#each locales as l (l)}<option value={l}>{l}</option>{/each}</select><span class="hint">{t('ct.defaultLocaleHint')}</span></div>
    {/if}
    <div class="field"><label for="cn-desc">{t('ct.description')}</label><input id="cn-desc" class="input" bind:value={description} maxlength="500" /></div>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || (!initial && (!name.trim() || !defaultLocale.trim()))}>{initial ? t('common.save') : t('ct.create')}</button>
  {/snippet}
</Dialog>
