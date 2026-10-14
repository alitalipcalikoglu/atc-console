import { RenderClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
import { SPECIAL_CONTENT_SECURITY_POLICY } from '#lib/server/m5.js';

// Relays a preview PDF: always an attachment, sandboxed, never cached. Admin only (the render
// service requires its write role for previews).
export const POST = jsonRoute({
  auth: 'admin',
  params: Schemas.serviceParams,
  body: Schemas.renderPreview,
  handler: async (context) => {
    const downstream = await context.runtime.clients.get(context.params.sid, RenderClient).preview(context.body);
    record(context, 'atc-render.document.preview', context.params.sid, { service: context.params.sid, blocks: context.body.layout.blocks.length });
    const headers = new Headers({
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="preview.pdf"',
      'content-security-policy': SPECIAL_CONTENT_SECURITY_POLICY,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    for (const name of ['content-length', 'x-render-pages']) { const v = downstream.headers.get(name); if (v && /^\d+$/.test(v)) headers.set(name, v); }
    return new Response(downstream.body, { status: 200, headers });
  },
});
