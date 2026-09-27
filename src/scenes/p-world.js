// Мир «Приходи» (аниме): комната Веры и хлебница на кухне — для главы 5.
// Координаты зон — в пикселях картинок (подогнаны под кадры V-P-1 и K-P-3).
import * as A from '../engine/art.js';

const VP = A.plate('assets/backgrounds/V-P-1.jpg', 1376, 768);
const BREAD = A.plate('assets/backgrounds/K-P-3.jpg', 1376, 768);
const BREAD_OPEN = A.plate('assets/backgrounds/K-P-3-open.jpg', 1376, 768);

// Зоны можно уточнить, когда придут картинки: достаточно поправить прямоугольники здесь
export const VERA_P_ZONES = {
  window: [948, 0, 1340, 680],
  bed: [150, 290, 525, 530],
  desk: [645, 455, 835, 768],
  chair: [425, 395, 655, 720],
  books: [685, 375, 935, 512],
  naillamp: [840, 540, 1068, 630],
};
export const BREAD_ZONE = [288, 305, 695, 530];

const LOOK_VERA = {
  window: ['Окно', 'window', ['Её окно выходит на насыпь. Как и у нас.']],
  bed: ['Кровать', 'bed', ['Кровать не заправлена. Яркий плед, книга корешком вверх.', 'Здесь в ней спят. У нас — шесть лет никто.']],
  books: ['Книги', 'desk', ['Библиотечные книги с бумажными закладками. Она их выдаёт, а читает — ночами.']],
  desk: ['Стол', 'desk', ['Ни кистей, ни пресса, ни клея. Ничего реставрационного.', 'Там она — реставратор. Здесь — будто и не собиралась.']],
  naillamp: ['Лампа', 'desk', ['Маленькая белая лампа-купол для ногтей и флаконы лака.', 'У нашей Веры на столе тоже есть лампа. Совсем другая. «Не трогать!!»']],
  chair: ['Стул', 'desk', ['На стуле — одежда горой. Вера всегда так делала. Хоть что-то одинаково.']],
};

export const veraP = {
  id: 'vera-p',
  world: 'p',
  title: 'Комната Веры',
  bg: VP.src,
  shots: {
    wide: [0, 0, 1600, 900],
    desk: VP.shot(890, 540, 640),
    bed: VP.shot(340, 420, 620),
    window: VP.shot(1130, 300, 560),
  },
  ambience: ['rain'],
  build: () => VP.image('class="bg"'),
  hotspots: Object.entries(VERA_P_ZONES).map(([id, r]) => {
    const [label, shot, lines] = LOOK_VERA[id];
    return { id, label, shot, shape: VP.rect(...r), lines };
  }),
  events: {},
};

// Хлебница на кухонном столе: закрыта / открыта (класс bread-open) — внутри починенные наушники
export const breadP = {
  id: 'bread-p',
  world: 'p',
  title: 'Хлебница',
  bg: BREAD.src,
  extra: [BREAD_OPEN.src],
  shots: { wide: [0, 0, 1600, 900] },
  ambience: ['rain', 'fridge'],
  build: () => BREAD.image('class="bg"') + BREAD_OPEN.image('class="bg-open"'),
  hotspots: [
    { id: 'breadbox', label: 'Хлебница', shot: '', shape: BREAD.rect(...BREAD_ZONE), lines: [] },
  ],
  events: {},
};
