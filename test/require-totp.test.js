import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { signIn, testConsole } from './helpers.js';

const CSRF = { 'x-console-request': '1' };
/** @type {Awaited<ReturnType<typeof testConsole>>} */
let t;
before(async () => { t = await testConsole({ urls: {}, env: { CONSOLE_REQUIRE_TOTP: 'true' } }); });
after(async () => { await t.app.close(); });

test('CONSOLE_REQUIRE_TOTP: an account without a second factor reaches only password, TOTP setup and its own sessions', async () => {
  const { cookie } = await signIn(t, { username: 'enrol', role: 'admin' });
  const blocked = await t.app.inject({ url: '/api/services/overview', headers: { cookie } });
  assert.deepEqual([blocked.statusCode, blocked.json().error.code], [403, 'TOTP_ENROLLMENT_REQUIRED']);
  assert.equal((await t.app.inject({ url: '/api/admins', headers: { cookie } })).statusCode, 403);
  assert.match((await t.app.inject({ method: 'POST', url: '/api/me/totp/start', headers: { cookie, ...CSRF } })).json().uri, /^otpauth:/);
  assert.equal((await t.app.inject({ url: '/api/me/sessions', headers: { cookie } })).statusCode, 200);
  assert.equal((await t.app.inject({ url: '/api/session', headers: { cookie } })).json().admin.username, 'enrol', 'the session itself still resolves');
});

test('CONSOLE_REQUIRE_TOTP: two-factor cannot be turned off while it is required', async () => {
  const { cookie } = await signIn(t, { username: 'enrol2', role: 'admin' });
  const res = await t.app.inject({ method: 'POST', url: '/api/me/totp/disable', headers: { cookie, ...CSRF }, payload: { password: 'x', code: '123456' } });
  assert.equal(res.statusCode, 403);
});
