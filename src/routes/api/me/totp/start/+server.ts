import { ApiEndpoint } from '#lib/server/api.js';
import { AuthRequest } from '#lib/server/auth.js';
import { Runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (event) => {
  const runtime = Runtime.get();
  return ApiEndpoint.run(runtime, () => {
    const { admin } = AuthRequest.requireSession(runtime, event.locals, { enrolling: true });
    return Response.json(runtime.auth.startTotp(admin));
  });
};
