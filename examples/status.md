# Status from the console

**Status** page (one per configured `atc-status` service; the console's key there has the `admin` role): five stats (monitors with the paused count; up; degraded; down; open incidents), the open incidents (monitor, since when, latest error, failure count; shown only when there are any) and the monitor list with state, a *Public* badge, 24 h uptime, last latency and last check time. **New monitor** (app bar, admin) asks for the id (permanent), name, URL, description, method, interval, timeout, expected statuses (comma separated), failures before an incident and whether it appears on the public status page. The form checks that the timeout fits in the interval.

## The monitor page

Four stats (state with the last status and latency, or when the incident opened; uptime over 24 h with the average latency, 7 d and 30 d), the settings (method and URL, interval, timeout, expected statuses, threshold, next check, creator; *Public* and *Seeded* badges), the check history (time, pass or fail, HTTP status, latency, error; paging) and the incidents of this monitor (opened, open or resolved, duration, cause, and an alert error when the e-mail could not be sent).

App bar (admin):

- **Check now**: runs one check at once (paused or not); the result is shown in a toast and the page reloads.
- ⋯: **Edit monitor** (a seeded monitor's URL is fixed by `MONITOR_SEEDS`), **Pause** / **Resume**, **Delete** (typed confirmation with the monitor id; not offered for seeded monitors, which would come back on restart).

## Maintenance and subscribers

**Maintenance** (app bar of the status page) lists maintenance windows (title, planned / active / ended, start, end, the monitors they cover or *all monitors*). **Plan maintenance** (admin) asks for a title, an optional public message, start and end in your local time and optional monitor ids separated by commas; during the window those monitors open no incident and send no alert, and the public status page shows the window. **Delete** removes a window after a danger confirmation.

For admins the same page lists the status page's e-mail subscribers (confirmed and awaiting confirmation, the address, when they signed up) with **Remove subscriber** behind a danger confirmation. Without `STATUS_PUBLIC_URL` and notify on the status service subscriptions are off and the page says so.

## DNS monitors and incident updates

**New monitor** offers the *DNS* kind: the target is a host name and a record type (A, AAAA, CNAME, MX, TXT, NS); the check fails when the record does not exist.

On a monitor page every open incident has **Post update** (admin): a status (investigating, cause identified, monitoring the fix, resolved) and a message. The update appears on the public status page and is mailed to confirmed subscribers; *resolved* closes the incident.

## Recorded in the console log

`atc-status.monitor.upsert` (created, settings), `atc-status.monitor.check` (ok), `atc-status.monitor.delete`, `atc-status.maintenance.create` (start, end), `atc-status.maintenance.delete`, `atc-status.incident.update` (status), `atc-status.subscriber.delete`.
