<script>
  /** Create many links at once: one destination per line (optionally followed by a code), shared tags and redirect kind; shows the per-line outcome. */
  import Dialog from '#lib/components/Dialog.svelte';
  import FieldLabel from '#lib/components/FieldLabel.svelte';
  import HelpTip from '#lib/components/HelpTip.svelte';
  import Switch from '#lib/components/Switch.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ open: boolean, sid: string, busy?: boolean, onsubmit: (body: { links: object[] }) => Promise<any>, onclose: () => void }} */
  let { open, sid, busy = false, onsubmit, onclose } = $props();
  let text = $state('');
  let tags = $state('');
  let permanent = $state(false);
  /** @type {{ created: number, failed: number, results: any[] }|null} */ let outcome = $state(null);
  $effect(() => { if (open) { text = ''; tags = ''; permanent = false; outcome = null; } });
  const lines = $derived(text.split('\n').map((l) => l.trim()).filter(Boolean));
  const links = $derived(lines.map((line) => { const [url, slug] = line.split(/\s+/); return { url, ...(slug ? { slug } : {}), permanent, tags: tags.split(',').map((s) => s.trim()).filter(Boolean) }; }));
  const tooMany = $derived(links.length > 500);
  async function submit() {
    if (!links.length || tooMany) return;
    outcome = await onsubmit({ links });
  }
  /** @param {number} i */
  const resultOf = (i) => outcome?.results.find((r) => r.index === i);
</script>

<Dialog {open} title={t('sl.batch')} help={t('help.dialog.shortlinkBatch')} {onclose} wide>
  {#if outcome}
    <p class="small no-margin">{t('sl.batchDone', { created: outcome.created, failed: outcome.failed })}</p>
    <div class="table-wrap" style="margin-top:12px"><table class="table">
      <thead><tr><th>#</th><th>{t('sl.url')}</th><th>{t('sl.slug')}</th></tr></thead>
      <tbody>{#each links as l, i (i)}{@const r = resultOf(i)}<tr>
        <td class="num">{i + 1}</td>
        <td class="truncate small" style="max-width:320px" title={l.url}>{l.url}</td>
        <td>{#if r?.link}<a href="/atc-shortlink/{sid}/links/{r.link.code}"><code>{r.link.code}</code></a>{:else if r?.error}<StatusBadge status="failed" label={r.error.message ?? r.error.code} />{:else}–{/if}</td>
      </tr>{/each}</tbody>
    </table></div>
  {:else}
    <form class="stack" onsubmit={(e) => { e.preventDefault(); submit(); }}>
      <div class="field"><FieldLabel for="sb-lines" help={t('help.sl.batchLines')}>{t('sl.batchLines')}</FieldLabel><textarea id="sb-lines" class="textarea mono" rows="10" placeholder={'https://example.com/spring-sale\nhttps://example.com/docs docs'} bind:value={text} spellcheck="false" aria-invalid={tooMany ? 'true' : undefined}></textarea>{#if tooMany}<span class="error">{t('sl.batchTooMany')}</span>{:else}<span class="xs faint">{t('sl.batchCount', { n: links.length })}</span>{/if}</div>
      <div class="field"><FieldLabel for="sb-tags" help={t('help.sl.tags')}>{t('sl.tags')}</FieldLabel><input id="sb-tags" class="input" type="text" bind:value={tags} /></div>
      <div class="field"><span class="small field-label">{t('sl.permanent')}<HelpTip text={t('help.sl.permanent')} /></span><Switch checked={permanent} label={t('sl.permanent')} onchange={(next) => { permanent = next; }} /></div>
    </form>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={busy}>{outcome ? t('common.close') : t('common.cancel')}</button>
    {#if !outcome}<button class="btn primary" type="button" onclick={submit} disabled={busy || !links.length || tooMany}>{t('sl.batchCreate', { n: links.length })}</button>{/if}
  {/snippet}
</Dialog>

<style>
  .no-margin { margin: 0; }
</style>
