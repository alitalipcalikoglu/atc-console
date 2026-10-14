<script>
  /** Status service home: monitors by state, open incidents and the monitor list with uptime and latency. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import MonitorForm from './MonitorForm.svelte';
  import PingToken from './PingToken.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import { poller } from '#lib/client/poller.svelte.js';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
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
  const base = $derived(`/services/${sid}/atc-status`);
  const list = new Resource(() => api.get(`${base}/monitors`));
  const open = new Resource(() => api.get(`${base}/incidents?state=open&limit=50`));
  const alertsRes = new Resource(() => api.get(`${base}/alerts?state=open&limit=50`));
  $effect(() => service.subscribe(() => { list.load(); open.load(); alertsRes.load(); }));
  $effect(() => { list.load(); open.load(); alertsRes.load(); });
  const alerts = $derived(/** @type {any[]} */ (/** @type {any} */ (alertsRes.data)?.items ?? []));
  const refreshNow = () => service.trigger();
  const items = $derived(/** @type {any[]} */ (/** @type {any} */ (list.data)?.items ?? []));
  const incidents = $derived(/** @type {any[]} */ (/** @type {any} */ (open.data)?.items ?? []));
  const count = (/** @type {string} */ s) => items.filter((m) => m.state === s).length;
  const names = $derived(new Map(items.map((m) => [m.id, m.name])));
  const svc = $derived(services.get(sid));
  /** @param {number|null} v */
  const pct = (v) => (v === null ? '–' : `${v.toFixed(v === 100 ? 0 : 2)}%`);
  /** @type {string|null} */ let pingPath = $state(null);
  /** @type {string|null} */ let afterPing = $state(null);
  /** @type {any|null} */ let ackTarget = $state(null);
  let acking = $state(false);
  async function ack() {
    if (!ackTarget) return;
    acking = true;
    try { await api.post(`${base}/alerts/${encodeURIComponent(ackTarget.id)}/ack`, {}); toasts.ok(t('stx.alertAcked')); ackTarget = null; await alertsRes.load(); }
    catch (e) { toasts.error(e); } finally { acking = false; }
  }
  let createOpen = $state(false);
  let creating = $state(false);
  /** @param {string} id @param {Record<string, unknown>} body */
  async function create(id, body) {
    creating = true;
    try {
      const r = /** @type {any} */ (await api.put(`${base}/monitors/${encodeURIComponent(id)}`, body));
      toasts.ok(t('stx.created', { id })); createOpen = false;
      if (r.pingPath) { pingPath = r.pingPath; afterPing = `/atc-status/${sid}/monitors/${id}`; } else goto(`/atc-status/${sid}/monitors/${id}`);
    }
    catch (e) { toasts.error(e); } finally { creating = false; }
  }
</script>

