// Кухня в двух мирах (закон 1 — общее место), разный стиль и жизнь.
// kitchen-np-night / kitchen-np-morning — реализм (кадр K-NP-1), ночь и утро;
// kitchen-p — ночь после дождя, аниме (K-P-1); kitchen-p-fridge — дверца крупно (K-P-2).
// Картинка — фон; поверх рисуется то, что живёт и меняется: буквы, записки, фото-якорь, поезд.
import * as A from '../engine/art.js';
import { audio } from '../engine/audio.js';

const PHOTO = 'assets/backgrounds/I-PHOTO.jpg';
const ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const LETTER_COLORS = ['#e2582f', '#e0a93a', '#3a6fb0', '#3e9a5c', '#8a4fb0'];

const BG = {
  np: A.plate('assets/backgrounds/K-NP-1.jpg', 1376, 768),
  // мир П — та же кухня, что в НП, с той же точки и пиксель в пиксель (K-P-1v2 нарисованы по K-NP-1):
  // при переходе между мирами меняются только стиль и свет. Буквы, записка, фото и книга рисуются поверх.
  p: A.plate('assets/backgrounds/K-P-1v2-clean.jpg', 1376, 768), // вечер после дождя, три кружки
  pt: A.plate('assets/backgrounds/K-P-1v2-twin.jpg', 1376, 768), // та же кухня ночью, двойник у холодильника
  // дверца крупно — только в финале главы 1, ночью: ночной кадр, выровнен по пикселям с дневным K-P-2-2
  pf: A.plate('assets/backgrounds/K-P-2v2-night.jpg', 1376, 768),
  // утро в НП: отдельный рассветный кадр (сухое стекло, туман), выровнен по пикселям с K-NP-1
  npm: A.plate('assets/backgrounds/K-NP-1-morning.jpg', 1376, 768),
};

// ---------- Магнитные буквы ----------
// Мир НП: алфавит на нижней дверце (K-NP-1). Сдвинуты не до конца (закон 4): «У» осталась на месте.
const NP_DOOR = { x: 1040, y: 452, dx: 38, dy: 45, size: 31 };
// Сдвинутые буквы почти на своих местах: съехали на несколько пикселей и перекошены.
// Дыр в алфавите нет — заметить можно, только присмотревшись (или помня, как было).
// [сдвиг x, сдвиг y, поворот] в пикселях картинки
const MOVED_NP = { Х: [5, 7, -13], О: [-4, 8, 11], Д: [6, 5, 14], И: [-5, 9, -12] };
const WORD_NP = ['Х', 'О', 'Д', 'И'];
// Мир П, дверца крупно (K-P-2): двойник выкладывает ровный ряд «УХОДИ»
const P_DOOR = { x: 500, y: 250, dx: 92, dy: 86, size: 64 };
const ROW_P = { У: [540, 712], Х: [625, 712], О: [710, 712], Д: [795, 712], И: [880, 712] };
// Мир П, общий план (K-P-1-clean): «УХОДИ» так и висит внизу дверцы с прошлой ночи
const PW_DOOR = { x: 1040, y: 452, dx: 38, dy: 45, size: 31 };
const ROW_PW = { У: [1078, 668], Х: [1116, 668], О: [1154, 668], Д: [1192, 668], И: [1230, 674] };

function letterLayout(world, row = true) {
  const B = { np: BG.np, p: BG.pf, pw: BG.p }[world];
  const D = { np: NP_DOOR, p: P_DOOR, pw: PW_DOOR }[world];
  const size = D.size * B.k;
  return [...ALPHABET].map((ch, i) => {
    const r = A.rng(i * 7 + (world === 'np' ? 3 : 5));
    const px = D.x + (i % 6) * D.dx + (r() - 0.5) * 8;
    const py = D.y + Math.floor(i / 6) * D.dy + (r() - 0.5) * 8;
    const home = B.I(px, py);
    const rot = ((i * 37) % 9) - 4;
    const l = { ch, home, pos: home, rot, homeRot: rot, moved: false, size, color: LETTER_COLORS[i % LETTER_COLORS.length] };
    if (world === 'np' && MOVED_NP[ch]) {
      const [dx, dy, mr] = MOVED_NP[ch];
      Object.assign(l, { pos: B.I(px + dx, py + dy), rot: mr, moved: true });
    }
    if (world === 'pw' && row && ROW_PW[ch]) Object.assign(l, { pos: B.I(...ROW_PW[ch]), rot: 0 });
    if (world === 'p' && ROW_P[ch]) {
      const to = B.I(...ROW_P[ch]);
      Object.assign(l, { dx: to[0] - home[0], dy: to[1] - home[1] });
    }
    return l;
  });
}

