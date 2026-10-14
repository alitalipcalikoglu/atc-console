import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, body: Schemas.contentPublish, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, ContentClient).publish(context.params.id, context.body) as any; record(context, 'atc-content.release.publish', context.params.id, { service: context.params.sid, release: output.release.number }); return output; } });
