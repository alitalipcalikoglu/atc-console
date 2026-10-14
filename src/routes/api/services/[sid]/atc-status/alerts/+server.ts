import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', query: Schemas.statusAlertsQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, StatusClient).alerts(query as Record<string, string>) });