function letters(world, row = true) {
  const fw = world === 'np' ? 'np' : 'p';
  const stroke = fw === 'p' ? '#1b1438' : '#2a2018';
  // мир НП: лампа слева — чем правее и ниже буква, тем глубже она в тени дверцы
  const shade = (pos) => {
    if (world !== 'np') return '';
    const t = Math.min(1, Math.max(0, (pos[0] - xs[0]) / (xs[1] - xs[0] || 1)));
    const v = Math.min(1, Math.max(0, (pos[1] - ys[0]) / (ys[1] - ys[0] || 1)));
    return ` style="filter:brightness(${(1 - 0.42 * t - 0.12 * v).toFixed(2)})"`;
  };
  const one = (l, pos, rot, cls) => {
    const extra = l.dx !== undefined ? ` data-dx="${l.dx.toFixed(1)}" data-dy="${l.dy.toFixed(1)}"` : '';
    return `<g class="mag${cls}" data-ch="${l.ch}"${extra}${shade(pos)}><g transform="translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)}) rotate(${rot})"><text fill="${l.color}" stroke="${stroke}" stroke-width="${fw === 'p' ? 2.2 * layout[0].size / 60 + 0.8 : 1}">${l.ch}</text><text fill="url(#mag-shine)" stroke="none">${l.ch}</text></g></g>`;
  };
  const layout = letterLayout(world, row);
  const xs = [Math.min(...layout.map((l) => l.home[0])), Math.max(...layout.map((l) => l.home[0]))];
  const ys = [Math.min(...layout.map((l) => l.home[1])), Math.max(...layout.map((l) => l.home[1]))];
  let s = `<g class="letters" font-family="Rubik, 'Arial Black', sans-serif" font-weight="900" font-size="${layout[0].size.toFixed(1)}" text-anchor="middle" style="filter:url(#k${fw}-mag)${world === 'np' ? ' brightness(0.82) saturate(0.8)' : ''}">`;
  for (const l of layout) {
    if (l.moved) {
      s += one(l, l.home, l.homeRot, ' at-home') + one(l, l.pos, l.rot, ' moved');
    } else {
      s += one(l, l.pos, l.rot, '');
    }
  }
  return s + '</g>';
}

// Фото-якорь: одна и та же настоящая фотография в обоих мирах — вклеена в рамку на полке
function anchor(B, id, [x0, y0, x1, y1]) {
  const [a, b] = [B.I(x0, y0), B.I(x1, y1)];
  const [w, h] = [b[0] - a[0], b[1] - a[1]];
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return `<clipPath id="${id}-clip"><rect x="${a[0]}" y="${a[1]}" width="${w}" height="${h}"/></clipPath>
    <circle id="${id}-glow" class="photoglow" cx="${c[0]}" cy="${c[1]}" r="${Math.max(w, h) * 1.1}" fill="url(#${id}-g)" style="mix-blend-mode:screen"/>
    <image href="${PHOTO}" x="${a[0]}" y="${a[1]}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-clip)"/>
    <rect x="${a[0]}" y="${a[1]}" width="${w}" height="${h}" fill="#000" opacity="0.12"/>
    <text class="anchor-ne" x="${c[0]}" y="${a[1] + h * 0.86}" text-anchor="middle" font-family="Caveat, cursive" font-size="${(h * 0.34).toFixed(1)}" fill="#1a1020" stroke="#fffbe8" stroke-width="0.6" opacity="0.9">Не</text>`;
}

// Магнитик, который держит бумажку: круглый, с бликом и тенью
function magnet([x, y], color = '#b8322a') {
  return `<circle cx="${(x + 1.2).toFixed(1)}" cy="${(y + 2).toFixed(1)}" r="5.2" fill="#000" opacity="0.35"/>`
    + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}"/>`
    + `<circle cx="${(x - 1.5).toFixed(1)}" cy="${(y - 1.6).toFixed(1)}" r="1.6" fill="#fff" opacity="0.45"/>`;
}

// Бумажка на дверце холодильника: не белый прямоугольник, а лист — фактура, свет гаснет к краю,
// уголок чуть отогнут, держится на магнитике, написано шариковой ручкой
function paper(B, [x, y, w, h], rot, fill, lines, size, ink = '#27325c') {
  const [p, q] = [B.I(x, y), B.I(x + w, y + h)];
  const [pw, ph] = [q[0] - p[0], q[1] - p[1]];
  const [x1, y1] = [p[0] + pw, p[1] + ph];
  const c = 7; // отогнутый уголок
  const shape = `M${p[0]} ${p[1]} H${x1} V${y1 - c} L${x1 - c} ${y1} H${p[0]} Z`;
  let s = `<g transform="rotate(${rot} ${p[0].toFixed(1)} ${p[1].toFixed(1)})">`;
  s += `<path d="${shape}" fill="${fill}" filter="url(#paper-tex)"/>`;
  s += `<path d="${shape}" fill="url(#paper-light)"/>`;
  s += `<path d="M${x1} ${y1 - c} L${x1 - c} ${y1 - c * 0.35} L${x1 - c} ${y1} Z" fill="#000" opacity="0.18"/>`;
  lines.forEach((t, i) => {
    const ty = p[1] + size + 5 + i * (size + 2);
    s += `<text x="${p[0] + 7}" y="${ty}" font-family="Caveat, cursive" font-size="${size}" fill="${ink}" opacity="0.88" transform="rotate(${i % 2 ? 0.8 : -0.6} ${p[0] + 7} ${ty})">${t}</text>`;
  });
  s += magnet([p[0] + pw / 2, p[1] + 3]);
  return s + '</g>';
}

