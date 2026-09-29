// Звук игры: музыка, фоновые шумы и эффекты синтезируются в браузере (без файлов).
// Один мотив из шести нот («слово») звучит в обоих мирах в разных аранжировках:
// «Не приходи» — сухой lo-fi (электропиано, треск винила, мягкий бит),
// «Приходи» — тёплый dream pop (пады, дождь, арпеджио в реверберации).

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// «Слово»: ми — соль — си, ля — соль — ми (песенка, которую напевала Вера)
const MOTIF = [76, 79, 83, 81, 79, 76];
// Где звучат ноты мотива внутри такта из восьми восьмых: «ми-соль-си— ля-соль-ми—»
const MOTIF_AT = [0, 1, 2, 4, 5, 6];
// Номер ноты мотива на восьмой k (или -1); stretch растягивает мотив во столько раз
const motifAt = (k, stretch = 1) => (k % stretch ? -1 : MOTIF_AT.indexOf(k / stretch));
// Звук идёт, только если контекст запущен (иначе таймеры копили бы звуки «про запас»)
const live = (a) => !!a.ctx && a.ctx.state === 'running';

// Гармонии. Мир «Не приходи»: Cmaj9 — Bm9 — Am9 — Em9 (без баса) и басы к ним
const NP_CHORDS = [[52, 55, 59, 62], [50, 54, 57, 61], [48, 52, 55, 59], [50, 54, 55, 59]];
const NP_ROOTS = [36, 35, 33, 40];
// Мир «Приходи»: Em9 — Cmaj9 — G/B — D6/9
const P_CHORDS = [[52, 55, 59, 62, 66], [52, 55, 59, 62, 64], [50, 55, 59, 62, 67], [50, 54, 57, 62, 64]];
const P_ROOTS = [40, 36, 35, 38];

// Темы, для которых может лежать записанный файл assets/music/<имя>.mp3
const MUSIC_FILES = ['title', 'np-night', 'np-morning', 'p-night', 'tension', 'dom03', 'vera', 'finale'];
// записи громче синтеза — чуть приглушаем, чтобы музыка оставалась под диалогом
const FILE_LEVEL = 0.55;
// Живой шёпот «…ходи…» (записан голосом, assets/voice/whisper-N.m4a): если записи есть — звучит
// случайная из них, «из-за двери»; если нет — шёпот синтезируется
const WHISPER_FILES = [1, 2, 3, 4, 5, 6].map((i) => `assets/voice/whisper-${i}.m4a`);

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
      // записанные треки (assets/music/<имя>.mp3, например из Suno): если файл есть — играет он,
      // если нет — тема синтезируется как раньше
      this.files = {};
      MUSIC_FILES.forEach((n) => {
        fetch(`assets/music/${n}.mp3`)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((b) => b && c.decodeAudioData(b))
          .then((buf) => { if (buf) this.files[n] = buf; })
          .catch(() => {});
      });
      // шёпот: при загрузке обрезаем тишину в начале и запоминаем пик для выравнивания громкости
      this.whispers = [];
      WHISPER_FILES.forEach((u) => {
        fetch(u)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((b) => b && c.decodeAudioData(b))
          .then((buf) => {
            if (!buf) return;
            const d = buf.getChannelData(0);
            let peak = 0;
            for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
            let start = 0;
            while (start < d.length && Math.abs(d[start]) < peak * 0.08) start++;
            let end = d.length - 1;
            while (end > start && Math.abs(d[end]) < peak * 0.05) end--;
            const pad = Math.floor(buf.sampleRate * 0.05);
            this.whispers.push({ buf, peak: peak || 1, from: Math.max(0, start - pad) / buf.sampleRate, to: Math.min(d.length, end + pad * 4) / buf.sampleRate });
          })
          .catch(() => {});
      });
      this.master = c.createDynamicsCompressor();
      this.master.threshold.value = -18;
      this.master.ratio.value = 3;
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
      // посылы в реверберацию подчиняются громкости музыки и эффектов
      this.revMusic = c.createGain();
      this.revSfx = c.createGain();
      this.revMusic.connect(this.reverb);
      this.revSfx.connect(this.reverb);
      // общее «плавание плёнки» для lo-fi инструментов
      this.wob = c.createOscillator();
      this.wob.frequency.value = 0.42;
      this.wobGain = c.createGain();
      this.wobGain.gain.value = 7;
      this.wob.connect(this.wobGain);
      this.wob.start();
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
    this.revMusic.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.1);
    this.revSfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.1);
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

  // Куда посылать реверберацию для данной шины (у каждого трека — своя, чтобы гасла вместе с ним)
  rev(bus) {
    return bus.rev || (bus === this.musicBus ? this.revMusic : this.revSfx);
  }

  // ---------- кирпичики синтеза ----------

  tone(bus, { freq, type = 'sine', t, dur, vol = 0.1, attack = 0.01, release = null, detune = 0, filter = null, send = 0, wobble = false, glide = 0 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (glide) {
      o.frequency.setValueAtTime(freq * glide, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + Math.max(0.02, Math.min(0.12, (release ?? dur) * 0.5)));
    }
    o.detune.value = detune;
    if (wobble) {
      this.wobGain.connect(o.detune);
      o.onended = () => {
        try {
          this.wobGain.disconnect(o.detune);
        } catch (e) {
          /* уже отключено */
        }
      };
    }
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
      g.connect(sg).connect(this.rev(bus));
    }
    o.start(t);
    o.stop(t + attack + rel + 0.05);
  }

  burst(bus, { t, dur = 0.08, vol = 0.2, type = 'bandpass', freq = 2000, q = 1, buffer = null, send = 0, attack = 0.002 }) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = buffer || this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    const end = t + Math.max(dur, attack + 0.005);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    s.connect(f).connect(g).connect(bus);
    if (send) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.rev(bus));
    }
    s.start(t, Math.random() * Math.max(0, s.buffer.duration - (end - t) - 0.1));
    s.stop(end + 0.05);
  }

  // ---------- музыка ----------

  music(name, { fade = 2.5 } = {}) {
    if (!this.ctx) return;
    if (this.track && this.track.name === name) return;
    this.stopMusic(fade);
    const c = this.ctx;
    // записанный трек
    if (name && this.files && this.files[name]) {
      const out = c.createGain();
      out.gain.value = 0;
      out.gain.setTargetAtTime(FILE_LEVEL, c.currentTime, fade / 3);
      out.connect(this.musicBus);
      out.rev = c.createGain();
      const src = c.createBufferSource();
      src.buffer = this.files[name];
      src.loop = true;
      src.connect(out);
      src.start();
      out.layer = { stop: () => { try { src.stop(); } catch { /* уже остановлен */ } } };
      this.track = { name, out, timer: null };
      return;
    }
    const def = name && TRACKS[name];
    if (!def) return;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, c.currentTime, fade / 3);
    out.connect(this.musicBus);
    out.rev = c.createGain();
    out.rev.gain.value = 0;
    out.rev.gain.setTargetAtTime(1, c.currentTime, fade / 3);
    out.rev.connect(this.revMusic);
    out.layer = def.start ? def.start(this, out) : null;
    const track = { name, out, step: 0, next: c.currentTime + 0.1, timer: null };
    const spb = 60 / def.bpm / 2; // восьмые
    track.timer = setInterval(() => {
      // вкладка спала — пропускаем прошедшие шаги, а не играем их все разом
      while (track.next < c.currentTime) {
        track.step++;
        track.next += spb;
      }
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
    out.rev.gain.setTargetAtTime(0, c.currentTime, fade / 2);
    setTimeout(() => {
      clearInterval(timer);
      if (out.layer) out.layer.stop();
      out.disconnect();
      setTimeout(() => out.rev.disconnect(), 3500);
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
    SFX[name](this, this.ctx.currentTime + 0.02, opts || {});
  }
}

// ---------- инструменты ----------

// Электропиано: тёплый треугольник + короткий «колокольчик» октавой выше, плывёт как плёнка
function rhodes(a, out, n, t, { dur = 2, vol = 0.04, send = 0.15, bright = 1400 } = {}) {
  a.tone(out, { freq: midi(n), type: 'triangle', t, dur, vol, attack: 0.008, release: dur, filter: bright, wobble: true, send });
  a.tone(out, { freq: midi(n + 12), t, dur: 0.5, vol: vol * 0.3, attack: 0.004, release: 0.5, wobble: true, send });
}

// Широкий пад: каждая нота — две чуть расстроенные пилы за фильтром
function pad(a, out, notes, t, { dur, vol = 0.01, filter = 1200, send = 0.7, attack = 1.5, spread = 8, type = 'sawtooth' }) {
  notes.forEach((n) => [-spread, spread].forEach((dt) => a.tone(out, { freq: midi(n), type, t, dur, vol, attack, release: dur, detune: dt, filter, send })));
}

// Музыкальная шкатулка: чистый тон и короткий высокий обертон
function musicBox(a, out, n, t, vol = 0.03) {
  a.tone(out, { freq: midi(n), t, dur: 1.4, vol, attack: 0.003, send: 0.45 });
  a.tone(out, { freq: midi(n) * 4.02, t, dur: 0.18, vol: vol * 0.1, attack: 0.002 });
}

// Напев без слов: мягкий треугольник и чистый тон чуть в разлад
function hum(a, out, n, t, dur, vol = 0.05) {
  a.tone(out, { freq: midi(n), type: 'triangle', t, dur, vol, attack: 0.09, release: dur, filter: 1300, wobble: true, send: 0.5 });
  a.tone(out, { freq: midi(n), t, dur, vol: vol * 0.6, attack: 0.12, release: dur, detune: 5, send: 0.5 });
}

// Мягкая бочка
function kick(a, out, t, vol = 0.2) {
  const c = a.ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
}

// Мягкий малый барабан (как по подушке)
function snare(a, out, t, vol = 0.06) {
  a.burst(out, { t, dur: 0.2, vol, freq: 1400, q: 0.6, attack: 0.003 });
  a.tone(out, { freq: 185, t, dur: 0.08, vol: vol * 0.7, attack: 0.002 });
}

function hat(a, out, t, vol = 0.015) {
  a.burst(out, { t, dur: 0.04, vol, type: 'highpass', freq: 7500, attack: 0.002 });
}

// Ход часов: деревянный тик / чуть ниже — так
function clockTick(a, bus, t, tock, vol = 1) {
  a.burst(bus, { t, dur: 0.018, vol: (tock ? 0.1 : 0.13) * vol, freq: tock ? 2300 : 3100, q: 7, attack: 0.001 });
  a.tone(bus, { freq: tock ? 1180 : 1510, t, dur: 0.03, vol: 0.012 * vol, attack: 0.001 });
  a.burst(bus, { t: t + 0.004, dur: 0.03, vol: 0.05 * vol, type: 'lowpass', freq: 700, attack: 0.001 });
}

// Скрип дерева: узкий резонанс, «прерывистый» частотой трения (stick-slip)
function creakVoice(a, bus, t, { len = 1.1, vol = 1, f0 = 420, f1 = 700, send = 0.4 } = {}) {
  const c = a.ctx;
  const s = c.createBufferSource();
  s.buffer = a.noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 18;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.linearRampToValueAtTime(f1, t + len * 0.35);
  f.frequency.linearRampToValueAtTime(f0 * 0.9, t + len);
  const am = c.createGain();
  am.gain.value = 0.3;
  const lfo = c.createOscillator();
  lfo.type = 'sawtooth';
  lfo.frequency.setValueAtTime(34, t);
  lfo.frequency.linearRampToValueAtTime(62, t + len * 0.4);
  lfo.frequency.linearRampToValueAtTime(26, t + len);
  const lg = c.createGain();
  lg.gain.value = 0.9;
  lfo.connect(lg).connect(am.gain);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(3 * vol, t + len * 0.14);
  g.gain.linearRampToValueAtTime(1.8 * vol, t + len * 0.6);
  g.gain.linearRampToValueAtTime(0, t + len);
  s.connect(f).connect(am).connect(g).connect(bus);
  if (send) {
    const sg = c.createGain();
    sg.gain.value = send;
    g.connect(sg).connect(a.rev(bus));
  }
  s.start(t, Math.random() * 2);
  s.stop(t + len + 0.05);
  lfo.start(t);
  lfo.stop(t + len + 0.05);
}

// Шёпот «…ходи…»: шум через две форманты — х, о, д, и
function whisperWord(a, bus, t, { vol = 0.4, send = 0.6, rate = 1 } = {}) {
  const c = a.ctx;
  const T = (x) => t + x / rate;
  const s = c.createBufferSource();
  s.buffer = a.noise;
  const f1 = c.createBiquadFilter();
  const f2 = c.createBiquadFilter();
  f1.type = 'bandpass';
  f2.type = 'bandpass';
  // х — широкое шипение
  f1.Q.setValueAtTime(1.2, t);
  f2.Q.setValueAtTime(2, t);
  f1.frequency.setValueAtTime(1500, t);
  f2.frequency.setValueAtTime(3000, t);
  // о
  f1.Q.setValueAtTime(1.2, T(0.14));
  f1.Q.linearRampToValueAtTime(9, T(0.2));
  f2.Q.setValueAtTime(2, T(0.14));
  f2.Q.linearRampToValueAtTime(9, T(0.2));
  f1.frequency.setValueAtTime(1500, T(0.14));
  f1.frequency.linearRampToValueAtTime(520, T(0.2));
  f2.frequency.setValueAtTime(3000, T(0.14));
  f2.frequency.linearRampToValueAtTime(880, T(0.2));
  // д → и
  f1.frequency.setValueAtTime(520, T(0.36));
  f1.frequency.linearRampToValueAtTime(330, T(0.46));
  f2.frequency.setValueAtTime(880, T(0.36));
  f2.frequency.linearRampToValueAtTime(2300, T(0.46));
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol * 0.35, T(0.1));
  g.gain.linearRampToValueAtTime(vol, T(0.2));
  g.gain.linearRampToValueAtTime(vol * 0.8, T(0.34));
  g.gain.linearRampToValueAtTime(vol * 0.05, T(0.38));
  g.gain.linearRampToValueAtTime(vol * 0.9, T(0.41));
  g.gain.linearRampToValueAtTime(vol * 0.8, T(0.62));
  g.gain.linearRampToValueAtTime(0, T(0.95));
  const f2g = c.createGain();
  f2g.gain.value = 0.7;
  const mix = c.createGain();
  mix.gain.value = 2;
  s.connect(f1).connect(g);
  s.connect(f2).connect(f2g).connect(g);
  g.connect(mix).connect(bus);
  if (send) {
    const sg = c.createGain();
    sg.gain.value = send;
    mix.connect(sg).connect(a.rev(bus));
  }
  s.start(t, Math.random() * 2);
  s.stop(T(1));
}

// Капля о стекло: короткий «плинк» с падающим тоном и щелчок
function glassDrop(a, bus, t, vol = 0.03) {
  const c = a.ctx;
  const fr = 2200 + Math.random() * 3200;
  const o = c.createOscillator();
  o.frequency.setValueAtTime(fr, t);
  o.frequency.exponentialRampToValueAtTime(fr * 0.6, t + 0.03);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.06);
  a.burst(bus, { t, dur: 0.012, vol: vol * 0.7, type: 'highpass', freq: 3500, attack: 0.001 });
}

