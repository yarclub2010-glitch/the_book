// Комната Веры, мир «Не приходи»: шесть лет никто ничего не трогал — музей.
// vera-np — общий план от двери (V-NP-1), vera-desk — её рабочий стол крупно (V-NP-2).
import * as A from '../engine/art.js';

// УФ-лампа выключена (…-off); кадры с горящей лампой — на потом, когда её включат (класс uv-on)
const ROOM = A.plate('assets/backgrounds/V-NP-1-off.jpg', 1376, 768);
const ROOM_EMPTY = A.plate('assets/backgrounds/V-NP-1-nobook-off.jpg', 1376, 768);
const ROOM_UV = A.plate('assets/backgrounds/V-NP-1.jpg', 1376, 768);
const ROOM_EMPTY_UV = A.plate('assets/backgrounds/V-NP-1-nobook.jpg', 1376, 768);
const DESK = A.plate('assets/backgrounds/V-NP-2-2.jpg', 1376, 768);
// ночные кадры (класс vera-night от главы): та же разметка, за окном ночь, горят только лампы
const ROOM_N = A.plate('assets/backgrounds/V-NP-1-off-night.jpg', 1376, 768);
const ROOM_EMPTY_N = A.plate('assets/backgrounds/V-NP-1-nobook-off-night.jpg', 1376, 768);
const DESK_N = A.plate('assets/backgrounds/V-NP-2-2-night.jpg', 1376, 768);

function buildRoom() {
  const B = ROOM;
  let s = `<defs><radialGradient id="vr-lamp"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.28"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient>
</defs>`;
  s += B.image('class="bg"');
  // когда книгу унесли — тот же кадр без книги на столе (V-NP-1-nobook)
  s += ROOM_EMPTY.image('class="bg-nobook"');
  s += ROOM_UV.image('class="bg-uv"') + ROOM_EMPTY_UV.image('class="bg-uv bg-nobook"');
  s += ROOM_N.image('class="bg-vnight"') + ROOM_EMPTY_N.image('class="bg-vnight bg-nobook"');
  const lamp = B.I(675, 405);
  s += `<circle class="flicker" cx="${lamp[0]}" cy="${lamp[1]}" r="260" fill="url(#vr-lamp)" style="mix-blend-mode:screen"/>`;
  // пыль в свете лампы
  const r = A.rng(17);
  for (let i = 0; i < 16; i++) {
    s += `<circle class="dust" cx="${(lamp[0] - 160 + r() * 520).toFixed(0)}" cy="${(lamp[1] - 200 + r() * 260).toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}" fill="#ffe7b0" opacity="${(0.25 + r() * 0.4).toFixed(2)}" style="animation-delay:${(-r() * 12).toFixed(1)}s"/>`;
  }
  return s;
}

function buildDesk() {
  const B = DESK;
  let s = `<defs></defs>`;
  s += B.image('class="bg"') + DESK_N.image('class="bg-vnight"');
  return s;
}

const LOOK_ROOM = {
  door: ['Дверь', '', ['Дверь была закрыта шесть лет. Мама вытирает здесь пыль по воскресеньям — и больше ничего не трогает.']],
  posters: ['Плакаты', 'posters', ['Верины плакаты. Какие-то выставки, я никогда не понимал, что на них.', 'Уголок одного отклеился. Никто не приклеил обратно.']],
  window: ['Окно', 'window', ['Из её окна насыпь видно лучше всего. Она говорила: поезда — это часы, которые не врут.']],
  bed: ['Кровать', 'bed', ['Кровать застелена. Покрывало мама связала ей на шестнадцать лет.', 'На нём до сих пор вмятина — Вера сидела тут с ногами, когда читала.']],
  nightstand: ['Тумбочка', 'bed', ['Ночник и две книжки. В верхней — закладка на середине. Так и лежит шесть лет.']],
  sillbooks: ['Книги', 'window', ['Книги по реставрации. «Бумага и время», «Как лечить переплёт». Ей было пятнадцать.']],
  press: ['Пресс', 'desk', ['Деревянный пресс для книг. Вера сделала его сама из двух досок и винта от тисков.']],
  desk: ['Стол', 'desk', ['Её рабочий стол. Всё разложено, будто она вышла на минуту.']],
  uv: ['Лампа', 'desk', ['Какая-то странная лампа, трубка в коробке. Вера говорила: «Свет бывает, который глазом не видно».', 'Я думал, это она для красоты.']],
  shelf: ['Полка', 'shelf', ['Стеллаж с книгами. Корешки подписаны её аккуратным почерком.']],
};

const LOOK_DESK = {
  book: ['Книга', '', ['«Опыты с водой и светом». Вера нашла её на чердаке и восстановила в пятнадцать. Первая её реставрация.']],
  bookmarks: ['Закладка', '', ['Из книги торчит белая закладка. Свежая. Мамин почерк.']],
  press: ['Пресс', '', ['Деревянный пресс. Вера сделала его сама из двух досок и винта от тисков.']],
  jars: ['Банки', '', ['Клей, крахмал, что-то без подписи. Пахнет пылью и немножко — ею.']],
  uvlamp: ['Лампа', '', ['Лампа с тёмной трубкой. Рядом записка — «не трогать!!», Верин почерк.']],
  brushes: ['Кисти', '', ['Кисти в стакане. Старые, облезлые — но ни одной выброшенной. Похоже на Веру.']],
};

function roomHotspots() {
  const B = ROOM;
  const zones = {
    door: B.rect(0, 0, 240, 768),
    window: B.rect(695, 35, 1250, 330),
    posters: B.rect(274, 152, 620, 334),
    bed: B.rect(236, 375, 650, 700),
    desk: B.rect(785, 425, 1255, 640),
    shelf: B.rect(1256, 150, 1330, 560),
    nightstand: B.rect(625, 385, 762, 590),
    sillbooks: B.rect(684, 332, 762, 396),
    press: B.rect(838, 366, 956, 442),
    uv: B.rect(1106, 376, 1208, 428),
  };
  return Object.entries(zones).map(([id, shape]) => {
    const [label, shot, lines] = LOOK_ROOM[id];
    return { id, label, shot, shape, lines };
  });
}

function deskHotspots() {
  const B = DESK;
  const zones = {
    press: B.rect(375, 362, 705, 562),
    brushes: B.rect(710, 360, 840, 533),
    jars: B.rect(945, 472, 1165, 560),
    uvlamp: B.rect(1028, 378, 1257, 470),
    book: B.rect(630, 523, 1215, 675),
    bookmarks: B.rect(845, 522, 950, 585),
  };
  return Object.entries(zones).map(([id, shape]) => {
    const [label, shot, lines] = LOOK_DESK[id];
    return { id, label, shot, shape, lines };
  });
}

export const veraRoom = {
  id: 'vera-np',
  world: 'np',
  title: 'Комната Веры',
  bg: ROOM.src,
  shots: {
    wide: [0, 0, 1600, 900],
    window: ROOM.shot(970, 210, 640),
    desk: ROOM.shot(1020, 440, 560),
    bed: ROOM.shot(480, 480, 640),
    posters: ROOM.shot(450, 240, 480),
    shelf: ROOM.shot(1220, 330, 420),
  },
  ambience: ['room', 'clock'],
  build: buildRoom,
  hotspots: roomHotspots(),
  events: {
  },
};

export const veraDesk = {
  id: 'vera-desk',
  world: 'np',
  title: 'Стол Веры',
  bg: DESK.src,
  shots: { wide: [0, 0, 1600, 900] },
  ambience: ['room', 'clock'],
  build: buildDesk,
  hotspots: deskHotspots(),
  events: {},
};