function commonDefs(world) {
  return `<defs>
    <filter id="k${world}-mag" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.4" flood-color="#000" flood-opacity="${world === 'p' ? 0.35 : 0.6}"/></filter>
    <filter id="paper-shadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-opacity="0.45"/></filter>
    <!-- бумага: зерно и неровный тон + мягкая тень на дверце -->
    <filter id="paper-tex" x="-10%" y="-10%" width="130%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.28 0" result="grain"/>
      <feComposite in="grain" in2="SourceGraphic" operator="in" result="g"/>
      <feBlend in="g" in2="SourceGraphic" mode="multiply" result="t"/>
      <feDropShadow in="t" dx="1.6" dy="2.6" stdDeviation="1.8" flood-opacity="0.5"/>
    </filter>
    <linearGradient id="paper-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.6" stop-color="#3a2a18" stop-opacity="0.08"/><stop offset="1" stop-color="#2a1a0c" stop-opacity="0.3"/></linearGradient>
    <!-- восковой мелок: линия дрожит и местами рвётся -->
    <filter id="crayon" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="1.6" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" result="gaps"/>
      <feColorMatrix in="gaps" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.8 -0.25" result="m"/>
      <feComposite in="d" in2="m" operator="in"/>
    </filter>
    <!-- блик на пластиковой букве-магните -->
    <linearGradient id="mag-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.42"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.06"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>
    <radialGradient id="k${world}-photo-g"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.9"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
    <radialGradient id="k${world}-lamp"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.25"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient>
    <radialGradient id="k${world}-dawn"><stop offset="0" stop-color="#f6d3a0" stop-opacity="0.45"/><stop offset="0.6" stop-color="#f3c58a" stop-opacity="0.15"/><stop offset="1" stop-color="#f3c58a" stop-opacity="0"/></radialGradient>
  </defs>`;
}

// Семафор за окном: ровный красный; иногда переключается на зелёный и обратно (CSS, цикл ~75 с).
// Красный огонь нарисован на картинке — на время зелёного его закрывает тёмное пятно.
function semaphore(B, [x, y], r = 11) {
  const [cx, cy] = B.I(x, y);
  const k = B.k;
  return `<g class="semaphore">
    <radialGradient id="sem-g"><stop offset="0" stop-color="#b8ffd0"/><stop offset="0.25" stop-color="#3dff8a" stop-opacity="0.9"/><stop offset="1" stop-color="#3dff8a" stop-opacity="0"/></radialGradient>
    <radialGradient id="sem-r"><stop offset="0" stop-color="#ff5a45" stop-opacity="0.5"/><stop offset="1" stop-color="#ff5a45" stop-opacity="0"/></radialGradient>
    <circle class="sem-red" cx="${cx}" cy="${cy}" r="${r * 3.2 * k}" fill="url(#sem-r)" style="mix-blend-mode:screen"/>
    <circle class="sem-cover" cx="${cx}" cy="${cy}" r="${r * 1.25 * k}" fill="#15110f"/>
    <circle class="sem-green" cx="${cx}" cy="${cy}" r="${r * 3.2 * k}" fill="url(#sem-g)" style="mix-blend-mode:screen"/>
  </g>`;
}

// ---------- Мир «Не приходи» ----------
function buildNP(time) {
  const B = BG.np;
  const night = time === 'night';
  // утро — свой кадр (та же разметка), вечер — ночной кадр чуть светлее
  let s = commonDefs('np') + (time === 'morning' ? BG.npm.image('class="bg"') : B.image(`class="bg bg-${time}"`));
  s += semaphore(B, [247, 236]);
  // тёплый круг от лампы на столе
  const lamp = B.I(690, 380);
  s += `<circle class="flicker" cx="${lamp[0]}" cy="${lamp[1]}" r="380" fill="url(#knp-lamp)" style="mix-blend-mode:screen"/>`;
  s += anchor(B, 'knp-photo', [977, 71, 1044, 145]);
  s += miri(B);
  s += sillBook(B);
  // на морозилке: детский рисунок и мамина записка (в главе 2 — другая: мама на смене)
  // всё бумажное — под свет кухни: ночью лампа тёплая и тусклая, утром светлее
  const light = time === 'morning' ? 'brightness(0.88) sepia(0.25)' : 'brightness(0.66) sepia(0.45)';
  s += `<g class="np-props" style="filter:${light}">`;
  s += drawing(B);
  s += `<g class="note-a">${paper(B, [1128, 262, 96, 66], 3, '#efe6c8', ['Суп в кастрюле.', 'Я у тёти Гали,', 'буду в 9. Мама'], 13)}</g>`;
  s += `<g class="note-b">${paper(B, [1128, 262, 96, 66], -2, '#efe6c8', ['Я на смене', 'до утра. Ужин', 'в холодильнике.'], 12)}</g>`;
  // нераспечатанное письмо из Петербурга на столе
  s += envelope(B);
  s += '</g>';
  s += letters('np');
  if (night) s += `<rect width="1600" height="900" fill="#0a1020" opacity="0.18"/>`;
  return s;
}

// Умная колонка «Мири» на полке: тканевая шайба, светящееся кольцо (горит ярче, когда слушает)
function miri(B) {
  const [x, y] = B.I(1105, 157); // низ колонки на полке
  // низкая «шайба» — как на крупном плане полки (I-MIRI-2)
  const w = 34 * B.k;
  const h = 15 * B.k;
  return `<g class="miri">
    <defs><linearGradient id="miri-cloth" x1="0" x2="1"><stop offset="0" stop-color="#2b2724"/><stop offset="0.45" stop-color="#5a534c"/><stop offset="1" stop-color="#1f1c1a"/></linearGradient></defs>
    <ellipse cx="${x}" cy="${y}" rx="${w / 2 + 3}" ry="4" fill="#000" opacity="0.5"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="4" fill="url(#miri-cloth)"/>
    <ellipse cx="${x}" cy="${y - h}" rx="${w / 2}" ry="5" fill="#1a1716"/>
    <ellipse class="miri-ring" cx="${x}" cy="${y - h}" rx="${w / 2 - 2}" ry="3.6" fill="none" stroke="#9f8cff" stroke-width="2.4"/>
  </g>`;
}

