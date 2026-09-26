// Комната Тихона ночью, мир «Не приходи»: кинематографичный реализм.
import * as A from '../engine/art.js';

const P = A.camera();
const { poly, line, ell, path, mv, box } = A;
const front = (...a) => A.front(P, ...a);
const bx = (...a) => box(P, ...a);

const XL = -2;
const XR = 2.235;
const YC = 2.705;
const WIN = [0.12, 1.76, 1.0, 2.45];
const WOOD_D = '#2e1d12';
const WOOD_M = '#4a3020';
const WOOD_L = '#6b4a31';
const METAL = '#1f1d1b';

function shell() {
  let s = '';
  s += poly([[0, 0], [1600, 0], P(XR, YC, 0), P(XL, YC, 0)], '#2a1e14');
  s += poly(front(XL, XR, 0, YC, 0), '#7a5b38');
  s += poly(front(XL, XR, 0, YC, 0), 'url(#rn-paper)');
  const left = [[0, 0], P(XL, YC, 0), P(XL, 0, 0), [0, 905]];
  s += poly(left, '#5a4128') + poly(left, 'url(#rn-paper)', 'opacity="0.7"');
  const right = [P(XR, YC, 0), [1600, 0], [1600, 789], P(XR, 0, 0)];
  s += poly(right, '#5f4529') + poly(right, 'url(#rn-paper)', 'opacity="0.7"');
  s += poly([P(XL, 0, 0), P(XR, 0, 0), P(XR, 0.08, 0), P(XL, 0.08, 0)], '#3a2716');
  return s;
}

function windowView() {
  const [X0, X1, Y0, Y1] = WIN;
  const w = front(X0, X1, Y0, Y1, 0);
  let s = `<clipPath id="rn-win"><polygon points="${A.pts(w)}"/></clipPath><g clip-path="url(#rn-win)">`;
  s += poly(w, 'url(#rn-sky)');
  // огни города вдали
  const r = A.rng(4);
  for (let i = 0; i < 26; i++) {
    const p = P(X0 + r() * (X1 - X0), 1.05 + r() * 0.35, 0);
    s += ell(p, 1.8, 1.8, i % 5 ? '#ffd9a0' : '#9fc2ff', `opacity="${(0.35 + r() * 0.5).toFixed(2)}" class="twinkle" style="animation-delay:${(-r() * 6).toFixed(1)}s"`);
  }
  // насыпь на уровне крыши
  const a = P(X0, 1.55, 0);
  const b = P(X1, 1.72, 0);
  s += poly([a, b, P(X1, 0.9, 0), P(X0, 0.9, 0)], '#0d0f14');
  s += line(a, b, '#5c6470', 2) + line(P(X0, 1.6, 0), P(X1, 1.77, 0), '#3a404a', 1.5);
  // столб с красным сигналом
  s += line(P(0.3, 1.58, 0), P(0.3, 2.12, 0), '#0b0c10', 3);
  s += ell(P(0.3, 2.1, 0), 3.5, 3.5, '#ff4a3a', 'class="signal"');
  s += ell(P(0.3, 2.1, 0), 14, 14, '#ff4a3a', 'opacity="0.25" class="signal"');
  // электричка: едет по событию «train»
  s += '<g id="rn-train" class="train">';
  s += poly([P(X0 - 0.3, 1.6, 0), P(X1 + 0.3, 1.8, 0), P(X1 + 0.3, 2.05, 0), P(X0 - 0.3, 1.85, 0)], '#15171b');
  for (let k = 0; k < 11; k++) {
    const t0 = X0 - 0.2 + ((X1 - X0 + 0.4) * k) / 11;
    const yb = 1.66 + (0.17 * (t0 - X0)) / (X1 - X0);
    s += poly([P(t0, yb, 0), P(t0 + 0.1, yb + 0.012, 0), P(t0 + 0.1, yb + 0.12, 0), P(t0, yb + 0.108, 0)], '#ffcf7a', 'opacity="0.95"');
  }
  s += '</g></g>';
  return s;
}

function windowFrame() {
  const [X0, X1, Y0, Y1] = WIN;
  let s = poly(front(X0, X1, Y0, Y1, 0), 'none', 'stroke="#2b1d12" stroke-width="12"');
  const mid = (X0 + X1) / 2;
  s += line(P(mid, Y0, 0), P(mid, Y1, 0), '#2b1d12', 10);
  s += line(P(X0, 1.95, 0), P(X1, 1.95, 0), '#2b1d12', 7);
  s += bx(X0 - 0.08, X1 + 0.08, Y0 - 0.05, Y0, 0, 0.12, '#8a7a64', '#b5a58c', '#6d604f');
  return s;
}

