import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.paymentDisputeParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, PaymentsClient).acceptDispute(context.params.id) as any; record(context, 'atc-payments.dispute.accept', context.params.id, { service: context.params.sid, status: output?.dispute?.status }); return output; } });
