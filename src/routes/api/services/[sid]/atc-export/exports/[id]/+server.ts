import { ExportClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.exportParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, ExportClient).get(params.id) });
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.exportParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, ExportClient).remove(context.params.id); record(context, 'atc-export.export.delete', context.params.id, { service: context.params.sid }); } });
