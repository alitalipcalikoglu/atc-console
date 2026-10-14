import { ServiceClient } from './client.js';

/** Typed wrapper over the payments API. The console's key has the payments service's `write` role. */
export class PaymentsClient extends ServiceClient {
  /** Stripe calls are bounded by STRIPE_TIMEOUT_MS (up to 80 s) on the service. */
  static PROVIDER_MS = 90_000;

  /** @param {string} s */
  static seg(s) { return encodeURIComponent(s); }

  /** @param {Record<string, string|number|undefined>} q */
  payments(q) {
    const p = new URLSearchParams();
    for (const k of ['status', 'limit', 'cursor']) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return this.json('GET', `/v1/payments?${p}`);
  }
  /** @param {string} id */
  payment(id) { return this.json('GET', `/v1/payments/${PaymentsClient.seg(id)}`); }
  /** @param {string} id */
  cancel(id) { return this.json('POST', `/v1/payments/${PaymentsClient.seg(id)}/cancel`, { timeoutMs: PaymentsClient.PROVIDER_MS }); }
  /** @param {string} id */
  sync(id) { return this.json('POST', `/v1/payments/${PaymentsClient.seg(id)}/sync`, { timeoutMs: PaymentsClient.PROVIDER_MS }); }
  /** @param {string} id @param {{ amount?: number, reason?: string }} body @param {string} idempotencyKey */
  refund(id, body, idempotencyKey) { return this.json('POST', `/v1/payments/${PaymentsClient.seg(id)}/refunds`, { body, headers: { 'idempotency-key': idempotencyKey }, timeoutMs: PaymentsClient.PROVIDER_MS }); }
  /** @param {number} limit */
  events(limit) { return this.json('GET', `/v1/provider-events?limit=${limit}`); }
  stats() { return this.json('GET', '/v1/stats'); }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    const count = (/** @type {string} */ k) => Number(s.byStatus[k] ?? 0);
    return { provider: s.provider, succeeded: count('succeeded') + count('partially_refunded') + count('refunded'), pending: count('pending') + count('processing'), volume24h: s.volume24h, outboxDead: s.outbox.dead };
  }
}
