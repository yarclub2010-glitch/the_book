// Сцена: слои с картинкой, камера (ракурсы), переходы и эффекты.

import { scenes } from '../scenes/index.js';

const W = 1600;
const H = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Stage {
  constructor(view, fader, game) {
    this.view = view;
    this.fader = fader;
    this.game = game;
    this.layer = null;
    this.scene = null;
    this.cam = [0, 0, W, H];
    this.anim = null;
    this.cache = new Map();
    this.speed = 1; // во время пропуска всё ускоряется
  }

  get root() {
    return this.layer ? this.layer.querySelector('svg') : null;
  }

  markup(id) {
    if (!this.cache.has(id)) this.cache.set(id, scenes[id].build());
    return this.cache.get(id);
  }

  makeLayer(id) {
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.dataset.scene = id;
    layer.innerHTML = `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${this.markup(id)}</svg>`;
    return layer;
  }

  // Показать сцену: transition — cut | fade | cross | morph
  async show(id, { shot = 'wide', transition = 'fade', dur = 1.4 } = {}) {
    const def = scenes[id];
    if (!def) throw new Error(`Нет сцены ${id}`);
    const ms = (dur * 1000) / this.speed;
    const old = this.layer;
    const layer = this.makeLayer(id);

    if (transition === 'fade' && old) {
      this.fader.style.transitionDuration = `${ms / 2}ms`;
      this.fader.classList.add('on');
      await sleep(ms / 2);
    }

    layer.classList.add(transition === 'cross' || transition === 'morph' ? `enter-${transition}` : 'enter');
    this.view.appendChild(layer);
    this.layer = layer;
    this.scene = def;
    this.game.dataset.world = def.world;
    if (this.anim) this.anim.stop();
    this.setCam(def.shots[shot] || def.shots.wide);

    if ((transition === 'cross' || transition === 'morph') && old) {
      layer.style.transitionDuration = `${ms}ms`;
      old.style.transitionDuration = `${ms}ms`;
      void layer.offsetWidth;
      layer.classList.add('in');
      old.classList.add(transition === 'morph' ? 'leave-morph' : 'leave');
      await sleep(ms);
      old.remove();
    } else {
      if (old) old.remove();
      void layer.offsetWidth;
      layer.classList.add('in');
      if (transition === 'fade') {
        this.fader.style.transitionDuration = `${(old ? ms / 2 : ms)}ms`;
        this.fader.classList.remove('on');
        await sleep(old ? ms / 2 : ms);
      }
    }
  }

  setCam(box) {
    this.cam = [...box];
    this.applyCam();
  }

  applyCam() {
    const svg = this.root;
    if (svg) svg.setAttribute('viewBox', this.cam.map((v) => v.toFixed(1)).join(' '));
  }

  // Плавная смена ракурса
  shot(name, { dur = 2.4 } = {}) {
    const box = this.scene && this.scene.shots[name];
    if (!box) return Promise.resolve();
    // Предыдущий наезд прерывается там, где он сейчас; его обещание выполняется
    if (this.anim) this.anim.stop();
    const from = [...this.cam];
    const ms = (dur * 1000) / this.speed;
    if (ms < 30) {
      this.setCam(box);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const anim = { raf: 0, active: true };
      const end = (snap) => {
        if (!anim.active) return;
        anim.active = false;
        cancelAnimationFrame(anim.raf);
        if (this.anim === anim) this.anim = null;
        if (snap) this.setCam(box);
        resolve();
      };
      anim.stop = () => end(false);
      const step = (now) => {
        if (!anim.active) return;
        const t = Math.min(1, (now - start) / ms);
        const k = ease(t);
        this.cam = from.map((v, i) => v + (box[i] - v) * k);
        this.applyCam();
        if (t < 1) anim.raf = requestAnimationFrame(step);
        else end(true);
      };
      anim.raf = requestAnimationFrame(step);
      this.anim = anim;
      // Страховка: если вкладка в фоне и кадры не рисуются, камера всё равно придёт на место
      setTimeout(() => end(true), ms + 120);
    });
  }

  event(name) {
    const fn = this.scene && this.scene.events && this.scene.events[name];
    if (!fn) return Promise.resolve();
    const ms = fn(this.root) || 0;
    return sleep(ms / this.speed);
  }

  puzzle(name, ui) {
    const fn = this.scene && this.scene.puzzles && this.scene.puzzles[name];
    return fn ? fn(this.root, ui) : Promise.resolve('');
  }

  shake(sec = 2) {
    if (this.game.classList.contains('no-motion')) return;
    this.view.classList.remove('shake');
    void this.view.offsetWidth;
    this.view.style.setProperty('--shake-time', `${sec}s`);
    this.view.classList.add('shake');
    setTimeout(() => this.view.classList.remove('shake'), sec * 1000);
  }

  clear() {
    if (this.layer) this.layer.remove();
    this.layer = null;
    this.scene = null;
  }
}

// Фон главного меню: два мира, разделённые диагональю
export function titleBackdrop(el) {
  const a = document.createElement('div');
  a.className = 'backdrop-half np';
  a.innerHTML = `<svg viewBox="200 60 1300 731" preserveAspectRatio="xMidYMid slice">${scenes['room-np'].build()}</svg>`;
  const b = document.createElement('div');
  b.className = 'backdrop-half p';
  b.innerHTML = `<svg viewBox="150 40 1350 759" preserveAspectRatio="xMidYMid slice">${scenes['kitchen-p'].build()}</svg>`;
  el.append(a, b);
}
