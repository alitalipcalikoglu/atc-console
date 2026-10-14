import { ExportClient, Schemas } from '#lib/server/m4-contract.js';
import { record } from '#lib/server/m4.js';
import { SPECIAL_CONTENT_SECURITY_POLICY, specialRoute } from '#lib/server/m5.js';

const TYPES: Record<string, string> = { 'text/csv': 'text/csv; charset=utf-8', 'application/x-ndjson': 'application/x-ndjson' };

// Streams the export file through the console (the browser never talks to media). Always an
// attachment, never rendered: fixed content types only, sandboxed, not cached. Admins only, like the
// other downloads: an export can hold personal data.
export const GET = specialRoute({
  auth: 'admin',
  params: Schemas.exportParams,
  handler: async (context) => {
    const downstream = await context.runtime.clients.get(context.params.sid, ExportClient).file(context.params.id);
    const type = (downstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const contentType = TYPES[type] ?? 'application/octet-stream';
    const ext = type === 'text/csv' ? 'csv' : type === 'application/x-ndjson' ? 'ndjson' : 'bin';
    const headers = new Headers({
      'content-type': contentType,
      'content-disposition': `attachment; filename="${ExportClient.fileName(downstream.headers.get('content-disposition'), context.params.id, ext)}"`,
      'content-security-policy': SPECIAL_CONTENT_SECURITY_POLICY,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    const length = downstream.headers.get('content-length');
    if (length && /^\d+$/.test(length)) headers.set('content-length', length);
    record(context, 'atc-export.export.download', context.params.id, { service: context.params.sid });
    return new Response(downstream.body, { status: 200, headers });
  },
});
