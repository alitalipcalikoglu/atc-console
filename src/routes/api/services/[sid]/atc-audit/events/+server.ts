import { AuditClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.auditQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, AuditClient).listEvents(query as Record<string, string | undefined>) });