function curtains() {
  const [X0, X1] = WIN;
  const tone = '#d8cbb2';
  let s = line(P(X0 - 0.3, 2.6, 0.05), P(X1 + 0.35, 2.6, 0.05), '#1a120b', 5);
  const a = P(X0 - 0.25, 2.6, 0.06);
  const b = P(X0 + 0.55, 2.6, 0.06);
  const c = P(X0 + 0.28, 1.55, 0.08);
  const e = P(X0 + 0.05, 0.98, 0.1);
  const f = P(X0 - 0.28, 0.98, 0.1);
  const g = P(X0 - 0.05, 1.55, 0.08);
  s += `<g class="sway" style="transform-origin:${mv(a).replace(' ', 'px ')}px">`;
  s += path(`M${mv(a)} L${mv(b)} Q${mv(P(X0 + 0.5, 2.0, 0.07))} ${mv(c)} Q${mv(P(X0 + 0.3, 1.2, 0.1))} ${mv(e)} L${mv(f)} Q${mv(P(X0 - 0.35, 1.3, 0.1))} ${mv(g)} Q${mv(P(X0 - 0.3, 2.1, 0.07))} ${mv(a)}Z`, tone, 'none', 1, 'opacity="0.82"');
  for (let k = 0; k < 5; k++) {
    const t = k / 4;
    s += path(`M${mv(P(X0 - 0.2 + 0.7 * t, 2.58, 0.06))} Q${mv(P(X0 + 0.2 + 0.1 * t, 2.0, 0.07))} ${mv(P(X0 + 0.02 + 0.2 * t, 1.55, 0.08))}`, 'none', '#00000033', 2);
  }
  s += '</g>';
  s += poly([P(X1 - 0.15, 2.6, 0.06), P(X1 + 0.3, 2.6, 0.06), P(X1 + 0.3, 0.95, 0.06), P(X1 - 0.15, 0.95, 0.06)], tone, 'opacity="0.9"');
  for (let k = 1; k < 6; k++) {
    const x = X1 - 0.15 + (0.45 * k) / 6;
    s += line(P(x, 2.6, 0.06), P(x, 0.95, 0.06), '#00000030', 3);
  }
  return s;
}

function desk() {
  let s = bx(1.35, 1.95, 0, 0.72, 0.05, 0.62, WOOD_M, WOOD_L, WOOD_D);
  for (let k = 0; k < 3; k++) {
    const y0 = 0.08 + k * 0.21;
    s += poly(front(1.4, 1.9, y0, y0 + 0.18, 0.62), '#3d2819', 'stroke="#241609" stroke-width="2"');
    const hc = P(1.65, y0 + 0.12, 0.62);
    s += line([hc[0] - 14, hc[1]], [hc[0] + 14, hc[1]], '#c9a36b', 3);
  }
  s += bx(0.0, 0.05, 0, 0.72, 0.05, 0.62, WOOD_M, WOOD_L, WOOD_D);
  s += bx(-0.02, 1.97, 0.72, 0.77, 0.0, 0.66, '#3a2617', '#5e412a', WOOD_D);
  return s;
}

function chair() {
  const c = '#23170e';
  let s = '';
  for (const X of [0.42, 0.82]) for (const d of [0.95, 1.3]) s += line(P(X, 0, d), P(X, 0.45, d), c, 5);
  s += bx(0.4, 0.85, 0.44, 0.48, 0.93, 1.32, c, '#3b2819', c);
  for (const X of [0.44, 0.8]) s += line(P(X, 0.48, 1.32), P(X, 0.98, 1.34), c, 6);
  s += line(P(0.43, 0.97, 1.34), P(0.81, 0.97, 1.34), c, 8);
  for (let k = 1; k < 4; k++) {
    const X = 0.44 + (0.36 * k) / 4;
    s += line(P(X, 0.55, 1.33), P(X, 0.95, 1.34), c, 4);
  }
  return s;
}

