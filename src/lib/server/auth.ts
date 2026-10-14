import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { AdminService } from '../../domain/admin-service.js';
import { ConsoleError } from '../../domain/errors.js';
import type { AdminRow, SessionRow } from '../../types.js';
import type { ConsoleRuntime } from './runtime.js';

export const SESSION_COOKIE = 'console_session';
export const CSRF_HEADER = 'x-console-request';

export class AuthRequest {
  static attach(runtime: ConsoleRuntime, cookies: Cookies, locals: App.Locals) {
    const resolved = runtime.auth.resolve(cookies.get(SESSION_COOKIE));
    if (!resolved) {
      locals.principal = null;
      locals.session = null;
      return;
    }
    const { admin, session } = resolved;
    locals.principal = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      totpEnabled: admin.totp_enabled_at !== null,
    };
    locals.session = {
      id: session.id,
      adminId: session.admin_id,
      createdAt: session.created_at,
      lastSeenAt: session.last_seen_at,
      expiresAt: session.expires_at,
      totpPending: session.totp_pending === 1,
    };
  }

  static resolved(runtime: ConsoleRuntime, locals: App.Locals): { admin: AdminRow; session: SessionRow } | null {
    if (!locals.principal || !locals.session) return null;
    const admin = runtime.admins.byId(locals.principal.id);
    const session = runtime.sessions.byId(locals.session.id);
    return admin && session ? { admin, session } : null;
  }

  /** `enrolling` routes (password, two-factor setup) stay open to an account that must still enrol a second factor (REQUIRE_TOTP). */
  static requireSession(runtime: ConsoleRuntime, locals: App.Locals, opts: { enrolling?: boolean } = {}) {
    const resolved = AuthRequest.resolved(runtime, locals);
    if (!resolved) throw new ConsoleError('UNAUTHENTICATED', 'sign in required');
    if (resolved.session.totp_pending === 1) throw new ConsoleError('TOTP_REQUIRED', 'second factor required');
    if (runtime.config.requireTotp && resolved.admin.totp_enabled_at === null && !opts.enrolling) throw new ConsoleError('TOTP_ENROLLMENT_REQUIRED', 'set up two-factor authentication on the account page first');
    AuthRequest.requireCsrf(locals);
    return resolved;
  }

  /** A scoped account (limited to some services) may only touch those; the list endpoints use `visible`. */
  static assertService(admin: AdminRow, sid: string | undefined) {
    const scope = AuthRequest.scope(admin);
    if (scope && sid && !scope.includes(sid)) throw new ConsoleError('FORBIDDEN', 'your account has no access to this service');
  }

  static scope(admin: AdminRow): string[] | null {
    return admin.services ? (JSON.parse(admin.services) as string[]) : null;
  }

  static visible<T extends { id: string }>(admin: AdminRow, items: T[]): T[] {
    const scope = AuthRequest.scope(admin);
    return scope ? items.filter((item) => scope.includes(item.id)) : items;
  }

  static requireCsrf(locals: App.Locals) {
    if (locals.csrf.required && !locals.csrf.valid) {
      throw new ConsoleError('FORBIDDEN', `missing ${CSRF_HEADER} header`);
    }
  }

  static requireAdmin(runtime: ConsoleRuntime, locals: App.Locals) {
    const resolved = AuthRequest.requireSession(runtime, locals);
    if (resolved.admin.role !== 'admin') throw new ConsoleError('FORBIDDEN', 'viewers cannot change anything');
    return resolved;
  }

  static context(event: Pick<RequestEvent, 'request' | 'locals'>) {
    const userAgent = event.request.headers.get('user-agent');
    return { ip: event.locals.clientIp, userAgent: userAgent ? userAgent.slice(0, 300) : null };
  }

  static adminView(admin: AdminRow) {
    return AdminService.view(admin);
  }

  static setCookie(cookies: Cookies, runtime: ConsoleRuntime, token: string | null) {
    cookies.set(SESSION_COOKIE, token ?? '', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: runtime.config.cookieSecure,
      maxAge: token ? Math.floor(runtime.config.sessionTtlMin * 60) : 0,
    });
  }
}
