<script>
  /** One backup: file facts and checksum, download, verify, restore to a file or over the live database, delete. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import CopyButton from '#lib/components/CopyButton.svelte';
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
  const base = $derived(`/services/${sid}/atc-backup/backups/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const b = $derived(/** @type {any} */ (res.data)?.backup);
  const usable = $derived(b?.status === 'ok');
  $effect(() => { res.load(); });

  let busy = $state(false);
  /** @type {{ checksumOk: boolean, integrity: string }|null} */ let check = $state(null);
  async function verify() {
    busy = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/verify`, {})); check = { checksumOk: r.checksumOk, integrity: r.integrity }; if (r.checksumOk && r.integrity === 'ok') toasts.ok(t('bk.verifyOk')); else toasts.error(new Error(t('bk.verifyBad'))); await res.load(); }
    catch (e) { toasts.error(e); } finally { busy = false; }
  }

  /** @type {{ ok: boolean, detail: any }|null} */ let drilled = $state(null);
  async function drill() {
    busy = true;
    try {
      const r = /** @type {any} */ (await api.post(`${base}/drill`, {}));
      drilled = { ok: r.ok, detail: r.detail };
      if (r.ok) toasts.ok(t('bk.drillOk')); else toasts.error(new Error(t('bk.drillBad', { error: r.detail?.error ?? '' })));
      await res.load();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @param {any} detail */
  const drillSummary = (detail) => (detail?.tables ? t('bk.drillTables', { n: fmt.int(Object.keys(detail.tables).length) }) : detail?.entries !== undefined ? t('bk.drillEntries', { n: fmt.int(detail.entries) }) : detail?.error ?? '');

  // ---- restore: a dialog collects the target; replacing anything goes through Confirm
  let restoreOpen = $state(false);
  /** @type {'file'|'live'} */ let mode = $state('file');
  let target = $state('');
  let overwrite = $state(false);
  /** @type {'overwrite'|'live'|'delete'|null} */ let confirm = $state(null);
  const targetOk = $derived(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(target));
  function openRestore() { mode = 'file'; target = b ? `${b.source}-restored${b.format === 'tar.gz' ? '' : '.db'}` : ''; overwrite = false; restoreOpen = true; }
  function submitRestore() {
    if (mode === 'live') { confirm = 'live'; return; }
    if (overwrite) { confirm = 'overwrite'; return; }
    restore();
  }
  async function restore() {
    busy = true;
    try {
      const body = mode === 'live' ? { live: true, confirm: b.source } : { target, ...(overwrite ? { overwrite: true } : {}) };
      const r = /** @type {any} */ (await api.post(`${base}/restore`, body));
      toasts.ok(r.live ? t('bk.restoredLive', { source: r.target }) : t('bk.restoredFile', { target: r.target }));
      restoreOpen = false; confirm = null;
      await res.load();
    } catch (e) { toasts.error(e); confirm = null; } finally { busy = false; }
  }
  async function remove() {
    busy = true;
    try { await api.delete(base); toasts.ok(t('bk.deleted')); goto(`/atc-backup/${sid}`); } catch (e) { toasts.error(e); } finally { busy = false; confirm = null; }
  }
</script>

<Page title={b ? b.file ?? b.id : t('bk.backup')} back="/atc-backup/{sid}">
  {#snippet actions()}
    {#if b && usable && session.isAdmin}
      <a class="btn primary" href="/api{base}/file" download={b.file} aria-label={t('bk.download')} title={t('bk.download')}><Icon name="download" size={16} /><span class="hide-m"> {t('bk.download')}</span></a>
      <button class="btn" onclick={openRestore} disabled={busy} aria-label={t('bk.restore')} title={t('bk.restore')}><Icon name="upload" size={16} /><span class="hide-m"> {t('bk.restore')}</span></button>
    {/if}
    {#if b && session.isAdmin && b.status !== 'running'}
      <RowMenu label={t('common.actions')} items={[
        ...(usable ? [{ label: t('bk.verify'), icon: 'check', run: verify }, { label: t('bk.drill'), icon: 'play', run: drill }] : []),
        { label: t('common.delete'), icon: 'trash', danger: true, run: () => { confirm = 'delete'; } },
      ]} />
    {/if}
    <button class="btn icon" onclick={() => res.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !b}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <Panel title={t('bk.details')}>
        {#snippet aside()}<StatusBadge status={b.status} label={t(`bk.s.${b.status}`)} />{/snippet}
        {#if b.error}<p class="small danger-text no-margin desc-line">{b.error}</p>{/if}
        <dl class="kv">
          <dt>{t('bk.source')}</dt><dd><code>{b.source}</code></dd>
          <dt>{t('bk.trigger')}</dt><dd>{t(`bk.t.${b.trigger}`)}</dd>
          <dt>{t('bk.createdBy')}</dt><dd class="mono small">{b.createdBy}</dd>
          <dt>{t('bk.started')}</dt><dd><Time value={b.startedAt} mode="absolute" /></dd>
          {#if b.durationMs !== null}<dt>{t('bk.duration')}</dt><dd>{fmt.ms(b.durationMs)}</dd>{/if}
          {#if b.file}<dt>{t('bk.file')}</dt><dd class="mono small truncate" title={b.file}>{b.file}</dd>{/if}
          <dt>{t('bk.format')}</dt><dd>{b.format === 'tar.gz' ? t('bk.kindTree') : t('bk.kindSqlite')}{#if b.encrypted} · {t('bk.encrypted')}{/if}</dd>
          {#if b.size !== null}<dt>{t('bk.size')}</dt><dd>{fmt.bytes(b.size)}{#if b.pages !== null}{` · ${t('bk.pages', { n: fmt.int(b.pages) })}`}{/if}</dd>{/if}
          {#if b.sha256}<dt>SHA-256</dt><dd class="row sha"><span class="mono small truncate" title={b.sha256}>{b.sha256}</span><CopyButton text={b.sha256} /></dd>{/if}
          {#if b.verified !== null}<dt>{t('bk.verified')}</dt><dd><span class="row wrap tight"><StatusBadge status={b.verified ? 'ok' : 'failed'} label={b.verified ? t('bk.intact') : t('bk.damaged')} /><span class="small"><Time value={b.verifiedAt} /></span></span></dd>{/if}
          {#if b.drill}<dt>{t('bk.drillLast')}</dt><dd><span class="row wrap tight"><StatusBadge status={b.drill.ok ? 'ok' : 'failed'} label={b.drill.ok ? t('bk.intact') : t('bk.damaged')} /><span class="small"><Time value={b.drill.at} /></span><span class="small muted">{drillSummary(b.drill.detail)}</span></span></dd>{/if}
          {#if check}<dt>{t('bk.lastCheck')}</dt><dd class="small">{t('bk.checkResult', { sum: check.checksumOk ? t('bk.match') : t('bk.mismatch'), integrity: check.integrity })}</dd>{/if}
          {#if b.media}<dt>{t('bk.media')}</dt><dd class="small">{#if b.media.fileId}<code>{b.media.fileId}</code>{:else}<span class="danger-text">{b.media.error}</span>{/if}</dd>{/if}
        </dl>
      </Panel>
    </div>
  {/if}
</Page>

<Dialog open={restoreOpen} title={t('bk.restore')} onclose={() => { restoreOpen = false; }}>
  <div class="stack">
    {#if b?.format !== 'tar.gz'}
      <div class="seg">
        <button aria-pressed={mode === 'file'} onclick={() => { mode = 'file'; }}>{t('bk.toFile')}</button>
        <button aria-pressed={mode === 'live'} onclick={() => { mode = 'live'; }}>{t('bk.toLive')}</button>
      </div>
    {/if}
    {#if mode === 'file'}
      <p class="small muted no-margin">{t('bk.toFileHint')}</p>
      <div class="field"><label for="bk-target">{t('bk.target')}</label><input id="bk-target" class="input mono" bind:value={target} maxlength="128" aria-invalid={target && !targetOk ? 'true' : undefined} />{#if target && !targetOk}<span class="error">{t('bk.targetInvalid')}</span>{/if}</div>
      <label class="checkbox small"><input type="checkbox" bind:checked={overwrite} /> {t('bk.overwrite')}</label>
    {:else}
      <p class="small danger-text no-margin">{t('bk.toLiveHint', { source: b?.source ?? '' })}</p>
    {/if}
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => { restoreOpen = false; }} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn {mode === 'live' ? 'danger solid' : 'primary'}" onclick={submitRestore} disabled={busy || (mode === 'file' && !targetOk)}>{t('bk.restore')}</button>
  {/snippet}
</Dialog>

<Confirm open={confirm === 'overwrite'} title={t('bk.overwriteTitle')} message={t('bk.overwriteDesc', { target })} danger confirmLabel={t('bk.restore')} {busy} onconfirm={restore} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'live'} title={t('bk.liveTitle')} message={t('bk.liveDesc', { source: b?.source ?? '' })} danger typeWord={b?.source} confirmLabel={t('bk.restore')} {busy} onconfirm={restore} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'delete'} title={t('bk.deleteTitle')} message={t('bk.deleteDesc')} danger typeWord={b?.source} confirmLabel={t('common.delete')} {busy} onconfirm={remove} oncancel={() => { confirm = null; }} />

<style>
  .tight { gap: 6px; }
  .no-margin { margin: 0; }
  .desc-line { margin-bottom: 10px; }
  .sha { min-width: 0; gap: 6px; }
</style>
