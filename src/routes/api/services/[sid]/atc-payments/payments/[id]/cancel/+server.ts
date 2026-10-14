import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.paymentParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, PaymentsClient).cancel(context.params.id) as any; record(context, 'atc-payments.payment.cancel', context.params.id, { service: context.params.sid, status: output.payment?.status }); return output; } });
