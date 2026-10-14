<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import Shell from '#lib/components/Shell.svelte';
  import { pwa } from '#lib/client/pwa.svelte.js';
  import { services } from '#lib/client/services.svelte.js';
  import { t } from '#lib/client/i18n.svelte.js';
  import { toasts } from '#lib/client/toast.svelte.js';

  let { children }: { children: Snippet } = $props();
  let updateToast = 0;

  onMount(() => {
    services.load().catch((error) => toasts.error(error));
    return () => services.reset();
  });
  $effect(() => {
    const ready = pwa.updateReady;
    // Toast calls read the toast list; untracked so the effect depends on updateReady only.
    untrack(() => {
      if (updateToast) {
        toasts.dismiss(updateToast);
        updateToast = 0;
      }
      if (ready) {
        updateToast = toasts.info(t('common.updateAvailable'), {
          sticky: true,
          action: { label: t('common.reload'), run: () => pwa.applyUpdate() },
        });
      }
    });
    return () => {
      if (updateToast) toasts.dismiss(updateToast);
      updateToast = 0;
    };
  });
</script>

<Shell>{@render children()}</Shell>
