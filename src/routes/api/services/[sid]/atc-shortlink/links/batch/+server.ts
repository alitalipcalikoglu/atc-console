import { Schemas, ShortlinkClient } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: Schemas.shortlinkBatch, handler: async (context) => { const output: any = await context.runtime.clients.get(context.params.sid, ShortlinkClient).createLinks(context.body); record(context, 'atc-shortlink.link.batch', null, { service: context.params.sid, requested: context.body.links.length, created: output?.created ?? null, failed: output?.failed ?? null }); return output; } });
