<script>
  /** Payment disputes (chargebacks): deadlines, text evidence (save, then submit) and acceptance, each final step through Confirm. */
  import Page from '#lib/components/Page.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Empty from '#lib/components/Empty.svelte';
  import Skeleton from '#lib/components/Skeleton.svelte';
  import ErrorBox from '#lib/components/ErrorBox.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Time from '#lib/components/Time.svelte';
  import LoadMore from '#lib/components/LoadMore.svelte';
  import Dialog from '#lib/components/Dialog.svelte';
  import Confirm from '#lib/components/Confirm.svelte';
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { api } from '#lib/client/api.js';
  import { Resource } from '#lib/client/resource.svelte.js';
  import { useSession } from '#lib/client/session.svelte.js';
  import { Fmt } from '#lib/client/format.js';
  import { t, i18n } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
  const session = useSession();
  const fmt = $derived(new Fmt(i18n.lang));
  const base = $derived(`/services/${sid}/atc-payments/disputes`);
  const payment = $derived(page.url.searchParams.get('payment') ?? '');
  let openOnly = $state(true);
  /** @type {any[]} */ let items = $state([]);
  /** @type {string|null} */ let cursor = $state(null);
  let more = $state(false);
  const query = (/** @type {string|null} */ c) => `${base}?limit=50${openOnly ? '&open=true' : ''}${payment ? `&payment=${encodeURIComponent(payment)}` : ''}${c ? `&cursor=${encodeURIComponent(c)}` : ''}`;
  const list = new Resource(async () => { const r = /** @type {any} */ (await api.get(query(null))); items = r.items; cursor = r.nextCursor; return r; });
  $effect(() => { openOnly; payment; untrack(() => list.load()); });
  async function loadMore() {
    more = true;
    try { const r = /** @type {any} */ (await api.get(query(cursor))); items = [...items, ...r.items]; cursor = r.nextCursor; } catch (e) { toasts.error(e); } finally { more = false; }
  }
  const RESPONDABLE = ['needs_response', 'warning_needs_response'];
  const FIELDS = ['customer_name', 'customer_email_address', 'product_description', 'service_date', 'access_activity_log', 'refund_policy_disclosure', 'uncategorized_text'];
  /** @type {Record<string, string>} */
  const FIELD_HELP = $derived({
    customer_name: t('help.pm.ev.customer_name'), customer_email_address: t('help.pm.ev.customer_email_address'), product_description: t('help.pm.ev.product_description'),
    service_date: t('help.pm.ev.service_date'), access_activity_log: t('help.pm.ev.access_activity_log'), refund_policy_disclosure: t('help.pm.ev.refund_policy_disclosure'), uncategorized_text: t('help.pm.ev.uncategorized_text'),
  });
  /** @type {any} */ let editing = $state(null);
  /** @type {Record<string, string>} */ let evidence = $state({});
  let busy = $state(false);
  /** @type {'submit'|'accept'|null} */ let confirm = $state(null);
  /** @type {any} */ let accepting = $state(null);
  /** @param {any} d */
  function edit(d) { editing = d; evidence = Object.fromEntries(FIELDS.map((f) => [f, d.evidence?.[f] ?? ''])); }
  const filled = $derived(Object.fromEntries(Object.entries(evidence).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])));
  /** @param {boolean} submit */
  async function save(submit) {
    busy = true;
    try {
      await api.post(`${base}/${encodeURIComponent(editing.id)}/evidence`, { evidence: filled, submit });
      toasts.ok(t(submit ? 'pm.evSubmitted' : 'pm.evSaved'));
      editing = null; confirm = null;
      await list.load();
    } catch (e) { toasts.error(e); } finally { busy = false; }
  }
  async function accept() {
    busy = true;
    try { await api.post(`${base}/${encodeURIComponent(accepting.id)}/accept`, {}); toasts.ok(t('pm.dsAccepted')); accepting = null; confirm = null; await list.load(); } catch (e) { toasts.error(e); } finally { busy = false; }
  }
</script>

