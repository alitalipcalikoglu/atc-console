import { AuthRequest } from '#lib/server/auth.js';
import { jsonRoute } from '#lib/server/m4.js';

export const GET = jsonRoute({ auth: 'session', handler: async ({ runtime, admin }) => ({ items: AuthRequest.visible(admin, await runtime.clients.overview()), nextCursor: null }) });
