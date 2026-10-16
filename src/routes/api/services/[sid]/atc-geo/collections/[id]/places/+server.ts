import { GeoClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, record, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.searchQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, GeoClient).places(params.id, { limit: number(query.limit), cursor: text(query.cursor) }) });
export const PUT = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, body: Schemas.geoPlaces, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, GeoClient).upsertPlaces(context.params.id, context.body.places); record(context, 'atc-geo.places.upsert', context.params.id, { service: context.params.sid, count: context.body.places.length }); return output; } });

