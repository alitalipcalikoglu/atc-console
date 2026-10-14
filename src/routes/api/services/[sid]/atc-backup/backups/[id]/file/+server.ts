import { BackupClient, Schemas } from '#lib/server/m4-contract.js';
import { record } from '#lib/server/m4.js';
import { SPECIAL_CONTENT_SECURITY_POLICY, specialRoute } from '#lib/server/m5.js';

// Streams a database backup through the console. Admins only: the file holds everything the source
// service stores. Always an attachment with a fixed type, never cached; the checksum travels along.
export const GET = specialRoute({
  auth: 'admin',
  params: Schemas.backupParams,
  handler: async (context) => {
    const downstream = await context.runtime.clients.get(context.params.sid, BackupClient).file(context.params.id);
    const name = /filename="([A-Za-z0-9._-]{1,160})"/.exec(downstream.headers.get('content-disposition') ?? '')?.[1] ?? `${context.params.id}.db`;
    const headers = new Headers({
      'content-type': 'application/vnd.sqlite3',
      'content-disposition': `attachment; filename="${name}"`,
      'content-security-policy': SPECIAL_CONTENT_SECURITY_POLICY,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    const length = downstream.headers.get('content-length');
    if (length && /^\d+$/.test(length)) headers.set('content-length', length);
    const sha = downstream.headers.get('x-checksum-sha256');
    if (sha && /^[0-9a-f]{64}$/.test(sha)) headers.set('x-checksum-sha256', sha);
    record(context, 'atc-backup.backup.download', context.params.id, { service: context.params.sid });
    return new Response(downstream.body, { status: 200, headers });
  },
});
