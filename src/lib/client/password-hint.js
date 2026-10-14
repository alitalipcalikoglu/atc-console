/** A non-blocking nudge, not a rule: the console accepts any password the operator chooses. */
export class PasswordHint {
  /**
   * True for a password that is short (under 12 characters), one repeated character, or one kind of
   * character only (letters only, digits only).
   * @param {string} pw
   */
  static weak(pw) {
    if (!pw) return false;
    if (pw.length < 12) return true;
    if (new Set(pw).size <= 3) return true;
    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
    return kinds < 2;
  }
}
