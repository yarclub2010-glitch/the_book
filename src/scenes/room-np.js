// Комната Тихона, мир «Не приходи»: кинематографичный реализм. Два варианта: ночь и утро.
// Фон — кадр R-NP-1. Поверх рисуется только живое: свет лампы, поезд, пыль, огонёк диктофона.
import * as A from '../engine/art.js';

const B = A.plate('assets/backgrounds/R-NP-1.jpg', 1376, 768);
// утро — отдельный кадр той же комнаты (R-NP-1-morning), с той же точки
const BM = A.plate('assets/backgrounds/R-NP-1-morning.jpg', 1376, 768);
const plateOf = (time) => (time === 'morning' ? BM : B);
const WIN = [470, 22, 698, 222]; // стекло окна, пиксели картинки

function lighting(time) {
  const { I } = plateOf(time);
  const lamp = I(398, 160);
  const screen = I(418, 280);
  const rec = I(343, 316);
  let s = '';
  if (time !== 'morning') {
    s += `<circle class="flicker" cx="${lamp[0]}" cy="${lamp[1] + 40}" r="460" fill="url(#rn-warm)" style="mix-blend-mode:screen"/>`;
    s += `<circle cx="${screen[0]}" cy="${screen[1]}" r="160" fill="url(#rn-blue)" style="mix-blend-mode:screen"/>`;
  }
  // диктофон на столе пишет всю ночь — мигает красным
  s += `<circle class="blink" cx="${rec[0]}" cy="${rec[1]}" r="3.2" fill="#ff3b2f"/>`;
  const r = A.rng(11);
  const [cx, cy] = time !== 'morning' ? lamp : I(760, 240);
  for (let i = 0; i < 18; i++) {
    s += `<circle class="dust" cx="${(cx - 180 + r() * 360).toFixed(0)}" cy="${(cy + r() * 260).toFixed(0)}" r="${(1 + r() * 1.8).toFixed(1)}" fill="#ffe7b0" opacity="${(0.3 + r() * 0.4).toFixed(2)}" style="animation-delay:${(-r() * 12).toFixed(1)}s"/>`;
  }
  return s;
}

