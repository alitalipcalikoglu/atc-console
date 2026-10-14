import { MediaClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: { type: 'object' }, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, MediaClient).createTicket(context.body); record(context, 'atc-media.ticket.create', null, { service: context.params.sid }); return output; } });

