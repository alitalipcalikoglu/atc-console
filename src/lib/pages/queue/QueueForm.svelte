<script>
  /** Create a queue (name + settings) or edit an existing queue's settings. */
  import { untrack } from 'svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, initial?: any, busy?: boolean, onsubmit: (name: string, body: Record<string, unknown>) => void, onclose: () => void }} */
  let { open, initial = null, busy = false, onsubmit, onclose } = $props();
  let name = $state('');
  let description = $state('');
  let visibilitySec = $state(30);
  let maxAttempts = $state(5);
  let backoffBaseSec = $state(5);
  let backoffMaxSec = $state(900);
  // Push delivery: the queue POSTs due messages to `pushUrl`, signed with the secret (kept when left empty on edit).
  let pushOn = $state(false);
  let pushUrl = $state('');
  let pushSecret = $state('');
  let pushConcurrency = $state(1);
  $effect(() => {
    if (!open) return;
    untrack(() => {
      name = initial?.name ?? ''; description = initial?.description ?? '';
      visibilitySec = initial?.visibilitySec ?? 30; maxAttempts = initial?.maxAttempts ?? 5;
      backoffBaseSec = initial?.backoffBaseSec ?? 5; backoffMaxSec = initial?.backoffMaxSec ?? 900;
      pushOn = Boolean(initial?.push); pushUrl = initial?.push?.url ?? 'https://'; pushSecret = ''; pushConcurrency = initial?.push?.concurrency ?? 1;
    });
  });
  const secretOk = $derived(pushSecret.length >= 32 && pushSecret.length <= 256 || (pushSecret === '' && Boolean(initial?.push)));
  const pushOk = $derived(!pushOn || (/^https?:\/\/[^\s/]+/.test(pushUrl.trim()) && secretOk && pushConcurrency >= 1 && pushConcurrency <= 32));
  const valid = $derived((initial || /^[a-z][a-z0-9._-]{0,63}$/.test(name.trim())) && visibilitySec >= 1 && maxAttempts >= 1 && backoffMaxSec >= backoffBaseSec && pushOk);
  /** Only send `push` when it changes: on → settings, off after on → null. */
  const pushBody = () => (pushOn ? { push: { url: pushUrl.trim(), concurrency: Number(pushConcurrency), ...(pushSecret ? { secret: pushSecret } : {}) } } : initial?.push ? { push: null } : {});
  const submit = () => onsubmit(initial ? initial.name : name.trim(), { description: description.trim(), visibilitySec: Number(visibilitySec), maxAttempts: Number(maxAttempts), backoffBaseSec: Number(backoffBaseSec), backoffMaxSec: Number(backoffMaxSec), ...pushBody() });
</script>

<Dialog help={t('help.dialog.quQueue')} {open} title={initial ? t('qu.edit') : t('qu.create')} {onclose}>
  <form class="stack" onsubmit={(e) => { e.preventDefault(); if (valid) submit(); }}>
    {#if !initial}<div class="field"><FieldLabel for="qf-name" help={t('help.qu.name')}>{t('qu.name')}</FieldLabel><input id="qf-name" class="input mono" bind:value={name} required pattern={'[a-z][a-z0-9._\\-]{0,63}'} placeholder="emails" /><span class="hint">{t('qu.nameHint')}</span></div>{/if}
    <div class="field"><FieldLabel for="qf-desc" help={t('help.qu.description')}>{t('qu.description')}</FieldLabel><input id="qf-desc" class="input" bind:value={description} maxlength="500" /></div>
    <div class="grid two-cols">
      <div class="field"><FieldLabel for="qf-vis" help={t('help.qu.visibility')}>{t('qu.visibility')}</FieldLabel><input id="qf-vis" class="input" type="number" min="1" max="43200" bind:value={visibilitySec} /><span class="hint">{t('qu.visibilityHint')}</span></div>
      <div class="field"><FieldLabel for="qf-att" help={t('help.qu.maxAttempts')}>{t('qu.maxAttempts')}</FieldLabel><input id="qf-att" class="input" type="number" min="1" max="100" bind:value={maxAttempts} /><span class="hint">{t('qu.maxAttemptsHint')}</span></div>
      <div class="field"><FieldLabel for="qf-bb" help={t('help.qu.backoffBase')}>{t('qu.backoffBase')}</FieldLabel><input id="qf-bb" class="input" type="number" min="0" max="86400" bind:value={backoffBaseSec} /></div>
      <div class="field"><FieldLabel for="qf-bm" help={t('help.qu.backoffMax')}>{t('qu.backoffMax')}</FieldLabel><input id="qf-bm" class="input" type="number" min="0" max="604800" bind:value={backoffMaxSec} /><span class="hint">{t('qu.backoffHint')}</span></div>
    </div>
    <div class="field"><label class="row small" style="gap:6px"><input id="qf-push" type="checkbox" bind:checked={pushOn} /> {t('qu.push')}<HelpTip text={t('help.qu.push')} for="qf-push" /></label><span class="hint">{t('qu.pushHint')}</span></div>
    {#if pushOn}
      <div class="field"><FieldLabel for="qf-push-url" help={t('help.qu.pushUrl')}>{t('qu.pushUrl')}</FieldLabel><input id="qf-push-url" class="input mono" bind:value={pushUrl} maxlength="2048" /></div>
      <div class="grid two-cols">
        <div class="field"><FieldLabel for="qf-push-secret" help={t('help.qu.pushSecret')}>{t('qu.pushSecret')}</FieldLabel><input id="qf-push-secret" class="input mono" type="password" autocomplete="new-password" bind:value={pushSecret} maxlength="256" placeholder={initial?.push ? t('qu.pushSecretKeep') : ''} aria-invalid={pushSecret && !secretOk ? 'true' : undefined} /><span class="hint">{t('qu.pushSecretHint')}</span></div>
        <div class="field"><FieldLabel for="qf-push-conc" help={t('help.qu.pushConcurrency')}>{t('qu.pushConcurrency')}</FieldLabel><input id="qf-push-conc" class="input" type="number" min="1" max="32" bind:value={pushConcurrency} /></div>
      </div>
    {/if}
    <button type="submit" class="sr-only">ok</button>
  </form>
  {#snippet footer()}
    <button class="btn" onclick={onclose} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn primary" onclick={submit} disabled={busy || !valid}>{initial ? t('common.save') : t('qu.create')}</button>
  {/snippet}
</Dialog>

<style>
  .two-cols { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
</style>
