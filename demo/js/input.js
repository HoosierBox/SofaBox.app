/*
 * Unified input: controller (Gamepad API or native Android events), keyboard
 * and mouse are turned into the same small set of actions:
 *   up down left right a b x y lb rb lt rt start select home
 */
window.Ink = window.Ink || {};

Ink.input = (function () {
  const handlers = [];
  let lastSource = 'mouse';
  let padStyle = 'xbox';
  const REPEAT_DELAY = 380;
  const REPEAT_RATE = 110;

  function dispatch(action, source) {
    if (source !== lastSource) {
      lastSource = source;
      document.body.dataset.input = source;
    }
    for (const h of handlers) h(action, source);
  }

  // ------------------------------------------------------------ Gamepad API
  const BUTTONS = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 16: 'home' };
  const DIRS = new Set(['up', 'down', 'left', 'right']);
  const held = {}; // key -> {since, last}
  let polling = false;
  let padCount = 0;
  const padListeners = [];

  function detectStyle(id) {
    const s = (id || '').toLowerCase();
    // Before the PlayStation check: "Xbox Wireless Controller" contains "wireless controller" (a DualShock 4's name).
    if (/045e|xbox/.test(s)) return 'xbox';
    if (/054c|dualsense|dualshock|wireless controller|playstation/.test(s)) return 'ps';
    if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
    return 'xbox';
  }

  function pads() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(list || []).filter(Boolean);
  }

  function press(key, now) {
    const st = held[key];
    if (!st) {
      held[key] = { since: now, last: now };
      dispatch(key, 'pad');
    } else if (DIRS.has(key) && now - st.since > REPEAT_DELAY && now - st.last > REPEAT_RATE) {
      st.last = now;
      dispatch(key, 'pad');
    }
  }

  function poll() {
    if (!polling) return;
    const now = performance.now();
    const active = new Set();
    // Gamepad data is only valid while this page is focused.
    if (document.hasFocus()) {
      for (const gp of pads()) {
        gp.buttons.forEach((b, i) => {
          const name = BUTTONS[i];
          if (name && (b.pressed || b.value > 0.6)) active.add(name);
        });
        const [x = 0, y = 0] = gp.axes;
        if (x < -0.55) active.add('left');
        if (x > 0.55) active.add('right');
        if (y < -0.55) active.add('up');
        if (y > 0.55) active.add('down');
      }
    }
    active.forEach(k => press(k, now));
    Object.keys(held).forEach(k => { if (!active.has(k)) delete held[k]; });
    requestAnimationFrame(poll);
  }

  function updatePads() {
    const list = pads();
    padCount = list.length;
    if (list[0]) padStyle = detectStyle(list[0].id);
    document.body.dataset.pad = padStyle;
    padListeners.forEach(fn => fn(padCount, padStyle));
  }

  // ---------------------------------------------------- Native (Android)
  // MainActivity forwards controller buttons here so they work even when the
  // WebView's Gamepad API does not.
  window.InkInput = {
    press(action) { dispatch(action, 'pad'); },
    pads(count, name) {
      padCount = count;
      if (name) padStyle = detectStyle(name);
      document.body.dataset.pad = padStyle;
      padListeners.forEach(fn => fn(padCount, padStyle));
    },
  };

  // --------------------------------------------------------------- Keyboard
  function isTyping(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') return !['button', 'checkbox', 'radio', 'range'].includes(el.type);
    return el.isContentEditable;
  }

  function onKey(e) {
    if (e.defaultPrevented) return;
    const typing = isTyping(document.activeElement);
    let action = null;
    switch (e.key) {
      case 'ArrowUp': action = 'up'; break;
      case 'ArrowDown': action = 'down'; break;
      case 'ArrowLeft': if (!typing) action = 'left'; break;
      case 'ArrowRight': if (!typing) action = 'right'; break;
      case 'Enter': if (!typing || document.activeElement.tagName === 'INPUT') action = typing ? 'down' : 'a'; break;
      case ' ': if (!typing) action = 'a'; break;
      case 'Escape': action = 'b'; break;
      case 'Backspace': if (!typing) action = 'b'; break;
      case 'Home': if (!typing) action = 'home'; break;
      case 'PageUp': action = 'lb'; break;
      case 'PageDown': action = 'rb'; break;
      case 'F1': action = 'start'; break;
      default:
        if (!typing && !e.ctrlKey && !e.altKey && !e.metaKey) {
          const k = e.key.toLowerCase();
          if (k === 'a') action = 'left';
          else if (k === 'd') action = 'right';
          else if (k === 'w') action = 'up';
          else if (k === 's') action = 'down';
          else if (k === 'x') action = 'x';
          else if (k === 'y') action = 'y';
          else if (k === 'q') action = 'lb';
          else if (k === 'e') action = 'rb';
          else if (k === 'm') action = 'start';
          else if (k === 'tab') action = null;
        }
    }
    if (action) {
      e.preventDefault();
      dispatch(action, 'keyboard');
    }
  }

  function start() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousemove', () => {
      if (lastSource !== 'mouse') { lastSource = 'mouse'; document.body.dataset.input = 'mouse'; }
    });
    // On Android the Activity feeds controller input natively.
    if (Ink.bridge.platform !== 'android' && navigator.getGamepads) {
      window.addEventListener('gamepadconnected', updatePads);
      window.addEventListener('gamepaddisconnected', updatePads);
      polling = true;
      requestAnimationFrame(poll);
    }
    document.body.dataset.input = lastSource;
    document.body.dataset.pad = padStyle;
  }

  return {
    start,
    onAction(fn) { handlers.push(fn); },
    onPads(fn) { padListeners.push(fn); },
    dispatch,
    get source() { return lastSource; },
    get padStyle() { return padStyle; },
    get padCount() { return padCount; },
    isTyping,
  };
})();
