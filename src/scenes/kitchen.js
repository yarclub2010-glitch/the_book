// Кухня в двух мирах: одна геометрия (закон 1 — общее место), разный стиль и жизнь.
// kitchen-np — утро, кинематографичный реализм; kitchen-p — ночь после дождя, аниме.
import * as A from '../engine/art.js';
import { audio } from '../engine/audio.js';

const P = A.camera();
const { poly, line, ell, path, mv } = A;
const front = (...a) => A.front(P, ...a);
const bx = (...a) => A.box(P, ...a);

const XL = -2;
const XR = 2.235;
const YC = 2.705;
const WIN = [-1.55, -0.15, 1.0, 2.3];
const FRIDGE = { X0: 1.35, X1: 2.1, D: 0.68 };
const ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const LETTER_COLORS = ['#e2582f', '#e0a93a', '#3a6fb0', '#3e9a5c', '#8a4fb0'];

// Сетка алфавита на двери холодильника (м)
const grid = (i) => ({ X: 1.46 + (i % 6) * 0.103, Y: 1.15 - Math.floor(i / 6) * 0.15 });
// Мир НП: буквы сдвинуты не до конца (закон 4), «У» не сдвинулась
const MOVED_NP = { Х: [1.61, 0.4, 14], О: [1.765, 0.5, -12], Д: [1.845, 0.39, 17], И: [1.97, 0.5, -9] };
// Мир П: двойник выложил ровный ряд «УХОДИ»
const ROW_P = { У: 1.5, Х: 1.61, О: 1.72, Д: 1.83, И: 1.94 };

// Размер буквы на двери холодильника (px) и их расположение — общее для картинки и активных зон
const LETTER_SIZE = 0.075 * 170 * (4 / (4 - FRIDGE.D));

function letterLayout(world) {
  return [...ALPHABET].map((ch, i) => {
    const g = grid(i);
    const home = P(g.X, g.Y, FRIDGE.D);
    const l = { ch, home, pos: home, rot: ((i * 37) % 9) - 4, moved: false, color: LETTER_COLORS[i % LETTER_COLORS.length] };
    if (world === 'np' && MOVED_NP[ch]) {
      const [mx, my, mr] = MOVED_NP[ch];
      Object.assign(l, { pos: P(mx, my, FRIDGE.D), rot: mr, moved: true });
    }
    if (world === 'p' && ROW_P[ch] !== undefined) {
      const to = P(ROW_P[ch], 0.43, FRIDGE.D);
      Object.assign(l, { dx: to[0] - home[0], dy: to[1] - home[1] });
    }
    return l;
  });
}

const PAL = {
  np: {
    ceil: '#2a1f16', back: '#8a6a44', left: '#6a4f33', right: '#6e5234', base: '#3a2716',
    splash: '#c9bba2', splashLine: '#8e8069', counter: '#4a3424', counterTop: '#9b8c75', counterSide: '#3a281b',
    cab: '#3e2c1e', table: '#5a3e28', tableTop: '#7a5838', fridge: '#e6ddcc', fridgeSide: '#b9ae9c', fridgeLine: '#8d826f',
    door: '#140f0b', stroke: 'none',
  },
  p: {
    ceil: '#2a2150', back: '#5b4a9a', left: '#46397d', right: '#4d3f88', base: '#2b2358',
    splash: '#8f86c9', splashLine: '#6d63ad', counter: '#3b2f70', counterTop: '#a79ee0', counterSide: '#2e2560',
    cab: '#34296a', table: '#4a3a86', tableTop: '#6f5fb8', fridge: '#e9e6ff', fridgeSide: '#b7b0e8', fridgeLine: '#7e76c2',
    door: '#ffb46b', stroke: '#1b1438',
  },
};