function bed() {
  const sheet = '#8f887c';
  const blanket = '#3b3a38';
  let s = bx(1.3, XR, 0.18, 0.42, 0.45, 2.45, '#1c1a18', '#2a2826', '#1c1a18');
  s += bx(1.33, XR - 0.02, 0.42, 0.55, 0.47, 2.43, sheet, sheet, sheet);
  s += poly([P(1.33, 0.56, 1.1), P(XR - 0.02, 0.56, 1.1), P(XR - 0.02, 0.56, 2.43), P(1.33, 0.56, 2.43)], blanket);
  s += poly([P(1.33, 0.2, 1.1), P(1.33, 0.56, 1.1), P(1.33, 0.56, 2.43), P(1.33, 0.2, 2.43)], blanket, 'opacity="0.95"');
  s += ell(P(1.78, 0.62, 0.72), 58, 20, sheet);
  for (const [d, h] of [[0.45, 1.15], [2.45, 0.95]]) {
    s += line(P(1.3, 0, d), P(1.3, h, d), METAL, 6);
    s += path(`M${mv(P(1.3, h, d))} Q${mv(P(1.75, h + 0.12, d))} ${mv(P(XR, h, d))}`, 'none', METAL, 6);
    for (let k = 1; k < 6; k++) {
      const X = 1.3 + ((XR - 1.3) * k) / 6;
      s += line(P(X, 0.4, d), P(X, h - 0.02, d), METAL, 2.5);
    }
  }
  // диктофон на кровати, мигает красным
  const rec = P(1.9, 0.57, 1.6);
  s += poly([[rec[0] - 16, rec[1] - 6], [rec[0] + 16, rec[1] - 6], [rec[0] + 18, rec[1] + 8], [rec[0] - 14, rec[1] + 8]], '#18191b');
  s += ell([rec[0] + 10, rec[1] - 1], 3, 3, '#ff3b2f', 'class="blink"');
  return s;
}

function cabinet() {
  const X1 = -1.52;
  let s = bx(XL, X1, 0, 2.25, 0.2, 2.35, WOOD_D, WOOD_M, '#3b2616');
  const Fp = (Y, d) => P(X1, Y, d);
  for (const Y of [0.75, 1.2, 1.65, 2.1]) s += line(Fp(Y, 0.25), Fp(Y, 2.3), '#1d1209', 3);
  for (const d of [0.25, 1.0, 1.65, 2.3]) s += line(Fp(0.05, d), Fp(2.2, d), '#1d1209', 4);
  for (const [d0, d1] of [[0.3, 0.95], [1.05, 1.6], [1.7, 2.25]]) {
    s += poly([Fp(0.1, d0), Fp(0.1, d1), Fp(0.7, d1), Fp(0.7, d0)], '#3d2818', 'stroke="#20140a" stroke-width="2"');
  }
  const r = A.rng(8);
  const cols = ['#b0321f', '#d9a441', '#e7dcc3', '#2f5d7c', '#7a4a2a', '#141414'];
  for (let d = 0.3; d < 2.2;) {
    const wdt = 0.03 + r() * 0.03;
    s += poly([Fp(1.22, d), Fp(1.22, d + wdt), Fp(1.62, d + wdt), Fp(1.62, d)], cols[Math.floor(r() * cols.length)]);
    d += wdt + 0.005;
  }
  for (let d = 0.35; d < 2.2;) {
    const wdt = 0.05 + r() * 0.04;
    const h = 0.25 + r() * 0.15;
    s += poly([Fp(0.76, d), Fp(0.76, d + wdt), Fp(0.76 + h, d + wdt), Fp(0.76 + h, d)], cols[Math.floor(r() * cols.length)]);
    d += wdt + 0.02;
  }
  return s;
}

function dresser() {
  let s = bx(-1.42, -0.72, 0, 0.9, 0.02, 0.5, '#2c1c10', '#4a3121', '#3a2616');
  for (let k = 0; k < 2; k++) {
    const y0 = 0.08 + k * 0.4;
    s += poly(front(-1.38, -0.76, y0, y0 + 0.34, 0.5), '#35231a', 'stroke="#1a1008" stroke-width="2"');
    const hc = P(-1.07, y0 + 0.24, 0.5);
    s += line([hc[0] - 12, hc[1]], [hc[0] + 12, hc[1]], '#a88452', 3);
  }
  for (const Xa of [-1.36, -1.02]) {
    s += bx(Xa, Xa + 0.24, 0.9, 1.26, 0.12, 0.38, '#151412', '#2a2826', '#1d1c1a');
    s += ell(P(Xa + 0.12, 1.02, 0.38), 17, 17, '#0a0a0a', 'stroke="#3c3a37" stroke-width="3"');
    s += ell(P(Xa + 0.12, 1.19, 0.38), 6, 6, '#0a0a0a', 'stroke="#3c3a37" stroke-width="2"');
  }
  return s;
}

