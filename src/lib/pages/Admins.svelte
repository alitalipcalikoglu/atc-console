<script>
  import { PasswordHint } from '#lib/client/password-hint.js';
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Time from '#lib/components/Time.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import ServiceScope from '#lib/components/ServiceScope.svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  const session = useSession();
  import { t } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const list = new Resource(() => api.get('/admins'));
  $effect(() => { list.load(); });
  const items = $derived(/** @type {any} */ (list.data)?.items ?? []);
  let busy = $state(false);
  /** @type {null|'create'|'password'|'services'} */ let dialog = $state(null);
  /** @type {any|null} */ let target = $state(null);
  /** Pending consequential action, confirmed in a modal. @type {{ kind: 'delete'|'disable'|'role', admin: any }|null} */ let pending = $state(null);
  let fUsername = $state(''); let fName = $state(''); let fPassword = $state(''); /** @type {'admin'|'viewer'} */ let fRole = $state('viewer'); /** @type {string[]} */ let fServices = $state([]);
  /** @param {() => Promise<unknown>} fn @param {string} ok */
  async function run(fn, ok) { busy = true; try { await fn(); toasts.ok(ok); await list.load(); dialog = null; pending = null; } catch (e) { toasts.error(e); } finally { busy = false; } }
  /** @param {(a: any) => Promise<unknown>} fn @param {string} ok */
  const confirmed = (fn, ok) => { const p = pending; if (p) run(() => fn(p.admin), ok); };
  function openCreate() { fUsername = fName = fPassword = ''; fRole = 'viewer'; fServices = []; dialog = 'create'; }
</script>