// Треск винила и тихое шипение — слой под треком
function vinyl(a, out, vol = 1) {
  const c = a.ctx;
  const s = c.createBufferSource();
  s.buffer = a.noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 4500;
  f.Q.value = 0.5;
  const g = c.createGain();
  g.gain.value = 0.005 * vol;
  s.connect(f).connect(g).connect(out);
  s.start();
  const timer = setInterval(() => {
    if (!live(a)) return;
    const t = c.currentTime + 0.05;
    const n = Math.random() < 0.6 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      a.burst(out, { t: t + Math.random() * 0.2, dur: 0.004 + Math.random() * 0.006, vol: (0.02 + Math.random() * 0.04) * vol, freq: 2500 + Math.random() * 2500, q: 0.8, attack: 0.001 });
    }
    if (Math.random() < 0.04) a.burst(out, { t, dur: 0.015, vol: 0.05 * vol, type: 'lowpass', freq: 700, attack: 0.001 });
  }, 200);
  return {
    stop() {
      clearInterval(timer);
      s.stop(c.currentTime + 0.1);
    },
  };
}

// Дождь внутри музыки: мягкая «пелена» и редкие капли; уровень можно менять
function rainPad(a, out, vol = 1) {
  const c = a.ctx;
  const s = c.createBufferSource();
  s.buffer = a.noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1100;
  f.Q.value = 0.4;
  const g = c.createGain();
  g.gain.value = 0.009 * vol;
  s.connect(f).connect(g).connect(out);
  s.start();
  const pad = {
    vol,
    setLevel(v, t) {
      pad.vol = v;
      g.gain.setTargetAtTime(0.009 * v, t, 2);
    },
    stop() {
      clearInterval(timer);
      s.stop(c.currentTime + 0.1);
    },
  };
  const timer = setInterval(() => {
    if (!live(a) || pad.vol <= 0) return;
    const t = c.currentTime + 0.05;
    if (Math.random() < 0.7) glassDrop(a, out, t + Math.random() * 0.25, 0.012 * pad.vol);
  }, 250);
  return pad;
}