// Верина книга на подоконнике (глава 2: Тихон кладёт её туда сам)
// Лежит плашмя на доске подоконника и повторяет её перспективу: доска уходит вправо-вверх
// (задний край у рамы: (420,536)→(550,479), передний: (480,560)→(636,483) — наклон ≈ −0.45),
// глубина доски тут ≈ 50 px; книга — на ~60 % глубины, чуть отступив от рамы.
// Углы в пикселях кадра (K-NP-1 / K-P-1v2 — пиксель в пиксель): задний левый, задний правый,
// передний правый, передний левый. Видны верх, передний обрез (страницы) и левый торец.
const SILL_BOOK_AT = [[468, 519], [548, 484], [542, 512], [462, 547]];
function sillBook(B, swollen = false) {
  const P4 = (dy) => SILL_BOOK_AT.map(([x, y]) => B.I(x, y + dy));
  const top = P4(0);
  const bottom = P4(swollen ? 9 : 7);
  const side = [top[3], top[2], bottom[2], bottom[3]].join(' ');
  // точка на переднем обрезе: t — доля от левого угла к правому
  const along = (t, dy = 0) => {
    const [[x3, y3], [x2, y2]] = [SILL_BOOK_AT[3], SILL_BOOK_AT[2]];
    return B.I(x3 + (x2 - x3) * t, y3 + (y2 - y3) * t + dy);
  };
  // тень вытянута вдоль доски (наклон доски ≈ −24°)
  const [sx, sy] = B.I(505, 522);
  const shadow = (fill, op, extra = '') => `<ellipse cx="${sx}" cy="${sy}" rx="${52 * B.k}" ry="${12 * B.k}" fill="${fill}" opacity="${op}" transform="rotate(-24 ${sx} ${sy})" ${extra}/>`;
  // книгу сдвинули в другом мире (класс book-shifted) — у нас она тоже съехала и повёрнута
  const [px, py] = B.I(505, 515);
  if (swollen) {
    // мир П: тот же том, но бирюзовый переплёт и вздувшийся от воды блок страниц (обрез волной)
    const wave = `M${along(0, 4)} Q${along(0.25, 7)} ${along(0.5, 4)} T${along(1, 4)}`;
    return `${shadow('#2a1030', 0.35)}
      <polygon points="${side}" fill="#f1e2cf"/>
      <path d="${wave}" fill="none" stroke="#b9a18a" stroke-width="1.4"/>
      <polygon points="${[top[0], top[3], bottom[3], bottom[0]].join(' ')}" fill="#1d3c48"/>
      <polygon points="${top.join(' ')}" fill="#3f8f98" stroke="#1d3c48" stroke-width="1.4"/>
      <polygon points="${top.join(' ')}" fill="#ffc1d8" opacity="0.18"/>`;
  }
  return `<g class="sill-book"><g class="sill-book-pose" style="transform-origin:${px.toFixed(0)}px ${py.toFixed(0)}px">
    <defs><linearGradient id="sb-cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d3646"/><stop offset="0.55" stop-color="#232a37"/><stop offset="1" stop-color="#151a22"/></linearGradient>
    <linearGradient id="sb-lamp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb96b" stop-opacity="0"/><stop offset="1" stop-color="#ffb96b" stop-opacity="0.22"/></linearGradient>
    <linearGradient id="sb-pages" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2d0" stop-opacity="0.35"/><stop offset="1" stop-color="#3a2a14" stop-opacity="0.35"/></linearGradient>
    <filter id="sb-blur"><feGaussianBlur stdDeviation="4"/></filter></defs>
    ${shadow('#000', 0.55, 'filter="url(#sb-blur)"')}
    <polygon points="${side}" fill="#b9a883"/>
    <polygon points="${side}" fill="url(#sb-pages)"/>
    <polygon points="${top.join(' ')}" fill="url(#sb-cloth)" stroke="#0e131c" stroke-width="1" filter="url(#paper-tex)"/>
    <polygon points="${[top[0], top[3], bottom[3], bottom[0]].join(' ')}" fill="#0e131d"/>
    <polygon points="${top.join(' ')}" fill="url(#sb-lamp)"/>
    <!-- потёртые углы и закладки, как на крупном плане -->
    <polyline points="${top[0]} ${top[1]}" stroke="#6f7a8c" stroke-width="1" opacity="0.5" fill="none"/>
    <polygon points="${along(0.62, -1)} ${along(0.69, -1)} ${along(0.69, 10)} ${along(0.62, 10)}" fill="#e2d3ae"/>
    <polygon points="${along(0.8, -1)} ${along(0.86, -1)} ${along(0.86, 9)} ${along(0.8, 9)}" fill="#d8c69c"/>
  </g></g>`;
}

