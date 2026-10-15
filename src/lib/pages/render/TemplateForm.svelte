<script>
  /** Create (name + description) or edit (description) a render template. */
  import { untrack } from 'svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (body: { name?: string, description: string }) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let name = $state('');
  let description = $state('');
  $effect(() => { if (!open) return; untrack(() => { name = initial?.name ?? ''; description = initial?.description ?? ''; }); });
  const submit = () => onsubmit(initial ? { description: description.trim() } : { name: name.trim(), description: description.trim() });
</script>

<Dialog help={t('help.dialog.rdTemplate')} {open} title={initial ? t('rd.edit') : t('rd.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !initial}<div class="field"><FieldLabel for="rt-name" help={t('help.rd.name')}>{t('rd.name')}</FieldLabel><input id="rt-name" class="input mono" bind:value={name} required pattern={'[a-z][a-z0-9\\-]{0,63}'} placeholder="invoice" /><span class="hint">{t('rd.nameHint')}</span></div>{/if}
    <div class="field"><FieldLabel for="rt-desc" help={t('help.rd.description')}>{t('rd.description')}</FieldLabel><input id="rt-desc" class="input" bind:value={description} maxlength="500" /></div>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || (!initial && !name.trim())}>{initial ? t('common.save') : t('rd.create')}</button>
  {/snippet}
</Dialog>
