import { BackupClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', params: Schemas.backupParams, handler: ({ runtime, params }) => runtime.clients.get(params.sid, BackupClient).backup(params.id) });
export const DELETE = jsonRoute({ auth: 'admin', params: Schemas.backupParams, status: 204, handler: async (context) => { await context.runtime.clients.get(context.params.sid, BackupClient).remove(context.params.id); record(context, 'atc-backup.backup.delete', context.params.id, { service: context.params.sid }); } });
