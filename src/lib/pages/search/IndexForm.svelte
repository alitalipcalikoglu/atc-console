<script>
  /** Create or edit an index. Editing sends only the fields that changed. */
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (body: any) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let name = $state('');
  let description = $state('');
  let facets = $state('');
  let wTitle = $state(5);
  let wBody = $state(1);
  let wTags = $state(3);
  let language = $state('none');
  $effect(() => {
    if (!open) return;
    name = initial?.name ?? ''; description = initial?.description ?? ''; facets = (initial?.facets ?? []).join(', ');
    wTitle = initial?.weights?.title ?? 5; wBody = initial?.weights?.body ?? 1; wTags = initial?.weights?.tags ?? 3; language = initial?.language ?? 'none';
  });
  const valid = $derived(Boolean(initial || name.trim()) && [wTitle, wBody, wTags].every((w) => Number.isFinite(Number(w)) && Number(w) >= 0 && Number(w) <= 100));
  function build() {
    const full = { description: description.trim(), weights: { title: Number(wTitle), body: Number(wBody), tags: Number(wTags) }, facets: [...new Set(facets.split(',').map((s) => s.trim()).filter(Boolean))], language };
    if (!initial) return { name: name.trim(), ...full };
    /** @type {Record<string, unknown>} */ const patch = {};
    for (const k of /** @type {(keyof typeof full)[]} */ (Object.keys(full))) if (JSON.stringify(full[k]) !== JSON.stringify(initial[k])) patch[k] = full[k];
    return patch;
  }
  function submit() { if (valid) onsubmit(build()); }
</script>

<Dialog help={t('help.dialog.seIndex')} {open} title={initial ? t('se.edit') : t('se.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !initial}<div class="field"><FieldLabel for="if-name" help={t('help.se.name')}>{t('se.name')}</FieldLabel><input id="if-name" class="input mono" bind:value={name} required pattern={'[a-z0-9]+([.\\-_][a-z0-9]+)*'} placeholder="products" /><span class="hint">{t('se.nameHint')}</span></div>{/if}
    <div class="field"><FieldLabel for="if-desc" help={t('help.se.description')}>{t('fl.description')}</FieldLabel><input id="if-desc" class="input" bind:value={description} maxlength="500" /></div>
    <div class="field"><span class="small" style="font-weight:550;color:var(--text-2)">{t('se.weights')}</span>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
        <div class="field"><FieldLabel for="if-wt" help={t('help.se.wTitle')}>{t('se.title.w')}</FieldLabel><input id="if-wt" class="input" type="number" min="0" max="100" bind:value={wTitle} /></div>
        <div class="field"><FieldLabel for="if-wb" help={t('help.se.wBody')}>{t('se.body.w')}</FieldLabel><input id="if-wb" class="input" type="number" min="0" max="100" bind:value={wBody} /></div>
        <div class="field"><FieldLabel for="if-wg" help={t('help.se.wTags')}>{t('se.tags.w')}</FieldLabel><input id="if-wg" class="input" type="number" min="0" max="100" bind:value={wTags} /></div>
      </div><span class="hint">{t('se.weightsHint')}</span></div>
    <div class="field"><FieldLabel for="if-facets" help={t('help.se.facets')}>{t('se.facetKeys')} <span class="faint">({t('common.optional')})</span></FieldLabel><input id="if-facets" class="input mono" bind:value={facets} placeholder="brand, color, tags" /><span class="hint">{t('se.facetKeysHint')}</span></div>
    <div class="field"><FieldLabel for="if-lang" help={t('help.se.language')}>{t('se.language')}</FieldLabel><select id="if-lang" class="select" bind:value={language}><option value="none">{t('se.language.none')}</option><option value="tr">{t('se.language.tr')}</option></select><span class="hint">{t('se.languageHint')}</span></div>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{initial ? t('common.save') : t('se.create')}</button>
  {/snippet}
</Dialog>
