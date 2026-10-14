import { RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, RenderClient).templates() });
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: Schemas.renderCreate, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, RenderClient).createTemplate(context.body); record(context, 'atc-render.template.create', context.body.name, { service: context.params.sid }); return output; } });
