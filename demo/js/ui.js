/* Small DOM toolkit: element builder, icons, dialogs, menus, form controls, toasts. */
window.Ink = window.Ink || {};

Ink.ui = (function () {
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const [sk, sv] of Object.entries(v)) {
            if (sk.startsWith('--')) el.style.setProperty(sk, sv);
            else el.style[sk] = sv;
          }
        }
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('_')) el[k] = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    pad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59L2 15.5A3 3 0 0 0 7.2 17.6L9 15h6l1.8 2.6A3 3 0 0 0 22 15.5l-.7-6.91A4 4 0 0 0 17.32 5z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    resume: '<path d="M5 4v16l11-8zM19 5v14"/>',
    steam: '<circle cx="15.5" cy="8.5" r="3"/><circle cx="8" cy="16" r="2.5"/><path d="m10.3 14.9 3.1-4.4"/><circle cx="12" cy="12" r="10"/>',
    android: '<path d="M5 10h14v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM5 9a7 7 0 0 1 14 0zM8 3l1.5 2.5M16 3l-1.5 2.5M9 7h.01M15 7h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    minimize: '<path d="M5 19h14"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    sort: '<path d="M3 6h18M6 12h12M10 18h4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  };
  function icon(name, cls) {
    const span = document.createElement('span');
    span.className = 'icon ' + (cls || '');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    return span;
  }

  // Controller button glyph that follows the connected controller style.
  const GLYPHS = {
    xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', start: '☰', select: '⧉', home: '⌂' },
    ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', start: '☰', select: '⧉', home: 'PS' },
    nintendo: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', start: '+', select: '−', home: '⌂' },
  };
  function glyph(btn) {
    return h('span', { class: 'glyph glyph-' + btn, 'data-btn': btn }, (GLYPHS[Ink.input.padStyle] || GLYPHS.xbox)[btn] || btn);
  }
  function refreshGlyphs(root) {
    const map = GLYPHS[Ink.input.padStyle] || GLYPHS.xbox;
    (root || document).querySelectorAll('.glyph[data-btn]').forEach(g => { g.textContent = map[g.dataset.btn] || g.dataset.btn; });
  }

  // ------------------------------------------------------------- toasts
  function toast(msg, kind) {
    const host = document.getElementById('toasts');
    const t = h('div', { class: 'toast ' + (kind || '') }, msg);
    host.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, kind === 'error' ? 5200 : 3200);
  }

  // ------------------------------------------------------------- modals
  function modal(opts) {
    const back = h('div', { class: 'modal-backdrop' });
    const body = h('div', { class: 'modal-body', 'data-scroll': 'y' });
    const actions = h('div', { class: 'modal-actions' });
    const box = h('div', { class: 'modal ' + (opts.class || '') + (opts.wide ? ' wide' : '') },
      opts.title ? h('div', { class: 'modal-title' }, opts.title, opts.subtitle ? h('div', { class: 'modal-subtitle' }, opts.subtitle) : null) : null,
      body, actions);
    back.append(box);
    let closed = false;
    const api = {
      el: box, body, actions,
      close(result) {
        if (closed) return;
        closed = true;
        Ink.nav.pop(layer);
        back.classList.remove('show');
        setTimeout(() => back.remove(), 180);
        if (opts.onClose) opts.onClose(result);
      },
      setBody(...children) { body.textContent = ''; append(body, children); },
      setActions(...children) { actions.textContent = ''; append(actions, children); actions.hidden = !actions.childElementCount; },
      get closed() { return closed; },
    };
    const layer = {
      el: back,
      initial: opts.initial,
      onAction(action, el) {
        if (opts.onAction && opts.onAction(action, el)) return true;
        if (action === 'b') { Ink.sound.play('back'); api.close(null); return true; }
        return false;
      },
    };
    if (opts.body) append(body, [opts.body]);
    if (opts.actions) append(actions, [opts.actions]);
    actions.hidden = !actions.childElementCount;
    back.addEventListener('pointerdown', e => { if (e.target === back && opts.dismissable !== false) api.close(null); });
    document.body.append(back);
    requestAnimationFrame(() => back.classList.add('show'));
    Ink.nav.push(layer);
    api.layer = layer;
    return api;
  }

  function button(label, onclick, opts) {
    opts = opts || {};
    return h('button', { type: 'button', class: 'btn ' + (opts.variant || '') + (opts.class ? ' ' + opts.class : ''), 'data-nav': '', onclick: onclick ? (e => { Ink.sound.play('select'); onclick(e); }) : null, disabled: opts.disabled },
      opts.icon ? icon(opts.icon) : null, label ? h('span', null, label) : null);
  }

  // Promise-based question dialog. Resolves with the chosen button id or null.
  function ask(opts) {
    return new Promise(resolve => {
      let m;
      const btns = (opts.buttons || [{ id: 'ok', label: 'OK', variant: 'primary' }]).map(b => button(b.label, () => m.close(b.id), { variant: b.variant, icon: b.icon }));
      m = modal({
        title: opts.title,
        class: 'dialog',
        body: opts.message ? h('div', { class: 'dialog-message' }, opts.message) : null,
        actions: btns,
        onClose: r => resolve(r || null),
      });
    });
  }

  // Vertical menu dialog.
  function menu(opts) {
    let m;
    const list = h('div', { class: 'menu-list' });
    (opts.items || []).filter(Boolean).forEach(it => {
      if (it.separator) { list.append(h('div', { class: 'menu-sep' }, it.separator)); return; }
      list.append(h('button', {
        type: 'button', class: 'menu-item' + (it.danger ? ' danger' : '') + (it.active ? ' active' : ''), 'data-nav': '', disabled: it.disabled,
        onclick: () => { Ink.sound.play('select'); if (it.keepOpen) { it.action && it.action(); } else { m.close('picked'); it.action && it.action(); } },
      }, it.icon ? icon(it.icon) : h('span', { class: 'icon' }), h('span', { class: 'menu-label' }, it.label, it.hint ? h('small', null, it.hint) : null)));
    });
    m = modal({ title: opts.title, subtitle: opts.subtitle, class: 'menu', body: list, onClose: opts.onClose });
    return m;
  }

  // ------------------------------------------------------------- form controls
  function field(label, control, help) {
    return h('div', { class: 'field' },
      h('span', { class: 'field-label' }, label),
      control,
      help ? h('span', { class: 'field-help' }, help) : null);
  }

  function textInput(opts) {
    const tag = opts.multiline ? 'textarea' : 'input';
    const el = h(tag, {
      class: 'input', 'data-nav': '', value: opts.multiline ? undefined : (opts.value || ''), placeholder: opts.placeholder || '',
      'aria-label': opts.label || opts.placeholder || '', rows: opts.multiline ? (opts.rows || 3) : undefined, spellcheck: 'false',
      oninput: e => opts.onchange && opts.onchange(e.target.value),
    });
    if (opts.multiline) el.value = opts.value || '';
    // With a controller, A opens the on-screen keyboard; otherwise type normally.
    el._activate = () => {
      if (Ink.input.source === 'pad' && (Ink.bridge.platform !== 'android' || Ink.screen === 'tv')) Ink.osk.open(el);
      else { el.focus(); if (el.select && !opts.multiline) el.select(); }
    };
    return el;
  }

  function choice(opts) {
    let idx = Math.max(0, opts.options.findIndex(o => o.value === opts.value));
    const valueEl = h('span', { class: 'choice-value' });
    const el = h('div', { class: 'choice', 'data-nav': '', tabindex: '0' },
      h('span', { class: 'choice-arrow', onclick: e => { e.preventDefault(); step(-1); } }, icon('left')),
      valueEl,
      h('span', { class: 'choice-arrow', onclick: e => { e.preventDefault(); step(1); } }, icon('right')));
    function paint() {
      const o = opts.options[idx];
      valueEl.textContent = o ? o.label : '';
      if (o && o.color) valueEl.style.setProperty('--swatch', o.color);
    }
    function step(d) {
      if (!opts.options.length) return;
      idx = (idx + d + opts.options.length) % opts.options.length;
      paint();
      Ink.sound.play('move');
      opts.onchange && opts.onchange(opts.options[idx].value);
    }
    el._left = () => step(-1);
    el._right = () => step(1);
    el._activate = () => step(1);
    paint();
    return el;
  }

  function toggle(opts) {
    let on = !!opts.value;
    const el = h('button', { type: 'button', class: 'toggle', 'data-nav': '', 'aria-pressed': String(on) }, h('span', { class: 'toggle-knob' }));
    function set(v) { on = v; el.setAttribute('aria-pressed', String(on)); opts.onchange && opts.onchange(on); }
    el.addEventListener('click', () => { set(!on); Ink.sound.play('move'); });
    el._left = () => { if (on) { set(false); Ink.sound.play('move'); } };
    el._right = () => { if (!on) { set(true); Ink.sound.play('move'); } };
    return el;
  }

  function range(opts) {
    let v = opts.value;
    const fmt = opts.format || (x => String(x));
    const label = h('span', { class: 'choice-value' }, fmt(v));
    const bar = h('span', { class: 'range-bar' }, h('span', { class: 'range-fill' }));
    const el = h('div', { class: 'choice range', 'data-nav': '', tabindex: '0' },
      h('span', { class: 'choice-arrow', onclick: () => step(-1) }, icon('left')), bar, label,
      h('span', { class: 'choice-arrow', onclick: () => step(1) }, icon('right')));
    function paint() {
      label.textContent = fmt(v);
      bar.firstChild.style.width = ((v - opts.min) / (opts.max - opts.min) * 100) + '%';
    }
    function step(d) {
      const nv = Math.round(Math.min(opts.max, Math.max(opts.min, v + d * opts.step)) * 1000) / 1000;
      if (nv === v) return;
      v = nv; paint(); Ink.sound.play('move');
      opts.onchange && opts.onchange(v);
    }
    el._left = () => step(-1);
    el._right = () => step(1);
    paint();
    return el;
  }

  function swatches(opts) {
    let value = opts.value;
    const row = h('div', { class: 'swatches' });
    function paint() { row.querySelectorAll('.swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === value)); }
    opts.colors.forEach(c => {
      row.append(h('button', {
        type: 'button', class: 'swatch' + (c ? '' : ' none'), 'data-nav': '', 'data-color': c, style: c ? { background: c } : null, title: c || 'Automatic',
        onclick: () => { value = c; paint(); Ink.sound.play('move'); opts.onchange && opts.onchange(c); },
      }));
    });
    paint();
    return row;
  }

  function section(title, ...children) {
    return h('div', { class: 'form-section' }, h('div', { class: 'form-section-title' }, title), ...children);
  }

  return { h, append, icon, glyph, refreshGlyphs, toast, modal, button, ask, menu, field, textInput, choice, toggle, range, swatches, section };
})();
