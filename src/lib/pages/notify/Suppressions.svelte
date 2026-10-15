<script>
  /** Notify's suppression list: who gets no mail and why; add an address, allow one again. */
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Time from '#lib/components/Time.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
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
  const REASONS = ['hard_bounce', 'complaint', 'soft_bounce', 'unsubscribe', 'manual'];
  const base = $derived(`/services/${sid}/atc-notify/suppressions`);
  let q = $state('');
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  /** @type {Record<string, number>} */ let counts = $state({});
  let more = $state(false);
  const query = (/** @type {string|null} */ c) => `${base}?limit=50${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}${c ? `&cursor=${encodeURIComponent(c)}` : ''}`;
  const list = new Resource(async () => {
    const r = /** @type {any} */ (await api.get(query(null)));
    items = r.items; cursor = r.nextCursor; counts = r.counts; return r;
  });
  /** @type {ReturnType<typeof setTimeout>|undefined} */ let timer;
  $effect(() => { q; clearTimeout(timer); timer = setTimeout(() => list.load(), 250); return () => clearTimeout(timer); });
  async function loadMore() {
    more = true;
    try { const r = /** @type {any} */ (await api.get(query(cursor))); items = [...items, ...r.items]; cursor = r.nextCursor; } catch (e) { toasts.error(e); } finally { more = false; }
  }
  let addOpen = $state(false);
  let email = $state('');
  let note = $state('');
  let busy = $state(false);
  const emailOk = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  async function add() {
    busy = true;
    try { await api.post(base, { email: email.trim(), ...(note.trim() ? { note: note.trim() } : {}) }); toasts.ok(t('notify.supAdded')); addOpen = false; await list.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  /** @type {string|null} */ let removing = $state(null);
  async function remove() {
    if (!removing) return;
    busy = true;
    try { await api.delete(`${base}/${encodeURIComponent(removing)}`); toasts.ok(t('notify.supRemoved')); removing = null; await list.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page title={t('notify.suppressions')} desc={t('notify.supDesc')} back="/atc-notify/{sid}">
  {#snippet actions()}
    {#if session.isAdmin}<button class="btn primary" onclick={() => { email = ''; note = ''; addOpen = true; }} aria-label={t('notify.supAdd')} title={t('notify.supAdd')}><Icon name="plus" size={16} /><span class="hide-m"> {t('notify.supAdd')}</span></button>{/if}
    <button class="btn icon" onclick={() => list.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:20px">
    {#each REASONS as r (r)}<Stat label={t(`notify.reason.${r}`)} value={fmt.int(counts[r] ?? 0)} />{/each}
  </div>
  <div class="row" style="margin-bottom:12px"><input class="input grow" type="search" placeholder={t('notify.supSearch')} aria-label={t('notify.supSearch')} bind:value={q} /></div>
  <Panel title={t('notify.suppressions')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if !list.data}<Skeleton rows={5} />
    {:else if !items.length}<Empty icon="mail" title={t('notify.supEmpty')} desc={t('notify.supEmptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('notify.address')}</th><th>{t('notify.reason')}</th><th class="hide-m">{t('notify.source')}</th><th class="hide-m">{t('notify.note')}</th><th>{t('common.created')}</th><th></th></tr></thead>
        <tbody>{#each items as s (s.email)}<tr>
          <td class="mono small truncate" style="max-width:260px" title={s.email}>{s.email}</td>
          <td><StatusBadge status={s.reason} label={t(`notify.reason.${s.reason}`)} /></td>
          <td class="mono xs hide-m" style="white-space:nowrap">{s.source}</td>
          <td class="small muted truncate hide-m" style="max-width:240px" title={s.note ?? ''}>{s.note ?? '–'}</td>
          <td style="white-space:nowrap"><Time value={s.createdAt} /></td>
          <td>{#if session.isAdmin}<button class="btn sm" onclick={() => { removing = s.email; }} disabled={busy}>{t('notify.supRemove')}</button>{/if}</td>
        </tr>{/each}</tbody>
      </table></div>
      <LoadMore {cursor} busy={more} onmore={loadMore} />
    {/if}
  </Panel>
</Page>

<Dialog open={addOpen} title={t('notify.supAdd')} onclose={() => { addOpen = false; }}>
  <div class="stack">
    <div class="field"><label for="sup-email">{t('notify.address')}</label><input id="sup-email" class="input" type="email" autocomplete="off" bind:value={email} aria-invalid={email && !emailOk ? 'true' : undefined} /></div>
    <div class="field"><label for="sup-note">{t('notify.note')}</label><input id="sup-note" class="input" maxlength="500" bind:value={note} /></div>
  </div>
  {#snippet footer()}<button class="btn" onclick={() => { addOpen = false; }} disabled={busy}>{t('common.cancel')}</button><button class="btn primary" onclick={add} disabled={busy || !emailOk}>{t('notify.supAdd')}</button>{/snippet}
</Dialog>
<Confirm open={removing !== null} title={t('notify.supRemove')} message={t('notify.supRemoveDesc')} irreversible={false} confirmLabel={t('notify.supRemove')} {busy} onconfirm={remove} oncancel={() => { removing = null; }} />
