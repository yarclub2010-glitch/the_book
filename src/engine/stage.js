// Сцена: слои с картинкой, камера (ракурсы), переходы и эффекты.

import { scenes } from '../scenes/index.js';
import { ambientFor } from '../scenes/ambient.js';

const W = 1600;
const H = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Фоны-картинки грузятся заранее: сцена появляется, только когда картинка готова.
// Раскодируются только кадры текущей главы (Stage.prepare) и то, что показывается; остальные файлы
// в фоне по одному подтягиваются в кэш браузера (warm) — кадры большие, держать все раскодированными нельзя.
const images = new Map();
const warmed = new Set();
async function warm(list) {
  await sleep(4000);
  for (const src of list) {
    if (warmed.has(src) || images.has(src)) continue;
    warmed.add(src);
    try {
      await fetch(src, { priority: 'low' }).then((r) => r.blob());
    } catch { /* нет сети — кадр загрузится, когда понадобится */ }
  }
}
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
    // Все картинки всех сцен (фон, фото-якорь, кадры «без книги», погасшее бра, фото предметов) —
    // в кэш браузера, в фоне и по одному; раскодируются по главам (prepare)
    warm([...new Set(Object.keys(scenes).flatMap((id) => this.sceneFiles(id)))]);
  }

  // файлы сцены: всё, что нарисовано картинками, и фотографии предметов для осмотра
  sceneFiles(id) {
    return [...this.images(id), ...(scenes[id].hotspots || []).map((h) => h.view).filter(Boolean)];
  }

  // Подготовить главу: раскодировать кадры всех её мест во все времена суток
  prepare(chapter) {
    const ids = new Set();
    for (const L of Object.values(chapter.locations || {})) {
      for (const time of ['night', 'evening', 'morning']) {
        try {
          ids.add(L.scene({ time, flags: {}, legacy: {}, location: '' }));
        } catch { /* сцена зависит от состояния, которого ещё нет */ }
      }
    }
    ids.forEach((id) => scenes[id] && this.sceneFiles(id).forEach(preload));
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
      this.cache.set(id, `<g class="art" pointer-events="none">${def.build()}${ambientFor(id)}</g>${hotspotsMarkup(def.hotspots || [], id)}`);
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
    svg.querySelectorAll('.hs').forEach((el) => {
      const on = groups.includes(el.dataset.group);
      el.classList.toggle('active', on);
      // с клавиатуры: Tab — по активным зонам, Enter/пробел — осмотреть
      if (on) el.setAttribute('tabindex', '0');
      else el.removeAttribute('tabindex');
    });
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
      // размер — по форме зоны, а не по группе: в группе ещё полноэкранный слой фокуса
      const r = (z.querySelector('.hs-shape') || z).getBoundingClientRect();
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
// Наведение ничего не рисует поверх предмета: вокруг него чуть темнеет, а сам он остаётся
// нетронутым в мягком «окне» с растушёванным краем — как фокус в кино. Никаких пятен и рамок.
function hotspotsMarkup(list, sceneId = 's') {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const uid = String(sceneId).replace(/[^\w-]/g, '_');
  const items = list.map((h, i) => {
    const geom = h.shape.circle
      ? (cls, extra = '') => `<circle class="${cls}" cx="${h.shape.circle[0].toFixed(1)}" cy="${h.shape.circle[1].toFixed(1)}" r="${h.shape.circle[2].toFixed(1)}" ${extra}/>`
      : (cls, extra = '') => `<polygon class="${cls}" points="${h.shape.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" ${extra}/>`;
    const m = `hsm-${uid}-${i}`;
    // размер зоны → мягкость края: мелкой букве — узкая растушёвка, шкафу — широкая
    const pts = h.shape.circle ? [[h.shape.circle[0] - h.shape.circle[2], h.shape.circle[1] - h.shape.circle[2]], [h.shape.circle[0] + h.shape.circle[2], h.shape.circle[1] + h.shape.circle[2]]] : h.shape.points;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const size = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const feather = size < 90 ? 's' : size < 260 ? 'm' : 'l';
    const focus = `<mask id="${m}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${geom('', `fill="#000" filter="url(#hs-feather-${feather})"`)}</mask>`
      + `<rect class="hs-dim" width="${W}" height="${H}" mask="url(#${m})"/>`;
    return `<g class="hs" role="button" aria-label="${esc(h.label || h.id)}" data-id="${esc(h.id)}" data-group="${esc(h.group || 'look')}" data-label="${esc(h.label || '')}">${focus}${geom('hs-shape')}</g>`;
  });
  // растушёвка края «окна»: чем больше зона, тем мягче переход
  const f = (k, d) => `<filter id="hs-feather-${k}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${d}"/></filter>`;
  const defs = `<defs>${f('s', 5)}${f('m', 11)}${f('l', 20)}</defs>`;
  return `<g class="hotspots">${defs}${items.join('')}</g>`;
}

// Фон главного меню: одна и та же кухня в двух мирах, одна плавно переходит в другую по наклонной полосе.
// Кадры кухни «Не приходи» (ночь, лампа) и «Приходи» (закат после дождя) совпадают пиксель в пиксель —
// разрез проходит через одну комнату: окно, подоконник, стол, холодильник. С «жизнью» сцены (капли, пар, бабочка).
export function titleBackdrop(el) {
  const view = '120 20 1480 832';
  const half = (cls, id) => {
    const d = document.createElement('div');
    d.className = `backdrop-half ${cls}`;
    d.innerHTML = `<svg viewBox="${view}" preserveAspectRatio="xMidYMid slice">${scenes[id].build()}${ambientFor(id)}</svg>`;
    // не подсказывать загадку до игры: буквы на холодильнике — только в самой игре
    d.querySelectorAll('.letters').forEach((g) => g.remove());
    return d;
  };
  const a = half('np', 'kitchen-np-night');
  const b = half('p', 'kitchen-p-evening');
  // шов между мирами — мягкая дымка вдоль перехода (стили и движение за мышью: style.css, ui/title.js)
  const seam = document.createElement('div');
  seam.className = 'seam-line';
  el.append(a, b, seam);
  // каждая половина проявляется, когда её картинки готовы
  [a, b].forEach((half) => {
    const imgs = [...half.querySelectorAll('image')];
    Promise.race([Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null))), sleep(4000)]).then(() => half.classList.add('ready'));
  });
}