<Page title={svc?.label ?? t('stx.title')} desc={t('stx.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    {#if session.isAdmin}<button class="btn primary" onclick={() => { createOpen = true; }} aria-label={t('stx.create')} title={t('stx.create')}><Icon name="plus" size={16} /><span class="hide-m"> {t('stx.create')}</span></button>{/if}
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-status" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('stx.monitors')} value={list.data ? fmt.int(items.length) : undefined} sub={list.data ? `${t('stx.s.paused')}: ${fmt.int(count('paused'))}` : undefined} />
    <Stat label={t('stx.s.up')} value={list.data ? fmt.int(count('up')) : undefined} />
    <Stat label={t('stx.s.degraded')} value={list.data ? fmt.int(count('degraded')) : undefined} tone={count('degraded') ? 'warn' : ''} />
    <Stat label={t('stx.s.down')} value={list.data ? fmt.int(count('down')) : undefined} tone={count('down') ? 'danger' : ''} />
    <Stat label={t('stx.openIncidents')} value={open.data ? fmt.int(incidents.length) : undefined} tone={incidents.length ? 'danger' : ''} />
    <Stat label={t('stx.statOpenAlerts')} value={alertsRes.data ? fmt.int(alerts.length) : undefined} tone={alerts.some((a) => a.severity === 'critical') ? 'danger' : alerts.length ? 'warn' : ''} />
  </div>

  <div class="stack">
    {#if alerts.length}
      <Panel title={t('stx.openAlerts')} flush>
        <p class="small muted panel-note">{t('stx.alertsDesc')}</p>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('stx.alertSeverity')}</th><th>{t('stx.alertWhat')}</th><th class="hide-m">{t('stx.alertLast')}</th>{#if session.isAdmin}<th class="actions"></th>{/if}</tr></thead>
          <tbody>
            {#each alerts as a (a.id)}
              <tr>
                <td><StatusBadge status={a.severity} label={t(`stx.sev.${a.severity}`)} /></td>
                <td><span class="truncate cause">{a.title}</span><div class="xs faint mono truncate cause" title={a.message}>{a.message}{#if a.count > 1} · {t('stx.alertTimes', { n: fmt.int(a.count) })}{/if}</div></td>
                <td class="hide-m small nowrap"><Time value={a.lastAt} /></td>
                {#if session.isAdmin}<td class="actions"><button class="btn sm" onclick={() => { ackTarget = a; }} aria-label={t('stx.alertAck')} title={t('stx.alertAck')}><Icon name="check" size={14} /><span class="hide-m"> {t('stx.alertAck')}</span></button></td>{/if}
              </tr>
            {/each}
          </tbody>
        </table></div>
      </Panel>
    {/if}
    {#if incidents.length}
      <Panel title={t('stx.openIncidents')} flush>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('stx.monitor')}</th><th>{t('stx.since')}</th><th class="hide-m">{t('stx.cause')}</th><th>{t('stx.failures')}</th></tr></thead>
          <tbody>
            {#each incidents as i (i.id)}
              <tr class="clickable" onclick={() => goto(`/atc-status/${sid}/monitors/${i.monitor}`)}>
                <td>{names.get(i.monitor) ?? i.monitor}<div class="xs faint mono">{i.monitor}</div></td>
                <td class="small nowrap"><Time value={i.openedAt} /></td>
                <td class="hide-m small"><span class="truncate cause">{i.lastError ?? i.cause}</span></td>
                <td>{fmt.int(i.failures)}</td>
              </tr>
            {/each}
          </tbody>
        </table></div>
      </Panel>
    {/if}

    <Panel title={t('stx.monitors')} flush>
      {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
      {:else if list.loading && !items.length}<Skeleton rows={6} />
      {:else if !items.length}<Empty icon="activity" title={t('stx.emptyTitle')} desc={t('stx.emptyDesc')} />
      {:else}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('stx.monitor')}</th><th>{t('stx.state')}</th><th class="hide-m">{t('stx.uptime24h')}</th><th class="hide-m">{t('stx.latency')}</th><th class="hide-m">{t('stx.lastCheck')}</th></tr></thead>
          <tbody>
            {#each items as m (m.id)}
              <tr class="clickable" onclick={() => goto(`/atc-status/${sid}/monitors/${m.id}`)}>
                <td><span class="row wrap tight">{m.name}{#if m.public}<StatusBadge status="public" label={t('stx.public')} />{/if}</span><div class="xs faint mono truncate url">{m.kind === 'heartbeat' ? t('stx.k.heartbeat') : m.kind === 'http' ? m.url : `${t(`stx.k.${m.kind}`)} · ${m.url}`}</div></td>
                <td><StatusBadge status={m.state} label={t(`stx.s.${m.state}`)} /></td>
                <td class="hide-m small">{pct(m.uptime24h)}</td>
                <td class="hide-m small">{m.lastCheck?.ok ? `${fmt.int(m.lastCheck.latencyMs)} ms` : '–'}</td>
                <td class="hide-m small nowrap">{#if m.lastCheck}<Time value={m.lastCheck.at} />{:else}–{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table></div>
      {/if}
    </Panel>
  </div>
</Page>

<PingToken path={pingPath} onclose={() => { pingPath = null; if (afterPing) { const to = afterPing; afterPing = null; goto(to); } }} />
<Confirm open={ackTarget !== null} title={t('stx.alertAckTitle')} message={t('stx.alertAckDesc')} confirmLabel={t('stx.alertAck')} busy={acking} onconfirm={ack} oncancel={() => { ackTarget = null; }} />
<MonitorForm open={createOpen} busy={creating} onsubmit={create} onclose={() => { createOpen = false; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 20px; }
  .tight { gap: 6px; }
  .url { max-width: 320px; }
  .cause { display: block; max-width: 320px; }
  .panel-note { margin: 0; padding: 10px 16px 0; }
  .actions { text-align: right; width: 1%; white-space: nowrap; }
</style>
