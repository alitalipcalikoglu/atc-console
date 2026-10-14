import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { Totp } from '../../src/crypto/totp.js';
import { ADMIN_PASSWORD, CSRF } from '../helpers.js';
import { cookiePair, observed, startConsole } from './helpers.js';

const errors = JSON.parse(readFileSync(new URL('./fixtures/http-errors.json', import.meta.url), 'utf8'));
const jsonHeaders = { 'content-type': 'application/json' };

/** @type {Awaited<ReturnType<typeof startConsole>>} */ let consoleApp;

/** @param {string} username @param {import('../../src/types.js').Role} [role] */
async function createAdmin(username, role = 'admin') {
  if (!consoleApp.admins.byUsername(username)) {
    await consoleApp.adminService.create({ username, name: role === 'admin' ? 'Admin' : 'Viewer', password: ADMIN_PASSWORD, role }, null, { ip: null, userAgent: 'migration-test' });
  }
  return consoleApp.admins.byUsername(username);
}

/** @param {string} username @param {string} [password] @param {Record<string, string>} [headers] */
async function login(username, password = ADMIN_PASSWORD, headers = {}) {
  const response = await fetch(`${consoleApp.origin}/api/session/login`, {
    method: 'POST', headers: { ...jsonHeaders, ...headers }, body: JSON.stringify({ username, password }), redirect: 'manual',
  });
  return { response, cookie: cookiePair(response.headers.get('set-cookie')) };
}

before(async () => {
  consoleApp = await startConsole();
  await createAdmin('admin');
  await createAdmin('viewer', 'viewer');
});

after(async () => consoleApp.close());

test('auth oracle: anonymous, successful login, invalid login and authenticated admin', async () => {
  let actual = await observed(await fetch(`${consoleApp.origin}/api/admins`));
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.unauthenticated);

  const signedIn = await login('admin');
  assert.equal(signedIn.response.status, 200);
  assert.match(signedIn.cookie, /^console_session=[A-Za-z0-9_-]+$/);
  actual = await observed(await fetch(`${consoleApp.origin}/api/session`, { headers: { cookie: signedIn.cookie } }));
  assert.equal(actual.status, 200);
  const signedInAdmin = consoleApp.admins.byUsername('admin');
  assert.ok(signedInAdmin);
  assert.deepEqual(actual.body, {
    admin: { id: signedInAdmin.id, username: 'admin', name: 'Admin', role: 'admin', services: null, status: 'active', totpEnabled: false, lockedUntil: null, createdAt: actual.body.admin.createdAt, updatedAt: actual.body.admin.updatedAt, lastLoginAt: actual.body.admin.lastLoginAt },
    totpPending: false,
  });

  actual = await observed((await login('nobody', 'incorrect password')).response);
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.invalidLogin);
});

test('auth oracle: TOTP pending and completion do not require the CSRF header', async () => {
  const admin = await createAdmin('totp');
  assert.ok(admin);
  const secret = 'JBSWY3DPEHPK3PXP';
  consoleApp.admins.setTotpSecret(admin.id, secret, consoleApp.clock.now);
  consoleApp.admins.enableTotp(admin.id, consoleApp.clock.now);
  const pending = await login('totp');
  assert.equal(pending.response.status, 200);
  assert.deepEqual(await pending.response.json(), { totpRequired: true, admin: null });

  let state = await fetch(`${consoleApp.origin}/api/session`, { headers: { cookie: pending.cookie } });
  assert.deepEqual(await state.json(), { admin: null, totpPending: true });
  const code = Totp.code(secret, Math.floor(consoleApp.clock.now / 30_000));
  const completed = await fetch(`${consoleApp.origin}/api/session/totp`, {
    method: 'POST', headers: { ...jsonHeaders, cookie: pending.cookie }, body: JSON.stringify({ code }),
  });
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).admin.username, 'totp');
});

test('auth oracle: viewer and CSRF role gates preserve canonical errors', async () => {
  const admin = await login('admin');
  let response = await fetch(`${consoleApp.origin}/api/admins`, {
    method: 'POST', headers: { ...jsonHeaders, cookie: admin.cookie },
    body: JSON.stringify({ username: 'new', password: ADMIN_PASSWORD, role: 'viewer' }),
  });
  let actual = await observed(response);
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.missingCsrf);

  const viewer = await login('viewer');
  response = await fetch(`${consoleApp.origin}/api/admins`, {
    method: 'POST', headers: { ...jsonHeaders, ...CSRF, cookie: viewer.cookie },
    body: JSON.stringify({ username: 'new', password: ADMIN_PASSWORD, role: 'viewer' }),
  });
  actual = await observed(response);
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.viewerMutation);
});

test('auth oracle: expiry and explicit revocation invalidate otherwise valid cookies', async () => {
  const expiring = await startConsole();
  try {
    await expiring.adminService.create({ username: 'expiry', name: 'Expiry', password: ADMIN_PASSWORD, role: 'admin' }, null, { ip: null, userAgent: null });
    const loginResponse = await fetch(`${expiring.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ username: 'expiry', password: ADMIN_PASSWORD }) });
    const cookie = cookiePair(loginResponse.headers.get('set-cookie'));
    const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
    const session = expiring.sessions.byToken(token);
    assert.ok(session);
    expiring.db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(Date.now() - 1, session.id);
    assert.deepEqual(await (await fetch(`${expiring.origin}/api/session`, { headers: { cookie } })).json(), { admin: null, totpPending: false });

    const secondLogin = await fetch(`${expiring.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ username: 'expiry', password: ADMIN_PASSWORD }) });
    const secondCookie = cookiePair(secondLogin.headers.get('set-cookie'));
    const secondToken = decodeURIComponent(secondCookie.slice(secondCookie.indexOf('=') + 1));
    const secondSession = expiring.sessions.byToken(secondToken);
    assert.ok(secondSession);
    expiring.sessions.remove(secondSession.id);
    assert.deepEqual(await (await fetch(`${expiring.origin}/api/session`, { headers: { cookie: secondCookie } })).json(), { admin: null, totpPending: false });
  } finally {
    await expiring.close();
  }
});

