/*
 * Platforms and emulator presets.
 *
 * Emulators are started with command-line arguments (Windows) or Android
 * intents. That is far more reliable than keyboard macros: the emulator boots
 * straight into the ROM in fullscreen and exits when you quit. Every preset is
 * only a starting point - all fields are editable in the app.
 *
 * Template variables usable in arguments / intent values:
 *   {rom}      full ROM path (Windows) or the picked document URI (Android)
 *   {romPath}  plain file-system path (Android: derived from the URI)
 *   {romDir}   folder that contains the ROM
 *   {romName}  file name without extension
 *   {romFile}  file name with extension
 *   {exeDir}   folder that contains the emulator executable (Windows)
 */
window.Ink = window.Ink || {};

Ink.presets = (function () {
  const PLATFORMS = [
    { id: 'pc', name: 'PC', short: 'PC' },
    { id: 'android', name: 'Android', short: 'Android' },
    { id: 'nes', name: 'Nintendo Entertainment System', short: 'NES', libretro: 'Nintendo - Nintendo Entertainment System' },
    { id: 'snes', name: 'Super Nintendo', short: 'SNES', libretro: 'Nintendo - Super Nintendo Entertainment System' },
    { id: 'n64', name: 'Nintendo 64', short: 'N64', libretro: 'Nintendo - Nintendo 64' },
    { id: 'gb', name: 'Game Boy', short: 'GB', libretro: 'Nintendo - Game Boy' },
    { id: 'gbc', name: 'Game Boy Color', short: 'GBC', libretro: 'Nintendo - Game Boy Color' },
    { id: 'gba', name: 'Game Boy Advance', short: 'GBA', libretro: 'Nintendo - Game Boy Advance' },
    { id: 'nds', name: 'Nintendo DS', short: 'DS', libretro: 'Nintendo - Nintendo DS' },
    { id: 'n3ds', name: 'Nintendo 3DS', short: '3DS', libretro: 'Nintendo - Nintendo 3DS' },
    { id: 'gc', name: 'GameCube', short: 'GameCube', libretro: 'Nintendo - GameCube' },
    { id: 'wii', name: 'Wii', short: 'Wii', libretro: 'Nintendo - Wii' },
    { id: 'wiiu', name: 'Wii U', short: 'Wii U' },
    { id: 'switch', name: 'Nintendo Switch', short: 'Switch' },
    { id: 'psx', name: 'PlayStation', short: 'PS1', libretro: 'Sony - PlayStation' },
    { id: 'ps2', name: 'PlayStation 2', short: 'PS2', libretro: 'Sony - PlayStation 2' },
    { id: 'ps3', name: 'PlayStation 3', short: 'PS3', libretro: 'Sony - PlayStation 3' },
    { id: 'psp', name: 'PlayStation Portable', short: 'PSP', libretro: 'Sony - PlayStation Portable' },
    { id: 'genesis', name: 'Sega Genesis / Mega Drive', short: 'Genesis', libretro: 'Sega - Mega Drive - Genesis' },
    { id: 'sms', name: 'Sega Master System', short: 'SMS', libretro: 'Sega - Master System - Mark III' },
    { id: 'saturn', name: 'Sega Saturn', short: 'Saturn', libretro: 'Sega - Saturn' },
    { id: 'dc', name: 'Sega Dreamcast', short: 'Dreamcast', libretro: 'Sega - Dreamcast' },
    { id: 'xbox', name: 'Xbox', short: 'Xbox', libretro: 'Microsoft - Xbox' },
    { id: 'x360', name: 'Xbox 360', short: 'Xbox 360' },
    { id: 'arcade', name: 'Arcade', short: 'Arcade', libretro: 'FBNeo - Arcade Games' },
    { id: 'other', name: 'Other', short: 'Other' },
  ];

  // RetroArch cores: [platform, windows core dll, android core .so, extensions]
  const RA_CORES = [
    ['nes', 'mesen_libretro', 'nes,fds,unf,unif'],
    ['snes', 'snes9x_libretro', 'sfc,smc,fig,swc,bs'],
    ['n64', 'mupen64plus_next_libretro', 'n64,z64,v64'],
    ['gb', 'gambatte_libretro', 'gb'],
    ['gbc', 'gambatte_libretro', 'gbc'],
    ['gba', 'mgba_libretro', 'gba'],
    ['nds', 'melonds_libretro', 'nds'],
    ['psx', 'swanstation_libretro', 'cue,chd,pbp,m3u,ccd'],
    ['psp', 'ppsspp_libretro', 'iso,cso,pbp'],
    ['genesis', 'genesis_plus_gx_libretro', 'md,gen,smd,bin'],
    ['sms', 'genesis_plus_gx_libretro', 'sms,gg'],
    ['saturn', 'mednafen_saturn_libretro', 'cue,chd,ccd'],
    ['dc', 'flycast_libretro', 'cdi,gdi,chd'],
    ['arcade', 'fbneo_libretro', 'zip,7z'],
  ];
  const archive = ',zip,7z';
  const platName = id => (PLATFORMS.find(p => p.id === id) || {}).short || id;

  const WINDOWS = [
    ...RA_CORES.map(([platform, core, ext]) => ({
      id: 'retroarch-' + platform,
      name: 'RetroArch (' + platName(platform) + ')',
      platform,
      exe: 'C:\\RetroArch-Win64\\retroarch.exe',
      args: '-f -L "cores\\' + core + '.dll" "{rom}"',
      extensions: ext + (platform === 'arcade' ? '' : archive),
      notes: 'Install the "' + core.replace('_libretro', '') + '" core inside RetroArch (Online Updater > Core Downloader). Change the core path in the arguments to use another core.',
    })),
    { id: 'dolphin', name: 'Dolphin', platform: 'gc', exe: 'C:\\Dolphin-x64\\Dolphin.exe', args: '-b -C Dolphin.Display.Fullscreen=True -e "{rom}"', extensions: 'iso,gcm,rvz,gcz,ciso,wbfs,wad,dol,elf', notes: '-b closes Dolphin when the game stops. Works for Wii games too (set the platform to Wii in a copy of this profile).' },
    { id: 'pcsx2', name: 'PCSX2', platform: 'ps2', exe: 'C:\\PCSX2\\pcsx2-qt.exe', args: '-batch -nogui -fullscreen -- "{rom}"', extensions: 'iso,chd,cso,zso,gz,bin', notes: 'The exe name varies by version (pcsx2-qt.exe / pcsx2-qtx64-avx2.exe).' },
    { id: 'duckstation', name: 'DuckStation', platform: 'psx', exe: 'C:\\DuckStation\\duckstation-qt-x64-ReleaseLTCG.exe', args: '-batch -fullscreen -- "{rom}"', extensions: 'cue,chd,pbp,m3u,ecm,mds,ccd', notes: '' },
    { id: 'ppsspp', name: 'PPSSPP', platform: 'psp', exe: 'C:\\PPSSPP\\PPSSPPWindows64.exe', args: '--fullscreen "{rom}"', extensions: 'iso,cso,chd,pbp,elf', notes: '' },
    { id: 'rpcs3', name: 'RPCS3', platform: 'ps3', exe: 'C:\\RPCS3\\rpcs3.exe', args: '--no-gui "{rom}"', extensions: 'bin,iso', notes: 'Pick the game\'s PS3_GAME\\USRDIR\\EBOOT.BIN as the ROM. Enable "Start games in fullscreen" in RPCS3.' },
    { id: 'cemu', name: 'Cemu', platform: 'wiiu', exe: 'C:\\Cemu\\Cemu.exe', args: '-f -g "{rom}"', extensions: 'wua,wud,wux,rpx,wuhb', notes: '' },
    { id: 'ryujinx', name: 'Ryujinx', platform: 'switch', exe: 'C:\\Ryujinx\\Ryujinx.exe', args: '--fullscreen "{rom}"', extensions: 'nsp,xci,nca,nro', notes: '' },
    { id: 'eden', name: 'Eden / yuzu-based', platform: 'switch', exe: 'C:\\Eden\\eden.exe', args: '-f -g "{rom}"', extensions: 'nsp,xci,nca,nro', notes: 'Works with most yuzu forks (Eden, Citron, Sudachi). Point it at the fork\'s exe.' },
    { id: 'azahar', name: 'Azahar / Citra', platform: 'n3ds', exe: 'C:\\Azahar\\azahar.exe', args: '-f "{rom}"', extensions: '3ds,cci,cxi,3dsx,app,cia', notes: '' },
    { id: 'melonds', name: 'melonDS', platform: 'nds', exe: 'C:\\melonDS\\melonDS.exe', args: '--fullscreen "{rom}"', extensions: 'nds,dsi' + archive, notes: '' },
    { id: 'xemu', name: 'xemu', platform: 'xbox', exe: 'C:\\xemu\\xemu.exe', args: '-full-screen -dvd_path "{rom}"', extensions: 'iso,xiso', notes: '' },
    { id: 'xenia', name: 'Xenia', platform: 'x360', exe: 'C:\\Xenia\\xenia_canary.exe', args: '--fullscreen=true "{rom}"', extensions: 'iso,xex,zar', notes: '' },
    { id: 'flycast', name: 'Flycast', platform: 'dc', exe: 'C:\\Flycast\\flycast.exe', args: '"{rom}"', extensions: 'cdi,gdi,chd,cue', notes: 'Set fullscreen in Flycast\'s settings.' },
    { id: 'mgba', name: 'mGBA', platform: 'gba', exe: 'C:\\mGBA\\mGBA.exe', args: '-f "{rom}"', extensions: 'gba,gb,gbc' + archive, notes: '' },
    { id: 'mesen', name: 'Mesen', platform: 'nes', exe: 'C:\\Mesen\\Mesen.exe', args: '"{rom}" --fullscreen', extensions: 'nes,fds,sfc,smc,gb,gbc,gba,pce,sms,gg' + archive, notes: '' },
    { id: 'snes9x', name: 'Snes9x', platform: 'snes', exe: 'C:\\Snes9x\\snes9x-x64.exe', args: '-fullscreen "{rom}"', extensions: 'sfc,smc' + archive, notes: '' },
    { id: 'project64', name: 'Project64', platform: 'n64', exe: 'C:\\Program Files (x86)\\Project64 3.0\\Project64.exe', args: '"{rom}"', extensions: 'z64,n64,v64' + archive, notes: 'Use the post-launch macro "2000 %{ENTER}" to toggle fullscreen with Alt+Enter.' },
    { id: 'mame', name: 'MAME', platform: 'arcade', exe: 'C:\\MAME\\mame.exe', args: '-skip_gameinfo -rompath "{romDir}" {romName}', extensions: 'zip,7z,chd', notes: '' },
    { id: 'custom', name: 'Custom emulator', platform: 'other', exe: '', args: '"{rom}"', extensions: '', notes: 'Check the emulator\'s documentation for its command-line options. If it has none, use a post-launch macro to press keys after it starts.' },
  ];

  const RA_PKG = 'com.retroarch.aarch64';
  const ANDROID = [
    ...RA_CORES.map(([platform, core, ext]) => ({
      id: 'retroarch-' + platform,
      name: 'RetroArch (' + platName(platform) + ')',
      platform,
      package: RA_PKG,
      activity: 'com.retroarch.browser.retroactivity.RetroActivityFuture',
      action: 'android.intent.action.MAIN',
      data: '',
      extras: 'string ROM={romPath}\nstring LIBRETRO=/data/data/' + RA_PKG + '/cores/' + core + '_android.so\nstring CONFIGFILE=/storage/emulated/0/Android/data/' + RA_PKG + '/files/retroarch.cfg',
      clearTask: true,
      extensions: ext + (platform === 'arcade' ? '' : archive),
      notes: 'Download the core in RetroArch first. Give RetroArch "All files access" so it can read the ROM path. For the Play Store build use package com.retroarch.',
    })),
    { id: 'dolphin', name: 'Dolphin', platform: 'gc', package: 'org.dolphinemu.dolphinemu', activity: 'org.dolphinemu.dolphinemu.ui.main.MainActivity', action: 'android.intent.action.MAIN', data: '', extras: 'string AutoStartFile={rom}', clearTask: true, extensions: 'iso,gcm,rvz,gcz,ciso,wbfs,wad,dol,elf', notes: '' },
    { id: 'duckstation', name: 'DuckStation', platform: 'psx', package: 'com.github.stenzek.duckstation', activity: 'com.github.stenzek.duckstation.EmulationActivity', action: 'android.intent.action.MAIN', data: '', extras: 'string bootPath={rom}', clearTask: true, extensions: 'cue,chd,pbp,m3u,ecm,ccd', notes: '' },
    { id: 'nethersx2', name: 'NetherSX2 / AetherSX2', platform: 'ps2', package: 'xyz.aethersx2.android', activity: 'xyz.aethersx2.android.EmulationActivity', action: 'android.intent.action.MAIN', data: '', extras: 'string bootPath={rom}', clearTask: true, extensions: 'iso,chd,cso,bin', notes: 'Gets the picked file itself: AetherSX2 has no plain file access, and boots the BIOS when given a path.' },
    { id: 'ppsspp', name: 'PPSSPP', platform: 'psp', package: 'org.ppsspp.ppsspp', activity: 'org.ppsspp.ppsspp.PpssppActivity', action: 'android.intent.action.VIEW', data: '{rom}', extras: '', clearTask: true, extensions: 'iso,cso,chd,pbp', notes: 'For PPSSPP Gold use package org.ppsspp.ppssppgold.' },
    { id: 'eden', name: 'Eden / yuzu-based', platform: 'switch', package: 'dev.eden.eden_emulator', activity: 'org.yuzu.yuzu_emu.activities.EmulationActivity', action: 'android.intent.action.VIEW', data: '{rom}', extras: '', clearTask: true, extensions: 'nsp,xci,nca,nro', notes: 'Other yuzu forks use the same activity with their own package name (see Settings > Apps on your device).' },
    { id: 'azahar', name: 'Azahar / Citra', platform: 'n3ds', package: 'org.azahar_emu.azahar', activity: 'org.citra.citra_emu.activities.EmulationActivity', action: 'android.intent.action.VIEW', data: '{rom}', extras: '', clearTask: true, extensions: '3ds,cci,cxi,3dsx,app', notes: 'If it does not start, check the package name of your build in Settings > Apps.' },
    { id: 'drastic', name: 'DraStic', platform: 'nds', package: 'com.dsemu.drastic', activity: 'com.dsemu.drastic.DraSticActivity', action: 'android.intent.action.MAIN', data: '', extras: 'string GAMEPATH={romPath}', clearTask: true, extensions: 'nds,zip,7z', notes: '' },
    { id: 'm64plus', name: 'Mupen64Plus FZ', platform: 'n64', package: 'org.mupen64plusae.v3.fzurita', activity: 'paulscode.android.mupen64plusae.SplashActivity', action: 'android.intent.action.VIEW', data: '{rom}', extras: '', clearTask: true, extensions: 'z64,n64,v64,zip', notes: '' },
    { id: 'custom', name: 'Custom (open with app)', platform: 'other', package: '', activity: '', action: 'android.intent.action.VIEW', data: '{rom}', extras: '', clearTask: true, extensions: '', notes: 'Many emulators accept a ROM through a VIEW intent. Extras: one per line as "type key=value" where type is string, bool, int or long.' },
  ];

  function platform(id) { return PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1]; }

  // libretro-thumbnails naming: these characters are replaced by "_".
  function libretroCover(platformId, romName) {
    const p = platform(platformId);
    if (!p.libretro || !romName) return '';
    const file = romName.replace(/[&*/:`<>?\\|"]/g, '_');
    return 'https://thumbnails.libretro.com/' + encodeURIComponent(p.libretro) + '/Named_Boxarts/' + encodeURIComponent(file) + '.png';
  }

  return { PLATFORMS, WINDOWS, ANDROID, platform, libretroCover };
})();
