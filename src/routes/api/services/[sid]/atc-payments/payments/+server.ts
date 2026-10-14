import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', query: Schemas.paymentsQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, PaymentsClient).payments(query as Record<string, string>) });
