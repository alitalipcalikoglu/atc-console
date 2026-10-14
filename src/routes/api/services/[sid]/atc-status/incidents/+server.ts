import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', query: Schemas.statusIncidentsQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, StatusClient).incidents(query as Record<string, string>) });
