<script>
  /** Queue a background render of a template: file name, where the PDF goes, the data. */
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Switch from '#lib/components/Switch.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, template: string, version: number, dataText: string, busy?: boolean, onsubmit: (body: { template: string, version: number, data: object, filename?: string, store: boolean }) => void, onclose: () => void }} */
  let { open, template, version, dataText, busy = false, onsubmit, onclose } = $props();
  let filename = $state('');
  let store = $state(false);
  let text = $state('');
  $effect(() => { if (open) { filename = ''; store = false; text = dataText; } });
  const data = $derived.by(() => { try { const v = JSON.parse(text || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? { value: v, error: null } : { value: null, error: t('rd.dataObject') }; } catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; } });
  function submit() {
    if (!data.value) return;
    onsubmit({ template, version, data: data.value, ...(filename.trim() ? { filename: filename.trim() } : {}), store });
  }
</script>

<Dialog {open} title={t('rd.queue')} help={t('help.dialog.renderQueue')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <p class="small muted no-margin">{t('rd.queueDesc', { template, v: version })}</p>
    <div class="field"><FieldLabel for="rj-name" help={t('help.rd.filename')}>{t('rd.filename')}</FieldLabel><input id="rj-name" class="input" type="text" maxlength="120" placeholder="{template}-v{version}" bind:value={filename} /></div>
    <div class="field"><span class="small field-label">{t('rd.storeInMedia')}<HelpTip text={t('help.rd.store')} /></span><Switch checked={store} label={t('rd.storeInMedia')} onchange={(next) => { store = next; }} /></div>
    <div class="field"><FieldLabel for="rj-data" help={t('help.rd.jobData')}>{t('rd.data')}</FieldLabel><textarea id="rj-data" class="textarea mono" rows="10" bind:value={text} spellcheck="false" aria-invalid={data.error ? 'true' : undefined}></textarea>{#if data.error}<span class="error">{data.error}</span>{/if}</div>
  </form>
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" type="button" onclick={submit} disabled={busy || !data.value}>{t('rd.queue')}</button>
  {/snippet}
</Dialog>

<style>
  .no-margin { margin: 0; }
</style>
