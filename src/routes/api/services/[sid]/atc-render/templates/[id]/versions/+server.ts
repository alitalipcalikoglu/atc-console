import { RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.renderParams, body: Schemas.renderPublish, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, RenderClient).publish(context.params.id, context.body) as any; record(context, 'atc-render.version.create', context.params.id, { service: context.params.sid, version: output.version.version }); return output; } });
