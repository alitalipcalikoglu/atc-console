import { QueueClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.queueParams, body: Schemas.queueRedrive, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, QueueClient).redrive(context.params.id, context.body) as any; record(context, 'atc-queue.message.redrive', context.params.id, { service: context.params.sid, redriven: output.redriven, all: context.body.all === true }); return output; } });
