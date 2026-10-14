import { ServiceClient } from './client.js';

/** Typed wrapper over the queue API. The console's key has the queue service's `admin` role. */
export class QueueClient extends ServiceClient {
  /** @param {string} s */
  static seg(s) { return encodeURIComponent(s); }

  /** @param {Record<string, string|number|undefined>} q @param {readonly string[]} keys */
  static params(q, keys) {
    const p = new URLSearchParams();
    for (const k of keys) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return p;
  }

  queues() { return this.json('GET', '/v1/queues'); }
  /** @param {string} name */
  queue(name) { return this.json('GET', `/v1/queues/${QueueClient.seg(name)}`); }
  /** @param {string} name @param {object} body */
  putQueue(name, body) { return this.json('PUT', `/v1/queues/${QueueClient.seg(name)}`, { body }); }
  /** @param {string} name @param {boolean} force */
  deleteQueue(name, force) { return this.json('DELETE', `/v1/queues/${QueueClient.seg(name)}${force ? '?force=true' : ''}`); }
  /** @param {string} name @param {{ state: string }} body */
  purge(name, body) { return this.json('POST', `/v1/queues/${QueueClient.seg(name)}/purge`, { body }); }
  /** @param {string} name @param {object} body */
  redrive(name, body) { return this.json('POST', `/v1/queues/${QueueClient.seg(name)}/redrive`, { body }); }
  /** @param {string} name @param {Record<string, string|number|undefined>} q */
  messages(name, q) { return this.json('GET', `/v1/queues/${QueueClient.seg(name)}/messages?${QueueClient.params(q, ['state', 'limit', 'cursor'])}`); }
  /** @param {string} name @param {object} body */
  enqueue(name, body) { return this.json('POST', `/v1/queues/${QueueClient.seg(name)}/messages`, { body }); }
  /** @param {string} name @param {string} id */
  message(name, id) { return this.json('GET', `/v1/queues/${QueueClient.seg(name)}/messages/${QueueClient.seg(id)}`); }
  /** @param {string} name @param {string} id */
  deleteMessage(name, id) { return this.json('DELETE', `/v1/queues/${QueueClient.seg(name)}/messages/${QueueClient.seg(id)}`); }
  stats() { return this.json('GET', '/v1/stats'); }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { queues: s.queues, ready: s.ready, leased: s.leased, dead: s.dead, oldestReadySec: s.oldestReadySec };
  }
}
