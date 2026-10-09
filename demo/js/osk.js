/*
 * On-screen keyboard so text fields can be filled with only a controller.
 *   A = type key   B = backspace   Y = space   X = shift   Start = done
 */
window.Ink = window.Ink || {};

Ink.osk = (function () {
  const ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '\\'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ':', '/'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '_', '"', "'"],
  ];
  const SHIFTED = { '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '+', '\\': '|', ':': ';', '/': '?', '.': ',', '_': '=', '"': '{', "'": '}' };

  function open(input, onDone) {
    let shift = false;
    const wrap = document.createElement('div');
    wrap.className = 'osk-backdrop';
    const box = document.createElement('div');
    box.className = 'osk';
    const preview = document.createElement('div');
    preview.className = 'osk-preview';
    const label = input.getAttribute('aria-label') || input.placeholder || '';
    const grid = document.createElement('div');
    grid.className = 'osk-keys';
    box.append(preview, grid);
    wrap.append(box);
    document.body.append(wrap);

    function setValue(v) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      renderPreview();
    }
    function renderPreview() {
      preview.textContent = '';
      const l = document.createElement('div');
      l.className = 'osk-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = 'osk-value';
      v.textContent = input.value;
      const caret = document.createElement('span');
      caret.className = 'osk-caret';
      v.append(caret);
      preview.append(l, v);
    }
    function key(text, fn, cls) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'osk-key ' + (cls || '');
      b.textContent = text;
      b.setAttribute('data-nav', '');
      b.addEventListener('click', () => { fn(); Ink.sound.play('move'); });
      return b;
    }
    function render() {
      const focusedIdx = layer && layer.current ? Array.from(grid.querySelectorAll('[data-nav]')).indexOf(layer.current) : -1;
      grid.textContent = '';
      ROWS.forEach(row => {
        const r = document.createElement('div');
        r.className = 'osk-row';
        row.forEach(ch => {
          const c = shift ? (SHIFTED[ch] || ch.toUpperCase()) : ch;
          r.append(key(c, () => setValue(input.value + c)));
        });
        grid.append(r);
      });
      const r = document.createElement('div');
      r.className = 'osk-row';
      r.append(
        key(shift ? 'ABC' : 'abc', () => { shift = !shift; render(); }, 'wide'),
        key('Space', () => setValue(input.value + ' '), 'space'),
        key('⌫', () => setValue(input.value.slice(0, -1)), 'wide'),
        key('Clear', () => setValue(''), 'wide'),
        key('Done', close, 'wide accent'),
      );
      grid.append(r);
      if (focusedIdx >= 0) {
        const keys = grid.querySelectorAll('[data-nav]');
        if (keys[focusedIdx]) requestAnimationFrame(() => Ink.nav.focus(keys[focusedIdx]));
      }
    }
    function close() {
      Ink.nav.pop(layer);
      wrap.remove();
      if (onDone) onDone();
    }
    const layer = {
      el: wrap,
      onAction(action) {
        if (action === 'b') { setValue(input.value.slice(0, -1)); Ink.sound.play('back'); return true; }
        if (action === 'y') { setValue(input.value + ' '); return true; }
        if (action === 'x') { shift = !shift; render(); return true; }
        if (action === 'start' || action === 'select') { close(); return true; }
        return false;
      },
    };
    renderPreview();
    render();
    Ink.nav.push(layer);
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
  }

  return { open };
})();
