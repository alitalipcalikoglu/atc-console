<script>
  /** Content service home: totals and the namespace list. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import ServiceTabs from '#lib/components/ServiceTabs.svelte';
  import AutoRefresh from '#lib/components/AutoRefresh.svelte';
  import PollStats from '#lib/components/PollStats.svelte';
  import NamespaceForm from './NamespaceForm.svelte';
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
  const list = new Resource(() => api.get(`/services/${sid}/atc-content/namespaces`));
  const stats = new Resource(() => api.get(`/services/${sid}/atc-content/stats`));
  $effect(() => service.subscribe(() => Promise.all([list.load(), stats.load()])));
  $effect(() => { list.load(); stats.load(); });
  const refreshNow = () => service.trigger();
  const items = $derived(/** @type {any[]} */ (/** @type {any} */ (list.data)?.items ?? []));
  const st = $derived(/** @type {any} */ (stats.data));
  const missingOf = (/** @type {any} */ n) => Object.values(/** @type {Record<string, number>} */ (n.missing)).reduce((a, b) => a + b, 0);
  const svc = $derived(services.get(sid));
  let createOpen = $state(false);
  let creating = $state(false);
  /** @param {Record<string, unknown>} body */
  async function create(body) {
    creating = true;
    try { const r = /** @type {any} */ (await api.post(`/services/${sid}/atc-content/namespaces`, body)); toasts.ok(t('ct.created', { name: r.namespace.name })); createOpen = false; goto(`/atc-content/${sid}/namespaces/${r.namespace.name}`); }
    catch (e) { toasts.error(e); } finally { creating = false; }
  }
</script>

<Page help={t('help.page.content')} docs={sid} title={svc?.label ?? t('ct.title')} desc={t('ct.desc')}>
  {#snippet actions()}
    <AutoRefresh {sid} />
    {#if session.isAdmin}<button class="btn primary" onclick={() => { createOpen = true; }} aria-label={t('ct.create')} title={t('ct.create')}><Icon name="plus" size={16} /><span class="hide-m"> {t('ct.create')}</span></button>{/if}
    <button class="btn icon" onclick={refreshNow} disabled={service.inFlight} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <ServiceTabs type="atc-content" {sid} />
  <PollStats {sid} />
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-bottom:20px">
    <Stat label={t('ct.namespaces')} value={fmt.int(st?.namespaces)} sub={st ? `${fmt.int(st.locales)} ${t('ct.locales').toLowerCase()}` : undefined} />
    <Stat label={t('ct.keys')} value={fmt.int(st?.keys)} />
    <Stat label={t('ct.missing')} value={fmt.int(st?.missing)} tone={st?.missing ? 'warn' : ''} />
    <Stat label={t('ct.mismatched')} value={fmt.int(st?.mismatched)} tone={st?.mismatched ? 'danger' : ''} />
    <Stat label={t('ct.lastPublish')} value={st?.lastPublish ? `${st.lastPublish.namespace} #${st.lastPublish.release}` : st ? t('ct.never') : undefined} sub={st?.lastPublish ? fmt.relative(st.lastPublish.at) : undefined} />
  </div>

  <Panel title={t('ct.namespaces')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if list.loading && !items.length}<Skeleton rows={4} />
    {:else if !items.length}<Empty icon="languages" title={t('ct.emptyTitle')} desc={t('ct.emptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('ct.namespace')}</th><th>{t('ct.locales')}</th><th class="hide-m">{t('ct.keys')}</th><th class="hide-m">{t('ct.missing')}</th><th>{t('ct.release')}</th><th class="hide-m">{t('ct.lastPublish')}</th></tr></thead>
        <tbody>
          {#each items as n (n.name)}
            <tr class="clickable" onclick={() => goto(`/atc-content/${sid}/namespaces/${n.name}`)}>
              <td><code>{n.name}</code>{#if n.description}<div class="xs faint truncate" style="max-width:260px">{n.description}</div>{/if}</td>
              <td><span class="row wrap" style="gap:4px">{#each n.locales as l (l.locale)}<span class="badge plain">{l.locale}</span>{/each}</span></td>
              <td class="hide-m">{fmt.int(n.keys)}</td>
              <td class="hide-m">{fmt.int(missingOf(n))}</td>
              <td>{#if n.release}<span class="row" style="gap:6px"><span class="mono small">#{n.release.number}</span>{#if n.unpublishedChanges}<StatusBadge status="draft" label={t('ct.unpublished')} />{/if}</span>{:else}<StatusBadge status="draft" label={t('ct.notPublished')} />{/if}</td>
              <td class="hide-m small">{#if n.release}<Time value={n.release.createdAt} />{:else}–{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<NamespaceForm open={createOpen} busy={creating} onsubmit={create} onclose={() => { createOpen = false; }} />
