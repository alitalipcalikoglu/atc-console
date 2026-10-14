import { SchedulerClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.schedulerQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, SchedulerClient).listJobs(query as any) });
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: Schemas.schedulerCreate, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, SchedulerClient).createJob(context.body); record(context, 'atc-scheduler.job.create', context.body.name, { service: context.params.sid, schedule: context.body.schedule, url: context.body.target.url }); return output; } });

