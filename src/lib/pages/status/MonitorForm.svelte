<script>
  /** Create a monitor (kind, id + settings) or edit one. A seeded monitor's URL is fixed by MONITOR_SEEDS; the kind is fixed once created. */
  import { untrack } from 'svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (id: string, body: Record<string, unknown>) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  /** @type {'http'|'tcp'|'tls'|'heartbeat'} */ let kind = $state('http');
  let id = $state('');
  let name = $state('');
  let description = $state('');
  let url = $state('');
  /** @type {'GET'|'HEAD'} */ let method = $state('GET');
  let intervalSec = $state(60);
  let timeoutMs = $state(5000);
  let expect = $state('200');
  let expectText = $state('');
  let warnDays = $state(14);
  let graceSec = $state(60);
  let failThreshold = $state(2);
  let isPublic = $state(false);
  $effect(() => {
    if (!open) return;
    untrack(() => {
      kind = initial?.kind ?? 'http';
      id = initial?.id ?? ''; name = initial?.name ?? ''; description = initial?.description ?? ''; url = initial?.url ?? (kind === 'http' ? 'https://' : 'https://');
      method = initial?.method ?? 'GET'; intervalSec = initial?.intervalSec ?? 60; timeoutMs = initial?.timeoutMs ?? 5000;
      expect = (initial?.expectStatus ?? [200]).join(', '); expectText = initial?.expectText ?? ''; warnDays = initial?.warnDays ?? 14; graceSec = initial?.graceSec ?? 60;
      failThreshold = initial?.failThreshold ?? 2; isPublic = initial?.public ?? false;
    });
  });
  const seeded = $derived(initial?.origin === 'env');
  const heartbeat = $derived(kind === 'heartbeat');
  const statuses = $derived(expect.split(/[\s,]+/).filter(Boolean).map(Number));
  const statusesOk = $derived(kind !== 'http' || (statuses.length > 0 && statuses.length <= 20 && statuses.every((n) => Number.isInteger(n) && n >= 100 && n <= 599)));
  const urlOk = $derived(heartbeat || /^https?:\/\/[^\s/]+/.test(url.trim()));
  const textOk = $derived(!expectText || method === 'GET');
  const valid = $derived((initial || /^[a-z0-9][a-z0-9-]{0,63}$/.test(id.trim())) && (seeded || urlOk) && statusesOk && textOk && intervalSec >= 10 && (heartbeat || (timeoutMs >= 500 && timeoutMs <= intervalSec * 1000)) && failThreshold >= 1);
  function submit() {
    /** @type {Record<string, unknown>} */
    const body = { name: name.trim() || (initial ? initial.name : id.trim()), description: description.trim(), intervalSec: Number(intervalSec), failThreshold: Number(failThreshold), public: isPublic };
    if (!initial) body.kind = kind;
    if (heartbeat) body.graceSec = Number(graceSec);
    else {
      body.timeoutMs = Number(timeoutMs);
      if (kind === 'http') { body.method = method; body.expectStatus = statuses; body.expectText = expectText.trim() || null; }
      if (kind === 'tls') body.warnDays = Number(warnDays);
      if (!seeded) body.url = url.trim();
    }
    onsubmit(initial ? initial.id : id.trim(), body);
  }
</script>

<Dialog {open} title={initial ? t('stx.edit') : t('stx.create')} {onclose} wide>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); if (valid) submit(); }}>
    <div class="grid two-cols">
      {#if !initial}<div class="field"><label for="mf-id">{t('stx.id')}</label><input id="mf-id" class="input mono" bind:value={id} required placeholder="shop-api" /><span class="hint">{t('stx.idHint')}</span></div>{/if}
      {#if !initial}<div class="field"><label for="mf-kind">{t('stx.kind')}</label><select id="mf-kind" class="select" bind:value={kind}>{#each ['http', 'tcp', 'tls', 'heartbeat'] as k (k)}<option value={k}>{t(`stx.k.${k}`)}</option>{/each}</select><span class="hint">{t('stx.kindHint')}</span></div>{/if}
      <div class="field"><label for="mf-name">{t('stx.name')}</label><input id="mf-name" class="input" bind:value={name} maxlength="100" placeholder={initial?.name ?? t('stx.namePlaceholder')} /><span class="hint">{t('stx.nameHint')}</span></div>
    </div>
    {#if !heartbeat}
      <div class="field"><label for="mf-url">{kind === 'http' ? t('stx.url') : t('stx.targetHost')}</label><input id="mf-url" class="input mono" bind:value={url} maxlength="2000" disabled={seeded} aria-invalid={!seeded && url && !urlOk ? 'true' : undefined} />{#if seeded}<span class="hint">{t('stx.urlSeeded')}</span>{:else if kind !== 'http'}<span class="hint">{t('stx.targetHostHint')}</span>{/if}</div>
    {/if}
    <div class="field"><label for="mf-desc">{t('stx.description')}</label><input id="mf-desc" class="input" bind:value={description} maxlength="500" /></div>
    <div class="grid three-cols">
      {#if kind === 'http'}<div class="field"><label for="mf-method">{t('stx.method')}</label><select id="mf-method" class="select" bind:value={method}><option value="GET">GET</option><option value="HEAD">HEAD</option></select></div>{/if}
      <div class="field"><label for="mf-int">{heartbeat ? t('stx.heartbeatInterval') : t('stx.interval')}</label><input id="mf-int" class="input" type="number" min="10" max="86400" bind:value={intervalSec} /></div>
      {#if heartbeat}
        <div class="field"><label for="mf-grace">{t('stx.graceSec')}</label><input id="mf-grace" class="input" type="number" min="0" max="86400" bind:value={graceSec} /><span class="hint">{t('stx.graceHint')}</span></div>
      {:else}
        <div class="field"><label for="mf-to">{t('stx.timeout')}</label><input id="mf-to" class="input" type="number" min="500" max="60000" step="100" bind:value={timeoutMs} aria-invalid={timeoutMs > intervalSec * 1000 ? 'true' : undefined} /></div>
      {/if}
      {#if kind === 'http'}<div class="field"><label for="mf-exp">{t('stx.expect')}</label><input id="mf-exp" class="input mono" bind:value={expect} aria-invalid={!statusesOk ? 'true' : undefined} /><span class="hint">{t('stx.expectHint')}</span></div>{/if}
      {#if kind === 'tls'}<div class="field"><label for="mf-warn">{t('stx.warnDays')}</label><input id="mf-warn" class="input" type="number" min="1" max="365" bind:value={warnDays} /></div>{/if}
      <div class="field"><label for="mf-th">{t('stx.threshold')}</label><input id="mf-th" class="input" type="number" min="1" max="20" bind:value={failThreshold} /><span class="hint">{t('stx.thresholdHint')}</span></div>
    </div>
    {#if kind === 'http'}
      <div class="field"><label for="mf-text">{t('stx.expectText')}</label><input id="mf-text" class="input" bind:value={expectText} maxlength="200" aria-invalid={!textOk ? 'true' : undefined} /><span class="hint">{t('stx.expectTextHint')}</span></div>
    {/if}
    <label class="checkbox small"><input type="checkbox" bind:checked={isPublic} /> {t('stx.publicHint')}</label>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{initial ? t('common.save') : t('stx.create')}</button>
  {/snippet}
</Dialog>

<style>
  .two-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .three-cols { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
</style>
