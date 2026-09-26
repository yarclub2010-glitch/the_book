// Движок новеллы: выполняет сценарий главы, управляет интерфейсом, сохранениями и настройками.

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

export class Game {
  constructor() {
    this.game = $('#game');
    this.stage = new Stage($('#view'), $('#fader'), this.game);
    this.settings = { ...DEFAULTS, ...store.get('settings', {}) };
    this.log = [];
    this.token = null;
    this.advance = null;
    this.auto = false;
    this.skip = false;
    this.skipHeld = false;
    this.looked = new Map(); // сколько раз осматривали предмет
    this.hotspotHandlers = {};
    this.applySettings();
    this.bind();
    titleBackdrop($('#title .backdrop'));
    this.makeGrain();
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

    $('#stage').addEventListener('click', (e) => {
      if (e.target.closest('button, input, label, .panel, .quick, .banner, .tray, .screen')) return;
      // Щелчок по активной зоне — осмотр или загадка; сюжет при этом не листается
      const hs = e.target.closest('.hs.active');
      if (hs) {
        this.onHotspot(hs, e);
        return;
      }
      if (this.game.classList.contains('ui-hidden')) {
        this.game.classList.remove('ui-hidden');
        return;
      }
      this.next();
    });
    // Подпись предмета под указателем
    $('#stage').addEventListener('pointermove', (e) => {
      const hs = e.target.closest && e.target.closest('.hs.active');
      const label = $('#hs-label');
      if (hs && hs.dataset.label) {
        const r = $('#stage').getBoundingClientRect();
        label.textContent = hs.dataset.label;
        label.style.left = `${e.clientX - r.left}px`;
        label.style.top = `${e.clientY - r.top}px`;
        label.classList.add('on');
      } else label.classList.remove('on');
    });
    $('#stage').addEventListener('pointerleave', () => $('#hs-label').classList.remove('on'));
    $('#stage').addEventListener('wheel', (e) => {
      if (e.deltaY < 0 && this.token && !this.panelOpen()) this.openPanel('log');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.panelOpen()) this.closePanels();
        else if (this.token) this.openPanel('pause');
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
    $('#btn-new').addEventListener('click', () => this.newGame());
    $('#btn-continue').addEventListener('click', () => this.continueGame());
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

    // пауза
    $('#p-resume').addEventListener('click', () => this.closePanels());
    $('#p-save').addEventListener('click', () => this.openPanel('saves', 'save'));
    $('#p-load').addEventListener('click', () => this.openPanel('saves', 'load'));
    $('#p-settings').addEventListener('click', () => this.openPanel('settings'));
    $('#p-title').addEventListener('click', () => this.toTitle());

    // конец главы
    $('#end-title').addEventListener('click', () => this.toTitle());
    $('#end-again').addEventListener('click', () => this.newGame());

    $$('.panel .close').forEach((b) => b.addEventListener('click', () => this.closePanels()));
    $$('button').forEach((b) => b.addEventListener('click', () => audio.sfx('ui')));

    // настройки
    const bindRange = (id, key, parse = Number) => {
      $(id).addEventListener('input', (e) => {
        this.settings[key] = parse(e.target.value);
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

  // ---------- экраны ----------

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
    const slots = ['auto', 'slot1', 'slot2', 'slot3'];
    const box = $('#saves-list');
    box.innerHTML = '';
    slots.forEach((key) => {
      if (mode === 'save' && key === 'auto') return;
      const data = store.get(key);
      const btn = document.createElement('button');
      btn.className = 'slot';
      btn.disabled = mode === 'load' && !data;
      btn.innerHTML = `<b>${key === 'auto' ? 'Автосохранение' : `Ячейка ${key.slice(-1)}`}</b>
        <span>${data ? `${esc(data.chapterTitle)} · ${esc(data.place)}` : 'Пусто'}</span>
        <small>${data ? `${new Date(data.when).toLocaleString('ru')} — «${esc(data.preview)}»` : ''}</small>`;
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
    });
  }

  toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 1600);
  }

  // ---------- игра ----------

  snapshot() {
    const cmd = this.chapter.script[this.index] || [];
    return {
      chapter: this.chapter.id,
      chapterTitle: this.chapter.title,
      index: this.index,
      place: this.stage.scene ? this.stage.scene.title : '',
      preview: typeof cmd[2] === 'string' ? cmd[2] : (typeof cmd[1] === 'string' ? cmd[1] : ''),
      when: Date.now(),
    };
  }

  newGame() {
    this.log = [];
    this.run(FIRST, 0);
  }

  continueGame() {
    const data = store.get('auto');
    if (data) this.load(data);
  }

  load(data) {
    if (!data || !CHAPTERS[data.chapter]) return;
    this.log = [];
    this.run(data.chapter, data.index);
  }

  toTitle() {
    this.token = null;
    this.next();
    this.closePanels();
    $('#end').classList.remove('on');
    this.hideDialog();
    this.banner(null);
    $('#tray').classList.remove('on');
    audio.setAmbience([]);
    audio.stopMusic(1.5);
    this.stage.clear();
    this.showTitle();
  }

  async run(chapterId, from) {
    this.chapter = CHAPTERS[chapterId];
    const token = {};
    this.token = token;
    this.auto = false;
    this.skip = false;
    this.updateModes();
    this.closePanels();
    $('#end').classList.remove('on');
    this.hideTitle();
    this.hideDialog();
    audio.stopMusic(1.2);
    const script = this.chapter.script;
    this.index = from;
    if (from > 0) await this.restore(from);
    while (this.index < script.length) {
      if (this.token !== token) return;
      await this.exec(script[this.index], token);
      if (this.token !== token) return;
      this.index++;
    }
  }

  // Восстановить сцену, ракурс и музыку на момент сохранения
  async restore(index) {
    const script = this.chapter.script;
    let scene = null;
    let shot = 'wide';
    let music = null;
    let events = [];
    for (let i = 0; i < index; i++) {
      const [op, a, o = {}] = script[i];
      if (op === 'scene') {
        scene = a;
        shot = o.shot || 'wide';
        events = [];
      } else if (op === 'shot') shot = a;
      else if (op === 'music') music = a;
      else if (op === 'event') events.push(a);
      else if (op === 'say' || op === 'think' || op === 'narr') {
        const who = op === 'say' ? this.chapter.chars[a] : null;
        this.log.push({ kind: op, name: who ? who.name : '', world: who ? who.world : '', text: op === 'say' ? o : a });
      }
    }
    if (scene) {
      await this.stage.show(scene, { shot, transition: 'fade', dur: 1.2 });
      audio.setAmbience(scenes[scene].ambience);
      this.stage.speed = 100;
      for (const e of events) await this.stage.event(e);
      this.updateModes();
    }
    if (music) audio.music(music, { fade: 2 });
  }

  async exec(cmd, token) {
    const [op, a, b, c] = cmd;
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
      case 'hide':
        this.hideDialog();
        break;
      case 'wait':
        await sleep((a * 1000) / (this.skipping ? 8 : 1));
        break;
      case 'puzzle':
        await this.puzzle(a);
        break;
      case 'end':
        this.endChapter();
        break;
      default:
        console.warn('Неизвестная команда', cmd, c);
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
    store.set('auto', this.snapshot());
    const dialog = $('#dialog');
    const name = $('#d-name');
    const body = $('#d-text');
    dialog.dataset.kind = kind;
    dialog.dataset.speaker = who ? who.world : '';
    name.textContent = who && kind !== 'narr' ? who.name : '';
    name.hidden = !name.textContent;
    this.log.push({ kind, name: who && kind !== 'narr' ? who.name : '', world: who ? who.world : '', text });

    // каждая буква — отдельный span: текст появляется, не сдвигая строку
    let html = '';
    const parts = text.split(/(\{[^}]*\})/);
    for (const part of parts) {
      if (!part) continue;
      const smudge = part.startsWith('{');
      const t = smudge ? part.slice(1, -1) : part;
      const chars = [...t].map((ch) => `<i>${esc(ch)}</i>`).join('');
      html += smudge ? `<span class="smudge">${chars}</span>` : chars;
    }
    body.innerHTML = html;
    dialog.classList.remove('done');
    dialog.classList.add('on');
    this.stage.setGroups(['look']);
    $('#pop').classList.remove('on');
    const letters = [...body.querySelectorAll('i')];

    if (this.skipping) {
      letters.forEach((l) => l.classList.add('on'));
    } else {
      await new Promise((resolve) => {
        let i = 0;
        const cps = this.settings.textSpeed;
        const timer = setInterval(() => {
          const n = Math.max(1, Math.round(cps / 30));
          for (let k = 0; k < n && i < letters.length; k++) letters[i++].classList.add('on');
          if (i >= letters.length) finish();
        }, 1000 / 30);
        const finish = () => {
          clearInterval(timer);
          letters.forEach((l) => l.classList.add('on'));
          if (this.advance === finish) this.advance = null;
          resolve();
        };
        this.advance = finish;
      });
    }
    if (this.token !== token) return;
    dialog.classList.add('done');
    const words = text.length;
    await this.waitNext(this.settings.autoDelay * 1000 + words * 35);
    dialog.classList.remove('done');
    this.stage.setGroups([]);
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

  // ---------- активные зоны ----------

  onHotspot(el, e) {
    const spot = this.stage.hotspot(el.dataset.id);
    if (!spot) return;
    const r = $('#stage').getBoundingClientRect();
    const at = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    const group = el.dataset.group;
    if (group === 'look') {
      // каждый следующий щелчок — следующая мысль; последняя повторяется
      const key = `${this.stage.scene.id}:${spot.id}`;
      const n = this.looked.get(key) || 0;
      this.looked.set(key, n + 1);
      audio.sfx('look');
      this.thought(spot.lines[Math.min(n, spot.lines.length - 1)], at);
    } else if (this.hotspotHandlers[group]) {
      this.hotspotHandlers[group](spot, at);
    }
  }

  // ---------- загадки ----------

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
      el.style.top = '22%';
      el.classList.add('below');
    }
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    this.log.push({ kind: 'think', name: this.currentHero()?.name || '', world: this.game.dataset.world, text });
    clearTimeout(this.popTimer);
    this.popTimer = setTimeout(() => el.classList.remove('on'), 2200 + text.length * 45);
  }

