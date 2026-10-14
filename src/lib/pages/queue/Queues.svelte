<script>
  /** Queue service home: totals and the queue list with depth by state. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import QueueForm from './QueueForm.svelte';
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
  const base = $derived(`/services/${sid}/atc-queue`);
  const list = new Resource(() => api.get(`${base}/queues`));
  $effect(() => service.subscribe(() => list.load()));
  $effect(() => { list.load(); });
  const refreshNow = () => service.trigger();
  const items = $derived(/** @type {any[]} */ (/** @type {any} */ (list.data)?.items ?? []));
  const sum = (/** @type {'ready'|'delayed'|'leased'|'dead'} */ k) => items.reduce((a, q) => a + q[k], 0);
  const oldest = $derived(items.reduce((/** @type {number|null} */ a, q) => (q.oldestReadySec === null ? a : Math.max(a ?? 0, q.oldestReadySec)), null));
  const svc = $derived(services.get(sid));
  let createOpen = $state(false);
  let creating = $state(false);
  /** @param {string} name @param {Record<string, unknown>} body */
  async function create(name, body) {
    creating = true;
    try { await api.put(`${base}/queues/${encodeURIComponent(name)}`, body); toasts.ok(t('qu.created', { name })); createOpen = false; goto(`/atc-queue/${sid}/queues/${name}`); }
    catch (e) { toasts.error(e); } finally { creating = false; }
  }
</script>

<Page title={svc?.label ?? t('qu.title')} desc={t('qu.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    {#if session.isAdmin}<button class="btn primary" onclick={() => { createOpen = true; }} aria-label={t('qu.create')} title={t('qu.create')}><Icon name="plus" size={16} /><span class="hide-m"> {t('qu.create')}</span></button>{/if}
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-queue" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('qu.queues')} value={list.data ? fmt.int(items.length) : undefined} />
    <Stat label={t('qu.ready')} value={list.data ? fmt.int(sum('ready')) : undefined} sub={list.data ? `${t('qu.delayed')}: ${fmt.int(sum('delayed'))}` : undefined} />
    <Stat label={t('qu.leased')} value={list.data ? fmt.int(sum('leased')) : undefined} />
    <Stat label={t('qu.dead')} value={list.data ? fmt.int(sum('dead')) : undefined} tone={sum('dead') ? 'danger' : ''} />
    <Stat label={t('qu.oldest')} value={list.data ? (oldest === null ? '–' : fmt.duration(oldest)) : undefined} tone={oldest !== null && oldest > 300 ? 'warn' : ''} />
  </div>

  <Panel title={t('qu.queues')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if list.loading && !items.length}<Skeleton rows={4} />
    {:else if !items.length}<Empty icon="inbox" title={t('qu.emptyTitle')} desc={t('qu.emptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('qu.queue')}</th><th>{t('qu.ready')}</th><th class="hide-m">{t('qu.delayed')}</th><th>{t('qu.leased')}</th><th>{t('qu.dead')}</th><th class="hide-m">{t('qu.oldest')}</th></tr></thead>
        <tbody>
          {#each items as q (q.name)}
            <tr class="clickable" onclick={() => goto(`/atc-queue/${sid}/queues/${q.name}`)}>
              <td><span class="row wrap tight"><code>{q.name}</code>{#if q.paused}<StatusBadge status="paused" label={t('qu.paused')} />{/if}</span>{#if q.description}<div class="xs faint truncate desc">{q.description}</div>{/if}</td>
              <td>{fmt.int(q.ready)}</td>
              <td class="hide-m">{fmt.int(q.delayed)}</td>
              <td>{fmt.int(q.leased)}</td>
              <td>{#if q.dead}<StatusBadge status="dead" label={fmt.int(q.dead)} />{:else}0{/if}</td>
              <td class="hide-m small">{q.oldestReadySec === null ? '–' : fmt.duration(q.oldestReadySec)}</td>
            </tr>
          {/each}
        </tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<QueueForm open={createOpen} busy={creating} onsubmit={create} onclose={() => { createOpen = false; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 20px; }
  .tight { gap: 6px; }
  .desc { max-width: 280px; }
</style>
