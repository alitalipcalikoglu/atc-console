import { AuthClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, AuthClient).anonymizeUser(context.params.id); record(context, 'atc-auth.user.anonymize', context.params.id, { service: context.params.sid }); } });
