// Коридор, мир «Не приходи» (H-NP-1): вешалка, валенки, дверь Веры в конце, дверь Тихона справа.
// И мастерская двойника в мире «Приходи» (R-P-1) — для сценок.
import * as A from '../engine/art.js';
import { audio } from '../engine/audio.js';

const H = A.plate('assets/backgrounds/H-NP-1.jpg', 1376, 768);
const H_OFF = A.plate('assets/backgrounds/H-NP-1-off.jpg', 1376, 768);
const RP = A.plate('assets/backgrounds/R-P-1.jpg', 1376, 768);
// тот же коридор в мире «Приходи» (нарисован по H-NP-1, пиксель в пиксель) — для «провала» (скример)
const H_BLEED = A.plate('assets/backgrounds/H-P-1v2.jpg', 1376, 768);

function buildHall(time) {
  const [x, y] = H.I(905, 172);
  let s = `<defs><radialGradient id="hl-warm"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.3"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient></defs>`;
  s += H.image(`class="bg bg-${time}"`);
  // бра: когда идёт поезд, мигает. Погасшее бра — отдельный кадр того же коридора (H-NP-1-off):
  // вместе с лампой пропадает и отсвет на стене. Кадр проступает поверх в моменты «провала».
  s += `<g id="hl-sconce"><circle class="flicker" cx="${x}" cy="${y}" r="320" fill="url(#hl-warm)" style="mix-blend-mode:screen"/>`;
  s += `${H_OFF.image(`class="sconce-off bg-${time}"`)}</g>`;
  // «провал»: темнота и на миг — чужой коридор (событие blackout)
  s += `<rect class="hl-dark" width="1600" height="900" fill="#020203" opacity="0"/>`;
  s += H_BLEED.image('class="hl-bleed" opacity="0"');
  return s;
}

const LOOK = {
  coats: ['Вешалка', 'coats', ['Моя парка, папин бушлат. Маминого плаща нет — значит, она на смене.', 'С краю — Верина старая куртка. Шесть лет висит. Никто её не надевает и не убирает.']],
  hats: ['Шапки', 'coats', ['На полке шапки всей семьи. Верина вязаная — я её когда-то растянул, мама связала заново.']],
  boots: ['Валенки', 'floor', ['Папины валенки для зимних рейсов. Пахнут креозотом и снегом.']],
  shoes: ['Ботинки', 'floor', ['Мои ботинки. Вечно брошены под вешалкой — так говорит мама.']],
  sconce: ['Бра', 'door', ['Бра мигает каждый раз, когда идёт поезд. Папа обещал починить — третий год.']],
  radiator: ['Батарея', 'door', ['Батарея в коридоре греет лучше всех. Вера сушила тут кеды.']],
  corridor: ['Кухня', '', []],
  vera: ['Дверь Веры', '', []],
  mine: ['Моя дверь', '', []],
};

function hallHotspots() {
  const zones = {
    corridor: H.rect(540, 140, 650, 570),
    coats: H.rect(120, 110, 520, 680),
    hats: H.rect(180, 0, 470, 150),
    boots: H.rect(380, 565, 516, 712),
    shoes: H.rect(330, 690, 470, 768),
    vera: H.rect(680, 35, 865, 590),
    radiator: H.rect(888, 450, 958, 620),
    sconce: H.circle(905, 172, 34),
    mine: H.rect(1025, 0, 1148, 768),
  };
  return Object.entries(zones).map(([id, shape]) => {
    const [label, shot, lines] = LOOK[id];
    return { id, label, shot, shape, lines };
  });
}

function hall(time) {
  return {
    id: `hall-np-${time}`,
    world: 'np',
    title: 'Коридор',
    bg: H.src,
    extra: [H_OFF.src, H_BLEED.src],
    shots: {
      wide: [0, 0, 1600, 900],
      coats: H.shot(320, 330, 620),
      floor: H.shot(420, 640, 560),
      door: H.shot(820, 300, 560),
    },
    ambience: ['room', 'clock'],
    build: () => buildHall(time),
    hotspots: hallHotspots(),
    events: {
      // Скример (глава 3): двойник в ту же секунду у своей вешалки — одна точка (закон 6).
      // Бра дёргается и гаснет, в полной темноте на миг вспыхивает чужой коридор — светлый, с куртками всех цветов.
      // Всё на таймерах, а не на CSS-анимации: работает и при «меньше движения».
      blackout(root) {
        const off = root.querySelector('.sconce-off');
        const glow = root.querySelector('#hl-sconce circle.flicker');
        const dark = root.querySelector('.hl-dark');
        const bleed = root.querySelector('.hl-bleed');
        const set = (el, v) => el && (el.style.opacity = v);
        const lamp = (on) => { set(off, on ? 0 : 1); set(glow, on ? '' : 0); };
        const steps = [
          [0, () => lamp(false)], [110, () => lamp(true)], [260, () => lamp(false)], [330, () => lamp(true)],
          [620, () => { lamp(false); audio.sfx('cold', { caption: 'холод и гул' }); }], [720, () => lamp(true)],
          [1050, () => { lamp(false); set(dark, 0.6); }], [1500, () => set(dark, 0.96)],
          [2500, () => { audio.sfx('shock'); set(bleed, 1); set(dark, 0); }],
          [2680, () => { set(bleed, 0); set(dark, 1); }],
          [3500, () => { set(dark, 0.5); lamp(true); }], [3600, () => lamp(false)], [3750, () => { lamp(true); set(dark, 0); }],
        ];
        steps.forEach(([t, fn]) => setTimeout(fn, t));
        setTimeout(() => [off, glow, dark, bleed].forEach((el) => el && (el.style.opacity = '')), 4000);
        return 4000;
      },
      train(root) {
        const el = root.querySelector('#hl-sconce');
        el.classList.remove('blink-go');
        void el.getBBox();
        el.classList.add('blink-go');
        setTimeout(() => el.classList.remove('blink-go'), 5200);
        return 5200;
      },
    },
  };
}

