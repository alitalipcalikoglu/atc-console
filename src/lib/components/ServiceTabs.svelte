<script>
  /** Switch between several instances of the same service type (e.g. media-eu / media-us). */
  import { services } from '#lib/client/services.svelte.js';
  /** @type {{ type: 'atc-notify'|'atc-auth'|'atc-media'|'atc-gateway'|'atc-audit'|'atc-shortlink'|'atc-flags'|'atc-scheduler'|'atc-webhook-out'|'atc-search'|'atc-ratelimit'|'atc-geo'|'atc-content'|'atc-export'|'atc-render'|'atc-queue'|'atc-backup'|'atc-status'|'atc-payments', sid: string }} */
  let { type, sid } = $props();
  const list = $derived(services.ofType(type));
</script>

{#if list.length > 1}
  <div class="seg" role="tablist" style="margin-bottom:16px">
    {#each list as s (s.id)}
      <a href="/{type}/{s.id}" role="tab" aria-selected={s.id === sid} class="btn ghost sm" style={s.id === sid ? 'background:var(--surface);box-shadow:var(--shadow)' : ''}>{s.label}</a>
    {/each}
  </div>
{/if}
