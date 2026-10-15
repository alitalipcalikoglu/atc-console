<script>
  /** Create or edit a subscription. Editing sends only the fields that changed. */
  import Dialog from '#lib/components/Dialog.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (body: any) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let name = $state('');
  let description = $state('');
  let url = $state('');
  let events = $state('');
  let headers = $state('');
  let enabled = $state(true);
  $effect(() => {
    if (!open) return;
    const s = initial;
    name = s?.name ?? ''; description = s?.description ?? ''; url = s?.url ?? ''; enabled = s ? s.status === 'active' : true;
    events = (s?.events ?? ['*']).join('\n');
    headers = Object.entries(s?.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  });
  const patterns = $derived([...new Set(events.split('\n').map((l) => l.trim()).filter(Boolean))]);
  const parsedHeaders = $derived.by(() => {
    /** @type {Record<string, string>} */ const out = {};
    for (const raw of headers.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const i = line.indexOf(':');
      if (i <= 0) return { error: t('wh.headersInvalid', { line }) };
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { value: out };
  });
  const valid = $derived(Boolean(url.trim()) && Boolean(name.trim()) && patterns.length > 0 && !parsedHeaders.error);
  function build() {
    const full = { name: name.trim(), description: description.trim(), url: url.trim(), events: patterns, headers: parsedHeaders.value ?? {} };
    if (!initial) return { ...full, enabled };
    const before = { name: initial.name, description: initial.description, url: initial.url, events: initial.events, headers: initial.headers };
    /** @type {Record<string, unknown>} */ const patch = {};
    for (const k of /** @type {(keyof typeof full)[]} */ (Object.keys(full))) if (JSON.stringify(k === 'events' ? [...full.events].sort() : full[k]) !== JSON.stringify(before[k])) patch[k] = full[k];
    return patch;
  }
  function submit() { if (valid) onsubmit(build()); }
</script>

<Dialog help={t('help.dialog.whSubscription')} {open} title={initial ? t('wh.edit') : t('wh.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="field"><FieldLabel for="sf-name" help={t('help.wh.name')}>{t('wh.name')}</FieldLabel><input id="sf-name" class="input mono" bind:value={name} required pattern={'[a-z0-9]+([.\\-_][a-z0-9]+)*'} placeholder="kargocu-a" /><span class="hint">{t('wh.nameHint')}</span></div>
    <div class="field"><FieldLabel for="sf-desc" help={t('help.wh.description')}>{t('fl.description')}</FieldLabel><input id="sf-desc" class="input" bind:value={description} maxlength="500" /></div>
    <div class="field"><FieldLabel for="sf-url" help={t('help.wh.url')}>{t('wh.url')}</FieldLabel><input id="sf-url" class="input mono" type="url" bind:value={url} required placeholder="https://api.partner.example/hooks" /></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      <div class="field"><FieldLabel for="sf-events" help={t('help.wh.events')}>{t('wh.eventPatterns')}</FieldLabel><textarea id="sf-events" class="textarea mono" rows="4" bind:value={events} required placeholder="order.paid&#10;order.*"></textarea><span class="hint">{t('wh.patternsHint')}</span></div>
      <div class="field"><FieldLabel for="sf-headers" help={t('help.wh.headers')}>{t('wh.headers')} <span class="faint">({t('common.optional')})</span></FieldLabel><textarea id="sf-headers" class="textarea mono" rows="4" bind:value={headers} placeholder="X-Tenant: shop-1" aria-invalid={parsedHeaders.error ? 'true' : undefined}></textarea>{#if parsedHeaders.error}<span class="error">{parsedHeaders.error}</span>{:else}<span class="hint">{t('wh.headersHint')}</span>{/if}</div>
    </div>
    {#if !initial}<label class="checkbox small"><input id="sf-enabled" type="checkbox" bind:checked={enabled} /> {t('wh.startEnabled')}</label><HelpTip text={t('help.wh.startEnabled')} for="sf-enabled" />{/if}
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{initial ? t('common.save') : t('wh.create')}</button>
  {/snippet}
</Dialog>
