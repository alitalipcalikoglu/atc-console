/**
 * Global search over the names people chose: flag keys, index names, queue names, job names,
 * subscription names, namespaces, policy names, monitors. The services are asked only after the
 * typing pauses (the dialog debounces), in parallel, each with a short timeout; a service that is
 * slow or down simply contributes nothing.
 */
export class NameSearch {
  /** @typedef {{ list: string, server: boolean, name: (item: any) => string, key: (item: any) => string, page: string }} Source */

  /**
   * Per service type: the console list endpoint under `/services/<sid>/<type>/`, whether that
   * endpoint filters by `q` itself (otherwise the whole first page is filtered here), the field
   * that holds the chosen name, the id the detail page expects, and the detail page's path.
   * @type {Record<string, Source>}
   */
  static SOURCES = Object.freeze({
    'atc-flags': { list: 'flags?limit=50', server: true, name: (f) => f.key, key: (f) => f.key, page: 'flags' },
    'atc-scheduler': { list: 'jobs?limit=50', server: true, name: (j) => j.name, key: (j) => j.name, page: 'jobs' },
    'atc-webhook-out': { list: 'subscriptions?limit=50', server: true, name: (s) => s.name, key: (s) => s.id, page: 'subscriptions' },
    'atc-search': { list: 'indexes', server: false, name: (i) => i.name, key: (i) => i.name, page: 'indexes' },
    'atc-queue': { list: 'queues', server: false, name: (q) => q.name, key: (q) => q.name, page: 'queues' },
    'atc-content': { list: 'namespaces', server: false, name: (n) => n.name, key: (n) => n.name, page: 'namespaces' },
    'atc-ratelimit': { list: 'policies', server: false, name: (p) => p.name, key: (p) => p.name, page: 'policies' },
    'atc-status': { list: 'monitors', server: false, name: (m) => m.name || m.id, key: (m) => m.id, page: 'monitors' },
  });

  static LIMIT = 8;
  static TIMEOUT_MS = 1_500;

  /**
   * Case-insensitive "contains" over the names; names that start with the text come first, then
   * alphabetical; at most `LIMIT` of them.
   * @template T
   * @param {T[]} items @param {string} text @param {(item: T) => string} nameOf
   */
  static match(items, text, nameOf) {
    const needle = text.trim().toLocaleLowerCase();
    if (!needle) return [];
    const hit = items.filter((i) => (nameOf(i) ?? '').toLocaleLowerCase().includes(needle));
    const rank = (/** @type {T} */ i) => (nameOf(i).toLocaleLowerCase().startsWith(needle) ? 0 : 1);
    return hit.sort((a, b) => rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b))).slice(0, NameSearch.LIMIT);
  }

  /**
   * Ask every scoped service that has a source, in parallel. The caller passes the services the
   * signed-in account may use; nothing else is ever queried.
   * @param {string} text
   * @param {{ id: string, type: string, label: string }[]} services
   * @param {{ get?: (path: string, o: { signal: AbortSignal }) => Promise<any>, timeoutMs?: number }} [o]
   * @returns {Promise<{ sid: string, type: string, label: string, items: { name: string, href: string }[] }[]>}
   */
  static async query(text, services, { get, timeoutMs = NameSearch.TIMEOUT_MS } = {}) {
    if (!text.trim() || !get) return [];
    const groups = await Promise.all(services.filter((s) => s.type in NameSearch.SOURCES).map(async (s) => {
      const src = NameSearch.SOURCES[s.type];
      const sep = src.list.includes('?') ? '&' : '?';
      const path = `/services/${encodeURIComponent(s.id)}/${s.type}/${src.list}${src.server ? `${sep}q=${encodeURIComponent(text.trim())}` : ''}`;
      try {
        const r = await get(path, { signal: AbortSignal.timeout(timeoutMs) });
        const items = NameSearch.match(/** @type {any[]} */ (r?.items ?? []), text, src.name);
        return { sid: s.id, type: s.type, label: s.label, items: items.map((i) => ({ name: src.name(i), href: `/${s.type}/${s.id}/${src.page}/${encodeURIComponent(src.key(i))}` })) };
      } catch {
        return { sid: s.id, type: s.type, label: s.label, items: [] };
      }
    }));
    return groups.filter((g) => g.items.length);
  }
}