function build(world) {
  const c = PAL[world];
  const st = world === 'p' ? `stroke="${c.stroke}" stroke-width="2.5" stroke-linejoin="round"` : '';
  const id = (s) => `k${world}-${s}`;
  let s = '';

  // ---------- defs ----------
  s += `<defs>
    <linearGradient id="${id('sky')}" x1="0" y1="0" x2="0" y2="1">${world === 'np'
  ? '<stop offset="0" stop-color="#f3c58a"/><stop offset="0.6" stop-color="#f8dcb0"/><stop offset="1" stop-color="#fbe9cf"/>'
  : '<stop offset="0" stop-color="#1b1646"/><stop offset="0.6" stop-color="#4a2f7e"/><stop offset="1" stop-color="#c2508f"/>'}</linearGradient>
    <radialGradient id="${id('dark')}" cx="${world === 'np' ? '30' : '40'}%" cy="35%" r="80%">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.45" stop-color="#000" stop-opacity="${world === 'np' ? 0.22 : 0.12}"/><stop offset="1" stop-color="#000" stop-opacity="${world === 'np' ? 0.8 : 0.5}"/>
    </radialGradient>
    <radialGradient id="${id('glow')}"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.95"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id('beam')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2a8" stop-opacity="0.5"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></linearGradient>
    <pattern id="${id('paper')}" width="40" height="52" patternUnits="userSpaceOnUse">
      <path d="M20 5c7 7 7 16 0 23c-7-7-7-16 0-23z" fill="none" stroke="${world === 'np' ? '#2a1a0c' : '#231a52'}" stroke-opacity="${world === 'np' ? 0.2 : 0.25}" stroke-width="2"/>
    </pattern>
  </defs>`;

  // ---------- стены ----------
  s += poly([[0, 0], [1600, 0], P(XR, YC, 0), P(XL, YC, 0)], c.ceil);
  const back = front(XL, XR, 0, YC, 0);
  s += poly(back, c.back) + poly(back, `url(#${id('paper')})`);
  const left = [[0, 0], P(XL, YC, 0), P(XL, 0, 0), [0, 905]];
  s += poly(left, c.left);
  const right = [P(XR, YC, 0), [1600, 0], [1600, 789], P(XR, 0, 0)];
  s += poly(right, c.right) + poly(right, `url(#${id('paper')})`, 'opacity="0.7"');
  s += poly([P(XL, 0, 0), P(XR, 0, 0), P(XR, 0.08, 0), P(XL, 0.08, 0)], c.base);
  // фартук из плитки на левой стене над столешницей
  s += poly([P(XL, 0.9, 0.15), P(XL, 1.5, 0.15), P(XL, 1.5, 2.25), P(XL, 0.9, 2.25)], c.splash);
  for (let d = 0.15; d <= 2.25; d += 0.15) s += line(P(XL, 0.9, d), P(XL, 1.5, d), c.splashLine, 1.2);
  for (let Y = 0.9; Y <= 1.5; Y += 0.15) s += line(P(XL, Y, 0.15), P(XL, Y, 2.25), c.splashLine, 1.2);

  // ---------- дверной проём в коридор на правой стене ----------
  const doorway = [P(XR, 0, 1.2), P(XR, 2.05, 1.2), P(XR, 2.05, 1.95), P(XR, 0, 1.95)];
  s += poly(doorway, c.door, st);
  if (world === 'p') s += poly(doorway, '#ffd7a0', 'opacity="0.35"');

  s += '<!--floor-->';

  // ---------- окно ----------
  const [X0, X1, Y0, Y1] = WIN;
  const w = front(X0, X1, Y0, Y1, 0);
  s += `<clipPath id="${id('win')}"><polygon points="${A.pts(w)}"/></clipPath><g clip-path="url(#${id('win')})">`;
  s += poly(w, `url(#${id('sky')})`);
  if (world === 'np') s += ell(P(-0.5, 2.05, 0), 38, 38, '#fff0cf', 'opacity="0.9"');
  else {
    const r = A.rng(6);
    for (let i = 0; i < 18; i++) s += ell(P(X0 + r() * (X1 - X0), 1.9 + r() * 0.35, 0), 1.3, 1.3, '#fff', `opacity="${(0.3 + r() * 0.5).toFixed(2)}" class="twinkle" style="animation-delay:${(-r() * 5).toFixed(1)}s"`);
  }
  const a = P(X0, 1.5, 0);
  const b = P(X1, 1.62, 0);
  s += poly([a, b, P(X1, 0.9, 0), P(X0, 0.9, 0)], world === 'np' ? '#6b5a48' : '#241a4a', st);
  s += line(a, b, world === 'np' ? '#3b2f24' : '#ff9b6a', 2);
  for (const X of [-1.2, -0.5]) s += line(P(X, 1.52, 0), P(X, 2.3, 0), world === 'np' ? '#4a3b2c' : '#1b1438', 3);
  // электричка на уровне крыши
  s += `<g id="${id('train')}" class="train">`;
  s += poly([P(X0 - 0.4, 1.55, 0), P(X1 + 0.4, 1.66, 0), P(X1 + 0.4, 1.92, 0), P(X0 - 0.4, 1.8, 0)], world === 'np' ? '#2e2a26' : '#1b1438');
  s += poly([P(X0 - 0.4, 1.6, 0), P(X1 + 0.4, 1.71, 0), P(X1 + 0.4, 1.74, 0), P(X0 - 0.4, 1.63, 0)], '#d9602f');
  for (let k = 0; k < 9; k++) {
    const t0 = X0 - 0.3 + ((X1 - X0 + 0.6) * k) / 9;
    const yb = 1.66 + (0.11 * (t0 - X0)) / (X1 - X0);
    s += poly(front(t0, t0 + 0.09, yb, yb + 0.09, 0), world === 'np' ? '#f7e3b8' : '#ffcf7a', 'opacity="0.9"');
  }
  s += '</g>';
  // дождь в мире П
  if (world === 'p') {
    s += '<g class="rain">';
    const r = A.rng(9);
    for (let i = 0; i < 70; i++) {
      const x = w[0][0] + r() * (w[1][0] - w[0][0]);
      const y = w[2][1] - 260 + r() * 520;
      s += line([x, y], [x - 4, y + 18 + r() * 14], '#d8e8ff', 1.3, `opacity="${(0.35 + r() * 0.45).toFixed(2)}"`);
    }
    s += '</g>';
    for (let i = 0; i < 22; i++) {
      const x = w[0][0] + r() * (w[1][0] - w[0][0]);
      const y = w[2][1] + r() * (w[0][1] - w[2][1]);
      s += ell([x, y], 2.4, 3.2, '#ffe3f0', `opacity="${(0.4 + r() * 0.4).toFixed(2)}"`);
    }
  }
  s += '</g>';
  s += poly(w, 'none', `stroke="${world === 'np' ? '#3a2716' : '#1b1438'}" stroke-width="11"`);
  s += line(P((X0 + X1) / 2, Y0, 0), P((X0 + X1) / 2, Y1, 0), world === 'np' ? '#3a2716' : '#1b1438', 9);
  s += bx(X0 - 0.08, X1 + 0.08, Y0 - 0.05, Y0, 0, 0.14, world === 'np' ? '#d8cdb8' : '#cfc8f5', world === 'np' ? '#efe6d4' : '#e6e1ff', '#9a8f7c');
  // на подоконнике: цветок; в мире П — ещё и книга (она всегда лежит здесь)
  const pot = P(-1.3, 1.0, 0.07);
  s += path(`M${pot[0] - 14} ${pot[1]}l4 -24h20l4 24z`, world === 'np' ? '#b0532e' : '#e2582f', st);
  s += path(`M${pot[0]} ${pot[1] - 24}c-14 -26 0 -40 0 -40s14 16 0 40M${pot[0]} ${pot[1] - 24}c8 -22 26 -24 26 -24s-4 20 -26 24`, world === 'np' ? '#6f7a4a' : '#3e9a5c', st || 'stroke="#3e4a2a" stroke-width="1.5"');
  if (world === 'p') {
    s += bx(-0.75, -0.42, 1.0, 1.05, 0.02, 0.12, '#2f5d7c', '#3a6fb0', '#264b66', 200 / 170, st);
    s += poly([P(-0.73, 1.051, 0.03), P(-0.44, 1.051, 0.03), P(-0.44, 1.051, 0.11), P(-0.73, 1.051, 0.11)], '#f3eee0');
  }

  // ---------- шкафчики и столешница у левой стены ----------
  s += bx(XL, -1.65, 1.55, 2.25, 0.15, 1.9, c.cab, c.cab, c.cab, 200 / 170, st);
  for (const [d0, d1] of [[0.2, 0.75], [0.8, 1.35], [1.4, 1.85]]) {
    s += poly([P(-1.65, 1.6, d0), P(-1.65, 1.6, d1), P(-1.65, 2.2, d1), P(-1.65, 2.2, d0)], 'none', `stroke="${world === 'np' ? '#1e140c' : '#1b1438'}" stroke-width="2"`);
  }
  s += bx(XL, -1.4, 0, 0.9, 0.15, 2.25, c.counter, c.counterTop, c.counterSide, 200 / 170, st);
  for (const [d0, d1] of [[0.2, 0.9], [0.95, 1.55], [1.6, 2.2]]) {
    s += poly([P(-1.4, 0.08, d0), P(-1.4, 0.08, d1), P(-1.4, 0.82, d1), P(-1.4, 0.82, d0)], 'none', `stroke="${world === 'np' ? '#24170e' : '#1b1438'}" stroke-width="2"`);
  }
  // плита и чайник
  s += ell(P(-1.72, 0.905, 0.45), 26, 7, '#1c1c1c') + ell(P(-1.72, 0.905, 0.8), 30, 8, '#1c1c1c');
  const kt = P(-1.72, 0.92, 0.8);
  s += path(`M${kt[0] - 28} ${kt[1]}q2 -40 28 -42q26 2 28 42z`, world === 'np' ? '#b8b2a6' : '#e2582f', st);
  s += path(`M${kt[0] - 6} ${kt[1] - 42}h12v-7h-12z`, '#2a2a2a');
  s += path(`M${kt[0] + 26} ${kt[1] - 22}q18 -6 22 -22`, 'none', world === 'np' ? '#8d877c' : '#1b1438', 5);
  if (world === 'np') {
    for (let k = 0; k < 3; k++) {
      s += path(`M${kt[0] + 46} ${kt[1] - 46} c-8 -20 12 -30 2 -52 c-6 -14 8 -24 4 -36`, 'none', '#fffaf0', 5, `class="steam" style="animation-delay:${-k * 1.1}s" opacity="0.5"`);
    }
  }
  // хлебница — общая вещь (двойник прячет в неё мелочи)
  s += bx(XL + 0.05, -1.45, 0.9, 1.1, 1.45, 1.85, world === 'np' ? '#8a5a3a' : '#e0a93a', world === 'np' ? '#a06a46' : '#f0c35a', world === 'np' ? '#6a4228' : '#b8862a', 200 / 170, st);

  // ---------- полка с фото-якорем и часы ----------
  s += bx(0.2, 1.2, 1.52, 1.56, 0.0, 0.22, world === 'np' ? '#6b4a31' : '#8a7ad0', world === 'np' ? '#8a6444' : '#a79ee0', '#4a3020', 200 / 170, st);
  s += `<g class="shelf-items">`;
  s += bx(0.27, 0.4, 1.56, 1.76, 0.05, 0.17, world === 'np' ? '#a79a86' : '#e0a93a', '#fff', '#8a7e6c', 200 / 170, st);
  s += bx(0.48, 0.6, 1.56, 1.68, 0.05, 0.17, world === 'np' ? '#e8dfcf' : '#f3eee0', '#fff', '#b8ae9c', 200 / 170, st);
  s += '</g>';
  const ap = P(0.9, 1.72, 0.12);
  s += `<circle id="${id('photoglow')}" class="photoglow" cx="${ap[0]}" cy="${ap[1]}" r="46" fill="url(#${id('glow')})"/>`;
  s += A.anchorPhoto(ap[0], ap[1], 30, `id="${id('photo')}" transform="rotate(-4 ${ap[0]} ${ap[1]})"`);
  // часы: в мире НП спешат на три минуты (6:42), в мире П точные (01:50)
  const cc = P(0.7, 2.28, 0);
  const [hh, mm] = world === 'np' ? [6, 42] : [1, 50];
  s += `<g transform="translate(${cc[0]} ${cc[1]})">`;
  s += `<circle r="29" fill="${world === 'np' ? '#efe6d4' : '#f3eee0'}" stroke="${world === 'np' ? '#2a1d12' : '#1b1438'}" stroke-width="4"/>`;
  for (let k = 0; k < 12; k++) s += `<line x1="0" y1="-24" x2="0" y2="${k % 3 ? -21 : -19}" stroke="#2a1d12" stroke-width="2" transform="rotate(${k * 30})"/>`;
  s += `<line x1="0" y1="0" x2="0" y2="-14" stroke="#2a1d12" stroke-width="4" stroke-linecap="round" transform="rotate(${(hh % 12) * 30 + mm / 2})"/>`;
  s += `<line x1="0" y1="0" x2="0" y2="-22" stroke="#2a1d12" stroke-width="3" stroke-linecap="round" transform="rotate(${mm * 6})"/>`;
  s += '<line class="second" x1="0" y1="4" x2="0" y2="-24" stroke="#d9402a" stroke-width="1.5"/>';
  s += '<circle r="2.5" fill="#2a1d12"/></g>';

  // ---------- холодильник ----------
  const { X0: F0, X1: F1, D: FD } = FRIDGE;
  s += bx(F0, F1, 0, 1.85, 0.02, FD, c.fridge, c.fridge, c.fridgeSide, 200 / 170, st);
  s += line(P(F0, 1.3, FD), P(F1, 1.3, FD), c.fridgeLine, 3);
  s += poly(front(F0 + 0.03, F0 + 0.06, 1.38, 1.7, FD), '#555');
  s += poly(front(F0 + 0.03, F0 + 0.06, 0.7, 1.2, FD), '#555');
  // записка на морозилке
  const note = front(1.62, 1.95, 1.4, 1.72, FD);
  s += poly(note, world === 'np' ? '#fff8d8' : '#fff', `transform="rotate(${world === 'np' ? 3 : -3} ${note[0][0]} ${note[0][1]})"`);
  const nt = P(1.64, 1.64, FD);
  const noteText = world === 'np' ? ['Суп в кастрюле.', 'Буду в 9. Мама'] : ['Купи хлеб!!', '— В.'];
  noteText.forEach((t, i) => {
    s += `<text x="${nt[0]}" y="${nt[1] + i * 13}" font-family="Caveat, cursive" font-size="12" fill="#2a2a2a" transform="rotate(${world === 'np' ? 3 : -3} ${note[0][0]} ${note[0][1]})">${t}</text>`;
  });
  // магнитные буквы; в мире НП на месте сдвинутых остались светлые следы
  const stroke = world === 'p' ? '#1b1438' : '#2a2018';
  let letters = `<g class="letters" font-family="Rubik, 'Arial Black', sans-serif" font-weight="900" font-size="${LETTER_SIZE.toFixed(1)}" text-anchor="middle">`;
  for (const l of letterLayout(world)) {
    if (l.moved) {
      s += `<rect x="${(l.home[0] - LETTER_SIZE * 0.42).toFixed(1)}" y="${(l.home[1] - LETTER_SIZE * 0.85).toFixed(1)}" width="${(LETTER_SIZE * 0.84).toFixed(1)}" height="${(LETTER_SIZE * 0.95).toFixed(1)}" rx="3" fill="#fffdf6" opacity="0.8" class="mag-trace"/>`;
    }
    const extra = l.dx !== undefined ? ` data-dx="${l.dx.toFixed(1)}" data-dy="${l.dy.toFixed(1)}"` : '';
    letters += `<g class="mag${l.moved ? ' moved' : ''}" data-ch="${l.ch}"${extra}>`;
    letters += `<g transform="translate(${l.pos[0].toFixed(1)} ${l.pos[1].toFixed(1)}) rotate(${l.rot})">`;
    letters += `<text fill="${l.color}" stroke="${stroke}" stroke-width="0.9">${l.ch}</text>`;
    letters += '</g></g>';
  }
  s += letters + '</g>';

  // ---------- стол и стул ----------
  for (const [X, d] of [[-0.95, 1.25], [0.15, 1.25], [-0.95, 1.95], [0.15, 1.95]]) s += line(P(X, 0, d), P(X, 0.72, d), world === 'np' ? '#2a1c12' : '#1b1438', 7);
  s += bx(-1.02, 0.22, 0.72, 0.76, 1.2, 2.0, c.table, c.tableTop, c.table, 200 / 170, st);
  if (world === 'np') {
    // завтрак на одного
    s += ell(P(-0.6, 0.765, 1.6), 44, 12, '#efe6d4', 'stroke="#8a7e6c" stroke-width="2"');
    const cup = P(-0.15, 0.765, 1.55);
    s += `<g class="cup"><path d="M${cup[0] - 13} ${cup[1]}v-26h26v26z" fill="#d9602f" stroke="#2a1d12" stroke-width="2"/></g>`;
  } else {
    // три кружки: Вера здесь бывает часто
    [[-0.75, 1.45, '#e2582f'], [-0.35, 1.7, '#3a6fb0'], [0.0, 1.4, '#e0a93a']].forEach(([X, d, col]) => {
      const cp = P(X, 0.765, d);
      s += `<path d="M${cp[0] - 12} ${cp[1]}v-24h24v24z" fill="${col}" stroke="#1b1438" stroke-width="2.5"/>`;
    });
  }
  const ch = '#1d140d';
  for (const X of [0.42, 0.78]) for (const d of [1.35, 1.7]) s += line(P(X, 0, d), P(X, 0.45, d), world === 'np' ? ch : '#1b1438', 5);
  s += bx(0.4, 0.8, 0.44, 0.48, 1.33, 1.72, world === 'np' ? '#2e1f14' : '#34296a', world === 'np' ? '#4a3322' : '#6f5fb8', '#2a1c12', 200 / 170, st);
  for (const X of [0.42, 0.78]) s += line(P(X, 0.48, 1.72), P(X, 0.95, 1.74), world === 'np' ? ch : '#1b1438', 6);
  s += line(P(0.41, 0.93, 1.74), P(0.79, 0.93, 1.74), world === 'np' ? ch : '#1b1438', 8);

  // ---------- пол ----------
  const floor = A.tiles(P, world === 'np'
    ? { a: '#b9ab94', b: '#8f8270', grout: '#5d5446', clipId: id('floor') }
    : { a: '#6f63b3', b: '#574b9a', grout: '#3a3072', clipId: id('floor') });
  // пол — под мебелью, сразу после стен
  s = s.replace('<!--floor-->', floor);

  // ---------- двойник в мире П ----------
  if (world === 'p') s += twin();

  // ---------- свет ----------
  if (world === 'np') {
    s += poly([P(-1.5, 1.0, 0.1), P(-0.2, 1.0, 0.1), P(0.4, 0, 2.6), P(-1.2, 0, 2.6)], `url(#${id('beam')})`);
    const r = A.rng(21);
    for (let i = 0; i < 22; i++) {
      const p = P(-1.2 + r() * 1.4, 0.3 + r() * 1.1, 0.4 + r() * 1.8);
      s += `<circle class="dust" cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}" fill="#fff4d6" opacity="${(0.4 + r() * 0.4).toFixed(2)}" style="animation-delay:${(-r() * 12).toFixed(1)}s"/>`;
    }
    s += `<rect width="1600" height="900" fill="url(#${id('dark')})"/>`;
    s += '<rect width="1600" height="900" fill="#ffb45c" opacity="0.08"/>';
  } else {
    // пятна света из коридора и окна
    s += poly([P(XR - 0.02, 0, 1.2), P(XR - 0.02, 0, 1.95), P(1.1, 0, 2.2), P(1.2, 0, 1.3)], '#ffcf8a', 'opacity="0.28"');
    s += poly([P(-1.5, 0.99, 0.12), P(-0.2, 0.99, 0.12), P(0.1, 0, 1.6), P(-1.3, 0, 1.6)], '#ff8ab8', 'opacity="0.14"');
    s += `<rect width="1600" height="900" fill="url(#${id('dark')})"/>`;
  }
  return s;
}

