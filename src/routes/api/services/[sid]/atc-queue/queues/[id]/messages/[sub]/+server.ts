import { QueueClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.queueMessageParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, QueueClient).message(params.id, params.sub) });
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.queueMessageParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, QueueClient).deleteMessage(context.params.id, context.params.sub); record(context, 'atc-queue.message.delete', context.params.sub, { service: context.params.sid, queue: context.params.id }); } });
