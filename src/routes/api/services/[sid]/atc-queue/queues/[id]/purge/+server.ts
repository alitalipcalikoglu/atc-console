import { QueueClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.queueParams, body: Schemas.queuePurge, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, QueueClient).purge(context.params.id, context.body) as any; record(context, 'atc-queue.queue.purge', context.params.id, { service: context.params.sid, state: context.body.state, removed: output.removed }); return output; } });
