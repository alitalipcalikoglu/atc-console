<script>
  /** One queue: depth, settings, messages by state, dead letters with redrive, send, purge, delete. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import QueueForm from './QueueForm.svelte';
  import { untrack } from 'svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { page as route } from '$app/state';
  import { Navigation } from '#lib/client/navigation.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-queue/queues/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const d = $derived(/** @type {any} */ (res.data));
  const q = $derived(d?.queue);
  const STATES = /** @type {const} */ (['ready', 'delayed', 'leased', 'dead']);
  /** @type {'ready'|'delayed'|'leased'|'dead'} */ let state = $state(/** @type {any} */ (STATES.includes(/** @type {any} */ (route.url.searchParams.get('state'))) ? route.url.searchParams.get('state') : 'ready'));
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let loading = $state(false);
  let more = $state(false);
  /** @type {unknown} */ let listError = $state(null);
  /** @param {string|null} c */
  async function loadMessages(c = null) {
    if (c) more = true; else loading = true;
    try { const r = /** @type {any} */ (await api.get(`${base}/messages?state=${state}&limit=50${c ? `&cursor=${c}` : ''}`)); items = c ? [...items, ...r.items] : r.items; cursor = r.nextCursor; listError = null; }
    catch (e) { listError = e; } finally { loading = false; more = false; }
  }
  $effect(() => { res.load(); });
  $effect(() => { const s = state; untrack(() => { Navigation.replaceQuery(route.url, { state: s }); loadMessages(null); }); });
  const reloadAll = () => Promise.all([res.load(), loadMessages(null)]);

  /** @type {any} */ let shown = $state(null);
  /** @type {'redrive'|'redriveAll'|'deleteMessage'|'purge'|'delete'|null} */ let confirm = $state(null);
  /** @type {'ready'|'dead'|'all'} */ let purgeWhat = $state('ready');
  /** @type {any} */ let target = $state(null);
  let busy = $state(false);
  /** @param {() => Promise<unknown>} fn */
  async function run(fn) {
    busy = true;
    try { await fn(); confirm = null; target = null; shown = null; await reloadAll(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  const redrive = (/** @type {object} */ body) => run(async () => { const r = /** @type {any} */ (await api.post(`${base}/redrive`, body)); toasts.ok(t('qu.redriven', { n: r.redriven })); });
  const purge = () => run(async () => { const r = /** @type {any} */ (await api.post(`${base}/purge`, { state: purgeWhat })); toasts.ok(t('qu.purged', { n: r.removed })); });
  const deleteMessage = () => run(async () => { await api.delete(`${base}/messages/${target.id}`); toasts.ok(t('qu.messageDeleted')); });
  async function deleteQueue() {
    busy = true;
    try { await api.delete(`${base}?force=true`); toasts.ok(t('qu.deleted')); goto(`/atc-queue/${sid}`); } catch (e) { toasts.error(e); } finally { busy = false; confirm = null; }
  }
  let editOpen = $state(false);
  /** @param {string} _name @param {Record<string, unknown>} body */
  async function save(_name, body) {
    busy = true;
    try { await api.put(base, body); toasts.ok(t('qu.updated')); editOpen = false; await res.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @param {boolean} paused */
  const setPaused = (paused) => run(async () => { await api.put(base, { paused }); toasts.ok(t(paused ? 'qu.pausedOk' : 'qu.resumedOk')); });

  // ---- send a message
  let sendOpen = $state(false);
  let sendBody = $state('{\n  "hello": "world"\n}');
  let sendDelay = $state(0);
  let sendPriority = $state(0);
  let sendKey = $state('');
  const parsed = $derived.by(() => { try { return { value: JSON.parse(sendBody), error: null }; } catch (e) { return { value: undefined, error: e instanceof Error ? e.message : String(e) }; } });
  async function send() {
    busy = true;
    try {
      const r = /** @type {any} */ (await api.post(`${base}/messages`, { body: parsed.value, ...(Number(sendDelay) ? { delaySec: Number(sendDelay) } : {}), ...(Number(sendPriority) ? { priority: Number(sendPriority) } : {}), ...(sendKey.trim() ? { dedupeKey: sendKey.trim() } : {}) }));
      if (r.deduplicated) toasts.info(t('qu.deduplicated')); else toasts.ok(t('qu.sent'));
      sendOpen = false;
      await reloadAll();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  const purgeLabel = $derived(t(`qu.purgeWhat.${purgeWhat}`));
</script>

<Page title={q ? q.name : t('qu.queue')} back="/atc-queue/{sid}">
  {#snippet actions()}
    {#if q && session.isAdmin}
      <button class="btn primary" onclick={() => { sendOpen = true; }} disabled={busy}><Icon name="plus" size={16} /><span class="hide-m"> {t('qu.send')}</span></button>
      {#if d.depth.dead}<button class="btn" onclick={() => { confirm = 'redriveAll'; }} disabled={busy}><Icon name="history" size={16} /><span class="hide-m"> {t('qu.redriveAll')}</span></button>{/if}
      <RowMenu label={t('common.actions')} items={[
        { label: t('qu.edit'), icon: 'settings', run: () => { editOpen = true; } },
        q.paused ? { label: t('qu.resume'), icon: 'play', run: () => setPaused(false) } : { label: t('qu.pause'), icon: 'pause', run: () => setPaused(true) },
        { label: t('qu.purgeReady'), icon: 'x', danger: true, run: () => { purgeWhat = 'ready'; confirm = 'purge'; } },
        { label: t('qu.purgeDead'), icon: 'x', danger: true, run: () => { purgeWhat = 'dead'; confirm = 'purge'; } },
        { label: t('qu.purgeAll'), icon: 'x', danger: true, run: () => { purgeWhat = 'all'; confirm = 'purge'; } },
        { label: t('qu.delete'), icon: 'trash', danger: true, run: () => { confirm = 'delete'; } },
      ]} />
    {/if}
    <button class="btn icon" onclick={reloadAll} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !q}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="grid stat-row">
        <Stat label={t('qu.ready')} value={fmt.int(d.depth.ready)} sub={d.oldestReadySec === null ? undefined : `${t('qu.oldest')}: ${fmt.duration(d.oldestReadySec)}`} />
        <Stat label={t('qu.delayed')} value={fmt.int(d.depth.delayed)} />
        <Stat label={t('qu.leased')} value={fmt.int(d.depth.leased)} />
        <Stat label={t('qu.dead')} value={fmt.int(d.depth.dead)} tone={d.depth.dead ? 'danger' : ''} />
      </div>
      <Panel title={t('qu.settings')}>
        {#snippet aside()}<StatusBadge status={q.paused ? 'paused' : 'running'} label={q.paused ? t('qu.paused') : t('qu.running')} />{/snippet}
        {#if q.description}<p class="no-margin desc-line">{q.description}</p>{/if}
        <dl class="kv">
          <dt>{t('qu.visibility')}</dt><dd>{q.visibilitySec}</dd>
          <dt>{t('qu.maxAttempts')}</dt><dd>{q.maxAttempts}</dd>
          <dt>{t('qu.backoffBase')} / {t('qu.backoffMax')}</dt><dd>{q.backoffBaseSec} / {q.backoffMaxSec}</dd>
          {#each Object.entries(d.counters) as [k, v] (k)}<dt>{t(`qu.c.${k}`)}</dt><dd>{fmt.int(/** @type {number} */ (v))}</dd>{/each}
        </dl>
      </Panel>

      <Panel title={t('qu.messages')} flush>
        {#snippet aside()}
          <div class="seg">{#each STATES as s (s)}<button aria-pressed={state === s} onclick={() => { state = s; }}>{t(`qu.${s}`)}</button>{/each}</div>
        {/snippet}
        {#if listError}<ErrorBox error={listError} onretry={() => loadMessages(null)} />
        {:else if loading && !items.length}<Skeleton rows={4} />
        {:else if !items.length}<Empty icon="inbox" title={t('qu.noMessages')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('qu.body')}</th><th>{t('qu.attempts')}</th><th class="hide-m">{state === 'dead' ? t('qu.lastError') : t('qu.available')}</th><th class="hide-m">{t('qu.enqueued')}</th>{#if session.isAdmin}<th></th>{/if}</tr></thead>
            <tbody>
              {#each items as m (m.id)}
                <tr class="clickable" onclick={() => { shown = m; }}>
                  <td><code class="truncate body">{JSON.stringify(m.body)}</code><div class="xs faint mono">{m.id}</div></td>
                  <td>{m.attempts}{#if m.priority} <span class="xs faint">· p{m.priority}</span>{/if}</td>
                  <td class="hide-m small">{#if state === 'dead'}<span class="truncate err">{m.lastError ?? '–'}</span>{:else}<Time value={m.availableAt} />{/if}</td>
                  <td class="hide-m small"><Time value={m.enqueuedAt} /></td>
                  {#if session.isAdmin}<td class="right"><span role="presentation" onclick={(e) => e.stopPropagation()}>{#if m.state !== 'leased'}<RowMenu label={t('common.actions')} items={[
                    ...(m.state === 'dead' ? [{ label: t('qu.redrive'), icon: 'history', run: () => { target = m; confirm = 'redrive'; } }] : []),
                    { label: t('qu.deleteMessage'), icon: 'trash', danger: true, run: () => { target = m; confirm = 'deleteMessage'; } },
                  ]} />{/if}</span></td>{/if}
                </tr>
              {/each}
            </tbody>
          </table></div>
          <LoadMore {cursor} busy={more} onmore={() => loadMessages(cursor)} />
        {/if}
      </Panel>
    </div>
  {/if}
</Page>

<Dialog open={shown !== null} title={shown?.id ?? ''} onclose={() => { shown = null; }} wide>
  {#if shown}
    <div class="stack">
      <div class="row wrap tight"><StatusBadge status={shown.state} label={t(`qu.${shown.state}`)} /><span class="small">{t('qu.attempts')}: {shown.attempts}</span>{#if shown.dedupeKey}<span class="small">{t('qu.dedupe')}: <code>{shown.dedupeKey}</code></span>{/if}</div>
      <pre class="result">{JSON.stringify(shown.body, null, 2)}</pre>
      <dl class="kv">
        <dt>{t('qu.enqueuedBy')}</dt><dd class="mono small">{shown.enqueuedBy}</dd>
        <dt>{t('qu.enqueued')}</dt><dd><Time value={shown.enqueuedAt} mode="absolute" /></dd>
        <dt>{t('qu.available')}</dt><dd><Time value={shown.availableAt} mode="absolute" /></dd>
        {#if shown.leaseUntil}<dt>{t('qu.leaseUntil')}</dt><dd><Time value={shown.leaseUntil} mode="absolute" /></dd>{/if}
        {#if shown.lastError}<dt>{t('qu.lastError')}</dt><dd class="small">{shown.lastError}</dd>{/if}
      </dl>
    </div>
  {/if}
  {#snippet footer()}<button class="btn" onclick={() => { shown = null; }}>{t('common.close')}</button>{/snippet}
</Dialog>

<Dialog open={sendOpen} title={t('qu.send')} onclose={() => { sendOpen = false; }} wide>
  <div class="stack">
    <p class="small muted no-margin">{t('qu.sendHint')}</p>
    <div class="field"><label for="qs-body">{t('qu.body')}</label><textarea id="qs-body" class="textarea mono" rows="8" bind:value={sendBody} aria-invalid={parsed.error ? 'true' : undefined}></textarea>{#if parsed.error}<span class="error">{t('qu.invalidJson', { msg: parsed.error })}</span>{/if}</div>
    <div class="grid three-cols">
      <div class="field"><label for="qs-delay">{t('qu.delay')}</label><input id="qs-delay" class="input" type="number" min="0" bind:value={sendDelay} /></div>
      <div class="field"><label for="qs-prio">{t('qu.priority')}</label><input id="qs-prio" class="input" type="number" min="-100" max="100" bind:value={sendPriority} /></div>
      <div class="field"><label for="qs-key">{t('qu.dedupe')}</label><input id="qs-key" class="input mono" bind:value={sendKey} maxlength="200" /></div>
    </div>
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => { sendOpen = false; }} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={send} disabled={busy || parsed.error !== null}>{t('qu.send')}</button>
  {/snippet}
</Dialog>

<QueueForm open={editOpen} initial={q} {busy} onsubmit={save} onclose={() => { editOpen = false; }} />
<Confirm open={confirm === 'redrive'} title={t('qu.redrive')} message={t('qu.redriveDesc')} confirmLabel={t('qu.redrive')} {busy} onconfirm={() => redrive({ ids: [target.id] })} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'redriveAll'} title={t('qu.redriveAll')} message={t('qu.redriveAllDesc', { name: q?.name ?? '' })} confirmLabel={t('qu.redrive')} {busy} onconfirm={() => redrive({ all: true })} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'deleteMessage'} title={t('qu.deleteMessage')} message={t('qu.deleteMessageDesc')} danger confirmLabel={t('common.delete')} {busy} onconfirm={deleteMessage} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'purge'} title={t('qu.purge')} message={t('qu.purgeDesc', { name: q?.name ?? '', what: purgeLabel })} danger typeWord={q?.name} confirmLabel={t('qu.purge')} {busy} onconfirm={purge} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'delete'} title={t('qu.delete')} message={t('qu.deleteDesc')} danger typeWord={q?.name} confirmLabel={t('common.delete')} {busy} onconfirm={deleteQueue} oncancel={() => { confirm = null; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .tight { gap: 6px; }
  .no-margin { margin: 0; }
  .desc-line { margin-bottom: 10px; }
  .body { display: block; max-width: 360px; }
  .err { display: block; max-width: 220px; }
  .right { text-align: right; }
  .three-cols { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
</style>
