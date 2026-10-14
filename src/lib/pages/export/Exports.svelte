<script>
  /** Export service home: queue and 24 h counters, the job list, and New export. */
  import { untrack } from 'svelte';
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import ExportForm from './ExportForm.svelte';
  import { poller } from '#lib/client/poller.svelte.js';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { page as route } from '$app/state';
  import { Navigation } from '#lib/client/navigation.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { services } from '#lib/client/services.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const service = $derived(poller.for(sid));
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-export`);
  let status = $state(route.url.searchParams.get('status') ?? '');
  let source = $state(route.url.searchParams.get('source') ?? '');
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let more = $state(false);
  const qs = (/** @type {string|null} */ c) => { const p = new URLSearchParams({ limit: '50' }); if (status) p.set('status', status); if (source) p.set('source', source); if (c) p.set('cursor', c); return p.toString(); };
  const list = new Resource(async () => {
    const r = /** @type {{ items: any[], nextCursor: string|null }} */ (await api.get(`${base}/exports?${qs(null)}`));
    items = r.items; cursor = r.nextCursor; return r;
  });
  const stats = new Resource(() => api.get(`${base}/stats`));
  const sources = new Resource(() => api.get(`${base}/sources`));
  $effect(() => service.subscribe(() => Promise.all([list.load(), stats.load()])));
  // React to the two filters only; the URL update and the load must not become dependencies.
  $effect(() => { const q = { status, source }; untrack(() => { Navigation.replaceQuery(route.url, q); list.load(); }); });
  $effect(() => { stats.load(); sources.load(); });
  const refreshNow = () => service.trigger();
  async function loadMore() {
    more = true;
    try { const r = /** @type {{ items: any[], nextCursor: string|null }} */ (await api.get(`${base}/exports?${qs(cursor)}`)); items = [...items, ...r.items]; cursor = r.nextCursor; }
    catch (e) { toasts.error(e); } finally { more = false; }
  }
  const st = $derived(/** @type {any} */ (stats.data));
  const srcList = $derived(/** @type {any[]} */ (/** @type {any} */ (sources.data)?.items ?? []));
  const labelOf = (/** @type {string} */ id) => srcList.find((s) => s.id === id)?.label ?? id;
  const svc = $derived(services.get(sid));
  let createOpen = $state(false);
  let creating = $state(false);
  /** @param {Record<string, unknown>} body */
  async function create(body) {
    creating = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/exports`, body)); toasts.ok(t('ex.created')); createOpen = false; goto(`/atc-export/${sid}/exports/${r.export.id}`); }
    catch (e) { toasts.error(e); } finally { creating = false; }
  }
  const STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'];
</script>

<Page title={svc?.label ?? t('ex.title')} desc={t('ex.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    {#if session.isAdmin}<button class="btn primary" onclick={() => { createOpen = true; }} aria-label={t('ex.create')} title={t('ex.create')}><Icon name="plus" size={16} /><span class="hide-m"> {t('ex.create')}</span></button>{/if}
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-export" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('ex.queued')} value={fmt.int(st?.queued)} />
    <Stat label={t('ex.running')} value={fmt.int(st?.running)} tone={st?.running ? 'warn' : ''} />
    <Stat label={t('ex.succeeded24h')} value={fmt.int(st?.last24h?.succeeded)} sub={st ? `${fmt.int(st.last24h.rows)} ${t('ex.rows').toLowerCase()}` : undefined} />
    <Stat label={t('ex.failed24h')} value={fmt.int(st?.last24h?.failed)} tone={st?.last24h?.failed ? 'danger' : ''} />
    <Stat label={t('ex.bytes24h')} value={st ? fmt.bytes(st.last24h.bytes) : undefined} sub={st ? `${t('ex.stored')}: ${fmt.bytes(st.storedBytes)}` : undefined} />
  </div>

  <Panel title={t('ex.exports')} flush>
    {#snippet aside()}
      <select class="select auto" bind:value={status} aria-label={t('ex.status')}><option value="">{t('ex.allStatuses')}</option>{#each STATUSES as s (s)}<option value={s}>{t(`ex.status.${s}`)}</option>{/each}</select>
      <select class="select auto" bind:value={source} aria-label={t('ex.source')}><option value="">{t('ex.allSources')}</option>{#each srcList as s (s.id)}<option value={s.id}>{s.label}</option>{/each}</select>
    {/snippet}
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if list.loading && !items.length}<Skeleton rows={6} />
    {:else if !items.length}<Empty icon="download" title={t('ex.emptyTitle')} desc={t('ex.emptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('ex.source')}</th><th>{t('ex.status')}</th><th>{t('ex.progress')}</th><th class="hide-m">{t('ex.format')}</th><th class="hide-m">{t('ex.created')}</th><th class="hide-m">{t('ex.finished')}</th></tr></thead>
        <tbody>
          {#each items as x (x.id)}
            <tr class="clickable" onclick={() => goto(`/atc-export/${sid}/exports/${x.id}`)}>
              <td>{labelOf(x.source)}<div class="xs faint mono">{x.id.slice(-12)}</div></td>
              <td><span class="row wrap tight"><StatusBadge status={x.status} label={t(`ex.status.${x.status}`)} />{#if x.cancelRequested}<span class="xs faint">{t('ex.cancelRequested')}</span>{/if}</span></td>
              <td class="small nowrap">{fmt.int(x.progress.rows)} {t('ex.rows').toLowerCase()} · {fmt.bytes(x.progress.bytes)}</td>
              <td class="hide-m"><span class="badge plain">{x.format}</span></td>
              <td class="hide-m small"><Time value={x.createdAt} /></td>
              <td class="hide-m small">{#if x.finishedAt}<Time value={x.finishedAt} />{:else}–{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table></div>
      <LoadMore {cursor} busy={more} onmore={loadMore} />
    {/if}
  </Panel>
</Page>

<ExportForm open={createOpen} sources={srcList} busy={creating} onsubmit={create} onclose={() => { createOpen = false; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 20px; }
  .select.auto { width: auto; }
  .tight { gap: 6px; }
</style>
