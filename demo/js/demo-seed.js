/* Sample library for the live demo on otbvision.com (runs before Ink's own scripts). */
(function () {
  var KEY = 'ink-library';
  var VERSION = 1;
  function lr(system, name) {
    return 'https://thumbnails.libretro.com/' + encodeURIComponent(system) + '/Named_Boxarts/' + encodeURIComponent(name) + '.png';
  }
  var day = 86400000, now = Date.now();
  var library = {
    demoVersion: VERSION,
    games: [
      { id: 'd1', title: 'Hades', type: 'url', steamAppId: '1145360', url: 'steam://rungameid/1145360', platform: 'Steam', favorite: true, lastPlayed: now - 2 * 3600e3, playtime: 151200 },
      { id: 'd2', title: 'Elden Ring', type: 'url', steamAppId: '1245620', url: 'steam://rungameid/1245620', platform: 'Steam', lastPlayed: now - 3 * day, playtime: 302400 },
      { id: 'd3', title: 'Super Mario World', type: 'emulator', emulatorId: 'snes', rom: 'Super Mario World (USA).sfc', romName: 'Super Mario World (USA)', cover: lr('Nintendo - Super Nintendo Entertainment System', 'Super Mario World (USA)'), lastPlayed: now - day, playtime: 18000, favorite: true },
      { id: 'd4', title: 'Celeste', type: 'url', steamAppId: '504230', url: 'steam://rungameid/504230', platform: 'Steam', playtime: 43200 },
      { id: 'd5', title: 'Super Mario 64', type: 'emulator', emulatorId: 'n64', rom: 'Super Mario 64 (USA).z64', romName: 'Super Mario 64 (USA)', cover: lr('Nintendo - Nintendo 64', 'Super Mario 64 (USA)'), lastPlayed: now - 6 * day },
      { id: 'd6', title: 'Hollow Knight', type: 'url', steamAppId: '367520', url: 'steam://rungameid/367520', platform: 'Steam', playtime: 97200 },
      { id: 'd7', title: 'Pokemon - Emerald Version', type: 'emulator', emulatorId: 'gba', rom: 'Pokemon - Emerald Version (USA, Europe).gba', romName: 'Pokemon - Emerald Version (USA, Europe)', cover: lr('Nintendo - Game Boy Advance', 'Pokemon - Emerald Version (USA, Europe)') },
      { id: 'd8', title: 'Stardew Valley', type: 'url', steamAppId: '413150', url: 'steam://rungameid/413150', platform: 'Steam', collections: ['Couch co-op'] },
      { id: 'd9', title: 'Crash Bandicoot', type: 'emulator', emulatorId: 'psx', rom: 'Crash Bandicoot (USA).chd', romName: 'Crash Bandicoot (USA)', cover: lr('Sony - PlayStation', 'Crash Bandicoot (USA)') },
      { id: 'd10', title: 'Sonic the Hedgehog 2', type: 'emulator', emulatorId: 'genesis', rom: 'Sonic The Hedgehog 2 (World).md', romName: 'Sonic The Hedgehog 2 (World)', cover: lr('Sega - Mega Drive - Genesis', 'Sonic The Hedgehog 2 (World) (Rev A)') },
      { id: 'd11', title: 'Terraria', type: 'url', steamAppId: '105600', url: 'steam://rungameid/105600', platform: 'Steam', collections: ['Couch co-op'] },
    ],
    emulators: [
      { id: 'snes', name: 'RetroArch (SNES)', platform: 'snes', exe: 'retroarch.exe', args: '"{rom}"' },
      { id: 'n64', name: 'RetroArch (N64)', platform: 'n64', exe: 'retroarch.exe', args: '"{rom}"' },
      { id: 'gba', name: 'mGBA', platform: 'gba', exe: 'mGBA.exe', args: '-f "{rom}"' },
      { id: 'psx', name: 'DuckStation', platform: 'psx', exe: 'duckstation.exe', args: '-batch -fullscreen -- "{rom}"' },
      { id: 'genesis', name: 'RetroArch (Genesis)', platform: 'genesis', exe: 'retroarch.exe', args: '"{rom}"' },
    ],
    collections: ['Couch co-op'],
    settings: { username: 'Player', tileShape: 'portrait', volume: 0.3, settingsVersion: 4 },
  };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || saved.demoVersion !== VERSION) localStorage.setItem(KEY, JSON.stringify(library));
  } catch (e) { /* storage blocked: Ink starts empty */ }

  // In the demo, nothing is installed: say what would happen instead of "launching".
  window.addEventListener('load', function () {
    if (!window.Ink || !Ink.bridge) return;
    var call = Ink.bridge.call;
    Ink.bridge.call = function (method, args) {
      if (method === 'launch' && args && args.game && Ink.ui) {
        Ink.ui.toast('Demo: in Ink, ' + args.game.title + ' would start now. Press Home on your controller or keyboard to come back.');
      }
      return call(method, args);
    };
  });
})();
