/** Framework-independent Studio embed. No host styles or globals are modified. */
export function mountStudio(target, { product = 'tee', accent, onComplete, onReady, title = 'Customize your product' } = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) throw new Error('Studio mount target was not found.');
  const url = new URL('./', import.meta.url);
  url.search = new URLSearchParams({ embed: '1', product, parentOrigin: location.origin });
  if (/^#[\da-f]{6}$/i.test(accent || '')) url.searchParams.set('accent', accent);
  const frame = document.createElement('iframe');
  frame.src = url.href;
  frame.title = title;
  frame.style.cssText = 'display:block;width:100%;height:820px;max-height:100dvh;border:0;border-radius:12px;';
  const receive = event => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return;
    if (event.data?.type === 'eminence:ready') onReady?.();
    if (event.data?.type === 'eminence:complete') onComplete?.(event.data.design);
  };
  window.addEventListener('message', receive);
  container.append(frame);
  return { iframe: frame, destroy() { window.removeEventListener('message', receive); frame.remove(); } };
}
