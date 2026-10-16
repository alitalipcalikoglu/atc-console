import { MediaClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.paging, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, MediaClient).quarantine({ cursor: text(query.cursor) }) });
