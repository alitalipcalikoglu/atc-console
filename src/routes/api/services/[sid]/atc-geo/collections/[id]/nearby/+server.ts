import { GeoClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, query: Schemas.geoNearbyQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, GeoClient).nearby(params.id, query as any) });

