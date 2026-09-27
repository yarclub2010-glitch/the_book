// «Жизнь» сцен: тихая фоновая анимация поверх картинки — капли на стекле, пылинки в свете,
// пар над кружкой, мерцание, колыхание занавески. Только transform/opacity, без фильтров.
//
// Подключение (делает ведущий):
//   src/engine/stage.js, markup():
//     `<g class="art" pointer-events="none">${def.build()}${ambientFor(id)}</g>`
//     (и import { ambientFor } from '../scenes/ambient.js';)
//   index.html, в <head>:
//     <link rel="stylesheet" href="src/ui/ambient.css">
//
// Всё рисуется в координатах картинки сцены (plate), как в самих сценах.
// Анимации выключаются классом .no-motion на #game и prefers-reduced-motion (см. ambient.css).
import * as A from '../engine/art.js';

const n = (v) => Math.round(v * 10) / 10;
const pl = (src) => A.plate(`assets/backgrounds/${src}`, 1376, 768);

const IMG = {
  knp: pl('K-NP-1.jpg'),
  kp: pl('K-P-1-clean-book.jpg'),
  kpt: pl('K-P-1-twin-book.jpg'),
  kpf: pl('K-P-2-2.jpg'),
  bread: pl('K-P-3.jpg'),
  sill: pl('I-SILL-NP-2.jpg'),
  hnp: pl('H-NP-1.jpg'),
  hp: pl('H-P-1.jpg'),
  rnp: pl('R-NP-1.jpg'),
  rnpm: pl('R-NP-1-morning.jpg'),
  rp: pl('R-P-1.jpg'),
  vnp: pl('V-NP-1-off.jpg'),
  vdesk: pl('V-NP-2-2.jpg'),
  vp: pl('V-P-1.jpg'),
  bnp: pl('I-BOOK-NP-2.jpg'),
  bp: pl('I-BOOK-P.jpg'),
  note: pl('I-NOTE-P.jpg'),
  miri: pl('I-MIRI-2.jpg'),
};

const pts = (P, list) => list.map(([x, y]) => P.I(x, y).map(n).join(',')).join(' ');

// ---------- Кирпичики ----------

// Капли, медленно сползающие по стеклу рывками. rects — стёкла [x0, y0, x1, y1] в пикселях картинки
function drops(P, rects, count, seed, anime = false) {
  const r = A.rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const [x0, y0, x1, y1] = rects[i % rects.length];
    const px = x0 + 6 + r() * (x1 - x0 - 12);
    const py = y0 + 4 + r() * (y1 - y0) * 0.55;
    const [x, y] = P.I(px, py);
    const d = (y1 - py) * P.k * (0.35 + r() * 0.5);
    const a = (anime ? 2.3 : 1.5) * P.k * (0.75 + r() * 0.6);
    const t = (anime ? 6 : 8) + r() * 8;
    const fill = anime ? '#eef3ff' : '#d6e2ee';
    s += `<g class="amb-drop" style="--d:${n(d)}px;--t:${n(t)}s;animation-delay:${n(-r() * t)}s">`
      + `<line x1="${n(x)}" y1="${n(y - a * (anime ? 4 : 6))}" x2="${n(x)}" y2="${n(y)}" stroke="${fill}" stroke-width="${n(a * 0.55)}" stroke-linecap="round" opacity="${anime ? 0.16 : 0.15}"/>`
      + `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(a)}" ry="${n(a * 1.25)}" fill="${fill}" opacity="${anime ? 0.42 : 0.38}"/>`
      + `<circle cx="${n(x - a * 0.35)}" cy="${n(y - a * 0.4)}" r="${n(a * 0.35)}" fill="#fff" opacity="${anime ? 0.6 : 0.5}"/></g>`;
  }
  return s;
}

