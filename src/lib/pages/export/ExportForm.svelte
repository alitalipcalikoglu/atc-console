<script>
  /** New export: source, format, the source's own filters and an optional completion e-mail. */
  import { untrack } from 'svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, sources: any[], busy?: boolean, onsubmit: (body: Record<string, unknown>) => void, onclose: () => void }} */
  let { open, sources, busy = false, onsubmit, onclose } = $props();
  let source = $state('');
  let format = $state(/** @type {'csv'|'ndjson'} */ ('csv'));
  /** @type {Record<string, string>} */ let filters = $state({});
  let email = $state('');
  // Reset on open only; a sources reload while the dialog is open must not wipe the form.
  $effect(() => { if (!open) return; untrack(() => { source = sources[0]?.id ?? ''; format = 'csv'; filters = {}; email = ''; }); });
  const spec = $derived(sources.find((s) => s.id === source));
  const fields = $derived(/** @type {[string, any][]} */ (Object.entries(spec?.filters ?? {})));
  /** `actionPrefix` → `Action prefix`. @param {string} name */
  const human = (name) => { const s = name.replace(/([A-Z])/g, ' $1').toLowerCase(); return s[0].toUpperCase() + s.slice(1); };
  const missing = $derived(fields.some(([name, f]) => f.required && !(filters[name] ?? '').trim()));
  /** @param {string} id */
  function pickSource(id) { source = id; filters = {}; }
  function submit() {
    const f = Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    onsubmit({ source, format, ...(Object.keys(f).length ? { filters: f } : {}), ...(email.trim() ? { notifyEmail: email.trim() } : {}) });
  }
</script>

<Dialog help={t('help.dialog.export')} {open} title={t('ex.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if !sources.length}<p class="small muted">{t('ex.noSources')}</p>{:else}
      <div class="field"><FieldLabel for="xf-source" help={t('help.ex.source')}>{t('ex.source')}</FieldLabel>
        <select id="xf-source" class="select" value={source} onchange={(e) => pickSource(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}>{#each sources as s (s.id)}<option value={s.id}>{s.label} ({s.id})</option>{/each}</select></div>
      <div class="field"><span class="small field-label">{t('ex.format')}<HelpTip text={t('help.ex.format')} /></span>
        <div class="seg"><button type="button" aria-pressed={format === 'csv'} onclick={() => { format = 'csv'; }}>CSV</button><button type="button" aria-pressed={format === 'ndjson'} onclick={() => { format = 'ndjson'; }}>NDJSON</button></div></div>
      <fieldset class="stack plain">
        <legend class="small field-label">{t('ex.filters')}</legend>
        {#if !fields.length}<p class="xs faint">{t('ex.noFilters')}</p>{/if}
        {#each fields as [name, f] (name)}
          <div class="field"><FieldLabel for="xf-{name}" help={f.description || t('help.ex.filter')}>{human(name)}{#if f.required}<span class="faint note">({t('ex.required')})</span>{/if}</FieldLabel>
            {#if f.enum}<select id="xf-{name}" class="select" bind:value={filters[name]}><option value="">–</option>{#each f.enum as v (v)}<option value={v}>{v}</option>{/each}</select>
            {:else}<input id="xf-{name}" class="input" bind:value={filters[name]} required={f.required} maxlength={f.maxLength ?? 200} placeholder={f.format === 'date-time' ? '2026-10-01T00:00:00Z' : ''} />{/if}
            </div>
        {/each}
      </fieldset>
      <div class="field"><FieldLabel for="xf-email" help={t('help.ex.email')}>{t('ex.notifyEmail')}</FieldLabel><input id="xf-email" class="input" type="email" bind:value={email} maxlength="254" placeholder="ops@example.com" /><span class="hint">{t('ex.notifyHint')}</span></div>
    {/if}
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !source || missing}>{t('ex.create')}</button>
  {/snippet}
</Dialog>

<style>
  .note { margin-left: 6px; }
  fieldset.plain { border: 0; padding: 0; margin: 0; min-width: 0; }
  .field-label { font-weight: 550; color: var(--text-2); }
</style>
