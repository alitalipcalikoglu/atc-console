<script>
  /** One render job: state, template and version, outcome, the PDF download, and cancel through Confirm. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import AuditLink from '#lib/components/AuditLink.svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-render/renders/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  $effect(() => { res.load(); });
  const j = $derived(/** @type {any} */ (res.data)?.job);
  let confirm = $state(false);
  let busy = $state(false);
  async function cancel() {
    busy = true;
    try { await api.post(`${base}/cancel`, {}); toasts.ok(t('rd.jobCancelled')); confirm = false; await res.load(); } catch (err) { toasts.error(err); } finally { busy = false; }
  }
  const downloadable = $derived(j?.status === 'succeeded' && j.result?.download && session.isAdmin);
</script>

<Page help={t('help.page.renderJob')} docs={sid} title={j ? `${j.template} v${j.version}` : t('rd.job')} back="/atc-render/{sid}/renders">
  {#snippet actions()}
    <AuditLink targetId={id} />
    <!-- Streamed through the console's relay; the browser never talks to the render service. -->
    {#if downloadable}<a class="btn primary" href="/api/services/{encodeURIComponent(sid)}/atc-render/renders/{encodeURIComponent(id)}/pdf" download={j.filename}><Icon name="download" size={16} /><span class="hide-m"> {t('rd.downloadPdf')}</span></a>{/if}
    {#if j?.status === 'succeeded' && j.result?.url && session.isAdmin}<a class="btn" href={j.result.url} target="_blank" rel="noopener"><Icon name="image" size={16} /><span class="hide-m"> {t('rd.openInMedia')}</span></a>{/if}
    {#if j?.status === 'queued' && session.isAdmin}<button class="btn danger" onclick={() => { confirm = true; }} disabled={busy}><Icon name="x" size={16} /><span class="hide-m"> {t('rd.cancelJob')}</span></button>{/if}
    <button class="btn icon" onclick={() => res.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !j}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="card"><div class="card-body">
        <div class="row wrap head-row">
          <StatusBadge status={j.status} label={t(`rd.status.${j.status}`)} />
          <span class="mono xs faint">{j.id}</span>
        </div>
        {#if j.error}<p class="small danger-text no-margin"><strong>{j.error.code}</strong> · {j.error.message}</p>{/if}
        {#if j.status === 'queued'}<p class="small muted no-margin">{t('rd.queuedHint')}</p>{/if}
      </div></div>

      <div class="grid stat-row">
        <Stat label={t('rd.pages')} value={j.pages === null ? '–' : fmt.int(j.pages)} />
        <Stat label={t('common.size')} value={j.bytes === null ? '–' : fmt.bytes(j.bytes)} />
        <Stat label={t('rd.storedIn')} value={j.store ? 'atc-media' : t('rd.storedHere')} sub={j.result?.expiresAt ? `${t('rd.urlExpires')}: ${fmt.relative(j.result.expiresAt)}` : undefined} />
      </div>

      <Panel title={t('common.details')}>
        <dl class="kv">
          <dt>{t('rd.template')}</dt><dd><a href="/atc-render/{sid}/templates/{j.template}"><code>{j.template}</code></a> v{j.version}</dd>
          <dt>{t('rd.filename')}</dt><dd class="mono small break">{j.filename}</dd>
          {#if j.result?.fileId}<dt>{t('rd.mediaFile')}</dt><dd class="mono small break">{j.result.fileId}</dd>{/if}
          <dt>{t('sl.createdBy')}</dt><dd class="mono small">{j.createdBy}</dd>
          <dt>{t('common.created')}</dt><dd><Time value={j.createdAt} mode="absolute" /></dd>
          <dt>{t('ex.started')}</dt><dd>{#if j.startedAt}<Time value={j.startedAt} />{:else}–{/if}</dd>
          <dt>{t('ex.finished')}</dt><dd>{#if j.finishedAt}<Time value={j.finishedAt} />{:else}–{/if}</dd>
        </dl>
      </Panel>
    </div>
  {/if}
</Page>

<Confirm open={confirm} title={t('rd.cancelJob')} message={t('rd.cancelJobDesc')} danger confirmLabel={t('rd.cancelJob')} {busy} onconfirm={cancel} oncancel={() => { confirm = false; }} />

<style>
  .head-row { margin-bottom: 8px; }
  .no-margin { margin: 0; }
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .break { word-break: break-all; }
</style>
