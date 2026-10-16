import { SchedulerClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number, text } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.schedulerQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, SchedulerClient).runs(text(query.job) ?? null, { status: text(query.status), limit: number(query.limit), cursor: text(query.cursor) }) });