function wallDecor() {
  let s = '';
  // звукопоглощающие панели
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      const Xa = -0.6 + i * 0.2;
      const Ya = 1.25 + j * 0.2;
      const q = front(Xa, Xa + 0.18, Ya, Ya + 0.18, 0);
      const c = P(Xa + 0.09, Ya + 0.09, 0);
      s += poly(q, '#262422') + poly([q[0], q[1], c], '#1c1a19') + poly([q[3], q[2], c], '#34312e');
    }
  }
  // постер со звуковой волной на правой стене
  s += poly([P(XR, 2.05, 0.35), P(XR, 2.05, 0.95), P(XR, 1.25, 0.95), P(XR, 1.25, 0.35)], '#d9602f');
  for (let k = 0; k < 12; k++) {
    const d = 0.4 + k * 0.045;
    const h = 0.08 + 0.25 * Math.abs(Math.sin(k * 1.3));
    s += line(P(XR, 1.65 - h, d), P(XR, 1.65 + h, d), '#1a1411', 4);
  }
  return s;
}

function deskItems() {
  let s = '';
  // ноутбук с «живой» волной трека
  s += bx(0.45, 0.95, 0.77, 0.79, 0.22, 0.48, '#2c2d30', '#3b3d41', '#232427');
  s += poly([P(0.47, 0.79, 0.22), P(0.93, 0.79, 0.22), P(0.93, 1.1, 0.16), P(0.47, 1.1, 0.16)], '#1b1d22');
  s += poly([P(0.49, 0.81, 0.215), P(0.91, 0.81, 0.215), P(0.91, 1.08, 0.165), P(0.49, 1.08, 0.165)], 'url(#rn-screen)');
  for (let k = 0; k < 18; k++) {
    const X = 0.51 + k * 0.022;
    const c = P(X, 0.945, 0.19);
    const h = 7 + 16 * Math.abs(Math.sin(k * 0.9));
    s += `<rect class="wave" x="${(c[0] - 1.3).toFixed(1)}" y="${(c[1] - h).toFixed(1)}" width="2.6" height="${(2 * h).toFixed(1)}" fill="#f2a24a" style="animation-delay:${(-k * 0.13).toFixed(2)}s"/>`;
  }
  // аудиокарта
  s += bx(1.02, 1.22, 0.77, 0.83, 0.25, 0.42, '#b0321f', '#cf4a33', '#8c2718');
  for (let k = 0; k < 2; k++) s += ell(P(1.07 + k * 0.1, 0.8, 0.42), 5, 5, '#1a1a1a');
  // микрофон на стойке
  const base = P(0.2, 0.77, 0.12);
  const joint = P(0.18, 1.35, 0.1);
  const mic = P(0.42, 1.22, 0.3);
  s += path(`M${mv(base)} L${mv(joint)} L${mv(mic)}`, 'none', '#111', 5);
  s += ell(mic, 16, 26, '#26272a', 'stroke="#555" stroke-width="2"');
  s += ell(P(0.55, 1.2, 0.36), 30, 34, '#0e0f12', 'opacity="0.55" stroke="#333" stroke-width="2"');
  // наушники
  const hp = P(1.3, 0.8, 0.52);
  s += path(`M${hp[0] - 26} ${hp[1]} Q${hp[0]} ${hp[1] - 42} ${hp[0] + 26} ${hp[1]}`, 'none', '#141414', 6);
  s += ell([hp[0] - 26, hp[1] + 2], 10, 13, '#d9602f') + ell([hp[0] + 26, hp[1] + 2], 10, 13, '#d9602f');
  // настольная лампа
  const lb = P(1.72, 0.77, 0.32);
  const la = P(1.66, 1.12, 0.3);
  const ls = P(1.5, 1.14, 0.32);
  s += ell(lb, 20, 6, '#1b1b1b') + path(`M${mv(lb)} L${mv(la)} L${mv(ls)}`, 'none', '#1b1b1b', 4);
  s += path(`M${ls[0] - 20} ${ls[1] + 12} L${ls[0] - 6} ${ls[1] - 10} L${ls[0] + 10} ${ls[1] - 8} L${ls[0] + 20} ${ls[1] + 14}Z`, '#c9a14a');
  s += ell([ls[0], ls[1] + 14], 20, 5, '#fff1c4');
  return s;
}

