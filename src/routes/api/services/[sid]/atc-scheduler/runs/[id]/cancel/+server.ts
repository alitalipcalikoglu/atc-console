import { SchedulerClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, SchedulerClient).cancelRun(context.params.id); record(context, 'atc-scheduler.run.cancel', context.params.id, { service: context.params.sid }); return output; } });