// Двойник: силуэт в худи у холодильника, спиной к камере (аниме-стиль)
function twin() {
  const f = P(0.85, 0, 1.2);
  const top = P(0.85, 1.72, 1.2);
  const u = (f[1] - top[1]) / 100; // рост — 100 единиц
  const x = f[0];
  const y = f[1];
  const X = (v) => (x + v * u).toFixed(1);
  const Y = (v) => (y - v * u).toFixed(1);
  const ink = '#1b1438';
  const body = '#2c2360';
  return `<g class="twin">
    <!-- ноги в джинсах -->
    <path d="M${X(-6)} ${Y(46)} L${X(-5.5)} ${Y(2)} L${X(-1)} ${Y(2)} L${X(-0.5)} ${Y(46)}Z M${X(0.8)} ${Y(46)} L${X(1.3)} ${Y(2)} L${X(5.8)} ${Y(2)} L${X(6.3)} ${Y(46)}Z" fill="#241b52" stroke="${ink}" stroke-width="2.5"/>
    <path d="M${X(-6.5)} ${Y(2)} h${(6.2 * u).toFixed(1)} v${(2 * u).toFixed(1)} h${(-6.8 * u).toFixed(1)}z M${X(0.8)} ${Y(2)} h${(6.2 * u).toFixed(1)} v${(2 * u).toFixed(1)} h${(-6.2 * u).toFixed(1)}z" fill="#e9e6ff" stroke="${ink}" stroke-width="2"/>
    <!-- левая рука вдоль тела -->
    <path d="M${X(-11)} ${Y(78)} Q${X(-14)} ${Y(62)} ${X(-12)} ${Y(48)}" fill="none" stroke="${body}" stroke-width="${(5.5 * u).toFixed(1)}" stroke-linecap="round"/>
    <!-- худи -->
    <path d="M${X(-12)} ${Y(80)} Q${X(-13)} ${Y(60)} ${X(-11)} ${Y(44)} L${X(11)} ${Y(44)} Q${X(13)} ${Y(60)} ${X(12)} ${Y(80)} Q${X(0)} ${Y(84)} ${X(-12)} ${Y(80)}Z" fill="${body}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M${X(-11)} ${Y(47)} L${X(11)} ${Y(47)}" stroke="${ink}" stroke-width="2"/>
    <!-- правая рука тянется к буквам -->
    <path class="twin-arm" d="M${X(10)} ${Y(78)} Q${X(20)} ${Y(74)} ${X(28)} ${Y(64)}" fill="none" stroke="${body}" stroke-width="${(5.5 * u).toFixed(1)}" stroke-linecap="round"/>
    <circle cx="${X(29)}" cy="${Y(63)}" r="${(2.6 * u).toFixed(1)}" fill="#e7b48f" stroke="${ink}" stroke-width="2"/>
    <!-- голова и капюшон -->
    <ellipse cx="${X(0)}" cy="${Y(91)}" rx="${(7 * u).toFixed(1)}" ry="${(8 * u).toFixed(1)}" fill="#3a2f7a" stroke="${ink}" stroke-width="2.5"/>
    <path d="M${X(-7.5)} ${Y(86)} Q${X(-9)} ${Y(100.5)} ${X(0)} ${Y(100.5)} Q${X(9)} ${Y(100.5)} ${X(7.5)} ${Y(86)} Q${X(0)} ${Y(80)} ${X(-7.5)} ${Y(86)}Z" fill="${body}" stroke="${ink}" stroke-width="2.5"/>
    <!-- контровой свет из коридора -->
    <path d="M${X(7.5)} ${Y(97)} Q${X(9)} ${Y(90)} ${X(7)} ${Y(84)} M${X(12)} ${Y(78)} Q${X(13.5)} ${Y(62)} ${X(11.5)} ${Y(46)}" fill="none" stroke="#ff8ab8" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  </g>`;
}

