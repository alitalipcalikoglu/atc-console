import { FlagsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.flagsChangesQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, FlagsClient).changes({ status: text(query.status), key: text(query.key), limit: number(query.limit) }) });
