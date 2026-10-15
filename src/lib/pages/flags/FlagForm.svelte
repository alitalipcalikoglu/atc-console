<script>
  /** Create (key + kind + initial values) or edit (description, tags) dialog. */
  import Dialog from '#lib/components/Dialog.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import ValueInput from './ValueInput.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (body: any) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let key = $state('');
  /** @typedef {'boolean'|'string'|'number'|'json'} Kind */
  let kind = $state(/** @type {Kind} */ ('boolean'));
  let description = $state('');
  let tags = $state('');
  /** @type {unknown} */ let value = $state(true);
  /** @type {unknown} */ let offValue = $state(false);
  let enabled = $state(false);
  const DEFAULTS = /** @type {const} */ ({ boolean: [true, false], string: ['', ''], number: [0, 0], json: [null, null] });
  /** @type {Kind[]} */
  const KINDS = ['boolean', 'string', 'number', 'json'];
  $effect(() => { if (!open) return; key = initial?.key ?? ''; kind = initial?.kind ?? 'boolean'; description = initial?.description ?? ''; tags = (initial?.tags ?? []).join(', '); [value, offValue] = DEFAULTS.boolean; enabled = false; });
  /** @param {Kind} k */
  function pickKind(k) { kind = k; [value, offValue] = DEFAULTS[k]; }
  function submit() {
    const tagList = tags.split(',').map((s) => s.trim()).filter(Boolean);
    if (initial) { onsubmit({ description: description.trim(), tags: tagList }); return; }
    onsubmit({ key: key.trim(), kind, description: description.trim(), tags: tagList, value, offValue, enabled });
  }
</script>

<Dialog help={t('help.dialog.flag')} {open} title={initial ? t('fl.edit') : t('fl.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !initial}
      <div class="field"><FieldLabel for="ff-key" help={t('help.fl.key')}>{t('fl.key')}</FieldLabel><input id="ff-key" class="input mono" bind:value={key} required pattern={'[a-z0-9]+([.\\-_][a-z0-9]+)*'} placeholder="checkout.new" /><span class="hint">{t('fl.keyHint')}</span></div>
      <div class="field"><span class="small" style="font-weight:550;color:var(--text-2)">{t('fl.kind')}<HelpTip text={t('help.fl.kind')} /></span>
        <div class="seg">{#each KINDS as k (k)}<button type="button" aria-pressed={kind === k} onclick={() => pickKind(k)}>{k}</button>{/each}</div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        <div class="field"><FieldLabel for="ff-on" help={t('help.fl.value')}>{t('fl.value')}</FieldLabel><ValueInput id="ff-on" {kind} {value} onchange={(v) => { value = v; }} /></div>
        <div class="field"><FieldLabel for="ff-off" help={t('help.fl.offValue')}>{t('fl.offValue')}</FieldLabel><ValueInput id="ff-off" {kind} value={offValue} onchange={(v) => { offValue = v; }} /></div>
      </div>
      <label class="checkbox small"><input id="ff-enabled" type="checkbox" bind:checked={enabled} /> {t('fl.enableEverywhere')}</label><HelpTip text={t('help.fl.enableEverywhere')} for="ff-enabled" />
    {/if}
    <div class="field"><FieldLabel for="ff-desc" help={t('help.fl.description')}>{t('fl.description')}</FieldLabel><input id="ff-desc" class="input" bind:value={description} maxlength="500" /></div>
    <div class="field"><FieldLabel for="ff-tags" help={t('help.fl.tags')}>{t('sl.tags')} <span class="faint">({t('sl.tagsHint')})</span></FieldLabel><input id="ff-tags" class="input" bind:value={tags} placeholder="checkout, q4" /></div>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || (!initial && !key.trim())}>{initial ? t('common.save') : t('fl.create')}</button>
  {/snippet}
</Dialog>
