import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The signed-in admin a console API request runs for, available to downstream clients for the
 * whole async lifetime of that request (`X-Actor`). Set only by the route wrappers after the
 * session is resolved; never read for any authorization decision.
 */
export class ActingAdmin {
  // One store per process even when the bundler places this module in several chunks (route code
  // and the composition root can end up with separate copies), so it is keyed on globalThis.
  /** @type {AsyncLocalStorage<string>} */
  static #store = /** @type {any} */ (globalThis)[Symbol.for('atc-console.acting-admin')] ??= new AsyncLocalStorage();

  /**
   * @template T
   * @param {string} username
   * @param {() => T} fn
   * @returns {T}
   */
  static run(username, fn) {
    return ActingAdmin.#store.run(username, fn);
  }

  /** @returns {string|undefined} */
  static get() {
    return ActingAdmin.#store.getStore();
  }
}