// Детский рисунок: дом, поезд над крышей, четыре человечка, один зачёркнут — восковыми мелками
// на пожелтевшем листе, прижат магнитиком
function drawing(B) {
  const [p, q] = [B.I(1016, 250), B.I(1106, 345)];
  const rot = `rotate(-5 ${p[0].toFixed(1)} ${p[1].toFixed(1)})`;
  const k = (q[0] - p[0]) / 90;
  const X = (v) => (p[0] + v * k).toFixed(1);
  const Y = (v) => (p[1] + v * k).toFixed(1);
  const people = [0, 1, 2, 3].map((i) => `<path d="M${X(18 + i * 14)} ${Y(96)} l4 -8 l4 8 M${X(22 + i * 14)} ${Y(88)} v-9 M${X(17 + i * 14)} ${Y(83)} h10"/><circle cx="${X(22 + i * 14)}" cy="${Y(75)}" r="${(3.6 * k).toFixed(1)}"/>`).join('');
  const W = q[0] - p[0];
  const H = q[1] - p[1];
  const sheet = `M${p[0]} ${p[1]} h${W} v${H - 6} l-6 6 h${-(W - 6)} z`;
  return `<g transform="${rot}">
    <path d="${sheet}" fill="#efe4c6" filter="url(#paper-tex)"/>
    <path d="${sheet}" fill="url(#paper-light)"/>
    <g fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#crayon)" opacity="0.9">
      <path d="M${X(12)} ${Y(62)} h40 v-24 l-20 -16 l-20 16 z" stroke="#2f5d9e"/>
      <path d="M${X(24)} ${Y(62)} v-10 h8 v10" stroke="#8a5a2b"/>
      <path d="M${X(4)} ${Y(13)} h74" stroke="#3b3b3b"/>
      <path d="M${X(14)} ${Y(5)} h28 v8 h-28 z" stroke="#d2552e"/>
      <path d="M${X(18)} ${Y(15)} a2 2 0 1 0 0.1 0 M${X(36)} ${Y(15)} a2 2 0 1 0 0.1 0" stroke="#3b3b3b"/>
      <g stroke="#3b3b3b">${people}</g>
      <path d="M${X(58)} ${Y(97)} l10 -21 M${X(68)} ${Y(97)} l-10 -21" stroke="#c7362a" stroke-width="2.2"/>
    </g>
    ${magnet([p[0] + W / 2, p[1] + 3], '#2b5fa8')}
  </g>`;
}

// Нераспечатанное письмо из Петербурга: конверт с маркой, штемпелем и адресом «от руки»
function envelope(B) {
  const pts = [B.I(515, 590), B.I(598, 588), B.I(604, 622), B.I(508, 625)].map((v) => v.map((n) => n.toFixed(1)).join(' ')).join(' ');
  const [sx, sy] = B.I(582, 593);
  const [ax, ay] = B.I(522, 606);
  return `<g transform="rotate(-8 ${B.I(530, 600)})">
    <polygon points="${pts}" fill="#ddd2b6" filter="url(#paper-tex)"/>
    <polygon points="${pts}" fill="url(#paper-light)"/>
    <rect x="${sx}" y="${sy}" width="10" height="12" fill="#f4efe2" stroke="#f4efe2" stroke-width="1.4" stroke-dasharray="1 1"/>
    <rect x="${sx + 1.4}" y="${sy + 1.4}" width="7.2" height="9.2" fill="#3f6a9c"/>
    <circle cx="${sx - 2}" cy="${sy + 7}" r="6" fill="none" stroke="#5a4a6a" stroke-width="0.8" opacity="0.6"/>
    <g stroke="#2f3a60" stroke-width="0.9" opacity="0.65" fill="none" stroke-linecap="round">
      <path d="M${ax} ${ay} q6 -1.2 12 0 t12 0 t9 0"/>
      <path d="M${ax + 2} ${ay + 5} q6 -1 12 0 t14 0"/>
      <path d="M${ax + 4} ${ay + 10} q6 -1 12 0 t8 0"/>
    </g>
  </g>`;
}

// ---------- Мир «Приходи» ----------
function buildP(withTwin) {
  const B = BG.p;
  let s = commonDefs('p') + (withTwin ? BG.pt : BG.p).image('class="bg"');
  // всё, что лежит поверх картинки; ночью (кадр с двойником) — приглушено под свет сцены
  let o = '';
  o += anchor(B, 'kp-photo', [977, 71, 1044, 145]);
  o += paper(B, [1140, 250, 88, 50], -3, '#fbf3ee', ['Купи хлеб!!', '— В.'], 13, '#5a2a6a');
  // Верина книга на подоконнике — лежит здесь шесть лет, страницы вздулись
  o += `<g class="sill-book-p">${sillBook(B, true)}</g>`;
  if (!withTwin) o += letters('pw');
  else {
    // ночью у холодильника двойник: буквы видны везде, кроме места, где он заслоняет дверцу
    // (маска — его силуэт, вычислен из того же кадра без него). До «УХОДИ» — вразнобой, после — ряд.
    const mask = B.image('').replace(B.src, 'assets/backgrounds/K-P-1v2-twin-mask.png');
    o += `<defs><mask id="kpt-boy" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">${mask}</mask></defs>`;
    o += `<g mask="url(#kpt-boy)"><g class="pw-home">${letters('pw', false)}</g><g class="pw-row">${letters('pw')}</g></g>`;
  }
  return s + (withTwin ? `<g style="filter:brightness(0.5) saturate(0.7) hue-rotate(20deg)">${o}</g>` : o);
}

function buildPFridge() {
  const B = BG.pf;
  return commonDefs('p') + B.image('class="bg"') + letters('p');
}

