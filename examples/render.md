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

The console accepts request bodies up to 64 KiB, so very large layouts with embedded base64 images are previewed directly against the service.

## Recorded in the console log

`atc-render.template.create`, `atc-render.template.update`, `atc-render.template.delete`, `atc-render.version.create` (version), `atc-render.document.preview` (block count; never the data).
