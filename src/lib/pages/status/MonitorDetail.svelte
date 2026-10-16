<script>
  /** One monitor: state, uptime, settings, check history and incidents; check now, edit, pause, delete. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import MonitorForm from './MonitorForm.svelte';
  import PingToken from './PingToken.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
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
  const svcBase = $derived(`/services/${sid}/atc-status`);
  const base = $derived(`${svcBase}/monitors/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const d = $derived(/** @type {any} */ (res.data));
  const m = $derived(d?.monitor);
  /** @param {number|null|undefined} v */
  const pct = (v) => (v === null || v === undefined ? '–' : `${v.toFixed(v === 100 ? 0 : 2)}%`);

  /** @type {any[]} */ let checks = $state([]);
  /** @type {string|null} */ let checksCursor = $state(null);
  let checksMore = $state(false);
  /** @type {unknown} */ let checksError = $state(null);
  /** @param {string|null} c */
  async function loadChecks(c = null) {
    if (c) checksMore = true;
    try { const r = /** @type {any} */ (await api.get(`${base}/checks?limit=50${c ? `&cursor=${c}` : ''}`)); checks = c ? [...checks, ...r.items] : r.items; checksCursor = r.nextCursor; checksError = null; }
    catch (e) { checksError = e; } finally { checksMore = false; }
  }
  /** @type {any[]} */ let incidents = $state([]);
  /** @type {string|null} */ let incCursor = $state(null);
  let incMore = $state(false);
  /** @param {string|null} c */
  async function loadIncidents(c = null) {
    if (c) incMore = true;
    try { const r = /** @type {any} */ (await api.get(`${svcBase}/incidents?monitor=${encodeURIComponent(id)}&limit=20${c ? `&cursor=${encodeURIComponent(c)}` : ''}`)); incidents = c ? [...incidents, ...r.items] : r.items; incCursor = r.nextCursor; }
    catch (e) { toasts.error(e); } finally { incMore = false; }
  }
  const reloadAll = () => Promise.all([res.load(), loadChecks(null), loadIncidents(null)]);
  $effect(() => { reloadAll(); });

  let busy = $state(false);
  // Public incident update: shown on the status page and mailed to subscribers; "resolved" closes the incident.
  /** @type {string|null} */ let updating = $state(null);
  /** @type {'investigating'|'identified'|'monitoring'|'resolved'} */ let updStatus = $state('investigating');
  let updMessage = $state('');
  async function postUpdate() {
    busy = true;
    try { await api.post(`${svcBase}/incidents/${updating}/updates`, { status: updStatus, message: updMessage.trim() }); toasts.ok(t('stx.updPosted')); updating = null; await loadIncidents(null); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  let editOpen = $state(false);
  let confirmDelete = $state(false);
  let confirmRotate = $state(false);
  /** @type {string|null} */ let pingPath = $state(null);
  async function rotate() {
    busy = true;
    try { const r = /** @type {any} */ (await api.put(base, { rotateToken: true })); pingPath = r.pingPath ?? null; confirmRotate = false; toasts.ok(t('stx.rotated')); await res.load(); }
    catch (e) { toasts.error(e); } finally { busy = false; confirmRotate = false; }
  }
  async function checkNow() {
    busy = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/check`, {})); if (r.check.ok) toasts.ok(t('stx.checkOk', { ms: fmt.int(r.check.latencyMs) })); else toasts.error(new Error(t('stx.checkFailed', { error: r.check.error }))); await reloadAll(); }
    catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @param {string} _id @param {Record<string, unknown>} body */
  async function save(_id, body) {
    busy = true;
    try { await api.put(base, body); toasts.ok(t('stx.updated')); editOpen = false; await res.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @param {boolean} paused */
  async function setPaused(paused) {
    busy = true;
    try { await api.put(base, { paused }); toasts.ok(t(paused ? 'stx.pausedOk' : 'stx.resumedOk')); await res.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  async function remove() {
    busy = true;
    try { await api.delete(base); toasts.ok(t('stx.deleted')); goto(`/atc-status/${sid}`); } catch (e) { toasts.error(e); } finally { busy = false; confirmDelete = false; }
  }
</script>

<Page help={t('help.page.statusMonitor')} docs={sid} title={m ? m.name : t('stx.monitor')} back="/atc-status/{sid}">
  {#snippet actions()}
    {#if m && session.isAdmin}
      <button class="btn primary" onclick={checkNow} disabled={busy} aria-label={t('stx.checkNow')} title={t('stx.checkNow')}><Icon name="play" size={16} /><span class="hide-m"> {t('stx.checkNow')}</span></button>
      <RowMenu label={t('common.actions')} items={[
        { label: t('stx.edit'), icon: 'settings', run: () => { editOpen = true; } },
        m.paused ? { label: t('stx.resume'), icon: 'play', run: () => setPaused(false) } : { label: t('stx.pause'), icon: 'pause', run: () => setPaused(true) },
        ...(m.kind === 'heartbeat' ? [{ label: t('stx.rotate'), icon: 'refresh', run: () => { confirmRotate = true; } }] : []),
        ...(m.origin === 'api' ? [{ label: t('common.delete'), icon: 'trash', danger: true, run: () => { confirmDelete = true; } }] : []),
      ]} />
    {/if}
    <button class="btn icon" onclick={reloadAll} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !m}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="grid stat-row">
        <Stat label={t('stx.state')} value={t(`stx.s.${m.state}`)} tone={m.state === 'down' ? 'danger' : m.state === 'degraded' ? 'warn' : ''} sub={d.openIncident ? `${t('stx.downSince')} ${fmt.relative(d.openIncident.openedAt)}` : m.lastCheck ? `${m.lastCheck.status ?? '–'} · ${m.lastCheck.ok ? `${fmt.int(m.lastCheck.latencyMs)} ms` : t('stx.failedShort')}` : undefined} />
        <Stat label={t('stx.uptime24h')} value={pct(d.uptime['24h'].uptime)} sub={d.uptime['24h'].avgMs === null ? undefined : t('stx.avg', { ms: fmt.int(d.uptime['24h'].avgMs) })} />
        <Stat label={t('stx.uptime7d')} value={pct(d.uptime['7d'].uptime)} />
        <Stat label={t('stx.uptime30d')} value={pct(d.uptime['30d'].uptime)} />
      </div>
      <Panel title={t('stx.settings')}>
        {#snippet aside()}<span class="row wrap tight">{#if m.public}<StatusBadge status="public" label={t('stx.public')} />{/if}{#if m.origin === 'env'}<StatusBadge status="default" label={t('stx.seeded')} />{/if}</span>{/snippet}
        {#if m.description}<p class="no-margin desc-line">{m.description}</p>{/if}
        <dl class="kv">
          <dt>{t('stx.kind')}</dt><dd>{t(`stx.k.${m.kind}`)}</dd>
          {#if m.kind !== 'heartbeat'}<dt>{m.kind === 'http' ? t('stx.url') : m.kind === 'dns' ? t('stx.dnsHost') : t('stx.targetHost')}</dt><dd class="mono small truncate" title={m.url}>{m.kind === 'http' ? `${m.method} ` : ''}{m.url}</dd>{/if}
          <dt>{t('stx.every')}</dt><dd>{fmt.duration(m.intervalSec)}</dd>
          {#if m.kind === 'heartbeat'}
            <dt>{t('stx.graceLabel')}</dt><dd>{fmt.duration(m.graceSec)}</dd>
            <dt>{t('stx.lastPing')}</dt><dd>{#if m.lastPingAt}<Time value={m.lastPingAt} />{:else}{t('stx.neverPinged')}{/if}</dd>
          {:else}
            <dt>{t('stx.timeoutLabel')}</dt><dd>{fmt.ms(m.timeoutMs)}</dd>
          {/if}
          {#if m.kind === 'http'}<dt>{t('stx.expect')}</dt><dd class="mono small">{m.expectStatus.join(', ')}</dd>{/if}
          {#if m.expectText}<dt>{t('stx.expectText')}</dt><dd class="mono small">{m.expectText}</dd>{/if}
          {#if m.kind === 'tls'}<dt>{t('stx.warnDays')}</dt><dd>{m.warnDays}</dd>{/if}
          {#if m.kind === 'dns'}<dt>{t('stx.dnsType')}</dt><dd class="mono">{m.dnsType}</dd>{/if}
          <dt>{t('stx.threshold')}</dt><dd>{m.failThreshold}</dd>
          <dt>{t('stx.nextCheck')}</dt><dd>{#if m.nextCheckAt}<Time value={m.nextCheckAt} />{:else}–{/if}</dd>
          <dt>{t('stx.createdBy')}</dt><dd class="mono small">{m.createdBy}</dd>
        </dl>
      </Panel>

      <Panel title={t('stx.checks')} flush>
        {#if checksError}<ErrorBox error={checksError} onretry={() => loadChecks(null)} />
        {:else if !checks.length}<Empty icon="activity" title={t('stx.noChecks')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('stx.time')}</th><th>{t('stx.result')}</th><th>{t('stx.httpStatus')}</th><th>{t('stx.latency')}</th><th class="hide-m">{t('stx.error')}</th></tr></thead>
            <tbody>
              {#each checks as c, i (`${c.at}-${i}`)}
                <tr>
                  <td class="small nowrap"><Time value={c.at} /></td>
                  <td><StatusBadge status={c.ok ? 'up' : 'down'} label={c.ok ? t('stx.pass') : t('stx.fail')} /></td>
                  <td class="mono small">{c.status ?? '–'}</td>
                  <td class="small">{fmt.int(c.latencyMs)} ms</td>
                  <td class="hide-m small"><span class="truncate err">{c.error ?? ''}</span></td>
                </tr>
              {/each}
            </tbody>
          </table></div>
          <LoadMore cursor={checksCursor} busy={checksMore} onmore={() => loadChecks(checksCursor)} />
        {/if}
      </Panel>

      <Panel title={t('stx.incidents')} flush>
        {#if !incidents.length}<Empty icon="check" title={t('stx.noIncidents')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('stx.opened')}</th><th>{t('stx.state')}</th><th>{t('stx.duration')}</th><th class="hide-m">{t('stx.cause')}</th><th></th></tr></thead>
            <tbody>
              {#each incidents as i (i.id)}
                <tr>
                  <td class="small nowrap"><Time value={i.openedAt} /></td>
                  <td><StatusBadge status={i.state} label={t(`stx.i.${i.state}`)} />{#if i.notifyError}<div class="xs danger-text truncate err" title={i.notifyError}>{i.notifyError}</div>{/if}</td>
                  <td class="small">{fmt.duration(i.durationSec)}</td>
                  <td class="hide-m small"><span class="truncate err" title={i.cause}>{i.cause}</span></td>
                  <td>{#if session.isAdmin && i.state === 'open'}<button class="btn sm" disabled={busy} onclick={() => { updating = i.id; updStatus = 'investigating'; updMessage = ''; }}>{t('stx.updPost')}</button>{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table></div>
          <LoadMore cursor={incCursor} busy={incMore} onmore={() => loadIncidents(incCursor)} />
        {/if}
      </Panel>
    </div>
  {/if}
</Page>

<Dialog help={t('help.dialog.statusIncidentUpdate')} open={updating !== null} title={t('stx.updPost')} onclose={() => { updating = null; }}>
  <div class="stack">
    <div class="field"><FieldLabel for="upd-status" help={t('help.stx.updStatus')}>{t('stx.updStatus')}</FieldLabel><select id="upd-status" class="select" bind:value={updStatus}>{#each ['investigating', 'identified', 'monitoring', 'resolved'] as st (st)}<option value={st}>{t(`stx.upd.${st}`)}</option>{/each}</select></div>
    <div class="field"><FieldLabel for="upd-message" help={t('help.stx.updMessage')}>{t('stx.updMessage')}</FieldLabel><textarea id="upd-message" class="input" rows="4" maxlength="2000" bind:value={updMessage}></textarea></div>
  </div>
  {#snippet footer()}<button class="btn" onclick={() => { updating = null; }} disabled={busy}>{t('common.cancel')}</button><button class="btn primary" onclick={postUpdate} disabled={busy || !updMessage.trim()}>{t('stx.updPost')}</button>{/snippet}
</Dialog>
<PingToken path={pingPath} onclose={() => { pingPath = null; }} />
<Confirm open={confirmRotate} title={t('stx.rotateTitle')} message={t('stx.rotateDesc')} danger confirmLabel={t('stx.rotate')} {busy} onconfirm={rotate} oncancel={() => { confirmRotate = false; }} />
<MonitorForm open={editOpen} initial={m} {busy} onsubmit={save} onclose={() => { editOpen = false; }} />
<Confirm open={confirmDelete} title={t('stx.deleteTitle')} message={t('stx.deleteDesc')} danger typeWord={m?.id} confirmLabel={t('common.delete')} {busy} onconfirm={remove} oncancel={() => { confirmDelete = false; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .tight { gap: 6px; }
  .no-margin { margin: 0; }
  .desc-line { margin-bottom: 10px; }
  .err { display: block; max-width: 280px; }
</style>
