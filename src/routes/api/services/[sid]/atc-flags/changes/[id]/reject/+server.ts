import { FlagsClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.flagsChangeParams, body: Schemas.flagsReject, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, FlagsClient).rejectChange(context.params.id, context.body ?? {}) as any; record(context, 'atc-flags.change.reject', context.params.id, { service: context.params.sid, key: output?.change?.key, env: output?.change?.env }); return output; } });