// Ракурсы
const shots = {
  wide: [0, 0, 1600, 900],
  room: [100, 60, 1400, 788],
  window: [150, 140, 620, 349],
  shelf: [905, 200, 380, 214],
  photo: [985, 240, 170, 96],
  clock: [900, 110, 340, 191],
  fridge: [990, 240, 480, 270],
  letters: [1034, 366, 364, 205],
  row: [1034, 420, 364, 205],
  table: [250, 380, 800, 450],
  twin: [700, 160, 900, 506],
};

function restart(el) {
  el.classList.remove('go');
  void el.getBBox();
  el.classList.add('go');
}

function scene(world) {
  return {
    id: `kitchen-${world}`,
    world,
    title: 'Кухня',
    shots,
    ambience: world === 'np' ? ['fridge', 'kettle', 'clock'] : ['rain', 'fridge'],
    build: () => build(world),
    events: {
      train(root) {
        restart(root.querySelector(`#k${world}-train`));
        const glow = root.querySelector(`#k${world}-photoglow`);
        glow.classList.add('on');
        setTimeout(() => glow.classList.remove('on'), 6000);
        root.querySelectorAll('.cup, .shelf-items').forEach((c) => {
          c.classList.add('rattle');
          setTimeout(() => c.classList.remove('rattle'), 4200);
        });
        return 5200;
      },
      glow(root) {
        const g = root.querySelector(`#k${world}-photoglow`);
        g.classList.add('on');
        setTimeout(() => g.classList.remove('on'), 4000);
        return 0;
      },
      // Мир П: двойник выкладывает «УХОДИ»
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
        const arm = root.querySelector('.twin-arm');
        if (arm) arm.classList.add('reach');
        return order.length * 900 + 900;
      },
    },
    hotspots: hotspots(world),
    puzzles: world === 'np' ? { letters: lettersPuzzle } : {},
  };
}

