import { PaymentsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, number } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', query: Schemas.paymentEventsQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, PaymentsClient).events(number((query as Record<string, string>).limit) ?? 20) });
