import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.contentReleaseParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, ContentClient).release(params.id, Number(params.sub)) });
