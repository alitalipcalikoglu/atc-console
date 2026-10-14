import { Schemas, SearchClient } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, handler: async (context) => { const output: any = await context.runtime.clients.get(context.params.sid, SearchClient).clearIndex(context.params.id); record(context, 'atc-search.index.clear', context.params.id, { service: context.params.sid, removed: output?.removed ?? null }); return output; } });

