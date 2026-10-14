import { RateLimitClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.rlTopQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, RateLimitClient).top(params.id, { window: number(query.window), limit: number(query.limit) }) });

