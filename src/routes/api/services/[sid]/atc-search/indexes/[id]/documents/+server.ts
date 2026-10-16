import { Schemas, SearchClient } from '#lib/server/m4-contract.js';
import { jsonRoute, number, record, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.searchQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, SearchClient).browse(params.id, { limit: number(query.limit), cursor: text(query.cursor) }) });
export const PUT = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, body: Schemas.searchUpsert, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, SearchClient).upsert(context.params.id, context.body.documents); record(context, 'atc-search.documents.upsert', context.params.id, { service: context.params.sid, count: context.body.documents.length }); return output; } });

