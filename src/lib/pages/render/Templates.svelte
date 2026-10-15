<script>
  /** Render service home: last-24h counters and the template list. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import TemplateForm from './TemplateForm.svelte';
  import { poller } from '#lib/client/poller.svelte.js';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { useSession } from '#lib/client/session.svelte.js';
  import { services } from '#lib/client/services.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  import { STARTER_LAYOUT } from './starter.js';
  const session = useSession();
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const service = $derived(poller.for(sid));
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-render`);
  const list = new Resource(() => api.get(`${base}/templates`));
  const stats = new Resource(() => api.get(`${base}/stats`));
  $effect(() => service.subscribe(() => Promise.all([list.load(), stats.load()])));
  $effect(() => { list.load(); stats.load(); });
  const refreshNow = () => service.trigger();
  const items = $derived(/** @type {any[]} */ (/** @type {any} */ (list.data)?.items ?? []));
  const st = $derived(/** @type {any} */ (stats.data));
  const svc = $derived(services.get(sid));
  let createOpen = $state(false);
  let creating = $state(false);
  /** @param {{ name?: string, description: string }} body */
  async function create(body) {
    creating = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/templates`, { ...body, layout: STARTER_LAYOUT, note: 'starter' })); toasts.ok(t('rd.created', { name: r.template.name })); createOpen = false; goto(`/atc-render/${sid}/templates/${r.template.name}`); }
    catch (e) { toasts.error(e); } finally { creating = false; }
  }
</script>

<Page help={t('help.page.render')} docs={sid} title={svc?.label ?? t('rd.title')} desc={t('rd.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    {#if session.isAdmin}<button class="btn primary" onclick={() => { createOpen = true; }} aria-label={t('rd.create')} title={t('rd.create')}><Icon name="plus" size={16} /><span class="hide-m"> {t('rd.create')}</span></button>{/if}
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-render" {sid} />
  <PollStats {sid} />
  <div class="grid stat-row">
    <Stat label={t('rd.templates')} value={fmt.int(st?.templates)} />
    <Stat label={t('rd.renders24h')} value={fmt.int(st?.last24h?.renders)} sub={st ? `${fmt.int(st.last24h.stored)} → media` : undefined} />
    <Stat label={t('rd.failed24h')} value={fmt.int(st?.last24h?.failed)} tone={st?.last24h?.failed ? 'danger' : ''} />
    <Stat label={t('rd.avgMs')} value={st ? fmt.ms(st.last24h.avgMs) : undefined} />
    <Stat label={t('rd.pages24h')} value={fmt.int(st?.last24h?.pages)} sub={st ? fmt.bytes(st.last24h.bytes) : undefined} />
  </div>

  <Panel title={t('rd.templates')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if list.loading && !items.length}<Skeleton rows={4} />
    {:else if !items.length}<Empty icon="file" title={t('rd.emptyTitle')} desc={t('rd.emptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('rd.template')}</th><th>{t('rd.latest')}</th><th class="hide-m">{t('common.updated')}</th></tr></thead>
        <tbody>
          {#each items as x (x.name)}
            <tr class="clickable" onclick={() => goto(`/atc-render/${sid}/templates/${x.name}`)}>
              <td><code>{x.name}</code>{#if x.description}<div class="xs faint truncate desc">{x.description}</div>{/if}</td>
              <td class="mono">v{x.latestVersion}</td>
              <td class="hide-m small"><Time value={x.updatedAt} /></td>
            </tr>
          {/each}
        </tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<TemplateForm open={createOpen} busy={creating} onsubmit={create} onclose={() => { createOpen = false; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 20px; }
  .desc { max-width: 320px; }
</style>
