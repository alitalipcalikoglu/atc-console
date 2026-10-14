<script>
  /** Index documents from pasted text or a file: a JSON array or one JSON document per line; sent in batches of 500. */
  import Dialog from '#lib/components/Dialog.svelte';
  import { api } from '#lib/client/api.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  /** @type {{ open: boolean, base: string, ondone: () => void, onclose: () => void }} */
  let { open, base, ondone, onclose } = $props();
  const BATCH = 500;
  const fmt = $derived(new Fmt(i18n.lang));
  let text = $state('');
  let busy = $state(false);
  $effect(() => { if (open) text = ''; });
  /** @param {string} raw @returns {any[]|null} */
  function parse(raw) {
    const s = raw.trim();
    if (!s) return null;
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v;
      return v && typeof v === 'object' ? [v] : null;
    } catch {
      try { return s.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)); } catch { return null; }
    }
  }
  const docs = $derived(parse(text));
  const valid = $derived(!!docs && docs.length > 0 && docs.every((d) => d && typeof d === 'object' && typeof d.id === 'string' && d.id && typeof d.title === 'string'));
  /** @param {Event} e */
  async function pick(e) {
    const file = /** @type {HTMLInputElement} */ (e.currentTarget).files?.[0];
    if (file) text = await file.text();
  }
  async function submit() {
    if (!docs || !valid) return;
    busy = true;
    let created = 0;
    let updated = 0;
    try {
      for (let i = 0; i < docs.length; i += BATCH) {
        const r = /** @type {any} */ (await api.put(`${base}/documents`, { documents: docs.slice(i, i + BATCH) }));
        created += r.created ?? 0; updated += r.updated ?? 0;
      }
      toasts.ok(t('se.docsIndexed', { created: fmt.int(created), updated: fmt.int(updated) }));
      ondone();
    } catch (e) {
      toasts.error(e);
      if (created || updated) ondone();
    } finally { busy = false; }
  }
</script>

<Dialog {open} title={t('se.addDocs')} {onclose} wide>
  <div class="stack">
    <p class="small muted" style="margin:0">{t('se.addDocsHint')}</p>
    <div class="row wrap"><label class="btn sm"><input type="file" accept=".json,.jsonl,.ndjson,application/json" class="sr-only" onchange={pick} />{t('se.addDocsFile')}</label></div>
    <textarea class="textarea mono" rows="12" bind:value={text} placeholder={'[\n  { "id": "p1", "title": "Red dress", "body": "…", "tags": ["summer"], "attrs": { "color": "red" } }\n]'} aria-label={t('se.addDocs')}></textarea>
    {#if text.trim() && !valid}<span class="small danger-text">{t('se.docsInvalid')}</span>{:else if docs}<span class="small faint">{t('se.docsReady', { n: fmt.int(docs.length) })}</span>{/if}
  </div>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.close')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{t('se.addDocs')}</button>
  {/snippet}
</Dialog>
