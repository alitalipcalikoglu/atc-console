/**
 * Debounce for list filters. The first call runs at once (the page's initial load must not wait for
 * a typing pause); later calls wait `ms`, so typing does not fire a request per keystroke. Use it
 * from an `$effect` that reads the filters: `timer.schedule(() => load())`, and `timer.cancel()` in
 * the effect's cleanup.
 */
export class FilterTimer {
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  #timer;
  #primed = false;

  /** @param {number} [ms] */
  constructor(ms = 300) {
    this.ms = ms;
  }

  /** @param {() => void} fn */
  schedule(fn) {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(fn, this.#primed ? this.ms : 0);
    this.#primed = true;
  }

  cancel() {
    clearTimeout(this.#timer);
  }
}