// Низкий гул: две расстроенные пилы, тритон и плавающий фильтр (для напряжения)
function drone(a, out) {
  const c = a.ctx;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 240;
  f.Q.value = 2;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.05;
  const lg = c.createGain();
  lg.gain.value = 110;
  lfo.connect(lg).connect(f.frequency);
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(0.02, c.currentTime, 2);
  f.connect(g).connect(out);
  const oscs = [[82.41, 'sawtooth', 1], [82.9, 'sawtooth', 1], [41.2, 'sine', 1.4], [116.54, 'triangle', 0.35]].map(([fr, type, v]) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = fr;
    const og = c.createGain();
    og.gain.value = v;
    o.connect(og).connect(f);
    o.start();
    return o;
  });
  lfo.start();
  return {
    stop() {
      const t = c.currentTime + 0.1;
      oscs.forEach((o) => o.stop(t));
      lfo.stop(t);
    },
  };
}

// Гул насыпи под битом Тихона; раз в 16 тактов нарастает — мимо идёт поезд
function rumbleBed(a, out) {
  const c = a.ctx;
  const s = c.createBufferSource();
  s.buffer = a.brown;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 130;
  const g = c.createGain();
  g.gain.value = 0.03;
  s.connect(f).connect(g).connect(out);
  s.start();
  return {
    gain: g,
    stop() {
      s.stop(c.currentTime + 0.1);
    },
  };
}

// Несколько слоёв сразу
const layers = (...list) => ({
  list,
  stop() {
    list.forEach((l) => l.stop());
  },
});

// «Бочка» из бита Тихона: удар вагона по стыку рельсов
function trainKick(a, out, t) {
  kick(a, out, t, 0.17);
  a.burst(out, { t, dur: 0.22, vol: 0.2, type: 'lowpass', freq: 160, q: 0.7, buffer: a.brown, attack: 0.004 });
  a.burst(out, { t: t + 0.01, dur: 0.04, vol: 0.04, freq: 1300, q: 1.5 });
}

// Бас — гул поезда, подстроенный под аккорд
function trainBass(a, out, n, t, dur) {
  a.tone(out, { freq: midi(n), type: 'triangle', t, dur, vol: 0.07, attack: 0.02, release: dur, filter: 260, wobble: true });
  a.tone(out, { freq: midi(n - 12), t, dur, vol: 0.055, attack: 0.02, release: dur });
}

// Соло «свистка чайника»: мотив одним дыханием, с подъездом снизу и вибрато
function kettleLead(a, out, t, spb) {
  const c = a.ctx;
  const len = spb * 16;
  const o = c.createOscillator();
  const vib = c.createOscillator();
  vib.frequency.value = 5.5;
  const vg = c.createGain();
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(14, t + 1.2);
  vib.connect(vg).connect(o.detune);
  const s = c.createBufferSource();
  s.buffer = a.noise;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 30;
  const ng = c.createGain();
  ng.gain.value = 3;
  const g = c.createGain();
  o.frequency.setValueAtTime(midi(MOTIF[0] - 3), t);
  bp.frequency.setValueAtTime(midi(MOTIF[0] - 3), t);
  g.gain.setValueAtTime(0, t);
  MOTIF.forEach((n, i) => {
    const tt = t + MOTIF_AT[i] * 2 * spb;
    o.frequency.setTargetAtTime(midi(n), tt, i === 0 ? 0.09 : 0.025);
    bp.frequency.setTargetAtTime(midi(n), tt, 0.025);
    g.gain.setTargetAtTime(0.036, tt, 0.04);
    g.gain.setTargetAtTime(0.022, tt + spb * 0.8, 0.2);
  });
  g.gain.setTargetAtTime(0, t + len - spb, 0.25);
  o.connect(g);
  s.connect(bp).connect(ng).connect(g);
  g.connect(out);
  const sg = c.createGain();
  sg.gain.value = 0.35;
  g.connect(sg).connect(a.rev(out));
  const end = t + len + 0.6;
  o.start(t);
  vib.start(t);
  s.start(t, Math.random() * 2);
  o.stop(end);
  vib.stop(end);
  s.stop(end);
}

// Два мягких «гудка» внутри музыки
function softHorns(a, out, t, spb) {
  [0, spb * 2.5].forEach((off) => {
    [66, 69].forEach((n) => a.tone(out, { freq: midi(n), type: 'sawtooth', t: t + off, dur: spb * 1.6, vol: 0.012, attack: 0.08, release: spb * 1.6, filter: 900, send: 0.8 }));
  });
}

// ---------- музыкальные треки ----------

