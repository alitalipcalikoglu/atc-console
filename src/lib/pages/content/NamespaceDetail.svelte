<script>
  /** One namespace: locales and chains, the key table with a missing filter, the key editor, import/export, publish and releases. */
  import { untrack } from 'svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import NamespaceForm from './NamespaceForm.svelte';
  import LocaleForm from './LocaleForm.svelte';
  import KeyEditor from './KeyEditor.svelte';
  import ImportDialog from './ImportDialog.svelte';
  import ExportDialog from './ExportDialog.svelte';
  import { api, ApiError } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { page as route } from '$app/state';
  import { Navigation } from '#lib/client/navigation.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-content/namespaces/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const ns = $derived(/** @type {any} */ (res.data)?.namespace);

  // ---- keys (search + missing filter in the URL, cursor paging)
  let q = $state(route.url.searchParams.get('q') ?? '');
  let missing = $state(route.url.searchParams.get('missing') ?? '');
  /** Review filter `state|locale`, e.g. `pending|tr`; empty = no filter. */
  let review = $state(route.url.searchParams.get('review') ?? '');
  /** @type {any[]} */ let keys = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let keysLoading = $state(false);
  let more = $state(false);
  /** @type {unknown} */ let keysError = $state(null);
  const qs = (/** @type {string|null} */ c) => { const p = new URLSearchParams({ limit: '50' }); if (q.trim()) p.set('q', q.trim()); if (missing) p.set('missing', missing); if (review) { const [st, l] = review.split('|'); p.set('review', st); if (l) p.set('reviewLocale', l); } if (c) p.set('cursor', c); return p.toString(); };
  async function loadKeys() {
    keysLoading = true;
    try { const r = /** @type {any} */ (await api.get(`${base}/keys?${qs(null)}`)); keys = r.items; cursor = r.nextCursor; keysError = null; }
    catch (e) { keysError = e; } finally { keysLoading = false; }
  }
  async function moreKeys() {
    more = true;
    try { const r = /** @type {any} */ (await api.get(`${base}/keys?${qs(cursor)}`)); keys = [...keys, ...r.items]; cursor = r.nextCursor; }
    catch (e) { toasts.error(e); } finally { more = false; }
  }
  /** @type {ReturnType<typeof setTimeout>|undefined} */ let timer;
  $effect(() => { q; missing; review; clearTimeout(timer); timer = setTimeout(() => { Navigation.replaceQuery(route.url, { q, missing, review }); loadKeys(); }, 300); return () => clearTimeout(timer); });
  /** Approve or reject one value as shown in the editor; the value is sent so a concurrent edit is not approved blindly. */
  /** @param {string} locale @param {'approve'|'reject'} decision @param {string} value */
  async function reviewValue(locale, decision, value) {
    if (!keyEntry) return;
    const key = keyEntry.key;
    await run(async () => {
      const r = /** @type {any} */ (await api.post(`${base}/review`, { decision, items: [{ key, locale, value }] }));
      if (r.skipped?.length) throw new Error(t(`ct.rvSkip.${r.skipped[0].code}`));
      keyEntry = /** @type {any} */ (await api.get(`${base}/keys/${encodeURIComponent(key)}`)).key;
      await Promise.all([loadKeys(), res.load()]);
    }, t(decision === 'approve' ? 'ct.approved' : 'ct.rejected', { l: locale }));
  }

  // ---- releases (newest first, nextBefore paging)
  /** @type {any[]} */ let releases = $state([]);
  /** @type {string|null} */ let before = $state(null);
  let moreReleases = $state(false);
  /** @param {string|null} from */
  async function loadReleases(from = null) {
    moreReleases = true;
    try { const r = /** @type {any} */ (await api.get(`${base}/releases?limit=10${from ? `&before=${from}` : ''}`)); releases = from ? [...releases, ...r.items] : r.items; before = r.nextBefore; }
    catch (e) { toasts.error(e); } finally { moreReleases = false; }
  }
  // Reload when the namespace changes; the loaders write state, so they run untracked.
  $effect(() => { base; untrack(() => { res.load(); loadReleases(null); }); });
  const reloadAll = () => Promise.all([res.load(), loadKeys(), loadReleases(null)]);

  // ---- actions
  /** @type {'delete'|'publish'|'rollback'|'restore'|'deleteLocale'|'makeDefault'|'deleteKey'|null} */ let confirm = $state(null);
  /** @type {any} */ let target = $state(null);
  let busy = $state(false);
  /** @param {() => Promise<unknown>} fn @param {string|null} ok */
  async function run(fn, ok) {
    busy = true;
    try { await fn(); if (ok) toasts.ok(ok); confirm = null; target = null; return true; } catch (err) { toasts.error(err); return false; } finally { busy = false; }
  }
  let editOpen = $state(false);
  /** @param {Record<string, unknown>} patch */
  async function saveNamespace(patch) {
    if (!Object.keys(patch).length) { toasts.info(t('ct.noChanges')); editOpen = false; return; }
    if (await run(async () => { await api.patch(base, patch); await reloadAll(); }, t('ct.updated'))) editOpen = false;
  }
  async function publish() {
    busy = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/publish`, {})); toasts.ok(t('ct.publishedOk', { n: r.release.number })); confirm = null; await Promise.all([res.load(), loadReleases(null)]); }
    catch (err) {
      confirm = null;
      // UNPUBLISHABLE lists the drifted values; show them in the key table.
      if (err instanceof ApiError && err.code === 'UNPUBLISHABLE') toasts.error(t('ct.unpublishable', { n: /** @type {any} */ (err.details)?.problems?.length ?? '?' }));
      else toasts.error(err);
    } finally { busy = false; }
  }
  /** @param {boolean} restoreDraft */
  const rollback = (restoreDraft) => { const r = target.number; return run(async () => { const out = /** @type {any} */ (await api.post(`${base}/rollback`, { release: r, restoreDraft })); toasts.ok(t('ct.rolledBack', { n: out.release.number, r })); await reloadAll(); }, null); };

  let localeOpen = $state(false);
  /** @type {any} */ let localeTarget = $state(null);
  /** @param {string} locale @param {string|null} fallback */
  async function saveLocale(locale, fallback) {
    if (await run(async () => { await api.put(`${base}/locales/${encodeURIComponent(locale)}`, { fallback }); await reloadAll(); }, t('ct.localeSaved', { l: locale }))) { localeOpen = false; localeTarget = null; }
  }

  let keyOpen = $state(false);
  /** @type {any} */ let keyEntry = $state(null);
  /** @param {string} key @param {{ description?: string, values?: Record<string, string|null> }} body */
  async function saveKey(key, body) {
    if (keyEntry && !Object.keys(body).length) { toasts.info(t('ct.noChanges')); keyOpen = false; return; }
    busy = true;
    try {
      const r = /** @type {any} */ (await api.put(`${base}/keys/${encodeURIComponent(key)}`, body));
      if (r.mismatched.length) toasts.info(t('ct.keyMismatch', { l: r.mismatched.join(', ') })); else toasts.ok(t('ct.keySaved', { key }));
      keyOpen = false; keyEntry = null;
      await Promise.all([res.load(), loadKeys()]);
    } catch (err) { toasts.error(err); } finally { busy = false; }
  }
  const deleteKey = () => run(async () => { await api.delete(`${base}/keys/${encodeURIComponent(target.key)}`); keyOpen = false; keyEntry = null; await Promise.all([res.load(), loadKeys()]); }, t('ct.keyDeleted'));

  let importOpen = $state(false);
  /** @type {any} */ let report = $state(null);
  /** @param {string} locale @param {object} strings */
  async function runImport(locale, strings) {
    busy = true;
    try { report = await api.post(`${base}/import`, { locale, strings }); toasts.ok(t('ct.importDone', { a: report.added, u: report.updated, s: report.unchanged, i: report.invalidCount })); await Promise.all([res.load(), loadKeys()]); }
    catch (err) { toasts.error(err); } finally { busy = false; }
  }
  let exportOpen = $state(false);

  /** @param {any} k */
  const keyStatus = (k) => {
    const have = Object.keys(k.values).length;
    const all = ns?.locales.length ?? 0;
    if (k.mismatched.length) return { status: 'mismatch', label: t('ct.mismatch') };
    if (have >= all) return { status: 'complete', label: t('ct.complete') };
    return { status: 'missing', label: t('ct.translated', { n: have, m: all }) };
  };
  const nextRelease = $derived((releases[0]?.number ?? 0) + 1);
</script>

<Page help={t('help.page.contentNamespace')} docs={sid} title={ns ? ns.name : t('ct.namespace')} back="/atc-content/{sid}">
  {#snippet actions()}
    {#if ns && session.isAdmin}
      <button class="btn primary" onclick={() => { confirm = 'publish'; }} disabled={busy}><Icon name="upload" size={16} /><span class="hide-m"> {t('ct.publish')}</span></button>
      <button class="btn" onclick={() => { report = null; importOpen = true; }} disabled={busy}><Icon name="file" size={16} /><span class="hide-m"> {t('ct.import')}</span></button>
    {/if}
    {#if ns}<button class="btn" onclick={() => { exportOpen = true; }}><Icon name="download" size={16} /><span class="hide-m"> {t('ct.export')}</span></button>{/if}
    {#if ns && session.isAdmin}
      <RowMenu label={t('common.actions')} items={[
        { label: t('ct.edit'), icon: 'settings', run: () => { editOpen = true; } },
        { label: t('ct.delete'), icon: 'trash', danger: true, run: () => { confirm = 'delete'; } },
      ]} />
    {/if}
    <button class="btn icon" onclick={reloadAll} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !ns}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="card"><div class="card-body">
        <div class="row wrap" style="margin-bottom:8px">
          {#if !ns.release}<StatusBadge status="draft" label={t('ct.notPublished')} />
          {:else if ns.unpublishedChanges}<StatusBadge status="draft" label={t('ct.unpublished')} />
          {:else}<StatusBadge status="published" label={t('ct.upToDate')} />{/if}
          {#if ns.release}<span class="small">{t('ct.release')} <span class="mono">#{ns.release.number}</span> · <Time value={ns.release.createdAt} /></span>{/if}
          {#if ns.mismatched}<StatusBadge status="mismatch" label="{fmt.int(ns.mismatched)} {t('ct.mismatched').toLowerCase()}" />{/if}
        </div>
        {#if ns.description}<p style="margin-bottom:8px">{ns.description}</p>{/if}
        <p class="xs faint" style="margin:0">{fmt.int(ns.keys)} {t('ct.keys').toLowerCase()} · {t('ct.defaultLocale').toLowerCase()} <span class="mono">{ns.defaultLocale}</span> · {t('common.updated').toLowerCase()} <Time value={ns.draftUpdatedAt} /></p>
      </div></div>

      <div class="layout two">
        <Panel title={t('ct.locales')} flush>
          {#snippet aside()}{#if session.isAdmin}<button class="btn sm" onclick={() => { localeTarget = null; localeOpen = true; }} disabled={busy}><Icon name="plus" size={14} /> {t('ct.addLocale')}</button>{/if}{/snippet}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('ct.locale')}</th><th>{t('ct.chain')}</th><th>{t('ct.missing')}</th><th>{t('ct.rvPending')}</th>{#if session.isAdmin}<th></th>{/if}</tr></thead>
            <tbody>
              {#each ns.locales as l (l.locale)}
                <tr>
                  <td><span class="row" style="gap:6px"><code>{l.locale}</code>{#if l.locale === ns.defaultLocale}<StatusBadge status="default" label={t('ct.default')} />{/if}</span></td>
                  <td class="mono small">{l.chain.join(' → ')}</td>
                  <td>{#if ns.missing[l.locale]}<button class="linkish" onclick={() => { missing = l.locale; }}>{fmt.int(ns.missing[l.locale])}</button>{:else}0{/if}</td>
                  <td>{#if ns.review?.[l.locale]?.pending}<button class="linkish" onclick={() => { review = `pending|${l.locale}`; }}>{fmt.int(ns.review[l.locale].pending)}</button>{:else}0{/if}{#if ns.review?.[l.locale]?.rejected}<button class="linkish danger-text xs" style="margin-left:6px" onclick={() => { review = `rejected|${l.locale}`; }}>{t('ct.rvRejectedN', { n: ns.review[l.locale].rejected })}</button>{/if}</td>
                  {#if session.isAdmin}<td style="text-align:right">{#if l.locale !== ns.defaultLocale}<RowMenu label={t('common.actions')} items={[
                    { label: t('ct.fallback'), icon: 'settings', run: () => { localeTarget = l; localeOpen = true; } },
                    { label: t('ct.makeDefault'), icon: 'flag', run: () => { target = l; confirm = 'makeDefault'; } },
                    { label: t('ct.deleteLocale'), icon: 'trash', danger: true, run: () => { target = l; confirm = 'deleteLocale'; } },
                  ]} />{/if}</td>{/if}
                </tr>
              {/each}
            </tbody>
          </table></div>
        </Panel>

        <Panel title={t('ct.releases')} flush>
          {#if !releases.length}<Empty icon="history" title={t('ct.noReleases')} desc={t('ct.noReleasesDesc')} />
          {:else}
            <div class="table-wrap"><table class="table">
              <thead><tr><th>{t('ct.release')}</th><th class="hide-m">{t('ct.keys')}</th><th>{t('common.created')}</th>{#if session.isAdmin}<th></th>{/if}</tr></thead>
              <tbody>
                {#each releases as r, i (r.number)}
                  <tr>
                    <td><span class="row wrap" style="gap:6px"><span class="mono">#{r.number}</span>{#if i === 0}<StatusBadge status="published" label={t('ct.published')} />{/if}{#if r.rollbackOf}<span class="badge plain xs">{t('ct.rollbackOf', { r: r.rollbackOf })}</span>{/if}</span>{#if r.note}<div class="xs faint truncate" style="max-width:220px">{r.note}</div>{/if}</td>
                    <td class="hide-m">{fmt.int(r.keys)}</td>
                    <td class="small"><Time value={r.createdAt} /><div class="xs faint mono">{r.createdBy}</div></td>
                    {#if session.isAdmin}<td style="text-align:right">{#if i > 0}<RowMenu label={t('common.actions')} items={[
                      { label: t('ct.rollback'), icon: 'history', run: () => { target = r; confirm = 'rollback'; } },
                      { label: t('ct.rollbackRestore'), icon: 'history', danger: true, run: () => { target = r; confirm = 'restore'; } },
                    ]} />{/if}</td>{/if}
                  </tr>
                {/each}
              </tbody>
            </table></div>
            <LoadMore cursor={before} busy={moreReleases} onmore={() => loadReleases(before)} />
          {/if}
        </Panel>
      </div>

      <Panel title={t('ct.keys')} flush>
        {#snippet aside()}
          <select id="ct-missing" class="select" style="width:auto" bind:value={missing} aria-label={t('ct.missing')}><option value="">{t('ct.allKeys')}</option>{#each ns.locales as l (l.locale)}<option value={l.locale}>{t('ct.missingIn', { l: l.locale })}</option>{/each}</select><HelpTip text={t('help.ct.missingFilter')} for="ct-missing" />
          <select id="ct-review" class="select" style="width:auto" bind:value={review} aria-label={t('ct.review')}><option value="">{t('ct.rvAny')}</option>{#each ns.locales as l (l.locale)}<option value="pending|{l.locale}">{t('ct.rvPendingIn', { l: l.locale })}</option><option value="rejected|{l.locale}">{t('ct.rvRejectedIn', { l: l.locale })}</option>{/each}</select><HelpTip text={t('help.ct.reviewFilter')} for="ct-review" />
          <input id="ct-search" class="input key-search" type="search" placeholder={t('ct.search')} bind:value={q} /><HelpTip text={t('help.ct.search')} for="ct-search" />
          {#if session.isAdmin}<button class="btn sm" onclick={() => { keyEntry = null; keyOpen = true; }} disabled={busy}><Icon name="plus" size={14} /> {t('ct.addKey')}</button>{/if}
        {/snippet}
        {#if keysError}<ErrorBox error={keysError} onretry={loadKeys} />
        {:else if keysLoading && !keys.length}<Skeleton rows={6} />
        {:else if !keys.length}<Empty icon="languages" title={t('ct.emptyKeys')} desc={t('ct.emptyKeysDesc')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('ct.key')}</th><th class="hide-m">{ns.defaultLocale}</th><th>{t('common.status')}</th><th class="hide-m">{t('common.updated')}</th></tr></thead>
            <tbody>
              {#each keys as k (k.key)}
                {@const s = keyStatus(k)}
                <tr class="clickable" onclick={() => { keyEntry = k; keyOpen = true; }}>
                  <td><code>{k.key}</code>{#if k.description}<div class="xs faint truncate" style="max-width:240px">{k.description}</div>{/if}</td>
                  <td class="hide-m small truncate" style="max-width:320px">{k.values[ns.defaultLocale] ?? '–'}</td>
                  <td><StatusBadge status={s.status} label={s.label} /></td>
                  <td class="hide-m small"><Time value={k.updatedAt} /></td>
                </tr>
              {/each}
            </tbody>
          </table></div>
          <LoadMore {cursor} busy={more} onmore={moreKeys} />
        {/if}
      </Panel>
    </div>
  {/if}
</Page>

<NamespaceForm open={editOpen} initial={ns} {busy} onsubmit={saveNamespace} onclose={() => { editOpen = false; }} />
<LocaleForm open={localeOpen} {ns} locale={localeTarget} {busy} onsubmit={saveLocale} onclose={() => { localeOpen = false; localeTarget = null; }} />
<KeyEditor open={keyOpen} {ns} entry={keyEntry} {busy} onsubmit={saveKey} onreview={session.isAdmin ? reviewValue : undefined} ondelete={session.isAdmin ? () => { target = keyEntry; confirm = 'deleteKey'; } : undefined} onclose={() => { keyOpen = false; keyEntry = null; }} />
<ImportDialog open={importOpen} {ns} {busy} {report} onsubmit={runImport} onclose={() => { importOpen = false; report = null; }} />
<ExportDialog open={exportOpen} {sid} {ns} onclose={() => { exportOpen = false; }} />
<Confirm open={confirm === 'publish'} title={t('ct.publish')} message={t('ct.publishDesc', { n: nextRelease })} confirmLabel={t('ct.publish')} {busy} onconfirm={publish} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'rollback'} title={t('ct.rollback')} message={t('ct.rollbackDesc', { r: target?.number ?? '' })} confirmLabel={t('ct.rollback')} {busy} onconfirm={() => rollback(false)} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'restore'} title={t('ct.rollbackRestore')} message={t('ct.rollbackRestoreDesc', { r: target?.number ?? '' })} danger confirmLabel={t('ct.rollbackRestore')} {busy} onconfirm={() => rollback(true)} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'makeDefault'} title={t('ct.makeDefault')} message={t('ct.makeDefaultDesc', { l: target?.locale ?? '' })} confirmLabel={t('ct.makeDefault')} {busy} onconfirm={() => run(async () => { await api.patch(base, { defaultLocale: target.locale }); await reloadAll(); }, t('ct.updated'))} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'deleteLocale'} title={t('ct.deleteLocale')} message={t('ct.deleteLocaleDesc', { l: target?.locale ?? '' })} danger typeWord={target?.locale} confirmLabel={t('common.delete')} {busy} onconfirm={() => run(async () => { await api.delete(`${base}/locales/${encodeURIComponent(target.locale)}`); if (missing === target.locale) missing = ''; await reloadAll(); }, t('ct.localeDeleted', { l: target?.locale ?? '' }))} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'deleteKey'} title={t('ct.deleteKey')} message={t('ct.deleteKeyDesc', { key: target?.key ?? '' })} danger typeWord={target?.key} confirmLabel={t('common.delete')} {busy} onconfirm={deleteKey} oncancel={() => { confirm = null; target = null; }} />
<Confirm open={confirm === 'delete'} title={t('ct.delete')} message={t('ct.deleteDesc')} danger typeWord={ns?.name} confirmLabel={t('common.delete')} {busy} onconfirm={() => run(async () => { await api.delete(base); goto(`/atc-content/${sid}`); }, t('ct.deleted'))} oncancel={() => { confirm = null; }} />

<style>
  .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (min-width: 1101px) { .layout.two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .linkish { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; }
  .linkish:hover { text-decoration: underline; }
  .key-search { width: 220px; }
  @media (max-width: 600px) { .key-search { width: 100%; } }
</style>
