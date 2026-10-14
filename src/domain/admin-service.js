import { ConsoleAuth } from './console-auth.js';
import { ConsoleError } from './errors.js';
import { AdminStore } from '../store/admin-store.js';

/** @typedef {import('../types.js').AdminRow} AdminRow */
/** @typedef {import('../types.js').Role} Role */
/** @typedef {import('./console-auth.js').Ctx} Ctx */

/** Managing console accounts. The console never lets the last active admin disappear. */
export class AdminService {
  static USERNAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;

  /**
   * @param {object} deps
   * @param {import('../store/admin-store.js').AdminStore} deps.admins
   * @param {import('../store/session-store.js').SessionStore} deps.sessions
   * @param {import('../store/audit-store.js').AuditStore} deps.audit
   * @param {import('../crypto/password.js').PasswordHasher} deps.hasher
   * @param {() => number} [deps.now]
   */
  constructor({ admins, sessions, audit, hasher, now = Date.now }) {
    this.admins = admins;
    this.sessions = sessions;
    this.audit = audit;
    this.hasher = hasher;
    this.now = now;
  }

  /** @param {AdminRow} a */
  static view(a) {
    const iso = (/** @type {number|null} */ ms) => (ms === null ? null : new Date(ms).toISOString());
    return {
      id: a.id, username: a.username, name: a.name, role: a.role, status: a.status,
      totpEnabled: a.totp_enabled_at !== null,
      lockedUntil: a.locked_until !== null && a.locked_until > Date.now() ? iso(a.locked_until) : null,
      createdAt: iso(a.created_at), updatedAt: iso(a.updated_at), lastLoginAt: iso(a.last_login_at),
    };
  }

  list() {
    return this.admins.all().map(AdminService.view);
  }

  /**
   * @param {{ username: string, name: string, password: string, role: Role }} input
   * @param {AdminRow|null} actor  Null when created from the CLI.
   * @param {Ctx} ctx
   */
  async create(input, actor, ctx) {
    const username = AdminStore.normalizeUsername(input.username);
    if (!AdminService.USERNAME.test(username)) throw new ConsoleError('INVALID_ARGUMENT', 'username must be 1-64 characters of a-z, 0-9, dot, underscore or hyphen, starting with a letter or digit');
    if (this.admins.byUsername(username)) throw new ConsoleError('USERNAME_TAKEN', 'an account with this username already exists');
    ConsoleAuth.assertPassword(input.password);
    const admin = this.admins.create({ username, name: input.name?.trim() || username, passwordHash: await this.hasher.hash(input.password), role: input.role }, this.now());
    this.audit.record({ adminId: actor?.id ?? null, adminUsername: actor?.username ?? 'cli', action: 'admin.created', target: admin.username, meta: { role: admin.role }, ip: ctx.ip }, this.now());
    return AdminService.view(admin);
  }

  /**
   * @param {string} id
   * @param {{ name?: string, role?: Role, status?: 'active'|'disabled' }} patch
   * @param {AdminRow} actor
   * @param {Ctx} ctx
   */
  update(id, patch, actor, ctx) {
    const target = this.#require(id);
    const demoting = (patch.role === 'viewer' && target.role === 'admin') || (patch.status === 'disabled' && target.status === 'active' && target.role === 'admin');
    if (demoting && this.admins.activeAdminCount() <= 1) throw new ConsoleError('LAST_ADMIN', 'at least one active administrator must remain');
    if (target.id === actor.id && (patch.role === 'viewer' || patch.status === 'disabled')) throw new ConsoleError('CONFLICT', 'you cannot demote or disable your own account');
    const now = this.now();
    if (patch.name !== undefined) this.admins.setName(id, patch.name, now);
    if (patch.role !== undefined) this.admins.setRole(id, patch.role, now);
    if (patch.status !== undefined) {
      this.admins.setStatus(id, patch.status, now);
      if (patch.status === 'disabled') this.sessions.removeOthers(id, '');
    }
    this.audit.record({ adminId: actor.id, adminUsername: actor.username, action: 'admin.updated', target: target.username, meta: patch, ip: ctx.ip }, now);
    return AdminService.view(this.#require(id));
  }

  /**
   * Set a new password for another admin (support flow); their sessions end.
   * @param {string} id
   * @param {string} password
   * @param {AdminRow} actor
   * @param {Ctx} ctx
   */
  async resetPassword(id, password, actor, ctx) {
    const target = this.#require(id);
    ConsoleAuth.assertPassword(password);
    this.admins.setPassword(id, await this.hasher.hash(password), this.now());
    this.sessions.removeOthers(id, '');
    this.audit.record({ adminId: actor.id, adminUsername: actor.username, action: 'admin.password_reset', target: target.username, ip: ctx.ip }, this.now());
  }

  /**
   * Clear a lockout so the person can try again now.
   * @param {string} id
   * @param {AdminRow} actor
   * @param {Ctx} ctx
   */
  unlock(id, actor, ctx) {
    const target = this.#require(id);
    this.admins.recordLoginSuccess(id, target.last_login_at ?? 0);
    this.audit.record({ adminId: actor.id, adminUsername: actor.username, action: 'admin.unlocked', target: target.username, ip: ctx.ip }, this.now());
  }

  /**
   * @param {string} id
   * @param {AdminRow} actor
   * @param {Ctx} ctx
   */
  remove(id, actor, ctx) {
    const target = this.#require(id);
    if (target.id === actor.id) throw new ConsoleError('CONFLICT', 'you cannot delete your own account');
    if (target.role === 'admin' && target.status === 'active' && this.admins.activeAdminCount() <= 1) throw new ConsoleError('LAST_ADMIN', 'at least one active administrator must remain');
    this.admins.remove(id);
    this.audit.record({ adminId: actor.id, adminUsername: actor.username, action: 'admin.deleted', target: target.username, ip: ctx.ip }, this.now());
  }

  /** @param {string} id */
  #require(id) {
    const a = this.admins.byId(id);
    if (!a) throw new ConsoleError('NOT_FOUND', 'admin not found');
    return a;
  }
}
