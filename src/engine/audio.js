// Звук игры: музыка, фоновые шумы и эффекты синтезируются в браузере (без файлов).
// Один мотив из шести нот звучит в обоих мирах в разных аранжировках.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const MOTIF = [76, 79, 83, 81, 79, 76];

class Audio {
  constructor() {
    this.ctx = null;
    this.volumes = { music: 0.7, sfx: 0.8 };
    this.track = null;
    this.ambient = new Map();
  }

  // Браузер разрешает звук только после действия пользователя
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      const c = this.ctx;
      this.master = c.createDynamicsCompressor();
      this.master.connect(c.destination);
      this.musicBus = c.createGain();
      this.sfxBus = c.createGain();
      this.ambBus = c.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.ambBus.connect(this.master);
      this.reverb = c.createConvolver();
      this.reverb.buffer = this.impulse(3.2);
      this.reverbGain = c.createGain();
      this.reverbGain.gain.value = 0.35;
      this.reverb.connect(this.reverbGain).connect(this.master);
      this.noise = this.makeNoise(4, false);
      this.brown = this.makeNoise(6, true);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() {
    return !!this.ctx;
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.1);
    this.ambBus.gain.setTargetAtTime(this.volumes.sfx * 0.6, t, 0.1);
  }

  makeNoise(seconds, brown) {
    const c = this.ctx;
    const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return b;
  }

  impulse(seconds) {
    const c = this.ctx;
    const len = c.sampleRate * seconds;
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    return b;
  }

  // ---------- кирпичики синтеза ----------

  tone(bus, { freq, type = 'sine', t, dur, vol = 0.1, attack = 0.01, release = null, detune = 0, filter = null, send = 0 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = c.createGain();
    const rel = release ?? dur;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + rel);
    let node = o;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(bus);
    if (send) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.reverb);
    }
    o.start(t);
    o.stop(t + attack + rel + 0.05);
  }

  burst(bus, { t, dur = 0.08, vol = 0.2, type = 'bandpass', freq = 2000, q = 1, buffer = null, send = 0 }) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = buffer || this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    if (send) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.reverb);
    }
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }

  // ---------- музыка ----------

  music(name, { fade = 2.5 } = {}) {
    if (!this.ctx) return;
    if (this.track && this.track.name === name) return;
    this.stopMusic(fade);
    if (!name) return;
    const c = this.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, c.currentTime, fade / 3);
    out.connect(this.musicBus);
    const def = TRACKS[name];
    const track = { name, out, step: 0, next: c.currentTime + 0.1, timer: null };
    const spb = 60 / def.bpm / 2; // восьмые
    track.timer = setInterval(() => {
      while (track.next < c.currentTime + 0.25) {
        def.play(this, out, track.step, track.next, spb);
        track.step++;
        track.next += spb;
      }
    }, 60);
    this.track = track;
  }

  stopMusic(fade = 2) {
    if (!this.track) return;
    const { out, timer } = this.track;
    const c = this.ctx;
    out.gain.setTargetAtTime(0, c.currentTime, fade / 3);
    setTimeout(() => {
      clearInterval(timer);
      out.disconnect();
    }, fade * 1000 + 300);
    this.track = null;
  }

  // ---------- фон ----------

  setAmbience(list = []) {
    if (!this.ctx) return;
    const want = new Set(list);
    for (const [name, node] of this.ambient) {
      if (!want.has(name)) {
        node.stop();
        this.ambient.delete(name);
      }
    }
    for (const name of want) {
      if (!this.ambient.has(name) && AMBIENCE[name]) this.ambient.set(name, AMBIENCE[name](this));
    }
  }

  // ---------- эффекты ----------

  sfx(name, opts = {}) {
    if (!this.ctx || !SFX[name]) return;
    SFX[name](this, this.ctx.currentTime + 0.02, opts);
  }
}

// ---------- музыкальные треки ----------