  tray(n, letters = []) {
    const el = $('#tray');
    el.innerHTML = `<span class="dots">…</span>${Array.from({ length: n }, (_, i) => `<span class="slot${letters[i] ? ' filled' : ''}">${letters[i] || ''}</span>`).join('')}`;
    el.classList.add('on');
  }

  async puzzle(name) {
    this.hideDialog();
    this.game.classList.add('in-puzzle');
    const ui = {
      banner: (t, h) => this.banner(t, h),
      thought: (t, at) => this.thought(t, at),
      tray: (n, l) => this.tray(n, l),
      onHotspot: (group, fn) => {
        if (fn) this.hotspotHandlers[group] = fn;
        else delete this.hotspotHandlers[group];
      },
    };
    this.stage.setGroups(['look', name]);
    if (this.skipping) {
      this.skip = false;
      this.skipHeld = false;
      this.updateModes();
    }
    await this.stage.puzzle(name, ui);
    this.stage.setGroups([]);
    this.hotspotHandlers = {};
    await sleep(600);
    $('#tray').classList.remove('on');
    $('#pop').classList.remove('on');
    this.game.classList.remove('in-puzzle');
  }

  endChapter() {
    this.hideDialog();
    audio.music('title', { fade: 4 });
    store.set('done:' + this.chapter.id, true);
    $('#end-title-text').textContent = `Конец главы: «${this.chapter.title.replace(/^Глава \d+\. /, '')}»`;
    $('#end').classList.add('on');
    this.token = null;
  }
}
