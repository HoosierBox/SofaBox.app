/*
 * Bridge between the shared launcher UI and the host platform.
 *
 *   Windows  -> Electron preload exposes window.inkNative
 *   Android  -> WebView exposes window.InkAndroid (Java @JavascriptInterface)
 *   Browser  -> in-memory/localStorage mock, handy for UI development
 *
 * Every host implements the same `call(method, args) -> Promise` contract and
 * pushes events (home button, controller connected, game exited ...) back.
 */
window.Ink = window.Ink || {};

// "tv" when the Android app shows Ink on an external display (HDMI / USB-C).
Ink.screen = new URLSearchParams(location.search).get('screen') === 'tv' ? 'tv' : 'main';
document.documentElement.dataset.screen = Ink.screen;

Ink.bridge = (function () {
  const listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  // ---------------------------------------------------------------- Electron
  if (window.inkNative) {
    window.inkNative.onEvent((ev, data) => emit(ev, data));
    return {
      platform: 'windows',
      host: window.inkNative.platform,
      call: (method, args) => window.inkNative.call(method, args || {}),
      on, emit,
    };
  }

  // ----------------------------------------------------------------- Android
  if (window.InkAndroid) {
    let seq = 0;
    const pending = {};
    window.__inkResolve = (id, json) => {
      const p = pending[id];
      if (!p) return;
      delete pending[id];
      let value = null;
      try { value = json ? JSON.parse(json) : null; } catch (e) { value = json; }
      p(value);
    };
    window.__inkEvent = (ev, json) => {
      let value = null;
      try { value = json ? JSON.parse(json) : null; } catch (e) { value = json; }
      emit(ev, value);
    };
    return {
      platform: 'android',
      host: 'android',
      call: (method, args) => new Promise(resolve => {
        const id = 'r' + (++seq);
        pending[id] = resolve;
        window.InkAndroid.call(id, method, JSON.stringify(args || {}));
      }),
      on, emit,
    };
  }

  // ----------------------------------------------------------------- Browser
  const KEY = 'ink-library';
  const running = new Set();
  const mock = {
    async load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    async save({ data }) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } return { ok: true }; },
    async launch({ game }) {
      running.add(game.id);
      console.log('[mock] launch', game);
      setTimeout(() => emit('session-started', { gameId: game.id }), 10);
      return { ok: true, tracked: true };
    },
    async stop({ game }) { running.delete(game.id); emit('session-ended', { gameId: game.id, seconds: 60 }); return { ok: true }; },
    async resume() { return { ok: true }; },
    async resumeOrLaunch(args) { return mock.launch(args); },
    async status() { return { running: [...running] }; },
    async pickFile({ kind }) {
      const p = window.prompt('Path to ' + (kind || 'file') + ':');
      return p ? { path: p, name: p.split(/[\\/]/).pop() } : null;
    },
    async pickFolder() { const p = window.prompt('Folder path:'); return p ? { path: p } : null; },
    async scanFolder() { return []; },
    async importImage() { const u = window.prompt('Image URL:'); return u ? { url: u } : null; },
    async listApps() { return []; },
    async setConsoleMode({ on }) {
      try { if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen(); if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* needs user gesture */ }
      return { ok: true };
    },
    async applySettings() { return { ok: true }; },
    async power() { return { ok: true }; },
    async exportData({ json }) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'ink-library.json';
      a.click();
      return { ok: true };
    },
    async importData() { return null; },
    async importSteam() { return { games: [] }; },
    async importEpic() { return { games: [] }; },
    async httpGetJson({ url, bearer }) {
      try {
        const r = await fetch(url, { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
        return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
      } catch (e) { return { ok: false, status: 0, error: String(e) }; }
    },
    async downloadImage({ url }) { return { url }; },
    async systemInfo() { return { browser: true }; },
    async openSystem() { return { ok: false }; },
  };
  return {
    platform: 'browser',
    host: 'browser',
    call: (method, args) => (mock[method] ? mock[method](args || {}) : Promise.resolve(null)),
    on, emit,
  };
})();