<Page title={t('admins.title')} desc={t('admins.desc')}>
  {#snippet actions()}<button class="btn primary" onclick={openCreate}><Icon name="plus" size={16} /> {t('admins.create')}</button>{/snippet}
  <Panel title={t('admins.title')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if !list.loaded}<Skeleton rows={4} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('common.username')}</th><th class="hide-m">{t('common.name')}</th><th>{t('common.role')}</th><th>{t('common.status')}</th><th class="hide-m">{t('admins.services')}</th><th class="hide-m">{t('admins.totp')}</th><th class="hide-m">{t('admins.lastLogin')}</th><th></th></tr></thead>
        <tbody>{#each items as a (a.id)}
          {@const me = a.id === session.admin?.id}
          <tr>
            <td class="mono small">{a.username}{#if me} <span class="badge plain">{t('admins.you')}</span>{/if}</td><td class="hide-m">{a.name}</td>
            <td><StatusBadge status={a.role} label={t(`admins.${a.role}`)} /></td>
            <td><StatusBadge status={a.lockedUntil ? 'locked' : a.status} label={a.lockedUntil ? t('auth.locked') : a.status} /></td>
            <td class="hide-m small">{#if a.services}<span class="truncate" style="max-width:180px;display:block" title={a.services.join(', ')}>{a.services.join(', ')}</span>{:else}{t('admins.accessAll')}{/if}</td>
            <td class="hide-m">{#if a.totpEnabled}<span class="badge ok">{t('account.totpOn')}</span>{:else}<span class="badge">{t('account.totpOff')}</span>{/if}</td>
            <td class="hide-m"><Time value={a.lastLoginAt} /></td>
            <td style="text-align:right">
              {#if !me}
                <RowMenu label={t('common.actions')} items={[
                  { label: a.role === 'admin' ? `${t('common.role')}: ${t('admins.viewer')}` : `${t('common.role')}: ${t('admins.admin')}`, icon: 'shield', run: () => { pending = { kind: 'role', admin: a }; } },
                  { label: t('admins.editServices'), icon: 'settings', run: () => { target = a; fServices = a.services ?? []; dialog = 'services'; } },
                  { label: a.status === 'active' ? t('admins.disable') : t('admins.enable'), icon: a.status === 'active' ? 'lock' : 'unlock', run: () => { if (a.status === 'active') pending = { kind: 'disable', admin: a }; else run(() => api.patch(`/admins/${a.id}`, { status: 'active' }), t('admins.updated')); } },
                  ...(a.lockedUntil ? [{ label: t('admins.unlock'), icon: 'unlock', run: () => run(() => api.post(`/admins/${a.id}/unlock`), t('admins.unlocked')) }] : []),
                  { label: t('admins.resetPassword'), icon: 'key', run: () => { target = a; fPassword = ''; dialog = 'password'; } },
                  { label: t('admins.delete'), icon: 'trash', danger: true, run: () => { pending = { kind: 'delete', admin: a }; } },
                ]} />
              {/if}
            </td>
          </tr>
        {/each}</tbody>
      </table></div>
    {/if}
  </Panel>
</Page>

<Dialog open={dialog === 'create'} title={t('admins.create')} onclose={() => { dialog = null; }}>
  <div class="stack">
    <div class="field"><label for="ae">{t('common.username')}</label><input id="ae" class="input" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="64" bind:value={fUsername} required /></div>
    <div class="field"><label for="an">{t('common.name')} <span class="faint">({t('common.optional')})</span></label><input id="an" class="input" bind:value={fName} /></div>
    <div class="field"><label for="ap">{t('common.password')}</label><input id="ap" class="input" type="password" autocomplete="new-password" bind:value={fPassword} />{#if PasswordHint.weak(fPassword)}<span class="hint warn-text">{t('common.weakPassword')}</span>{/if}</div>
    <div class="field"><span class="small" style="font-weight:550;color:var(--text-2)">{t('common.role')}</span>
      <div class="row wrap">
        <label class="checkbox"><input type="radio" name="role" value="viewer" bind:group={fRole} /> <span><strong>{t('admins.viewer')}</strong> <span class="muted small">— {t('admins.viewerDesc')}</span></span></label>
        <label class="checkbox"><input type="radio" name="role" value="admin" bind:group={fRole} /> <span><strong>{t('admins.admin')}</strong> <span class="muted small">— {t('admins.adminDesc')}</span></span></label>
      </div></div>
    <ServiceScope bind:value={fServices} idPrefix="cs" />
  </div>
  {#snippet footer()}<button class="btn" onclick={() => { dialog = null; }}>{t('common.cancel')}</button><button class="btn primary" disabled={busy || !fUsername || !fPassword} onclick={() => run(() => api.post('/admins', { services: fServices.length ? fServices : null, username: fUsername.trim(), name: fName.trim(), password: fPassword, role: fRole }), t('admins.created'))}>{t('admins.create')}</button>{/snippet}
</Dialog>
<Dialog open={dialog === 'services'} title="{t('admins.editServices')} · {target?.username ?? ''}" onclose={() => { dialog = null; }}>
  <ServiceScope bind:value={fServices} idPrefix="es" />
  <p class="small muted" style="margin-top:10px">{t('admins.scopedNote')}</p>
  {#snippet footer()}<button class="btn" onclick={() => { dialog = null; }}>{t('common.cancel')}</button><button class="btn primary" disabled={busy} onclick={() => run(() => api.patch(`/admins/${target.id}`, { services: fServices.length ? fServices : null }), t('admins.servicesSaved'))}>{t('common.save')}</button>{/snippet}
</Dialog>
<Dialog open={dialog === 'password'} title="{t('admins.resetPassword')} · {target?.username ?? ''}" onclose={() => { dialog = null; }}>
  <p class="small muted" style="margin-bottom:12px">{t('admins.resetDesc')}</p>
  <div class="field"><label for="rp">{t('account.new')}</label><input id="rp" class="input" type="password" autocomplete="new-password" bind:value={fPassword} />{#if PasswordHint.weak(fPassword)}<span class="hint warn-text">{t('common.weakPassword')}</span>{/if}</div>
  {#snippet footer()}<button class="btn" onclick={() => { dialog = null; }}>{t('common.cancel')}</button><button class="btn primary" disabled={busy || fPassword.length < 12} onclick={() => run(() => api.post(`/admins/${target.id}/password`, { password: fPassword }), t('admins.passwordSet'))}>{t('common.save')}</button>{/snippet}
</Dialog>
<Confirm open={pending?.kind === 'delete'} title={t('admins.delete')} message="{pending?.admin.username ?? ''}: {t('admins.deleteDesc')}" danger typeWord={pending?.admin.username ?? ''} confirmLabel={t('common.delete')} {busy} onconfirm={() => confirmed((a) => api.delete(`/admins/${a.id}`), t('admins.deleted'))} oncancel={() => { pending = null; }} />
<Confirm open={pending?.kind === 'disable'} title={t('admins.disable')} message="{pending?.admin.username ?? ''}: {t('admins.disableDesc')}" danger irreversible={false} confirmLabel={t('admins.disable')} {busy} onconfirm={() => confirmed((a) => api.patch(`/admins/${a.id}`, { status: 'disabled' }), t('admins.updated'))} oncancel={() => { pending = null; }} />
<Confirm open={pending?.kind === 'role'} title={t('common.role')} message="{pending?.admin.username ?? ''}: {pending?.admin.role === 'admin' ? t('admins.toViewerDesc') : t('admins.toAdminDesc')}" confirmLabel={t('common.confirm')} {busy} onconfirm={() => confirmed((a) => api.patch(`/admins/${a.id}`, { role: a.role === 'admin' ? 'viewer' : 'admin' }), t('admins.updated'))} oncancel={() => { pending = null; }} />
