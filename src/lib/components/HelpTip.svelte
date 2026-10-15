<script>
  /**
   * A small "?" that explains the thing next to it. Opens on hover, keyboard focus and tap; Escape
   * closes it. The bubble is fixed-positioned (no layout shift), placed below the button or above
   * it when there is no room, and clamped to the viewport.
   */
  import { tick } from 'svelte';
  import { t } from '#lib/client/i18n.svelte.js';
  /** @type {{ text: string, for?: string }} `for` names the control it explains (for the forms test; it does not change behaviour). */
  let { text } = $props();
  const id = $props.id();
  let open = $state(false);
  let pinned = $state(false);
  /** @type {HTMLButtonElement|undefined} */ let btn = $state();
  /** @type {HTMLSpanElement|undefined} */ let pop = $state();
  let left = $state(0);
  let top = $state(0);
  const MARGIN = 8;

  async function show() {
    left = 0; top = 0; // measure at the origin: a bubble left near the right edge would measure too narrow
    open = true;
    await tick();
    place();
  }
  function place() {
    if (!btn || !pop || !open) return;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - MARGIN - w));
    const below = r.bottom + 6 + h <= window.innerHeight - MARGIN || r.top - 6 - h < MARGIN;
    top = below ? Math.min(r.bottom + 6, window.innerHeight - MARGIN - h) : r.top - 6 - h;
  }
  // While open, follow the button through any scrolling container (capture) and resizes.
  $effect(() => {
    if (!open) return;
    const follow = () => place();
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => { window.removeEventListener('scroll', follow, true); window.removeEventListener('resize', follow); };
  });
  /** The bubble lives in <body>: an ancestor with a filter or transform (the app bar's backdrop blur) would otherwise become its containing block. @param {HTMLElement} node */
  function portal(node) {
    document.body.appendChild(node);
    return () => node.remove();
  }
  function hide() { open = false; pinned = false; }
  /** @param {KeyboardEvent} e */
  function onkey(e) {
    if (e.key === 'Escape' && open) { e.stopPropagation(); hide(); }
  }
</script>

<span class="helptip">
  <button bind:this={btn} type="button" class="helptip-btn" aria-label={t('help.label')} aria-describedby={id} aria-expanded={open}
    onmouseenter={show} onmouseleave={() => { if (!pinned) hide(); }} onfocus={show} onblur={hide} onkeydown={onkey}
    onclick={(e) => { e.preventDefault(); e.stopPropagation(); if (pinned) hide(); else { pinned = true; show(); } }}>?</button>
  <span {@attach portal} bind:this={pop} id={id} role="tooltip" class="helptip-pop" class:open style="left:{left}px;top:{top}px">{text}</span>
</span>

<style>
  .helptip { display: inline-flex; vertical-align: middle; margin-left: 4px; }
  .helptip-btn {
    width: 16px; height: 16px; flex: none; padding: 0; border-radius: 50%; border: 1px solid var(--border-strong, var(--border));
    background: var(--surface); color: var(--text-3); font: 600 10px/1 system-ui, sans-serif; cursor: help; display: inline-grid; place-items: center;
  }
  .helptip-btn:hover, .helptip-btn:focus-visible, .helptip-btn[aria-expanded='true'] { color: var(--text); border-color: var(--text-3); }
  .helptip-pop {
    position: fixed; z-index: 70; width: max-content; max-width: min(300px, calc(100vw - 16px)); padding: 8px 10px; border-radius: var(--radius);
    background: var(--text); color: var(--bg); font-size: .78rem; font-weight: 450; line-height: 1.4; white-space: normal; text-align: left;
    box-shadow: var(--shadow-lg); pointer-events: none; visibility: hidden;
  }
  .helptip-pop.open { visibility: visible; }
</style>
