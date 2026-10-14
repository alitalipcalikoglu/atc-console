import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.statusMonitorParams, query: Schemas.statusChecksQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, StatusClient).checks(params.id, query as Record<string, string>) });
