# Content from the console

**Content** page (one per configured `atc-content` service): five stats (namespaces with the locale count, keys, missing translations, values that block publishing, last publish with namespace and release) and the namespace list (name, locales, keys, missing, latest release with an *Unpublished changes* badge, publish time). **New namespace** (app bar, admin) asks for the name (permanent), the default locale and a description, then opens the namespace.

## The namespace page

The header card shows whether bundles serve the draft (*Up to date*), an older state (*Unpublished changes*) or nothing yet (*Not published*), the latest release, and how many values block publishing.

**Locales** lists every locale with its lookup chain (`tr-CY → tr → en`) and missing count; clicking the count filters the key table to that locale. Per row (admin, not the default): **Fallback** (pick another locale or none; cycles are refused by the service), **Make default** (confirmation: keys without a value in the new default then block publishing) and **Delete locale** (typed confirmation; refused while another locale falls back to it).

**Keys** has a search box and a *Missing in …* filter (both kept in the URL), a status badge per key (*complete*, *n/m locales*, *placeholder mismatch*) and paging. Clicking a key opens the editor: description and one field per locale, default first, with the default value's `{placeholders}` listed. Only changed fields are sent; an empty field removes that locale's value. A save that leaves other locales with different placeholders is accepted with a notice naming them; a translation with the wrong placeholders is refused with the service's message. **Delete key** (typed confirmation) is in the editor footer. **Add key** creates one.

**Releases** lists releases newest first (note, key count, who and when, *rollback of #n*). Per older release (admin): **Roll back to this release** (confirmation; publishes that content as a new release and keeps the draft) and **Roll back and restore draft** (danger confirmation; also replaces the draft, unpublished edits are lost).

## App bar

- **Publish** (admin, confirmation naming the next release number). When placeholders drifted the service refuses with `UNPUBLISHABLE`; the toast says how many values must be fixed and the *placeholder mismatch* badges in the key table show which.
- **Import** (admin): pick a locale, paste or choose a JSON file (flat or nested). After the import the dialog shows added / updated / unchanged / invalid and the first invalid entries with reasons. The console accepts up to 64 KB per request; import larger files directly against the service.
- **Export**: locale, *Draft* or *Published*, *Flat* or *Nested*; **Load** shows the JSON with copy and download.
- ⋯ (admin): **Edit namespace** (description, default locale) and **Delete namespace** (typed confirmation; deletes every release, bundles answer 404 at once).

## Recorded in the console log

`atc-content.namespace.create`, `atc-content.namespace.update` (the patch), `atc-content.namespace.delete`, `atc-content.locale.upsert` (locale, fallback), `atc-content.locale.delete`, `atc-content.key.upsert` (changed locales; never the text), `atc-content.key.delete`, `atc-content.translations.import` (locale and counts), `atc-content.release.publish` (release), `atc-content.release.rollback` (new release, source release, restoreDraft).
