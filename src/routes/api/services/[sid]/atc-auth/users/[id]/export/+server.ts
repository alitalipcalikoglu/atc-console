import { AuthClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
// Admins only: everything stored about one person. Every export is in the console log.
export const GET = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, AuthClient).exportUser(context.params.id); record(context, 'atc-auth.user.export', context.params.id, { service: context.params.sid }); return output; } });