const TRACKS = {
  // Заставка: оба мира. Мотив сначала сухо (НП), потом тонет в дожде (П)
  title: {
    bpm: 60,
    start: (a, out) => layers(vinyl(a, out, 0.5), rainPad(a, out, 0.6)),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      // Em9 — Cmaj7 — G — Am9, первая нота — бас
      const chords = [[40, 55, 59, 62, 66], [36, 52, 55, 59, 64], [43, 55, 59, 62, 67], [45, 55, 59, 60, 64]];
      if (step % 16 === 0) {
        const ch = chords[Math.floor(bar / 2) % 4];
        a.tone(out, { freq: midi(ch[0]), t, dur: spb * 16, vol: 0.06, attack: 1, filter: 250 });
        ch.slice(1).forEach((n, i) => rhodes(a, out, n, t + i * 0.05, { dur: spb * 15, vol: 0.02, send: 0.5 }));
        pad(a, out, ch.slice(1, 4), t, { dur: spb * 17, vol: 0.006, attack: 2.5, filter: 1000, send: 0.9 });
      }
      if (bar % 8 === 2) {
        const i = motifAt(pos);
        if (i >= 0) rhodes(a, out, MOTIF[i], t, { dur: 1.8, vol: 0.05, send: 0.25, bright: 2200 });
      }
      if (bar % 8 === 6 || bar % 8 === 7) {
        const i = motifAt(step % 16, 2);
        if (i >= 0) {
          a.tone(out, { freq: midi(MOTIF[i]), t, dur: 2.4, vol: 0.04, attack: 0.03, send: 1, wobble: true });
          a.tone(out, { freq: midi(MOTIF[i] + 12), t: t + 0.02, dur: 1.6, vol: 0.008, attack: 0.03, send: 1 });
        }
      }
    },
  },

  // Мир «Не приходи», ночь: lo-fi — электропиано, треск винила, мягкий бит со свингом
  'np-night': {
    bpm: 72,
    start: (a, out) => vinyl(a, out, 1),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const sw = pos % 2 ? spb * 0.16 : 0;
      const k = Math.floor(bar / 2) % 4;
      const ch = NP_CHORDS[k];
      if (pos === 0 && bar % 2 === 0) {
        ch.forEach((n, i) => rhodes(a, out, n, t + i * 0.012, { dur: spb * 15, vol: 0.028 }));
        a.tone(out, { freq: midi(NP_ROOTS[k] + 12), type: 'triangle', t, dur: spb * 14, vol: 0.06, attack: 0.03, filter: 350, wobble: true });
        a.tone(out, { freq: midi(NP_ROOTS[k]), t, dur: spb * 14, vol: 0.05, attack: 0.03 });
      }
      if (pos === 3 && bar % 2 === 1) [ch[2], ch[3]].forEach((n) => rhodes(a, out, n, t + sw, { dur: spb * 3, vol: 0.016 }));
      if (bar < 2) return; // первые такты без бита
      if (pos === 0 || (pos === 5 && bar % 2 === 0) || (pos === 3 && bar % 2 === 1)) kick(a, out, t + sw, 0.19);
      if (pos === 2 || pos === 6) snare(a, out, t, 0.055);
      hat(a, out, t + sw, pos % 2 ? 0.009 : 0.015);
      if (bar % 8 === 5) {
        const i = motifAt(pos);
        if (i >= 0) rhodes(a, out, MOTIF[i], t + sw, { dur: 1.6, vol: 0.045, send: 0.3, bright: 2200 });
      }
    },
  },

  // Мир «Не приходи», утро: без бита, светлое одинокое арпеджио
  'np-morning': {
    bpm: 76,
    start: (a, out) => vinyl(a, out, 0.45),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      // Gmaj7 — Em7 — Cmaj7 — D6
      const chords = [[43, 55, 59, 62, 66], [40, 55, 59, 62, 64], [36, 52, 55, 59, 64], [38, 54, 57, 62, 64]];
      const ch = chords[Math.floor(bar / 2) % 4];
      if (step % 16 === 0) a.tone(out, { freq: midi(ch[0]), type: 'triangle', t, dur: spb * 16, vol: 0.05, attack: 0.6, filter: 500, wobble: true });
      const pat = [1, 2, 3, 4, 3, 2, 3, 4];
      if (pos !== 7 || bar % 2 === 0) {
        rhodes(a, out, ch[pat[pos]] + 12, t + (pos % 2 ? spb * 0.1 : 0), { dur: 1.1, vol: pos === 0 ? 0.036 : 0.025, send: 0.25, bright: 2600 });
      }
      if (bar % 8 === 4) {
        const i = motifAt(pos);
        if (i >= 0) rhodes(a, out, MOTIF[i], t, { dur: 1.8, vol: 0.048, send: 0.3, bright: 2400 });
      }
    },
  },

  // Мир «Приходи», ночь: dream pop — пады, дождь, «гитара» в реверберации, тихий пульс
  'p-night': {
    bpm: 66,
    start: (a, out) => rainPad(a, out, 1),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const k = Math.floor(bar / 2) % 4;
      const ch = P_CHORDS[k];
      if (step % 16 === 0) {
        pad(a, out, ch, t, { dur: spb * 17, vol: 0.008, filter: 1500, send: 0.9, attack: 1.8 });
        a.tone(out, { freq: midi(P_ROOTS[k]), t, dur: spb * 16, vol: 0.07, attack: 0.4, filter: 300 });
      }
      if (bar >= 2) {
        const pat = [0, 2, 4, 3, 1, 3, 4, 2];
        const n = ch[pat[pos]] + 12;
        const v = pos === 0 ? 0.026 : 0.019;
        a.tone(out, { freq: midi(n), type: 'triangle', t, dur: 0.8, vol: v, attack: 0.006, filter: 2600, send: 0.6, wobble: true });
        a.tone(out, { freq: midi(n), type: 'triangle', t: t + spb * 3, dur: 0.6, vol: v * 0.3, attack: 0.006, filter: 1800, send: 0.8 });
      }
      if (bar >= 4) {
        if (pos === 0) kick(a, out, t, 0.11);
        if (pos === 4 && bar % 2) kick(a, out, t, 0.06);
        a.burst(out, { t, dur: 0.07, vol: pos % 2 ? 0.007 : 0.011, freq: 6000, q: 0.8, attack: 0.02 });
      }
      // мотив тонет в дожде: растянут вдвое, в реверберации
      if (bar % 8 === 4 || bar % 8 === 5) {
        const i = motifAt(step % 16, 2);
        if (i >= 0) {
          a.tone(out, { freq: midi(MOTIF[i]), t, dur: 2.2, vol: 0.045, attack: 0.02, send: 1, wobble: true });
          a.tone(out, { freq: midi(MOTIF[i] - 12), type: 'triangle', t, dur: 2.5, vol: 0.028, attack: 0.05, filter: 1200, send: 1 });
        }
      }
    },
  },

  // Напряжение: низкий гул, часы (иногда тик раньше — часы спешат), сердце, мотив не в лад
  tension: {
    bpm: 60,
    start: (a, out) => drone(a, out),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      if (step % 2 === 0) {
        const early = step % 22 === 10 ? Math.max(t - 0.09, a.ctx.currentTime + 0.01) : t;
        clockTick(a, out, early, (step / 2) % 2 === 1, 0.6);
      }
      if (step % 16 === 0 && bar >= 2) {
        kick(a, out, t, 0.08);
        kick(a, out, t + 0.28, 0.05);
      }
      if (step % 32 === 16) {
        MOTIF.forEach((n, i) => {
          a.tone(out, { freq: midi(n - 12), t: t + i * 0.55, dur: 1.6, vol: 0.02, send: 1 });
          a.tone(out, { freq: midi(n - 12), t: t + i * 0.55 + 0.03, dur: 1.6, vol: 0.016, detune: 38, send: 1 });
        });
      }
    },
  },

  // «дом_03» — трек Тихона: бочка — поезд, малый — скрип половицы, хэт — часы,
  // бас — гул насыпи, соло — свисток чайника, хук — шёпот «…ходи…» каждые 4 такта
  dom03: {
    bpm: 84,
    start: (a, out) => {
      const bed = rumbleBed(a, out);
      const l = layers(vinyl(a, out, 0.8), bed);
      l.rumble = bed.gain;
      return l;
    },
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const sw = pos % 2 ? spb * 0.14 : 0;
      const k = Math.floor(bar / 2) % 4;
      const ch = NP_CHORDS[k];
      if (pos === 0 && bar % 2 === 0) ch.forEach((n, i) => rhodes(a, out, n, t + i * 0.015, { dur: spb * 15, vol: 0.02 }));
      if (pos === 0) trainBass(a, out, NP_ROOTS[k] + 12, t, spb * 3);
      if (pos === 3 && bar % 2 === 1) trainBass(a, out, NP_ROOTS[k] + 12, t + sw, spb * 2);
      if (bar < 1) return;
      if (pos === 0 || pos === 5 || (pos === 3 && bar % 4 === 3)) trainKick(a, out, t + (pos % 2 ? sw : 0));
      if (pos === 2 || pos === 6) {
        creakVoice(a, out, t, { len: 0.22, vol: 0.45, f0: 650, f1: 820, send: 0.15 });
        a.burst(out, { t, dur: 0.08, vol: 0.04, freq: 1800, q: 0.8, attack: 0.002 });
      }
      clockTick(a, out, t + sw, pos % 2 === 1, pos % 2 ? 0.3 : 0.45);
      if (pos === 7 && bar % 2 === 1) a.burst(out, { t: t + sw, dur: 0.03, vol: 0.07, freq: 3200, q: 2, send: 0.3 });
      if (bar % 8 === 4 && pos === 0) kettleLead(a, out, t, spb);
      if (bar % 4 === 3 && pos === 4) whisperWord(a, out, t, { vol: 0.22, send: 0.6 });
      if (bar % 16 === 12 && pos === 0 && out.layer) {
        const g = out.layer.rumble;
        g.gain.setTargetAtTime(0.13, t, 1.5);
        g.gain.setTargetAtTime(0.03, t + spb * 16, 2);
      }
    },
  },

  // Вера: нежная колыбельная на три четверти — шкатулка и её напев
  vera: {
    bpm: 69,
    start: (a, out) => vinyl(a, out, 0.35),
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 6);
      const pos = step % 6;
      // Gmaj9 — Em9 — Cmaj7 — D6/9, первая нота — бас
      const chords = [[43, 59, 62, 66, 69], [40, 55, 59, 62, 66], [36, 55, 59, 64, 67], [38, 57, 62, 64, 66]];
      const ch = chords[Math.floor(bar / 2) % 4];
      if (pos === 0) {
        a.tone(out, { freq: midi(ch[0]), t, dur: spb * 6, vol: 0.065, attack: 0.05, filter: 400 });
        if (bar % 2 === 0) pad(a, out, ch.slice(1, 4), t, { dur: spb * 13, vol: 0.006, attack: 1.2, filter: 900, type: 'triangle', send: 0.7 });
      }
      const humming = bar % 8 === 2 || bar % 8 === 3;
      const boxTune = bar % 8 === 4 || bar % 8 === 5;
      if (!(humming || boxTune) || pos % 2 === 0) {
        const box = [1, 3, 4, 2, 3, 4][pos];
        musicBox(a, out, ch[box] + 12, t, pos === 0 ? 0.026 : 0.017);
      }
      // «слово» в ритме колыбельной: 2-1-3 / 2-1-3 восьмых
      const onsets = [0, 2, 3, 6, 8, 9];
      const lens = [2, 1, 3, 2, 1, 3];
      const i = onsets.indexOf(step % 12);
      if (i >= 0 && humming) hum(a, out, MOTIF[i] - 12, t, spb * lens[i] * 1.15, 0.05);
      if (i >= 0 && boxTune) musicBox(a, out, MOTIF[i] + 12, t, 0.03);
    },
  },

  // Финал: сначала мотив НП, потом приходит мир П чуть расстроенным; расстройка
  // сходится в ноль — первая чистая гармония, два мягких гудка
  finale: {
    bpm: 66,
    start: (a, out) => {
      const rain = rainPad(a, out, 0);
      const l = layers(vinyl(a, out, 0.5), rain);
      l.rain = rain;
      return l;
    },
    play(a, out, step, t, spb) {
      const bar = Math.floor(step / 8);
      const pos = step % 8;
      const b = bar < 32 ? bar : 24 + ((bar - 32) % 8);
      // C — G/B — Am9 — D6, первая нота — бас
      const chords = [[36, 52, 55, 59, 62], [35, 50, 55, 59, 62], [33, 48, 52, 55, 59], [38, 50, 54, 57, 59]];
      const ch = chords[Math.floor(b / 2) % 4];
      const dt = b < 16 ? 22 : b < 24 ? (22 * (24 - b)) / 8 : 0;
      if (b === 8 && pos === 0 && out.layer) out.layer.rain.setLevel(1, t);
      if (pos === 0 && b % 2 === 0) {
        if (b >= 4) a.tone(out, { freq: midi(ch[0]), t, dur: spb * 16, vol: 0.065, attack: 0.3, filter: 300 });
        ch.slice(1).forEach((n, i) => rhodes(a, out, n, t + i * 0.02, { dur: spb * 15, vol: 0.024 }));
        if (b >= 8) pad(a, out, ch.slice(1), t, { dur: spb * 17, vol: b >= 24 ? 0.007 : 0.005, filter: b >= 24 ? 1800 : 1200, send: 0.9, spread: 6 + dt / 2 });
      }
      if (b >= 8) {
        const pat = [0, 2, 3, 1, 2, 3, 1, 2];
        const n = ch[1 + pat[pos]] + 12;
        a.tone(out, { freq: midi(n), type: 'triangle', t, dur: 0.8, vol: b >= 16 ? 0.018 : 0.013, attack: 0.006, filter: 2400, detune: dt, send: 0.6 });
      }
      if (b >= 16) {
        if (pos === 0 || pos === 5) kick(a, out, t, 0.12);
        if (pos === 2 || pos === 6) snare(a, out, t, 0.032);
        if (b >= 24) hat(a, out, t + (pos % 2 ? spb * 0.12 : 0), pos % 2 ? 0.008 : 0.012);
      }
      if (b % 4 === 0 || b % 4 === 1) {
        const i = motifAt((b % 4) * 8 + pos, 2);
        if (i >= 0) {
          rhodes(a, out, MOTIF[i], t, { dur: 2.2, vol: 0.045, send: 0.3, bright: 2200 });
          if (b >= 8) a.tone(out, { freq: midi(MOTIF[i] + 12), t: t + 0.01, dur: 2.4, vol: 0.018, detune: dt, send: 1, wobble: true });
          if (b >= 24) hum(a, out, MOTIF[i] - 12, t, spb * 3, 0.03);
        }
      }
      if (b >= 24 && b % 8 === 6 && pos === 0) softHorns(a, out, t, spb);
    },
  },
};

