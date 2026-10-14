import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.statusMonitorParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, StatusClient).check(context.params.id) as any; record(context, 'atc-status.monitor.check', context.params.id, { service: context.params.sid, ok: output.check?.ok }); return output; } });
