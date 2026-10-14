import { FlagsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'session', params: Schemas.serviceParams, body: Schemas.flagsEvaluate, handler: ({ runtime, params, body }) => runtime.clients.get(params.sid, FlagsClient).evaluate(body) });

