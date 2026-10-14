import { ServiceClient } from './client.js';

/** Typed wrapper over the content API. */
export class ContentClient extends ServiceClient {
  /**
   * @param {Record<string, string|number|undefined>} q
   * @param {readonly string[]} keys
   */
  static params(q, keys) {
    const p = new URLSearchParams();
    for (const k of keys) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return p;
  }

  /** @param {string} s */
  static seg(s) {
    return encodeURIComponent(s);
  }

  stats() {
    return this.json('GET', '/v1/stats');
  }

  namespaces() {
    return this.json('GET', '/v1/namespaces');
  }

  /** @param {object} body */
  createNamespace(body) {
    return this.json('POST', '/v1/namespaces', { body });
  }

  /** @param {string} ns */
  namespace(ns) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}`);
  }

  /** @param {string} ns @param {object} patch */
  patchNamespace(ns, patch) {
    return this.json('PATCH', `/v1/namespaces/${ContentClient.seg(ns)}`, { body: patch });
  }

  /** @param {string} ns */
  deleteNamespace(ns) {
    return this.json('DELETE', `/v1/namespaces/${ContentClient.seg(ns)}`);
  }

  /** @param {string} ns @param {string} locale @param {{ fallback?: string|null }} body */
  setLocale(ns, locale, body) {
    return this.json('PUT', `/v1/namespaces/${ContentClient.seg(ns)}/locales/${ContentClient.seg(locale)}`, { body });
  }

  /** @param {string} ns @param {string} locale */
  deleteLocale(ns, locale) {
    return this.json('DELETE', `/v1/namespaces/${ContentClient.seg(ns)}/locales/${ContentClient.seg(locale)}`);
  }

  /** @param {string} ns @param {Record<string, string|number|undefined>} q */
  keys(ns, q) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}/keys?${ContentClient.params(q, ['q', 'missing', 'limit', 'cursor'])}`);
  }

  /** @param {string} ns @param {string} key */
  key(ns, key) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}/keys/${ContentClient.seg(key)}`);
  }

  /** @param {string} ns @param {string} key @param {object} body */
  putKey(ns, key, body) {
    return this.json('PUT', `/v1/namespaces/${ContentClient.seg(ns)}/keys/${ContentClient.seg(key)}`, { body });
  }

  /** @param {string} ns @param {string} key */
  deleteKey(ns, key) {
    return this.json('DELETE', `/v1/namespaces/${ContentClient.seg(ns)}/keys/${ContentClient.seg(key)}`);
  }

  /** @param {string} ns @param {{ locale: string, strings: object }} body */
  importLocale(ns, body) {
    return this.json('POST', `/v1/namespaces/${ContentClient.seg(ns)}/import`, { body });
  }

  /** @param {string} ns @param {string} locale @param {Record<string, string|undefined>} q */
  exportLocale(ns, locale, q) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}/export/${ContentClient.seg(locale)}?${ContentClient.params(q, ['source', 'format'])}`);
  }

  /** @param {string} ns @param {{ note?: string }} body */
  publish(ns, body) {
    return this.json('POST', `/v1/namespaces/${ContentClient.seg(ns)}/publish`, { body });
  }

  /** @param {string} ns @param {{ release: number, note?: string, restoreDraft?: boolean }} body */
  rollback(ns, body) {
    return this.json('POST', `/v1/namespaces/${ContentClient.seg(ns)}/rollback`, { body });
  }

  /** @param {string} ns @param {Record<string, string|number|undefined>} q */
  releases(ns, q) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}/releases?${ContentClient.params(q, ['limit', 'before'])}`);
  }

  /** @param {string} ns @param {number} number */
  release(ns, number) {
    return this.json('GET', `/v1/namespaces/${ContentClient.seg(ns)}/releases/${number}`);
  }

  /** Overview card facts, from `/v1/stats` (one call, no metrics parsing needed). */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { namespaces: s.namespaces, keys: s.keys, locales: s.locales, missing: s.missing, mismatched: s.mismatched, lastPublish: s.lastPublish ? `${s.lastPublish.namespace} #${s.lastPublish.release}` : null };
  }
}