<Page help={t('help.page.paymentsDisputes')} docs={sid} title={t('pm.disputes')} desc={t('pm.disputesDesc')} back="/atc-payments/{sid}">
  {#snippet actions()}
    <button class="btn icon" onclick={() => list.load()} aria-label={t('common.refresh')}><Icon name="refresh" size={16} /></button>
  {/snippet}
  <div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <label class="row small" style="gap:6px"><input id="ds-open" type="checkbox" bind:checked={openOnly} /> {t('pm.dsOpenOnly')}</label><HelpTip text={t('help.pm.dsOpenOnly')} for="ds-open" />
    {#if payment}<span class="small muted">{t('pm.payment')}: <a class="mono" href="/atc-payments/{sid}/payments/{payment}">{payment}</a></span>{/if}
  </div>
  <Panel title={t('pm.disputes')} flush>
    {#if list.error}<ErrorBox error={list.error} onretry={() => list.load()} />
    {:else if !list.data}<Skeleton rows={4} />
    {:else if !items.length}<Empty icon="check" title={t('pm.dsEmpty')} desc={t('pm.dsEmptyDesc')} />
    {:else}
      <div class="table-wrap"><table class="table">
        <thead><tr><th>{t('pm.amount')}</th><th>{t('pm.status')}</th><th class="hide-m">{t('pm.reason')}</th><th>{t('pm.dueBy')}</th><th class="hide-m">{t('pm.payment')}</th><th></th></tr></thead>
        <tbody>{#each items as d (d.id)}<tr>
          <td class="nowrap">{fmt.money(d.amount, d.currency)}<div class="xs faint mono">{d.id}</div></td>
          <td><StatusBadge status={d.status} label={t(`pm.ds.${d.status}`)} /></td>
          <td class="small hide-m">{d.reason}</td>
          <td class="small nowrap">{#if d.evidenceDueBy}<Time value={d.evidenceDueBy} mode="absolute" />{:else}–{/if}</td>
          <td class="hide-m"><a class="mono xs" href="/atc-payments/{sid}/payments/{d.paymentId}">{d.paymentId}</a></td>
          <td class="nowrap">{#if session.isAdmin && RESPONDABLE.includes(d.status)}
            <button class="btn sm primary" disabled={busy} onclick={() => edit(d)}>{t('pm.evidence')}</button>
            <button class="btn sm" disabled={busy} onclick={() => { accepting = d; confirm = 'accept'; }}>{t('pm.dsAccept')}</button>
          {/if}</td>
        </tr>{/each}</tbody>
      </table></div>
      <LoadMore {cursor} busy={more} onmore={loadMore} />
    {/if}
  </Panel>
</Page>

<Dialog help={t('help.dialog.pmEvidence')} open={editing !== null} title={t('pm.evidence')} onclose={() => { editing = null; }}>
  <div class="stack">
    {#each FIELDS as f (f)}
      <div class="field"><FieldLabel for="ev-{f}" help={FIELD_HELP[f]}>{t(`pm.ev.${f}`)}</FieldLabel>
        {#if f === 'access_activity_log' || f === 'uncategorized_text' || f === 'product_description' || f === 'refund_policy_disclosure'}<textarea id="ev-{f}" class="input" rows="3" maxlength="20000" bind:value={evidence[f]}></textarea>
        {:else}<input id="ev-{f}" class="input" maxlength="20000" bind:value={evidence[f]} />{/if}
      </div>
    {/each}
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => { editing = null; }} disabled={busy}>{t('common.cancel')}</button>
    <button class="btn" onclick={() => save(false)} disabled={busy || !Object.keys(filled).length}>{t('pm.evSave')}</button>
    <button class="btn primary" onclick={() => { confirm = 'submit'; }} disabled={busy || !Object.keys(filled).length}>{t('pm.evSubmit')}</button>
  {/snippet}
</Dialog>
<Confirm open={confirm === 'submit'} title={t('pm.evSubmit')} message={t('pm.evSubmitDesc')} danger confirmLabel={t('pm.evSubmit')} {busy} onconfirm={() => save(true)} oncancel={() => { confirm = null; }} />
<Confirm open={confirm === 'accept'} title={t('pm.dsAccept')} message={t('pm.dsAcceptDesc', { amount: accepting ? fmt.money(accepting.amount, accepting.currency) : '' })} danger typeWord={accepting?.id ?? ''} confirmLabel={t('pm.dsAccept')} {busy} onconfirm={accept} oncancel={() => { confirm = null; accepting = null; }} />
