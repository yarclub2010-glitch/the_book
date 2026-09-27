// Сцена: слои с картинкой, камера (ракурсы), переходы и эффекты.

import { scenes } from '../scenes/index.js';
import { ambientFor } from '../scenes/ambient.js';

const W = 1600;
const H = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Фоны-картинки грузятся заранее: сцена появляется, только когда картинка готова
const images = new Map();
export function preload(src) {
  if (!src) return Promise.resolve();
  if (!images.has(src)) {
    const img = new Image();
    img.src = src;
    images.set(src, img.decode().catch(() => {}));
  }
  return images.get(src);
}

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
    // Все картинки всех сцен (фон, фото-якорь, кадры «без книги», погасшее бра…) грузятся заранее
    Object.keys(scenes).forEach((id) => this.images(id).forEach(preload));
    // и фотографии предметов для осмотра
    Object.values(scenes).forEach((sc) => (sc.hotspots || []).forEach((h) => h.view && preload(h.view)));
  }

  get root() {
    return this.layer ? this.layer.querySelector('svg') : null;
  }

  // Разметка сцены из двух слоёв:
  //   art — вся картинка и свет; никогда не ловит щелчки;
  //   hotspots — невидимые активные зоны, всегда поверх картинки.
  // Поэтому новые предметы и свет не могут перекрыть зоны — проверять ничего не нужно.
  markup(id) {
    if (!this.cache.has(id)) {
      const def = scenes[id];
      // ambientFor — «жизнь» сцены: дождь на стёклах, пыль в луче, пар, колыхание штор
      this.cache.set(id, `<g class="art" pointer-events="none">${def.build()}${ambientFor(id)}</g>${hotspotsMarkup(def.hotspots || [])}`);
    }
    return this.cache.get(id);
  }

  // Адреса всех картинок сцены — из её разметки
  images(id) {
    return [...new Set([...this.markup(id).matchAll(/<image[^>]*href="([^"]+)"/g)].map((m) => m[1]))];
  }

  makeLayer(id) {
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.dataset.scene = id;
    layer.innerHTML = `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${this.markup(id)}</svg>`;
    return layer;
  }

  // Включить группы активных зон: 'look' — осмотр, имя загадки — её предметы
  setGroups(groups = []) {
    const svg = this.root;
    if (!svg) return;
    svg.querySelectorAll('.hs').forEach((el) => el.classList.toggle('active', groups.includes(el.dataset.group)));
  }

  hotspot(id) {
    return this.scene && (this.scene.hotspots || []).find((h) => h.id === id);
  }

  // Проверка для разработчика: каждая зона должна ловить щелчок в своей середине,
  // а не отдавать его соседней зоне. Возвращает список проблем (пустой — всё хорошо).
  auditHotspots() {
    const svg = this.root;
    if (!svg) return ['нет сцены'];
    const problems = [];
    const zones = [...svg.querySelectorAll('.hs')];
    const saved = zones.map((z) => z.classList.contains('active'));
    zones.forEach((z) => z.classList.add('active'));
    const frame = this.view.getBoundingClientRect();
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (r.width < 1 || x < frame.left || x > frame.right || y < frame.top || y > frame.bottom) continue; // вне кадра
      const stack = document.elementsFromPoint(x, y);
      const first = stack.find((el) => el.closest('.hs'));
      const hit = first && first.closest('.hs');
      if (hit !== z) {
        problems.push(`${z.dataset.id}: перекрыта зоной ${hit ? hit.dataset.id : '—'}`);
        continue;
      }
      // интерфейс поверх зоны (кнопки, окна) — не ошибка сцены, но полезно знать
      const ui = stack[0] && stack[0].closest('button, nav, .banner, .panel, .screen.on');
      if (ui) problems.push(`${z.dataset.id}: под элементом интерфейса (${ui.id || ui.className})`);
    }
    zones.forEach((z, i) => z.classList.toggle('active', saved[i]));
    return problems;
  }

  // Показать сцену: transition — cut | fade | cross | morph
  // classes — состояние мира на сцене (надписи, сдвинутые буквы…): ставится до показа, без мелькания
  async show(id, { shot = 'wide', transition = 'fade', dur = 1.4, classes = [] } = {}) {
    const def = scenes[id];
    if (!def) throw new Error(`Нет сцены ${id}`);
    const ms = (dur * 1000) / this.speed;
    // сцена появляется целиком — фон и всё, что поверх; не дольше 4 секунд, если что-то не грузится
    await Promise.race([Promise.all(this.images(id).map(preload)), sleep(4000)]);
    const old = this.layer;
    const layer = this.makeLayer(id);
    layer.querySelector('svg').setAttribute('class', ['scene', ...classes].join(' '));

    if (transition === 'fade' && old) {
      this.fader.style.transitionDuration = `${ms / 2}ms`;
      this.fader.classList.add('on');
      await sleep(ms / 2);
    }

    layer.classList.add(transition === 'cross' || transition === 'morph' ? `enter-${transition}` : 'enter');
    this.view.appendChild(layer);
    // картинки внутри SVG декодируются отдельно — дождаться, пока слой скрыт
    await Promise.race([Promise.all([...layer.querySelectorAll('image')].map((img) => (img.decode ? img.decode().catch(() => {}) : null))), sleep(1500)]);
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

// Активные зоны: { id, group = 'look', label, shape: { points: [[x, y], …] } | { circle: [x, y, r] } }
function hotspotsMarkup(list) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const items = list.map((h) => {
    const shape = h.shape.circle
      ? `<circle class="hs-shape" cx="${h.shape.circle[0].toFixed(1)}" cy="${h.shape.circle[1].toFixed(1)}" r="${h.shape.circle[2].toFixed(1)}"/>`
      : `<polygon class="hs-shape" points="${h.shape.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"/>`;
    return `<g class="hs" data-id="${esc(h.id)}" data-group="${esc(h.group || 'look')}" data-label="${esc(h.label || '')}">${shape}</g>`;
  });
  // мягкое свечение вместо рамки: к краям зоны свет гаснет до нуля
  const glow = (id, c) => `<radialGradient id="${id}" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="${c}" stop-opacity="0.75"/><stop offset="0.55" stop-color="${c}" stop-opacity="0.3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const defs = `<defs>${glow('hs-glow', '#ffd89a')}${glow('hs-glow-p', '#ff9fd0')}${glow('hs-glow-hi', '#fff2c8')}</defs>`;
  return `<g class="hotspots">${defs}${items.join('')}</g>`;
}

// Фон главного меню: два мира, разделённые диагональю
export function titleBackdrop(el) {
  const a = document.createElement('div');
  a.className = 'backdrop-half np';
  a.innerHTML = `<svg viewBox="200 60 1300 731" preserveAspectRatio="xMidYMid slice">${scenes['room-np-night'].build()}</svg>`;
  const b = document.createElement('div');
  b.className = 'backdrop-half p';
  b.innerHTML = `<svg viewBox="150 40 1350 759" preserveAspectRatio="xMidYMid slice">${scenes['kitchen-p-evening'].build()}</svg>`;
  b.querySelectorAll('.letters').forEach((g) => g.remove()); // не подсказывать загадку до игры
  el.append(a, b);
  // каждая половина проявляется, когда её картинки готовы
  [a, b].forEach((half) => {
    const imgs = [...half.querySelectorAll('image')];
    Promise.race([Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null))), sleep(4000)]).then(() => half.classList.add('ready'));
  });
}
