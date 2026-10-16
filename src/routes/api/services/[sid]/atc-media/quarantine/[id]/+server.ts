import { MediaClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.mediaQuarantineParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, MediaClient).deleteQuarantined(context.params.id); record(context, 'atc-media.quarantine.delete', context.params.id, { service: context.params.sid }); } });