export const hallNight = hall('night');
export const hallEvening = hall('evening');

// Мастерская двойника (мир «Приходи»): паяльник, лупа, доска с уликами
const LOOK_RP = {
  window: ['Окно', 'window', ['Та же насыпь, та же электричка. Только здесь идёт дождь.']],
  pegboard: ['Инструменты', 'desk', ['Перфопанель с инструментами. Всё по размеру, всё на своём гвозде.', 'У меня так никогда не было.']],
  lamp: ['Лупа', 'desk', ['Лампа-лупа. Он чинит что-то мелкое. Часто.']],
  solder: ['Паяльник', 'desk', ['Паяльник. Жало в нагаре. Вот чем он выжигал буквы в книге.']],
  headphones: ['Наушники', 'desk', ['Его наушники. Большие, мужские — не Верины. Провод на чашке перемотан.', 'Его собственные. Чужое он чинит сразу, своё — когда-нибудь.']],
  board: ['Доска', 'board', ['Доска с «уликами» против призрака. Схемы, записки, красные нитки — всё сходится в одну точку.', 'Почерк такой, что не разобрать. Мой был бы таким же.']],
  shelves: ['Полки', 'board', ['Коробочки с винтиками, провода, старый радиоприёмник.', 'Он ничего не выбрасывает. Как Вера — у нас.']],
  bed: ['Кровать', 'bed', ['Его кровать. Не заправлена. Плед в клетку — такой же был у меня в детстве.']],
  chair: ['Стул', 'desk', ['На спинке — серое худи в пятнах от припоя. Моё было бы чёрным.']],
  drawer: ['Ящик стола', 'desk', ['Ящик стола. Заперт? Нет — просто тугой.']],
};

export const roomP = {
  id: 'room-p',
  world: 'p',
  title: 'Комната',
  bg: RP.src,
  shots: {
    wide: [0, 0, 1600, 900],
    desk: RP.shot(390, 540, 720),
    board: RP.shot(740, 250, 520),
    window: RP.shot(320, 200, 640),
    bed: RP.shot(1100, 480, 620),
  },
  ambience: ['rain'],
  build: () => RP.image('class="bg"'),
  hotspots: Object.entries({
    window: RP.rect(0, 0, 620, 410),
    bed: RP.rect(820, 320, 1376, 700),
    shelves: RP.rect(1030, 30, 1376, 270),
    board: RP.rect(640, 130, 850, 370),
    pegboard: RP.rect(0, 320, 180, 590),
    chair: RP.rect(662, 570, 790, 768),
    lamp: RP.rect(185, 405, 325, 495),
    solder: RP.rect(330, 440, 525, 520),
    headphones: RP.rect(330, 525, 505, 625),
    drawer: RP.rect(585, 585, 662, 705),
  }).map(([id, shape]) => {
    const [label, shot, lines] = LOOK_RP[id];
    return { id, label, shot, shape, lines, view: id === 'board' ? 'assets/items/I-BOARD-P.jpg' : undefined };
  }),
  events: {},
};

// Коридор мира «Приходи»: тот же коридор, что в НП, с той же точки (H-P-1v2 нарисован по H-NP-1).
// Дверь Веры в конце открыта, из неё свет. Вера в дверях — отдельный кадр (H-P-1v2-vera), класс vera-here.
const HP = A.plate('assets/backgrounds/H-P-1v2.jpg', 1376, 768);
const HP_VERA = A.plate('assets/backgrounds/H-P-1v2-vera.jpg', 1376, 768);
export const hallP = {
  id: 'hall-p',
  world: 'p',
  title: 'Коридор',
  bg: HP.src,
  extra: [HP_VERA.src],
  shots: {
    wide: [0, 0, 1600, 900],
    coats: HP.shot(320, 330, 620),
    door: HP.shot(780, 330, 560),
  },
  ambience: ['rain'],
  build: () => HP.image('class="bg"') + HP_VERA.image('class="bg-vera"'),
  hotspots: [
    { id: 'corridor', label: 'Кухня', shot: '', shape: HP.rect(540, 140, 650, 570), lines: [] },
    { id: 'coats', label: 'Вешалка', shot: 'coats', shape: HP.rect(120, 110, 520, 560), lines: ['Куртки всех цветов, шарфы, шапки на полке. Здесь всё время кто-то приходит и уходит.', 'У нас вешалка полупустая.'] },
    { id: 'shoes', label: 'Обувь', shot: 'coats', shape: HP.rect(330, 560, 516, 768), lines: ['Резиновые сапоги и чьи-то кеды. Мокрые. Здесь, кажется, всегда только что пришли с дождя.'] },
    { id: 'sconce', label: 'Бра', shot: 'door', shape: HP.circle(905, 172, 34), lines: ['Бра горит ровно. У нас оно мигает, когда идёт поезд. Здесь кто-то поменял патрон.'] },
    { id: 'mine', label: 'Его дверь', shot: '', shape: HP.rect(1025, 0, 1148, 768), lines: ['Моя дверь. То есть его. Изнутри пахнет канифолью.'] },
    { id: 'vera', label: 'Вера', shot: 'door', shape: HP.rect(680, 35, 865, 600), lines: [] },
  ],
  events: {},
};
