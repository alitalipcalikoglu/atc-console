import { ExportClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
// Any signed-in admin or viewer may download; every signed URL handed out is in the console log.
export const GET = jsonRoute({ auth: 'session', params: Schemas.exportParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, ExportClient).download(context.params.id); record(context, 'atc-export.export.download', context.params.id, { service: context.params.sid }); return output; } });
