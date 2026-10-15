import { NotifyClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.serviceEmailParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, NotifyClient).removeSuppression(context.params.email); record(context, 'atc-notify.suppression.delete', context.params.email, { service: context.params.sid }); } });
