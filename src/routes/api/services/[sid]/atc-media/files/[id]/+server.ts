import { MediaClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
const patch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { name: { type: 'string', minLength: 1, maxLength: 255 }, visibility: { type: 'string', enum: ['public', 'private'] } } };
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceIdParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, MediaClient).getFile(params.id) });
export const PATCH = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, body: patch, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, MediaClient).patchFile(context.params.id, context.body); record(context, 'atc-media.file.update', context.params.id, { service: context.params.sid, patch: context.body }); return output; } });
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.serviceIdParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, MediaClient).deleteFile(context.params.id); record(context, 'atc-media.file.delete', context.params.id, { service: context.params.sid }); } });

