import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.paymentParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, PaymentsClient).anonymize(context.params.id); record(context, 'atc-payments.payment.anonymize', context.params.id, { service: context.params.sid }); return output; } });