// ---------- Ракурсы (к ним подходит камера, когда игрок щёлкает предмет) ----------
const NP = BG.np;
const P = BG.p;
const shotsNP = {
  wide: [0, 0, 1600, 900],
  room: [60, 34, 1480, 832],
  window: NP.shot(300, 300, 620),
  sill: NP.shot(430, 560, 700),
  table: NP.shot(690, 470, 640),
  lamp: NP.shot(690, 420, 460),
  shelf: NP.shot(1060, 150, 420),
  photo: NP.shot(1010, 108, 190),
  clock: NP.shot(1150, 170, 300),
  fridge: NP.shot(1130, 320, 440),
  letters: NP.shot(1130, 540, 540),
  pipes: NP.shot(770, 230, 480),
  cabinet: NP.shot(1220, 560, 420),
};
const shotsP = {
  wide: [0, 0, 1600, 900],
  room: [60, 34, 1480, 832],
  window: P.shot(300, 300, 620),
  sill: P.shot(430, 560, 700),
  table: P.shot(690, 470, 640),
  photo: P.shot(1010, 108, 190),
  shelf: P.shot(1060, 150, 420),
  clock: P.shot(1150, 170, 300),
  fridge: P.shot(1130, 380, 480),
  sink: P.shot(1220, 560, 420),
  twin: P.shot(1040, 420, 760),
};
const shotsPF = {
  wide: [0, 0, 1600, 900],
  row: BG.pf.shot(705, 470, 1000),
};

// ---------- Активные зоны ----------
// Предметы-истории: из щелчков складывается прошлое семьи. Строки: [подпись, ракурс, мысли].
// Мысли могут зависеть от времени суток: { night: [...], morning: [...] }.
// Одинаковы в обоих мирах только мысли о фото-якоре — как и сам якорь.

const ANCHOR_LINE = 'Мы с Верой на подоконнике. Окно открыто, рядом её книга.';

const LOOK = {
  np: {
    window: ['Окно', 'window', {
      night: ['Насыпь на уровне крыши. Ночью от неё остаются рельсы и красный глаз семафора.', 'Товарные ночью идут почти без огней. Их слышно раньше, чем видно.'],
      morning: ['Туман с реки. Насыпь висит над крышами, как мост, который никуда не ведёт.', 'Папа водит электричку. Та, что в 6:40, — его.'],
    }],
    pipes: ['Трубы', 'pipes', ['Трубы. Когда у соседей включают воду, они поют — почти чистое «соль».', 'Я записал их для бита. Мама сказала: «Выключи этот вой».']],
    cabinet: ['Шкафчик', 'cabinet', ['Шкафчик. Ключи, батарейки, прищепки.', 'Мама выгребает их из хлебницы и складывает сюда. Думает, это я прячу. Я не прячу.']],
    table: ['Стол', 'table', {
      night: ['Пустой стол. Ночью кухня кажется больше, чем есть.'],
      morning: ['Одна тарелка. Одна чашка. Раньше тут было тесно.'],
    }],
    fridge: ['Холодильник', 'letters', ['Детский алфавит. Мама вешала буквы, чтобы я учил слова.', 'Первое слово, которое я сложил сам, было «ВЕРА».']],
    lamp: ['Лампа', 'lamp', ['Лампу на кухне не выключают. Мама говорит — чтобы не споткнуться.', 'По-моему, чтобы дом не казался пустым.']],
    mug: ['Кружка', 'table', ['Верина белая кружка со сколотым краем. Мама ставит её на стол по привычке.', 'Из неё никто не пьёт.']],
    letter: ['Письмо', 'table', ['Письмо из Петербурга. Обратный адрес — реставрационная мастерская.', 'Мама его не открыла. Неделю перекладывает с места на место.']],
    clock: ['Часы', 'clock', {
      night: ['Часы спешат на три минуты. Сколько себя помню.', 'Всё в этом доме или спешит, или опаздывает.'],
      morning: ['Спешат на три минуты. Папа говорит: зато никуда не опоздаешь.', 'Раньше их подводила Вера. Теперь некому.'],
    }],
    note: ['Записка', 'fridge', ['«Суп в кастрюле. Я у тёти Гали, буду в 9». Мы давно говорим записками.', 'Мама то на сменах, то у тёти Гали. Кажется, она не хочет быть дома по ночам.']],
    drawing: ['Рисунок', 'fridge', ['Мой рисунок, лет в пять: дом, поезд над крышей и четыре человечка.', 'Одного я потом зачеркнул. Шесть лет назад. Мама так и не сняла.']],
    photo: ['Фото', 'photo', [ANCHOR_LINE, 'Помню, что в тот вечер ждали дождя. А он так и не пошёл.', 'Фото будто светится. Или мне кажется.']],
    miri: ['Колонка', 'shelf', ['Мири. Мама купила её, когда начала брать ночные смены.', 'Говорит, так в доме хоть кто-то отвечает.']],
    sill: ['Подоконник', 'sill', ['Подоконник. Весной тут стоит мамина рассада. Сейчас — только пыль.']],
  },
  p: {
    window: ['Окно', 'window', ['Дождь. Стекло в каплях. Здесь, кажется, всегда только что прошёл дождь.', 'Та же насыпь, те же провода. Папину электричку слышно и сквозь дождь.']],
    table: ['Стол', 'table', ['Три кружки, ещё тёплые. У белой сколот край — Верина. Здесь из неё пьют.', 'Здесь кто-то варит кофе по утрам. У нас его не варят с тех пор, как Вера уехала.']],
    fridge: ['Холодильник', 'fridge', ['«УХОДИ». Так и висит — он не стал снимать.', 'Остальные буквы вразнобой. Слов из них здесь давно никто не складывал.']],
    sink: ['Столешница', 'sink', ['Там, за углом, раковина. Где-то в трубе капает — раз в четыре секунды. Готовый хай-хэт.', 'На столешнице — хлебница. Вся во вмятинах, будто её вечно захлопывают на бегу.']],
    lamp: ['Лампа', 'table', ['Та же лампа с абажуром, что у нас. Здесь её включают только ночью — вечером и так светло.']],
    book: ['Книга', 'sill', ['Книга Веры. «Опыты с водой и светом». Страницы вздулись от воды.', 'Лежит здесь с того самого утра. Никто её не убирает.']],
    clock: ['Часы', 'clock', ['Часы на полке. Сверяю с телефоном — секунда в секунду.', 'У нас они шесть лет спешат. Здесь их кто-то подводит.']],
    note: ['Записка', 'fridge', ['«Купи хлеб!!» — Верин почерк. Тот же наклон, что в записке шесть лет назад.', 'Здесь она пишет про хлеб. У нас — открытки из Петербурга, раз в год.']],
    photo: ['Фото', 'photo', [ANCHOR_LINE, 'До царапины на рамке — такое же, как у нас. Та же полка, тот же гвоздь.', 'Фото будто светится. Или мне кажется.']],
  },
};

