// Инструменты рисования сцен: перспектива комнаты и простые SVG-фигуры.
// Сцены строятся в «мире» 1600×900: камера смотрит на заднюю стену комнаты.
// Камера: D — расстояние до задней стены (м), F — пикселей на метр у стены,
// VX, VY — точка схода, H — высота камеры (м)
export function camera({ D = 4, F = 170, VX = 860, VY = 400, H = 200 / 170 } = {}) {
  return function P(X, Y, d) {
    const f = D / (D - d);
    return [VX + X * F * f, VY + (H - Y) * F * f];
  };
}

const n = (v) => Math.round(v * 10) / 10;
export const pts = (list) => list.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

export function poly(list, fill, extra = '') {
  return `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
}
export function line(a, b, stroke, w = 2, extra = '') {
  return `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
}
export function ell(c, rx, ry, fill, extra = '') {
  return `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
}
export function path(d, fill = 'none', stroke = 'none', w = 1, extra = '') {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
}
export const mv = (p) => `${n(p[0])} ${n(p[1])}`;

// Прямоугольник на плоскости глубины d (смотрит на камеру)
export function front(P, X0, X1, Y0, Y1, d) {
  return [P(X0, Y0, d), P(X1, Y0, d), P(X1, Y1, d), P(X0, Y1, d)];
}

// Коробка: видимые грани (боковая, верхняя, передняя)
export function box(P, X0, X1, Y0, Y1, d0, d1, cf, ct, cs, H = 200 / 170, extra = '') {
  const out = [];
  if (X0 > 0) out.push(poly([P(X0, Y0, d0), P(X0, Y1, d0), P(X0, Y1, d1), P(X0, Y0, d1)], cs, extra));
  else if (X1 < 0) out.push(poly([P(X1, Y0, d0), P(X1, Y1, d0), P(X1, Y1, d1), P(X1, Y0, d1)], cs, extra));
  if (Y1 < H) out.push(poly([P(X0, Y1, d0), P(X1, Y1, d0), P(X1, Y1, d1), P(X0, Y1, d1)], ct, extra));
  out.push(poly(front(P, X0, X1, Y0, Y1, d1), cf, extra));
  return out.join('');
}

// ---------- Формы активных зон (для щелчков) ----------

// Выпуклая оболочка точек
function hull(list) {
  const p = [...list].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Зона по «коробке» предмета в метрах: контур всех восьми углов на экране
export function zoneBox(P, X0, X1, Y0, Y1, d0, d1) {
  const corners = [];
  for (const X of [X0, X1]) for (const Y of [Y0, Y1]) for (const d of [d0, d1]) corners.push(P(X, Y, d));
  return { points: hull(corners) };
}

// Зона-круг вокруг точки на экране
export function zoneCircle(p, r) {
  return { circle: [p[0], p[1], r] };
}

// Зона по произвольным точкам на экране
export function zonePoints(list) {
  return { points: hull(list) };
}

// Повторяемый генератор случайных чисел: картинка одинакова при каждом запуске
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Паркет: клетки с планками, как в референсе
export function parquet(P, { XL = -2, XR = 2.235, light, dark, seam, seed = 3, step = 0.34, depth = 3.2, clipId }) {
  const r = rng(seed);
  const floor = [[0, 905], P(XL, 0, 0), P(XR, 0, 0), [1600, 789], [1600, 905]];
  let s = `<clipPath id="${clipId}"><polygon points="${pts(floor)}"/></clipPath><g clip-path="url(#${clipId})">`;
  s += poly(floor, dark[0]);
  for (let X = XL - 6, i = 0; X < XL + 8; X += step, i++) {
    for (let d = 0, j = 0; d < depth; d += step, j++) {
      const isLight = (i + j) % 2 === 0;
      const base = (isLight ? light : dark)[Math.floor(r() * 3)];
      s += poly([P(X, 0, d), P(X + step, 0, d), P(X + step, 0, d + step), P(X, 0, d + step)], base);
      for (let k = 1; k < 4; k++) {
        if (isLight) {
          const t = X + (step * k) / 4;
          s += line(P(t, 0, d), P(t, 0, d + step), seam, 0.8, 'opacity="0.5"');
        } else {
          const t = d + (step * k) / 4;
          s += line(P(X, 0, t), P(X + step, 0, t), seam, 0.8, 'opacity="0.5"');
        }
      }
    }
  }
  return s + '</g>';
}

// Плитка на полу кухни
export function tiles(P, { XL = -2, XR = 2.235, a, b, grout, step = 0.3, depth = 3.2, clipId }) {
  const floor = [[0, 905], P(XL, 0, 0), P(XR, 0, 0), [1600, 789], [1600, 905]];
  let s = `<clipPath id="${clipId}"><polygon points="${pts(floor)}"/></clipPath><g clip-path="url(#${clipId})">`;
  s += poly(floor, grout);
  for (let X = XL - 6, i = 0; X < XL + 8; X += step, i++) {
    for (let d = 0, j = 0; d < depth; d += step, j++) {
      const g = 0.012;
      s += poly([P(X + g, 0, d + g), P(X + step - g, 0, d + g), P(X + step - g, 0, d + step - g), P(X + g, 0, d + step - g)], (i + j) % 2 ? a : b);
    }
  }
  return s + '</g>';
}

// Фото-якорь: одинаково в обоих мирах — настоящая фотография, без стилизации
export function anchorPhoto(cx, cy, w, extra = '') {
  const h = w * 1.15;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const k = w / 80;
  const X = (v) => n(x + v * k);
  const Y = (v) => n(y + v * k);
  return `<g ${extra}>
    <rect x="${X(0)}" y="${Y(0)}" width="${n(w)}" height="${n(h)}" fill="#fbfbf7" stroke="#222" stroke-width="${n(1.4 * k)}"/>
    <rect x="${X(7)}" y="${Y(7)}" width="${n(66 * k)}" height="${n(64 * k)}" fill="#86b8de"/>
    <rect x="${X(7)}" y="${Y(52)}" width="${n(66 * k)}" height="${n(19 * k)}" fill="#e6e0d4"/>
    <rect x="${X(7)}" y="${Y(7)}" width="${n(30 * k)}" height="${n(45 * k)}" fill="#b3d5ee" stroke="#fff" stroke-width="${n(2 * k)}"/>
    <rect x="${X(46)}" y="${Y(44)}" width="${n(16 * k)}" height="${n(6 * k)}" fill="#c0572e"/>
    <circle cx="${X(30)}" cy="${Y(36)}" r="${n(7 * k)}" fill="#e3ad88"/>
    <path d="M${X(23)} ${Y(33)}q${n(7 * k)} ${n(-10 * k)} ${n(14 * k)} 0" fill="#5a3a22"/>
    <path d="M${X(20)} ${Y(52)}q${n(10 * k)} ${n(-12 * k)} ${n(20 * k)} 0z" fill="#3a6fb0"/>
    <circle cx="${X(54)}" cy="${Y(30)}" r="${n(9 * k)}" fill="#e3ad88"/>
    <path d="M${X(44)} ${Y(29)}q${n(10 * k)} ${n(-16 * k)} ${n(20 * k)} 0v${n(10 * k)}q${n(-3 * k)} ${n(-8 * k)} ${n(-10 * k)} ${n(-8 * k)}t${n(-10 * k)} ${n(8 * k)}z" fill="#7a4a2a"/>
    <path d="M${X(42)} ${Y(52)}q${n(12 * k)} ${n(-16 * k)} ${n(24 * k)} 0z" fill="#c9433a"/>
  </g>`;
}

