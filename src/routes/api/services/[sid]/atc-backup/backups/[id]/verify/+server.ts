import { BackupClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute, record } from '#lib/server/m4.js';
export const POST = jsonRoute({ auth: 'admin', params: Schemas.backupParams, handler: async (context) => { const output = await context.runtime.clients.get(context.params.sid, BackupClient).verify(context.params.id) as any; record(context, 'atc-backup.backup.verify', context.params.id, { service: context.params.sid, checksumOk: output.checksumOk, integrity: output.integrity }); return output; } });
