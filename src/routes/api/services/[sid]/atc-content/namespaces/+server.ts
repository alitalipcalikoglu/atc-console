import { ContentClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.serviceParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, ContentClient).namespaces() });
export const POST = jsonRoute({ auth: 'admin', params: Schemas.serviceParams, body: Schemas.contentNamespaceCreate, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, ContentClient).createNamespace(context.body); record(context, 'atc-content.namespace.create', context.body.name, { service: context.params.sid, defaultLocale: context.body.defaultLocale }); return output; } });
