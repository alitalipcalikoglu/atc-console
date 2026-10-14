# Operating media

**Media** page: counters (files, unique objects, stored bytes, uploads, downloads), an upload area, and files as a grid with thumbnails or as a table (the choice is remembered).

## Upload

Drop files on the dashed area or click it to pick. Choose **Private** (default) or **Public** first. Each file uploads with a progress bar and appears at the top when done. Images are re-encoded by media (orientation applied, EXIF removed); the toast shows the stored name.

Uploads stream through the console (`PUT /api/services/:id/atc-media/files`), so the browser never needs a media key. Media's own limits apply: type allow-list (`415`), size (`413`), pixel bomb guard (`422`); the toast relays the service's message.

## Previews

Thumbnails and the preview on the file page are fetched through `GET /api/services/:id/atc-media/files/:fid/bytes/:variant`, which asks media for a short-lived signed URL and streams the bytes. Private files therefore preview fine without exposing anything public.

The relay forwards one byte range, so a video or audio preview can seek:

```http
GET /api/services/atc-media/atc-media/files/f_123/bytes/original
Range: bytes=0-1023

HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1023/52428800
Accept-Ranges: bytes
Cache-Control: private, max-age=300
```

A range past the end answers `416` with `Content-Range: bytes */<size>`. Multi-range requests (`bytes=0-1,4-5`) are not forwarded; the whole file comes back with `200`. Responses are cached by the browser only (`private`) for five minutes, so reopening a file page does not download its preview again; QR images use one hour.

## File page

Type, size, dimensions, SHA-256, created; then **Links**: for public files the stable URLs of the original and every variant, for private files **Generate signed link** with a validity in seconds (default 900, max 7 days). Every link has a copy button.

Actions: **Rename** (extension stays consistent with the real type), **Public/Private** toggle, **Delete** (confirmation; the file disappears from lists at once, bytes are removed after media's grace period). A deleted file's page offers **Restore** while the grace period lasts.

## Upload tickets

`POST /api/services/:id/atc-media/tickets` creates a single-use direct-upload address for a browser (see the media service's own examples). The console exposes this for scripting and testing; the audit log records `atc-media.ticket.create`.

## Behind the scenes

| Call | Media endpoint |
|---|---|
| `GET /api/services/:id/atc-media/files?limit=&cursor=` | `GET /v1/files` |
| `GET /api/services/:id/atc-media/files/:fid` | `GET /v1/files/:id` |
| `PUT /api/services/:id/atc-media/files?visibility=&name=` | `PUT /v1/files` (streamed) |
| `PATCH /api/services/:id/atc-media/files/:fid` | `PATCH /v1/files/:id` |
| `DELETE /api/services/:id/atc-media/files/:fid` | `DELETE /v1/files/:id` |
| `POST /api/services/:id/atc-media/files/:fid/restore` | `POST /v1/files/:id/restore` |
| `POST /api/services/:id/atc-media/files/:fid/urls?ttl=` | `POST /v1/files/:id/urls` |
| `GET /api/services/:id/atc-media/files/:fid/bytes/:variant` | signed delivery URL, streamed |
| `POST /api/services/:id/atc-media/tickets` | `POST /v1/uploads` |
