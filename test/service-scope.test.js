import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ADMIN_PASSWORD, signIn, testConsole } from './helpers.js';

const CSRF = { 'x-console-request': '1' };
/** @type {Awaited<ReturnType<typeof testConsole>>} */
let t;
before(async () => { t = await testConsole({ urls: { notify: 'http://127.0.0.1:1', status: 'http://127.0.0.1:1', queue: 'http://127.0.0.1:1' } }); });
after(async () => { await t.app.close(); });

test('service scope: an account limited to some services sees and reaches only those, and cannot manage accounts', async () => {
  const root = await signIn(t, { username: 'boss', role: 'admin' });
  const made = await t.app.inject({ method: 'POST', url: '/api/admins', headers: { cookie: root.cookie, ...CSRF }, payload: { username: 'opsq', password: ADMIN_PASSWORD, role: 'admin', services: ['atc-queue'] } });
  assert.deepEqual([made.statusCode, made.json().admin.services], [201, ['atc-queue']]);
  const login = await t.app.inject({ method: 'POST', url: '/api/session/login', payload: { username: 'opsq', password: ADMIN_PASSWORD } });
  const cookie = String(login.headers['set-cookie']).split(';')[0];
  const list = await t.app.inject({ url: '/api/services', headers: { cookie } });
  assert.deepEqual(list.json().items.map((/** @type {any} */ s) => s.id), ['atc-queue']);
  assert.equal((await t.app.inject({ url: '/api/services/atc-status/atc-status/monitors', headers: { cookie } })).statusCode, 403, 'another service');
  assert.notEqual((await t.app.inject({ url: '/api/services/atc-queue/atc-queue/stats', headers: { cookie } })).statusCode, 403, 'its own service is reachable (the fake upstream is down: 502)');
  assert.equal((await t.app.inject({ url: '/api/docs/services/atc-status/openapi', headers: { cookie } })).statusCode, 403);
  const all = await t.app.inject({ url: '/api/services', headers: { cookie: root.cookie } });
  assert.ok(all.json().items.length > 1, 'an unscoped account sees every service');
  // A scoped account cannot widen itself or anyone else.
  const id = made.json().admin.id;
  assert.equal((await t.app.inject({ method: 'PATCH', url: `/api/admins/${id}`, headers: { cookie, ...CSRF }, payload: { services: null } })).statusCode, 403);
  assert.equal((await t.app.inject({ method: 'POST', url: '/api/admins', headers: { cookie, ...CSRF }, payload: { username: 'x1', password: ADMIN_PASSWORD, role: 'viewer' } })).statusCode, 403);
  // The unscoped admin can change the scope back; nobody changes their own.
  assert.equal((await t.app.inject({ method: 'PATCH', url: `/api/admins/${id}`, headers: { cookie: root.cookie, ...CSRF }, payload: { services: ['atc-queue', 'atc-status'] } })).json().admin.services.length, 2);
  const me = (await t.app.inject({ url: '/api/admins', headers: { cookie: root.cookie } })).json().items.find((/** @type {any} */ a) => a.username === 'boss');
  assert.equal((await t.app.inject({ method: 'PATCH', url: `/api/admins/${me.id}`, headers: { cookie: root.cookie, ...CSRF }, payload: { services: ['atc-queue'] } })).statusCode, 409);
  assert.equal((await t.app.inject({ method: 'PATCH', url: `/api/admins/${id}`, headers: { cookie: root.cookie, ...CSRF }, payload: { services: ['Bad Id'] } })).statusCode, 400);
});
