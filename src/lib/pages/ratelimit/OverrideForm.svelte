<script>
  /** Set or replace a subject override: custom windows or a block, optional note and expiry. PUT replaces, so the whole body is sent. */
  import Dialog from '#lib/components/Dialog.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import LimitsEditor from '#lib/components/LimitsEditor.svelte';
  import { LimitRows } from '#lib/client/limits.js';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, subject?: string, initial?: any, policyLimits?: any[], busy?: boolean, onsubmit: (subject: string, body: any) => void, onclose: () => void }} */
  let { open, subject = '', initial = null, policyLimits = [], busy = false, onsubmit, onclose } = $props();
  let subj = $state('');
  let mode = $state('limits');
  let note = $state('');
  let expiresAt = $state('');
  /** @type {import('#lib/client/limits.js').LimitRow[]} */ let rows = $state([LimitRows.blank()]);
  /** @param {string|null|undefined} iso */
  const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (/** @type {number} */ n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  $effect(() => {
    if (!open) return;
    subj = initial?.subject ?? subject; note = initial?.note ?? ''; expiresAt = toLocal(initial?.expiresAt);
    mode = initial?.blocked ? 'block' : 'limits';
    const src = initial && !initial.blocked ? initial.limits : policyLimits;
    rows = src?.length ? LimitRows.fromLimits(src) : [LimitRows.blank()];
  });
  const expiryOk = $derived(!expiresAt || Date.parse(expiresAt) > Date.now());
  const valid = $derived(subj.trim().length > 0 && subj.trim().length <= 200 && expiryOk && (mode === 'block' || LimitRows.valid(rows)));
  function submit() {
    if (!valid) return;
    const limits = mode === 'block' ? [{ window: 3600, limit: 0 }] : LimitRows.toLimits(rows);
    onsubmit(subj.trim(), { limits, note: note.trim(), expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null });
  }
</script>

<Dialog help={t('help.dialog.rlOverride')} {open} title={initial ? t('rl.editOverride') : t('rl.addOverride')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="field"><FieldLabel for="of-subject" help={t('help.rl.subject')}>{t('rl.subject')}</FieldLabel><input id="of-subject" class="input mono" bind:value={subj} maxlength="200" required disabled={Boolean(initial)} placeholder="key_7f3a" /><span class="hint">{t('rl.subjectHint')}</span></div>
    <div class="field"><span class="small" style="font-weight:550;color:var(--text-2)">{t('rl.overrideKind')}<HelpTip text={t('help.rl.overrideKind')} /></span>
      <div class="seg" role="group"><button type="button" aria-pressed={mode === 'limits'} onclick={() => { mode = 'limits'; }}>{t('rl.customLimits')}</button><button type="button" aria-pressed={mode === 'block'} onclick={() => { mode = 'block'; }}>{t('rl.block')}</button></div>
    </div>
    {#if mode === 'limits'}<div class="field"><LimitsEditor bind:rows /><span class="hint">{t('rl.overrideLimitsHint')}</span></div>
    {:else}<p class="small muted" style="margin:0">{t('rl.blockHint')}</p>{/if}
    <div class="field"><FieldLabel for="of-note" help={t('help.rl.note')}>{t('rl.note')} <span class="faint">({t('common.optional')})</span></FieldLabel><input id="of-note" class="input" bind:value={note} maxlength="500" /></div>
    <div class="field"><FieldLabel for="of-exp" help={t('help.rl.expires')}>{t('rl.expiresAt')} <span class="faint">({t('common.optional')})</span></FieldLabel><input id="of-exp" class="input" type="datetime-local" bind:value={expiresAt} />{#if !expiryOk}<span class="error">{t('rl.expiryPast')}</span>{:else}<span class="hint">{t('rl.expiresHint')}</span>{/if}</div>
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{t('common.save')}</button>
  {/snippet}
</Dialog>
