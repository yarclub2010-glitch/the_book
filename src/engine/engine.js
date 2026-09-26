// Движок новеллы: свободное исследование мест, живой мир, сценки, загадки, сохранения.
//
// Игрок сам решает, куда идти и что рассматривать. Камера движется только по его щелчку.
// Сюжет открывается находками: флажки состояния → правила главы запускают сценки.

import { audio } from './audio.js';
import { Stage, titleBackdrop } from './stage.js';
import { scenes } from '../scenes/index.js';
import chapter1 from '../../story/chapters/chapter1.js';

const CHAPTERS = { [chapter1.id]: chapter1 };
const FIRST = chapter1.id;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rand = ([a, b]) => a + Math.random() * (b - a);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- хранилище (может быть недоступно — тогда просто не сохраняем) ----------
const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(`thebook:${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`thebook:${key}`, JSON.stringify(value));
    } catch {
      // без сохранения
    }
  },
};

const DEFAULTS = { music: 0.7, sfx: 0.8, textSpeed: 45, autoDelay: 1.6, captions: true, motion: true };
const TIME_NAMES = { night: 'ночь', morning: 'утро' };

export class Game {
  constructor() {
    this.game = $('#game');
    this.stage = new Stage($('#view'), $('#fader'), this.game);
    this.settings = { ...DEFAULTS, ...store.get('settings', {}) };
    this.log = [];
    this.token = null;
    this.mode = null; // null — меню; 'explore' — исследование; 'beat' — сценка; 'end' — конец главы
    this.state = null;
    this.zoomed = null;
    this.puzzle = null;
    this.advance = null;
    this.auto = false;
    this.skip = false;
    this.skipHeld = false;
    this.applySettings();
    this.bind();
    titleBackdrop($('#title .backdrop'));
    this.makeGrain();
    setInterval(() => this.tick(), 1000);
    this.showTitle();
  }

  // ---------- настройки ----------

  applySettings() {
    const s = this.settings;
    audio.setVolumes({ music: s.music, sfx: s.sfx });
    this.game.classList.toggle('no-motion', !s.motion);
    $('#set-music').value = s.music;
    $('#set-sfx').value = s.sfx;
    $('#set-speed').value = s.textSpeed;
    $('#set-auto').value = s.autoDelay;
    $('#set-captions').checked = s.captions;
    $('#set-motion').checked = s.motion;
  }

  saveSettings() {
    store.set('settings', this.settings);
    this.applySettings();
  }

  // Плёночное зерно: шум, нарисованный один раз
  makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 38;
    }
    ctx.putImageData(img, 0, 0);
    this.game.style.setProperty('--grain', `url(${c.toDataURL()})`);
  }

  // ---------- ввод ----------

  bind() {
    const unlock = () => {
      const first = !audio.ready;
      audio.unlock();
      if (first && this.game.classList.contains('at-title')) audio.music('title', { fade: 3 });
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    const stageEl = $('#stage');
    stageEl.addEventListener('click', (e) => {
      if (e.target.closest('button, input, label, .panel, .quick, .banner, .tray, .screen, .nav')) return;
      if (this.game.classList.contains('ui-hidden')) {
        this.game.classList.remove('ui-hidden');
        return;
      }
      const hs = e.target.closest('.hs.active');
      if (hs) {
        this.onHotspot(hs, e);
        return;
      }
      if (this.mode === 'explore' && this.zoomed) {
        this.zoomOut();
        return;
      }
      this.next();
    });
    stageEl.addEventListener('contextmenu', (e) => {
      if (this.mode === 'explore' && this.zoomed) {
        e.preventDefault();
        this.zoomOut();
      }
    });
    stageEl.addEventListener('pointermove', (e) => {
      const hs = e.target.closest && e.target.closest('.hs.active');
      const label = $('#hs-label');
      if (hs && hs.dataset.label) {
        const r = stageEl.getBoundingClientRect();
        label.textContent = hs.dataset.label;
        label.style.left = `${e.clientX - r.left}px`;
        label.style.top = `${e.clientY - r.top}px`;
        label.classList.add('on');
      } else label.classList.remove('on');
    });
    stageEl.addEventListener('pointerleave', () => $('#hs-label').classList.remove('on'));
    stageEl.addEventListener('wheel', (e) => {
      if (this.panelOpen() || !this.mode) return;
      if (e.deltaY > 0 && this.mode === 'explore' && this.zoomed) this.zoomOut();
      else if (e.deltaY < 0 && !this.zoomed) this.openPanel('log');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.panelOpen()) this.closePanels();
        else if (this.mode === 'explore' && this.zoomed) this.zoomOut();
        else if (this.mode === 'explore' || this.mode === 'beat') this.openPanel('pause');
        return;
      }
      if (this.panelOpen() || this.game.classList.contains('at-title')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'Control') {
        this.skipHeld = true;
        this.updateModes();
        this.next();
      } else if (e.key === 'a' || e.key === 'ф') {
        this.toggleAuto();
      } else if (e.key === 'h' || e.key === 'р') {
        this.game.classList.toggle('ui-hidden');
      } else if (e.key === 'l' || e.key === 'д') {
        this.openPanel('log');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control') {
        this.skipHeld = false;
        this.updateModes();
      }
    });

    // меню
    $('#btn-new').addEventListener('click', () => this.startChapter(FIRST));
    $('#btn-continue').addEventListener('click', () => this.load(store.get('auto')));
    $('#btn-load-title').addEventListener('click', () => this.openPanel('saves', 'load'));
    $('#btn-settings-title').addEventListener('click', () => this.openPanel('settings'));
    $('#btn-about').addEventListener('click', () => this.openPanel('about'));

    // быстрое меню
    $('#q-log').addEventListener('click', () => this.openPanel('log'));
    $('#q-auto').addEventListener('click', () => this.toggleAuto());
    $('#q-skip').addEventListener('click', () => {
      this.skip = !this.skip;
      this.updateModes();
      this.next();
    });
    $('#q-save').addEventListener('click', () => this.openPanel('saves', 'save'));
    $('#q-load').addEventListener('click', () => this.openPanel('saves', 'load'));
    $('#q-settings').addEventListener('click', () => this.openPanel('settings'));
    $('#q-menu').addEventListener('click', () => this.openPanel('pause'));
    $('#back').addEventListener('click', () => this.zoomOut());

    // пауза
    $('#p-resume').addEventListener('click', () => this.closePanels());
    $('#p-save').addEventListener('click', () => this.openPanel('saves', 'save'));
    $('#p-load').addEventListener('click', () => this.openPanel('saves', 'load'));
    $('#p-settings').addEventListener('click', () => this.openPanel('settings'));
    $('#p-title').addEventListener('click', () => this.toTitle());

    // конец главы
    $('#end-title').addEventListener('click', () => this.toTitle());
    $('#end-again').addEventListener('click', () => this.startChapter(FIRST));

    $$('.panel .close').forEach((b) => b.addEventListener('click', () => this.closePanels()));
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')) audio.sfx('ui');
    });

    // настройки
    const bindRange = (id, key) => {
      $(id).addEventListener('input', (e) => {
        this.settings[key] = Number(e.target.value);
        this.saveSettings();
      });
    };
    bindRange('#set-music', 'music');
    bindRange('#set-sfx', 'sfx');
    bindRange('#set-speed', 'textSpeed');
    bindRange('#set-auto', 'autoDelay');
    $('#set-captions').addEventListener('change', (e) => {
      this.settings.captions = e.target.checked;
      this.saveSettings();
    });
    $('#set-motion').addEventListener('change', (e) => {
      this.settings.motion = e.target.checked;
      this.saveSettings();
    });
  }

  next() {
    if (this.advance) {
      const fn = this.advance;
      this.advance = null;
      fn();
    }
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.updateModes();
    if (this.auto) this.next();
  }

  get skipping() {
    return this.skip || this.skipHeld;
  }

  updateModes() {
    $('#q-auto').classList.toggle('on', this.auto);
    $('#q-skip').classList.toggle('on', this.skipping);
    this.stage.speed = this.skipping ? 6 : 1;
  }

  // Ждать щелчка (или авточтения / пропуска)
  waitNext(autoMs) {
    return new Promise((resolve) => {
      let timer = null;
      const done = () => {
        clearTimeout(timer);
        this.advance = null;
        resolve();
      };
      this.advance = done;
      if (this.skipping) timer = setTimeout(done, 70);
      else if (this.auto && autoMs !== undefined) timer = setTimeout(done, autoMs);
    });
  }

  // ---------- экраны и панели ----------

  showTitle() {
    this.game.classList.add('at-title');
    $('#title').classList.add('on');
    $('#btn-continue').disabled = !store.get('auto');
    if (audio.ready) audio.music('title', { fade: 3 });
  }

  hideTitle() {
    this.game.classList.remove('at-title');
    $('#title').classList.remove('on');
  }

  panelOpen() {
    return $$('.panel').some((p) => p.classList.contains('on'));
  }

  openPanel(name, mode) {
    this.closePanels();
    if (name === 'log') this.renderLog();
    if (name === 'saves') this.renderSaves(mode);
    $(`#panel-${name}`).classList.add('on');
    this.game.classList.add('panel-open');
  }

  closePanels() {
    $$('.panel').forEach((p) => p.classList.remove('on'));
    this.game.classList.remove('panel-open');
  }

  renderLog() {
    const box = $('#log-list');
    box.innerHTML = this.log.map((l) => `
      <div class="log-line ${l.kind}">
        ${l.name ? `<b class="w-${l.world}">${esc(l.name)}</b>` : ''}
        <span>${esc(l.text).replace(/\{([^}]*)\}/g, '<span class="smudge">$1</span>')}</span>
      </div>`).join('') || '<p class="muted">Пока пусто.</p>';
    box.scrollTop = box.scrollHeight;
  }

  renderSaves(mode) {
    $('#saves-title').textContent = mode === 'save' ? 'Сохранить' : 'Загрузить';
    const box = $('#saves-list');
    box.innerHTML = '';
    for (const key of ['auto', 'slot1', 'slot2', 'slot3']) {
      if (mode === 'save' && key === 'auto') continue;
      const data = store.get(key);
      const btn = document.createElement('button');
      btn.className = 'slot';
      btn.disabled = (mode === 'load' && !data) || (mode === 'save' && !this.state);
      btn.innerHTML = `<b>${key === 'auto' ? 'Автосохранение' : `Ячейка ${key.slice(-1)}`}</b>
        <span>${data ? `${esc(data.chapterTitle)} · ${esc(data.place)}` : 'Пусто'}</span>
        <small>${data ? `${new Date(data.when).toLocaleString('ru')}${data.preview ? ` — «${esc(data.preview)}»` : ''}` : ''}</small>`;
      btn.addEventListener('click', () => {
        if (mode === 'save') {
          store.set(key, this.snapshot());
          this.renderSaves(mode);
          this.toast('Сохранено');
        } else {
          this.closePanels();
          this.load(data);
        }
      });
      box.appendChild(btn);
    }
  }

  toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 1600);
  }

  hint(text) {
    const h = $('#hint');
    h.textContent = text;
    h.classList.add('on');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => h.classList.remove('on'), 7000);
  }

  // ---------- сохранения ----------

  snapshot() {
    const loc = this.chapter.locations[this.state.location];
    const last = [...this.log].reverse().find((l) => l.text);
    return {
      chapter: this.chapter.id,
      chapterTitle: this.chapter.title,
      place: `${loc.name}, ${TIME_NAMES[this.state.time] || ''}`,
      preview: last ? last.text.slice(0, 60) : '',
      when: Date.now(),
      state: clone(this.state),
      log: this.log.slice(-80),
    };
  }

  autosave() {
    if (this.state && this.mode === 'explore') store.set('auto', this.snapshot());
  }

  load(data) {
    if (!data || !CHAPTERS[data.chapter] || !data.state) return;
    this.startChapter(data.chapter, data);
  }

  toTitle() {
    this.token = null;
    this.mode = null;
    this.state = null;
    this.next();
    this.closePanels();
    $('#end').classList.remove('on');
    this.hideDialog();
    this.exitPuzzle();
    this.setBack(false);
    this.game.classList.remove('exploring', 'in-beat');
    audio.setAmbience([]);
    audio.stopMusic(1.5);
    this.stage.clear();
    this.showTitle();
  }

  // ---------- глава: исследование ----------

  async startChapter(id, saved = null) {
    const ch = CHAPTERS[id];
    this.chapter = ch;
    const token = {};
    this.token = token;
    this.auto = false;
    this.skip = false;
    this.updateModes();
    this.closePanels();
    $('#end').classList.remove('on');
    this.hideTitle();
    this.hideDialog();
    this.exitPuzzle();
    this.setBack(false);
    audio.stopMusic(1.2);
    this.state = saved
      ? clone(saved.state)
      : { location: ch.start.location, time: ch.start.time, flags: {}, puzzles: {}, looked: {}, fired: {}, elapsed: {}, due: {} };
    this.log = saved ? [...(saved.log || [])] : [];
    this.mode = 'beat';
    await this.enterLocation(this.state.location, { transition: 'fade', dur: 1.8 });
    if (this.token !== token) return;
    if (!saved && ch.intro) await this.beat(ch.intro);
    else this.resumeExplore();
  }

  resumeExplore() {
    this.mode = 'explore';
    this.game.classList.add('exploring');
    this.game.classList.remove('in-beat');
    this.hideDialog();
    this.stage.setGroups(['look']);
    this.renderNav();
    this.autosave();
    this.checkRules();
  }

  sceneIdFor(loc) {
    return this.chapter.locations[loc].scene(this.state);
  }

  async enterLocation(loc, { transition = 'fade', dur = 1.2 } = {}) {
    const L = this.chapter.locations[loc];
    this.state.location = loc;
    this.exitPuzzle();
    this.zoomed = null;
    this.setBack(false);
    const sceneId = this.sceneIdFor(loc);
    await this.stage.show(sceneId, { shot: 'wide', transition, dur });
    this.applySceneState();
    audio.setAmbience(scenes[sceneId].ambience);
    audio.music(L.music(this.state), { fade: 2.5 });
    this.renderNav();
    if (this.mode === 'explore') this.stage.setGroups(['look']);
  }

  // Классы состояния на сцене (например, «буквы сдвинуты»)
  applySceneState() {
    const root = this.stage.root;
    if (!root || !this.chapter.sceneClasses) return;
    root.setAttribute('class', ['scene', ...this.chapter.sceneClasses(this.state)].join(' '));
  }

  renderNav() {
    const nav = $('#nav');
    const locs = this.chapter ? Object.entries(this.chapter.locations) : [];
    nav.innerHTML = locs.map(([id, L]) => `<button type="button" data-loc="${id}"${id === this.state.location ? ' aria-current="true"' : ''}>${esc(L.name)}</button>`).join('');
    nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.loc)));
  }

  async go(loc) {
    if (this.mode !== 'explore' || loc === this.state.location) return;
    audio.sfx('steps');
    this.stage.setGroups([]);
    await this.enterLocation(loc, { transition: 'fade', dur: 1.1 });
    this.stage.setGroups(['look']);
    this.autosave();
    this.checkRules();
  }

  setBack(on) {
    $('#back').classList.toggle('on', on);
  }

  zoomTo(shot) {
    this.zoomed = shot;
    this.setBack(true);
    this.stage.shot(shot, { dur: 1.3 });
    this.maybeEnterPuzzle();
  }

  zoomOut() {
    if (!this.zoomed) return;
    this.zoomed = null;
    this.setBack(false);
    this.exitPuzzle();
    this.stage.shot('wide', { dur: 1.1 });
  }

  // Щелчок по предмету
  onHotspot(el, e) {
    if (this.mode !== 'explore') return;
    const spot = this.stage.hotspot(el.dataset.id);
    if (!spot) return;
    const r = $('#stage').getBoundingClientRect();
    const at = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    const group = el.dataset.group;

    if (group !== 'look') {
      this.pickPuzzle(group, spot, at);
      return;
    }

    const res = (this.chapter.interact && this.chapter.interact(this.stage.scene.id, spot.id, this.state)) || {};
    if (res.set) Object.assign(this.state.flags, res.set);
    if (res.go) {
      this.go(res.go);
      return;
    }
    if (res.beat) {
      this.beat(res.beat);
      return;
    }
    const shot = res.shot !== undefined ? res.shot : spot.shot;
    const moving = shot && shot !== this.zoomed;
    if (moving) this.zoomTo(shot);
    const lines = res.lines || spot.lines;
    if (lines && lines.length) {
      const key = `${this.stage.scene.id}:${spot.id}:${res.key || ''}`;
      const n = this.state.looked[key] || 0;
      this.state.looked[key] = n + 1;
      audio.sfx('look');
      this.thought(lines[Math.min(n, lines.length - 1)], moving ? null : at);
    }
    this.checkRules();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.autosave(), 1500);
  }

  // ---------- загадки ----------

  puzzleUi() {
    return {
      banner: (t, h) => this.banner(t, h),
      thought: (t, at) => this.thought(t, at),
      tray: (n, l) => this.tray(n, l),
    };
  }

  maybeEnterPuzzle() {
    if (this.puzzle || !this.chapter.puzzles) return;
    for (const [name, def] of Object.entries(this.chapter.puzzles)) {
      const ctrl = this.stage.scene.puzzles && this.stage.scene.puzzles[name];
      if (ctrl && ctrl.shot === this.zoomed && def.when(this.state)) {
        const progress = (this.state.puzzles[name] = this.state.puzzles[name] || {});
        this.puzzle = { name, ctrl, def, progress };
        this.stage.setGroups(['look', ctrl.group]);
        this.banner(ctrl.banner, () => this.thought(ctrl.hint));
        ctrl.start(this.puzzleUi(), progress, this.stage.root);
        return;
      }
    }
  }

  pickPuzzle(group, spot, at) {
    const p = this.puzzle;
    if (!p || p.ctrl.group !== group) return;
    const done = p.ctrl.pick(spot, this.puzzleUi(), p.progress, this.stage.root, at);
    if (done) {
      Object.assign(this.state.flags, p.def.done || {});
      audio.sfx('success');
      setTimeout(() => {
        this.exitPuzzle();
        this.checkRules();
      }, 1400);
    }
  }

  exitPuzzle() {
    if (!this.puzzle) return;
    this.puzzle = null;
    this.banner(null);
    $('#tray').classList.remove('on');
    if (this.mode === 'explore') this.stage.setGroups(['look']);
  }

  // ---------- живой мир: таймеры и правила ----------

  tick() {
    if (!this.state || this.mode !== 'explore' || this.panelOpen() || document.hidden) return;
    const s = this.state;
    for (const t of this.chapter.timers || []) {
      if (t.once && s.fired[t.id]) continue;
      if (!t.when(s)) continue;
      s.elapsed[t.id] = (s.elapsed[t.id] || 0) + 1;
      if (t.after !== undefined && s.elapsed[t.id] >= t.after) {
        this.fire(t);
      } else if (t.every) {
        if (!s.due[t.id]) s.due[t.id] = rand(t.every);
        if (s.elapsed[t.id] >= s.due[t.id]) {
          s.elapsed[t.id] = 0;
          s.due[t.id] = rand(t.every);
          this.fire(t);
        }
      }
    }
  }

  fire(t) {
    this.state.fired[t.id] = true;
    if (t.set) Object.assign(this.state.flags, t.set);
    if (t.set && this.stage.root) this.applySceneState();
    this.background(t.do || []);
    this.checkRules();
  }

  // Команды «фона»: звуки, анимации, мысли — не прерывают исследование
  async background(cmds) {
    const token = this.token;
    for (const cmd of cmds) {
      if (this.token !== token) return;
      const [op, a, b] = cmd;
      const opts = (typeof b === 'object' && b) || {};
      if (op === 'sfx') {
        audio.sfx(a, opts);
        if (opts.caption) this.caption(opts.caption);
      } else if (op === 'event') this.stage.event(a);
      else if (op === 'shake') this.stage.shake(a);
      else if (op === 'wait') await sleep(a * 1000);
      else if (op === 'thought') this.thought(a);
      else if (op === 'music') audio.music(a, opts);
    }
  }

  checkRules() {
    if (this.mode !== 'explore') return;
    for (const rule of this.chapter.rules || []) {
      const key = `rule:${rule.id}`;
      if (this.state.fired[key] || !rule.when(this.state)) continue;
      this.state.fired[key] = true;
      this.beat(rule.beat);
      return;
    }
  }

  // ---------- сценки ----------

  async beat(cmds) {
    const token = this.token;
    this.mode = 'beat';
    this.exitPuzzle();
    this.game.classList.add('in-beat');
    this.stage.setGroups([]);
    for (const cmd of cmds) {
      if (this.token !== token) return;
      await this.exec(cmd, token);
      if (this.token !== token || this.mode === 'end') return;
    }
    // если сценка показывала другую сцену — вернуться туда, где стоит игрок
    if (this.stage.scene && this.stage.scene.id !== this.sceneIdFor(this.state.location)) {
      await this.enterLocation(this.state.location, { transition: 'fade', dur: 1.2 });
    }
    if (this.zoomed) this.setBack(true);
    this.resumeExplore();
  }

  async exec(cmd, token) {
    const [op, a, b] = cmd;
    const opts = (typeof b === 'object' && b) || {};
    switch (op) {
      case 'scene':
        this.hideDialog();
        await this.stage.show(a, { shot: opts.shot, transition: opts.transition, dur: opts.dur });
        audio.setAmbience(scenes[a].ambience);
        break;
      case 'shot': {
        const p = this.stage.shot(a, { dur: opts.dur });
        if (opts.wait) await p;
        break;
      }
      case 'say':
        await this.line('say', this.chapter.chars[a], b, token);
        break;
      case 'think':
        await this.line('think', this.currentHero(), a, token);
        break;
      case 'narr':
        await this.line('narr', null, a, token);
        break;
      case 'card':
        await this.card(a, typeof b === 'string' ? b : '', token);
        break;
      case 'music':
        if (a) audio.music(a, { fade: opts.fade ?? 2.5 });
        else audio.stopMusic(opts.fade ?? 2);
        break;
      case 'sfx':
        if (!this.skipping) audio.sfx(a, opts);
        if (opts.caption) this.caption(opts.caption);
        break;
      case 'event': {
        const p = this.stage.event(a);
        if (opts.wait !== false) await p;
        break;
      }
      case 'shake':
        this.stage.shake(a);
        break;
      case 'wait':
        await sleep((a * 1000) / (this.skipping ? 8 : 1));
        break;
      case 'hide':
        this.hideDialog();
        break;
      case 'thought':
        this.hideDialog();
        this.thought(a);
        break;
      case 'hint':
        this.hint(a);
        break;
      case 'set':
        Object.assign(this.state.flags, a);
        break;
      case 'time':
        this.state.time = a;
        break;
      case 'go':
        this.hideDialog();
        await this.enterLocation(a, { transition: opts.transition || 'fade', dur: opts.dur || 1.4 });
        break;
      case 'end':
        this.endChapter();
        break;
      default:
        console.warn('Неизвестная команда', cmd);
    }
  }

  currentHero() {
    const world = this.game.dataset.world;
    return Object.values(this.chapter.chars).find((ch) => ch.world === world) || null;
  }

  // ---------- диалог ----------

  hideDialog() {
    $('#dialog').classList.remove('on');
  }

  async line(kind, who, text, token) {
    const dialog = $('#dialog');
    const name = $('#d-name');
    const body = $('#d-text');
    $('#pop').classList.remove('on');
    dialog.dataset.kind = kind;
    dialog.dataset.speaker = who ? who.world : '';
    name.textContent = who && kind !== 'narr' ? who.name : '';
    name.hidden = !name.textContent;
    this.log.push({ kind, name: who && kind !== 'narr' ? who.name : '', world: who ? who.world : '', text });

    // каждая буква — отдельный span: текст появляется, не сдвигая строку
    let html = '';
    for (const part of text.split(/(\{[^}]*\})/)) {
      if (!part) continue;
      const smudge = part.startsWith('{');
      const t = smudge ? part.slice(1, -1) : part;
      const chars = [...t].map((ch) => `<i>${esc(ch)}</i>`).join('');
      html += smudge ? `<span class="smudge">${chars}</span>` : chars;
    }
    body.innerHTML = html;
    dialog.classList.remove('done');
    dialog.classList.add('on');
    const letters = [...body.querySelectorAll('i')];

    if (this.skipping) {
      letters.forEach((l) => l.classList.add('on'));
    } else {
      await new Promise((resolve) => {
        let i = 0;
        const cps = this.settings.textSpeed;
        const finish = () => {
          clearInterval(timer);
          letters.forEach((l) => l.classList.add('on'));
          if (this.advance === finish) this.advance = null;
          resolve();
        };
        const timer = setInterval(() => {
          const n = Math.max(1, Math.round(cps / 30));
          for (let k = 0; k < n && i < letters.length; k++) letters[i++].classList.add('on');
          if (i >= letters.length) finish();
        }, 1000 / 30);
        this.advance = finish;
      });
    }
    if (this.token !== token) return;
    dialog.classList.add('done');
    await this.waitNext(this.settings.autoDelay * 1000 + text.length * 35);
    dialog.classList.remove('done');
  }

  async card(title, sub, token) {
    const el = $('#card');
    $('#card-title').textContent = title;
    $('#card-sub').textContent = sub;
    el.classList.add('on');
    await Promise.race([sleep(this.skipping ? 200 : 2800), this.waitNext()]);
    this.advance = null;
    if (this.token !== token) return;
    el.classList.remove('on');
    await sleep(this.skipping ? 100 : 700);
  }

  caption(text) {
    if (!this.settings.captions) return;
    const el = $('#caption');
    el.textContent = `[${text}]`;
    el.classList.add('on');
    clearTimeout(this.captionTimer);
    this.captionTimer = setTimeout(() => el.classList.remove('on'), 2600);
  }

  banner(text, onHint) {
    const el = $('#banner');
    if (!text) {
      el.classList.remove('on');
      return;
    }
    $('#banner-text').textContent = text;
    const hint = $('#banner-hint');
    hint.hidden = !onHint;
    hint.onclick = onHint || null;
    el.classList.add('on');
  }

  // at — точка щелчка в долях кадра [x, y]; без неё мысль появляется вверху по центру
  thought(text, at) {
    const el = $('#pop');
    el.textContent = text;
    if (at) {
      const x = Math.min(0.72, Math.max(0.28, at[0]));
      const y = at[1] < 0.35 ? at[1] + 0.08 : at[1] - 0.06;
      el.style.left = `${x * 100}%`;
      el.style.top = `${y * 100}%`;
      el.classList.toggle('below', at[1] < 0.35);
    } else {
      el.style.left = '50%';
      el.style.top = '14%';
      el.classList.add('below');
    }
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    const hero = this.currentHero();
    this.log.push({ kind: 'think', name: hero ? hero.name : '', world: this.game.dataset.world, text });
    clearTimeout(this.popTimer);
    this.popTimer = setTimeout(() => el.classList.remove('on'), 2400 + text.length * 50);
  }

  tray(n, letters = []) {
    const el = $('#tray');
    el.innerHTML = `<span class="dots">…</span>${Array.from({ length: n }, (_, i) => `<span class="slot${letters[i] ? ' filled' : ''}">${letters[i] || ''}</span>`).join('')}`;
    el.classList.add('on');
  }

  endChapter() {
    this.mode = 'end';
    this.hideDialog();
    this.game.classList.remove('exploring', 'in-beat');
    audio.music('title', { fade: 4 });
    store.set(`done:${this.chapter.id}`, true);
    $('#end-title-text').textContent = `Конец главы: «${this.chapter.title.replace(/^Глава \d+\. /, '')}»`;
    $('#end').classList.add('on');
  }
}
