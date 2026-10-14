import { GeoClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.geoCountriesQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, GeoClient).countries(query as any) });

