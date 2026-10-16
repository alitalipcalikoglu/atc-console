# Render templates from the console

**Render** page (one per configured `atc-render` service): five stats (templates; renders in the last 24 hours with how many went to media; failures in the last 24 hours; average render time; pages and bytes in the last 24 hours) and the template list (name, description, latest version, last change). **New template** (app bar, admin) asks for a name (permanent) and a description and creates version 1 from a small starter layout, then opens the template.

## The template page

Two panels side by side (stacked on phones):

**Layout editor.** The layout JSON (filled with the latest version when the page opens) and a sample data JSON. Both are checked as you type; invalid JSON is shown under the field and disables the buttons. **Load into editor** on any version replaces the editor content with that version.

**Versions.** Every version, newest first, with its note, author and time.

App bar:

- **Preview PDF** (admin): sends the editor layout and sample data to the render service and downloads the PDF through the console's relay (`POST /api/services/<sid>/atc-render/preview`): an attachment named `<template>-preview.pdf`, sandboxed and never cached; nothing is saved. When the service rejects the layout, a box under the editor lists each problem with its path (for example `/layout/blocks/3/level must be one of the allowed values`, or `blocks[2].rows` for data that does not fit the layout).
- **Publish as new version** (admin, confirmation naming the next number): the editor content, with the optional note, becomes the new latest version. Callers that do not pin a version use it at once.
- ⋯ (admin): **Edit description** and **Delete template** (typed confirmation with the template name; every version goes, callers get 404, PDFs already stored in media stay).

Previews accept up to 2 MiB through the console (other console requests stay at 64 KiB), enough for layouts with a few embedded base64 images; larger ones are previewed directly against the service.

## Render jobs

**Render jobs** (app bar of the Render page) lists the background renders the console queued, newest first, with a status filter (queued, running, succeeded, failed, cancelled) and load more. Only jobs queued with the console's own key appear; applications see their own through the API.

From a template page, ⋯ → **Queue render** opens a dialog: file name (optional), whether the PDF goes to atc-media as a private file, and the data JSON (pre-filled with the editor's sample data). The job is queued with the template's latest version pinned and its page opens.

The job page shows state, pages, size, where the PDF lives, template and version, times and the error of a failed job. App bar: **Download PDF** (admin; streamed through `GET /api/services/<sid>/atc-render/renders/<id>/pdf`, an attachment, sandboxed, never cached), **Open in media** for stored jobs (the short-lived signed link), **Cancel job** (admin, confirmation) while the job is still queued; a running job finishes. **Audit** opens the audit events about the job.

## Fonts

The Render page lists the font families the service loaded from `FONTS_DIR` plus the built-in default (`dejavu`); a layout names one in `page.font`. Adding a family means dropping a TrueType file on the render host; the console only shows what is there.

## Recorded in the console log

`atc-render.template.create`, `atc-render.template.update`, `atc-render.template.delete`, `atc-render.version.create` (version), `atc-render.document.preview` (block count; never the data), `atc-render.job.create` (template, version, store), `atc-render.job.cancel`, `atc-render.job.download`.
