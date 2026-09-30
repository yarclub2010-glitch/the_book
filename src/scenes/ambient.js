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
// Анимации выключаются только настройкой игры: класс .no-motion на #game (см. ambient.css).
import * as A from '../engine/art.js';

const n = (v) => Math.round(v * 10) / 10;
const pl = (src) => A.plate(`assets/backgrounds/${src}`, 1376, 768);

const IMG = {
  knp: pl('K-NP-1.jpg'),
  kp: pl('K-P-1v2-clean.jpg'),
  kpt: pl('K-P-1v2-twin.jpg'),
  kpf: pl('K-P-2v2-night.jpg'),
  bread: pl('K-P-3.jpg'),
  sill: pl('I-SILL-NP-2.jpg'),
  hnp: pl('H-NP-1.jpg'),
  hp: pl('H-P-1v2.jpg'),
  rnp: pl('R-NP-1.jpg'),
  rnpm: pl('R-NP-1-morning.jpg'),
  rp: pl('R-P-1.jpg'),
  vnp: pl('V-NP-1-off.jpg'),
  vdesk: pl('V-NP-2-2.jpg'),
  vp: pl('V-P-1v2.jpg'),
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

// Дождь за окном: два слоя косых струй (дальний — частый и тонкий, ближний — редкий и длинный),
// порывы (весь дождь то густеет, то стихает) и брызги капель о стекло. Всё обрезано рамой стекла.
// rects — стёкла в пикселях картинки; o — насколько заметен (ночью в НП дождь едва виден в темноте)
function rain(key, P, rects, { far = 28, near = 8, splats = 8, seed = 1, color = '#e4eaff', o = 1, slant = 0.14 } = {}) {
  const r = A.rng(seed);
  const id = `amb-${key}-rain2`;
  const clip = `<clipPath id="${id}">${rects.map(([x0, y0, x1, y1]) => `<polygon points="${pts(P, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])}"/>`).join('')}</clipPath>`;
  const layer = (count, [la, lb], w, [oa, ob], [ta, tb]) => {
    let s = '';
    for (let i = 0; i < count; i++) {
      const [x0, y0, x1, y1] = rects[i % rects.length];
      const len = (la + r() * (lb - la)) * P.k;
      const h = (y1 - y0) * P.k;
      // старт левее/правее, чтобы косая струя пересекала всё стекло
      const [x, y] = P.I(x0 + r() * (x1 - x0) + (y1 - y0) * slant * 0.5, y0);
      const d = h + len * 2;
      const t = ta + r() * (tb - ta);
      s += `<line class="amb-streak" x1="${n(x + len * slant)}" y1="${n(y - len * 2)}" x2="${n(x)}" y2="${n(y - len)}" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" opacity="${n((oa + r() * (ob - oa)) * o)}" style="--d:${n(d)}px;--sx:${n(-d * slant)}px;--t:${n(t)}s;animation-delay:${n(-r() * t)}s"/>`;
    }
    return s;
  };
  let s = `${clip}<g clip-path="url(#${id})"><g class="amb-gust" style="--t:${n(6 + r() * 5)}s;animation-delay:${n(-r() * 6)}s">`;
  s += layer(far, [12, 24], 1, [0.16, 0.32], [0.45, 0.7]);
  s += layer(near, [30, 52], 1.8, [0.24, 0.44], [0.6, 0.95]);
  s += '</g>';
  // брызги о стекло: капля ударилась — вспыхнула и растеклась
  for (let i = 0; i < splats; i++) {
    const [x0, y0, x1, y1] = rects[i % rects.length];
    const [x, y] = P.I(x0 + 6 + r() * (x1 - x0 - 12), y0 + 6 + r() * (y1 - y0 - 12));
    const t = 2.2 + r() * 3.5;
    s += `<circle class="amb-splat" cx="${n(x)}" cy="${n(y)}" r="${n((1.4 + r() * 1.4) * P.k)}" fill="none" stroke="${color}" stroke-width="0.9" opacity="0" style="--o:${n(0.55 * o)};--t:${n(t)}s;animation-delay:${n(-r() * t)}s"/>`;
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

// Свет фар с улицы: светлая косая полоса проходит по стене (включается событием life-car)
function sweep(key, P, [x0, y0, x1, y1], color = '#fff1d6', o = 0.22) {
  const [ax, ay] = P.I(x0, y0);
  const [bx, by] = P.I(x1, y1);
  const w = 150 * P.k;
  // без clipPath и градиента (надёжно рисуется при анимации): мягкая полоса — три косые полосы
  // разной ширины; появляется у левого края стены и гаснет у правого
  const band = (k) => `<polygon points="${n(ax + w * (0.9 - 0.5 * k))},${n(ay)} ${n(ax + w * (0.9 + 0.5 * k))},${n(ay)} ${n(ax + w * (0.5 + 0.5 * k))},${n(by)} ${n(ax + w * (0.5 - 0.5 * k))},${n(by)}" fill="${color}" opacity="0.33"/>`;
  return `<g class="amb-car" style="--d:${n(bx - ax - w)}px;--o:${o};mix-blend-mode:screen">${band(1)}${band(0.6)}${band(0.3)}</g>`;
}

// Ночная бабочка кружит у лампы: то прилетает, то пропадает в темноте (SMIL — в своей системе координат)
function moth(P, [cx, cy], rx, ry, seed) {
  const r = A.rng(seed);
  const [x, y] = P.I(cx, cy);
  const k = P.k;
  const t = n(2.8 + r() * 1.2);
  return `<g class="amb-moth" opacity="0"><animate attributeName="opacity" values="0;0.85;0.85;0;0" keyTimes="0;0.05;0.42;0.47;1" dur="${n(24 + r() * 8)}s" begin="${n(-r() * 20)}s" repeatCount="indefinite"/>`
    + `<g transform="translate(${n(x)} ${n(y)})"><g><animateMotion dur="${t}s" repeatCount="indefinite" path="M${n(rx * k)} 0 A${n(rx * k)} ${n(ry * k)} 0 1 1 ${n(-rx * k)} 0 A${n(rx * k)} ${n(ry * k)} 0 1 1 ${n(rx * k)} 0"/>`
    + `<g><animateTransform attributeName="transform" type="scale" values="1 1;1 0.25;1 1" dur="0.11s" repeatCount="indefinite"/>`
    + `<ellipse cx="${n(-2.6 * k)}" cy="0" rx="${n(3.4 * k)}" ry="${n(2 * k)}" fill="#3a2d20"/><ellipse cx="${n(2.6 * k)}" cy="0" rx="${n(3.4 * k)}" ry="${n(2 * k)}" fill="#3a2d20"/>`
    + '</g></g></g></g>';
}

// Огонёк прибора: мигает в своём ритме
function led(P, [px, py], color, t, lo = 0.15) {
  const [x, y] = P.I(px, py);
  return `<circle class="amb-led" cx="${n(x)}" cy="${n(y)}" r="${n(2.2 * P.k)}" fill="${color}" style="--t:${t}s;--lo:${lo}"/>`
    + `<circle class="amb-led" cx="${n(x)}" cy="${n(y)}" r="${n(7 * P.k)}" fill="${color}" opacity="0.25" style="--t:${t}s;--lo:0;mix-blend-mode:screen"/>`;
}

// Предмет на картинке чуть сдвигается сам: копия того же кадра внутри контура предмета
// (класс cls на сцене запускает одноразовое движение; origin — точка опоры в пикселях картинки)
function nudge(key, P, poly, [ox, oy], cls) {
  const id = `amb-${key}-${cls}`;
  const [x, y] = P.I(ox, oy);
  return `<clipPath id="${id}"><polygon points="${pts(P, poly)}"/></clipPath>`
    + `<g clip-path="url(#${id})"><g class="amb-nudge ${cls}-part" style="transform-origin:${n(x)}px ${n(y)}px">${P.image()}</g></g>`;
}

// Тень проходит по стене — будто кто-то прошёл между лампой и стеной
function shadowPass(key, P, [x0, y0, x1, y1]) {
  const [ax, ay] = P.I(x0, y0);
  const [bx, by] = P.I(x1, y1);
  const w = (bx - ax) * 0.28;
  // без clipPath, фильтров и градиентов (надёжно рисуется при анимации): мягкий край — стопкой
  // вложенных полупрозрачных эллипсов. Тень входит у правого края стены и гаснет у левого.
  const cx = bx - w;
  const cy = (ay + by) / 2 + (by - ay) * 0.1;
  const rings = [1, 0.82, 0.66, 0.5, 0.36].map((k) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(w * 0.75 * k)}" ry="${n((by - ay) * 0.52 * k)}" fill="#050308" fill-opacity="0.2"/>`).join('');
  return `<g class="amb-shade" style="--d:${n(-(bx - ax) + w * 2)}px">${rings}</g>`;
}

// Свет на миг проседает — лампа «моргает» (тёмная пелена на весь кадр)
const dip = () => '<rect class="amb-dip" width="1600" height="900" fill="#05040a"/>';

const wrap = (s) => (s ? `<g class="ambient" pointer-events="none" aria-hidden="true">${s}</g>` : '');

// ---------- Сцены ----------

// Кухня НП (K-NP-1): дождь на стекле, пыль в свете лампы; утром — пар над кружкой
const KNP_GLASS = [[88, 12, 340, 575], [392, 112, 530, 488]];
function kitchenNP(time) {
  const P = IMG.knp;
  // утром стекло сухое — дождь был ночью
  let s = time === 'morning' ? '' : rain('knp', P, KNP_GLASS, { far: 34, near: 10, splats: 8, seed: 40, color: '#c4d0e0', o: 1 }) + drops(P, KNP_GLASS, 12, 41);
  s += motes(P, [590, 300, 800, 520], 10, 42, '#ffe2a8', 0.5);
  if (time === 'morning') s += steam(P, [786, 512], 43);
  else {
    s += moth(P, [690, 300], 70, 26, 44);
    s += sweep('knp', P, [560, 0, 1376, 430]);
    // тревога (глава 1): кружка сама чуть поворачивается, по стене проходит тень, свет проседает
    s += nudge('knp', P, [[752, 505], [832, 505], [832, 590], [752, 590]], [790, 585], 'life-mug');
    s += shadowPass('knp', P, [560, 0, 1376, 500]);
    s += dip();
  }
  return s;
}

// Кухня П (K-P-1v2 — та же кухня, что в НП): дождь за стеклом и капли, над тремя кружками пар
const KP_GLASS = [[100, 20, 345, 590], [400, 110, 530, 505], [400, 5, 520, 70]];
function kitchenP(key, P, evening) {
  let s = rain(key, P, KP_GLASS, { far: 34, near: 10, splats: 9, seed: 51 });
  s += drops(P, KP_GLASS, 9, 52, true);
  if (evening) {
    // закатное пятно на стене у холодильника тихо «дышит»
    s += glow(key, P, [965, 380], 150, '#ffb58c', 0.05, 0.2, 7);
    [[708, 492], [767, 486], [789, 510]].forEach((m, i) => { s += steam(P, m, 55 + i).replace(/#f3e9d8/g, '#fbe9f2'); });
  } else {
    // ночью горит лампа на столе — бабочка тут тоже есть
    s += moth(P, [690, 300], 70, 26, 57);
  }
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
  'bread-p': () => rain('brp', IMG.bread, [[1198, 4, 1372, 388]], { far: 10, near: 3, splats: 3, seed: 70 }) + drops(IMG.bread, [[1198, 4, 1372, 388]], 7, 71, true),

  // Подоконник крупно (I-SILL-NP-2): капли по стеклу за подоконником
  'sill-np': () => rain('snp', IMG.sill, [[6, 6, 168, 305], [322, 8, 838, 268], [976, 8, 1236, 192]], { far: 26, near: 7, splats: 6, seed: 80, color: '#c9d3e0', o: 0.8 })
    + drops(IMG.sill, [[6, 6, 168, 305], [322, 8, 838, 268], [976, 8, 1236, 192]], 10, 81),

  // Книга НП (I-BOOK-NP-2): капли на стекле за книгой
  'book-np': () => rain('bnp', IMG.bnp, [[4, 6, 160, 310], [322, 4, 850, 125]], { far: 16, near: 4, splats: 4, seed: 90, color: '#c9d3e0', o: 0.7 }) + drops(IMG.bnp, [[4, 6, 160, 310], [322, 4, 850, 125]], 7, 91),
  // Книга П (I-BOOK-P): капли на стекле над книгой
  'book-p': () => rain('bp', IMG.bp, [[95, 2, 1250, 88]], { far: 20, near: 5, splats: 5, seed: 93 }) + drops(IMG.bp, [[95, 2, 1250, 88]], 8, 92, true),

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

  // Коридор П (H-P-1v2 — тот же коридор, что в НП): свет из Вериной двери дышит, пылинки в нём и у бра
  'hall-p': () => {
    const P = IMG.hp;
    return glow('hp', P, [740, 420], 220, '#ffc878', 0.16, 0.4, 6)
      + motes(P, [700, 200, 800, 590], 8, 121, '#ffe2b0', 0.55)
      + motes(P, [850, 130, 1000, 380], 8, 124, '#ffd89a', 0.5);
  },

  // Комната Тихона НП (R-NP-1): экран ноутбука чуть дрожит (пыль и лампа — уже в сцене)
  'room-np-night': () => screen(IMG.rnp) + sweep('rnp', IMG.rnp, [760, 0, 1376, 330])
    // тревога (глава 1): микрофон на стойке сам качнётся, экран дёрнется, по стене пройдёт тень
    + nudge('rnp', IMG.rnp, [[440, 118], [625, 138], [625, 322], [560, 322], [440, 245]], [600, 305], 'life-mic')
    + `<polygon class="amb-glitch" points="${pts(IMG.rnp, [[371, 245], [440, 232], [463, 305], [393, 318]])}" fill="#dfe8ff"/>`
    + shadowPass('rnp', IMG.rnp, [640, 0, 1376, 520])
    + dip(),
  'room-np-evening': () => screen(IMG.rnp) + sweep('rnp', IMG.rnp, [760, 0, 1376, 330]),
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
    // огоньки приборов на полке и у паяльной станции, шкала приёмника, лупа с подсветкой
    const leds = led(P, [1068, 42], '#7dff9a', 3.1) + led(P, [1236, 30], '#ff5a5a', 1.7, 0.4) + led(P, [1182, 44], '#ffc861', 5.3) + led(P, [508, 492], '#ff6a4a', 2.3, 0.5);
    const radio = `<g class="amb-radio">${glow('rp-radio', P, [775, 470], 34, '#ffb060', 0.25, 0.5, 5)}</g>`;
    const puff = `<g class="amb-puff">${steam(P, [488, 440], 145).replace(/#f3e9d8/g, '#f1ecfa')}</g>`;
    return rain('rp', P, glass, { far: 18, near: 5, splats: 5, seed: 140 }) + drops(P, glass, 6, 142, true) + steam(P, [488, 440], 143).replace(/#f3e9d8/g, '#e9e2f4')
      + glow('rp-lens', P, [265, 445], 80, '#fff2c8', 0.18, 0.34, 6) + leds + radio + puff;
  },

  // Комната Веры НП (V-NP-1-off): пыль в свете настольной лампы (ночник и пыль у кровати — уже в сцене)
  'vera-np': () => motes(IMG.vnp, [1085, 345, 1225, 450], 10, 151, '#ffe6b0', 0.5) + sweep('vnp', IMG.vnp, [120, 40, 700, 380]),
  // Стол Веры (V-NP-2-2): пыль в конусе лампы
  'vera-desk': () => motes(IMG.vdesk, [1040, 295, 1250, 520], 12, 161, '#ffe6b0', 0.55),

  // Комната Веры П (V-P-1v2 — та же комната, что в НП): дождь за тремя стёклами, светится лампа для ногтей,
  // пыль в свете настольной лампы и ночника
  'vera-p': () => {
    const P = IMG.vp;
    const panes = [[722, 72, 850, 385], [870, 58, 1028, 388], [1053, 42, 1230, 390]];
    return rain('vp', P, panes, { far: 36, near: 10, splats: 9, seed: 170 }) + drops(P, panes, 10, 172, true)
      + glow('vp-nail', P, [1203, 470], 60, '#8fa2ff', 0.2, 0.45, 5)
      + motes(P, [1060, 320, 1230, 460], 8, 173, '#ffe6b0', 0.5)
      + motes(P, [620, 360, 720, 470], 6, 174, '#ffd9a0', 0.5);
  },
};

// Экран ноутбука: чуть заметное дрожание подсветки
function screen(P) {
  return `<polygon class="amb-flick" points="${pts(P, [[371, 245], [440, 232], [463, 305], [393, 318]])}" fill="#a8c8ff" opacity="0.05" style="--lo:0.03;--hi:0.09;mix-blend-mode:screen"/>`;
}

// ---------- Жизнь локаций: редкие случайные события ----------
// every — пауза между событиями в секундах [от, до]; cls — класс на <svg> сцены на dur секунд
// (запускает одноразовую анимацию); sfx — звук; when — условие по классам сцены.
const CAR = { every: [45, 90], cls: 'life-car', dur: 3.8, sfx: 'car' };
const CAR_SOUND = { every: [50, 100], sfx: 'car' };
const PIPES = { every: [55, 110], sfx: 'pipes' };
const NEIGHBORS = { every: [80, 160], sfx: 'neighbors' };
const MOTH = { every: [25, 55], sfx: 'moth' };
const BIRDS = { every: [18, 40], sfx: 'birds' };
const PIGEON = { every: [40, 90], sfx: 'pigeon' };
const TWITCH = { every: [35, 80], cls: 'life-twitch', dur: 0.8 };

// Тревожные мелочи главы 1: дом будто живёт сам — только пока глава ставит класс uneasy
const U = (every, cls, dur, sfx) => ({ every, cls, dur, sfx, when: 'uneasy' });
const UNEASY_KITCHEN = [
  U([18, 36], 'life-letter', 0.9, 'magnet'),
  U([22, 44], 'life-note', 1.6),
  U([30, 60], 'life-mug', 1.4, 'clink'),
  U([26, 50], 'life-dip', 1.3, 'buzz'),
  U([34, 70], 'life-shade', 4.2, 'creak'),
  U([40, 80], 'life-photo', 2.4),
];
const UNEASY_ROOM = [
  U([20, 40], 'life-mic', 2.2, 'creak'),
  U([24, 48], 'life-screen', 0.7, 'static'),
  U([28, 56], 'life-dip', 1.3, 'buzz'),
  U([36, 72], 'life-shade', 4.2, 'steps'),
];

const LIFE = {
  'kitchen-np-night': [CAR, PIPES, MOTH, NEIGHBORS, ...UNEASY_KITCHEN],
  'kitchen-np-evening': [CAR, PIPES, MOTH, NEIGHBORS],
  'kitchen-np-morning': [BIRDS, PIPES],
  'kitchen-p': [CAR_SOUND, NEIGHBORS],
  'kitchen-p-evening': [PIGEON, CAR_SOUND],
  'bread-p': [PIGEON],
  'sill-np': [CAR_SOUND],
  'book-np': [CAR_SOUND, PIPES],
  'book-p': [PIGEON],
  'hall-np-night': [TWITCH, PIPES, NEIGHBORS],
  'hall-np-evening': [TWITCH, PIPES, NEIGHBORS],
  'hall-p': [{ every: [20, 40], sfx: 'leak', when: 'vera-here' }, PIGEON],
  'room-np-night': [CAR, PIPES, ...UNEASY_ROOM],
  'room-np-evening': [CAR, PIPES],
  'room-np-morning': [BIRDS, PIPES],
  'room-p': [{ every: [25, 55], sfx: 'crackle', cls: 'life-solder', dur: 1.8 }, { every: [45, 90], sfx: 'static', cls: 'life-radio', dur: 1.1 }, PIGEON],
  'vera-np': [CAR, PIPES],
  'vera-desk': [CAR_SOUND, PIPES],
  'vera-p': [PIGEON, NEIGHBORS],
};

export function lifeFor(sceneId) {
  return LIFE[sceneId] || [];
}

const cache = new Map();
export function ambientFor(sceneId) {
  if (!cache.has(sceneId)) cache.set(sceneId, wrap(BUILD[sceneId] ? BUILD[sceneId]() : ''));
  return cache.get(sceneId);
}
