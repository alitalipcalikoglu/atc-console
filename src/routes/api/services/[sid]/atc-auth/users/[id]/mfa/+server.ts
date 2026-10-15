import { AuthClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, AuthClient).resetMfa(context.params.id); record(context, 'atc-auth.user.mfa_reset', context.params.id, { service: context.params.sid }); } });
