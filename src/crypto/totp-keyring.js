import { SecretBox } from '@atc-web/atc-service-core/secrets';

/**
 * Current-plus-previous key rotation for TOTP secrets, built on top of core's single-key
 * `SecretBox` (Stage 4.1) — the keyring itself, and the reseal orchestration in `AdminStore.reseal`,
 * are console-specific and deliberately stay out of service-core (see its README: "core is a
 * generic primitive, not a domain framework").
 *
 * Only ever two keys, matching this codebase's established rotation shape (`atc-auth`'s
 * `JWT_PREVIOUS_PUBLIC_KEY_PATH`, `atc-audit`'s `ANCHOR_PREVIOUS_PUBLIC_KEY_PATH`): a `current` key that
 * every new seal uses, and an optional `previous` key kept only long enough to decrypt and reseal
 * whatever was sealed under it. There is no arbitrary history of old keys — once a reseal pass
 * confirms nothing is left under `previous`, drop it from config.
 */
export class TotpKeyring {
  /**
   * @param {object} o
   * @param {Buffer} o.current
   * @param {Buffer|null} [o.previous]
   */
  constructor({ current, previous = null }) {
    this.currentId = SecretBox.keyId(current);
    this.#currentBox = new SecretBox(current, { keyId: this.currentId });
    const previousId = previous ? SecretBox.keyId(previous) : null;
    this.previousId = previousId;
    this.#previousBox = previous && previousId ? new SecretBox(previous, { keyId: previousId }) : null;
  }

  /** @type {SecretBox} */
  #currentBox;
  /** @type {SecretBox|null} */
  #previousBox;

  /** Seal with the current key only — a new secret is never written under the previous key. @param {string} text */
  seal(text) {
    return this.#currentBox.seal(text);
  }

  /**
   * Open a sealed value under the key its id names. Fail-closed: a value without a key id, or naming
   * a key that is neither the current nor the previous key, throws — it is never tried against the
   * wrong key "just in case".
   * @param {string} sealed
   */
  open(sealed) {
    const keyId = SecretBox.peekKeyId(sealed);
    if (keyId === null) throw new Error('sealed value carries no key id');
    if (keyId === this.currentId) return this.#currentBox.open(sealed);
    if (keyId === this.previousId) return /** @type {SecretBox} */ (this.#previousBox).open(sealed);
    throw new Error(`sealed value was sealed under key "${keyId}", which is neither the configured current ("${this.currentId}") nor previous ("${this.previousId ?? 'none'}") key`);
  }

  /** True when `sealed` is already under the current key — {@link AdminStore.reseal} skips these. @param {string} sealed */
  isCurrent(sealed) {
    return SecretBox.isSealed(sealed) && SecretBox.peekKeyId(sealed) === this.currentId;
  }
}
