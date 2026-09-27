// Экран телефона: приложение колонки «Мири», история того, что она слышала на кухне.
// Две версии: до и после того, как Мири записала сегодняшний вечер (глава 2).
// Загадка «Обрывки»: сложить обрывки нескольких вечеров по времени — получится целая фраза.
import * as A from '../engine/art.js';
import { audio } from '../engine/audio.js';

const BG = A.plate('assets/backgrounds/K-NP-1.jpg', 1376, 768);

// Обрывки: по датам они идут вразнобой, а по секундам складываются в «Тиша, ужинать!»
const ENTRIES = [
  { id: '14', date: '14 сентября', time: '19:02:13', text: '«…жи…»', piece: 'жи' },
  { id: '17', date: '17 сентября', time: '19:02:10', text: '«Ти…»', piece: 'Ти' },
  { id: '20', date: '20 сентября', time: '19:02:14', text: '«…нать!» · смех', piece: 'нать!' },
  { id: '27', date: 'Сегодня', time: '19:02:11', text: '«…ша, у…»', piece: 'ша, у', fresh: true },
];
const ORDER = [...ENTRIES].sort((a, b) => a.time.localeCompare(b.time)).map((e) => e.id);

const PHONE = { x: 540, y: 26, w: 520, h: 848 };
const card = (i) => ({ x: PHONE.x + 26, y: 256 + i * 126, w: PHONE.w - 52, h: 108 });
const HEAD = PHONE.y + 128; // шапка ниже плашки загадки

function build(withToday) {
  const { x, y, w, h } = PHONE;
  let s = `<defs><filter id="ph-blur"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
  s += BG.image('filter="url(#ph-blur)"');
  s += '<rect width="1600" height="900" fill="#05060a" opacity="0.55"/>';
  s += `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="54" fill="#0b0b0f" stroke="#3a3a42" stroke-width="3"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="#14151c"/>`;
  s += `<text x="${x + 34}" y="${HEAD}" font-family="Rubik, sans-serif" font-size="22" fill="#9f8cff">‹ Кухня</text>`;
  s += `<text x="${x + w / 2}" y="${HEAD}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="700" font-size="30" fill="#fff">Мири</text>`;
  s += `<text x="${x + w / 2}" y="${HEAD + 40}" text-anchor="middle" font-family="Rubik, sans-serif" font-size="20" fill="#8a8a99">История · кухня · фразы не распознаны</text>`;
  const list = ENTRIES.filter((e) => withToday || !e.fresh);
  list.forEach((e, i) => {
    const c = card(i);
    s += `<g class="frag" data-id="${e.id}">`;
    s += `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="20" fill="${e.fresh ? '#241f3d' : '#1d1e27'}" stroke="${e.fresh ? '#9f8cff' : '#2c2d38'}" stroke-width="2"/>`;
    s += `<text x="${c.x + 24}" y="${c.y + 34}" font-family="Rubik, sans-serif" font-size="19" fill="#8a8a99">${e.date} · ${e.time}</text>`;
    s += `<text x="${c.x + 24}" y="${c.y + 82}" font-family="Rubik, sans-serif" font-weight="700" font-size="34" fill="#f2f2f7">${e.text}</text>`;
    s += `<circle cx="${c.x + c.w - 40}" cy="${c.y + c.h / 2}" r="20" fill="none" stroke="#9f8cff" stroke-width="2.5"/><path d="M${c.x + c.w - 46} ${c.y + c.h / 2 - 9} l14 9 l-14 9z" fill="#9f8cff"/>`;
    s += '</g>';
  });
  const last = card(list.length);
  s += `<text x="${x + w / 2}" y="${last.y + 40}" text-anchor="middle" font-family="Rubik, sans-serif" font-size="19" fill="#6b6b78">Остальные вечера — тишина</text>`;
  return s;
}

