import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.statusSubscriberParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, StatusClient).deleteSubscriber(context.params.id); record(context, 'atc-status.subscriber.delete', context.params.id, { service: context.params.sid }); } });
