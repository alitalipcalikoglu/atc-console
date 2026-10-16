import { RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.renderJobParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, RenderClient).cancelRender(context.params.id); record(context, 'atc-render.job.cancel', context.params.id, { service: context.params.sid }); return output; } });