// ---------- фоновые шумы ----------

function loopNoise(a, { buffer, type, freq, q = 1, vol, lfo = 0, lfoRate = 0.2, bus = null }) {
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
  s.connect(f).connect(g).connect(bus || a.ambBus);
  let osc = null;
  if (lfo) {
    osc = c.createOscillator();
    osc.frequency.value = lfoRate;
    const lg = c.createGain();
    lg.gain.value = lfo;
    osc.connect(lg).connect(g.gain);
    osc.start();
  }
  s.start(0, Math.random() * 2);
  return {
    gain: g,
    stop() {
      g.gain.setTargetAtTime(0, c.currentTime, 0.6);
      setTimeout(() => {
        s.stop();
        if (osc) osc.stop();
      }, 2500);
    },
  };
}

// Капля в раковину: короткий «плюх» с подъёмом высоты и крошечным всплеском
function waterDrop(a, bus, t, vol = 0.035) {
  const f = 900 + Math.random() * 500;
  a.tone(bus, { freq: f, t, dur: 0.07, vol, attack: 0.002, glide: 0.55, send: 0.45 });
  a.burst(bus, { t: t + 0.005, dur: 0.03, vol: vol * 0.6, freq: 3200, q: 2, attack: 0.001 });
}

// Щелчок реле холодильника
function fridgeClunk(a, t, on) {
  a.tone(a.ambBus, { freq: on ? 62 : 55, t, dur: 0.15, vol: 0.08, attack: 0.003 });
  a.burst(a.ambBus, { t, dur: 0.12, vol: 0.14, type: 'lowpass', freq: 260, buffer: a.brown, attack: 0.002 });
  a.burst(a.ambBus, { t: t + 0.05, dur: 0.02, vol: 0.02, freq: 2500, q: 4, attack: 0.001 });
}

const AMBIENCE = {
  // Морось (мир «Не приходи»): тише дождя — редкие капли по стеклу и мягкая пелена
  drizzle: (a) => {
    const wash = loopNoise(a, { buffer: a.noise, type: 'bandpass', freq: 1500, q: 0.5, vol: 0.022, lfo: 0.008, lfoRate: 0.09 });
    const low = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 420, vol: 0.045, lfo: 0.015, lfoRate: 0.05 });
    const timer = setInterval(() => {
      if (!live(a) || Math.random() < 0.45) return;
      glassDrop(a, a.ambBus, a.ctx.currentTime + 0.05 + Math.random() * 0.2, 0.018 + Math.random() * 0.025);
    }, 420);
    return { stop() { wash.stop(); low.stop(); clearInterval(timer); } };
  },
  // Кран, обмотанный изолентой: капает раз в четыре секунды — «готовый хай-хэт»
  tap: (a) => {
    const timer = setInterval(() => {
      if (!live(a)) return;
      waterDrop(a, a.ambBus, a.ctx.currentTime + 0.05 + Math.random() * 0.12, 0.035);
    }, 4000);
    return { stop() { clearInterval(timer); } };
  },
  // Тишина комнаты: низкий гул дома и лёгкий «воздух»
  room: (a) => {
    const base = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 380, vol: 0.11, lfo: 0.015, lfoRate: 0.05 });
    const air = loopNoise(a, { buffer: a.noise, type: 'bandpass', freq: 900, q: 0.5, vol: 0.004 });
    return { stop() { base.stop(); air.stop(); } };
  },
  // Дождь по стеклу: пелена, низкий шум, капли и капель с карниза
  rain: (a) => {
    const wash = loopNoise(a, { buffer: a.noise, type: 'bandpass', freq: 1800, q: 0.5, vol: 0.06, lfo: 0.015, lfoRate: 0.11 });
    const low = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 500, vol: 0.12, lfo: 0.03, lfoRate: 0.07 });
    const hiss = loopNoise(a, { buffer: a.noise, type: 'highpass', freq: 6000, vol: 0.01 });
    let drip = 0;
    const gutter = 900 + Math.random() * 300;
    const timer = setInterval(() => {
      if (!live(a)) return;
      const t = a.ctx.currentTime + 0.05;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) glassDrop(a, a.ambBus, t + Math.random() * 0.15, 0.03 + Math.random() * 0.04);
      drip += 0.15;
      if (drip > 0.9 + Math.random() * 0.6) {
        drip = 0;
        a.tone(a.ambBus, { freq: gutter * (0.97 + Math.random() * 0.06), t, dur: 0.07, vol: 0.02, attack: 0.002, glide: 1.25, send: 0.5 });
      }
    }, 150);
    return { stop() { wash.stop(); low.stop(); hiss.stop(); clearInterval(timer); } };
  },
  // Холодильник: сетевой гул с обертонами, иногда компрессор щёлкает и замолкает
  fridge: (a) => {
    const c = a.ctx;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.03, c.currentTime, 1);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    f.connect(g).connect(a.ambBus);
    const oscs = [[50, 'sine', 1], [100.4, 'sine', 0.5], [150.2, 'triangle', 0.18]].map(([fr, type, v]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      const og = c.createGain();
      og.gain.value = v;
      o.connect(og).connect(f);
      o.start();
      return o;
    });
    const motor = loopNoise(a, { buffer: a.brown, type: 'lowpass', freq: 180, vol: 0.045, lfo: 0.008, lfoRate: 0.07 });
    let on = true;
    let left = 40 + Math.random() * 30;
    const timer = setInterval(() => {
      if (!live(a)) return;
      left -= 1;
      if (left > 0) return;
      const t = c.currentTime + 0.05;
      on = !on;
      left = on ? 45 + Math.random() * 40 : 12 + Math.random() * 15;
      fridgeClunk(a, t, on);
      g.gain.setTargetAtTime(on ? 0.03 : 0.004, t, on ? 0.4 : 0.8);
      motor.gain.gain.setTargetAtTime(on ? 0.045 : 0.015, t, 0.8);
    }, 1000);
    return {
      stop() {
        clearInterval(timer);
        g.gain.setTargetAtTime(0, c.currentTime, 0.5);
        motor.stop();
        setTimeout(() => oscs.forEach((o) => o.stop()), 2000);
      },
    };
  },
  // Чайник по кругу: греется (гул и пузырьки) → свистит → щелчок выключателя → остывает
  kettle: (a) => {
    const c = a.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, c.currentTime, 1);
    out.connect(a.ambBus);
    const loop = (buffer) => {
      const s = c.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.start(0, Math.random() * 2);
      return s;
    };
    const filt = (type, freq, q) => {
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };
    const gain = () => {
      const g = c.createGain();
      g.gain.value = 0;
      return g;
    };
    // гул нагрева
    const rs = loop(a.brown);
    const rg = gain();
    rs.connect(filt('lowpass', 170, 0.7)).connect(rg).connect(out);
    // кипение
    const bs = loop(a.noise);
    const bg = gain();
    bs.connect(filt('bandpass', 1400, 0.6)).connect(bg).connect(out);
    // свисток: тон с вибрато и узкое «дыхание» на той же частоте
    const w = c.createOscillator();
    w.frequency.value = 1650;
    const vib = c.createOscillator();
    vib.frequency.value = 6;
    const vg = c.createGain();
    vg.gain.value = 12;
    vib.connect(vg).connect(w.detune);
    const wg = gain();
    w.connect(wg).connect(out);
    const ws = loop(a.noise);
    const wf = filt('bandpass', 1650, 25);
    const wg2 = gain();
    ws.connect(wf).connect(wg2).connect(out);
    w.start();
    vib.start();
    const cycle = 70;
    const t0 = c.currentTime - 8;
    let prev = 0;
    const timer = setInterval(() => {
      if (!live(a)) return;
      const now = c.currentTime;
      const x = (now - t0) % cycle;
      const heat = x < 30 ? x / 30 : x < 46 ? 1 : Math.max(0, 1 - (x - 46) / 6);
      rg.gain.setTargetAtTime(0.02 + 0.09 * heat, now, 0.8);
      bg.gain.setTargetAtTime(x > 18 && x < 47 ? 0.005 + 0.012 * Math.min(1, (x - 18) / 15) : 0, now, 0.8);
      const wOn = x > 34 && x < 46;
      const wl = wOn ? Math.min(1, (x - 34) / 5) : 0;
      wg.gain.setTargetAtTime(0.01 * wl, now, wOn ? 0.6 : 0.2);
      wg2.gain.setTargetAtTime(0.25 * wl, now, wOn ? 0.6 : 0.2);
      w.frequency.setTargetAtTime(1650 + 450 * wl, now, 0.8);
      wf.frequency.setTargetAtTime(1650 + 450 * wl, now, 0.8);
      if (heat > 0.3 && x < 47) {
        const n = Math.floor(heat * 3);
        for (let i = 0; i < n; i++) a.tone(out, { freq: 180 + Math.random() * 400, t: now + 0.05 + Math.random() * 0.45, dur: 0.04, vol: 0.012 * heat, attack: 0.003, glide: 0.7 });
      }
      if (prev < 46 && x >= 46) {
        a.burst(out, { t: now + 0.05, dur: 0.02, vol: 0.12, freq: 2500, q: 3, attack: 0.001 });
        a.tone(out, { freq: 300, t: now + 0.05, dur: 0.04, vol: 0.03, attack: 0.001 });
      }
      prev = x;
    }, 500);
    return {
      stop() {
        clearInterval(timer);
        out.gain.setTargetAtTime(0, c.currentTime, 0.5);
        setTimeout(() => [rs, bs, ws, w, vib].forEach((n) => n.stop()), 2500);
      },
    };
  },
  // Кухонные часы: тик-так; иногда тик приходит раньше — часы спешат на 3 минуты
  clock: (a) => {
    let n = 0;
    let nextOff = 9 + Math.floor(Math.random() * 10);
    const timer = setInterval(() => {
      if (!live(a)) return;
      const t = a.ctx.currentTime + 0.05;
      n++;
      let off = 0;
      if (n >= nextOff) {
        off = -0.11;
        nextOff = n + 12 + Math.floor(Math.random() * 14);
      }
      clockTick(a, a.ambBus, t + 0.12 + off, n % 2 === 0, 1);
    }, 1000);
    return { stop() { clearInterval(timer); } };
  },
};

