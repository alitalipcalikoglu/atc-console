import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdSubParams, query: Schemas.contentExportQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, ContentClient).exportLocale(params.id, params.sub, { source: text(query.source), format: text(query.format) }) });
