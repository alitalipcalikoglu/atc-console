import { RateLimitClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdSubParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, RateLimitClient).subject(params.id, params.sub) });

