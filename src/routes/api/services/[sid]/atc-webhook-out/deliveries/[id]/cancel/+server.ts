import { Schemas, WebhookOutClient } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, WebhookOutClient).cancelDelivery(context.params.id); record(context, 'atc-webhook-out.delivery.cancel', context.params.id, { service: context.params.sid }); return output; } });

