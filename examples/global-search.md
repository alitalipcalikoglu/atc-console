# Global search and cross links

## Search anything

Press **Ctrl+K** (Cmd+K on a Mac) or the magnifier in the app bar. The dialog matches as you type:

- **Pages**: every service instance by its label, its second-level pages (media quarantine, notify suppressions, payment disputes, status maintenance, flag approvals, geo reference data) and the console pages (overview, API docs, console log, admins, about, account).
- **Ids**: paste a generated id and its detail page comes first. The prefix names the kind, so no service is queried:

| Prefix | Opens |
|---|---|
| `usr_` | auth user |
| `msg_` | notify message |
| `fil_` | media file |
| `pay_` | payment |
| `exp_` | export |
| `rnd_` | render job |
| `bk_` | backup |
| `run_` | scheduler run |
| `sub_`, `dlv_` | webhook subscription, delivery |
| `evt_` | webhook event and audit event (both are offered) |

- **Names people chose**: after a short pause in typing (300 ms) the console asks the services the signed-in account may use, all at once, each with a 1.5 s timeout, for names that contain the text: flag keys, scheduler job names, webhook subscription names (the service filters these three itself), and search index, queue, content namespace, rate-limit policy and monitor names (filtered in the browser from the first page of the list). Results are grouped under the service's label, at most eight per service; a slow or unreachable service simply contributes nothing.
- **Audit**: with an audit service configured, the last entry lists that service's events whose target is exactly what you typed (a payment id, a queue name, a monitor id, a flag key).

Enter opens the first result. With several instances of one service type (media-eu, media-us), an id offers one entry per instance.

## Cross links

Payment, queue, monitor, file and user pages have an **Audit** button in the app bar. It opens the audit service's event list filtered to that item (`/atc-audit/<sid>?targetId=<id>`). An audit event's detail page links back: next to its target, "Open in <service>" goes to the item when its id names a kind the console has a page for.

## Pitfalls

- The audit filter matches the target id exactly; a queue's events are recorded under the queue name, a monitor's under the monitor id.
- Only services the signed-in account may use appear (per-account service scope); the Audit button is missing when no audit service is configured or visible.
- Natural keys (flag keys, index names, link codes) are not looked up across services; type them on the service's own page, or use the audit entry.
