<script>
  /** Media's virus quarantine: uploads ClamAV rejected, kept for review; delete one after review. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import { untrack } from 'svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const session = useSession();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-media/quarantine`);
  const list = new Resource(() => api.get(base));
  $effect(() => { sid; untrack(() => list.load()); });
  const items = $derived(/** @type {any[]} */ (/** @type {any} */ (list.data)?.items ?? []));
  /** @type {any} */ let removing = $state(null);
  let busy = $state(false);
  async function remove() {
    if (!removing) return;
    busy = true;
    try { await api.delete(`${base}/${encodeURIComponent(removing.id)}`); toasts.ok(t('media.qDeleted')); removing = null; await list.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page help={t('help.page.mediaQuarantine')} docs={sid} title={t('media.quarantine')} desc={t('media.qDesc')} back="/atc-media/{sid}">
  {#snippet actions()}
    <button class="btn icon" onclick={() => list.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <Panel title={t('media.quarantine')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if !list.data}<Skeleton rows={4} />
    {:else if !items.length}<Empty icon="shield" title={t('media.qEmpty')} desc={t('media.qEmptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('common.name')}</th><th>{t('media.qSignature')}</th><th class="hide-m">{t('media.owner')}</th><th class="num hide-m">{t('common.size')}</th><th>{t('common.created')}</th><th></th></tr></thead>
        <tbody>{#each items as q (q.id)}<tr>
          <td class="truncate small" style="max-width:220px" title={q.name}>{q.name}</td>
          <td class="mono xs danger-text truncate" style="max-width:220px" title={q.signature}>{q.signature}</td>
          <td class="mono xs hide-m">{q.owner}</td>
          <td class="num hide-m">{fmt.bytes(q.size)}</td>
          <td style="white-space:nowrap"><Time value={q.createdAt} /></td>
          <td>{#if session.isAdmin}<button class="btn sm" onclick={() => { removing = q; }} disabled={busy}>{t('common.delete')}</button>{/if}</td>
        </tr>{/each}</tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<Confirm open={removing !== null} title={t('media.qDelete')} message={t('media.qDeleteDesc', { name: removing?.name ?? '' })} danger typeWord={removing?.id ?? ""} confirmLabel={t('common.delete')} {busy} onconfirm={remove} oncancel={() => { removing = null; }} />
