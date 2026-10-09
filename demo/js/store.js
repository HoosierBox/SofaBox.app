/* Library data: games, emulator profiles, collections and settings. */
window.Ink = window.Ink || {};

Ink.store = (function () {
  const DEFAULT_SETTINGS = {
    username: 'Player',
    avatar: '',                  // profile picture (image URL)
    accent: '#4f8cff',
    background: 'aurora',        // aurora | midnight | solid | image
    backgroundImage: '',
    heroArt: true,               // blurred art of the selected game behind everything
    layout: 'row',               // row (console shelf) | grid
    tileShape: 'landscape',      // landscape | portrait | square
    tileSize: 1,
    showTitles: true,
    sortBy: 'custom',            // custom | title | recent | playtime | added
    clock24: false,
    sounds: true,
    volume: 0.5,
    autoCovers: true,            // use libretro thumbnails for scanned ROMs
    sgdbKey: '',                 // SteamGridDB API key (covers + backgrounds for any platform)
    autoArtwork: true,           // download missing artwork for newly added games
    uiScale: 1,                  // interface size on this screen
    // TV / external display (Android)
    tvMode: true,                // show SofaBox on an HDMI / USB-C display when one is connected
    tvAutoOpen: true,            // open SofaBox automatically when a display is plugged in
    tvScale: 1,                  // interface size on the TV
    tvSafeArea: 3,               // % margin for TVs that cut off the edges (overscan)
    // Console mode / controller
    autoConsoleMode: true,       // controller connected -> fullscreen console mode
    exitConsoleOnDisconnect: false,
    startInConsoleMode: true,    // open in full screen (like F11)
    homeChord: false,            // Back + Start acts as the Home button
    guideHoldMouse: true,        // Android: hold Guide 3 s to switch mouse mode on / off
    mouseSpeed: 1,               // Android: mouse mode pointer speed
    buttonMap: { share: 'back' }, // Android: controller button -> action ("share": "back")
    homeHotkey: 'Control+Shift+Home',
    // System
    launchOnStartup: false,
    minimizeToTray: true,
    confirmStop: true,
    forceClose: true,            // Android: close the previous game (Force stop behind a cover screen)
  };

  let data = null;
  let saveTimer = null;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  const SETTINGS_VERSION = 5;
  function upgradeSettings(st) {
    const v = st.settingsVersion || 0;
    // v2: SofaBox starts in full screen by default.
    if (v < 2) st.startInConsoleMode = true;
    // v3: closing games through App info is opt-in (it flashed Settings on every switch).
    if (v < 3) st.forceClose = false;
    // v4: closing is back on by default, now hidden behind a "Switching games" cover.
    if (v < 4) st.forceClose = true;
    // v5: the controller Share button acts as Back unless mapped otherwise.
    if (v < 5) st.buttonMap = Object.assign({ share: 'back' }, st.buttonMap);
    st.settingsVersion = SETTINGS_VERSION;
    return st;
  }

  // Emulators made from an older preset that has since been fixed.
  function fixEmulator(e) {
    // AetherSX2 has no plain file access: given a path it boots the BIOS instead of the game.
    if (e && e.package === 'xyz.aethersx2.android' && e.extras === 'string bootPath={romPath}') {
      return Object.assign({}, e, { extras: 'string bootPath={rom}' });
    }
    return e;
  }

  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    return {
      version: 1,
      games: Array.isArray(d.games) ? d.games : [],
      emulators: Array.isArray(d.emulators) ? d.emulators.map(fixEmulator) : [],
      collections: Array.isArray(d.collections) ? d.collections : [],
      settings: upgradeSettings(Object.assign({}, DEFAULT_SETTINGS, d.settings || {})),
      sessions: d.sessions && typeof d.sessions === 'object' ? d.sessions : {},
      lastGameByApp: d.lastGameByApp && typeof d.lastGameByApp === 'object' ? d.lastGameByApp : {}, // Android: last game started in each emulator
    };
  }

  async function load() {
    let raw = null;
    try { raw = await Ink.bridge.call('load'); } catch (e) { console.error(e); }
    data = normalize(raw);
    return data;
  }

  function save(now) {
    clearTimeout(saveTimer);
    const run = () => Ink.bridge.call('save', { data }).catch(e => console.error('save failed', e));
    saveTimer = null;
    if (now) return run();
    saveTimer = setTimeout(() => { saveTimer = null; run(); }, 250);
    return Promise.resolve();
  }

  // Save right away if a save is waiting (used before Android moves SofaBox to/from a TV).
  function flush() {
    if (!saveTimer) return Promise.resolve();
    return save(true);
  }

  function game(id) { return data.games.find(g => g.id === id); }
  function emulator(id) { return data.emulators.find(e => e.id === id); }

  function addGame(g) {
    const full = Object.assign({ id: uid(), title: 'Untitled', type: 'native', addedAt: Date.now(), playtime: 0, favorite: false, collections: [] }, g);
    data.games.push(full);
    save();
    return full;
  }

  function removeGame(id) {
    data.games = data.games.filter(g => g.id !== id);
    delete data.sessions[id];
    save();
  }

  function addEmulator(e) {
    const full = Object.assign({ id: uid() }, e);
    data.emulators.push(full);
    save();
    return full;
  }

  function removeEmulator(id) {
    data.emulators = data.emulators.filter(e => e.id !== id);
    save();
  }

  function replace(newData) {
    data = normalize(newData);
    save(true);
    return data;
  }

  return {
    load, save, flush, uid, game, emulator, addGame, removeGame, addEmulator, removeEmulator, replace, normalize,
    DEFAULT_SETTINGS,
    get data() { return data; },
    get settings() { return data.settings; },
  };
})();
