import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.statusMaintenanceParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, StatusClient).deleteMaintenance(context.params.id); record(context, 'atc-status.maintenance.delete', context.params.id, { service: context.params.sid }); } });