function defs() {
  return `<defs>
    <radialGradient id="rn-warm"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.22"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient>
    <radialGradient id="rn-blue"><stop offset="0" stop-color="#8fb3ff" stop-opacity="0.18"/><stop offset="1" stop-color="#8fb3ff" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function build(time) {
  return [defs(), plateOf(time).image('class="bg"'), lighting(time)].join('');
}

// ---------- Активные зоны ----------
// Предметы-истории: из щелчков складывается прошлое семьи. shot — куда подойдёт камера.

const LINES = {
  laptop: ['Трек «дом_03». Скрип половицы, чайник, поезд. Лучшее, что я сделал за год.', 'Мама послушала, сказала: «Грустно». И попросила поставить ещё раз.'],
  mic: ['Микрофон купил на деньги за лето. Слышит даже, как оседает пыль.'],
  headphones: ['Наушники. В них дом звучит громче, чем на самом деле.', 'Иногда я слышу в записи то, чего не слышал в комнате.'],
  records: ['Пластинки Веры. Уехала, а музыку оставила.', 'Я их не трогаю. Слушаю по одной в неделю — чтобы надолго хватило.'],
  mags: ['Журналы про звук. Между ними — открытка из Петербурга.', 'Мост, вода и подпись: «Здесь всё реставрируют. Даже людей. В.» Мама её не видела — я забрал из ящика первым.'],
  panels: ['Поролон на стене — чтобы поезда не лезли в запись. Не помогает.', 'Под панелью карандашом — крестики. Ночи, когда был скрип. Двадцать один подряд.'],
  window: {
    night: ['Ночью от насыпи остаются только окна электричек.', 'Поезд проходит на уровне крыши. Стёкла отвечают ему звоном.'],
    morning: ['Насыпь на уровне крыши. В детстве я думал, что поезда едут по небу.'],
    evening: ['Вечерние электрички идут одна за другой. Окна дрожат через раз.'],
  },
  lamp: ['Лампа Веры. Забрал её в то утро, когда она уехала. Больше в её комнату я не заходил.'],
  recorder: ['Диктофон пишет всю ночь. Утром — три часа тишины и пять секунд чего-то.', 'Этих пяти секунд мне хватает, чтобы не спать.'],
  bed: ['Кровать. Спать здесь я давно разучился.'],
  jacket: ['Папина старая форменная куртка. Сплю под ней — так теплее.', 'Пахнет мазутом и железом. Папа приносит этот запах с насыпи.'],
  radiator: ['Батарея стучит по ночам. Первую неделю я думал, что это и есть скрип.', 'Нет. У батареи ритма нет. А у скрипа есть. Он ходит.'],
  cables: ['Провода. Мама каждый раз спотыкается и ничего не говорит.', 'Раньше она бы ругалась. Раньше много чего было.'],
  box: ['Ящик «детство». Там наш с Верой набор «Юный химик».', 'Половину опытов мы брали из её старой книги. Лимонные чернила, водяные знаки…'],
};

function hotspots(time) {
  const B = plateOf(time);
  const zones = {
    panels: [B.rect(110, 22, 305, 300), 'Панели', 'panels'],
    window: [B.rect(466, 16, 762, 266), 'Окно', 'window'],
    bed: [B.rect(790, 280, 955, 640), 'Кровать', 'bed'],
    radiator: [B.rect(582, 292, 645, 470), 'Батарея', 'desk'],
    cables: [B.rect(300, 470, 800, 560), 'Провода', 'floor'],
    box: [B.rect(62, 548, 300, 668), 'Ящик', 'floor'],
    mags: [B.rect(152, 330, 322, 390), 'Журналы', 'desk'],
    records: [B.rect(325, 345, 512, 392), 'Пластинки', 'desk'],
    laptop: [B.rect(368, 232, 548, 345), 'Ноутбук', 'desk'],
    recorder: [B.rect(258, 302, 358, 330), 'Диктофон', 'recorder'],
    headphones: [B.circle(533, 300, 20), 'Наушники', 'desk'],
    mic: [B.circle(492, 190, 36), 'Микрофон', 'desk'],
    lamp: [B.circle(398, 156, 48), 'Лампа', 'lamp'],
    // куртка лежит на кровати ближе к камере — её зона сверху
    jacket: [B.rect(925, 285, 1130, 520), 'Куртка', 'jacket'],
  };
  // порядок = слои: крупное снизу, мелкое сверху
  return Object.entries(zones).map(([id, [shape, label, shot]]) => {
    const l = LINES[id];
    // осмотр: крупная фотография предмета
    const view = { laptop: 'assets/items/I-LAPTOP.jpg', recorder: 'assets/items/I-RECORDER.jpg', mags: 'assets/items/I-POSTCARD.jpg' }[id];
    return { id, label, shape, shot, view, lines: Array.isArray(l) ? l : l[time] || l.night };
  });
}

// Ракурсы. Ночной кадр с чёрными полосами — общий план их обрезает
const shotsFor = (time) => {
  const B = plateOf(time);
  const wide = time === 'morning' ? [0, 0, 1600, 900] : [116, 14, 1367, 769];
  return {
    wide,
    room: wide,
    desk: B.shot(400, 300, 620),
    window: B.shot(600, 150, 460),
    recorder: B.shot(330, 320, 360),
    lamp: B.shot(410, 210, 420),
    bed: B.shot(1060, 420, 640),
    jacket: B.shot(1030, 400, 480),
    panels: B.shot(210, 170, 520),
    floor: B.shot(420, 560, 700),
  };
};

function scene(time) {
  return {
    id: `room-np-${time}`,
    world: 'np',
    title: 'Комната Тихона',
    bg: plateOf(time).src,
    shots: shotsFor(time),
    ambience: ['room'],
    build: () => build(time),
    hotspots: hotspots(time),
    events: {
    },
  };
}

export const roomNight = scene('night');
export const roomMorning = scene('morning');
export const roomEvening = scene('evening');
