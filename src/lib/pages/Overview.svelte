<script>
  import { untrack } from 'svelte';
  import Page from '#lib/components/Page.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Time from '#lib/components/Time.svelte';
  import { Services, services } from '#lib/client/services.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  import { poller } from '#lib/client/poller.svelte.js';
  const fmt = $derived(new Fmt(i18n.lang));
  const ICONS = Services.ICONS;
  // First visit probes only the services never seen in this session; afterwards each card refreshes on demand.
  $effect(() => { if (services.loaded) untrack(() => services.refreshMissing()); });
  /**
   * Manual refresh goes through the service's poller so it never overlaps a scheduled run.
   * @param {string} id
   */
  async function refresh(id) { try { await poller.for(id).trigger(); } catch (e) { toasts.error(e); } }

  // Every service registers its status loader with its own poller; the poller decides whether a
  // timer runs (setting on, tab visible) and at what effective interval.
  $effect(() => {
    const unsubs = services.items.map((s) => poller.for(s.id).subscribe(() => services.refreshOne(s.id)));
    return () => { for (const u of unsubs) u(); };
  });
  /** @param {any} o */
  function tone(o) { return !o ? '' : o.health && o.ready ? 'ok' : o.health ? 'warn' : 'danger'; }
  /** @param {any} o */
  function label(o) { return !o ? t('common.loading') : o.health && o.ready ? t('overview.healthy') : o.health ? t('overview.degraded') : t('overview.down'); }
  /** @param {any} s @param {any} o */
  function facts(s, o) {
    const m = o?.summary;
    if (!m || m.error) return [];
    switch (s.type) {
      case 'atc-notify': return [[t('notify.queued'), fmt.int(m.queued)], [t('notify.failed'), fmt.int(m.failed)], [t('notify.sent'), fmt.int(m.sent)], [t('notify.oldest'), fmt.duration(m.oldestQueuedAgeSec)]];
      case 'atc-auth': return [[t('auth.activeUsers'), fmt.int(m.activeUsers)], [t('auth.activeSessions'), fmt.int(m.activeSessions)], [t('auth.disabledUsers'), fmt.int(m.disabledUsers)]];
      case 'atc-media': return [[t('media.files'), fmt.int(m.files)], [t('media.stored'), fmt.bytes(m.storedBytes)], [t('media.downloads'), fmt.int(m.downloads)]];
      case 'atc-gateway': { const routes = Object.values(m.routes ?? {}); const req = routes.reduce((a, /** @type {any} */ r) => a + Object.values(r.requests).reduce((x, y) => x + Number(y), 0), 0); return [[t('gateway.requests'), fmt.int(req)], [t('gateway.routes'), fmt.int(routes.length)], [t('gateway.rateLimited'), fmt.int(m.rejected?.rate_limited ?? 0)]]; }
      case 'atc-audit': return [[t('ev.totalEvents'), fmt.int(m.total)], [t('ev.lastHour'), fmt.int(m.lastHour)], [t('ev.headSeq'), fmt.int(m.headSeq)], [t('ev.dbSize'), fmt.bytes(m.dbBytes)]];
      case 'atc-shortlink': return [[t('sl.activeLinks'), fmt.int(m.activeLinks)], [t('sl.clicks'), fmt.int(m.clicks)], [t('sl.clicksLastHour'), fmt.int(m.clicksLastHour)], [t('sl.inactiveLinks'), fmt.int(m.inactiveLinks)]];
      case 'atc-flags': return [[t('fl.flags'), fmt.int(m.activeFlags)], ...Object.entries(m.enabledByEnv ?? {}).map(([env, n]) => [`${env} ${t('fl.enabledShort')}`, fmt.int(/** @type {number} */ (n))]), [t('fl.archived'), fmt.int(m.archivedFlags)]];
      case 'atc-scheduler': return [[t('sc.enabledJobs'), fmt.int(m.enabledJobs)], [t('sc.nextDue'), m.nextDueSec == null || m.nextDueSec < 0 ? '–' : fmt.duration(m.nextDueSec)], [t('sc.status.succeeded'), fmt.int(m.runsByStatus?.succeeded ?? 0)], [t('sc.status.failed'), fmt.int(m.runsByStatus?.failed ?? 0)]];
      case 'atc-webhook-out': return [[t('wh.activeSubs'), fmt.int(m.activeSubscriptions)], [t('wh.status.disabled'), fmt.int(m.disabledSubscriptions)], [t('wh.backlog'), fmt.int(m.backlog)], [t('wh.dstatus.failed'), fmt.int(m.deliveriesByStatus?.failed ?? 0)]];
      case 'atc-search': return [[t('se.indexes'), fmt.int(m.indexes)], [t('se.documents'), fmt.int(m.documents)], [t('se.searches'), fmt.int(Object.values(m.queriesByIndex ?? {}).reduce((a, n) => a + Number(n), 0))], [t('se.dbSize'), fmt.bytes(m.dbBytes)]];
      case 'atc-ratelimit': return [[t('rl.policies'), fmt.int(m.policies)], [t('rl.allowedShort'), fmt.int(m.allowed)], [t('rl.deniedShort'), fmt.int(m.denied)], [t('rl.counters'), fmt.int(m.counters)]];
      case 'atc-geo': return [[t('ge.lookups'), fmt.int(m.lookupsTotal)], [t('ge.database'), m.databaseLoaded ? t('ge.loaded') : t('ge.none')], [t('ge.collections'), fmt.int(m.collections)], [t('ge.places'), fmt.int(m.places)]];
      case 'atc-content': return [[t('ct.namespaces'), fmt.int(m.namespaces)], [t('ct.keys'), fmt.int(m.keys)], [t('ct.missing'), fmt.int(m.missing)], [t('ct.lastPublish'), m.lastPublish ?? t('ct.never')]];
      case 'atc-export': return [[t('ex.queued'), fmt.int(m.queued)], [t('ex.running'), fmt.int(m.running)], [t('ex.succeeded24h'), fmt.int(m.succeeded24h)], [t('ex.failed24h'), fmt.int(m.failed24h)]];
      case 'atc-render': return [[t('rd.templates'), fmt.int(m.templates)], [t('rd.renders24h'), fmt.int(m.renders24h)], [t('rd.failed24h'), fmt.int(m.failed24h)], [t('rd.avgMs'), fmt.ms(m.avgMs)]];
      case 'atc-queue': return [[t('qu.queues'), fmt.int(m.queues)], [t('qu.ready'), fmt.int(m.ready)], [t('qu.leased'), fmt.int(m.leased)], [t('qu.dead'), fmt.int(m.dead)]];
      default: return [];
    }
  }
