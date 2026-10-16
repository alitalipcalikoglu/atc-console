import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.contentKeysQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, ContentClient).keys(params.id, { q: text(query.q), missing: text(query.missing), review: text(query.review), reviewLocale: text(query.reviewLocale), limit: number(query.limit), cursor: text(query.cursor) }) });
