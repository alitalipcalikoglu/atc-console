import { ApiEndpoint } from '#lib/server/api.js';
import { AuthRequest } from '#lib/server/auth.js';
import { Runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  const runtime = Runtime.get();
  return ApiEndpoint.run(runtime, () => {
    const { admin, session } = AuthRequest.requireSession(runtime, locals, { enrolling: true });
    return Response.json({ items: runtime.auth.listSessions(admin, session), nextCursor: null });
  });
};
