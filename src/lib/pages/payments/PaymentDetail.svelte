<script>
  /** One payment: amounts, provider state, refunds and ledger entries; refund, sync and cancel through Confirm. */
  import Page from '#lib/components/Page.svelte';
  import AuditLink from '#lib/components/AuditLink.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Stat from '#lib/components/Stat.svelte';
  import Time from '#lib/components/Time.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import CopyButton from '#lib/components/CopyButton.svelte';
  import RowMenu from '#lib/components/RowMenu.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  const session = useSession();
  /** @type {{ sid: string, id: string }} */
  let { sid, id } = $props();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-payments/payments/${encodeURIComponent(id)}`);
  const res = new Resource(() => api.get(base));
  const d = $derived(/** @type {any} */ (res.data));
  const p = $derived(d?.payment);
  $effect(() => { res.load(); });
  const metadata = $derived(p ? Object.entries(p.metadata ?? {}) : []);

  let busy = $state(false);
  /** @type {'cancel'|'refund'|'anonymize'|null} */ let confirm = $state(null);
  async function sync() {
    busy = true;
    try { const r = /** @type {any} */ (await api.post(`${base}/sync`, {})); toasts.ok(r.changed ? t('pm.synced', { status: t(`pm.s.${r.payment.status}`) }) : t('pm.syncedSame')); await res.load(); }
    catch (e) { toasts.error(e); } finally { busy = false; }
  }
  async function anonymize() {
    busy = true;
    try { await api.post(`${base}/anonymize`, {}); toasts.ok(t('pm.anonymized')); confirm = null; await res.load(); } catch (e) { toasts.error(e); confirm = null; } finally { busy = false; }
  }
  async function cancel() {
    busy = true;
    try { await api.post(`${base}/cancel`, {}); toasts.ok(t('pm.canceled')); confirm = null; await res.load(); } catch (e) { toasts.error(e); confirm = null; } finally { busy = false; }
  }

  // ---- refund: one idempotency key per opened dialog, so a retried submit cannot refund twice
  let refundOpen = $state(false);
  let refundAmount = $state('');
  /** @type {''|'duplicate'|'fraudulent'|'requested_by_customer'} */ let reason = $state('');
  let refundKey = $state('');
  const amountMinor = $derived(p && refundAmount.trim() ? fmt.minor(refundAmount, p.currency) : null);
  const refundOk = $derived(!refundAmount.trim() || (amountMinor !== null && amountMinor > 0 && amountMinor <= (d?.refundable ?? 0)));
  const refundLabel = $derived(p ? fmt.money(refundAmount.trim() ? (amountMinor ?? 0) : d.refundable, p.currency) : '');
  function openRefund() { refundAmount = ''; reason = ''; refundKey = `console-refund-${crypto.randomUUID()}`; refundOpen = true; }
  async function refund() {
    busy = true;
    try {
      const r = /** @type {any} */ (await api.post(`${base}/refunds`, { idempotencyKey: refundKey, ...(amountMinor ? { amount: amountMinor } : {}), ...(reason ? { reason } : {}) }));
      toasts.ok(t(r.refund.status === 'succeeded' ? 'pm.refundedOk' : 'pm.refundPending', { amount: fmt.money(r.refund.amount, p.currency) }));
      refundOpen = false; confirm = null;
      await res.load();
    } catch (e) { toasts.error(e); confirm = null; } finally { busy = false; }
  }
</script>

<Page help={t('help.page.paymentDetail')} docs={sid} title={p ? fmt.money(p.amount, p.currency) : t('pm.payment')} back="/atc-payments/{sid}">
  {#snippet actions()}
    <AuditLink targetId={id} />
    {#if p && session.isAdmin}
      {#if d.refundable > 0}<button class="btn primary" onclick={openRefund} disabled={busy} aria-label={t('pm.refund')} title={t('pm.refund')}><Icon name="undo" size={16} /><span class="hide-m"> {t('pm.refund')}</span></button>{/if}
      <RowMenu label={t('common.actions')} items={[
        { label: t('pm.sync'), icon: 'refresh', run: sync },
        ...(p.customerEmail || metadata.length ? [{ label: t('pm.anonymize'), icon: 'shield', danger: true, run: () => { confirm = 'anonymize'; } }] : []),
        ...(['pending', 'processing'].includes(p.status) ? [{ label: t('pm.cancel'), icon: 'x', danger: true, run: () => { confirm = 'cancel'; } }] : []),
      ]} />
    {/if}
    <button class="btn icon" onclick={() => res.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  {#if res.error}<ErrorBox error={res.error} onretry={() => res.load()} boxed />
  {:else if !p}<Skeleton rows={8} />
  {:else}
    <div class="stack">
      <div class="grid stat-row">
        <Stat label={t('pm.status')} value={t(`pm.s.${p.status}`)} tone={p.lastError ? 'danger' : ''} sub={p.lastError ?? undefined} />
        <Stat label={t('pm.amount')} value={fmt.money(p.amount, p.currency)} />
        <Stat label={t('pm.refunded')} value={fmt.money(p.amountRefunded, p.currency)} />
        <Stat label={t('pm.refundable')} value={fmt.money(d.refundable, p.currency)} />
      </div>
      <Panel title={t('pm.details')}>
        {#snippet aside()}<StatusBadge status={p.status} label={t(`pm.s.${p.status}`)} />{/snippet}
        <dl class="kv">
          <dt>{t('pm.id')}</dt><dd class="row ref"><span class="mono small truncate">{p.id}</span><CopyButton text={p.id} /></dd>
          <dt>{t('pm.description')}</dt><dd>{p.description || '–'}</dd>
          <dt>{t('pm.customer')}</dt><dd class="small">{p.customerEmail ?? '–'}</dd>
          <dt>Stripe</dt><dd class="row ref"><span class="mono small truncate" title={p.provider.id}>{p.provider.id}</span><CopyButton text={p.provider.id} /></dd>
          <dt>{t('pm.providerStatus')}</dt><dd class="mono small">{p.provider.status ?? '–'}</dd>
          <dt>{t('pm.createdBy')}</dt><dd class="mono small">{p.createdBy}</dd>
          <dt>{t('pm.created')}</dt><dd><Time value={p.createdAt} mode="absolute" /></dd>
          <dt>{t('pm.updated')}</dt><dd><Time value={p.updatedAt} /></dd>
          {#each metadata as [k, v] (k)}<dt class="mono">{k}</dt><dd class="small">{v}</dd>{/each}
        </dl>
      </Panel>
      <Panel title={t('pm.refunds')} flush>
        {#if !d.refunds.length}<Empty icon="undo" title={t('pm.noRefunds')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('pm.amount')}</th><th>{t('pm.status')}</th><th class="hide-m">{t('pm.reason')}</th><th class="hide-m">{t('pm.createdBy')}</th><th>{t('pm.created')}</th></tr></thead>
            <tbody>{#each d.refunds as r (r.id)}<tr><td class="nowrap">{fmt.money(r.amount, p.currency)}<div class="xs faint mono">{r.id}</div></td><td><StatusBadge status={r.status} label={t(`pm.r.${r.status}`)} />{#if r.failureReason}<div class="xs danger-text">{r.failureReason}</div>{/if}</td><td class="hide-m small">{r.reason ? t(`pm.reason.${r.reason}`) : '–'}</td><td class="hide-m mono small">{r.createdBy}</td><td class="small nowrap"><Time value={r.createdAt} /></td></tr>{/each}</tbody>
          </table></div>
        {/if}
      </Panel>
      {#if d.disputes?.length}
        <Panel title={t('pm.disputes')} flush>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('pm.amount')}</th><th>{t('pm.status')}</th><th class="hide-m">{t('pm.reason')}</th><th>{t('pm.dueBy')}</th></tr></thead>
            <tbody>{#each d.disputes as x (x.id)}<tr><td class="nowrap"><a href="/atc-payments/{sid}/disputes?payment={p.id}">{fmt.money(x.amount, p.currency)}</a><div class="xs faint mono">{x.id}</div></td><td><StatusBadge status={x.status} label={t(`pm.ds.${x.status}`)} /></td><td class="hide-m small">{x.reason}</td><td class="small nowrap">{#if x.evidenceDueBy}<Time value={x.evidenceDueBy} mode="absolute" />{:else}–{/if}</td></tr>{/each}</tbody>
          </table></div>
        </Panel>
      {/if}
      <Panel title={t('pm.ledger')} flush>
        {#if !d.ledger.length}<Empty icon="card" title={t('pm.noLedger')} />
        {:else}
          <div class="table-wrap"><table class="table">
            <thead><tr><th>{t('pm.kind')}</th><th>{t('pm.amount')}</th><th class="hide-m">{t('pm.ref')}</th><th>{t('pm.at')}</th></tr></thead>
            <tbody>{#each d.ledger as l (l.seq)}<tr><td>{t(`pm.k.${l.kind}`)}</td><td class="nowrap {l.amount < 0 ? 'danger-text' : 'ok-text'}">{fmt.money(l.amount, l.currency)}</td><td class="hide-m mono small">{l.ref}</td><td class="small nowrap"><Time value={l.at} /></td></tr>{/each}</tbody>
          </table></div>
        {/if}
      </Panel>
    </div>
  {/if}
</Page>

<Dialog help={t('help.dialog.pmRefund')} open={refundOpen} title={t('pm.refund')} onclose={() => { refundOpen = false; }}>
  <div class="stack">
    <p class="small muted no-margin">{t('pm.refundHint', { amount: p ? fmt.money(d.refundable, p.currency) : '' })}</p>
    <div class="grid two-fields">
      <div class="field"><FieldLabel for="pm-amount" help={t('help.pm.amount')}>{t('pm.refundAmount', { currency: p?.currency.toUpperCase() ?? '' })}</FieldLabel><input id="pm-amount" class="input" inputmode="decimal" bind:value={refundAmount} placeholder={t('pm.allRemaining')} aria-invalid={!refundOk ? 'true' : undefined} />{#if !refundOk}<span class="error">{t('pm.refundInvalid')}</span>{/if}</div>
      <div class="field"><FieldLabel for="pm-reason" help={t('help.pm.reason')}>{t('pm.reason')}</FieldLabel><select id="pm-reason" class="select" bind:value={reason}><option value="">–</option><option value="requested_by_customer">{t('pm.reason.requested_by_customer')}</option><option value="duplicate">{t('pm.reason.duplicate')}</option><option value="fraudulent">{t('pm.reason.fraudulent')}</option></select></div>
    </div>
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => { refundOpen = false; }} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn danger solid" onclick={() => { confirm = 'refund'; }} disabled={busy || !refundOk}>{t('pm.refundAction', { amount: refundLabel })}</button>
  {/snippet}
</Dialog>

<Confirm open={confirm === 'refund'} title={t('pm.refundTitle')} message={t('pm.refundDesc', { amount: refundLabel, customer: p?.customerEmail ?? p?.id ?? '' })} danger confirmLabel={t('pm.refundAction', { amount: refundLabel })} {busy} onconfirm={refund} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'anonymize'} title={t('pm.anonymizeTitle')} message={t('pm.anonymizeDesc')} danger typeWord={p?.id ?? ''} confirmLabel={t('pm.anonymize')} {busy} onconfirm={anonymize} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'cancel'} title={t('pm.cancelTitle')} message={t('pm.cancelDesc')} danger confirmLabel={t('pm.cancel')} {busy} onconfirm={cancel} oncancel={() => { confirm = null; }} />

<style>
  .stat-row { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .no-margin { margin: 0; }
  .ref { min-width: 0; gap: 6px; }
  .two-fields { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
</style>