// ---------- Активные зоны ----------
// Осмотр (group 'look'): мысли героя о предметах — экспозиция мира, сюжет не двигают.
// Одинаковы в обоих мирах только мысли о фото-якоре: как и сам якорь.

const ANCHOR_LINE = 'Мы с Верой на подоконнике. Окно открыто, на подоконнике её книга.';

const LOOK = {
  np: {
    photo: ['Фото', ANCHOR_LINE, 'Помню, что в тот вечер ждали дождя. А он так и не пошёл.', 'Фото будто светится. Или мне кажется.'],
    clock: ['Часы', 'Спешат на три минуты. Папа говорит: зато никуда не опоздаешь.', 'Раньше их подводила Вера. Теперь некому.'],
    note: ['Записка', '«Суп в кастрюле. Буду в 9. Мама». Мы давно говорим записками.', 'Мама боится, что я тоже уеду. Поэтому записки короткие — чтобы не сказать лишнего.'],
    fridge: ['Холодильник', 'Детский алфавит. Мама вешала буквы, чтобы я учил слова.', 'Первое слово, которое я сложил сам, было «ВЕРА».'],
    kettle: ['Чайник', 'Чайник свистит на одной ноте. Я записал его для бита.', 'Если замедлить в четыре раза, получается почти вой.'],
    breadbox: ['Хлебница', 'Хлебница. Хлеба нет — зато ключи, батарейки и прищепки.', 'Кто их туда кладёт? Не я. И не мама.'],
    window: ['Окно', 'Насыпь на уровне крыши. В детстве я думал, что поезда едут по небу.', 'Папа водит электричку. Та, что в 6:40, — его.'],
    table: ['Стол', 'Одна тарелка. Одна чашка. Раньше тут было тесно.'],
    plant: ['Цветок', 'Цветок поливает мама. Или никто — он и так живучий.'],
    doorway: ['Коридор', 'Коридор. Дверь в комнату Веры закрыта шесть лет. Внутри всё как было.'],
  },
  p: {
    photo: ['Фото', ANCHOR_LINE, 'Помню, в ту ночь пошёл дождь. Сильный.', 'Фото будто светится. Или мне кажется.'],
    clock: ['Часы', 'Точные. Я сам их починил.', 'Всё в этом доме рано или поздно ломается. Я чиню.'],
    note: ['Записка', '«Купи хлеб!!» — Вера. Два восклицательных — значит, не сердится.', 'Живёт через две улицы, а пишет записки, будто уехала.'],
    fridge: ['Холодильник', 'Детский алфавит. Сто лет его не трогал.', 'Пусть читает. Кто бы он ни был.'],
    kettle: ['Чайник', 'Чайник подтекает. Завтра поменяю прокладку.'],
    breadbox: ['Хлебница', 'Прячу в хлебницу мелочь: ключи, батарейки. Призрак вечно всё утаскивает.'],
    window: ['Окно', 'Опять дождь. Здесь почти всегда дождь.', 'Папина электричка в 6:40. Её слышно даже сквозь ливень.'],
    book: ['Книга', 'Книга Веры. «Опыты с водой и светом». Страницы вздулись от воды.', 'Лежит здесь с того самого утра. Никто её не убирает.'],
    table: ['Стол', 'Три кружки. Вера опять оставила свою — с отбитой ручкой.'],
    plant: ['Цветок', 'Цветок. Вера говорит, я его перезаливаю.'],
    doorway: ['Коридор', 'В коридоре свет. Мама не спит — ждёт, когда я лягу.'],
  },
};

