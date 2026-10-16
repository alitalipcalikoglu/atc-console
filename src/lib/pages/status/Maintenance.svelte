<script>
  /** Status page operations: maintenance windows (plan, delete) and e-mail subscribers (list, remove). */
  import Page from '#lib/components/Page.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Time from '#lib/components/Time.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
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
  const base = $derived(`/services/${sid}/atc-status`);
  const windows = new Resource(() => api.get(`${base}/maintenance`));
  const subs = new Resource(() => (session.isAdmin ? api.get(`${base}/subscribers`) : Promise.resolve(null)));
  const load = () => Promise.all([windows.load(), subs.load()]);
  $effect(() => { sid; untrack(load); });
  const w = $derived(/** @type {any} */ (windows.data));
  const sb = $derived(/** @type {any} */ (subs.data));
  const all = $derived(w ? [...w.current, ...w.past] : []);

  // Plan a window: datetime-local inputs are the viewer's local time.
  let createOpen = $state(false);
  let title = $state('');
  let message = $state('');
  let monitors = $state('');
  let startsAt = $state('');
  let endsAt = $state('');
  let busy = $state(false);
  const monitorList = $derived(monitors.split(',').map((m) => m.trim()).filter(Boolean));
  const monitorsOk = $derived(monitorList.every((m) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(m)));
  const timesOk = $derived(Boolean(startsAt && endsAt) && new Date(endsAt) > new Date(startsAt) && new Date(endsAt) > new Date());
  const canCreate = $derived(title.trim().length > 0 && timesOk && monitorsOk);
  function openCreate() {
    const now = new Date(Date.now() + 3_600_000); now.setMinutes(0, 0, 0);
    const local = (/** @type {Date} */ d) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    title = ''; message = ''; monitors = ''; startsAt = local(now); endsAt = local(new Date(now.getTime() + 3_600_000)); createOpen = true;
  }
  async function create() {
    busy = true;
    try {
      await api.post(`${base}/maintenance`, { title: title.trim(), ...(message.trim() ? { message: message.trim() } : {}), monitors: monitorList.length ? monitorList : null, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() });
      toasts.ok(t('stx.mntCreated')); createOpen = false; await windows.load();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @type {{ kind: 'window'|'subscriber', id: string, label: string }|null} */ let removing = $state(null);
  async function remove() {
    if (!removing) return;
    busy = true;
    try {
      await api.delete(`${base}/${removing.kind === 'window' ? 'maintenance' : 'subscribers'}/${encodeURIComponent(removing.id)}`);
      toasts.ok(t(removing.kind === 'window' ? 'stx.mntDeleted' : 'stx.subDeleted')); removing = null; await load();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page help={t('help.page.statusMaintenance')} docs={sid} title={t('stx.maintenance')} desc={t('stx.maintenanceDesc')} back="/atc-status/{sid}">
  {#snippet actions()}
    {#if session.isAdmin}<button class="btn primary" onclick={openCreate} aria-label={t('stx.mntCreate')} title={t('stx.mntCreate')}><Icon name="plus" size={16} /><span class="hide-m"> {t('stx.mntCreate')}</span></button>{/if}
    <button class="btn icon" onclick={load} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <Panel title={t('stx.mntWindows')} flush>
    {#if windows.error}<ErrorBox error={windows.error} onretry={() => windows.load()} />
    {:else if !w}<Skeleton rows={3} />
    {:else if !all.length}<Empty icon="clock" title={t('stx.mntEmpty')} desc={t('stx.mntEmptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('stx.mntTitle')}</th><th>{t('stx.mntState')}</th><th>{t('stx.mntStarts')}</th><th class="hide-m">{t('stx.mntEnds')}</th><th class="hide-m">{t('stx.mntMonitors')}</th><th></th></tr></thead>
        <tbody>{#each all as m (m.id)}<tr>
          <td class="small truncate" style="max-width:240px" title={m.message ?? m.title}>{m.title}</td>
          <td><StatusBadge status={m.state} label={t(`stx.mnt.${m.state}`)} /></td>
          <td class="small nowrap"><Time value={m.startsAt} mode="absolute" /></td>
          <td class="small nowrap hide-m"><Time value={m.endsAt} mode="absolute" /></td>
          <td class="xs hide-m truncate {m.monitors ? 'mono' : 'muted'}" style="max-width:200px">{m.monitors ? m.monitors.join(', ') : t('stx.mntAll')}</td>
          <td>{#if session.isAdmin}<button class="btn sm" disabled={busy} onclick={() => { removing = { kind: 'window', id: m.id, label: m.title }; }}>{t('common.delete')}</button>{/if}</td>
        </tr>{/each}</tbody>
      </table></div>
    {/if}
  </Panel>

  {#if session.isAdmin}
    <div style="height:20px"></div>
    <Panel title={t('stx.subscribers')} flush>
      {#if subs.error}<ErrorBox error={subs.error} onretry={() => subs.load()} />
      {:else if !sb}<Skeleton rows={3} />
      {:else}
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));padding:12px 16px">
          <Stat label={t('stx.subConfirmed')} value={fmt.int(sb.counts?.confirmed ?? 0)} />
          <Stat label={t('stx.subPending')} value={fmt.int((sb.counts?.total ?? 0) - (sb.counts?.confirmed ?? 0))} />
        </div>
        {#if !sb.enabled}<p class="small muted" style="padding:0 16px 12px">{t('stx.subDisabled')}</p>{/if}
        {#if !sb.items.length}<Empty icon="mail" title={t('stx.subEmpty')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('stx.subEmail')}</th><th>{t('stx.mntState')}</th><th class="hide-m">{t('common.created')}</th><th></th></tr></thead>
            <tbody>{#each sb.items as s (s.id)}<tr>
              <td class="mono small truncate" style="max-width:260px" title={s.email}>{s.email}</td>
              <td><StatusBadge status={s.confirmed ? 'confirmed' : 'unconfirmed'} label={t(s.confirmed ? 'stx.subConfirmedOne' : 'stx.subPendingOne')} /></td>
              <td class="small nowrap hide-m"><Time value={s.createdAt} /></td>
              <td><button class="btn sm" disabled={busy} onclick={() => { removing = { kind: 'subscriber', id: s.id, label: s.email }; }}>{t('stx.subRemove')}</button></td>
            </tr>{/each}</tbody>
          </table></div>
        {/if}
      {/if}
    </Panel>
  {/if}
</Page>

<Dialog help={t('help.dialog.statusMaintenance')} open={createOpen} title={t('stx.mntCreate')} onclose={() => { createOpen = false; }}>
  <div class="stack">
    <div class="field"><FieldLabel for="mnt-title" help={t('help.stx.mntTitle')}>{t('stx.mntTitle')}</FieldLabel><input id="mnt-title" class="input" maxlength="120" bind:value={title} /></div>
    <div class="field"><FieldLabel for="mnt-message" help={t('help.stx.mntMessage')}>{t('stx.mntMessage')}</FieldLabel><textarea id="mnt-message" class="input" rows="3" maxlength="1000" bind:value={message}></textarea></div>
    <div class="field"><FieldLabel for="mnt-starts" help={t('help.stx.mntStarts')}>{t('stx.mntStarts')}</FieldLabel><input id="mnt-starts" class="input" type="datetime-local" bind:value={startsAt} /></div>
    <div class="field"><FieldLabel for="mnt-ends" help={t('help.stx.mntEnds')}>{t('stx.mntEnds')}</FieldLabel><input id="mnt-ends" class="input" type="datetime-local" bind:value={endsAt} aria-invalid={startsAt && endsAt && !timesOk ? 'true' : undefined} /></div>
    <div class="field"><FieldLabel for="mnt-monitors" help={t('help.stx.mntMonitors')}>{t('stx.mntMonitors')}</FieldLabel><input id="mnt-monitors" class="input mono" placeholder={t('stx.mntAll')} bind:value={monitors} aria-invalid={monitorsOk ? undefined : 'true'} /></div>
  </div>
  {#snippet footer()}<button class="btn" onclick={() => { createOpen = false; }} disabled={busy}>{t('common.cancel')}</button><button class="btn primary" onclick={create} disabled={busy || !canCreate}>{t('stx.mntCreate')}</button>{/snippet}
</Dialog>
<Confirm open={removing !== null} title={removing?.kind === 'window' ? t('stx.mntDelete') : t('stx.subRemove')} message={removing ? t(removing.kind === 'window' ? 'stx.mntDeleteDesc' : 'stx.subRemoveDesc', { name: removing.label }) : ''} danger confirmLabel={removing?.kind === 'window' ? t('common.delete') : t('stx.subRemove')} {busy} onconfirm={remove} oncancel={() => { removing = null; }} />