function floorItems() {
  let s = '';
  const ps = P(0.9, 0.0, 1.0);
  s += poly([[ps[0] - 40, ps[1] - 5], [ps[0] + 40, ps[1] - 5], [ps[0] + 44, ps[1] + 7], [ps[0] - 44, ps[1] + 7]], '#e6e1d8');
  for (let k = 0; k < 3; k++) s += ell([ps[0] - 20 + k * 20, ps[1]], 3, 2, '#ff3b2f');
  [[0.6, 0.55], [1.1, 0.5], [0.25, 0.4]].forEach(([X, d], k) => {
    const a = P(X, 0.74, d);
    const b = [ps[0] - 30 + k * 25, ps[1]];
    s += path(`M${mv(a)} C${a[0]} ${a[1] + 80} ${b[0] - 40} ${b[1] - 20} ${mv(b)}`, 'none', '#0e0e0e', 3);
  });
  return s;
}

function lighting() {
  const ls = P(1.5, 1.1, 0.32);
  const scr = P(0.7, 0.95, 0.2);
  let s = '';
  s += '<rect width="1600" height="900" fill="url(#rn-dark)"/>';
  s += `<circle class="flicker" cx="${ls[0]}" cy="${ls[1] + 40}" r="520" fill="url(#rn-warm)"/>`;
  s += `<circle cx="${scr[0]}" cy="${scr[1]}" r="220" fill="url(#rn-blue)"/>`;
  // отсвет проходящей электрички бежит по потолку и стене
  s += '<g id="rn-trainlight" class="trainlight">';
  for (let k = 0; k < 4; k++) {
    s += `<rect x="${300 + k * 140}" y="30" width="70" height="130" fill="#ffd9a0" opacity="0.13" transform="skewX(-25)"/>`;
  }
  s += '</g>';
  // пыль в свете лампы
  const r = A.rng(11);
  for (let i = 0; i < 18; i++) {
    s += `<circle class="dust" cx="${(ls[0] - 180 + r() * 360).toFixed(0)}" cy="${(ls[1] + r() * 260).toFixed(0)}" r="${(1 + r() * 1.8).toFixed(1)}" fill="#ffe7b0" opacity="${(0.35 + r() * 0.4).toFixed(2)}" style="animation-delay:${(-r() * 12).toFixed(1)}s"/>`;
  }
  return s;
}

function defs() {
  const ls = P(1.5, 1.1, 0.32);
  return `<defs>
    <pattern id="rn-paper" width="46" height="60" patternUnits="userSpaceOnUse">
      <path d="M23 6c8 8 8 18 0 26c-8-8-8-18 0-26zM0 36c8 6 10 14 4 22M46 36c-8 6-10 14-4 22" fill="none" stroke="#2a1a0c" stroke-opacity="0.22" stroke-width="2"/>
    </pattern>
    <linearGradient id="rn-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141b2a"/><stop offset="1" stop-color="#2d3346"/></linearGradient>
    <linearGradient id="rn-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3550"/><stop offset="1" stop-color="#101626"/></linearGradient>
    <radialGradient id="rn-dark" cx="${(ls[0] / 16).toFixed(1)}%" cy="${(ls[1] / 9).toFixed(1)}%" r="75%">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.35" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0.84"/>
    </radialGradient>
    <radialGradient id="rn-warm"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.42"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient>
    <radialGradient id="rn-blue"><stop offset="0" stop-color="#8fb3ff" stop-opacity="0.25"/><stop offset="1" stop-color="#8fb3ff" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function build() {
  return [
    defs(), shell(), windowView(), windowFrame(), wallDecor(), curtains(),
    A.parquet(P, { light: ['#a98b63', '#b39670', '#a3855d'], dark: ['#7d6243', '#86694a', '#735a3d'], seam: '#5a4430', clipId: 'rn-floor' }),
    dresser(), desk(), deskItems(), cabinet(), bed(), chair(), floorItems(), lighting(),
  ].join('');
}

// Ракурсы: [x, y, ширина, высота] в координатах сцены 1600×900
const shots = {
  wide: [0, 0, 1600, 900],
  room: [120, 90, 1360, 765],
  desk: [600, 250, 680, 383],
  window: [760, 170, 520, 293],
  recorder: [1180, 440, 460, 259],
  door: [0, 150, 900, 506],
};

export default {
  id: 'room-np',
  world: 'np',
  title: 'Комната Тихона',
  shots,
  ambience: ['room'],
  build,
  events: {
    // Поезд за окном: огни вагонов и отсвет на потолке
    train(root) {
      const t = root.querySelector('#rn-train');
      const l = root.querySelector('#rn-trainlight');
      [t, l].forEach((el) => {
        el.classList.remove('go');
        void el.getBBox();
        el.classList.add('go');
      });
      return 5200;
    },
  },
};
