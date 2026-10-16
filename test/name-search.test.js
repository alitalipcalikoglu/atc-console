import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NameSearch } from '../src/lib/client/name-search.js';

const SERVICES = [
  { id: 'atc-flags', type: 'atc-flags', label: 'Flags' },
  { id: 'queues-eu', type: 'atc-queue', label: 'Queues EU' },
  { id: 'atc-status', type: 'atc-status', label: 'Status' },
  { id: 'atc-notify', type: 'atc-notify', label: 'Notify' },
];

test('name search: case-insensitive contains, prefix matches first, then alphabetical, capped', () => {
  const items = ['emails.transactional', 'Billing', 'mail-archive', 'emails.marketing', 'x', 'imail', 'email-a', 'email-b', 'email-c', 'email-d', 'email-e', 'email-f'].map((name) => ({ name }));
  const names = (/** @type {any[]} */ r) => r.map((i) => i.name);
  assert.deepEqual(names(NameSearch.match(items, 'MAIL', (i) => i.name)).slice(0, 3), ['mail-archive', 'email-a', 'email-b'], 'prefix hit first, then alphabetical');
  assert.equal(NameSearch.match(items, 'mail', (i) => i.name).length, NameSearch.LIMIT, 'capped');
  assert.deepEqual(NameSearch.match(items, '   ', (i) => i.name), [], 'blank text matches nothing');
  assert.deepEqual(names(NameSearch.match(items, 'billing', (i) => i.name)), ['Billing']);
});

test('name search: asks only scoped services with a source, in parallel, passes q where the service filters, survives failures', async () => {
  /** @type {string[]} */ const asked = [];
  const get = async (/** @type {string} */ path, /** @type {{ signal: AbortSignal }} */ o) => {
    asked.push(path);
    assert.ok(o.signal instanceof AbortSignal, 'every call carries a timeout signal');
    if (path.includes('/atc-flags/')) return { items: [{ key: 'checkout.new' }, { key: 'search.beta' }] };
    if (path.includes('/atc-queue/')) return { items: [{ name: 'emails.transactional' }, { name: 'reports' }] };
    throw new Error('status is down');
  };
  const groups = await NameSearch.query('e', SERVICES, { get });
  assert.deepEqual(asked.sort(), ['/services/atc-flags/atc-flags/flags?limit=50&q=e', '/services/atc-status/atc-status/monitors', '/services/queues-eu/atc-queue/queues'], 'notify has no names to search; flags filters server-side');
  assert.deepEqual(groups, [
    { sid: 'atc-flags', type: 'atc-flags', label: 'Flags', items: [{ name: 'checkout.new', href: '/atc-flags/atc-flags/flags/checkout.new' }, { name: 'search.beta', href: '/atc-flags/atc-flags/flags/search.beta' }] },
    { sid: 'queues-eu', type: 'atc-queue', label: 'Queues EU', items: [{ name: 'emails.transactional', href: '/atc-queue/queues-eu/queues/emails.transactional' }, { name: 'reports', href: '/atc-queue/queues-eu/queues/reports' }] },
  ], 'a failing service contributes nothing; groups keep the service order');
  assert.deepEqual(await NameSearch.query('', SERVICES, { get }), []);
});
