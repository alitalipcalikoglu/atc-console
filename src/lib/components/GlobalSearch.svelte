<script>
  /** Global search (Ctrl/Cmd+K): jump to any console page, open a resource by its id, or list its audit events. Rendered outside the app bar (its sticky header would trap the fixed backdrop); the app bar button binds `open`. */
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';
  import HelpTip from './HelpTip.svelte';
  import { goto } from '$app/navigation';
  import { Services, services } from '#lib/client/services.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Links } from '#lib/client/links.js';
  import { NameSearch } from '#lib/client/name-search.js';
  import { api } from '#lib/client/api.js';
  import { t } from '#lib/client/i18n.svelte.js';
  const session = useSession();
  /** @type {{ open: boolean }} */
  let { open = $bindable(false) } = $props();
  let q = $state('');
  /** @type {Awaited<ReturnType<typeof NameSearch.query>>} */ let groups = $state([]);
  let searching = $state(false);
  let seq = 0;
  // Names live in the services: ask them only once the typing pauses, never per keystroke.
  $effect(() => {
    const text = q.trim();
    const mine = ++seq;
    if (text.length < 2 || !open) { groups = []; searching = false; return; }
    const timer = setTimeout(async () => {
      searching = true;
      const found = await NameSearch.query(text, services.items, { get: (path, o) => api.get(path, o) });
      if (mine === seq) { groups = found; searching = false; }
    }, 300);
    return () => clearTimeout(timer);
  });
  const ICONS = /** @type {Record<string, string>} */ (Services.ICONS);
  /** Every page the navigation offers, plus each service's second-level pages. */
  const pages = $derived([
    { href: '/', label: t('nav.overview'), icon: 'home' },
    ...services.items.flatMap((s) => [
      { href: `/${s.type}/${s.id}`, label: s.label, icon: ICONS[s.type] ?? 'info' },
      ...(/** @type {Record<string, string[][]>} */ (Links.PAGES)[s.type] ?? []).map(([path, key]) => ({ href: `/${s.type}/${s.id}/${path}`, label: `${s.label} · ${t(key)}`, icon: ICONS[s.type] ?? 'info' })),
    ]),
    { href: '/docs', label: t('nav.docs'), icon: 'file' },
    { href: '/audit', label: t('nav.audit'), icon: 'list' },
    ...(session.isAdmin ? [{ href: '/admins', label: t('nav.admins'), icon: 'shield' }] : []),
    { href: '/about', label: t('nav.about'), icon: 'info' },
    { href: '/account', label: t('nav.account'), icon: 'user' },
  ]);
  const results = $derived.by(() => {
    const text = q.trim();
    const needle = text.toLocaleLowerCase();
    const byId = Links.forId(text, services.items).map((l) => ({ href: l.href, label: t('links.open', { name: l.label }), icon: 'search', mono: text }));
    const matched = pages.filter((p) => !needle || p.label.toLocaleLowerCase().includes(needle)).slice(0, 12).map((p) => ({ ...p, mono: '' }));
    const audit = text ? Links.audit(text, services.items) : null;
    return [...byId, ...matched, ...(audit ? [{ href: audit, label: t('links.auditFor'), icon: 'history', mono: text }] : [])];
  });
  /** @param {KeyboardEvent} e */
  function onkey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open = !open; }
  }
  /** @param {SubmitEvent} e */
  function submit(e) {
    e.preventDefault();
    const first = results[0];
    if (first) { open = false; q = ''; goto(first.href); }
  }
</script>

<svelte:window onkeydown={onkey} />

<Dialog {open} title={t('links.search')} help={t('help.search.dialog')} onclose={() => { open = false; q = ''; }}>
  <form onsubmit={submit} class="row" style="gap:4px">
    <input id="global-search" class="input grow" type="search" autocomplete="off" placeholder={t('links.placeholder')} bind:value={q} aria-label={t('links.search')} />
    <HelpTip text={t('help.search.query')} for="global-search" />
  </form>
  {#if results.length || groups.length}
    <ul class="results">
      {#each results as r (r.href)}
        <li><a href={r.href} onclick={() => { open = false; q = ''; }}><Icon name={r.icon} size={16} /> <span class="truncate">{r.label}</span>{#if r.mono}<code class="xs truncate">{r.mono}</code>{/if}</a></li>
      {/each}
      {#each groups as g (g.sid)}
        <li class="group xs faint">{g.label}</li>
        {#each g.items as it (it.href)}
          <li><a href={it.href} onclick={() => { open = false; q = ''; }}><Icon name={ICONS[g.type] ?? 'info'} size={16} /> <code class="truncate">{it.name}</code></a></li>
        {/each}
      {/each}
    </ul>
  {:else}
    <p class="small muted" style="margin:12px 0 0">{searching ? t('links.searching') : t('links.none')}</p>
  {/if}
  {#if searching && (results.length || groups.length)}<p class="xs faint" style="margin:8px 0 0" aria-live="polite">{t('links.searching')}</p>{/if}
</Dialog>

<style>
  .results { list-style: none; margin: 12px 0 0; padding: 0; max-height: min(60vh, 420px); overflow-y: auto; }
  .results a { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; color: inherit; text-decoration: none; min-width: 0; }
  .results a:hover, .results a:focus-visible { background: var(--surface-2); }
  .results li:first-child a { background: var(--surface-2); }
  .results code { margin-left: auto; flex: none; max-width: 45%; }
  .results a > code { margin-left: 0; max-width: none; }
  .group { padding: 10px 10px 2px; text-transform: uppercase; letter-spacing: .04em; }
</style>
