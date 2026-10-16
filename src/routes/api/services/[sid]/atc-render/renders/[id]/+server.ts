import { RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.renderJobParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, RenderClient).render(params.id) });
