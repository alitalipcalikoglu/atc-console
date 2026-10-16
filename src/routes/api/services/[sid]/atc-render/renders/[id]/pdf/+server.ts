import { ExportClient, RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { record } from '#lib/server/m4.js';
import { SPECIAL_CONTENT_SECURITY_POLICY, specialRoute } from '#lib/server/m5.js';

// Streams a finished job's PDF through the console: always an attachment, sandboxed, never cached.
// Admins only, like the preview: a rendered document can hold personal data.
export const GET = specialRoute({
  auth: 'admin',
  params: Schemas.renderJobParams,
  handler: async (context) => {
    const downstream = await context.runtime.clients.get(context.params.sid, RenderClient).renderPdf(context.params.id);
    const headers = new Headers({
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${ExportClient.fileName(downstream.headers.get('content-disposition'), context.params.id, 'pdf')}"`,
      'content-security-policy': SPECIAL_CONTENT_SECURITY_POLICY,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    const length = downstream.headers.get('content-length');
    if (length && /^\d+$/.test(length)) headers.set('content-length', length);
    record(context, 'atc-render.job.download', context.params.id, { service: context.params.sid });
    return new Response(downstream.body, { status: 200, headers });
  },
});