test('auth oracle: authenticated logout requires CSRF and anonymous logout remains idempotent', async () => {
  const signedIn = await login('admin');
  const rejected = await fetch(`${consoleApp.origin}/api/session/logout`, { method: 'POST', headers: { cookie: signedIn.cookie } });
  assert.equal(rejected.status, 403);
  const logout = await fetch(`${consoleApp.origin}/api/session/logout`, { method: 'POST', headers: { cookie: signedIn.cookie, ...CSRF } });
  assert.equal(logout.status, 204);
  assert.match(String(logout.headers.get('set-cookie')), /^console_session=; Max-Age=0; Path=\/; HttpOnly; SameSite=Strict$/);
  const anonymousLogout = await fetch(`${consoleApp.origin}/api/session/logout`, { method: 'POST' });
  assert.equal(anonymousLogout.status, 204);
});

test('cookie oracle: attributes, deletion and externally observable non-renewal', async () => {
  const insecure = await login('admin');
  const setCookie = insecure.response.headers.get('set-cookie');
  assert.match(String(setCookie), /^console_session=[A-Za-z0-9_-]+; Max-Age=43200; Path=\/; HttpOnly; SameSite=Strict$/);
  const read = await fetch(`${consoleApp.origin}/api/session`, { headers: { cookie: insecure.cookie } });
  assert.equal(read.headers.get('set-cookie'), null, 'session touch does not renew the browser cookie');

  const secureConsole = await startConsole({ env: { COOKIE_SECURE: 'true' } });
  try {
    await secureConsole.adminService.create({ username: 'secure', name: 'Secure', password: ADMIN_PASSWORD, role: 'admin' }, null, { ip: null, userAgent: null });
    const secureLogin = await fetch(`${secureConsole.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ username: 'secure', password: ADMIN_PASSWORD }) });
    assert.match(String(secureLogin.headers.get('set-cookie')), /; Secure$/);
  } finally {
    await secureConsole.close();
  }
});

test('validation oracle: body, query, path, enum, malformed JSON and normal-body cap', async () => {
  let actual = await observed(await fetch(`${consoleApp.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: '{}' }));
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.missingRequired);

  actual = await observed(await fetch(`${consoleApp.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: '{' }));
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.malformedJson);

  actual = await observed(await fetch(`${consoleApp.origin}/api/session/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ username: 'bad', password: 'x', extra: true }) }));
  assert.equal(actual.status, 400);
  assert.deepEqual(actual.body.error, { code: 'VALIDATION_FAILED', message: 'body must NOT have additional properties', details: [{ path: '', message: 'must NOT have additional properties' }] });

  const admin = await login('admin');
  const headers = { cookie: admin.cookie, ...CSRF };
  actual = await observed(await fetch(`${consoleApp.origin}/api/services/NOPE/status`, { headers }));
  assert.deepEqual(actual.body.error.details, [{ path: '/sid', message: 'must match pattern "^[a-z0-9][a-z0-9-]*$"' }]);
  actual = await observed(await fetch(`${consoleApp.origin}/api/audit?limit=201`, { headers }));
  assert.equal(actual.status, 400);
  assert.equal(actual.body.error.code, 'VALIDATION_FAILED');
  actual = await observed(await fetch(`${consoleApp.origin}/api/services/atc-audit/atc-audit/events?outcome=unknown`, { headers }));
  assert.equal(actual.status, 400);
  assert.deepEqual(actual.body.error.details, [{ path: '/outcome', message: 'must be equal to one of the allowed values' }]);

  actual = await observed(await fetch(`${consoleApp.origin}/api/session/login`, {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify({ username: 'large', password: 'x'.repeat(70_000) }),
  }));
  assert.deepEqual({ status: actual.status, body: actual.body }, errors.oversizedJson);
});

test('not-found and common security headers remain observable contracts', async () => {
  const admin = await login('admin');
  const missingId = '00000000-0000-4000-8000-000000000000';
  let actual = await observed(await fetch(`${consoleApp.origin}/api/admins/${missingId}`, { method: 'DELETE', headers: { cookie: admin.cookie, ...CSRF } }));
  assert.equal(actual.status, 404);
  assert.deepEqual(actual.body, { error: { code: 'NOT_FOUND', message: 'admin not found' } });
  assert.equal(actual.headers['cache-control'], 'no-store');
  assert.equal(actual.headers['x-frame-options'], 'DENY');
  assert.equal(actual.headers['x-content-type-options'], 'nosniff');
  assert.equal(actual.headers['referrer-policy'], 'same-origin');
  assert.match(String(actual.headers.traceparent), /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  assert.equal(actual.headers['x-request-id'], null, 'request id is propagated downstream, not echoed to the browser');

  actual = await observed(await fetch(`${consoleApp.origin}/login`));
  assert.equal(actual.status, 200);
  assert.equal(actual.headers['cache-control'], 'no-cache');
  assert.match(String(actual.headers['content-security-policy']), /frame-ancestors 'none'/);
});