// ---------- эффекты ----------

// Гудок электрички: два тона вместе, подъезд высоты, «провисание» в конце, эхо от домов
function hornBlast(a, t, len, vol = 0.055) {
  const c = a.ctx;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1500;
  f.Q.value = 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.06);
  g.gain.setValueAtTime(vol, t + len);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.25);
  const end = t + len + 0.35;
  [311.1, 392].forEach((fr) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(fr * 0.96, t);
    o.frequency.exponentialRampToValueAtTime(fr, t + 0.08);
    o.frequency.setValueAtTime(fr, t + len);
    o.frequency.exponentialRampToValueAtTime(fr * 0.985, t + len + 0.25);
    o.connect(f);
    o.start(t);
    o.stop(end);
  });
  f.connect(g).connect(a.sfxBus);
  const sg = c.createGain();
  sg.gain.value = 0.8;
  g.connect(sg).connect(a.revSfx);
  // эхо от стен домов вдоль насыпи
  const d = c.createDelay(1);
  d.delayTime.value = 0.28;
  const dg = c.createGain();
  dg.gain.value = 0.22;
  const df = c.createBiquadFilter();
  df.type = 'lowpass';
  df.frequency.value = 900;
  g.connect(d).connect(df).connect(dg).connect(a.sfxBus);
}