// Дождь за стеклом (мир П): тонкие косые штрихи, обрезанные рамой стекла
function streaks(key, P, rects, count, seed) {
  const r = A.rng(seed);
  const id = `amb-${key}-rain`;
  let s = `<clipPath id="${id}">${rects.map(([x0, y0, x1, y1]) => `<polygon points="${pts(P, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])}"/>`).join('')}</clipPath><g clip-path="url(#${id})">`;
  for (let i = 0; i < count; i++) {
    const [x0, y0, x1, y1] = rects[i % rects.length];
    const len = (18 + r() * 18) * P.k;
    const [x, y] = P.I(x0 + r() * (x1 - x0 + 20), y0);
    const d = (y1 - y0) * P.k + len;
    const t = 0.7 + r() * 0.5;
    s += `<line class="amb-streak" x1="${n(x + len * 0.08)}" y1="${n(y - len)}" x2="${n(x)}" y2="${n(y)}" stroke="#e4eaff" stroke-width="1.1" stroke-linecap="round" opacity="${n(0.16 + r() * 0.16)}" style="--d:${n(d)}px;--sx:${n(-d * 0.08)}px;--t:${n(t)}s;animation-delay:${n(-r() * t)}s"/>`;
  }
  return s + '</g>';
}

// Пылинки в луче / в свете лампы. box — область в пикселях картинки
function motes(P, [x0, y0, x1, y1], count, seed, color = '#ffe7b0', bright = 0.55) {
  const r = A.rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const [x, y] = P.I(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0));
    const o = n(bright * (0.45 + r() * 0.55));
    const t = 10 + r() * 10;
    s += `<circle class="amb-mote" cx="${n(x)}" cy="${n(y)}" r="${n((0.8 + r() * 1.3) * P.k)}" fill="${color}" opacity="${o}" style="--o:${o};--dx:${n((r() - 0.5) * 50)}px;--dy:${n((r() - 0.65) * 60)}px;--t:${n(t)}s;animation-delay:${n(-r() * t)}s"/>`;
  }
  return s;
}

