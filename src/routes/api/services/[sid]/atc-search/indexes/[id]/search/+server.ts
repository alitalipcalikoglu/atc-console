import { Schemas, SearchClient } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, body: Schemas.searchBody, handler: ({ runtime, params, body }) => runtime.clients.get(params.sid, SearchClient).search(params.id, body ?? {}) });