function hotspots(world) {
  const { X0: F0, X1: F1, D: FD } = FRIDGE;
  const [W0, W1, WY0, WY1] = WIN;
  const zones = {
    window: A.zoneBox(P, W0, W1, WY0, WY1, 0, 0),
    clock: A.zoneCircle(P(0.7, 2.28, 0), 32),
    photo: A.zoneCircle(P(0.9, 1.72, 0.12), 24),
    note: A.zonePoints(front(1.62, 1.95, 1.4, 1.72, FD)),
    fridge: A.zoneBox(P, F0, F1, 0, 1.3, FD, FD),
    kettle: A.zoneCircle([P(-1.72, 0.92, 0.8)[0], P(-1.72, 0.92, 0.8)[1] - 22], 40),
    breadbox: A.zoneBox(P, XL + 0.05, -1.45, 0.9, 1.1, 1.45, 1.85),
    table: A.zoneBox(P, -1.02, 0.22, 0.7, 0.9, 1.2, 2.0),
    plant: A.zoneCircle([P(-1.3, 1.0, 0.07)[0], P(-1.3, 1.0, 0.07)[1] - 32], 30),
    doorway: A.zonePoints([P(XR, 0, 1.2), P(XR, 2.05, 1.2), P(XR, 2.05, 1.95), P(XR, 0, 1.95)]),
    book: A.zoneCircle(P(-0.58, 1.03, 0.07), 24),
  };
  const list = Object.entries(LOOK[world]).map(([id, [label, ...lines]]) => ({ id, label, lines, shape: zones[id] }));
  // Буквы — отдельная группа, включается только во время загадки. Идут последними, поэтому лежат поверх зоны холодильника.
  for (const l of letterLayout(world)) {
    list.push({
      id: `L${l.ch}`,
      ch: l.ch,
      group: 'letters',
      label: '',
      shape: A.zoneCircle([l.pos[0], l.pos[1] - LETTER_SIZE * 0.35], LETTER_SIZE * 0.62),
    });
  }
  return list;
}

