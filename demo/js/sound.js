/* Tiny synthesized UI sounds - no audio files needed. */
window.Ink = window.Ink || {};

Ink.sound = (function () {
  let ctx = null;
  let enabled = true;
  let volume = 0.5;

  function audio() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, delay) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((gain || 0.08) * volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const sounds = {
    move: () => tone(1250, 0.045, 'sine', 0.04),
    select: () => { tone(880, 0.07, 'triangle', 0.07); tone(1320, 0.09, 'triangle', 0.05, 0.05); },
    back: () => tone(520, 0.08, 'triangle', 0.06),
    tab: () => tone(980, 0.06, 'sine', 0.05),
    launch: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.07)); },
    error: () => { tone(220, 0.12, 'square', 0.04); tone(180, 0.16, 'square', 0.04, 0.1); },
    home: () => { tone(784, 0.1, 'sine', 0.06); tone(1175, 0.16, 'sine', 0.05, 0.08); },
  };

  return {
    play(name) { if (enabled && sounds[name]) try { sounds[name](); } catch (e) { /* ignore */ } },
    set enabled(v) { enabled = !!v; },
    set volume(v) { volume = Math.max(0, Math.min(1, v)); },
  };
})();
