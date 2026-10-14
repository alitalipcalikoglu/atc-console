# Exports from the console

**Exports** page (one per configured `atc-export` service): five stats (queued, running, succeeded in the last 24 hours with their row count, failed in the last 24 hours, bytes written in the last 24 hours with the total kept in media) and the job list, newest first: source with the short job id, a status badge (with *cancel requested* while a running export winds down), progress in rows and bytes, format, created and finished times. A status filter and a source filter narrow the list; both are kept in the URL. Auto-refresh in the app bar keeps the list moving while exports run.

**New export** (app bar, admin) asks for the source (only the sources configured on the export service are offered), CSV or NDJSON, the source's own filters (required ones are marked; values with a fixed list are selects, dates are ISO strings) and an optional e-mail address for a completion message. Creating it opens the job.

## The job page

Header: status badge, the full id, and the error code and message for failed runs. Stats: rows and size so far (updated at every worker heartbeat), attempts out of the maximum with the next attempt time while a transient failure waits, and the e-mail state when one was requested. Details: source, format, filters, file name, e-mail address, who created it and when, start, finish and when retention deletes it.

App bar:

- **Download** (succeeded jobs with a file): a plain link to the console's own relay `GET /api/services/<sid>/atc-export/exports/<id>/file`. The console asks the export service for a short-lived signed URL, fetches the file from media server-side (no redirects, 60 s timeout) and streams it back as an attachment with a sanitised file name, `text/csv` or `application/x-ndjson` only (anything else becomes `application/octet-stream`), sandboxed and never cached. The browser never needs to reach media, so media can stay internal. Viewers may download; every download is in the console log.
- **Retry** (admin; failed or cancelled jobs, confirmation): the export starts again from the beginning.
- ⋯ (admin): **Cancel export** (queued or running, danger confirmation; a running export stops at its next heartbeat and keeps no file) and **Delete export** (not while running, typed confirmation with the last six characters of the id; the media file goes too).

An NDJSON export with no rows succeeds without a file; the page says so instead of offering a download.

## Recorded in the console log

`atc-export.export.create` (source, format, whether an e-mail was requested), `atc-export.export.cancel`, `atc-export.export.retry`, `atc-export.export.download`, `atc-export.export.delete`.
