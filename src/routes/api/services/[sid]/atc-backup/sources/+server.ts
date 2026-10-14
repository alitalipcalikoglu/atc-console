import { BackupClient } from '#lib/server/m4-contract.js';
import { jsonRoute } from '#lib/server/m4.js';
export const GET = jsonRoute({ auth: 'session', handler: ({ runtime, params }) => runtime.clients.get(params.sid, BackupClient).sources() });
