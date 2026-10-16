import { StatusClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, StatusClient).maintenance() });
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: Schemas.statusMaintenanceCreate, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, StatusClient).createMaintenance(context.body) as any; record(context, 'atc-status.maintenance.create', output?.maintenance?.id ?? null, { service: context.params.sid, startsAt: context.body.startsAt, endsAt: context.body.endsAt }); return output; } });
