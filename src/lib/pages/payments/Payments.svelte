<script>
  /** Payments service home: provider state, totals, ledger balance, payments by status and recent webhook events. */
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
  import { services } from '#lib/client/services.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const service = $derived(poller.for(sid));
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-payments`);
  const stats = new Resource(() => api.get(`${base}/stats`));
  const events = new Resource(() => api.get(`${base}/provider-events?limit=10`));
  const st = $derived(/** @type {any} */ (stats.data));
  const evItems = $derived(/** @type {any[]} */ (/** @type {any} */ (events.data)?.items ?? []));
  const count = (/** @type {string[]} */ ks) => (st ? ks.reduce((a, k) => a + Number(st.byStatus[k] ?? 0), 0) : 0);
  const STATUSES = /** @type {const} */ (['', 'pending', 'processing', 'succeeded', 'partially_refunded', 'refunded', 'canceled']);
  /** @type {string} */ let status = $state(STATUSES.includes(/** @type {any} */ (route.url.searchParams.get('status') ?? '')) ? route.url.searchParams.get('status') ?? '' : '');
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let loading = $state(false);
  let more = $state(false);
  /** @type {unknown} */ let listError = $state(null);
  /** @param {string|null} c */
  async function loadPayments(c = null) {
    if (c) more = true; else loading = true;
    try {
      const q = new URLSearchParams({ limit: '50', ...(status ? { status } : {}), ...(c ? { cursor: c } : {}) });
      const r = /** @type {any} */ (await api.get(`${base}/payments?${q}`));
      items = c ? [...items, ...r.items] : r.items; cursor = r.nextCursor; listError = null;
    } catch (e) { listError = e; } finally { loading = false; more = false; }
  }
  $effect(() => service.subscribe(() => { stats.load(); events.load(); loadPayments(null); }));
  $effect(() => { stats.load(); events.load(); });
  $effect(() => { const s = status; untrack(() => { Navigation.replaceQuery(route.url, { status: s || null }); loadPayments(null); }); });
  const refreshNow = () => service.trigger();
  const svc = $derived(services.get(sid));
  const volume = $derived(st ? st.volume24h.map((/** @type {any} */ v) => fmt.money(v.amount, v.currency)).join(' · ') : '');
</script>

<Page title={svc?.label ?? t('pm.title')} desc={t('pm.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-payments" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('pm.provider')} value={st ? (st.provider === 'stripe' ? 'Stripe' : t('pm.disabled')) : undefined} tone={st && st.provider !== 'stripe' ? 'warn' : ''} sub={st ? `${t('pm.webhooks')}: ${st.webhooks === 'enabled' ? t('pm.on') : t('pm.off')}` : undefined} />
    <Stat label={t('pm.paid')} value={st ? fmt.int(count(['succeeded', 'partially_refunded', 'refunded'])) : undefined} sub={volume ? `24 h: ${volume}` : undefined} />
    <Stat label={t('pm.open')} value={st ? fmt.int(count(['pending', 'processing'])) : undefined} />
    <Stat label={t('pm.outbox')} value={st ? fmt.int(st.outbox.pending) : undefined} tone={st?.outbox.dead ? 'danger' : ''} sub={st?.outbox.dead ? t('pm.outboxDead', { n: st.outbox.dead }) : st ? (st.webhookOut === 'enabled' ? t('pm.outboxOn') : t('pm.outboxOff')) : undefined} />
  </div>

  <div class="stack">
    <Panel title={t('pm.payments')} flush>
      {#snippet aside()}
        <div class="seg">{#each STATUSES as s (s)}<button aria-pressed={status === s} onclick={() => { status = s; }}>{s ? t(`pm.s.${s}`) : t('pm.all')}</button>{/each}</div>
      {/snippet}
      {#if listError}<ErrorBox error={listError} onretry={() => loadPayments(null)} />
      {:else if loading && !items.length}<Skeleton rows={5} />
      {:else if !items.length}<Empty icon="card" title={t('pm.empty')} desc={st && st.provider !== 'stripe' ? t('pm.emptyDisabled') : undefined} />
      {:else}
        <div class="table-wrap"><table class="table">
          <thead><tr><th>{t('pm.payment')}</th><th>{t('pm.amount')}</th><th>{t('pm.status')}</th><th class="hide-m">{t('pm.customer')}</th><th>{t('pm.created')}</th></tr></thead>
          <tbody>
            {#each items as p (p.id)}
              <tr class="clickable" onclick={() => goto(`/atc-payments/${sid}/payments/${p.id}`)}>
                <td>{p.description || '–'}<div class="xs faint mono">{p.id}</div></td>
                <td class="nowrap">{fmt.money(p.amount, p.currency)}{#if p.amountRefunded}<div class="xs faint">{t('pm.refundedShort', { amount: fmt.money(p.amountRefunded, p.currency) })}</div>{/if}</td>
                <td><StatusBadge status={p.status} label={t(`pm.s.${p.status}`)} /></td>
                <td class="hide-m small">{p.customerEmail ?? '–'}</td>
                <td class="small nowrap"><Time value={p.createdAt} /></td>
              </tr>
            {/each}
          </tbody>
        </table></div>
        <LoadMore {cursor} busy={more} onmore={() => loadPayments(cursor)} />
      {/if}
    </Panel>

    <div class="grid two-cols">
      <Panel title={t('pm.balance')} flush>
        {#if !st}<Skeleton rows={2} />
        {:else if !st.balance.length}<Empty icon="card" title={t('pm.noLedger')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('pm.currency')}</th><th>{t('pm.charged')}</th><th>{t('pm.refunded')}</th><th>{t('pm.net')}</th></tr></thead>
            <tbody>{#each st.balance as b (b.currency)}<tr><td class="mono small">{b.currency.toUpperCase()}</td><td class="small nowrap">{fmt.money(b.charged, b.currency)}</td><td class="small nowrap">{fmt.money(b.refunded, b.currency)}</td><td class="nowrap">{fmt.money(b.net, b.currency)}</td></tr>{/each}</tbody>
          </table></div>
        {/if}
      </Panel>
      <Panel title={t('pm.events')} flush>
        {#if events.error}<ErrorBox error={events.error} onretry={() => events.load()} />
        {:else if !evItems.length}<Empty icon="webhook" title={t('pm.noEvents')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('pm.eventType')}</th><th>{t('pm.outcome')}</th><th>{t('pm.received')}</th></tr></thead>
            <tbody>{#each evItems as e (e.id)}<tr><td class="mono small">{e.type}{#if e.detail}<div class="xs faint truncate detail" title={e.detail}>{e.detail}</div>{/if}</td><td><StatusBadge status={e.outcome} label={t(`pm.o.${e.outcome}`)} /></td><td class="small nowrap"><Time value={e.receivedAt} /></td></tr>{/each}</tbody>
          </table></div>
        {/if}
      </Panel>
    </div>
  </div>
</Page>

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); margin-bottom: 20px; }
  .two-cols { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  .detail { display: block; max-width: 220px; }
</style>
