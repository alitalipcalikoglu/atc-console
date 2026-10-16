import { ServiceClient } from './client.js';

/** Typed wrapper over the status API. The console's key has the status service's `admin` role. */
export class StatusClient extends ServiceClient {
  /** @param {string} s */
  static seg(s) { return encodeURIComponent(s); }

  /** @param {Record<string, string|number|undefined>} q @param {readonly string[]} keys */
  static params(q, keys) {
    const p = new URLSearchParams();
    for (const k of keys) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return p;
  }

  monitors() { return this.json('GET', '/v1/monitors'); }
  /** @param {string} id */
  monitor(id) { return this.json('GET', `/v1/monitors/${StatusClient.seg(id)}`); }
  /** @param {string} id @param {object} body */
  putMonitor(id, body) { return this.json('PUT', `/v1/monitors/${StatusClient.seg(id)}`, { body }); }
  /** @param {string} id */
  deleteMonitor(id) { return this.json('DELETE', `/v1/monitors/${StatusClient.seg(id)}`); }
  /** A check runs up to its 60 s timeout. @param {string} id */
  check(id) { return this.json('POST', `/v1/monitors/${StatusClient.seg(id)}/check`, { timeoutMs: 70_000 }); }
  /** @param {string} id @param {Record<string, string|number|undefined>} q */
  checks(id, q) { return this.json('GET', `/v1/monitors/${StatusClient.seg(id)}/checks?${StatusClient.params(q, ['limit', 'cursor'])}`); }
  /** @param {Record<string, string|number|undefined>} q */
  incidents(q) { return this.json('GET', `/v1/incidents?${StatusClient.params(q, ['monitor', 'state', 'limit', 'cursor'])}`); }
  /** @param {Record<string, string|number|undefined>} q */
  alerts(q) { return this.json('GET', `/v1/alerts?${StatusClient.params(q, ['state', 'limit', 'cursor'])}`); }
  /** @param {string} id */
  ackAlert(id) { return this.json('POST', `/v1/alerts/${StatusClient.seg(id)}/ack`); }
  /** @param {string} id @param {{ status: string, message: string }} body */
  postIncidentUpdate(id, body) { return this.json('POST', `/v1/incidents/${StatusClient.seg(id)}/updates`, { body }); }
  maintenance() { return this.json('GET', '/v1/maintenance'); }
  /** @param {object} body */
  createMaintenance(body) { return this.json('POST', '/v1/maintenance', { body }); }
  /** @param {string} id */
  deleteMaintenance(id) { return this.json('DELETE', `/v1/maintenance/${StatusClient.seg(id)}`); }
  subscribers() { return this.json('GET', '/v1/subscribers'); }
  /** @param {string} id */
  deleteSubscriber(id) { return this.json('DELETE', `/v1/subscribers/${StatusClient.seg(id)}`); }
  stats() { return this.json('GET', '/v1/stats'); }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { monitors: s.monitors, up: s.up, down: s.down, degraded: s.degraded, openIncidents: s.openIncidents, openAlerts: s.openAlerts ?? 0 };
  }
}
