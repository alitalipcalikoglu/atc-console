<script>
  /** Application frame: side navigation (an off-canvas drawer on narrow screens) and a header with page actions. */
  import Icon from './Icon.svelte';
  import Confirm from './Confirm.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page as route } from '$app/state';
  import { useSession } from '#lib/client/session.svelte.js';
  const session = useSession();
  import { Services, services } from '#lib/client/services.svelte.js';
  import { theme } from '#lib/client/theme.svelte.js';
  import { pwa } from '#lib/client/pwa.svelte.js';
  import { page } from '#lib/client/page.svelte.js';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ children: import('svelte').Snippet }} */
  let { children } = $props();
  const ICONS = Services.ICONS;
  const current = $derived(route.url.pathname);
  /** @param {string} href */
  const active = (href) => (href === '/' ? current === '/' : current === href || current.startsWith(`${href}/`));
  let menuOpen = $state(false);
  // Query-string updates are shallow navigations and must not close the drawer.
  afterNavigate(({ shallow }) => { if (!shallow) menuOpen = false; });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') menuOpen = false; }} />

<div class="shell">
  {#if menuOpen}<button class="nav-backdrop" aria-label={t('common.close')} onclick={() => { menuOpen = false; }}></button>{/if}
  <nav id="main-nav" class="nav" class:open={menuOpen} aria-label="main">
    <a href="/" class="brand"><img src="/icons/icon.svg" alt="" width="28" height="28" /> {t('app.name')}</a>
    <a href="/" aria-current={active('/') ? 'page' : undefined}><Icon name="home" /> {t('nav.overview')}</a>
    <div class="section">{t('nav.services')}</div>
    {#each services.items as s (s.id)}
      <a href="/{s.type}/{s.id}" aria-current={active(`/${s.type}/${s.id}`) ? 'page' : undefined}><Icon name={ICONS[s.type]} /> <span class="truncate">{s.label}</span><span class="dot {services.health(s.id)}" title={services.health(s.id)}></span></a>
    {/each}
    <div class="section">{t('nav.console')}</div>
    <a href="/docs" aria-current={active('/docs') ? 'page' : undefined}><Icon name="file" /> {t('nav.docs')}</a>
    <a href="/audit" aria-current={active('/audit') ? 'page' : undefined}><Icon name="list" /> {t('nav.audit')}</a>
    {#if session.isAdmin}<a href="/admins" aria-current={active('/admins') ? 'page' : undefined}><Icon name="shield" /> {t('nav.admins')}</a>{/if}
    <a href="/about" aria-current={active('/about') ? 'page' : undefined}><Icon name="info" /> {t('nav.about')}</a>
    <a href="/account" aria-current={active('/account') ? 'page' : undefined}><Icon name="user" /> {t('nav.account')}</a>
    <div class="grow"></div>
    {#if pwa.canInstall}<button class="btn sm" onclick={() => pwa.install()}><Icon name="download" size={14} /> {t('common.install')}</button>{/if}
    <div class="nav-user">
      <span class="xs faint truncate">{session.admin?.username}</span>
      <button class="btn ghost icon sm" onclick={() => session.requestLogout()} aria-label={t('account.logout')} title={t('account.logout')}><Icon name="logout" /></button>
    </div>
  </nav>

  <div class="main">
    <header class="header">
      <button class="btn ghost icon sm hide-desktop" onclick={() => { menuOpen = true; }} aria-label={t('nav.menu')} title={t('nav.menu')} aria-controls="main-nav" aria-expanded={menuOpen}><Icon name="menu" /></button>
      {#if page.back}<a href={page.back} class="btn ghost icon sm" aria-label={t('common.back')} title={t('common.back')}><Icon name="back" /></a>{/if}
      <div class="grow" style="min-width:0">
        <h1 class="page-title truncate">{page.title}</h1>
        {#if page.desc}<p class="page-desc truncate">{page.desc}</p>{/if}
      </div>
      {#if !pwa.online}<span class="badge warn"><Icon name="wifiOff" size={12} /> {t('common.offline')}</span>{/if}
      {#if session.admin?.role === 'viewer'}<span class="badge plain hide-mobile" title={t('common.viewerNote')}>{t('admins.viewer')}</span>{/if}
      {#if page.actions}<div class="page-actions many">{@render page.actions()}</div>{/if}
      <span class="divider hide-mobile"></span>
      <button class="btn ghost icon hide-mobile" onclick={() => theme.toggle()} aria-label={t('account.theme')} title={t('account.theme')}><Icon name={theme.mode === 'dark' ? 'sun' : 'moon'} /></button>
    </header>
    <main class="content">{@render children()}</main>
  </div>

</div>


<Confirm open={session.logoutPending} title={t('account.logout')} message={t('account.logoutDesc')} confirmLabel={t('account.logout')} onconfirm={() => session.logout().then(() => goto('/login', { replace: true, refreshAll: true }))} oncancel={() => { session.logoutPending = false; }} />

<style>
  .page-title { font-size: 1.05rem; font-weight: 650; line-height: 1.25; }
  .page-desc { font-size: .78rem; color: var(--text-2); line-height: 1.2; }
  .page-actions { display: flex; align-items: center; gap: 8px; flex: none; max-width: 70%; overflow-x: auto; scrollbar-width: none; }
  .page-actions::-webkit-scrollbar { display: none; }
  .page-actions > :global(*) { flex-shrink: 0; } /* an action is never squeezed narrower than its content */
  .divider { width: 1px; height: 22px; background: var(--border); margin: 0 2px; }
  @media (min-width: 901px) { .hide-desktop { display: none; } }
  @media (max-width: 900px) {
    .hide-mobile { display: none; } .page-desc { display: none; }
    .page-actions { max-width: none; overflow: visible; flex-wrap: wrap; justify-content: flex-end; }
    .page-actions.many { flex: 1 1 100%; }
  }
</style>
