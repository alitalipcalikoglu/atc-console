import { GeoClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'session', params: Schemas.serviceParams, body: Schemas.geoIpBatch, handler: ({ runtime, params, body }) => runtime.clients.get(params.sid, GeoClient).ipBatch(body.ips, body.lang) });

