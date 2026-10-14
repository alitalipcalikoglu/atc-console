# Backups from the console

**Backups** page (one per configured `atc-backup` service; the console's key there has the `admin` role): five stats (sources with the schedule; backups kept with the retention rule; stored size and whether copies go to atc-media; failing sources; stale sources), the source list and the backup history.

## Sources

Each source shows its live file name (never the full path), the newest backup with its status and age, the live file size, the backups kept and their size, and when the next scheduled backup is due. **Back up now** (admin) runs one and waits for it; a failed attempt shows its error in a toast and in the history. The button is disabled while that source is being backed up or when its file is missing.

## History

Newest first, with a status switch (All, OK, Failed; kept in the URL) and paging. A failed row shows its error. Click a row for the backup page.

## The backup page

Status, source, trigger (scheduled, manual, before restore), who created it, start time and duration, file name, size and page count, the SHA-256 (copyable), the last verification and the atc-media copy (file id or upload error).

App bar (admin, OK backups only):

- **Download**: the database file through the console, as an attachment with `X-Checksum-SHA256`. Admins only, because the file holds everything the source service stores.
- **Restore**: choose *To a file* (a plain file name in the backup service's restore folder; *Replace an existing file* asks for confirmation) or *Live database* (danger: type the source id to confirm). The backup service refuses live restores unless `ALLOW_LIVE_RESTORE=true`; stop the source service first and start it afterwards. A safety backup is taken before the live file is replaced.
- ⋯: **Verify** (re-hashes the file and runs the SQLite integrity check; the result is shown on the page) and **Delete** (typed confirmation with the source id; the file and its media copy go).

## Recorded in the console log

`atc-backup.backup.create` (source, status), `atc-backup.backup.download`, `atc-backup.backup.verify` (checksumOk, integrity), `atc-backup.backup.restore` (live, target, safetyBackupId), `atc-backup.backup.delete`.