</script>

<Page title={t('overview.title')} desc={t('overview.desc')}>
  <div class="grid services">
    {#each services.items as s (s.id)}
      {@const o = services.overview[s.id]}
      {@const p = poller.for(s.id)}
      {@const rows = facts(s, o)}
      <div class="card service">
        <div class="head">
          <a href="/{s.type}/{s.id}" class="icon-wrap" aria-label={t('overview.open')}><Icon name={ICONS[s.type]} size={20} /></a>
          <div class="grow title">
            <a href="/{s.type}/{s.id}" class="name truncate">{s.label}</a>
            <div class="xs faint truncate">{s.type} · <span class="mono">{s.url.replace(/^https?:\/\//, '')}</span></div>
          </div>
          <span class="badge {tone(o)}">{label(o)}</span>
        </div>
        <div class="body">
          {#if o?.summary?.error}
            <p class="small warn-text">{t('overview.noMetrics')}: {o.summary.error}</p>
          {:else if rows.length}
            <dl class="stats">{#each rows as [k, v] (k)}<div><dt class="truncate" title={k}>{k}</dt><dd>{v}</dd></div>{/each}</dl>
          {:else if o}
            <p class="small faint">{t('overview.noMetrics')}</p>
          {:else}
            <div class="skeleton" style="height:96px"></div>
          {/if}
        </div>
        <div class="foot">
          <span class="grow truncate xs faint">
            {#if o}{t('overview.latency')} {fmt.ms(o.latencyMs)}{#if o.summary?.uptimeSec != null}{' · '}{t('overview.uptime')} {fmt.duration(o.summary.uptimeSec)}{/if}{#if services.refreshedAt[s.id]}{' · '}<Time value={services.refreshedAt[s.id]} />{/if}{/if}
          </span>
          {#if p.running}<span class="countdown" title="{t('poll.label')}: {p.effectiveSec} s"><Icon name="clock" size={12} />{p.inFlight ? '…' : `${p.countdown}s`}</span>{/if}
          <button class="btn ghost icon sm" onclick={() => refresh(s.id)} disabled={p.inFlight} aria-label="{t('common.refresh')} {s.label}" title={t('common.refresh')}><Icon name="refresh" size={14} /></button>
        </div>
      </div>
    {/each}
  </div>
</Page>

<style>
  .services { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); align-items: stretch; }
  .service { display: flex; flex-direction: column; min-width: 0; }
  .head { display: flex; align-items: center; gap: 12px; padding: 14px 16px 0; min-width: 0; }
  .title { min-width: 0; }
  .name { display: block; font-weight: 650; color: inherit; }
  .service a:hover { text-decoration: none; }
  .icon-wrap { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); flex: none; }
  .body { flex: 1; padding: 14px 16px; }
  .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; }
  .stats > div { min-width: 0; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--surface-2); }
  .stats dt { font-size: .75rem; color: var(--text-3); }
  .stats dt::first-letter { text-transform: uppercase; }
  .stats dd { margin: 2px 0 0; font-size: 1.05rem; font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .foot { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 8px 0 16px; border-top: 1px solid var(--border); min-width: 0; }
  /* Fixed width so the ticking number never moves the footer. */
  .countdown { display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; width: 5ch; flex: none; font-family: var(--mono); font-size: .75rem; font-variant-numeric: tabular-nums; color: var(--text-3); }
</style>