// Окно, подоконник и стол — по контурам предметов (кадры обоих миров совпадают пиксель в пиксель):
// окно — стекло над рамой, подоконник — диагональная полоса от лампы к левому краю, стол — столешница.
const WINDOW_POLY = [[62, 0], [562, 0], [562, 483], [92, 636]];
const SILL_POLY = [[92, 620], [640, 430], [656, 508], [104, 752]];
const TABLE_POLY = [[484, 548], [640, 500], [895, 520], [840, 662], [560, 642], [484, 604]];

function hotspots(world, time) {
  const B = BG[world];
  const zones = world === 'np'
    ? {
      window: B.poly(WINDOW_POLY),
      pipes: B.rect(695, 0, 840, 300),
      cabinet: B.rect(1280, 400, 1376, 740),
      table: B.poly(TABLE_POLY),
      // подоконник — после стола: там, где они сходятся у лампы, щелчок достаётся подоконнику
      sill: B.poly(SILL_POLY),
      fridge: B.rect(996, 392, 1264, 712),
      lamp: B.circle(690, 368, 62),
      mug: B.circle(790, 545, 30),
      letter: B.rect(505, 585, 606, 628),
      clock: B.circle(1205, 190, 32),
      note: B.rect(1124, 258, 1228, 334),
      drawing: B.rect(1012, 246, 1110, 348),
      photo: B.rect(966, 60, 1054, 154),
      miri: B.rect(1085, 105, 1128, 160),
    }
    : {
      window: B.poly(WINDOW_POLY),
      sink: B.rect(1280, 400, 1376, 740),
      table: B.poly(TABLE_POLY),
      // в мире П на подоконнике — Верина книга: весь подоконник ведёт к ней
      book: B.poly(SILL_POLY),
      lamp: B.circle(690, 368, 62),
      fridge: B.rect(982, 392, 1262, 712),
      clock: B.circle(1207, 187, 32),
      note: B.rect(1134, 244, 1236, 306),
      photo: B.rect(966, 60, 1054, 154),
    };
  const list = [];
  for (const [id, shape] of Object.entries(zones)) {
    const entry = LOOK[world][id];
    if (!entry) continue;
    const [label, shot, l] = entry;
    // осмотр: в мире П — три кружки на столе крупно
    const view = world === 'p' && id === 'table' ? 'assets/items/I-MUGS-P.jpg' : undefined;
    list.push({ id, label, shot, shape, view, lines: Array.isArray(l) ? l : l[time] || l.night || l.morning });
  }
  // Буквы — отдельная группа, включается только во время загадки. Лежат поверх зоны холодильника.
  if (world === 'np') {
    for (const l of letterLayout('np')) {
      list.push({ id: `L${l.ch}`, ch: l.ch, group: 'letters', label: '', shape: A.zoneCircle([l.pos[0], l.pos[1] - l.size * 0.35], l.size * 0.62) });
    }
  }
  return list;
}

