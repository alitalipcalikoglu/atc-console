<script>
  /** Which services an account may use: all (nothing ticked) or the ticked ones. Bind `value`. */
  import { services } from '#lib/client/services.svelte.js';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ value: string[], idPrefix?: string }} */
  let { value = $bindable([]), idPrefix = 'scope' } = $props();
  /** @param {string} id @param {boolean} on */
  function toggle(id, on) { value = on ? [...value, id] : value.filter((x) => x !== id); }
</script>

<div class="field">
  <span class="small" style="font-weight:550;color:var(--text-2)">{t('admins.services')}</span>
  <span class="hint">{value.length ? t('admins.servicesSome', { n: value.length }) : t('admins.servicesAll')}</span>
  <div class="scope-grid">
    {#each services.items as s (s.id)}
      <label class="checkbox small" for="{idPrefix}-{s.id}"><input id="{idPrefix}-{s.id}" type="checkbox" checked={value.includes(s.id)} onchange={(e) => toggle(s.id, e.currentTarget.checked)} /> {s.label}</label>
    {/each}
  </div>
</div>

<style>
  .scope-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 12px; }
</style>
