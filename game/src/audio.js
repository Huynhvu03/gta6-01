// All sound is synthesised with WebAudio: no audio files, no network. The
// context is created on the first user gesture (browsers forbid it before
// one), and every effect is a short oscillator or noise burst. A tiny step
// sequencer plays a laid-back bass line under the game.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // A simple bass line: A minor, sun-soaked and slow.
  const BASS = [55, 0, 55, 65.41, 0, 55, 0, 49, 55, 0, 55, 82.41, 0, 73.42, 65.41, 0];
  function musicTick() {
    if (!ctx || muted) return;
    const f = BASS[musicStep % BASS.length];
    musicStep += 1;
    if (f) blip(f, 0.22, 'triangle', 0.12);
    if (musicStep % 32 === 0) blip(220, 0.5, 'sine', 0.04);
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
      if (m) {
        this.setEngine(false, 0);
        this.setSiren(false);
      }
    },
    isMuted() {
      return muted;
    },
    setEngine(on, speed01) {
      if (!ensure() || muted) {
        if (!on && engineOsc) {
          try { engineOsc.stop(); } catch { /* already stopped */ }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      if (engineOsc) {
        engineOsc.frequency.value = 55 + speed01 * 130;
        engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
      }
      if (!on && engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
    setSiren(on) {
      if (!ensure() || muted) {
        if (sirenOsc) {
          try { sirenOsc.stop(); } catch { /* already stopped */ }
          sirenOsc = null;
          sirenGain = null;
        }
        if (sirenTimer) {
          clearInterval(sirenTimer);
          sirenTimer = null;
        }
        return;
      }
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'square';
        sirenOsc.frequency.value = 720;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.035;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        let high = true;
        sirenTimer = setInterval(() => {
          if (sirenOsc) sirenOsc.frequency.value = high ? 950 : 720;
          high = !high;
        }, 340);
      }
      if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
        if (sirenTimer) {
          clearInterval(sirenTimer);
          sirenTimer = null;
        }
      }
    },
    musicStart() {
      if (musicTimer || !ensure()) return;
      musicTimer = setInterval(musicTick, 170);
    },
    musicStop() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    shot() {
      noise(0.12, 0.35, 2600);
      blip(160, 0.08, 'square', 0.16, 60);
    },
    punch() {
      noise(0.08, 0.3, 500);
    },
    crash() {
      noise(0.25, 0.4, 700);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.2);
      setTimeout(() => blip(990, 0.14, 'sine', 0.2), 90);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.2), i * 110));
    },
    busted() {
      [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.14), i * 160));
    },
    click() {
      blip(880, 0.05, 'sine', 0.12);
    },
    phone() {
      blip(1180, 0.12, 'sine', 0.16);
      setTimeout(() => blip(1180, 0.12, 'sine', 0.16), 180);
    },
  };
}
