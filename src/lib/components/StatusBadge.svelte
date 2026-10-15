<script>
  /** Colour-codes well-known status words from the services. */
  /** @type {{ status: string|null|undefined, label?: string }} */
  let { status, label } = $props();
  /** @type {Record<string, string>} */
  const TONE = { sent: 'ok', active: 'ok', success: 'ok', public: 'info', queued: 'info', processing: 'warn', private: '', failed: 'danger', failure: 'danger', denied: 'warn', disabled: 'danger', expired: 'warn', exhausted: 'warn', locked: 'danger', admin: 'info', viewer: '', pending: 'info', running: 'warn', retrying: 'warn', succeeded: 'ok', skipped: '', cancelled: '', paused: 'warn', blocked: 'danger', override: 'info', found: 'ok', missing: 'warn', valid: 'ok', invalid: 'danger', loopback: '', published: 'ok', draft: 'warn', ready: 'info', delayed: '', leased: 'warn', dead: 'danger', ok: 'ok', up: 'ok', down: 'danger', degraded: 'warn', unknown: '', open: 'danger', closed: '', canceled: '', partially_refunded: 'info', refunded: '', applied: 'ok', ignored: '', mismatch: 'danger', complete: 'ok', default: 'info', 'link-local': '', multicast: '', reserved: 'warn', unspecified: '', critical: 'danger', warning: 'warn', info: 'info', acked: '', heartbeat: '', hard_bounce: 'danger', complaint: 'danger', soft_bounce: 'warn', unsubscribe: '', manual: 'info' };
</script>

<span class="badge {TONE[status ?? ''] ?? ''}">{label ?? status ?? '–'}</span>
