import { FlagsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.flagsQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, FlagsClient).history(null, { limit: number(query.limit), cursor: text(query.cursor) }) });

