import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.statusIncidentParams, body: Schemas.statusIncidentUpdate, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, StatusClient).postIncidentUpdate(context.params.id, context.body); record(context, 'atc-status.incident.update', context.params.id, { service: context.params.sid, status: context.body.status }); return output; } });
