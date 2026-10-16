<script>
  /** One render template: versions, the layout editor with sample data, preview, publish, delete. */
  import { untrack } from 'svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Page from '#lib/components/Page.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Time from '#lib/components/Time.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import TemplateForm from './TemplateForm.svelte';
  import RenderForm from './RenderForm.svelte';
  import { api, ApiError } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { goto } from '$app/navigation';
  import { useSession } from '#lib/client/session.svelte.js';
  import { t } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  import { SAMPLES, STARTER_DATA } from './starter.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const base = $derived(`/services/${sid}/atc-render/templates/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  $effect(() => { res.load(); });
  const x = $derived(/** @type {any} */ (res.data)?.template);
  const versions = $derived(/** @type {any[]} */ (/** @type {any} */ (res.data)?.versions ?? []));

  // ---- editor
  let layoutText = $state('');
  // Sample data that last previewed fine is kept in memory per template (not browser storage: it may hold real data).
  let dataText = $state(untrack(() => SAMPLES.get(`${sid}/${id}`)) ?? JSON.stringify(STARTER_DATA, null, 2));
  let note = $state('');
  /** @type {number|null} */ let editingFrom = $state(null);
  /** @type {{ path: string, message: string }[]} */ let problems = $state([]);
  let busy = $state(false);
  /** @param {number} v */
  async function loadVersion(v) {
    try {
      const r = /** @type {any} */ (await api.get(`${base}/versions/${v}`));
      layoutText = JSON.stringify(r.version.layout, null, 2);
      editingFrom = v;
      problems = [];
    } catch (e) { toasts.error(e); }
  }
  // Fill the editor once with the latest version; reloads of the page data never overwrite edits.
  $effect(() => { const latest = x?.latestVersion; if (latest) untrack(() => { if (editingFrom === null) loadVersion(latest); }); });
  /** @param {string} text */
  const parse = (text) => { try { return { value: JSON.parse(text), error: null }; } catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; } };
  const layout = $derived(parse(layoutText));
  const data = $derived(parse(dataText || '{}'));
  const valid = $derived(!layout.error && !data.error && layout.value && typeof layout.value === 'object');
  /** @param {unknown} err */
  function show(err) {
    if (err instanceof ApiError && (err.code === 'VALIDATION_FAILED' || err.status === 422)) {
      const d = /** @type {any} */ (err.details);
      problems = Array.isArray(d) ? d.map((p) => ({ path: p.path ?? '', message: p.message ?? '' })) : [{ path: d?.block ?? '', message: err.message }];
      return;
    }
    toasts.error(err);
  }
  async function preview() {
    busy = true;
    try { await api.download(`/services/${sid}/atc-render/preview`, { layout: layout.value, data: data.value ?? {} }, `${id}-preview.pdf`); problems = []; SAMPLES.set(`${sid}/${id}`, dataText); }
    catch (e) { show(e); } finally { busy = false; }
  }
  /** @type {'publish'|'delete'|null} */ let confirm = $state(null);
  async function publish() {
    busy = true;
    try {
      const r = /** @type {any} */ (await api.post(`${base}/versions`, { layout: layout.value, ...(note.trim() ? { note: note.trim() } : {}) }));
      toasts.ok(t('rd.published', { n: r.version.version }));
      editingFrom = r.version.version; note = ''; problems = []; confirm = null;
      await res.load();
    } catch (e) { confirm = null; show(e); } finally { busy = false; }
  }
  async function remove() {
    busy = true;
    try { await api.delete(base); toasts.ok(t('rd.deleted')); goto(`/atc-render/${sid}`); } catch (e) { toasts.error(e); } finally { busy = false; confirm = null; }
  }
  let queueOpen = $state(false);
  /** @param {{ template: string, version: number, data: object, filename?: string, store: boolean }} body */
  async function queue(body) {
    busy = true;
    try { const r = /** @type {any} */ (await api.post(`/services/${sid}/atc-render/renders`, body)); toasts.ok(t('rd.queued', { id: r.job.id })); queueOpen = false; SAMPLES.set(`${sid}/${id}`, dataText); goto(`/atc-render/${sid}/renders/${r.job.id}`); }
    catch (e) { show(e); } finally { busy = false; }
  }
  let editOpen = $state(false);
  /** @param {{ description: string }} body */
  async function describe(body) {
    busy = true;
    try { await api.patch(base, body); toasts.ok(t('rd.updated')); editOpen = false; await res.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page help={t('help.page.renderTemplate')} docs={sid} title={x ? x.name : t('rd.template')} back="/atc-render/{sid}">
  {#snippet actions()}
    {#if x}<button class="btn primary" onclick={preview} disabled={busy || !valid || !session.isAdmin}><Icon name="download" size={16} /><span class="hide-m"> {t('rd.preview')}</span></button>{/if}
    {#if x && session.isAdmin}
      <button class="btn" onclick={() => { confirm = 'publish'; }} disabled={busy || !valid}><Icon name="upload" size={16} /><span class="hide-m"> {t('rd.publish')}</span></button>
      <RowMenu label={t('common.actions')} items={[
        { label: t('rd.queue'), icon: 'clock', run: () => { queueOpen = true; } },
        { label: t('rd.edit'), icon: 'settings', run: () => { editOpen = true; } },
        { label: t('rd.delete'), icon: 'trash', danger: true, run: () => { confirm = 'delete'; } },
      ]} />
    {/if}
    <button class="btn icon" onclick={() => res.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !x}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      {#if x.description}<div class="card"><div class="card-body"><p class="no-margin">{x.description}</p></div></div>{/if}
      <div class="layout two">
        <Panel title={t('rd.editor')} bodyClass="stack">
          {#snippet aside()}{#if editingFrom !== null}<span class="xs faint">{t('rd.editingFrom', { v: editingFrom })}</span>{/if}{/snippet}
          <p class="xs faint no-margin">{t('rd.previewHint')}</p>
          <div class="field"><FieldLabel for="rd-layout" help={t('help.rd.layout')}>{t('rd.layout')}</FieldLabel>
            <textarea id="rd-layout" class="textarea mono editor" rows="18" bind:value={layoutText} spellcheck="false" aria-invalid={layout.error ? 'true' : undefined}></textarea>
            {#if layout.error}<span class="error">{t('rd.invalidJson', { msg: layout.error })}</span>{/if}</div>
          <div class="field"><FieldLabel for="rd-data" help={t('help.rd.data')}>{t('rd.data')}</FieldLabel>
            <textarea id="rd-data" class="textarea mono" rows="6" bind:value={dataText} spellcheck="false" aria-invalid={data.error ? 'true' : undefined}></textarea>
            {#if data.error}<span class="error">{t('rd.invalidJson', { msg: data.error })}</span>{/if}</div>
          {#if session.isAdmin}<div class="field"><FieldLabel for="rd-note" help={t('help.rd.note')}>{t('rd.note')}</FieldLabel><input id="rd-note" class="input" bind:value={note} maxlength="500" /><span class="hint">{t('rd.noteHint')}</span></div>{/if}
          {#if problems.length}
            <div class="problems" role="alert">
              <p class="small danger-text no-margin"><strong>{t('rd.errors')}</strong></p>
              <ul class="small no-margin">{#each problems as p, i (i)}<li>{#if p.path}<code>{p.path}</code> {/if}{p.message}</li>{/each}</ul>
            </div>
          {/if}
        </Panel>

        <Panel title={t('rd.versions')} flush>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('rd.version')}</th><th>{t('rd.note')}</th><th class="hide-m">{t('common.created')}</th><th></th></tr></thead>
            <tbody>
              {#each versions as v (v.version)}
                <tr>
                  <td class="mono">v{v.version}</td>
                  <td class="small truncate note">{v.note || '–'}</td>
                  <td class="hide-m small"><Time value={v.createdAt} /><div class="xs faint mono">{v.createdBy}</div></td>
                  <td class="right"><button class="btn sm ghost" onclick={async () => { await loadVersion(v.version); toasts.info(t('rd.loaded', { v: v.version })); }}>{t('rd.loadVersion')}</button></td>
                </tr>
              {/each}
            </tbody>
          </table></div>
        </Panel>
      </div>
    </div>
  {/if}
</Page>

<TemplateForm open={editOpen} initial={x} {busy} onsubmit={describe} onclose={() => { editOpen = false; }} />
<RenderForm open={queueOpen} template={id} version={x?.latestVersion ?? 1} dataText={dataText} {busy} onsubmit={queue} onclose={() => { queueOpen = false; }} />
<Confirm open={confirm === 'publish'} title={t('rd.publish')} message={t('rd.publishDesc', { n: (x?.latestVersion ?? 0) + 1 })} confirmLabel={t('rd.publish')} {busy} onconfirm={publish} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'delete'} title={t('rd.delete')} message={t('rd.deleteDesc')} danger typeWord={x?.name} confirmLabel={t('common.delete')} {busy} onconfirm={remove} oncancel={() => { confirm = null; }} />

<style>
  .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (min-width: 1101px) { .layout.two { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); } }
  .editor { font-size: .8rem; line-height: 1.45; }
  .no-margin { margin: 0; }
  .note { max-width: 200px; }
  .right { text-align: right; }
  .problems { border: 1px solid var(--danger); border-radius: var(--radius-sm); padding: 10px 12px; }
  .problems ul { padding-left: 18px; margin-top: 6px; }
</style>
