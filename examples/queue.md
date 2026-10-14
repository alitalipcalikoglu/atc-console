# Queues from the console

**Queues** page (one per configured `atc-queue` service; the console's key there has the `admin` role): five stats (queues; ready messages with the delayed count; messages in progress; dead letters; age of the oldest waiting message, highlighted above five minutes) and the queue list with depth by state and a *Paused* badge. **New queue** (app bar, admin) asks for the name (permanent), a description, the lease time, the maximum attempts and the backoff base and maximum.

## The queue page

Four stats (ready with the oldest waiting age, delayed, in progress, dead letters), the settings with the lifetime counters (enqueued, delivered, acked, nacked, expired, dead, redriven) and the message list with a state switch (Ready, Delayed, In progress, Dead letters; kept in the URL) and paging. Clicking a message opens it: state, attempts, dedupe key, the JSON body, who enqueued it and when, when it is due, the lease end and the last error.

Per message (admin, not while in progress): **Redrive** (dead letters, confirmation) and **Delete message** (danger confirmation).

App bar (admin):

- **Send message**: a JSON body (checked as you type), an optional delay, priority and dedupe key; useful to test a worker. A dedupe key that is already in the queue says so instead of adding a second message.
- **Redrive all dead letters** (shown when there are any; confirmation).
- ⋯: **Edit settings**, **Pause** / **Resume** (pulls return nothing while paused), **Purge ready messages**, **Purge dead letters**, **Purge everything** (each a typed confirmation with the queue name) and **Delete queue** (typed confirmation; the queue goes with every message in it).

## Recorded in the console log

`atc-queue.queue.upsert` (created, settings), `atc-queue.queue.delete`, `atc-queue.queue.purge` (state, removed), `atc-queue.message.redrive` (count, all), `atc-queue.message.enqueue`, `atc-queue.message.delete`.
