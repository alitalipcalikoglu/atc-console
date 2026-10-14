import { ServiceClient, ServiceError } from './client.js';

/** Typed wrapper over the export API. */
export class ExportClient extends ServiceClient {
  /** @param {Record<string, string|number|undefined>} q @param {readonly string[]} keys */
  static params(q, keys) {
    const p = new URLSearchParams();
    for (const k of keys) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return p;
  }

  sources() {
    return this.json('GET', '/v1/sources');
  }

  /** @param {Record<string, string|number|undefined>} q */
  list(q) {
    return this.json('GET', `/v1/exports?${ExportClient.params(q, ['status', 'source', 'limit', 'cursor'])}`);
  }

  /** @param {object} body */
  create(body) {
    return this.json('POST', '/v1/exports', { body });
  }

  /** @param {string} id */
  get(id) {
    return this.json('GET', `/v1/exports/${encodeURIComponent(id)}`);
  }

  /** @param {string} id */
  cancel(id) {
    return this.json('POST', `/v1/exports/${encodeURIComponent(id)}/cancel`);
  }

  /** @param {string} id */
  retry(id) {
    return this.json('POST', `/v1/exports/${encodeURIComponent(id)}/retry`);
  }

  /** @param {string} id */
  download(id) {
    return this.json('GET', `/v1/exports/${encodeURIComponent(id)}/download`);
  }

  /**
   * The export file's bytes for relaying to the browser: asks the export service for a signed URL
   * and fetches it server-side, so the browser never needs to reach media. No redirects; errors
   * become ServiceErrors like every other downstream call.
   * @param {string} id
   * @returns {Promise<Response>}
   */
  async file(id) {
    const { url } = /** @type {{ url: string }} */ (await this.download(id));
    const target = new URL(url);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new ServiceError(`${this.def.id} returned a non-http download URL`, { statusCode: 502, code: 'UPSTREAM_ERROR', service: this.def.id });
    let res;
    try {
      res = await this.fetch(target, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(60_000) });
    } catch (err) {
      const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      throw new ServiceError(`export file ${timeout ? 'timed out' : 'unreachable'}`, { statusCode: timeout ? 504 : 502, code: timeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE', service: this.def.id });
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new ServiceError(`export file delivery responded ${res.status}`, { statusCode: res.status === 404 ? 404 : 502, code: res.status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR', service: this.def.id });
    }
    return res;
  }

  /**
   * A download name from media's Content-Disposition (`filename*` preferred), reduced to
   * `[A-Za-z0-9._-]`; falls back to `<id>.<ext>`.
   * @param {string|null} disposition @param {string} id @param {string} ext
   */
  static fileName(disposition, id, ext) {
    let name = '';
    const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition ?? '');
    const plain = /filename\s*=\s*"([^"]*)"/i.exec(disposition ?? '') ?? /filename\s*=\s*([^;\s]+)/i.exec(disposition ?? '');
    try { name = star ? decodeURIComponent(star[1]) : plain?.[1] ?? ''; } catch { name = plain?.[1] ?? ''; }
    name = name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+/, '').slice(0, 120) ?? '';
    return name || `${id}.${ext}`;
  }

  /** @param {string} id */
  remove(id) {
    return this.json('DELETE', `/v1/exports/${encodeURIComponent(id)}`);
  }

  stats() {
    return this.json('GET', '/v1/stats');
  }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { queued: s.queued, running: s.running, succeeded24h: s.last24h.succeeded, failed24h: s.last24h.failed, bytes24h: s.last24h.bytes, storedBytes: s.storedBytes };
  }
}
