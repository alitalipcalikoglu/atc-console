<script>
  /** Change requests of protected environments: what was asked, by whom; approve or reject (four eyes). */
  import Page from '#lib/components/Page.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import { untrack } from 'svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { t } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const session = useSession();
  const base = $derived(`/services/${sid}/atc-flags/changes`);
  /** @type {''|'pending'|'approved'|'rejected'} */ let status = $state('pending');
  const list = new Resource(() => api.get(`${base}?limit=100${status ? `&status=${status}` : ''}`));
  $effect(() => { status; untrack(() => list.load()); });
  const data = $derived(/** @type {any} */ (list.data));
  /** @param {any} c */
  const summary = (c) => c.kind === 'copy' ? t('fl.chCopy', { from: c.payload.from }) : Object.keys(c.payload).join(', ');
  /** @type {{ id: string, action: 'approve'|'reject', key: string, env: string }|null} */ let pending = $state(null);
  let busy = $state(false);
  async function decide() {
    if (!pending) return;
    busy = true;
    try {
      await api.post(`${base}/${pending.id}/${pending.action}`, pending.action === 'reject' ? {} : undefined);
      toasts.ok(t(pending.action === 'approve' ? 'fl.chApproved' : 'fl.chRejected', { key: pending.key, env: pending.env }));
      pending = null;
      await list.load();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page help={t('help.page.flagsChanges')} docs={sid} title={t('fl.changes')} desc={t('fl.changesDesc')} back="/atc-flags/{sid}">
  {#snippet actions()}
    <button class="btn icon" onclick={() => list.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <select id="ch-status" class="select" style="width:auto" bind:value={status} aria-label={t('fl.chStatus')}>
      <option value="pending">{t('fl.ch.pending')}</option><option value="approved">{t('fl.ch.approved')}</option><option value="rejected">{t('fl.ch.rejected')}</option><option value="">{t('common.all')}</option>
    </select><HelpTip text={t('help.fl.chStatus')} for="ch-status" />
    {#if data}<span class="small muted">{t('fl.protectedEnvs')}: {data.protectedEnvs.length ? data.protectedEnvs.join(', ') : t('fl.noProtected')}</span>{/if}
  </div>
  <Panel title={t('fl.changes')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if !data}<Skeleton rows={4} />
    {:else if !data.items.length}<Empty icon="check" title={t('fl.chEmpty')} desc={data.protectedEnvs.length ? t('fl.chEmptyDesc') : t('fl.chNoProtectedDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('fl.flag')}</th><th>{t('fl.environment')}</th><th class="hide-m">{t('fl.chWhat')}</th><th>{t('fl.chStatus')}</th><th class="hide-m">{t('fl.chRequestedBy')}</th><th>{t('common.created')}</th><th></th></tr></thead>
        <tbody>{#each data.items as c (c.id)}<tr>
          <td class="mono small"><a href="/atc-flags/{sid}/flags/{encodeURIComponent(c.key)}">{c.key}</a></td>
          <td class="mono small">{c.env}</td>
          <td class="small muted hide-m truncate" style="max-width:220px" title={JSON.stringify(c.payload)}>{summary(c)}</td>
          <td><StatusBadge status={c.status} label={t(`fl.ch.${c.status}`)} /></td>
          <td class="small hide-m">{c.requestedBy}{#if c.decidedBy}<span class="muted"> · {c.decidedBy}</span>{/if}</td>
          <td style="white-space:nowrap"><Time value={c.requestedAt} /></td>
          <td style="white-space:nowrap">{#if session.isAdmin && c.status === 'pending'}
            <button class="btn sm primary" disabled={busy} onclick={() => { pending = { id: c.id, action: 'approve', key: c.key, env: c.env }; }}>{t('fl.chApprove')}</button>
            <button class="btn sm" disabled={busy} onclick={() => { pending = { id: c.id, action: 'reject', key: c.key, env: c.env }; }}>{t('fl.chReject')}</button>
          {/if}</td>
        </tr>{/each}</tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<Confirm open={pending !== null} title={pending?.action === 'approve' ? t('fl.chApprove') : t('fl.chReject')}
  message={pending ? t(pending.action === 'approve' ? 'fl.chApproveDesc' : 'fl.chRejectDesc', { key: pending.key, env: pending.env }) : ''}
  danger={pending?.action === 'approve'} irreversible={true} confirmLabel={pending?.action === 'approve' ? t('fl.chApprove') : t('fl.chReject')} {busy}
  onconfirm={decide} oncancel={() => { pending = null; }} />
