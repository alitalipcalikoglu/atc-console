import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Database } from '../src/db.js';

test('Stage 4.1 migration v1 -> v2: an existing database gains totp_seal_state on upgrade, with its v1 admins intact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'console-db-v1v2-'));
  const path = join(dir, 'console.db');
  try {
    class V1Only extends Database {
      static MIGRATIONS = [Database.MIGRATIONS[0]];
    }
    const v1 = new V1Only(path);
    assert.equal(v1.schemaVersion, 1);
    v1.prepare(`INSERT INTO admins (id, email, name, password_hash, role, created_at, updated_at) VALUES ('a1','a@b.co','A','h','admin',0,0)`).run();
    v1.close();

    class V2Only extends Database {
      static MIGRATIONS = Database.MIGRATIONS.slice(0, 2);
    }
    const v2 = new V2Only(path);
    assert.equal(v2.schemaVersion, 2);
    assert.equal(/** @type {any} */ (v2.prepare("SELECT email FROM admins WHERE id = 'a1'").get()).email, 'a@b.co', 'v1 admin survived the upgrade');
    assert.equal(/** @type {any} */ (v2.prepare("SELECT COUNT(*) n FROM totp_seal_state").get()).n, 0, 'totp_seal_state exists, empty (AdminStore.reseal sets it, not the migration itself)');
    v2.prepare(`INSERT INTO totp_seal_state (id, fully_sealed_at) VALUES (1, 1000)`).run();
    assert.equal(/** @type {any} */ (v2.prepare("SELECT COUNT(*) n FROM totp_seal_state").get()).n, 1);
    v2.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migration v2 -> v3: admin emails become usernames, clashing local parts keep the whole address', () => {
  const dir = mkdtempSync(join(tmpdir(), 'console-db-v2v3-'));
  const path = join(dir, 'console.db');
  try {
    class V2Only extends Database {
      static MIGRATIONS = Database.MIGRATIONS.slice(0, 2);
    }
    const v2 = new V2Only(path);
    const insert = v2.prepare(`INSERT INTO admins (id, email, name, password_hash, role, created_at, updated_at) VALUES (?, ?, 'N', 'h', 'admin', 0, 0)`);
    insert.run('a1', 'a@x.com');
    insert.run('a2', 'a@y.com');
    insert.run('b1', 'bob@z.com');
    v2.prepare(`INSERT INTO audit (admin_id, admin_email, action, at) VALUES ('b1', 'bob@z.com', 'login.succeeded', 1)`).run();
    v2.close();

    const v3 = new Database(path);
    assert.equal(v3.schemaVersion, 3);
    const rows = /** @type {{ id: string, username: string }[]} */ (v3.prepare('SELECT id, username FROM admins ORDER BY id').all());
    assert.deepEqual(rows.map((r) => [r.id, r.username]), [['a1', 'a.x.com'], ['a2', 'a.y.com'], ['b1', 'bob']]);
    assert.equal(/** @type {any} */ (v3.prepare('SELECT admin_username FROM audit').get()).admin_username, 'bob@z.com', 'audit history kept as written');
    v3.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