// Загадка «Буквы на холодильнике»: найти сдвинутые буквы
function lettersPuzzle(root, ui) {
  return new Promise((resolve) => {
    const layout = letterLayout('np');
    const need = layout.filter((l) => l.moved);
    const found = [];
    let misses = 0;
    const wrongLines = [
      'Эта висит, как висела всегда.',
      'Нет, эта на своём месте. Пыль вокруг ровная.',
      'Эту никто не трогал.',
    ];
    const hint = 'Смотри, какие висят криво. И где на дверце остались светлые следы — там буквы висели годами.';
    ui.banner('Кто-то сдвинул несколько букв. Найдите их.', () => ui.thought(hint));
    ui.tray(need.length);

    ui.onHotspot('letters', (spot, at) => {
      const l = layout.find((x) => x.ch === spot.ch);
      if (l.moved) {
        if (found.includes(l)) return;
        found.push(l);
        root.querySelector(`.mag[data-ch="${l.ch}"]`).classList.add('found');
        audio.sfx('pluck');
        const word = [...found].sort((a, b) => a.pos[0] - b.pos[0]).map((x) => x.ch);
        ui.tray(need.length, word);
        if (found.length === need.length) {
          ui.onHotspot('letters', null);
          audio.sfx('success');
          setTimeout(() => {
            ui.banner(null);
            resolve(word.join(''));
          }, 1400);
        }
      } else {
        audio.sfx('thud');
        misses++;
        let text = wrongLines[(misses - 1) % wrongLines.length];
        if (l.ch === 'У') text = '«У» висит ровно. Странно — я был уверен…';
        else if (misses % 3 === 0) text = hint;
        ui.thought(text, at);
      }
    });
  });
}

export const kitchenNp = scene('np');
export const kitchenP = scene('p');
