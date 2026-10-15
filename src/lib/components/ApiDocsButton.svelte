<script>
  /** App-bar action of every service page: the API reference of that service instance. */
  import Icon from './Icon.svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ sid: string }} */
  let { sid } = $props();
</script>

<a class="btn ghost icon sm" href="/docs?service={encodeURIComponent(sid)}" aria-label={t('docs.open')} title={t('docs.open')}><Icon name="file" size={16} /></a>
