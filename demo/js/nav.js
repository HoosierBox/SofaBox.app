/*
 * Spatial focus navigation with a stack of layers (main screen, dialogs,
 * on-screen keyboard). Any element with [data-nav] is focusable. Elements may
 * define:
 *   el._activate()   what A does (default: click)
 *   el._left() / el._right()   consume left/right (choice lists, sliders)
 */
window.Ink = window.Ink || {};

Ink.nav = (function () {
  const stack = [];

  function top() { return stack[stack.length - 1]; }

  function visible(el) {
    if (el.disabled || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function items(layer) {
    layer = layer || top();
    if (!layer) return [];
    return Array.from(layer.el.querySelectorAll('[data-nav]')).filter(el => {
      if (!visible(el)) return false;
      // Elements inside a nested layer belong to that layer.
      const owner = el.closest('[data-layer]');
      return owner === layer.el || (!owner && layer.el === document.body);
    });
  }

  function focus(el, opts) {
    const layer = top();
    if (!el || !layer) return;
    if (layer.current && layer.current !== el) layer.current.classList.remove('focused');
    layer.current = el;
    el.classList.add('focused');
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    if (!opts || opts.scroll !== false) {
      const scroller = el.closest('[data-scroll]');
      if (scroller) scrollIntoView(scroller, el);
    }
    if (layer.onFocus) layer.onFocus(el);
  }

  function scrollIntoView(scroller, el) {
    const s = scroller.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const axis = scroller.dataset.scroll;
    const pad = 24;
    if (axis === 'x' || axis === 'both') {
      if (scroller.dataset.center === 'true') {
        scroller.scrollBy({ left: r.left + r.width / 2 - (s.left + s.width / 2.6), behavior: 'smooth' });
      } else if (r.left < s.left + pad) scroller.scrollBy({ left: r.left - s.left - pad, behavior: 'smooth' });
      else if (r.right > s.right - pad) scroller.scrollBy({ left: r.right - s.right + pad, behavior: 'smooth' });
    }
    if (axis === 'y' || axis === 'both') {
      if (r.top < s.top + pad) scroller.scrollBy({ top: r.top - s.top - pad, behavior: 'smooth' });
      else if (r.bottom > s.bottom - pad) scroller.scrollBy({ top: r.bottom - s.bottom + pad, behavior: 'smooth' });
    }
  }

  function current() {
    const layer = top();
    if (!layer) return null;
    if (layer.current && layer.el.contains(layer.current) && visible(layer.current)) return layer.current;
    return null;
  }

  function ensureFocus() {
    const layer = top();
    if (!layer) return;
    if (current()) return;
    const list = items(layer);
    const pref = layer.initial && layer.initial();
    focus(pref && list.includes(pref) ? pref : list[0]);
  }

  // Pick the closest element in the given direction.
  function move(dir) {
    const from = current();
    const list = items();
    if (!from) { ensureFocus(); return true; }
    const a = from.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === from) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      let primary;
      let secondary;
      if (dir === 'left') { if (b.right > a.left + 1 && bx >= ax) continue; primary = ax - bx; secondary = Math.abs(ay - by); }
      if (dir === 'right') { if (b.left < a.right - 1 && bx <= ax) continue; primary = bx - ax; secondary = Math.abs(ay - by); }
      if (dir === 'up') { if (b.bottom > a.top + 1 && by >= ay) continue; primary = ay - by; secondary = Math.abs(ax - bx); }
      if (dir === 'down') { if (b.top < a.bottom - 1 && by <= ay) continue; primary = by - ay; secondary = Math.abs(ax - bx); }
      if (primary <= 0) continue;
      // Prefer elements that overlap on the cross axis (same row/column).
      const overlap = (dir === 'left' || dir === 'right')
        ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        : Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const score = primary + secondary * (overlap > 0 ? 0.6 : 2.5);
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { focus(best); return true; }
    return false;
  }

  function push(layer) {
    layer.el.setAttribute('data-layer', '');
    const prev = top();
    if (prev && prev.current) prev.current.classList.remove('focused');
    stack.push(layer);
    requestAnimationFrame(ensureFocus);
    return layer;
  }

  function pop(layer) {
    const idx = layer ? stack.indexOf(layer) : stack.length - 1;
    if (idx <= 0) return;
    stack.splice(idx, 1);
    const t = top();
    if (t && t.current) focus(t.current, { scroll: false });
    else ensureFocus();
  }

  function handle(action) {
    const layer = top();
    if (!layer) return false;
    const el = current();
    if (layer.onAction && layer.onAction(action, el)) return true;
    if (['up', 'down', 'left', 'right'].includes(action)) {
      if (el && action === 'left' && el._left) { el._left(); return true; }
      if (el && action === 'right' && el._right) { el._right(); return true; }
      return move(action);
    }
    if (action === 'a') {
      if (!el) { ensureFocus(); return true; }
      if (el._activate) el._activate();
      else el.click();
      return true;
    }
    if (action === 'b' && layer.onBack) { layer.onBack(); return true; }
    return false;
  }

  // Mouse clicks / taps also move focus.
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('[data-nav]');
    const layer = top();
    if (el && layer && items(layer).includes(el)) focus(el, { scroll: false });
  }, true);

  return { push, pop, top, focus, current, move, handle, items, ensureFocus, get depth() { return stack.length; } };
})();