function hotspots(withToday) {
  const rect = (c) => ({ points: [[c.x, c.y], [c.x + c.w, c.y], [c.x + c.w, c.y + c.h], [c.x, c.y + c.h]] });
  const list = [
    { id: 'back', label: 'Назад', shape: rect({ x: PHONE.x + 20, y: HEAD - 32, w: 120, h: 46 }), lines: [] },
  ];
  const entries = ENTRIES.filter((e) => withToday || !e.fresh);
  const last = card(entries.length);
  list.push({ id: 'quiet', label: 'Тишина', shape: rect({ x: last.x, y: last.y, w: last.w, h: 60 }), lines: ['Пятнадцатое, шестнадцатое, восемнадцатое… Тишина. Почему голоса только в эти вечера?'] });
  entries.forEach((e, i) => list.push({ id: `c${e.id}`, label: e.date, shape: rect(card(i)), lines: [] }));
  // обрывки для загадки — поверх карточек, включаются только во время загадки
  entries.forEach((e, i) => list.push({ id: `f${e.id}`, key: e.id, group: 'frags', label: '', shape: rect(card(i)) }));
  return list;
}

const fragsPuzzle = {
  group: 'frags',
  shot: 'wide',
  banner: 'Обрывки из разных вечеров. Сложите фразу.',
  hint: 'Каждый вечер — в 19:02. Смотри на секунды.',
  total: ORDER.length,
  pieces(progress) {
    return progress.order.map((id) => ENTRIES.find((e) => e.id === id).piece);
  },
  start(ui, progress, root) {
    progress.order = progress.order || [];
    progress.misses = progress.misses || 0;
    progress.order.forEach((id) => root.querySelector(`.frag[data-id="${id}"]`)?.classList.add('found'));
    ui.tray(this.total, this.pieces(progress));
  },
  pick(spot, ui, progress, root, at) {
    if (progress.order.includes(spot.key)) return false;
    if (ORDER[progress.order.length] === spot.key) {
      progress.order.push(spot.key);
      root.querySelector(`.frag[data-id="${spot.key}"]`).classList.add('found');
      audio.sfx('pluck');
      ui.tray(this.total, this.pieces(progress));
      return progress.order.length === this.total;
    }
    audio.sfx('thud');
    progress.misses++;
    ui.thought(progress.misses % 2 ? 'Не складывается.' : 'Каждый раз — 19:02. Одна и та же минута, разрезанная на кусочки.', at);
    return false;
  },
};

function scene(withToday) {
  return {
    id: withToday ? 'phone-new' : 'phone',
    world: 'np',
    title: 'Телефон',
    bg: BG.src,
    shots: { wide: [0, 0, 1600, 900] },
    ambience: ['fridge', 'clock'],
    build: () => build(withToday),
    hotspots: hotspots(withToday),
    events: {},
    puzzles: withToday ? { frags: fragsPuzzle } : {},
  };
}

export const phone = scene(false);
export const phoneNew = scene(true);

// Колонка крупно (I-MIRI): для сценки, когда Мири проигрывает запись
const MIRI = A.plate('assets/backgrounds/I-MIRI-2.jpg', 1376, 768);
const PHOTO = 'assets/backgrounds/I-PHOTO.jpg';
export const miriClose = {
  id: 'miri-close',
  world: 'np',
  title: 'Кухня',
  bg: MIRI.src,
  shots: { wide: [0, 0, 1600, 900], close: MIRI.shot(700, 380, 1000) },
  ambience: ['fridge', 'clock'],
  build: () => {
    const [x, y] = MIRI.I(912, 368);
    const [a, b] = [MIRI.I(432, 112), MIRI.I(640, 382)];
    const photo = `<clipPath id="mc-photo"><rect x="${a[0]}" y="${a[1]}" width="${b[0] - a[0]}" height="${b[1] - a[1]}"/></clipPath>
      <image href="${PHOTO}" x="${a[0]}" y="${a[1]}" width="${b[0] - a[0]}" height="${b[1] - a[1]}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mc-photo)"/>
      <rect x="${a[0]}" y="${a[1]}" width="${b[0] - a[0]}" height="${b[1] - a[1]}" fill="#2a1a0c" opacity="0.25"/>`;
    return `${MIRI.image('class="bg"')}${photo}<ellipse class="miri-ring" cx="${x}" cy="${y}" rx="${104 * MIRI.k}" ry="${9 * MIRI.k}" fill="none" stroke="#b9a4ff" stroke-width="5" style="filter:blur(2px)"/>`;
  },
  hotspots: [],
  events: {},
};
