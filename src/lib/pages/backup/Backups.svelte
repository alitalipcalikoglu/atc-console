<script>
  /** Backup service home: totals, sources with their newest backup and "back up now", and the backup history. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import { untrack } from 'svelte';
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
  const base = $derived(`/services/${sid}/atc-backup`);
  const stats = new Resource(() => api.get(`${base}/stats`));
  const sources = new Resource(() => api.get(`${base}/sources`));
  const st = $derived(/** @type {any} */ (stats.data));
  const srcItems = $derived(/** @type {any[]} */ (/** @type {any} */ (sources.data)?.items ?? []));
  const STATUSES = /** @type {const} */ (['', 'ok', 'failed']);
  /** @type {''|'ok'|'failed'} */ let status = $state(/** @type {any} */ (STATUSES.includes(/** @type {any} */ (route.url.searchParams.get('status') ?? '')) ? route.url.searchParams.get('status') ?? '' : ''));
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let loading = $state(false);
  let more = $state(false);
  /** @type {unknown} */ let listError = $state(null);
  /** @param {string|null} c */
  async function loadBackups(c = null) {
    if (c) more = true; else loading = true;
    try {
      const q = new URLSearchParams({ limit: '50', ...(status ? { status } : {}), ...(c ? { cursor: c } : {}) });
      const r = /** @type {any} */ (await api.get(`${base}/backups?${q}`));
      items = c ? [...items, ...r.items] : r.items; cursor = r.nextCursor; listError = null;
    } catch (e) { listError = e; } finally { loading = false; more = false; }
  }
  const reloadAll = () => Promise.all([stats.load(), sources.load(), loadBackups(null)]);
  $effect(() => service.subscribe(() => reloadAll()));
  $effect(() => { stats.load(); sources.load(); });
  $effect(() => { const s = status; untrack(() => { Navigation.replaceQuery(route.url, { status: s || null }); loadBackups(null); }); });
  const refreshNow = () => service.trigger();
  const svc = $derived(services.get(sid));
  /** @type {string|null} */ let running = $state(null);
  /** @param {string} id */
  async function backupNow(id) {
    running = id;
    try {
      const r = /** @type {any} */ (await api.post(`${base}/sources/${encodeURIComponent(id)}/backups`, {}));
      if (r.backup.status === 'ok') toasts.ok(t('bk.done', { source: id, size: fmt.bytes(r.backup.size) }));
      else toasts.error(new Error(t('bk.failedRun', { source: id, error: r.backup.error ?? '' })));
      await reloadAll();
    } catch (e) { toasts.error(e); } finally { running = null; }
  }
</script>

<Page title={svc?.label ?? t('bk.title')} desc={t('bk.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-backup" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('bk.sources')} value={st ? fmt.int(st.sources) : undefined} sub={st ? (st.intervalMin ? t('bk.every', { n: st.intervalMin }) : t('bk.manualOnly')) : undefined} />
    <Stat label={t('bk.kept')} value={st ? fmt.int(st.backups) : undefined} sub={st ? t('bk.retention', { n: st.retentionCount, days: st.retentionDays }) : undefined} />
    <Stat label={t('bk.stored')} value={st ? fmt.bytes(st.bytes) : undefined} sub={st ? (st.media ? t('bk.mediaOn') : t('bk.mediaOff')) : undefined} />
    <Stat label={t('bk.failing')} value={st ? fmt.int(st.failing.length) : undefined} tone={st?.failing.length ? 'danger' : ''} />
    <Stat label={t('bk.stale')} value={st ? fmt.int(st.stale.length) : undefined} tone={st?.stale.length ? 'warn' : ''} />
  </div>

  <div class="stack">
    <Panel title={t('bk.sources')} flush>
      {#if sources.error}<ErrorBox error={sources.error} onretry={() => sources.load()} />
      {:else if sources.loading && !srcItems.length}<Skeleton rows={4} />
      {:else if !srcItems.length}<Empty icon="database" title={t('bk.noSources')} desc={t('bk.noSourcesDesc')} />
      {:else}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('bk.source')}</th><th>{t('bk.last')}</th><th class="hide-m">{t('bk.size')}</th><th class="hide-m">{t('bk.kept')}</th><th class="hide-m">{t('bk.nextDue')}</th>{#if session.isAdmin}<th></th>{/if}</tr></thead>
          <tbody>
            {#each srcItems as s (s.id)}
              <tr>
                <td><code>{s.id}</code><div class="xs faint mono">{s.file}{#if !s.exists}{` · ${t('bk.missing')}`}{/if}</div></td>
                <td>{#if s.running}<StatusBadge status="running" label={t('bk.s.running')} />{:else if s.lastBackup}<span class="row wrap tight"><StatusBadge status={s.lastBackup.status} label={t(`bk.s.${s.lastBackup.status}`)} /><span class="small"><Time value={s.lastBackup.startedAt} /></span></span>{:else}<span class="faint">–</span>{/if}</td>
                <td class="hide-m small">{fmt.bytes(s.size)}</td>
                <td class="hide-m small">{fmt.int(s.backups)} · {fmt.bytes(s.bytes)}</td>
                <td class="hide-m small">{#if s.nextDueAt}<Time value={s.nextDueAt} />{:else}–{/if}</td>
                {#if session.isAdmin}<td class="right"><button class="btn sm" onclick={() => backupNow(s.id)} disabled={running !== null || s.running || !s.exists} aria-label={t('bk.runNow')} title={t('bk.runNow')}><Icon name="play" size={14} /><span class="hide-m"> {running === s.id ? t('bk.runningNow') : t('bk.runNow')}</span></button></td>{/if}
              </tr>
            {/each}
          </tbody>
        </table></div>
      {/if}
    </Panel>

    <Panel title={t('bk.history')} flush>
      {#snippet aside()}
        <div class="seg">{#each STATUSES as s (s)}<button aria-pressed={status === s} onclick={() => { status = s; }}>{s ? t(`bk.s.${s}`) : t('bk.all')}</button>{/each}</div>
      {/snippet}
      {#if listError}<ErrorBox error={listError} onretry={() => loadBackups(null)} />
      {:else if loading && !items.length}<Skeleton rows={4} />
      {:else if !items.length}<Empty icon="database" title={t('bk.noBackups')} />
      {:else}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('bk.source')}</th><th>{t('bk.status')}</th><th class="hide-m">{t('bk.trigger')}</th><th class="hide-m">{t('bk.size')}</th><th>{t('bk.started')}</th></tr></thead>
          <tbody>
            {#each items as b (b.id)}
              <tr class="clickable" onclick={() => goto(`/atc-backup/${sid}/backups/${b.id}`)}>
                <td><code>{b.source}</code><div class="xs faint mono">{b.id}</div></td>
                <td><StatusBadge status={b.status} label={t(`bk.s.${b.status}`)} />{#if b.status === 'failed'}<div class="xs faint truncate err">{b.error}</div>{/if}</td>
                <td class="hide-m small">{t(`bk.t.${b.trigger}`)}</td>
                <td class="hide-m small">{fmt.bytes(b.size)}</td>
                <td class="small nowrap"><Time value={b.startedAt} /></td>
              </tr>
            {/each}
          </tbody>
        </table></div>
        <LoadMore {cursor} busy={more} onmore={() => loadBackups(cursor)} />
      {/if}
    </Panel>
  </div>
</Page>

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 20px; }
  .tight { gap: 6px; }
  .right { text-align: right; }
  .err { display: block; max-width: 240px; }
</style>
