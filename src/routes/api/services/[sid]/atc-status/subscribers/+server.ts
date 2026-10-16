import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, StatusClient).subscribers() });
