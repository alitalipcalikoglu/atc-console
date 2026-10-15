import { NotifyClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, record, text } from '#lib/server/m4.js';

export const GET = jsonRoute({
  auth: 'session', params: Schemas.serviceParams, query: Schemas.notifySuppressionQuery,
  handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, NotifyClient).listSuppressions({ q: text(query.q), limit: number(query.limit), cursor: text(query.cursor) }),
});

export const POST = jsonRoute({
  auth: 'admin', params: Schemas.serviceParams, body: Schemas.notifySuppression, status: 201,
  handler: async (context) => {
    const output = await context.runtime.clients.get(context.params.sid, NotifyClient).addSuppression(context.body);
    record(context, 'atc-notify.suppression.create', context.body.email, { service: context.params.sid, reason: context.body.reason ?? 'manual' });
    return output;
  },
});
