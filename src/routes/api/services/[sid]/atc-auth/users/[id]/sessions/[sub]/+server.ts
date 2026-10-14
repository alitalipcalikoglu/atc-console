import { AuthClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.serviceIdSubParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, AuthClient).revokeSession(context.params.id, context.params.sub); record(context, 'atc-auth.user.session.revoke', context.params.id, { service: context.params.sid, sessionId: context.params.sub }); } });

