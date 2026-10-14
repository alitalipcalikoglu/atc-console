import { BackupClient, Schemas } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', query: Schemas.backupListQuery, handler: ({ runtime, params, query }) => runtime.clients.get(params.sid, BackupClient).backups(query as Record<string, string>) });
