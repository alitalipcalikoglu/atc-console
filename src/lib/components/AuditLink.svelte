<script>
  /** App-bar link to the audit service's events about one target (payment, queue, monitor, …); hidden without an audit service. */
  import Icon from './Icon.svelte';
  import { services } from '#lib/client/services.svelte.js';
  import { Links } from '#lib/client/links.js';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ targetId: string }} */
  let { targetId } = $props();
  const href = $derived(Links.audit(targetId, services.items));
</script>

{#if href}<a class="btn" {href} aria-label={t('links.audit')} title={t('links.auditDesc')}><Icon name="history" size={16} /><span class="hide-m"> {t('links.audit')}</span></a>{/if}
