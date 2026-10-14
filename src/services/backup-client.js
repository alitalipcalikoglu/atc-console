import { ServiceClient, ServiceError } from './client.js';

/** Typed wrapper over the backup API. The console's key has the backup service's `admin` role. */
export class BackupClient extends ServiceClient {
  /** Backups, verifies and restores wait for the file work; downloads stream whole databases. */
  static LONG_MS = 300_000;

  /** @param {string} s */
  static seg(s) { return encodeURIComponent(s); }

  sources() { return this.json('GET', '/v1/sources'); }
  /** @param {string} id */
  source(id) { return this.json('GET', `/v1/sources/${BackupClient.seg(id)}`); }
  /** @param {string} id */
  run(id) { return this.json('POST', `/v1/sources/${BackupClient.seg(id)}/backups`, { timeoutMs: BackupClient.LONG_MS }); }
  /** @param {Record<string, string|number|undefined>} q */
  backups(q) {
    const p = new URLSearchParams();
    for (const k of ['source', 'status', 'limit', 'cursor']) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return this.json('GET', `/v1/backups?${p}`);
  }
  /** @param {string} id */
  backup(id) { return this.json('GET', `/v1/backups/${BackupClient.seg(id)}`); }
  /** @param {string} id */
  verify(id) { return this.json('POST', `/v1/backups/${BackupClient.seg(id)}/verify`, { timeoutMs: BackupClient.LONG_MS }); }
  /** @param {string} id */
  drill(id) { return this.json('POST', `/v1/backups/${BackupClient.seg(id)}/drill`, { timeoutMs: BackupClient.LONG_MS }); }
  /** @param {string} id @param {object} body */
  restore(id, body) { return this.json('POST', `/v1/backups/${BackupClient.seg(id)}/restore`, { body, timeoutMs: BackupClient.LONG_MS }); }
  /** @param {string} id */
  remove(id) { return this.json('DELETE', `/v1/backups/${BackupClient.seg(id)}`); }
  stats() { return this.json('GET', '/v1/stats'); }

  /**
   * The backup file for relaying to the browser. Non-2xx becomes a ServiceError with the service's code.
   * @param {string} id
   * @returns {Promise<Response>}
   */
  async file(id) {
    const res = await this.request('GET', `/v1/backups/${BackupClient.seg(id)}/download`, { timeoutMs: BackupClient.LONG_MS, headers: { accept: 'application/vnd.sqlite3, application/json;q=0.5' } });
    if (!res.ok) {
      const data = /** @type {any} */ (await res.json().catch(() => null));
      throw new ServiceError(data?.error?.message ?? `${this.def.id} responded ${res.status}`, { statusCode: res.status, code: data?.error?.code, service: this.def.id });
    }
    return res;
  }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { sources: s.sources, backups: s.backups, bytes: s.bytes, failing: s.failing.length, stale: s.stale.length, drillFailing: (s.drillFailing ?? []).length };
  }
}
