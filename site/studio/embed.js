/** Framework-independent Studio embed. No host styles or globals are modified.
 *
 *  handoff: "studio" (default) — the Studio takes the order itself (WhatsApp +
 *           email to the shop), as on its own page. For shop websites without
 *           a cart. onSent(ref) fires when an order goes.
 *  handoff: "host"  — "Use this design" passes the design to onComplete(design)
 *           so the host's own cart can take it.
 */
export function mountStudio(target, { tenant, product, accent, handoff = 'studio', height = '100dvh', onComplete, onReady, onSent, title = 'Design your product' } = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) throw new Error('Studio mount target was not found.');
  const url = new URL('./', import.meta.url);
  url.search = new URLSearchParams({ embed: '1', parentOrigin: location.origin });
  if (tenant) url.searchParams.set('tenant', tenant);
  if (product) url.searchParams.set('product', product);
  if (handoff === 'host') url.searchParams.set('handoff', 'host');
  if (/^#[\da-f]{6}$/i.test(accent || '')) url.searchParams.set('accent', accent);
  const frame = document.createElement('iframe');
  frame.src = url.href;
  frame.title = title;
  frame.allow = 'clipboard-write';
  // As tall as the screen by default, so the Studio has the same room as on its
  // own page; a number is pixels, a string any CSS height ('80vh', '1100px').
  const h = typeof height === 'number' ? `${height}px` : /^[\d.]+(px|vh|dvh|svh|%)$/.test(height) ? height : '100dvh';
  frame.style.cssText = `display:block;width:100%;height:${h};min-height:640px;border:0;`;
  const receive = event => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return;
    if (event.data?.type === 'studio:ready') onReady?.();
    if (event.data?.type === 'studio:complete') onComplete?.(event.data.design);
    if (event.data?.type === 'studio:sent') onSent?.(event.data.ref);
  };
  window.addEventListener('message', receive);
  container.append(frame);
  return { iframe: frame, destroy() { window.removeEventListener('message', receive); frame.remove(); } };
}
