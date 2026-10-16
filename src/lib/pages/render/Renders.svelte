<script>
  /** Render jobs of the console's key: status filter, newest first, load more; a row opens the job. */
  import { untrack } from 'svelte';
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { page as route } from '$app/state';
  import { Navigation } from '#lib/client/navigation.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-render/renders`);
  const STATUSES = ['', 'queued', 'running', 'succeeded', 'failed', 'cancelled'];
  let status = $state(route.url.searchParams.get('status') ?? '');
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let more = $state(false);
  const qs = (/** @type {string|null} */ c) => { const p = new URLSearchParams({ limit: '50' }); if (status) p.set('status', status); if (c) p.set('cursor', c); return p.toString(); };
  const list = new Resource(async () => {
    const r = /** @type {{ items: any[], nextCursor: string|null }} */ (await api.get(`${base}?${qs(null)}`));
    items = r.items; cursor = r.nextCursor; return r;
  });
  // React to the filter only; the URL update and the load must not become dependencies.
  $effect(() => { const q = { status }; untrack(() => { Navigation.replaceQuery(route.url, q); list.load(); }); });
  async function loadMore() {
    more = true;
    try { const r = /** @type {{ items: any[], nextCursor: string|null }} */ (await api.get(`${base}?${qs(cursor)}`)); items = [...items, ...r.items]; cursor = r.nextCursor; }
    catch (e) { toasts.error(e); } finally { more = false; }
  }
</script>

<Page help={t('help.page.renderJobs')} docs={sid} title={t('rd.jobs')} desc={t('rd.jobsDesc')} back="/atc-render/{sid}">
  {#snippet actions()}
    <button class="btn icon" onclick={() => list.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <Panel flush>
    {#snippet head()}
      <div class="seg" role="group" aria-label={t('common.status')}>{#each STATUSES as s (s)}<button aria-pressed={status === s} onclick={() => { status = s; }}>{s ? t(`rd.status.${s}`) : t('common.all')}</button>{/each}</div>
      <HelpTip text={t('help.rd.jobStatus')} />
    {/snippet}
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if list.loading && !items.length}<Skeleton rows={6} />
    {:else if !items.length}<Empty icon="file" title={t('rd.noJobs')} desc={t('rd.noJobsDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('rd.template')}</th><th>{t('common.status')}</th><th class="hide-m">{t('rd.filename')}</th><th class="num hide-m">{t('rd.pages')}</th><th>{t('common.created')}</th></tr></thead>
        <tbody>
          {#each items as j (j.id)}
            <tr class="clickable" onclick={() => goto(`/atc-render/${sid}/renders/${j.id}`)}>
              <td><code>{j.template}</code> <span class="xs faint">v{j.version}</span><div class="xs faint mono">{j.id}</div></td>
              <td><StatusBadge status={j.status} label={t(`rd.status.${j.status}`)} /></td>
              <td class="hide-m small truncate" style="max-width:220px">{j.filename}{#if j.store} <span class="badge plain">media</span>{/if}</td>
              <td class="num hide-m">{j.pages === null ? '–' : fmt.int(j.pages)}</td>
              <td style="white-space:nowrap"><Time value={j.createdAt} /></td>
            </tr>
          {/each}
        </tbody>
      </table></div>
      <LoadMore {cursor} busy={more} onmore={loadMore} />
    {/if}
  </Panel>
</Page>
