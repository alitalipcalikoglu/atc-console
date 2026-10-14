import { RateLimitClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const PUT = jsonRoute({ auth: 'admin', params: Schemas.serviceIdSubParams, body: Schemas.rlOverride, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, RateLimitClient).setOverride(context.params.id, context.params.sub, context.body); record(context, 'atc-ratelimit.override.set', context.params.sub, { service: context.params.sid, policy: context.params.id, body: context.body }); return output; } });
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.serviceIdSubParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, RateLimitClient).deleteOverride(context.params.id, context.params.sub); record(context, 'atc-ratelimit.override.delete', context.params.sub, { service: context.params.sid, policy: context.params.id }); } });