const TRACKS = {
  // Заставка: мотив и медленные аккорды обоих миров
  title: {
    bpm: 64,
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const chords = [[52, 59, 63, 68], [49, 56, 61, 64], [45, 52, 57, 61], [47, 54, 59, 63]];
      if (step % 16 === 0) {
        chords[bar / 2 % 4].forEach((n) => a.tone(out, { freq: midi(n), type: 'triangle', t, dur: spb * 16, vol: 0.035, attack: 1.5, release: spb * 15, filter: 1100, send: 0.4 }));
      }
      if (bar % 4 === 1 && step % 8 < 6) {
        a.tone(out, { freq: midi(MOTIF[step % 8]), t, dur: 1.4, vol: 0.07, send: 0.6 });
      }
    },
  },
  // Мир «Не приходи», ночь: lo-fi, треск винила, мягкий бит
  'np-night': {
    bpm: 72,
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const chords = [[52, 56, 59, 63], [49, 52, 56, 59], [45, 49, 52, 56], [47, 51, 54, 57]];
      if (pos === 0 && bar % 2 === 0) {
        chords[(bar / 2) % 4].forEach((n) => a.tone(out, { freq: midi(n), type: 'triangle', t, dur: spb * 16, vol: 0.04, attack: 0.3, release: spb * 15, detune: (Math.random() - 0.5) * 14, filter: 900 }));
        a.tone(out, { freq: midi(chords[(bar / 2) % 4][0] - 12), type: 'sine', t, dur: spb * 14, vol: 0.09, attack: 0.05, release: spb * 14 });
      }
      if (bar < 2) return; // первые такты без бита
      if (pos === 0 || pos === 5) {
        const o = a.ctx.createOscillator();
        const g = a.ctx.createGain();
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.32);
      }
      if (pos === 2 || pos === 6) a.burst(out, { t, dur: 0.16, vol: 0.12, freq: 1800, q: 0.7 });
      a.burst(out, { t: t + (pos % 2 ? 0.02 : 0), dur: 0.035, vol: 0.035, type: 'highpass', freq: 7000 });
      if (bar % 8 === 5 && pos < 6) a.tone(out, { freq: midi(MOTIF[pos]), t, dur: 1.2, vol: 0.05, filter: 2400 });
      if (Math.random() < 0.3) a.burst(out, { t: t + Math.random() * spb, dur: 0.01, vol: 0.05, type: 'highpass', freq: 3000 });
    },
  },
  // Мир «Не приходи», утро: без бита, светлое арпеджио
  'np-morning': {
    bpm: 80,
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const chords = [[52, 56, 59, 64], [57, 61, 64, 69], [54, 57, 61, 66], [59, 63, 66, 71]];
      const ch = chords[Math.floor(bar / 2) % 4];
      if (step % 16 === 0) a.tone(out, { freq: midi(ch[0] - 12), type: 'triangle', t, dur: spb * 16, vol: 0.05, attack: 0.8, filter: 700 });
      const n = ch[[0, 1, 2, 3, 2, 1, 2, 3][step % 8]] + 12;
      a.tone(out, { freq: midi(n), t, dur: 0.9, vol: 0.035, filter: 3000, send: 0.2 });
      if (bar % 8 === 6 && step % 8 < 6) a.tone(out, { freq: midi(MOTIF[step % 8]), t, dur: 1.3, vol: 0.06, send: 0.3 });
      if (Math.random() < 0.25) a.burst(out, { t: t + Math.random() * spb, dur: 0.01, vol: 0.04, type: 'highpass', freq: 3000 });
    },
  },
  // Мир «Приходи», ночь: dream pop — широкие пады и мотив в реверберации
  'p-night': {
    bpm: 58,
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const chords = [[52, 59, 63, 66, 71], [48, 55, 59, 62, 67], [45, 52, 57, 60, 64], [47, 54, 59, 62, 66]];
      if (step % 16 === 0) {
        chords[(bar / 2) % 4].forEach((n) => {
          [-9, 9].forEach((dt) => a.tone(out, { freq: midi(n), type: 'sawtooth', t, dur: spb * 16, vol: 0.012, attack: 2, release: spb * 15, detune: dt, filter: 1300, send: 0.9 }));
        });
      }
      if (bar % 4 === 2 && step % 8 < 6) {
        a.tone(out, { freq: midi(MOTIF[step % 8] - 12), t, dur: 2, vol: 0.06, send: 1 });
        a.tone(out, { freq: midi(MOTIF[step % 8]), t: t + 0.37, dur: 1.5, vol: 0.025, send: 1 });
      }
    },
  },
  // Напряжение: низкий гул и расстроенный мотив
  tension: {
    bpm: 50,
    play(a, out, step, t, spb) {
      if (step % 16 === 0) {
        [40, 40.4].forEach((n) => a.tone(out, { freq: midi(n), type: 'sawtooth', t, dur: spb * 16, vol: 0.03, attack: 2, release: spb * 15, filter: 300 }));
      }
      if (step % 32 === 8) MOTIF.forEach((n, i) => a.tone(out, { freq: midi(n - 12), t: t + i * 0.5, dur: 1.5, vol: 0.03, detune: 35, send: 1 }));
    },
  },
};

