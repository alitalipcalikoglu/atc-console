import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Links } from '../src/lib/client/links.js';

const SERVICES = [
  { id: 'atc-payments', type: 'atc-payments', label: 'Payments' },
  { id: 'hooks', type: 'atc-webhook-out', label: 'Webhooks' },
  { id: 'audit-eu', type: 'atc-audit', label: 'Audit EU' },
];

test('links: a generated id opens its detail page in every instance of the matching type', () => {
  assert.deepEqual(Links.forId(' pay_mv8abcde0123456789abcdef ', SERVICES), [{ href: '/atc-payments/atc-payments/payments/pay_mv8abcde0123456789abcdef', type: 'atc-payments', label: 'Payments' }]);
  assert.deepEqual(Links.forId('evt_mv8abcde0123456789abcdef', SERVICES).map((l) => l.href), ['/atc-webhook-out/hooks/events/evt_mv8abcde0123456789abcdef', '/atc-audit/audit-eu/events/evt_mv8abcde0123456789abcdef'], 'an ambiguous prefix offers each kind');
  assert.deepEqual(Links.forId('usr_mv8abcde0123456789abcdef', SERVICES), [], 'no auth service configured');
  assert.deepEqual(Links.forId('pay_123', SERVICES), [], 'not the id format');
  assert.deepEqual(Links.forId('checkout.new', SERVICES), []);
});

test('links: audit cross link filters the first audit service by target, encoded; none without one', () => {
  assert.equal(Links.audit('emails/high priority', SERVICES), '/atc-audit/audit-eu?targetId=emails%2Fhigh%20priority');
  assert.equal(Links.audit('x', SERVICES.slice(0, 2)), null);
});
