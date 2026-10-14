import { BackupClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.backupSourceParams, status: 201, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, BackupClient).run(context.params.id) as any; record(context, 'atc-backup.backup.create', output.backup.id, { service: context.params.sid, source: context.params.id, status: output.backup.status }); return output; } });