// ---------- фоновые шумы ----------

function loopNoise(a, { buffer, type, freq, q = 1, vol, lfo = 0, lfoRate = 0.2 }) {
  const c = a.ctx;
  const s = c.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(vol, c.currentTime, 1);
  s.connect(f).connect(g).connect(a.ambBus);
  let osc = null;
  if (lfo) {
    osc = c.createOscillator();
    osc.frequency.value = lfoRate;
    const lg = c.createGain();
    lg.gain.value = lfo;
    osc.connect(lg).connect(g.gain);
    osc.start();
  }
  s.start();
  return {
    stop() {
      g.gain.setTargetAtTime(0, c.currentTime, 0.6);
      setTimeout(() => {
        s.stop();
        if (osc) osc.stop();
      }, 2500);
    },
  };
}

const AMBIENCE = {
  room: (a) => loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 400, vol: 0.12 }),
  rain: (a) => {
    const n1 = loopNoise(a, { buffer: a.noise, type: 'bandpass', freq: 2500, q: 0.4, vol: 0.09, lfo: 0.02, lfoRate: 0.13 });
    const n2 = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 600, vol: 0.15 });
    const timer = setInterval(() => {
      const t = a.ctx.currentTime;
      for (let i = 0; i < 3; i++) a.burst(a.ambBus, { t: t + Math.random() * 0.3, dur: 0.02, vol: 0.05, freq: 3000 + Math.random() * 3000, q: 4 });
    }, 300);
    return { stop() { n1.stop(); n2.stop(); clearInterval(timer); } };
  },
  fridge: (a) => {
    const c = a.ctx;
    const o = c.createOscillator();
    o.frequency.value = 50;
    const o2 = c.createOscillator();
    o2.frequency.value = 100.6;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.035, c.currentTime, 1);
    o.connect(g);
    o2.connect(g);
    g.connect(a.ambBus);
    o.start();
    o2.start();
    const hum = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 180, vol: 0.05 });
    return {
      stop() {
        g.gain.setTargetAtTime(0, c.currentTime, 0.5);
        hum.stop();
        setTimeout(() => { o.stop(); o2.stop(); }, 2000);
      },
    };
  },
  kettle: (a) => loopNoise(a, { buffer: a.noise, type: 'bandpass', freq: 5200, q: 3, vol: 0.012, lfo: 0.006, lfoRate: 0.3 }),
  clock: (a) => {
    let tick = true;
    const timer = setInterval(() => {
      a.burst(a.ambBus, { t: a.ctx.currentTime, dur: 0.02, vol: tick ? 0.12 : 0.08, freq: tick ? 3200 : 2600, q: 8 });
      tick = !tick;
    }, 1000);
    return { stop() { clearInterval(timer); } };
  },
};

// ---------- эффекты ----------

