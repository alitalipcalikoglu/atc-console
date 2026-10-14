<script>
  /** One export job: state, progress, filters, error, download, and cancel/retry/delete through Confirm. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-export/exports/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const sources = new Resource(() => api.get(`/services/${sid}/atc-export/sources`));
  const sourceLabel = $derived(/** @type {any} */ (sources.data)?.items?.find((/** @type {any} */ s) => s.id === x?.source)?.label ?? x?.source);
  $effect(() => { res.load(); sources.load(); });
  const x = $derived(/** @type {any} */ (res.data)?.export);
  /** @type {'cancel'|'retry'|'delete'|null} */ let confirm = $state(null);
  let busy = $state(false);
  /** @param {() => Promise<unknown>} fn @param {string|null} ok */
  async function run(fn, ok) {
    busy = true;
    try { await fn(); if (ok) toasts.ok(ok); confirm = null; } catch (err) { toasts.error(err); } finally { busy = false; }
  }
  const cancel = () => run(async () => { await api.post(`${base}/cancel`, {}); await res.load(); }, t('ex.cancelled'));
  const retry = () => run(async () => { await api.post(`${base}/retry`, {}); await res.load(); }, t('ex.retried'));
  const remove = () => run(async () => { await api.delete(base); goto(`/atc-export/${sid}`); }, t('ex.deleted'));
  const canCancel = $derived(x && (x.status === 'queued' || (x.status === 'running' && !x.cancelRequested)));
  const canRetry = $derived(x && (x.status === 'failed' || x.status === 'cancelled'));
  const canDelete = $derived(x && x.status !== 'running');
  const filters = $derived(/** @type {[string, string][]} */ (x ? Object.entries(x.filters) : []));
</script>

<Page title={x ? `${sourceLabel} · ${x.format.toUpperCase()}` : t('ex.export')} back="/atc-export/{sid}">
  {#snippet actions()}
    <!-- Streamed through the console's relay; the browser never talks to media. -->
    {#if x?.status === 'succeeded' && x.file && session.isAdmin}<a class="btn primary" href="/api/services/{encodeURIComponent(sid)}/atc-export/exports/{encodeURIComponent(id)}/file" download={x.file.name}><Icon name="download" size={16} /><span class="hide-m"> {t('ex.download')}</span></a>{/if}
    {#if x && session.isAdmin}
      {#if canRetry}<button class="btn" onclick={() => { confirm = 'retry'; }} disabled={busy}><Icon name="refresh" size={16} /><span class="hide-m"> {t('ex.retry')}</span></button>{/if}
      {#if canCancel || canDelete}<RowMenu label={t('common.actions')} items={[
        ...(canCancel ? [{ label: t('ex.cancel'), icon: 'x', danger: true, run: () => { confirm = 'cancel'; } }] : []),
        ...(canDelete ? [{ label: t('ex.delete'), icon: 'trash', danger: true, run: () => { confirm = 'delete'; } }] : []),
      ]} />{/if}
    {/if}
    <button class="btn icon" onclick={() => res.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !x}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="card"><div class="card-body">
        <div class="row wrap head-row">
          <StatusBadge status={x.status} label={t(`ex.status.${x.status}`)} />
          {#if x.cancelRequested}<span class="small faint">{t('ex.cancelRequested')}</span>{/if}
          <span class="mono xs faint">{x.id}</span>
        </div>
        {#if x.error}<p class="small danger-text no-margin"><strong>{x.error.code}</strong> · {x.error.message}</p>{/if}
        {#if x.status === 'succeeded' && !x.file}<p class="small muted no-margin">{t('ex.noFile')}</p>{/if}
      </div></div>

      <div class="grid stat-row">
        <Stat label={t('ex.rows')} value={fmt.int(x.progress.rows)} />
        <Stat label={t('ex.bytes')} value={fmt.bytes(x.progress.bytes)} />
        <Stat label={t('ex.attempts')} value="{x.attempts}/{x.maxAttempts}" sub={x.nextRunAt ? `${t('ex.nextRun')}: ${fmt.relative(x.nextRunAt)}` : undefined} />
        {#if x.notification}<Stat label={t('ex.notification')} value={t(`ex.notify.${x.notification}`)} tone={x.notification === 'failed' ? 'danger' : ''} />{/if}
      </div>

      <Panel title={t('common.details')}>
        <dl class="kv">
          <dt>{t('ex.source')}</dt><dd class="mono">{x.source}</dd>
          <dt>{t('ex.format')}</dt><dd>{x.format}</dd>
          <dt>{t('ex.filters')}</dt><dd>{#if filters.length}<span class="row wrap tight">{#each filters as [k, v] (k)}<span class="badge plain">{k}={v}</span>{/each}</span>{:else}–{/if}</dd>
          {#if x.file}<dt>{t('ex.file')}</dt><dd class="mono small break">{x.file.name}</dd>{/if}
          {#if x.notifyEmail}<dt>{t('ex.notifyEmail')}</dt><dd class="small">{x.notifyEmail}</dd>{/if}
          <dt>{t('ex.createdBy')}</dt><dd class="mono small">{x.createdBy}</dd>
          <dt>{t('ex.created')}</dt><dd><Time value={x.createdAt} mode="absolute" /></dd>
          <dt>{t('ex.started')}</dt><dd>{#if x.startedAt}<Time value={x.startedAt} />{:else}–{/if}</dd>
          <dt>{t('ex.finished')}</dt><dd>{#if x.finishedAt}<Time value={x.finishedAt} />{:else}–{/if}</dd>
          <dt>{t('ex.expires')}</dt><dd>{#if x.expiresAt}<Time value={x.expiresAt} mode="absolute" />{:else}–{/if}</dd>
        </dl>
      </Panel>
    </div>
  {/if}
</Page>

<Confirm open={confirm === 'cancel'} title={t('ex.cancel')} message={t('ex.cancelDesc')} danger confirmLabel={t('ex.cancel')} {busy} onconfirm={cancel} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'retry'} title={t('ex.retry')} message={t('ex.retryDesc')} confirmLabel={t('ex.retry')} {busy} onconfirm={retry} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'delete'} title={t('ex.delete')} message={t('ex.deleteDesc')} danger typeWord={x?.id.slice(-6)} confirmLabel={t('common.delete')} {busy} onconfirm={remove} oncancel={() => { confirm = null; }} />

<style>
  .head-row { margin-bottom: 8px; }
  .no-margin { margin: 0; }
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .tight { gap: 4px; }
  .break { word-break: break-all; }
</style>
