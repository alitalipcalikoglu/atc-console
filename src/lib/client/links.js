/**
 * Where things live in the console. Every generated id carries its kind as a prefix (`pay_`, `usr_`,
 * …), so an id alone is enough to find its detail page; the global search and the audit cross links
 * share these tables.
 */
export class Links {
  /** Detail page per id prefix: service type and path below `/<type>/<sid>`. */
  static BY_PREFIX = Object.freeze({
    usr: [['atc-auth', 'users']],
    msg: [['atc-notify', 'messages']],
    fil: [['atc-media', 'files']],
    pay: [['atc-payments', 'payments']],
    exp: [['atc-export', 'exports']],
    bk: [['atc-backup', 'backups']],
    run: [['atc-scheduler', 'runs']],
    sub: [['atc-webhook-out', 'subscriptions']],
    dlv: [['atc-webhook-out', 'deliveries']],
    evt: [['atc-webhook-out', 'events'], ['atc-audit', 'events']],
  });

  /** Second-level pages reachable from the search, per service type, as [path, i18n key]. */
  static PAGES = Object.freeze({
    'atc-media': [['quarantine', 'media.quarantine']],
    'atc-notify': [['suppressions', 'notify.suppressions']],
    'atc-payments': [['disputes', 'pm.disputes']],
    'atc-status': [['maintenance', 'stx.maintenance']],
    'atc-flags': [['changes', 'fl.changes']],
    'atc-geo': [['reference', 'ge.reference']],
  });

  static ID = /^([a-z]{2,4})_[0-9a-z]{6,12}[0-9a-f]{16}$/;

  /**
   * Detail pages an id can open, one per configured service instance of the matching type.
   * @param {string} id
   * @param {{ id: string, type: string, label: string }[]} services
   * @returns {{ href: string, type: string, label: string }[]}
   */
  static forId(id, services) {
    const m = Links.ID.exec(id.trim());
    if (!m) return [];
    const targets = /** @type {Record<string, string[][]>} */ (Links.BY_PREFIX)[m[1]] ?? [];
    return targets.flatMap(([type, path]) => services.filter((s) => s.type === type).map((s) => ({ href: `/${type}/${s.id}/${path}/${encodeURIComponent(id.trim())}`, type, label: s.label })));
  }

  /**
   * The audit service's event list filtered to one target, or null without an audit service.
   * @param {string} targetId
   * @param {{ id: string, type: string }[]} services
   */
  static audit(targetId, services) {
    const audit = services.find((s) => s.type === 'atc-audit');
    return audit ? `/atc-audit/${audit.id}?targetId=${encodeURIComponent(targetId)}` : null;
  }
}
