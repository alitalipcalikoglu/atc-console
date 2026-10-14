import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.statusAlertParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, StatusClient).ackAlert(context.params.id) as any; record(context, 'atc-status.alert.ack', context.params.id, { service: context.params.sid, type: output.alert?.type }); return output; } });