const SFX = {
  // Скрип половицы: трение дерева и глухой удар доски под ногой
  creak(a, t) {
    creakVoice(a, a.sfxBus, t, { len: 1.15, vol: 1, f0: 420, f1: 700, send: 0.5 });
    a.tone(a.sfxBus, { freq: 70, t, dur: 0.25, vol: 0.3, attack: 0.01 });
    a.burst(a.sfxBus, { t, dur: 0.12, vol: 0.25, type: 'lowpass', freq: 400, q: 0.7 });
  },
  // Шёпот: вдох и «…ходи…»
  whisper(a, t) {
    a.burst(a.sfxBus, { t, dur: 0.35, vol: 0.03, freq: 1200, q: 0.6, attack: 0.15, send: 0.4 });
    const w = a.whispers && a.whispers.length ? a.whispers[Math.floor(Math.random() * a.whispers.length)] : null;
    if (!w) {
      whisperWord(a, a.sfxBus, t + 0.3, { vol: 0.45, send: 0.9 });
      return;
    }
    // живая запись «из-за двери»: без низа и верха, тихо, с большим эхом, чуть медленнее и ниже
    const c = a.ctx;
    const src = c.createBufferSource();
    src.buffer = w.buf;
    src.playbackRate.value = 0.94;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const g = c.createGain();
    const level = 0.32 / w.peak;
    const st = t + 0.3;
    const len = (w.to - w.from) / 0.94;
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(level, st + 0.06);
    g.gain.setValueAtTime(level, st + Math.max(0.1, len - 0.25));
    g.gain.linearRampToValueAtTime(0, st + len);
    src.connect(hp).connect(lp).connect(g).connect(a.sfxBus);
    const sg = c.createGain();
    sg.gain.value = 0.9;
    g.connect(sg).connect(a.rev(a.sfxBus));
    src.start(st, w.from, w.to - w.from);
    src.stop(st + len + 0.1);
  },
  // Поезд: приближается слева, проходит, уходит вправо — гул, мотор с доплером,
  // стук колёс парами, дрожь оконного стекла
  train(a, t, { dur = 5 } = {}) {
    const c = a.ctx;
    const mid = t + dur * 0.5;
    const end = t + dur;
    const bus = c.createGain();
    if (c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.setValueAtTime(-0.6, t);
      pan.pan.linearRampToValueAtTime(0.6, end);
      bus.connect(pan).connect(a.sfxBus);
    } else bus.connect(a.sfxBus);
    // гул состава
    const s = c.createBufferSource();
    s.buffer = a.brown;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(150, t);
    f.frequency.linearRampToValueAtTime(420, mid);
    f.frequency.linearRampToValueAtTime(180, end);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.85, t + dur * 0.65);
    g.gain.linearRampToValueAtTime(0, end);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random());
    s.stop(end + 0.1);
    // шорох воздуха и колёс
    const n = c.createBufferSource();
    n.buffer = a.noise;
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 900;
    nf.Q.value = 0.7;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.06, mid);
    ng.gain.linearRampToValueAtTime(0, end);
    n.connect(nf).connect(ng).connect(bus);
    n.start(t, Math.random());
    n.stop(end + 0.1);
    // мотор: высота падает, когда поезд проходит мимо (доплер)
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(112, t);
    o.frequency.setValueAtTime(110, mid - 0.3);
    o.frequency.linearRampToValueAtTime(94, mid + 0.4);
    const of = c.createBiquadFilter();
    of.type = 'lowpass';
    of.frequency.value = 380;
    const og = c.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.045, mid);
    og.gain.linearRampToValueAtTime(0, end);
    o.connect(of).connect(og).connect(bus);
    o.start(t);
    o.stop(end + 0.1);
    // стук колёс: «та-так» — две оси тележки на стыке
    for (let x = 0.3; x < dur - 0.3; x += 0.55) {
      const p = Math.sin((Math.PI * x) / dur) ** 1.5;
      [0, 0.09].forEach((off) => {
        a.burst(bus, { t: t + x + off, dur: 0.05, vol: 0.25 * p, freq: 1400, q: 1.5, attack: 0.001 });
        a.tone(bus, { freq: 180, t: t + x + off, dur: 0.06, vol: 0.1 * p, attack: 0.001 });
      });
    }
    // дрожит стекло в раме
    for (let x = dur * 0.25; x < dur * 0.8; x += 0.04 + Math.random() * 0.05) {
      const p = Math.sin((Math.PI * x) / dur);
      a.burst(a.sfxBus, { t: t + x, dur: 0.015, vol: 0.05 * p * p, freq: 3500 + Math.random() * 2000, q: 6, attack: 0.001 });
    }
  },
  // Один гудок (глава 4: первый и второй звучат порознь)
  horn(a, t) {
    hornBlast(a, t, 0.8);
  },
  // Два коротких гудка отцовской электрички — «я здесь»
  horns(a, t) {
    hornBlast(a, t, 0.36);
    hornBlast(a, t + 0.62, 0.36);
  },
  // Звон чашек: негармонические обертоны фарфора
  clink(a, t) {
    [0, 0.12, 0.3, 0.45].forEach((off, i) => {
      const fr = 2100 + i * 330 + Math.random() * 80;
      a.tone(a.sfxBus, { freq: fr, t: t + off, dur: 0.45, vol: 0.045, attack: 0.002 });
      a.tone(a.sfxBus, { freq: fr * 2.76, t: t + off, dur: 0.15, vol: 0.012, attack: 0.001 });
    });
  },
  // Магнитная буква: скрежет по дверце и пластмассовый «клац» о металл
  magnet(a, t) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 4;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.linearRampToValueAtTime(1700, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.05);
    g.gain.linearRampToValueAtTime(0.25, t + 0.24);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t, Math.random());
    s.stop(t + 0.32);
    SFX.clack(a, t + 0.3);
  },
  // Сухой щелчок пластмассы о металл, с отзвуком пустой кухни
  clack(a, t, opts = {}) {
    const vol = typeof opts === 'number' ? opts : opts.vol ?? 1;
    a.burst(a.sfxBus, { t, dur: 0.035, vol: 0.9 * vol, freq: 3200, q: 2, send: 0.6, attack: 0.001 });
    a.tone(a.sfxBus, { freq: 1850, t, dur: 0.05, vol: 0.22 * vol, attack: 0.001, send: 0.5 });
    a.tone(a.sfxBus, { freq: 190, t, dur: 0.08, vol: 0.3 * vol, attack: 0.001 });
  },
  // Буква срывается с дверцы и скачет по полу
  fall(a, t) {
    SFX.clack(a, t, 0.7);
    [0.42, 0.66, 0.82, 0.93, 1.0].forEach((off, i) => {
      const v = 0.9 - i * 0.16;
      a.burst(a.sfxBus, { t: t + off, dur: 0.03, vol: 0.8 * v, freq: 2300, q: 2, send: 0.5, attack: 0.001 });
      a.tone(a.sfxBus, { freq: 140, t: t + off, dur: 0.06, vol: 0.35 * v, attack: 0.001 });
    });
  },
  pluck(a, t) {
    a.tone(a.sfxBus, { freq: midi(79), t, dur: 0.5, vol: 0.12, attack: 0.003, send: 0.3 });
    a.burst(a.sfxBus, { t, dur: 0.04, vol: 0.3, freq: 1400, q: 3 });
  },
  thud(a, t) {
    a.tone(a.sfxBus, { freq: 120, t, dur: 0.18, vol: 0.18, attack: 0.003, glide: 1.3 });
    a.burst(a.sfxBus, { t, dur: 0.1, vol: 0.12, type: 'lowpass', freq: 350 });
  },
  success(a, t) {
    [76, 79, 83, 88].forEach((n, i) => a.tone(a.sfxBus, { freq: midi(n), t: t + i * 0.12, dur: 1.2, vol: 0.07, send: 0.6 }));
  },
  // Холод (закон 6): давление в ушах растёт, звон, два мотива в разлад дают биения
  cold(a, t, { dur = 4 } = {}) {
    const c = a.ctx;
    // давление: инфранизкий тон ползёт вверх, низкий шум набухает
    const o = c.createOscillator();
    o.frequency.setValueAtTime(36, t);
    o.frequency.linearRampToValueAtTime(62, t + dur * 0.75);
    const og = c.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.15, t + dur * 0.6);
    og.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(og).connect(a.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
    const s = c.createBufferSource();
    s.buffer = a.brown;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(120, t);
    f.frequency.linearRampToValueAtTime(320, t + dur * 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
    // холодный ветерок
    a.burst(a.sfxBus, { t, dur: dur * 0.8, vol: 0.06, freq: 900, q: 8, attack: dur * 0.3 });
    // звон в ушах: два близких тона бьются друг о друга
    [4186, 4192].forEach((fr) => a.tone(a.sfxBus, { freq: fr, t, dur, vol: 0.01, attack: dur * 0.5, release: dur * 0.5, send: 0.5 }));
    // обе аранжировки мотива сразу, чуть расстроенно — «гул»
    MOTIF.slice(0, 3).forEach((n, i) => {
      a.tone(a.sfxBus, { freq: midi(n - 12), t: t + 0.4 + i * 0.5, dur: 1.4, vol: 0.02, attack: 0.1, send: 0.8 });
      a.tone(a.sfxBus, { freq: midi(n - 12), type: 'triangle', t: t + 0.4 + i * 0.5, dur: 1.4, vol: 0.018, attack: 0.1, detune: 24, filter: 1500, send: 0.8 });
    });
    // остальные звуки глохнут, как при заложенных ушах
    const v = a.volumes.sfx * 0.6;
    a.ambBus.gain.setTargetAtTime(v * 0.3, t + 0.3, 0.6);
    a.ambBus.gain.setTargetAtTime(v, t + dur, 0.8);
  },
  // Акцент смены сцены
  sting(a, t) {
    [40, 47, 52].forEach((n) => a.tone(a.sfxBus, { freq: midi(n), type: 'triangle', t, dur: 3, vol: 0.05, attack: 0.03, release: 3, filter: 1600, send: 0.8 }));
    a.tone(a.sfxBus, { freq: midi(28), t, dur: 2.5, vol: 0.08, attack: 0.02 });
  },
  // Шаги по паркету: пятка — носок, иногда планка скрипнет
  steps(a, t, { n = 4 } = {}) {
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.42 + Math.random() * 0.04;
      const v = 0.85 + Math.random() * 0.3;
      a.burst(a.sfxBus, { t: tt, dur: 0.08, vol: 0.4 * v, type: 'lowpass', freq: 350 + (i % 2) * 50, q: 0.8, send: 0.15 });
      a.tone(a.sfxBus, { freq: 85, t: tt, dur: 0.09, vol: 0.12 * v, attack: 0.002 });
      a.burst(a.sfxBus, { t: tt + 0.07, dur: 0.05, vol: 0.1 * v, freq: 900, q: 1 });
      a.burst(a.sfxBus, { t: tt + 0.075, dur: 0.02, vol: 0.04 * v, freq: 2600, q: 3, attack: 0.001 });
      if (Math.random() < 0.3) creakVoice(a, a.sfxBus, tt + 0.05, { len: 0.25, vol: 0.25, f0: 900, f1: 1100, send: 0.2 });
    }
  },
  // Взял предмет: два восходящих тёплых тона — «в кармане»
  pickup(a, t) {
    a.tone(a.sfxBus, { freq: midi(76), t, dur: 0.5, vol: 0.05, attack: 0.004, send: 0.45 });
    a.tone(a.sfxBus, { freq: midi(83), t: t + 0.09, dur: 0.7, vol: 0.045, attack: 0.004, send: 0.5 });
  },
  // Осмотр предмета: мягкий короткий звук
  look(a, t) {
    a.tone(a.sfxBus, { freq: midi(88), t, dur: 0.6, vol: 0.035, attack: 0.005, send: 0.5 });
    a.tone(a.sfxBus, { freq: midi(83), t: t + 0.07, dur: 0.6, vol: 0.025, attack: 0.005, send: 0.5 });
  },
  ui(a, t) {
    a.tone(a.sfxBus, { freq: 1500, t, dur: 0.05, vol: 0.03, attack: 0.003 });
  },
  // Шелест бумаги: мелкие хрусты и последний «взмах» листа
  page(a, t) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(2500, t);
    f.frequency.linearRampToValueAtTime(4000, t + 0.2);
    f.frequency.linearRampToValueAtTime(1800, t + 0.4);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    let tt = t;
    for (let i = 0; i < 10; i++) {
      tt += 0.025 + Math.random() * 0.02;
      g.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.12, tt);
    }
    g.gain.linearRampToValueAtTime(0, tt + 0.08);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t, Math.random() * 2);
    s.stop(tt + 0.1);
    for (let i = 0; i < 5; i++) a.burst(a.sfxBus, { t: t + Math.random() * 0.35, dur: 0.01, vol: 0.05, type: 'highpass', freq: 4500, attack: 0.001 });
    a.burst(a.sfxBus, { t: tt, dur: 0.14, vol: 0.1, type: 'lowpass', freq: 1200, attack: 0.04 });
  },
  // Паяльник по бумаге / тлеющая бумага: шипение, мелкий треск
  burn(a, t, { dur = 2.5 } = {}) {
    const c = a.ctx;
    const s = c.createBufferSource();
    s.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 4500;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.05);
    for (let x = 0.15; x < dur - 0.2; x += 0.1) g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.07, t + x);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f).connect(g).connect(a.sfxBus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
    a.burst(a.sfxBus, { t, dur, vol: 0.03, freq: 900, q: 0.8, attack: 0.2 });
    for (let x = 0.1; x < dur - 0.1; x += 0.03 + Math.random() * 0.1) {
      a.burst(a.sfxBus, { t: t + x, dur: 0.006, vol: 0.08 + Math.random() * 0.1, freq: 2000 + Math.random() * 4000, q: 3, attack: 0.001 });
    }
  },
  // Хлопок двери: поток воздуха, удар, щелчок замка, дрожь рамы, эхо коридора
  door(a, t) {
    a.burst(a.sfxBus, { t, dur: 0.2, vol: 0.08, type: 'lowpass', freq: 600, attack: 0.15 });
    const hit = t + 0.18;
    const c = a.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(70, hit);
    o.frequency.exponentialRampToValueAtTime(45, hit + 0.3);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, hit);
    og.gain.exponentialRampToValueAtTime(0.5, hit + 0.005);
    og.gain.exponentialRampToValueAtTime(0.0001, hit + 0.35);
    o.connect(og).connect(a.sfxBus);
    o.start(hit);
    o.stop(hit + 0.4);
    a.burst(a.sfxBus, { t: hit, dur: 0.25, vol: 0.5, type: 'lowpass', freq: 500, buffer: a.brown, send: 0.5, attack: 0.001 });
    a.burst(a.sfxBus, { t: hit, dur: 0.05, vol: 0.25, freq: 1800, q: 1, send: 0.4, attack: 0.001 });
    a.burst(a.sfxBus, { t: hit + 0.03, dur: 0.02, vol: 0.3, freq: 3500, q: 4, attack: 0.001 });
    a.tone(a.sfxBus, { freq: 2600, t: hit + 0.03, dur: 0.03, vol: 0.04, attack: 0.001 });
    [0.08, 0.13, 0.17].forEach((off, i) => a.burst(a.sfxBus, { t: hit + off, dur: 0.02, vol: 0.06 / (i + 1), freq: 3000, q: 5, attack: 0.001 }));
  },
  // ---------- жизнь локаций: редкие случайные звуки ----------
  // Батарея: вода в трубах, серия глухих металлических ударов, затухает
  pipes(a, t) {
    const hits = [0, 0.32, 0.58, 0.8, 0.97, 1.1].slice(0, 3 + Math.floor(Math.random() * 4));
    hits.forEach((off, i) => {
      const v = 1 - i * 0.14;
      a.burst(a.ambBus, { t: t + off, dur: 0.14, vol: 0.22 * v, type: 'lowpass', freq: 320, buffer: a.brown, send: 0.35, attack: 0.001 });
      a.tone(a.ambBus, { freq: 180 + Math.random() * 30, type: 'triangle', t: t + off, dur: 0.18, vol: 0.05 * v, attack: 0.001, send: 0.3 });
      a.burst(a.ambBus, { t: t + off, dur: 0.12, vol: 0.035 * v, freq: 1300 + Math.random() * 300, q: 9, attack: 0.001, send: 0.4 });
    });
  },
  // Машина по мокрой улице: шипение шин нарастает и уходит
  car(a, t) {
    const c = a.ctx;
    const src = c.createBufferSource();
    src.buffer = a.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(350, t);
    f.frequency.linearRampToValueAtTime(1400, t + 1.6);
    f.frequency.linearRampToValueAtTime(420, t + 3.6);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    src.connect(f).connect(g).connect(a.ambBus);
    src.start(t, Math.random() * 2);
    src.stop(t + 4);
    const hum = c.createOscillator();
    hum.frequency.setValueAtTime(62, t);
    hum.frequency.linearRampToValueAtTime(48, t + 3.6);
    const hg = c.createGain();
    hg.gain.setValueAtTime(0.0001, t);
    hg.gain.exponentialRampToValueAtTime(0.03, t + 1.6);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 3.7);
    hum.connect(hg).connect(a.ambBus);
    hum.start(t);
    hum.stop(t + 3.9);
  },
  // Одна капля из крана
  drip(a, t) {
    waterDrop(a, a.ambBus, t, 0.04);
  },
  // Голубь на карнизе: «гуу-гу-гуу», глухо через стекло
  pigeon(a, t) {
    [[380, 0, 0.42], [330, 0.5, 0.2], [400, 0.78, 0.55]].forEach(([fr, off, dur]) => {
      a.tone(a.ambBus, { freq: fr, t: t + off, dur, vol: 0.035, attack: 0.05, glide: 1.12, filter: 800, send: 0.3 });
      a.tone(a.ambBus, { freq: fr * 2, t: t + off, dur: dur * 0.8, vol: 0.006, attack: 0.05, filter: 1200 });
    });
  },
  // Утренние птицы: короткие трели двумя фразами
  birds(a, t) {
    for (let ph = 0; ph < 2; ph++) {
      const base = 2800 + Math.random() * 1400;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const tt = t + ph * (0.9 + Math.random() * 0.6) + i * (0.07 + Math.random() * 0.06);
        a.tone(a.ambBus, { freq: base * (0.9 + Math.random() * 0.25), t: tt, dur: 0.06, vol: 0.012, attack: 0.004, glide: 0.62, send: 0.5 });
      }
    }
  },
  // Соседи за стеной: неразборчивые голоса, будто телевизор через бетон
  neighbors(a, t) {
    let tt = t;
    for (let i = 0; i < 16; i++) {
      const d = 0.1 + Math.random() * 0.18;
      a.burst(a.ambBus, { t: tt, dur: d, vol: 0.05 + Math.random() * 0.04, type: 'bandpass', freq: 260 + Math.random() * 260, q: 3, buffer: a.brown, attack: 0.03, send: 0.25 });
      tt += d + (Math.random() < 0.2 ? 0.35 : 0.04);
    }
  },
  // Музыка из Вериных наушников: тонкий бит и мелодия, еле слышно
  leak(a, t) {
    const spb = 0.29;
    for (let i = 0; i < 14; i++) {
      a.burst(a.ambBus, { t: t + i * spb, dur: 0.02, vol: 0.012, type: 'highpass', freq: 6500, attack: 0.001 });
      if (i % 2 === 0) a.burst(a.ambBus, { t: t + i * spb, dur: 0.05, vol: 0.02, freq: 1800, q: 2, attack: 0.002 });
      if (i % 4 === 1) a.tone(a.ambBus, { freq: midi([79, 83, 81, 76][(i >> 2) % 4]), type: 'square', t: t + i * spb, dur: 0.25, vol: 0.003, filter: 2600 });
    }
  },
  // Паяльник: жало касается флюса — треск и шипение
  crackle(a, t) {
    a.burst(a.ambBus, { t, dur: 0.7, vol: 0.012, type: 'highpass', freq: 5000, attack: 0.05 });
    for (let i = 0; i < 9; i++) a.burst(a.ambBus, { t: t + Math.random() * 0.6, dur: 0.012, vol: 0.03 + Math.random() * 0.03, type: 'highpass', freq: 3500, attack: 0.001 });
  },
  // Старый приёмник: сам собой ловит волну — шум и свист настройки
  static(a, t) {
    a.burst(a.ambBus, { t, dur: 0.9, vol: 0.022, freq: 1600, q: 0.6, attack: 0.08 });
    a.tone(a.ambBus, { freq: 1900, t: t + 0.15, dur: 0.5, vol: 0.006, glide: 1.6, attack: 0.05 });
  },
  // Лампа гудит и трещит на скачке напряжения
  buzz(a, t) {
    a.tone(a.ambBus, { freq: 100, type: 'sawtooth', t, dur: 1.1, vol: 0.012, attack: 0.02, filter: 900 });
    a.tone(a.ambBus, { freq: 200, type: 'square', t, dur: 0.9, vol: 0.004, attack: 0.02, filter: 1400 });
    [0, 0.16, 0.31, 0.72].forEach((off) => a.burst(a.ambBus, { t: t + off, dur: 0.03, vol: 0.05, type: 'highpass', freq: 3000, attack: 0.001 }));
  },
  // Бабочка бьётся о плафон: мелкие сухие касания
  moth(a, t) {
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) a.burst(a.ambBus, { t: t + i * (0.05 + Math.random() * 0.12), dur: 0.015, vol: 0.02, freq: 2400, q: 2, attack: 0.001 });
  },
  // Сообщение на телефоне: две мягкие ноты из «слова» (ми — си)
  ping(a, t) {
    [88, 95].forEach((n, i) => {
      a.tone(a.sfxBus, { freq: midi(n), t: t + i * 0.11, dur: 0.5, vol: 0.05, attack: 0.004, send: 0.2 });
      a.tone(a.sfxBus, { freq: midi(n + 12), t: t + i * 0.11, dur: 0.15, vol: 0.01, attack: 0.003 });
    });
  },
};

export const audio = new Audio();
