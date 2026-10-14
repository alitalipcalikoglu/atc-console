import { ExportClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.exportParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, ExportClient).retry(context.params.id); record(context, 'atc-export.export.retry', context.params.id, { service: context.params.sid }); return output; } });