// ---------- Загадка «Буквы на холодильнике» ----------
// Включается, когда игрок сам подошёл к холодильнику, а буквы уже сдвинуты.
// progress хранится в состоянии мира: { found: ['Х', …], misses }.
const lettersPuzzle = {
  group: 'letters',
  shot: 'letters',
  banner: 'Кто-то сдвинул несколько букв. Найдите их.',
  hint: 'Мама вешала их ровно, по линеечке. Все, кроме тех, что трогали.',
  // найденная буква встаёт в своё место слова
  word(progress) {
    return WORD_NP.map((ch) => (progress.found.includes(ch) ? ch : ''));
  },
  total: Object.keys(MOVED_NP).length,
  start(ui, progress, root) {
    progress.found = progress.found || [];
    progress.misses = progress.misses || 0;
    progress.found.forEach((ch) => root.querySelector(`.mag.moved[data-ch="${ch}"]`)?.classList.add('found'));
    ui.tray(this.total, this.word(progress));
  },
  // возвращает true, когда загадка решена
  pick(spot, ui, progress, root, at) {
    const l = letterLayout('np').find((x) => x.ch === spot.ch);
    if (l.moved) {
      if (progress.found.includes(l.ch)) return false;
      progress.found.push(l.ch);
      root.querySelector(`.mag.moved[data-ch="${l.ch}"]`).classList.add('found');
      audio.sfx('pluck');
      ui.tray(this.total, this.word(progress));
      return progress.found.length === this.total;
    }
    audio.sfx('thud');
    progress.misses++;
    const wrong = ['Эта висит, как висела всегда.', 'Нет, эта на своём месте. Пыль вокруг ровная.', 'Эту никто не трогал.'];
    let text = wrong[(progress.misses - 1) % wrong.length];
    if (l.ch === 'У') text = '«У» висит ровно. Странно — я был уверен…';
    ui.thought(text, at);
    return false;
  },
};

function kitchenNP(time) {
  return {
    id: `kitchen-np-${time}`,
    world: 'np',
    title: 'Кухня',
    bg: time === 'morning' ? BG.npm.src : BG.np.src,
    shots: shotsNP,
    ambience: time === 'morning' ? ['fridge', 'kettle', 'clock'] : ['fridge', 'clock', 'drizzle'],
    build: () => buildNP(time),
    hotspots: hotspots('np', time),
    events: {
      glow(root) {
        const g = root.querySelector('#knp-photo-glow');
        g.classList.add('on');
        setTimeout(() => g.classList.remove('on'), 4000);
        return 0;
      },
    },
    puzzles: { letters: lettersPuzzle },
  };
}

export const kitchenNight = kitchenNP('night');
export const kitchenMorning = kitchenNP('morning');
export const kitchenEvening = kitchenNP('evening');

export const kitchenP = {
  id: 'kitchen-p',
  world: 'p',
  title: 'Кухня',
  bg: BG.pt.src,
  shots: shotsP,
  ambience: ['rain', 'fridge', 'tap'],
  build: () => buildP(true),
  hotspots: hotspots('p', 'night'),
  events: {
    glow(root) {
      const g = root.querySelector('#kp-photo-glow');
      g.classList.add('on');
      setTimeout(() => g.classList.remove('on'), 4000);
      return 0;
    },
  },
  puzzles: {},
};

// Та же кухня мира П вечером, за ужином (глава 2): без силуэта у холодильника
export const kitchenPEvening = {
  ...kitchenP,
  id: 'kitchen-p-evening',
  bg: BG.p.src,
  build: () => buildP(false),
};

// Подоконник крупно, мир НП (I-SILL-NP): пыль и в ней чистый прямоугольник — здесь мама оставляет книгу.
// Когда книга лежит на месте (класс book-on-sill) — тот же кадр с книгой (I-SILL-NP-book).
const SILL = A.plate('assets/backgrounds/I-SILL-NP-2.jpg', 1376, 768);
const SILL_BOOK = A.plate('assets/backgrounds/I-SILL-NP-2-book.jpg', 1376, 768);
const SILL_SHIFTED = A.plate('assets/backgrounds/I-SILL-NP-2-shifted.jpg', 1376, 768);
export const SILL_SPOT = [500, 360, 965, 605]; // чистый прямоугольник, пиксели картинки
export const sillNP = {
  id: 'sill-np',
  world: 'np',
  title: 'Подоконник',
  bg: SILL.src,
  shots: { wide: [0, 0, 1600, 900] },
  ambience: ['fridge', 'clock'],
  // одно состояние книги на всех ракурсах: нет / лежит по следу / сдвинута из другого мира
  build: () => SILL.image('class="bg"') + SILL_BOOK.image('class="bg-book"') + SILL_SHIFTED.image('class="bg-book-shifted"'),
  hotspots: [
    { id: 'window', label: 'Окно', shot: '', shape: SILL.rect(0, 0, 1300, 330), lines: ['Капли на стекле. За ними — красный семафор, ровный, как метроном без звука.'] },
    { id: 'spot', label: 'Чистое место', shot: '', shape: SILL.rect(...SILL_SPOT), lines: ['Пыль на подоконнике. А в пыли — чистый прямоугольник. Тут недавно что-то лежало.', 'Что-то размером с книгу.'] },
  ],
  events: {},
};

// Дверца холодильника в мире П крупно: двойник выкладывает «УХОДИ»
export const kitchenPFridge = {
  id: 'kitchen-p-fridge',
  world: 'p',
  title: 'Кухня',
  bg: BG.pf.src,
  shots: shotsPF,
  ambience: ['rain', 'fridge', 'tap'],
  build: buildPFridge,
  hotspots: [],
  events: {
    place(root) {
      const order = ['У', 'Х', 'О', 'Д', 'И'];
      order.forEach((ch, i) => {
        const g = root.querySelector(`.mag[data-ch="${ch}"]`);
        setTimeout(() => {
          g.style.transition = 'transform 0.9s cubic-bezier(.5,0,.2,1)';
          g.style.transform = `translate(${g.dataset.dx}px, ${g.dataset.dy}px)`;
          audio.sfx('magnet');
        }, i * 900);
      });
      return order.length * 900 + 900;
    },
  },
  puzzles: {},
};
