/* SofaBox launcher - main screen, library management, settings. */
(function () {
  const { h, icon, glyph, toast, modal, button, ask, menu, field, textInput, choice, toggle, range, swatches, section } = Ink.ui;
  const store = Ink.store;
  const bridge = Ink.bridge;
  const P = Ink.presets;
  const IS_ANDROID = bridge.platform === 'android';
  const IS_WINDOWS = bridge.platform === 'windows';

  const state = {
    tab: 'all',
    filter: '',
    focusedId: null,
    running: new Set(),
    consoleMode: false,
    controllers: 0,
    lastLaunched: null,
    launchedAt: 0,
    awayForGame: false,
  };

  const PALETTE = ['#4f8cff', '#7c5cff', '#e0457b', '#ff7a45', '#f5b82e', '#2fbf71', '#14b8c4', '#8a94a6'];
  const ACCENTS = ['#4f8cff', '#7c5cff', '#b45cff', '#e0457b', '#ff5c5c', '#ff7a45', '#f5b82e', '#2fbf71', '#14b8c4', '#e8e8e8'];

  // ================================================================ helpers
  const $ = sel => document.querySelector(sel);
  const S = () => store.settings;

  function hashColor(str) {
    let x = 0;
    for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(x) % PALETTE.length];
  }

  function fileName(p) { return (p || '').split(/[\\/]/).pop().replace(/^.*%2F/i, ''); }
  function baseName(p) { return decodeURIComponent(fileName(p)).replace(/\.[^.]+$/, ''); }
  function cleanTitle(name) {
    return name.replace(/[_]+/g, ' ').replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/\s{2,}/g, ' ').trim() || name;
  }

  function gamePlatformId(g) {
    if (g.type === 'emulator') { const e = store.emulator(g.emulatorId); return e ? e.platform : 'other'; }
    if (g.type === 'android') return 'android';
    return 'pc';
  }
  function gamePlatformName(g) {
    if (g.platform) return g.platform;
    return P.platform(gamePlatformId(g)).short;
  }

  function steamArt(g, kind) {
    if (!g.steamAppId) return '';
    const base = 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + g.steamAppId + '/';
    if (kind === 'hero') return base + 'library_hero.jpg';
    return base + (S().tileShape === 'portrait' ? 'library_600x900.jpg' : 'header.jpg');
  }
  function coverOf(g) {
    if (g.cover) return g.cover;
    if (g.steamAppId) return steamArt(g);
    if (g.type === 'android' && g.package && IS_ANDROID) return 'https://ink.app/appicon/' + encodeURIComponent(g.package);
    return '';
  }
  function backgroundOf(g) { return g.background || (g.steamAppId ? steamArt(g, 'hero') : '') || g.cover || ''; }
  function artFit(g) {
    if (g.artFit) return g.artFit;
    if (!g.cover && g.type === 'android') return 'icon';
    if (g.cover && /thumbnails\.libretro\.com/.test(g.cover)) return 'contain';
    return 'cover';
  }

  function fmtPlaytime(sec) {
    if (!sec) return '';
    const m = Math.round(sec / 60);
    if (m < 60) return m + ' min played';
    return (m / 60).toFixed(m < 600 ? 1 : 0) + ' h played';
  }
  function fmtAgo(ts) {
    if (!ts) return 'Never played';
    const d = (Date.now() - ts) / 1000;
    if (d < 120) return 'Played just now';
    if (d < 3600) return 'Played ' + Math.round(d / 60) + ' min ago';
    if (d < 86400) return 'Played ' + Math.round(d / 3600) + ' h ago';
    if (d < 86400 * 30) return 'Played ' + Math.round(d / 86400) + ' days ago';
    return 'Played ' + new Date(ts).toLocaleDateString();
  }

  // ================================================================ theme
  function applyTheme() {
    const s = S();
    const root = document.documentElement;
    root.style.setProperty('--accent', s.accent);
    root.style.setProperty('--tile-scale', s.tileSize);
    root.style.setProperty('--ui-scale', Ink.screen === 'tv' ? s.tvScale : s.uiScale);
    root.style.setProperty('--tv-safe', (Ink.screen === 'tv' ? s.tvSafeArea : 0) + '%');
    document.body.dataset.bg = s.background;
    document.body.dataset.layout = s.layout;
    document.body.dataset.shape = s.tileShape;
    document.body.dataset.titles = s.showTitles ? 'on' : 'off';
    document.body.dataset.platform = bridge.platform;
    const bgImg = $('#bg-image');
    if (bgImg) bgImg.style.backgroundImage = s.background === 'image' && s.backgroundImage ? 'url("' + s.backgroundImage + '")' : '';
    Ink.sound.enabled = s.sounds;
    Ink.sound.volume = s.volume;
  }

  function pushSettings() { bridge.call('applySettings', { settings: S() }).catch(() => {}); }

  // ================================================================ shell
  function buildShell() {
    const app = h('div', { id: 'app' },
      h('div', { id: 'bg' },
        h('div', { id: 'bg-image' }),
        h('div', { class: 'bg-art', id: 'bg-art-a' }),
        h('div', { class: 'bg-art', id: 'bg-art-b' }),
        h('div', { id: 'bg-shade' })),
      h('header', { class: 'topbar' },
        h('button', { type: 'button', class: 'brand', 'data-nav': '', title: 'Profile', onclick: () => { Ink.sound.play('select'); openProfile(); } },
          h('span', { class: 'avatar', id: 'avatar' }), h('span', { class: 'brand-name', id: 'brand-name' })),
        h('div', { class: 'tabs-wrap' }, glyph('lb'), h('nav', { class: 'tabs', id: 'tabs', 'data-scroll': 'x' }), glyph('rb')),
        h('div', { class: 'top-actions' },
          topButton('search', 'Search', openSearch),
          topButton('plus', 'Add', openAddMenu),
          topButton('gear', 'Settings', openSettings),
          topButton('power', 'Power', openPowerMenu),
          h('div', { class: 'status' },
            h('span', { class: 'pad-status', id: 'pad-status', title: 'Controllers' }, icon('pad'), h('span', { id: 'pad-count' })),
            h('span', { class: 'clock', id: 'clock' })))),
      h('section', { class: 'hero', id: 'hero' }),
      h('section', { class: 'shelf' }, h('div', { class: 'tiles', id: 'tiles', 'data-scroll': 'x', 'data-center': 'false' })),
      h('footer', { class: 'hints', id: 'hints' }));
    document.body.prepend(app);
    document.body.append(h('div', { id: 'toasts' }));
    return app;
  }

  function topButton(ic, label, fn) {
    return h('button', { type: 'button', class: 'top-btn', 'data-nav': '', title: label, 'aria-label': label, onclick: () => { Ink.sound.play('select'); fn(); } }, icon(ic));
  }

  function renderHints(items) {
    const el = $('#hints');
    el.textContent = '';
    items.forEach(([btn, label]) => el.append(h('span', { class: 'hint' }, glyph(btn), label)));
  }
  function defaultHints() {
    const g = focusedGame();
    const items = [];
    if (g) items.push(['a', state.running.has(g.id) ? 'Resume' : 'Play'], ['x', 'Options']);
    else items.push(['a', 'Select']);
    items.push(['y', 'Add'], ['start', 'Settings']);
    if (state.filter) items.push(['b', 'Clear search']);
    renderHints(items);
  }

  // ================================================================ tabs & tiles
  function tabs() {
    const games = store.data.games.filter(g => !g.hidden);
    const list = [{ id: 'all', name: 'All' }];
    if (games.some(g => g.lastPlayed)) list.push({ id: 'recent', name: 'Recent' });
    if (games.some(g => g.favorite)) list.push({ id: 'fav', name: 'Favorites' });
    const plats = [];
    games.forEach(g => { const p = gamePlatformName(g); if (!plats.includes(p)) plats.push(p); });
    if (plats.length > 1) plats.forEach(p => list.push({ id: 'p:' + p, name: p }));
    store.data.collections.forEach(c => list.push({ id: 'c:' + c, name: c }));
    const usedCollections = new Set();
    games.forEach(g => (g.collections || []).forEach(c => usedCollections.add(c)));
    usedCollections.forEach(c => { if (!store.data.collections.includes(c)) list.push({ id: 'c:' + c, name: c }); });
    return list;
  }

  function visibleGames() {
    let list = store.data.games.filter(g => !g.hidden);
    const t = state.tab;
    if (t === 'recent') list = list.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 20);
    else if (t === 'fav') list = list.filter(g => g.favorite);
    else if (t.startsWith('p:')) list = list.filter(g => gamePlatformName(g) === t.slice(2));
    else if (t.startsWith('c:')) list = list.filter(g => (g.collections || []).includes(t.slice(2)));
    if (state.filter) {
      const f = state.filter.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(f) || gamePlatformName(g).toLowerCase().includes(f));
    }
    if (t !== 'recent') {
      const s = S().sortBy;
      if (s === 'title') list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
      else if (s === 'recent') list = list.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
      else if (s === 'playtime') list = list.slice().sort((a, b) => (b.playtime || 0) - (a.playtime || 0));
      else if (s === 'added') list = list.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }
    // Running games always come first, like a console's "now playing" slot.
    const running = list.filter(g => state.running.has(g.id));
    if (running.length) list = running.concat(list.filter(g => !state.running.has(g.id)));
    return list;
  }

  function renderTabs() {
    const list = tabs();
    if (!list.some(t => t.id === state.tab)) state.tab = 'all';
    const el = $('#tabs');
    el.textContent = '';
    list.forEach(t => el.append(h('button', {
      type: 'button', class: 'tab' + (t.id === state.tab ? ' active' : ''), 'data-nav': '', 'data-tab': t.id,
      onclick: () => setTab(t.id),
    }, t.name)));
    if (state.filter) {
      el.append(h('button', { type: 'button', class: 'tab filter', 'data-nav': '', onclick: () => { state.filter = ''; renderHome(); } }, icon('search'), ' "' + state.filter + '" ✕'));
    }
  }

  function setTab(id) {
    if (id === state.tab) return;
    state.tab = id;
    Ink.sound.play('tab');
    renderHome({ focusFirst: true });
    const active = document.querySelector('.tab.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function cycleTab(d) {
    const list = tabs();
    const i = list.findIndex(t => t.id === state.tab);
    setTab(list[(i + d + list.length) % list.length].id);
  }

  function tileEl(g) {
    const cover = coverOf(g);
    const fit = artFit(g);
    const color = g.color || hashColor(g.title);
    const art = h('div', { class: 'tile-art fit-' + fit, style: { '--tile-color': color } });
    const fallback = h('div', { class: 'tile-fallback' },
      h('span', { class: 'tile-fallback-title' }, g.title),
      h('span', { class: 'tile-fallback-platform' }, gamePlatformName(g)));
    if (cover) {
      if (fit === 'contain') art.append(h('div', { class: 'tile-art-blur', style: { backgroundImage: 'url("' + cover.replace(/"/g, '%22') + '")' } }));
      const img = h('img', { src: cover, alt: '', loading: 'lazy', draggable: 'false' });
      img.addEventListener('error', () => { img.remove(); art.classList.add('no-art'); art.append(fallback); art.querySelectorAll('.tile-art-blur, .tile-icon-title').forEach(x => x.remove()); });
      art.append(img);
      if (fit === 'icon') art.append(h('span', { class: 'tile-icon-title' }, g.title));
    } else {
      art.classList.add('no-art');
      art.append(fallback);
    }
    const badges = h('div', { class: 'tile-badges' },
      state.running.has(g.id) ? h('span', { class: 'badge running' }, h('span', { class: 'dot' }), 'Running') : null,
      g.favorite ? h('span', { class: 'badge fav' }, icon('star')) : null);
    const el = h('button', {
      type: 'button', class: 'tile', 'data-nav': '', 'data-id': g.id,
      onclick: () => play(g.id),
      oncontextmenu: e => { e.preventDefault(); openGameMenu(g.id); },
    }, art, badges, h('div', { class: 'tile-title' }, g.title));
    return el;
  }

  function renderTiles() {
    const el = $('#tiles');
    el.textContent = '';
    el.dataset.scroll = S().layout === 'grid' ? 'y' : 'x';
    const list = visibleGames();
    if (!list.length) {
      const empty = h('div', { class: 'empty' },
        h('div', { class: 'empty-title' }, state.filter ? 'No games match "' + state.filter + '"' : store.data.games.length ? 'Nothing here yet' : 'Your library is empty'),
        h('div', { class: 'empty-text' }, store.data.games.length ? 'Pick another tab or add more games.' : 'Add PC games, Steam games, Android apps or emulator games to get started.'),
        h('div', { class: 'empty-actions' },
          button('Add a game', openAddMenu, { variant: 'primary', icon: 'plus' }),
          button('Set up emulators', manageEmulators, { icon: 'chip' }),
          IS_WINDOWS ? button('Import Steam games', importSteam, { icon: 'steam' }) : null,
          IS_WINDOWS ? button('Import Epic games', importEpic, { icon: 'play' }) : null,
          IS_ANDROID ? button('Add Android apps', () => pickAndroidApp(), { icon: 'android' }) : null));
      el.append(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(g => frag.append(tileEl(g)));
    el.append(frag);
  }

  function renderHero(g) {
    const el = $('#hero');
    el.textContent = '';
    if (!g) { setBackground(''); defaultHints(); return; }
    const running = state.running.has(g.id);
    const meta = [gamePlatformName(g), running ? 'Running now' : fmtAgo(g.lastPlayed), fmtPlaytime(g.playtime)].filter(Boolean);
    Ink.ui.append(el, [
      h('div', { class: 'hero-title' }, g.title),
      h('div', { class: 'hero-meta' }, meta.map((m, i) => h('span', { class: i === 1 && running ? 'live' : '' }, m))),
      g.notes ? h('div', { class: 'hero-notes' }, g.notes) : null]);
    setBackground(S().heroArt ? backgroundOf(g) : '');
    defaultHints();
  }

  let bgFlip = false;
  let bgCurrent = null;
  function setBackground(url) {
    if (url === bgCurrent) return;
    bgCurrent = url;
    const a = $('#bg-art-a');
    const b = $('#bg-art-b');
    const next = bgFlip ? a : b;
    const prev = bgFlip ? b : a;
    bgFlip = !bgFlip;
    if (!url) { a.classList.remove('show'); b.classList.remove('show'); return; }
    const img = new Image();
    img.onload = () => {
      if (bgCurrent !== url) return;
      next.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      next.classList.add('show');
      prev.classList.remove('show');
    };
    img.onerror = () => { if (bgCurrent === url) { a.classList.remove('show'); b.classList.remove('show'); } };
    img.src = url;
  }

  function focusedGame() { return state.focusedId ? store.game(state.focusedId) : null; }

  function renderHome(opts) {
    opts = opts || {};
    renderProfile();
    renderTabs();
    renderTiles();
    const keep = opts.focusId || (!opts.focusFirst && state.focusedId);
    const cur = baseLayer.current;
    const focusOnTile = opts.force || !cur || !document.body.contains(cur) || cur.classList.contains('tile');
    const byId = keep && document.querySelector('.tile[data-id="' + CSS.escape(keep) + '"]');
    const target = focusOnTile ? (byId || document.querySelector('.tile')) : null;
    if (target) {
      if (Ink.nav.depth === 1) {
        Ink.nav.focus(target);
        state.focusedId = target.dataset.id;
        renderHero(store.game(state.focusedId));
      } else {
        if (cur) cur.classList.remove('focused');
        baseLayer.current = target;
        state.focusedId = target.dataset.id;
        renderHero(store.game(state.focusedId));
      }
    } else if (!document.querySelector('.tile')) {
      state.focusedId = null;
      renderHero(null);
      if (Ink.nav.depth === 1) Ink.nav.ensureFocus();
    } else {
      renderHero(focusedGame());
    }
  }

  // ================================================================ launching
  async function play(id) {
    const g = store.game(id);
    if (!g) return;
    if (state.running.has(id)) return resume(g);
    const others = [...state.running].map(store.game).filter(Boolean);
    // Only one game runs at a time, like a console.
    // Android with closing turned off: leave other apps in the background, but an
    // emulator must be closed before it can load a different game (or it boots the BIOS).
    const samePkg = o => IS_ANDROID && appPackage(o) && appPackage(o) === appPackage(g);
    if (others.length && IS_ANDROID && !S().forceClose && !others.some(samePkg)) {
      others.forEach(o => sessionEnded(o.id));
    } else if (others.length) {
      if (S().confirmStop) {
        const cur = others[others.length - 1];
        const answer = await ask({
          title: cur.title + ' is still running',
          message: 'Only one game can run at a time. Stop ' + cur.title + ' and start ' + g.title + '?',
          buttons: [
            { id: 'stop', label: 'Stop & play', variant: 'primary', icon: 'stop' },
            { id: 'cancel', label: 'Cancel' },
          ],
        });
        if (answer !== 'stop') return;
      }
      for (const o of others) {
        if (IS_ANDROID && !S().forceClose && !samePkg(o)) sessionEnded(o.id);
        else await stop(o, true, true, samePkg(o));
      }
      // Give Android a moment to close the old app before the new one starts.
      if (IS_ANDROID) await new Promise(r => setTimeout(r, others.some(samePkg) ? 700 : 400));
    }
    const emulator = g.type === 'emulator' ? store.emulator(g.emulatorId) : null;
    if (g.type === 'emulator' && !emulator) {
      Ink.sound.play('error');
      toast('This game\'s emulator was deleted. Edit the game to pick one.', 'error');
      return;
    }
    Ink.sound.play('launch');
    document.body.classList.add('launching');
    setTimeout(() => document.body.classList.remove('launching'), 1400);
    // Android: if this was the last game started in its emulator, it may still be open in
    // the background - check before restarting it (and losing progress).
    const pkg = appPackage(g);
    const maybeOpen = IS_ANDROID && g.type === 'emulator' && pkg && store.data.lastGameByApp[pkg] === g.id;
    let res;
    state.launchedAt = Date.now();
    try { res = await bridge.call(maybeOpen ? 'resumeOrLaunch' : 'launch', { game: g, emulator, running: false }); } catch (e) { res = { ok: false, error: String(e && e.message || e) }; }
    if (!res || !res.ok) {
      Ink.sound.play('error');
      toast((res && res.error) || 'Could not start the game.', 'error');
      return;
    }
    g.lastPlayed = Date.now();
    state.lastLaunched = g.id;
    state.launchedAt = Date.now();
    state.awayForGame = true;
    if (IS_ANDROID && pkg) store.data.lastGameByApp[pkg] = g.id;
    if (res.tracked !== false) {
      state.running.add(g.id);
      store.data.sessions[g.id] = { startedAt: Date.now() };
    }
    store.save();
    renderHome({ focusId: g.id });
  }

  async function resume(g) {
    Ink.sound.play('select');
    state.lastLaunched = g.id;
    state.launchedAt = Date.now();
    state.awayForGame = true;
    const emulator = g.type === 'emulator' ? store.emulator(g.emulatorId) : null;
    // Android emulators: make sure the game itself comes back, not the emulator's menu.
    const res = await bridge.call(IS_ANDROID && emulator ? 'resumeOrLaunch' : 'resume', { game: g, emulator, running: true });
    state.launchedAt = Date.now();
    if (!res || !res.ok) toast((res && res.error) || 'Could not switch to the game.', 'error');
  }

  let warnedClose = false;
  /** The Android app a game runs in (the emulator's package for emulator games). */
  function appPackage(g) {
    if (!g) return '';
    if (g.type === 'android') return g.package || '';
    if (g.type === 'emulator') { const e = store.emulator(g.emulatorId); return (e && e.package) || ''; }
    return '';
  }

  async function stop(g, quiet, switching, force) {
    const res = await bridge.call('stop', { game: g, emulator: g.type === 'emulator' ? store.emulator(g.emulatorId) : null, switching: !!switching, force: !!force });
    // The app was closed, so nothing to resume next time.
    const pkgClosed = appPackage(g);
    if (res && res.closed && pkgClosed && store.data.lastGameByApp[pkgClosed] === g.id) delete store.data.lastGameByApp[pkgClosed];
    sessionEnded(g.id, res && res.seconds);
    // Android 14+ only lets SofaBox fully close a game through the Home button service.
    if (IS_ANDROID && (S().forceClose || force) && res && res.closed === false && res.hint === 'service' && !warnedClose) {
      warnedClose = true;
      toast('To fully close games, turn on "SofaBox Home button" in Settings → Android setup.', 'error');
    }
    if (res && res.error && !quiet) toast(res.error, 'error');
    else if (!quiet) toast(g.title + ' was closed.');
  }

  function sessionEnded(id, seconds) {
    const g = store.game(id);
    const sess = store.data.sessions[id];
    if (g) {
      // Android cannot see other apps, so playtime is counted while SofaBox is in the background.
      if (seconds === undefined && sess && sess.played) seconds = sess.played;
      if (seconds) g.playtime = (g.playtime || 0) + Math.round(seconds);
    }
    delete store.data.sessions[id];
    state.running.delete(id);
    store.save();
    if (Ink.nav.depth === 1) renderHome();
  }

  // ================================================================ home button
  function closeAllLayers() {
    while (Ink.nav.depth > 1) {
      const l = Ink.nav.top();
      Ink.nav.pop(l);
      l.el.remove();
    }
  }

  let lastHome = 0;
  function goHome() {
    // Android can report Home twice (Home intent + app resume); handle it once.
    if (Date.now() - lastHome < 800) return;
    lastHome = Date.now();
    closeAllLayers();
    Ink.sound.play('home');
    const runningId = [...state.running].pop();
    if (state.filter) state.filter = '';
    if (runningId) {
      const vis = visibleGames().some(g => g.id === runningId);
      if (!vis) state.tab = 'all';
      renderHome({ focusId: runningId });
      const g = store.game(runningId);
      if (g) toast(g.title + ' is still running. Select it to resume.');
    } else {
      renderHome();
    }
  }

  // ================================================================ game menu
  function openGameMenu(id) {
    const g = store.game(id);
    if (!g) return;
    const running = state.running.has(id);
    const custom = S().sortBy === 'custom' && state.tab !== 'recent';
    menu({
      title: g.title,
      subtitle: gamePlatformName(g),
      items: [
        running ? { label: 'Resume', icon: 'resume', action: () => resume(g) } : { label: 'Play', icon: 'play', action: () => play(id) },
        running ? { label: 'Quit game', icon: 'stop', danger: true, action: () => stop(g) } : null,
        { label: g.favorite ? 'Remove from favorites' : 'Add to favorites', icon: 'star', action: () => { g.favorite = !g.favorite; store.save(); renderHome({ focusId: id }); } },
        { label: 'Edit', icon: 'edit', action: () => editGame(g) },
        { label: 'Find artwork online', hint: 'Cover and background from SteamGridDB', icon: 'search', action: async () => {
          if (!S().sgdbKey) { toast('Add your free SteamGridDB key in Settings → Artwork first.', 'error'); return; }
          toast('Finding artwork for ' + g.title + '…');
          const r = await findArtwork(g, { replace: true });
          toast(r === 'ok' ? 'Artwork updated.' : r === 'none' ? 'No artwork found for "' + g.title + '". Try editing the title.' : r === 'key' ? 'SteamGridDB did not accept the API key.' : 'Could not reach SteamGridDB.', r === 'ok' ? '' : 'error');
          renderHome({ focusId: id });
        } },
        { label: 'Change cover art', icon: 'image', action: async () => { const r = await bridge.call('importImage', {}); if (r && r.url) { g.cover = r.url; store.save(); renderHome({ focusId: id }); } } },
        custom ? { label: 'Move left', icon: 'left', action: () => moveGame(id, -1) } : null,
        custom ? { label: 'Move right', icon: 'right', action: () => moveGame(id, 1) } : null,
        { label: 'Duplicate', icon: 'copy', action: () => { const c = store.addGame(Object.assign({}, g, { id: undefined, title: g.title + ' (copy)', playtime: 0, lastPlayed: 0 })); renderHome({ focusId: c.id }); } },
        { label: 'Remove from library', icon: 'trash', danger: true, action: () => removeGame(g) },
      ],
    });
  }

  function moveGame(id, d) {
    const vis = visibleGames().filter(g => !state.running.has(g.id));
    const i = vis.findIndex(g => g.id === id);
    const other = vis[i + d];
    if (!other) return;
    const all = store.data.games;
    const a = all.findIndex(g => g.id === id);
    const b = all.findIndex(g => g.id === other.id);
    [all[a], all[b]] = [all[b], all[a]];
    store.save();
    renderHome({ focusId: id });
  }

  async function removeGame(g) {
    const r = await ask({ title: 'Remove ' + g.title + '?', message: 'This only removes the tile. No files are deleted.', buttons: [{ id: 'yes', label: 'Remove', variant: 'danger', icon: 'trash' }, { id: 'no', label: 'Cancel' }] });
    if (r !== 'yes') return;
    store.removeGame(g.id);
    state.running.delete(g.id);
    renderHome({ focusFirst: true });
  }

  // ================================================================ add menu
  function openAddMenu() {
    menu({
      title: 'Add to library',
      items: [
        IS_ANDROID ? null : { label: 'PC game or program', hint: 'Any .exe, .bat or shortcut', icon: 'play', action: () => editGame(null, { type: 'native' }) },
        IS_ANDROID
          ? { label: 'Web page or link', hint: 'Web games and sites open full screen in SofaBox; app links open their app', icon: 'link', action: () => editGame(null, { type: 'url' }) }
          : { label: 'Web page, Steam / Epic link', hint: 'https://..., steam://rungameid/..., com.epicgames.launcher://...', icon: 'link', action: () => editGame(null, { type: 'url' }) },
        IS_WINDOWS ? { label: 'Import installed Steam games', icon: 'steam', action: importSteam } : null,
        IS_WINDOWS ? { label: 'Import installed Epic games', icon: 'play', action: importEpic } : null,
        IS_ANDROID || bridge.platform === 'browser' ? { label: 'Android app or game', icon: 'android', action: () => pickAndroidApp() } : null,
        { label: 'Emulator game', hint: 'One ROM file', icon: 'chip', action: () => editGame(null, { type: 'emulator' }) },
        { label: 'Scan a ROM folder', hint: 'Adds every game in a folder', icon: 'folder', action: scanMenu },
        { separator: 'Organize' },
        { label: 'Manage emulators', icon: 'chip', action: manageEmulators },
        { label: 'New collection', icon: 'star', action: newCollection },
      ],
    });
  }

  function newCollection() {
    const input = textInput({ placeholder: 'Collection name', label: 'Collection name' });
    const m = modal({
      title: 'New collection',
      class: 'dialog',
      body: [field('Name', input, 'Add games to it from each game\'s Edit screen.')],
      actions: [
        button('Create', () => {
          const name = input.value.trim();
          if (!name) return;
          if (!store.data.collections.includes(name)) store.data.collections.push(name);
          store.save();
          m.close();
          state.tab = 'c:' + name;
          renderHome({ focusFirst: true });
        }, { variant: 'primary' }),
        button('Cancel', () => m.close()),
      ],
    });
  }

  function scanMenu() {
    if (!store.data.emulators.length) {
      toast('Add an emulator first, then scan its ROM folder.');
      return addEmulator();
    }
    menu({
      title: 'Scan ROMs for which emulator?',
      items: store.data.emulators.map(e => ({ label: e.name, hint: P.platform(e.platform).name + ' · ' + (e.extensions || 'any file'), icon: 'chip', action: () => scanForEmulator(e) })),
    });
  }

  async function scanForEmulator(emu) {
    const folder = await bridge.call('pickFolder', { title: 'Choose the folder with your ' + P.platform(emu.platform).name + ' games' });
    if (!folder || !folder.path) return;
    toast('Scanning…');
    const exts = (emu.extensions || '').split(/[\s,;]+/).map(x => x.replace(/^\./, '').toLowerCase()).filter(Boolean);
    let files = [];
    try { files = await bridge.call('scanFolder', { folder: folder.path, extensions: exts, recursive: true }) || []; } catch (e) { files = []; }
    const existing = new Set(store.data.games.filter(g => g.type === 'emulator').map(g => g.rom));
    const fresh = files.filter(f => !existing.has(f.path));
    if (!fresh.length) {
      toast(files.length ? 'All ' + files.length + ' games in that folder are already in your library.' : 'No ' + (exts.join(', ') || '') + ' files found there.', files.length ? '' : 'error');
      return;
    }
    const r = await ask({
      title: 'Found ' + fresh.length + ' game' + (fresh.length === 1 ? '' : 's'),
      message: 'Add them to your library using ' + emu.name + '?' + (S().autoCovers && P.platform(emu.platform).libretro ? ' Cover art will be downloaded automatically when available.' : ''),
      buttons: [{ id: 'yes', label: 'Add ' + fresh.length, variant: 'primary', icon: 'plus' }, { id: 'no', label: 'Cancel' }],
    });
    if (r !== 'yes') return;
    let lastId = null;
    const added = [];
    fresh.forEach(f => {
      const raw = baseName(f.name || f.path);
      const g = store.addGame({
        type: 'emulator', emulatorId: emu.id, rom: f.path, romName: raw, title: cleanTitle(raw),
        cover: S().autoCovers ? P.libretroCover(emu.platform, raw) : '',
      });
      lastId = g.id;
      added.push(g.id);
    });
    store.save();
    toast('Added ' + fresh.length + ' games.');
    state.tab = 'all';
    renderHome({ focusId: lastId });
    autoArtwork(added);
  }

  async function importSteam() {
    toast('Looking for Steam games…');
    let res;
    try { res = await bridge.call('importSteam', {}); } catch (e) { res = null; }
    const games = (res && res.games) || [];
    const existing = new Set(store.data.games.map(g => g.steamAppId).filter(Boolean));
    const fresh = games.filter(g => !existing.has(g.appid));
    if (!fresh.length) {
      toast(games.length ? 'Your Steam games are already in the library.' : (res && res.error) || 'No installed Steam games found.', games.length ? '' : 'error');
      return;
    }
    const r = await ask({
      title: 'Found ' + fresh.length + ' Steam game' + (fresh.length === 1 ? '' : 's'),
      message: fresh.slice(0, 8).map(g => g.name).join(', ') + (fresh.length > 8 ? '…' : ''),
      buttons: [{ id: 'yes', label: 'Add all', variant: 'primary', icon: 'plus' }, { id: 'no', label: 'Cancel' }],
    });
    if (r !== 'yes') return;
    let lastId;
    fresh.forEach(s => {
      lastId = store.addGame({ type: 'url', url: 'steam://rungameid/' + s.appid, title: s.name, steamAppId: s.appid, processName: s.installDir || '', platform: 'Steam' }).id;
    });
    toast('Added ' + fresh.length + ' Steam games.');
    renderHome({ focusId: lastId });
  }

  async function importEpic() {
    toast('Looking for Epic games…');
    let res;
    try { res = await bridge.call('importEpic', {}); } catch (e) { res = null; }
    const games = (res && res.games) || [];
    const existing = new Set(store.data.games.map(g => g.epicAppName).filter(Boolean));
    const fresh = games.filter(g => !existing.has(g.appName));
    if (!fresh.length) {
      toast(games.length ? 'Your Epic games are already in the library.' : (res && res.error) || 'No installed Epic games found.', games.length ? '' : 'error');
      return;
    }
    const r = await ask({
      title: 'Found ' + fresh.length + ' Epic game' + (fresh.length === 1 ? '' : 's'),
      message: fresh.slice(0, 8).map(g => g.name).join(', ') + (fresh.length > 8 ? '…' : '') + '. Tip: add cover art from each game\'s options (X).',
      buttons: [{ id: 'yes', label: 'Add all', variant: 'primary', icon: 'plus' }, { id: 'no', label: 'Cancel' }],
    });
    if (r !== 'yes') return;
    let lastId;
    const added = [];
    fresh.forEach(e => {
      // Launch through Epic (needed for online/DRM); watch the install folder for running detection.
      lastId = store.addGame({ type: 'url', url: e.url, openIn: 'browser', title: e.name, epicAppName: e.appName, processName: e.installDir || '', platform: 'Epic' }).id;
      added.push(lastId);
    });
    toast('Added ' + fresh.length + ' Epic games.');
    renderHome({ focusId: lastId });
    autoArtwork(added);
  }

  // ================================================================ artwork (SteamGridDB)
  // Covers + backgrounds for any platform (Switch, PS2, PC ...). Needs a free API key.
  const SGDB = 'https://www.steamgriddb.com/api/v2';

  function imageLoads(url) {
    return new Promise(resolve => {
      if (!url) return resolve(false);
      const img = new Image();
      const t = setTimeout(() => resolve(false), 8000);
      img.onload = () => { clearTimeout(t); resolve(true); };
      img.onerror = () => { clearTimeout(t); resolve(false); };
      img.src = url;
    });
  }

  async function sgdb(path) {
    const res = await bridge.call('httpGetJson', { url: SGDB + path, bearer: S().sgdbKey });
    if (!res || res.status === 401 || res.status === 403) throw new Error('key');
    return res.json && res.json.success ? res.json.data : null;
  }

  function gridDimensions() {
    const shape = S().tileShape;
    if (shape === 'portrait') return '600x900,342x482,660x930';
    if (shape === 'square') return '512x512,1024x1024';
    return '920x430,460x215';
  }

  /** Find and download cover + background for a game. Returns 'ok' | 'none' | 'key' | 'error'. */
  async function findArtwork(g, opts) {
    opts = opts || {};
    if (!S().sgdbKey) return 'key';
    try {
      const needCover = opts.replace || !g.cover || !(await imageLoads(g.cover));
      const needBg = opts.replace || !g.background;
      if (!needCover && !needBg) return 'ok';
      const found = await sgdb('/search/autocomplete/' + encodeURIComponent(g.title));
      if (!found || !found.length) return 'none';
      const gameId = found[0].id;
      let got = false;
      if (needCover) {
        const grids = await sgdb('/grids/game/' + gameId + '?dimensions=' + gridDimensions() + '&types=static&nsfw=false&humor=false');
        const pick = grids && grids[0];
        const saved = pick && await bridge.call('downloadImage', { url: pick.url });
        if (saved && saved.url) { g.cover = saved.url; g.artFit = ''; got = true; }
      }
      if (needBg) {
        const heroes = await sgdb('/heroes/game/' + gameId + '?types=static&nsfw=false&humor=false');
        const pick = heroes && heroes[0];
        const saved = pick && await bridge.call('downloadImage', { url: pick.url });
        if (saved && saved.url) { g.background = saved.url; got = true; }
      }
      if (got) store.save();
      return got ? 'ok' : 'none';
    } catch (e) {
      return e && e.message === 'key' ? 'key' : 'error';
    }
  }

  let artBusy = false;
  /** Fill in missing artwork for several games, one at a time, in the background. */
  async function fillArtwork(games, announce) {
    if (!S().sgdbKey) {
      if (announce) toast('Add your free SteamGridDB key in Settings → Artwork to download artwork.', 'error');
      return;
    }
    if (artBusy) { if (announce) toast('Already downloading artwork…'); return; }
    artBusy = true;
    let done = 0;
    let missing = 0;
    try {
      if (announce) toast('Finding artwork for ' + games.length + ' game' + (games.length === 1 ? '' : 's') + '…');
      for (const g of games) {
        const r = await findArtwork(g);
        if (r === 'key') { toast('SteamGridDB did not accept the API key. Check it in Settings → Artwork.', 'error'); break; }
        if (r === 'ok') done++; else missing++;
        if (Ink.nav.depth === 1) renderHome();
      }
      if (announce || done) toast('Artwork updated for ' + done + ' game' + (done === 1 ? '' : 's') + (missing ? ' (' + missing + ' not found)' : '') + '.');
    } finally {
      artBusy = false;
      if (Ink.nav.depth === 1) renderHome();
    }
  }

  function autoArtwork(ids) {
    if (!S().sgdbKey || !S().autoArtwork) return;
    const games = ids.map(store.game).filter(g => g && !g.steamAppId);
    if (games.length) fillArtwork(games, false);
  }

  // ================================================================ Android app picker
  async function pickAndroidApp(onPick) {
    const apps = (await bridge.call('listApps', {})) || [];
    if (!apps.length) { toast(IS_ANDROID ? 'No apps found.' : 'App list is only available on Android.', 'error'); return; }
    const grid = h('div', { class: 'app-grid' });
    let m;
    const existing = new Set(store.data.games.filter(g => g.type === 'android').map(g => g.package));
    apps.sort((a, b) => a.name.localeCompare(b.name)).forEach(a => {
      grid.append(h('button', {
        type: 'button', class: 'app-item' + (existing.has(a.package) ? ' added' : ''), 'data-nav': '',
        onclick: () => {
          Ink.sound.play('select');
          if (onPick) { m.close(); onPick(a); return; }
          if (existing.has(a.package)) { toast(a.name + ' is already in your library.'); return; }
          const g = store.addGame({ type: 'android', package: a.package, title: a.name });
          existing.add(a.package);
          toast('Added ' + a.name);
          renderHome({ focusId: g.id });
          m.close();
        },
      }, h('img', { src: 'https://ink.app/appicon/' + encodeURIComponent(a.package), alt: '', loading: 'lazy' }), h('span', null, a.name)));
    });
    m = modal({ title: onPick ? 'Choose an app' : 'Add an Android app', wide: true, body: grid });
  }

  // ================================================================ game editor
  function editGame(existing, preset) {
    const isNew = !existing;
    const draft = JSON.parse(JSON.stringify(existing || Object.assign({ type: IS_ANDROID ? 'android' : 'native', title: '', collections: [] }, preset || {})));
    if (draft.type === 'emulator' && !draft.emulatorId && store.data.emulators[0]) draft.emulatorId = store.data.emulators[0].id;
    let m;

    const typeOptions = [
      !IS_ANDROID && { value: 'native', label: 'PC game / program' },
      { value: 'url', label: IS_ANDROID ? 'Web page / link' : 'Web page / shortcut / URL' },
      (IS_ANDROID || bridge.platform === 'browser') && { value: 'android', label: 'Android app' },
      { value: 'emulator', label: 'Emulator game' },
    ].filter(Boolean);

    function browseRow(input, fn) {
      return h('div', { class: 'row' }, input, button('Browse', fn, { icon: 'folder' }));
    }

    function typeFields() {
      const out = [];
      if (draft.type === 'native') {
        const path = textInput({ value: draft.path, placeholder: 'C:\\Games\\MyGame\\game.exe', onchange: v => { draft.path = v; } });
        out.push(field('Program', browseRow(path, async () => {
          const f = await bridge.call('pickFile', { kind: 'exe', title: 'Choose the game program' });
          if (!f) return;
          draft.path = f.path; path.value = f.path;
          if (!draft.title) { draft.title = baseName(f.path); titleInput.value = draft.title; }
        }), 'The .exe (or .bat / .lnk shortcut) that starts the game.'));
        out.push(field('Launch options', textInput({ value: draft.args, placeholder: 'e.g. -fullscreen', onchange: v => { draft.args = v; } })));
        out.push(field('Start in folder', textInput({ value: draft.workingDir, placeholder: 'Defaults to the program\'s folder', onchange: v => { draft.workingDir = v; } })));
        out.push(field('Watch process', textInput({ value: draft.processName, placeholder: 'Optional: game.exe or the game\'s folder', onchange: v => { draft.processName = v; } }),
          'Needed when the program is a launcher that starts the real game and exits. SofaBox uses it to know if the game is still running and to close it.'));
      } else if (draft.type === 'url') {
        const url = textInput({ value: draft.url, placeholder: IS_ANDROID ? 'https://… (or an app link)' : 'https://…  or  steam://rungameid/1245620', onchange: v => { draft.url = v; } });
        out.push(field(IS_ANDROID ? 'Link' : 'Link or shortcut', IS_ANDROID ? url : browseRow(url, async () => {
          const f = await bridge.call('pickFile', { kind: 'shortcut', title: 'Choose a shortcut' });
          if (f) { draft.url = f.path; url.value = f.path; if (!draft.title) { draft.title = baseName(f.path); titleInput.value = draft.title; } }
        }), IS_ANDROID ? 'A web page (cloud gaming, browser games…) or an app link.' : 'A web page, a store link (Steam, Epic, GOG Galaxy, Xbox), a .url/.lnk shortcut, or any file to open.'));
        out.push(field('Open web pages in', choice({ options: [{ value: 'ink', label: 'SofaBox, full screen' }, { value: 'browser', label: 'My web browser' }], value: draft.openIn === 'browser' ? 'browser' : 'ink', onchange: v => { draft.openIn = v; } }),
          'Full screen in SofaBox works like a game: the Home button brings you back and SofaBox can close it. Sign-ins are remembered.'));
        if (!IS_ANDROID) {
          out.push(field('Watch process', textInput({ value: draft.processName, placeholder: 'e.g. eldenring.exe or C:\\Games\\EldenRing', onchange: v => { draft.processName = v; } }),
            'For store links: store launchers do not report back when the game runs. Give the game\'s exe name or install folder so SofaBox can detect, resume and close it.'));
        }
      } else if (draft.type === 'android') {
        const label = h('span', { class: 'app-chosen' }, draft.package || 'No app selected');
        out.push(field('App', h('div', { class: 'row' }, label, button('Choose app', () => pickAndroidApp(a => {
          draft.package = a.package;
          label.textContent = a.package;
          if (!draft.title) { draft.title = a.name; titleInput.value = a.name; }
        }), { icon: 'android' }))));
      } else if (draft.type === 'emulator') {
        if (!store.data.emulators.length) {
          out.push(h('div', { class: 'notice' }, 'You have no emulators set up yet. ',
            button('Add an emulator', () => addEmulator(e => { draft.emulatorId = e.id; rebuild(); }), { variant: 'primary', icon: 'plus' })));
        } else {
          out.push(field('Emulator', h('div', { class: 'row' },
            choice({ options: store.data.emulators.map(e => ({ value: e.id, label: e.name + ' · ' + P.platform(e.platform).short })), value: draft.emulatorId, onchange: v => { draft.emulatorId = v; } }),
            button('New', () => addEmulator(e => { draft.emulatorId = e.id; rebuild(); }), { icon: 'plus' }))));
        }
        const rom = textInput({ value: draft.rom, placeholder: IS_ANDROID ? 'Choose a ROM file' : 'D:\\ROMs\\SNES\\Game (USA).sfc', onchange: v => { draft.rom = v; draft.romName = baseName(v); } });
        out.push(field('Game file (ROM)', browseRow(rom, async () => {
          const emu = store.emulator(draft.emulatorId);
          const exts = emu && emu.extensions ? emu.extensions.split(/[\s,;]+/).filter(Boolean) : [];
          const f = await bridge.call('pickFile', { kind: 'rom', extensions: exts, title: 'Choose the game file' });
          if (!f) return;
          draft.rom = f.path; rom.value = f.path;
          draft.romName = baseName(f.name || f.path);
          if (!draft.title) { draft.title = cleanTitle(draft.romName); titleInput.value = draft.title; }
        })));
        if (!IS_ANDROID) out.push(field('Extra emulator options', textInput({ value: draft.args, placeholder: 'Optional, added after the emulator\'s arguments', onchange: v => { draft.args = v; } })));
      }
      return out;
    }

    const titleInput = textInput({ value: draft.title, placeholder: 'Game title', label: 'Title', onchange: v => { draft.title = v; } });

    function lookFields() {
      const preview = h('div', { class: 'cover-preview' });
      function paintPreview() {
        preview.textContent = '';
        const src = draft.cover || coverOf(Object.assign({}, draft, { cover: '' }));
        if (src) preview.append(h('img', { src, alt: '' }));
        else preview.append(h('span', null, 'No image'));
      }
      paintPreview();
      const coverUrl = textInput({ value: /^https?:/.test(draft.cover || '') ? draft.cover : '', placeholder: 'https://… image link', onchange: v => { draft.cover = v.trim(); paintPreview(); } });
      const findOnline = () => {
        const emu = store.emulator(draft.emulatorId);
        const name = draft.romName || baseName(draft.rom || '');
        const url = emu && P.libretroCover(emu.platform, name);
        if (!url) { toast('Online covers need an emulator game on a supported platform.', 'error'); return; }
        draft.cover = url; coverUrl.value = url; paintPreview();
        preview.querySelector('img').addEventListener('error', () => toast('No cover found for "' + name + '". Name ROMs like "Super Mario World (USA)" for best results.', 'error'));
      };
      return section('Look',
        field('Cover art', h('div', { class: 'cover-row' }, preview, h('div', { class: 'cover-buttons' },
          button('Choose image', async () => { const r = await bridge.call('importImage', {}); if (r && r.url) { draft.cover = r.url; paintPreview(); } }, { icon: 'image' }),
          draft.type === 'emulator' ? button('Find online', findOnline, { icon: 'search' }) : null,
          button('Clear', () => { draft.cover = ''; coverUrl.value = ''; paintPreview(); }, { icon: 'trash' }),
          coverUrl))),
        field('Image fit', choice({ options: [{ value: '', label: 'Automatic' }, { value: 'cover', label: 'Fill tile' }, { value: 'contain', label: 'Fit whole image' }, { value: 'icon', label: 'Icon' }], value: draft.artFit || '', onchange: v => { draft.artFit = v; } })),
        field('Background', h('div', { class: 'row' },
          button(draft.background ? 'Change background' : 'Choose background', async () => { const r = await bridge.call('importImage', {}); if (r && r.url) { draft.background = r.url; toast('Background set.'); } }, { icon: 'image' }),
          button('Clear', () => { draft.background = ''; toast('Background cleared.'); }, { icon: 'trash' })), 'Shown behind the library when this game is selected. Defaults to the cover art.'),
        field('Tile color', swatches({ colors: [''].concat(PALETTE), value: draft.color || '', onchange: v => { draft.color = v; } }), 'Used when there is no cover art.'),
        field('Platform label', textInput({ value: draft.platform, placeholder: gamePlatformName(Object.assign({}, draft, { platform: '' })), onchange: v => { draft.platform = v.trim(); } }), 'Games with the same label get their own tab.'),
        field('Collections', textInput({ value: (draft.collections || []).join(', '), placeholder: 'e.g. Couch co-op, Racing', onchange: v => { draft.collections = v.split(',').map(s => s.trim()).filter(Boolean); } }), 'Comma separated. Each collection becomes a tab.'),
        field('Notes', textInput({ value: draft.notes, multiline: true, rows: 2, placeholder: 'Shown under the title', onchange: v => { draft.notes = v; } })),
        field('Favorite', toggle({ value: draft.favorite, onchange: v => { draft.favorite = v; } })),
        field('Hidden', toggle({ value: draft.hidden, onchange: v => { draft.hidden = v; } }), 'Hide from the library without deleting.'));
    }

    function build() {
      return [
        field('Title', titleInput),
        field('Type', choice({ options: typeOptions, value: draft.type, onchange: v => { draft.type = v; if (v === 'emulator' && !draft.emulatorId && store.data.emulators[0]) draft.emulatorId = store.data.emulators[0].id; rebuild(true); } })),
        ...typeFields(),
        lookFields(),
      ];
    }

    function rebuild(keepTypeFocus) {
      if (m.closed) return;
      const scroll = m.body.scrollTop;
      m.setBody(...build());
      m.body.scrollTop = scroll;
      requestAnimationFrame(() => {
        const target = keepTypeFocus ? m.body.querySelectorAll('.choice')[0] : m.body.querySelector('[data-nav]');
        if (target) Ink.nav.focus(target, { scroll: false });
      });
    }

    function validate() {
      if (!draft.title.trim()) return 'Give the game a title.';
      if (draft.type === 'native' && !draft.path) return 'Choose the program to start.';
      if (draft.type === 'url' && !draft.url) return 'Enter a shortcut or URL.';
      if (draft.type === 'android' && !draft.package) return 'Choose an app.';
      if (draft.type === 'emulator' && !draft.emulatorId) return 'Choose an emulator.';
      if (draft.type === 'emulator' && !draft.rom) return 'Choose the game file.';
      return null;
    }

    function saveDraft() {
      const err = validate();
      if (err) { Ink.sound.play('error'); toast(err, 'error'); return; }
      draft.title = draft.title.trim();
      let id;
      if (isNew) { id = store.addGame(draft).id; setTimeout(() => autoArtwork([id]), 300); }
      else { Object.assign(existing, draft); id = existing.id; store.save(); }
      m.close();
      renderHome({ focusId: id });
    }

    m = modal({
      title: isNew ? 'Add game' : 'Edit ' + existing.title,
      wide: true,
      body: build(),
      actions: [
        button('Save', saveDraft, { variant: 'primary' }),
        button('Cancel', () => m.close()),
        !isNew ? button('Remove', () => { m.close(); removeGame(existing); }, { variant: 'danger', icon: 'trash' }) : null,
      ],
      onAction: action => { if (action === 'start') { saveDraft(); return true; } return false; },
    });
  }

  // ================================================================ emulators
  function manageEmulators() {
    let m;
    function rows() {
      const list = h('div', { class: 'emu-list' });
      if (!store.data.emulators.length) {
        list.append(h('div', { class: 'notice' }, 'Emulators are set up once, then every game for that system just needs its ROM file. SofaBox starts the emulator with the right command-line options (Windows) or launch intent (Android) so the game boots straight away.'));
      }
      store.data.emulators.forEach(e => {
        const count = store.data.games.filter(g => g.emulatorId === e.id).length;
        list.append(h('button', {
          type: 'button', class: 'emu-row', 'data-nav': '',
          onclick: () => {
            Ink.sound.play('select');
            menu({
              title: e.name,
              items: [
                { label: 'Edit', icon: 'edit', action: () => editEmulator(e, false, refresh) },
                { label: 'Scan ROM folder', icon: 'folder', action: () => scanForEmulator(e) },
                { label: 'Add one game', icon: 'plus', action: () => editGame(null, { type: 'emulator', emulatorId: e.id }) },
                { label: 'Duplicate', icon: 'copy', action: () => { store.addEmulator(Object.assign({}, e, { id: undefined, name: e.name + ' (copy)' })); refresh(); } },
                { label: 'Delete', icon: 'trash', danger: true, action: async () => {
                  const r = await ask({ title: 'Delete ' + e.name + '?', message: count ? count + ' game(s) use it and will stop working until you pick another emulator.' : 'No games use it.', buttons: [{ id: 'yes', label: 'Delete', variant: 'danger' }, { id: 'no', label: 'Cancel' }] });
                  if (r === 'yes') { store.removeEmulator(e.id); refresh(); }
                } },
              ],
            });
          },
        }, icon('chip'), h('span', { class: 'emu-name' }, e.name, h('small', null, P.platform(e.platform).name + ' · ' + count + ' game' + (count === 1 ? '' : 's'))),
        h('span', { class: 'emu-path' }, IS_ANDROID ? e.package : e.exe)));
      });
      return list;
    }
    function refresh() { if (!m.closed) { m.setBody(rows()); requestAnimationFrame(() => Ink.nav.ensureFocus()); } renderHome(); }
    m = modal({
      title: 'Emulators',
      subtitle: IS_ANDROID ? 'Launched with Android intents' : 'Launched with command-line arguments',
      wide: true,
      body: rows(),
      actions: [button('Add emulator', () => addEmulator(() => refresh()), { variant: 'primary', icon: 'plus' }), button('Close', () => m.close())],
    });
  }

  function addEmulator(onSaved) {
    const list = IS_ANDROID ? P.ANDROID : P.WINDOWS;
    menu({
      title: 'Choose an emulator',
      subtitle: 'Everything can be changed afterwards',
      items: list.map(p => ({ label: p.name, hint: P.platform(p.platform).name, icon: 'chip', action: () => {
        const draft = JSON.parse(JSON.stringify(p));
        draft.preset = p.id;
        delete draft.id;
        editEmulator(draft, true, onSaved);
      } })),
    });
  }

  function editEmulator(emu, isNew, onSaved) {
    const draft = JSON.parse(JSON.stringify(emu));
    let m;
    const fields = [
      field('Name', textInput({ value: draft.name, onchange: v => { draft.name = v; } })),
      field('Platform', choice({ options: P.PLATFORMS.filter(p => p.id !== 'pc' && p.id !== 'android').map(p => ({ value: p.id, label: p.name })), value: draft.platform, onchange: v => { draft.platform = v; } }), 'Used for tabs and automatic cover art.'),
    ];
    if (IS_ANDROID) {
      const pkg = textInput({ value: draft.package, placeholder: 'com.example.emulator', onchange: v => { draft.package = v.trim(); } });
      fields.push(
        field('App package', h('div', { class: 'row' }, pkg, button('Pick app', () => pickAndroidApp(a => { draft.package = a.package; pkg.value = a.package; }), { icon: 'android' }))),
        field('Activity', textInput({ value: draft.activity, placeholder: 'Leave empty to use the app\'s main screen', onchange: v => { draft.activity = v.trim(); } })),
        field('Intent action', textInput({ value: draft.action, placeholder: 'android.intent.action.VIEW', onchange: v => { draft.action = v.trim(); } })),
        field('Intent data', textInput({ value: draft.data, placeholder: '{rom}', onchange: v => { draft.data = v.trim(); } }), 'Usually {rom} for VIEW intents.'),
        field('Extras', textInput({ value: draft.extras, multiline: true, rows: 3, placeholder: 'string bootPath={rom}', onchange: v => { draft.extras = v; } }), 'One per line: "type key=value" (type: string, bool, int, long). {rom} = file URI, {romPath} = /storage/... path.'),
        field('Start fresh each time', toggle({ value: draft.clearTask !== false, onchange: v => { draft.clearTask = v; } }), 'Closes whatever the emulator had open before starting the new game.'));
    } else {
      const exe = textInput({ value: draft.exe, placeholder: 'C:\\Emulators\\emu.exe', onchange: v => { draft.exe = v; } });
      fields.push(
        field('Emulator program', h('div', { class: 'row' }, exe, button('Browse', async () => {
          const f = await bridge.call('pickFile', { kind: 'exe', title: 'Choose the emulator program' });
          if (f) { draft.exe = f.path; exe.value = f.path; }
        }, { icon: 'folder' }))),
        field('Arguments', textInput({ value: draft.args, placeholder: '"{rom}"', onchange: v => { draft.args = v; } }), 'Variables: {rom} {romDir} {romName} {romFile} {exeDir}. Keep the quotes around paths.'),
        field('Start in folder', textInput({ value: draft.workingDir, placeholder: 'Defaults to the emulator\'s folder', onchange: v => { draft.workingDir = v; } })),
        field('Watch process', textInput({ value: draft.processName, placeholder: 'Optional, e.g. retroarch.exe', onchange: v => { draft.processName = v; } }), 'Only needed if the emulator restarts itself.'),
        field('Post-launch macro', textInput({ value: draft.macro, multiline: true, rows: 3, placeholder: '3000 {F11}\n500 %{ENTER}', onchange: v => { draft.macro = v; } }),
          'For emulators without command-line options: one step per line, "<wait ms> <keys>". Keys use SendKeys syntax: {ENTER} {F11} {ESC}, ^ = Ctrl, % = Alt, + = Shift.'));
    }
    fields.push(field('ROM file types', textInput({ value: draft.extensions, placeholder: 'sfc, smc, zip', onchange: v => { draft.extensions = v; } }), 'Used when scanning folders and browsing for games.'));
    if (draft.notes) fields.push(h('div', { class: 'notice' }, icon('info'), draft.notes));

    function saveIt() {
      if (!draft.name || !draft.name.trim()) { toast('Give the emulator a name.', 'error'); return; }
      if (IS_ANDROID ? !draft.package : !draft.exe) { toast(IS_ANDROID ? 'Enter the emulator\'s package name.' : 'Choose the emulator program.', 'error'); return; }
      let saved;
      if (isNew) saved = store.addEmulator(draft);
      else { Object.assign(emu, draft); saved = emu; store.save(); }
      m.close();
      toast(saved.name + ' saved.');
      if (onSaved) onSaved(saved);
      else renderHome();
    }

    m = modal({
      title: isNew ? 'Add ' + draft.name : 'Edit ' + draft.name,
      wide: true,
      body: fields,
      actions: [button('Save', saveIt, { variant: 'primary' }), button('Cancel', () => m.close())],
      onAction: a => { if (a === 'start') { saveIt(); return true; } return false; },
    });
  }

  // ================================================================ profile
  function renderProfile() {
    const s = S();
    $('#brand-name').textContent = s.username || 'Player';
    paintAvatar($('#avatar'), s);
  }

  function paintAvatar(el, s) {
    el.textContent = '';
    el.classList.toggle('has-picture', !!s.avatar);
    if (s.avatar) {
      const img = h('img', { src: s.avatar, alt: '' });
      img.addEventListener('error', () => { img.remove(); el.classList.remove('has-picture'); el.append(h('span', null, (s.username || 'P').trim().charAt(0).toUpperCase())); });
      el.append(img);
    } else {
      el.append(h('span', null, (s.username || 'P').trim().charAt(0).toUpperCase()));
    }
  }

  function openProfile() {
    const s = S();
    const preview = h('span', { class: 'avatar avatar-large' });
    const repaint = () => { paintAvatar(preview, s); renderProfile(); };
    repaint();
    const name = textInput({ value: s.username, placeholder: 'Player', label: 'Name', onchange: v => { s.username = v; store.save(); repaint(); } });
    let m;
    m = modal({
      title: 'Profile',
      class: 'dialog',
      body: [
        h('div', { class: 'profile-row' }, preview, h('div', { class: 'profile-buttons' },
          button('Choose picture', async () => {
            const r = await bridge.call('importImage', {});
            if (r && r.url) { s.avatar = r.url; store.save(); repaint(); }
          }, { icon: 'image', variant: 'primary' }),
          button('Remove picture', () => { s.avatar = ''; store.save(); repaint(); }, { icon: 'trash' }))),
        field('Name', name),
      ],
      actions: [button('Done', () => m.close(), { variant: 'primary' })],
    });
  }

  // ================================================================ search
  function openSearch() {
    const input = textInput({ value: state.filter, placeholder: 'Type a title…', label: 'Search' });
    let m;
    const apply = () => { state.filter = input.value.trim(); m.close(); renderHome({ focusFirst: true }); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(); } });
    m = modal({
      title: 'Search', class: 'dialog',
      body: field('Title or platform', input),
      actions: [button('Search', apply, { variant: 'primary', icon: 'search' }), button('Clear', () => { input.value = ''; apply(); })],
      onAction: a => { if (a === 'start') { apply(); return true; } return false; },
    });
    setTimeout(() => { if (Ink.input.source === 'pad' && (!IS_ANDROID || Ink.screen === 'tv')) input._activate(); else input.focus(); }, 60);
  }

  // ================================================================ power
  function openPowerMenu() {
    const items = [];
    if (IS_WINDOWS) {
      items.push(
        { label: state.consoleMode ? 'Exit console mode' : 'Enter console mode', hint: 'Fullscreen controller UI', icon: 'expand', action: () => setConsoleMode(!state.consoleMode) },
        { label: 'Minimize SofaBox', icon: 'minimize', action: () => bridge.call('power', { action: 'minimize' }) },
        { label: 'Quit SofaBox', icon: 'power', action: () => bridge.call('power', { action: 'quit' }) },
        { separator: 'PC' },
        { label: 'Sleep', icon: 'moon', action: () => confirmPower('sleep', 'Put the PC to sleep?') },
        { label: 'Restart', icon: 'refresh', action: () => confirmPower('restart', 'Restart the PC?') },
        { label: 'Shut down', icon: 'power', danger: true, action: () => confirmPower('shutdown', 'Shut down the PC?') });
    } else if (IS_ANDROID) {
      items.push({ label: 'Close SofaBox', icon: 'power', action: () => bridge.call('power', { action: 'quit' }) });
    } else {
      items.push({ label: state.consoleMode ? 'Exit fullscreen' : 'Fullscreen', icon: 'expand', action: () => setConsoleMode(!state.consoleMode) });
    }
    if (state.running.size) {
      items.unshift({ separator: 'Running' });
      [...state.running].map(store.game).filter(Boolean).forEach(g => items.splice(1, 0, { label: 'Quit ' + g.title, icon: 'stop', danger: true, action: () => stop(g) }));
    }
    menu({ title: 'Power', items });
  }

  async function confirmPower(action, q) {
    const r = await ask({ title: q, buttons: [{ id: 'yes', label: 'Yes', variant: 'primary' }, { id: 'no', label: 'Cancel' }] });
    if (r === 'yes') bridge.call('power', { action });
  }

  function setConsoleMode(on) {
    state.consoleMode = on;
    document.body.classList.toggle('console', on);
    bridge.call('setConsoleMode', { on });
  }

  // ================================================================ settings
  function openSettings() {
    const s = S();
    const set = (k, rerender) => v => {
      s[k] = v;
      store.save();
      applyTheme();
      pushSettings();
      if (rerender) renderHome();
    };
    const pickBg = async () => {
      const r = await bridge.call('importImage', {});
      if (r && r.url) { s.backgroundImage = r.url; s.background = 'image'; store.save(); applyTheme(); toast('Background image set.'); }
    };

    const body = [
      section('Appearance',
        field('Profile', button('Edit name & picture', openProfile, { icon: 'image' }), 'Shown in the top-left corner.'),
        field('Accent color', swatches({ colors: ACCENTS, value: s.accent, onchange: set('accent') })),
        field('Background', choice({ options: [{ value: 'aurora', label: 'Aurora' }, { value: 'midnight', label: 'Midnight' }, { value: 'solid', label: 'Solid' }, { value: 'image', label: 'Custom image' }], value: s.background, onchange: v => { set('background')(v); if (v === 'image' && !s.backgroundImage) pickBg(); } })),
        field('Background image', button('Choose image', pickBg, { icon: 'image' })),
        field('Game art behind library', toggle({ value: s.heroArt, onchange: v => { set('heroArt')(v); renderHero(focusedGame()); } })),
        field('Layout', choice({ options: [{ value: 'row', label: 'Console shelf (one row)' }, { value: 'grid', label: 'Grid' }], value: s.layout, onchange: set('layout', true) })),
        field('Tile shape', choice({ options: [{ value: 'landscape', label: 'Landscape' }, { value: 'portrait', label: 'Portrait (box art)' }, { value: 'square', label: 'Square' }], value: s.tileShape, onchange: set('tileShape', true) })),
        Ink.screen === 'tv' ? null : field('Interface size', range({ min: 0.7, max: 1.5, step: 0.05, value: s.uiScale, format: v => Math.round(v * 100) + '%', onchange: set('uiScale') }), 'Makes everything bigger or smaller on this screen. It does not change the screen resolution.'),
        field('Tile size', range({ min: 0.6, max: 1.6, step: 0.1, value: s.tileSize, format: v => Math.round(v * 100) + '%', onchange: set('tileSize') })),
        field('Show titles under tiles', toggle({ value: s.showTitles, onchange: set('showTitles') })),
        field('Sort games by', choice({ options: [{ value: 'custom', label: 'My order' }, { value: 'title', label: 'Title' }, { value: 'recent', label: 'Recently played' }, { value: 'playtime', label: 'Most played' }, { value: 'added', label: 'Recently added' }], value: s.sortBy, onchange: set('sortBy', true) })),
        field('24-hour clock', toggle({ value: s.clock24, onchange: v => { set('clock24')(v); tickClock(); } })),
        field('Sounds', toggle({ value: s.sounds, onchange: set('sounds') })),
        field('Volume', range({ min: 0, max: 1, step: 0.1, value: s.volume, format: v => Math.round(v * 100) + '%', onchange: v => { set('volume')(v); Ink.sound.play('select'); } })),
        field('Automatic cover art', toggle({ value: s.autoCovers, onchange: set('autoCovers') }), 'Fetch box art from libretro-thumbnails when scanning ROM folders.')),
      section('Artwork',
        field('SteamGridDB API key', textInput({ value: s.sgdbKey, placeholder: 'Paste your key here', label: 'SteamGridDB API key', onchange: v => { s.sgdbKey = v.trim(); store.save(); } }),
          'Covers and backgrounds for every platform (Switch, PS2, PC…). The key is free: sign in at steamgriddb.com, open Preferences → API and copy it.'),
        field('Download artwork for new games', toggle({ value: s.autoArtwork, onchange: set('autoArtwork') }), 'When you add or scan games, missing covers and backgrounds are downloaded automatically.'),
        field('Missing artwork', button('Find missing artwork now', () => fillArtwork(store.data.games.filter(g => !g.steamAppId), true), { icon: 'image' }), 'Fills in covers and backgrounds for games that do not have them yet. Your own images are kept.')),
    ];

    if (!IS_ANDROID) {
      body.push(section('Controller & console mode',
        field('Go fullscreen when a controller connects', toggle({ value: s.autoConsoleMode, onchange: set('autoConsoleMode') }), 'SofaBox jumps to the front in console mode as soon as a controller is turned on.'),
        field('Leave fullscreen when controllers disconnect', toggle({ value: s.exitConsoleOnDisconnect, onchange: set('exitConsoleOnDisconnect') })),
        field('Start in full screen', toggle({ value: s.startInConsoleMode, onchange: set('startInConsoleMode') }), 'Like pressing F11. F11 switches full screen on and off at any time.'),
        field('Back + Start = Home', toggle({ value: s.homeChord, onchange: set('homeChord') }), 'Alternative for controllers whose Guide/PS button is not detected.'),
        field('Home keyboard shortcut', textInput({ value: s.homeHotkey, placeholder: 'Control+Shift+Home', onchange: v => { s.homeHotkey = v.trim(); store.save(); clearTimeout(openSettings.t); openSettings.t = setTimeout(pushSettings, 800); } }), 'Works from inside any game. Map it to a controller button with Steam Input or DS4Windows if needed.'),
        IS_WINDOWS ? h('div', { class: 'notice' }, icon('info'), 'Xbox controller Guide button: turn off "Open Xbox Game Bar using this button on a controller" so Windows does not open Game Bar at the same time. ',
          button('Open Game Bar settings', () => bridge.call('openSystem', { target: 'gamebar' }))) : null));
      body.push(section('System',
        IS_WINDOWS ? field('Start with Windows', toggle({ value: s.launchOnStartup, onchange: set('launchOnStartup') }), 'Starts hidden in the tray and pops up when a controller connects.') : null,
        IS_WINDOWS ? field('Closing the window keeps SofaBox in the tray', toggle({ value: s.minimizeToTray, onchange: set('minimizeToTray') })) : null,
        field('Ask before switching games', toggle({ value: s.confirmStop, onchange: set('confirmStop') }), 'Only one game runs at a time. When off, the running game is closed automatically when you start another.')));
    } else {
      const tvStatus = h('div', { class: 'row wrap' });
      bridge.call('systemInfo', {}).then(info => {
        if (!info) return;
        if (info.tvActive) tvStatus.append(button('Use the phone screen instead', () => bridge.call('setTvMode', { on: false }), { icon: 'minimize' }));
        else if (info.tvConnected) tvStatus.append(button('Show SofaBox on the TV now', () => bridge.call('setTvMode', { on: true }), { icon: 'expand' }));
        else tvStatus.append(h('span', { class: 'field-help' }, 'No TV or monitor connected right now.'));
      });
      body.push(section('TV & monitor (HDMI / USB-C)',
        field('Show SofaBox on the TV when connected', toggle({ value: s.tvMode, onchange: set('tvMode') }), 'SofaBox moves to the TV and your phone shows a dimmed "SofaBox is on your TV" screen. Games appear on the TV too. Your phone\'s resolution is never changed: unplug and everything is back to normal.'),
        field('Open SofaBox automatically when plugged in', toggle({ value: s.tvAutoOpen, onchange: set('tvAutoOpen') }), 'Needs the "SofaBox Home button" accessibility service (below) so SofaBox can notice the cable while it is closed.'),
        field('TV interface size', range({ min: 0.6, max: 1.6, step: 0.05, value: s.tvScale, format: v => Math.round(v * 100) + '%', onchange: set('tvScale') }), 'Scales SofaBox to fit your TV. This only affects SofaBox, not the TV or phone resolution.'),
        field('TV safe area', range({ min: 0, max: 8, step: 1, value: s.tvSafeArea, format: v => v + '%', onchange: set('tvSafeArea') }), 'Adds a margin if your TV cuts off the edges of the picture.'),
        field('Right now', tvStatus)));
      const checklist = h('div', { class: 'checklist' }, 'Checking…');
      bridge.call('systemInfo', {}).then(info => {
        info = info || {};
        checklist.textContent = '';
        const row = (ok, title, help, label, target) => checklist.append(h('div', { class: 'check-row' + (ok ? ' ok' : '') },
          h('span', { class: 'check-mark' }, ok ? '✓' : '!'),
          h('span', { class: 'check-text' }, h('b', null, title), h('small', null, help)),
          ok ? null : button(label, () => bridge.call('openSystem', { target }))));
        row(info.serviceEnabled, 'SofaBox Home button service', 'Needed for: controller Home button, opening on TV/DeX automatically, and fully closing games. If the switch is greyed out, do the step below first.', 'Turn on', 'accessibility');
        if (!info.serviceEnabled) row(false, 'Allow restricted settings', 'Android blocks accessibility for apps installed from an APK. Open SofaBox\'s App info, tap ⋮ (top right) → "Allow restricted settings", then turn the service on.', 'Open App info', 'inkinfo');
        row(info.batteryUnrestricted, 'Battery: unrestricted', 'Stops Android (especially Samsung) from putting SofaBox to sleep, which turns the Home button service off.', 'Allow', 'battery');
        row(info.isDefaultHome, 'SofaBox as Home app (optional)', 'The phone\'s Home button always returns to SofaBox.', 'Choose', 'home');
      });
      const ACTIONS = [
        { value: '', label: 'Default' }, { value: 'none', label: 'Do nothing' }, { value: 'back', label: 'Back' },
        { value: 'inkHome', label: 'SofaBox home' }, { value: 'home', label: 'Android home' }, { value: 'recents', label: 'App switcher' },
        { value: 'notifications', label: 'Notifications' }, { value: 'playPause', label: 'Play / pause' },
        { value: 'next', label: 'Next track' }, { value: 'previous', label: 'Previous track' },
        { value: 'volumeUp', label: 'Volume up' }, { value: 'volumeDown', label: 'Volume down' },
        { value: 'screenshot', label: 'Screenshot' }, { value: 'mouseMode', label: 'Mouse mode on / off' },
      ];
      const BUTTONS = [['share', 'Share / media button'], ['view', 'View / Back button'], ['menu', 'Menu / Start button'],
        ['a', 'A'], ['b', 'B'], ['x', 'X'], ['y', 'Y'], ['lb', 'LB'], ['rb', 'RB'], ['l3', 'Left stick press'], ['r3', 'Right stick press']];
      const mapButton = key => v => {
        s.buttonMap = Object.assign({}, s.buttonMap);
        if (v) s.buttonMap[key] = v; else delete s.buttonMap[key];
        store.save();
        pushSettings();
      };
      body.push(section('Controller',
        field('Hold Guide for mouse mode', toggle({ value: s.guideHoldMouse, onchange: set('guideHoldMouse') }),
          'Hold the Xbox / PS button for 3 seconds to switch between controller and mouse mode (a short press still returns to SofaBox). Mouse mode: left stick moves the pointer, A clicks, X long-presses, B goes back, right stick scrolls, Y play / pause, LB / RB previous / next track, D-pad up / down volume, View app switcher, Menu notifications.'),
        field('Pointer speed', range({ min: 0.4, max: 2.5, step: 0.1, value: s.mouseSpeed, format: v => Math.round(v * 100) + '%', onchange: set('mouseSpeed') }), 'Used the next time mouse mode turns on.'),
        ...BUTTONS.map(([key, label]) => field(label, choice({ options: ACTIONS, value: (s.buttonMap || {})[key] || '', onchange: mapButton(key) }))),
        h('div', { class: 'field-help' }, 'Mapped buttons work everywhere, inside games too (the game no longer sees them). Needs the SofaBox Home button service. Triggers, sticks and the D-pad can\'t be mapped.')));
      body.push(section('Android setup', checklist,
        field('Close the old game when switching', toggle({ value: !!s.forceClose, onchange: set('forceClose') }), 'SofaBox closes the previous game behind a short "Switching games" screen (it presses Force stop on its App info page, the only way on Android 14+). Needs the Home button service. Games from the same emulator are always closed first, because emulators cannot load a new game while the old one is running.')));
      body.push(section('Games',
        field('Ask before switching games', toggle({ value: s.confirmStop, onchange: set('confirmStop') }), 'Only one game runs at a time. When off, the running game is closed automatically when you start another.')));
    }

    body.push(section('Library data',
      h('div', { class: 'row wrap' },
        button('Export library', async () => { const r = await bridge.call('exportData', { json: JSON.stringify(store.data, null, 2) }); if (r && r.ok) toast('Library exported.'); }, { icon: 'copy' }),
        button('Import library', async () => {
          const r = await bridge.call('importData', {});
          if (!r || !r.json) return;
          try {
            const parsed = JSON.parse(r.json);
            const ok = await ask({ title: 'Replace your library?', message: 'This replaces all games, emulators and settings with the imported file.', buttons: [{ id: 'yes', label: 'Replace', variant: 'danger' }, { id: 'no', label: 'Cancel' }] });
            if (ok !== 'yes') return;
            store.replace(parsed);
            applyTheme(); pushSettings(); closeAllLayers(); renderHome({ focusFirst: true });
            toast('Library imported.');
          } catch (e) { toast('That file is not a SofaBox library.', 'error'); }
        }, { icon: 'folder' }),
        button('Reset settings', async () => {
          const ok = await ask({ title: 'Reset all settings?', message: 'Games and emulators are kept.', buttons: [{ id: 'yes', label: 'Reset', variant: 'danger' }, { id: 'no', label: 'Cancel' }] });
          if (ok !== 'yes') return;
          store.data.settings = Object.assign({}, store.DEFAULT_SETTINGS);
          store.save(); applyTheme(); pushSettings(); closeAllLayers(); renderHome();
        }, { icon: 'refresh' }))),
      (() => {
        const about = h('div', { class: 'about' }, 'SofaBox launcher · ' + bridge.platform);
        bridge.call('systemInfo', {}).then(info => { if (info && info.version) about.textContent = 'SofaBox launcher ' + info.version + ' · ' + bridge.platform; }).catch(() => {});
        return about;
      })());

    modal({ title: 'Settings', wide: true, class: 'settings', body });
  }

  // ================================================================ clock & status
  function tickClock() {
    const d = new Date();
    const opts = { hour: 'numeric', minute: '2-digit', hour12: !S().clock24 };
    $('#clock').textContent = d.toLocaleTimeString([], opts);
  }
  function renderPadStatus() {
    const el = $('#pad-status');
    const n = Math.max(state.controllers, Ink.input.padCount);
    el.classList.toggle('connected', n > 0);
    $('#pad-count').textContent = n > 1 ? String(n) : '';
  }

  // ================================================================ input routing
  let baseLayer;
  function onAction(action) {
    if (action === 'home') { goHome(); return; }
    const before = Ink.nav.current();
    if (Ink.nav.depth > 1) {
      const handled = Ink.nav.handle(action);
      if (handled && ['up', 'down', 'left', 'right'].includes(action) && Ink.nav.current() !== before) Ink.sound.play('move');
      return;
    }
    // Main screen shortcuts.
    switch (action) {
      case 'lb': cycleTab(-1); return;
      case 'rb': cycleTab(1); return;
      case 'lt': cycleTab(-1); return;
      case 'rt': cycleTab(1); return;
      case 'x': if (state.focusedId && before && before.classList.contains('tile')) { Ink.sound.play('select'); openGameMenu(state.focusedId); } return;
      case 'y': Ink.sound.play('select'); openAddMenu(); return;
      case 'start': Ink.sound.play('select'); openSettings(); return;
      case 'select': Ink.sound.play('select'); openSearch(); return;
      case 'b':
        if (state.filter) { state.filter = ''; Ink.sound.play('back'); renderHome({ focusFirst: true }); return; }
        if (before && !before.classList.contains('tile')) { const t = document.querySelector('.tile'); if (t) { Ink.nav.focus(t); Ink.sound.play('back'); } }
        return;
      default:
    }
    const handled = Ink.nav.handle(action);
    if (handled && ['up', 'down', 'left', 'right'].includes(action) && Ink.nav.current() !== before) Ink.sound.play('move');
  }

  // ================================================================ bridge events
  function wireBridge() {
    // Android: leaving a game with the controller Home button keeps it "running";
    // coming back any other way (phone Home / Back / recents) counts as closing it.
    let homeButtonAt = 0;
    bridge.on('home', d => {
      if (d && d.source === 'system') { closeAllLayers(); renderHome(); return; } // app-resume decides about the game
      if (d && d.source === 'button') homeButtonAt = Date.now();
      goHome();
    });
    bridge.on('session-started', d => { if (d && d.gameId) { state.running.add(d.gameId); if (Ink.nav.depth === 1) renderHome(); } });
    bridge.on('session-ended', d => { if (d && d.gameId) sessionEnded(d.gameId, d.seconds); });
    bridge.on('console-mode', d => { state.consoleMode = !!(d && d.on); document.body.classList.toggle('console', state.consoleMode); });
    bridge.on('controller', d => {
      const prev = state.controllers;
      state.controllers = (d && d.count) || 0;
      renderPadStatus();
      if (state.controllers > prev) toast('Controller connected');
    });
    // Android: count time spent in the game while SofaBox is in the background.
    let pausedAt = 0;
    // Only count it when SofaBox went to the background because of a game (not a file picker).
    // Keep the first pause if SofaBox was briefly resumed in between (see app-resume).
    bridge.on('app-pause', () => { if (!pausedAt) pausedAt = state.awayForGame ? Date.now() : 0; });
    bridge.on('app-resume', () => {
      if (!state.awayForGame) return;
      // DeX pauses SofaBox when a game starts, then resumes it until the game's window is
      // up (seconds, for an emulator). That is not the player coming back.
      if (Date.now() - state.launchedAt < 2000) return;
      state.awayForGame = false;
      if (pausedAt && state.running.size) {
        const id = state.lastLaunched && state.running.has(state.lastLaunched) ? state.lastLaunched : [...state.running].pop();
        const sess = store.data.sessions[id];
        if (sess) { sess.played = (sess.played || 0) + (Date.now() - pausedAt) / 1000; store.save(); }
      }
      pausedAt = 0;
      if (!state.running.size) return;
      if (IS_ANDROID && Date.now() - homeButtonAt > 2500) {
        [...state.running].forEach(id => sessionEnded(id));
        return;
      }
      goHome();
    });
    Ink.input.onPads((count) => {
      renderPadStatus();
      Ink.ui.refreshGlyphs();
      if (count > 0 && S().autoConsoleMode && !state.consoleMode && !IS_ANDROID) setConsoleMode(true);
      if (count === 0 && S().exitConsoleOnDisconnect && state.consoleMode && !IS_ANDROID) setConsoleMode(false);
    });
  }

  // ================================================================ boot
  async function init() {
    await store.load();
    pushSettings(); // Android: the Home button service reads them (button mapping, closing games, TV)
    buildShell();
    applyTheme();
    // Click and drag (mouse) scrolls the tiles, like dragging on a touch screen.
    (function dragScroll() {
      const el = $('#tiles');
      let drag = null;
      let suppressClick = false;
      el.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false, id: e.pointerId };
      });
      el.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        if (!drag.moved) { drag.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); }
        if (el.dataset.scroll === 'y') el.scrollTop = drag.top - dy;
        else el.scrollLeft = drag.left - dx;
      });
      const end = e => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        if (drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
        el.classList.remove('dragging');
        drag = null;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      // A drag must not start the game under the mouse.
      el.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);
      el.addEventListener('dragstart', e => e.preventDefault());
    })();
    // Mouse wheel scrolls the tile row (and the tab bar) sideways.
    ['#tiles', '#tabs'].forEach(sel => {
      const el = $(sel);
      el.addEventListener('wheel', e => {
        if (el.dataset.scroll !== 'x') return;
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!d) return;
        e.preventDefault();
        el.scrollBy({ left: d * (e.deltaMode === 1 ? 40 : 1.5) });
      }, { passive: false });
    });
    Ink.input.start();
    baseLayer = Ink.nav.push({
      el: document.getElementById('app'),
      onFocus(el) {
        if (el.classList.contains('tile')) {
          const id = el.dataset.id;
          if (id !== state.focusedId) { state.focusedId = id; renderHero(store.game(id)); }
        }
      },
    });
    Ink.input.onAction(onAction);
    wireBridge();

    // Restore running games (Windows: the launcher process tracks them; Android: saved sessions).
    let status = null;
    try { status = await bridge.call('status', {}); } catch (e) { status = null; }
    if (status && Array.isArray(status.running)) {
      status.running.forEach(id => state.running.add(id));
      Object.keys(store.data.sessions).forEach(id => { if (!state.running.has(id)) delete store.data.sessions[id]; });
      if (status.consoleMode !== undefined) { state.consoleMode = status.consoleMode; document.body.classList.toggle('console', state.consoleMode); }
      if (status.controllers !== undefined) state.controllers = status.controllers;
    } else {
      Object.keys(store.data.sessions).forEach(id => { if (store.game(id)) state.running.add(id); else delete store.data.sessions[id]; });
    }
    if (IS_ANDROID) state.consoleMode = true;

    renderHome({ focusFirst: true, force: true });
    renderPadStatus();
    tickClock();
    setInterval(tickClock, 10000);
    pushSettings();

    // Hide the mouse cursor in console mode when it is not being used.
    let idle;
    document.addEventListener('mousemove', () => {
      document.body.classList.remove('cursor-hidden');
      clearTimeout(idle);
      idle = setTimeout(() => { if (state.consoleMode) document.body.classList.add('cursor-hidden'); }, 2500);
    });
    document.addEventListener('contextmenu', e => { if (!e.target.closest('.tile')) e.preventDefault(); });
    document.body.classList.add('ready');
  }

  // Exposed for debugging and for the native hosts.
  Ink.app = { state, goHome, play, renderHome, openSettings, manageEmulators };
  document.addEventListener('DOMContentLoaded', init);
})();
