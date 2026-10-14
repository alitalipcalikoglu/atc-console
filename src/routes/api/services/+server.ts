import { jsonRoute } from '#lib/server/m4.js';

export const GET = jsonRoute({ auth: 'session', handler: ({ runtime }) => ({ items: runtime.registry.describe() }) });
