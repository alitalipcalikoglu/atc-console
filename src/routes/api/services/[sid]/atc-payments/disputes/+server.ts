import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, query: Schemas.paymentDisputesQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, PaymentsClient).disputes(query as Record<string, string>) });