const SFX = {
  // Скрип половицы: узкий фильтр с «плывущей» частотой
  creak(a, t) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 30;
    f.frequency.setValueAtTime(420, t);
    f.frequency.linearRampToValueAtTime(700, t + 0.4);
    f.frequency.linearRampToValueAtTime(380, t + 1.1);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.15);
    g.gain.linearRampToValueAtTime(0.5, t + 0.7);
    g.gain.linearRampToValueAtTime(0, t + 1.2);
    s.connect(f).connect(g).connect(a.sfxBus);
    const sg = c.createGain();
    sg.gain.value = 0.4;
    g.connect(sg).connect(a.reverb);
    s.start(t);
    s.stop(t + 1.3);
  },
  // Шёпот: шум, «проговорённый» формантами
  whisper(a, t) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    [900, 1600, 700, 2200, 1100].forEach((fr, i) => {
      f.frequency.setValueAtTime(fr, t + i * 0.22);
      g.gain.setValueAtTime(0, t + i * 0.22);
      g.gain.linearRampToValueAtTime(0.35, t + i * 0.22 + 0.06);
      g.gain.linearRampToValueAtTime(0.02, t + i * 0.22 + 0.2);
    });
    g.gain.linearRampToValueAtTime(0, t + 1.3);
    s.connect(f).connect(g);
    const sg = c.createGain();
    sg.gain.value = 1;
    g.connect(sg).connect(a.reverb);
    g.connect(a.sfxBus);
    s.start(t);
    s.stop(t + 1.4);
  },
  // Поезд: гул, нарастающий стук колёс, звон
  train(a, t, { dur = 5 } = {}) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.brown;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 280;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.9, t + dur * 0.65);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t);
    s.stop(t + dur + 0.1);
    for (let x = 0.4; x < dur - 0.4; x += 0.6) {
      const lvl = 0.3 * Math.sin((Math.PI * x) / dur);
      [0, 0.13].forEach((off) => a.burst(a.sfxBus, { t: t + x + off, dur: 0.07, vol: lvl, freq: 1700, q: 2 }));
    }
  },
  // Два гудка отцовской электрички
  horns(a, t) {
    [0, 0.65].forEach((off) => {
      [311.1, 392].forEach((fr) => a.tone(a.sfxBus, { freq: fr, type: 'sawtooth', t: t + off, dur: 0.4, vol: 0.07, attack: 0.04, release: 0.4, filter: 1600, send: 0.5 }));
    });
  },
  clink(a, t) {
    [0, 0.12, 0.3, 0.45].forEach((off, i) => a.tone(a.sfxBus, { freq: 2400 + i * 330, t: t + off, dur: 0.4, vol: 0.05, attack: 0.002 }));
  },
  magnet(a, t) {
    a.burst(a.sfxBus, { t, dur: 0.05, vol: 0.4, freq: 1200, q: 3 });
  },
  pluck(a, t) {
    a.tone(a.sfxBus, { freq: midi(79), t, dur: 0.5, vol: 0.12, attack: 0.003, send: 0.3 });
    a.burst(a.sfxBus, { t, dur: 0.04, vol: 0.3, freq: 1400, q: 3 });
  },
  thud(a, t) {
    a.tone(a.sfxBus, { freq: 120, t, dur: 0.18, vol: 0.18, attack: 0.003 });
  },
  success(a, t) {
    [76, 79, 83, 88].forEach((n, i) => a.tone(a.sfxBus, { freq: midi(n), t: t + i * 0.12, dur: 1.2, vol: 0.07, send: 0.6 }));
  },
  // Холод: свист ветра и высокий звон (закон 6 — кто-то рядом)
  cold(a, t) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 12;
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(1400, t + 2.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 1.2);
    g.gain.linearRampToValueAtTime(0, t + 3.2);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t);
    s.stop(t + 3.3);
    [2093, 2110].forEach((fr) => a.tone(a.sfxBus, { freq: fr, t, dur: 3, vol: 0.02, attack: 1.2, release: 2, send: 0.8 }));
  },
  // Акцент смены сцены
  sting(a, t) {
    [40, 47, 52].forEach((n) => a.tone(a.sfxBus, { freq: midi(n), type: 'triangle', t, dur: 3, vol: 0.06, attack: 0.02, release: 3, send: 0.8 }));
  },
  // Осмотр предмета: мягкий короткий звук
  look(a, t) {
    a.tone(a.sfxBus, { freq: midi(88), t, dur: 0.6, vol: 0.035, attack: 0.005, send: 0.5 });
    a.tone(a.sfxBus, { freq: midi(83), t: t + 0.07, dur: 0.6, vol: 0.025, attack: 0.005, send: 0.5 });
  },
  ui(a, t) {
    a.tone(a.sfxBus, { freq: 1800, t, dur: 0.05, vol: 0.03, attack: 0.001 });
  },
  page(a, t) {
    a.burst(a.sfxBus, { t, dur: 0.35, vol: 0.12, type: 'highpass', freq: 2500 });
  },
};

export const audio = new Audio();
