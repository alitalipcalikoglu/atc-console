import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.contentReleasesQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, ContentClient).releases(params.id, { limit: number(query.limit), before: number(query.before) }) });
