import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HELP } from '../src/lib/client/help.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGES = join(ROOT, 'src/lib/pages');
/** Shared form pieces that render controls themselves. */
const COMPONENTS = ['Confirm.svelte', 'ServiceScope.svelte', 'AutoRefresh.svelte'].map((f) => join(ROOT, 'src/lib/components', f));

/** @param {string} dir @returns {string[]} */
function svelteFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? svelteFiles(join(dir, e.name)) : e.name.endsWith('.svelte') ? [join(dir, e.name)] : []));
}

/** The markup of a component: script and style blocks removed (comments there mention tags). @param {string} file */
function markup(file) {
  return readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

/** Opening tags of form controls with their attribute text. @param {string} src */
function controls(src) {
  /** @type {string[]} */ const out = [];
  for (const m of src.matchAll(/<(input|select|textarea)\b/g)) {
    let k = m.index; let depth = 0; let q = '';
    for (; k < src.length; k++) {
      const c = src[k];
      if (q) { if (c === q) q = ''; } else if ((c === '"' || c === "'") && depth === 0) q = c; else if (c === '{') depth++; else if (c === '}') depth--; else if (c === '>' && depth === 0) break;
    }
    out.push(src.slice(m.index, k + 1));
  }
  return out;
}

const files = [...svelteFiles(PAGES), ...COMPONENTS];

test('help tips: every form control in the pages has a HelpTip (FieldLabel, HelpTip for=…, or a HelpTip of its group)', () => {
  /** @type {string[]} */ const missing = [];
  let checked = 0;
  for (const file of files) {
    const src = markup(file);
    for (const tag of controls(src)) {
      if (/\{id\}/.test(tag)) continue; // a reusable value control: its caller labels the id it passes (FieldLabel)
      checked++;
      const group = /data-help-group="([^"]+)"/.exec(tag)?.[1];
      const id = /\sid="([^"]+)"/.exec(tag)?.[1];
      const target = group ?? id;
      const ok = target !== undefined && (src.includes(`<FieldLabel for="${target}"`) || new RegExp(`<HelpTip [^>]*for="${target.replace(/[{}$.*+?()[\]\\|^]/g, '\\$&')}"`).test(src));
      if (!ok) missing.push(`${file.slice(ROOT.length)}: ${tag.slice(0, 90)}`);
    }
  }
  assert.ok(checked > 150, `expected the scan to see the console's forms, saw ${checked} controls`);
  assert.deepEqual(missing, [], 'controls without a HelpTip');
});

test('help tips: every page has a help text and every service page links its API reference; every form dialog explains itself', () => {
  /** @type {string[]} */ const problems = [];
  for (const file of svelteFiles(PAGES)) {
    const src = markup(file);
    const rel = file.slice(PAGES.length + 1);
    for (const m of src.matchAll(/<Page\b[^>]*>/g)) {
      if (!/\shelp=/.test(m[0])) problems.push(`${rel}: <Page> without help`);
      if (rel.includes('/') && !/\sdocs=\{sid\}/.test(m[0])) problems.push(`${rel}: service page without docs={sid}`);
    }
    for (const m of src.matchAll(/<Dialog\b[^>]*>/g)) if (!/\shelp=/.test(m[0])) problems.push(`${rel}: <Dialog> without help`);
  }
  assert.ok(/<HelpTip /.test(markup(join(PAGES, 'Login.svelte'))), 'the sign-in page explains itself');
  assert.deepEqual(problems, []);
});

test('help tips: every help key used in the source exists in English and Turkish, and both languages have the same keys', () => {
  const en = Object.keys(HELP.en).sort();
  const tr = Object.keys(HELP.tr).sort();
  assert.deepEqual(en, tr, 'help keys differ between en and tr');
  const used = new Set();
  for (const file of [...svelteFiles(join(ROOT, 'src/lib')), ...COMPONENTS]) for (const m of readFileSync(file, 'utf8').matchAll(/t\('(help\.[A-Za-z0-9_.-]+)'/g)) used.add(m[1]);
  const missing = [...used].filter((k) => !(k in HELP.en) || !(k in HELP.tr));
  assert.deepEqual(missing, [], 'help keys used but not defined');
  const unused = en.filter((k) => !used.has(k));
  assert.deepEqual(unused, [], 'help keys defined but never used');
  for (const k of en) assert.ok(HELP.en[k].trim() && HELP.tr[k].trim(), `${k} is empty`);
});