// Мягкое световое пятно, которое «дышит»
function glow(key, P, [px, py], rpx, color, lo, hi, t, cls = 'amb-pulse') {
  const id = `amb-${key}-glow`;
  const [x, y] = P.I(px, py);
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="1"/><stop offset="0.5" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`
    + `<circle class="${cls}" cx="${n(x)}" cy="${n(y)}" r="${n(rpx * P.k)}" fill="url(#${id})" opacity="${lo}" style="--lo:${lo};--hi:${hi};--t:${t}s;mix-blend-mode:screen"/>`;
}

// Пар над кружкой: три тонкие струйки
function steam(P, [px, py], seed) {
  const r = A.rng(seed);
  let s = '';
  for (let i = 0; i < 3; i++) {
    const [x, y] = P.I(px + (i - 1) * 7, py);
    const h = (26 + r() * 10) * P.k;
    const w = (4 + r() * 3) * P.k * (i % 2 ? 1 : -1);
    const t = 4.5 + r() * 2;
    s += `<path class="amb-steam" d="M${n(x)} ${n(y)} c${n(w)} ${n(-h * 0.3)} ${n(-w)} ${n(-h * 0.55)} 0 ${n(-h * 0.75)} s${n(w * 0.8)} ${n(-h * 0.2)} ${n(w * 0.3)} ${n(-h * 0.25)}" fill="none" stroke="#f3e9d8" stroke-width="${n(3 * P.k)}" stroke-linecap="round" style="--t:${n(t)}s;animation-delay:${n(-(i * t) / 3)}s"/>`;
  }
  return s;
}

// Занавеска колышется: копия того же кадра внутри контура занавески чуть перекашивается от карниза
function curtain(key, P, poly, [tx, ty]) {
  const id = `amb-${key}-curtain`;
  const [ox, oy] = P.I(tx, ty);
  return `<clipPath id="${id}"><polygon points="${pts(P, poly)}"/></clipPath>`
    + `<g clip-path="url(#${id})"><g class="amb-sway" style="transform-origin:${n(ox)}px ${n(oy)}px">${P.image()}</g></g>`;
}

const wrap = (s) => (s ? `<g class="ambient" pointer-events="none" aria-hidden="true">${s}</g>` : '');

// ---------- Сцены ----------

// Кухня НП (K-NP-1): дождь на стекле, пыль в свете лампы; утром — пар над кружкой
const KNP_GLASS = [[88, 12, 340, 575], [392, 112, 530, 488]];
function kitchenNP(time) {
  const P = IMG.knp;
  let s = drops(P, KNP_GLASS, 12, 41);
  s += motes(P, [590, 300, 800, 520], 10, 42, '#ffe2a8', 0.5);
  if (time === 'morning') s += steam(P, [786, 512], 43);
  return s;
}

// Кухня П (K-P-1): дождь за стеклом и капли, занавеска колышется
const KP_GLASS = [[234, 2, 448, 342], [480, 82, 598, 328], [608, 2, 694, 66]];
function kitchenP(key, P, evening) {
  let s = streaks(key, P, KP_GLASS, 14, 51);
  s += drops(P, KP_GLASS, 9, 52, true);
  s += curtain(key, P, [[56, 0], [250, 0], [250, 474], [150, 470], [72, 440], [56, 380]], [150, 0]);
  // вечером солнечный блик на стене тихо «дышит»
  if (evening) s += glow(key, P, [995, 285], 120, '#ffb58c', 0.05, 0.22, 7);
  return s;
}

const BUILD = {
  'kitchen-np-night': () => kitchenNP('night'),
  'kitchen-np-evening': () => kitchenNP('evening'),
  'kitchen-np-morning': () => kitchenNP('morning'),
  'kitchen-p': () => kitchenP('kpt', IMG.kpt, false),
  'kitchen-p-evening': () => kitchenP('kp', IMG.kp, true),

  // Дверца крупно (K-P-2-2): солнечная полоса на стене дышит, в ней пара пылинок
  'kitchen-p-fridge': () => {
    const P = IMG.kpf;
    return `<polygon class="amb-pulse" points="${pts(P, [[188, 44], [304, 44], [304, 612], [188, 612]])}" fill="#ffa874" opacity="0.02" style="--lo:0.02;--hi:0.13;--t:8s;mix-blend-mode:screen"/>`
      + motes(P, [195, 80, 300, 590], 6, 61, '#ffd7b8', 0.6);
  },

  // Хлебница (K-P-3): капли на окне справа
  'bread-p': () => drops(IMG.bread, [[1198, 4, 1372, 388]], 7, 71, true),

  // Подоконник крупно (I-SILL-NP-2): капли по стеклу за подоконником
  'sill-np': () => drops(IMG.sill, [[6, 6, 168, 305], [322, 8, 838, 268], [976, 8, 1236, 192]], 10, 81),

  // Книга НП (I-BOOK-NP-2): капли на стекле за книгой
  'book-np': () => drops(IMG.bnp, [[4, 6, 160, 310], [322, 4, 850, 125]], 7, 91),
  // Книга П (I-BOOK-P): капли на стекле над книгой
  'book-p': () => drops(IMG.bp, [[95, 2, 1250, 88]], 8, 92, true),

  // Записка (I-NOTE-P / -UV): только в ультрафиолете — лампа дрожит, по бумаге пробегает отсвет
  'note-p': () => {
    const P = IMG.note;
    const poly = [[438, 160], [860, 110], [980, 628], [500, 672]];
    const [cx, cy] = P.I(709, 390);
    const h = 760 * P.k;
    const w = 80 * P.k;
    return `<g class="amb-uv">${glow('note', P, [1250, 385], 240, '#8f5cff', 0.35, 0.6, 3, 'amb-flick')}`
      + `<defs><linearGradient id="amb-note-sheen" x1="0" x2="1"><stop offset="0" stop-color="#e2d6ff" stop-opacity="0"/><stop offset="0.5" stop-color="#e2d6ff" stop-opacity="0.2"/><stop offset="1" stop-color="#e2d6ff" stop-opacity="0"/></linearGradient>`
      + `<clipPath id="amb-note-clip"><polygon points="${pts(P, poly)}"/></clipPath></defs>`
      + `<g clip-path="url(#amb-note-clip)"><g transform="rotate(18 ${n(cx)} ${n(cy)})"><rect class="amb-sheen" x="${n(cx - w / 2)}" y="${n(cy - h / 2)}" width="${n(w)}" height="${n(h)}" fill="url(#amb-note-sheen)" style="--from:${n(-420 * P.k)}px;--to:${n(420 * P.k)}px;mix-blend-mode:screen"/></g></g></g>`;
  },

  // Колонка крупно (I-MIRI-2): пыль в тёплом свете слева
  'miri-close': () => motes(IMG.miri, [60, 380, 330, 720], 12, 101, '#ffcf8a', 0.6),

  // Коридор НП (H-NP-1): пыль в свете бра (само бра уже мерцает в сцене)
  'hall-np-night': () => motes(IMG.hnp, [830, 130, 1010, 420], 12, 111, '#ffd89a', 0.5),
  'hall-np-evening': () => motes(IMG.hnp, [830, 130, 1010, 420], 12, 111, '#ffd89a', 0.5),

  // Коридор П (H-P-1): свет из Вериной двери дышит, пылинки в нём; дождь в окне справа
  'hall-p': () => {
    const P = IMG.hp;
    const glass = [[1204, 36, 1372, 176], [1204, 196, 1282, 450], [1302, 186, 1376, 460]];
    return glow('hp', P, [955, 390], 240, '#ffc878', 0.18, 0.42, 6)
      + motes(P, [890, 200, 1030, 620], 8, 121, '#ffe2b0', 0.55)
      + streaks('hp', P, glass, 10, 122)
      + drops(P, glass, 7, 123, true);
  },

  // Комната Тихона НП (R-NP-1): экран ноутбука чуть дрожит (пыль и лампа — уже в сцене)
  'room-np-night': () => screen(IMG.rnp),
  'room-np-evening': () => screen(IMG.rnp),
  // Утро (R-NP-1-morning): пылинки плывут в косом луче из окна
  'room-np-morning': () => {
    const P = IMG.rnpm;
    const r = A.rng(131);
    let s = '';
    for (let i = 0; i < 16; i++) {
      const t = r();
      const px = 730 + t * 110 + (r() - 0.5) * (60 + t * 120);
      const py = 110 + t * 480;
      s += motes(P, [px, py, px + 1, py + 1], 1, 1000 + i, '#fff0c8', 0.75);
    }
    return s;
  },

  // Мастерская двойника (R-P-1): дождь на левом стекле, дымок над паяльником
  'room-p': () => {
    const P = IMG.rp;
    const glass = [[6, 6, 284, 318]];
    return streaks('rp', P, glass, 10, 141) + drops(P, glass, 6, 142, true) + steam(P, [488, 440], 143).replace(/#f3e9d8/g, '#e9e2f4');
  },

  // Комната Веры НП (V-NP-1-off): пыль в свете настольной лампы (ночник и пыль у кровати — уже в сцене)
  'vera-np': () => motes(IMG.vnp, [1085, 345, 1225, 450], 10, 151, '#ffe6b0', 0.5),
  // Стол Веры (V-NP-2-2): пыль в конусе лампы
  'vera-desk': () => motes(IMG.vdesk, [1040, 295, 1250, 520], 12, 161, '#ffe6b0', 0.55),

  // Комната Веры П (V-P-1): дождь за большим окном и в дальнем окошке
  'vera-p': () => {
    const P = IMG.vp;
    const big = [[1028, 178, 1133, 488], [1162, 183, 1278, 548], [1035, 15, 1283, 143]];
    return streaks('vp', P, [...big, [282, 78, 398, 235]], 16, 171) + drops(P, big, 10, 172, true);
  },
};

// Экран ноутбука: чуть заметное дрожание подсветки
function screen(P) {
  return `<polygon class="amb-flick" points="${pts(P, [[371, 245], [440, 232], [463, 305], [393, 318]])}" fill="#a8c8ff" opacity="0.05" style="--lo:0.03;--hi:0.09;mix-blend-mode:screen"/>`;
}

const cache = new Map();
export function ambientFor(sceneId) {
  if (!cache.has(sceneId)) cache.set(sceneId, wrap(BUILD[sceneId] ? BUILD[sceneId]() : ''));
  return cache.get(sceneId);
}
