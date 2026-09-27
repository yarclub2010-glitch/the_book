// Глава 4. «Два гудка» — загадка «Два гудка» (docs/загадки.md, №4). Первый переход, сделанный сознательно.
//
// Двойник прожёг в книге: «ФОТО. 6:40. ВМЕСТЕ.» — взять фото-якорь одновременно (закон 7).
// Утром время идёт само: flags.min — настоящая минута (6:37, 6:38…).
// Ловушка: кухонные часы спешат на три минуты (Тихон говорил об этом ещё в главе 1),
// а в мире «Приходи» часы точные — двойник возьмёт фото в настоящие 6:40.
// Общий сигнал для обоих миров — два гудка папиной электрички ровно в 6:40 (закон 1).
// Держать фото в миг гудков — и выдержать холод и гул (закон 6): оба стоят в одной точке.
// Не удалось — утро повторяется. Удалось — Тихоны меняются местами.

const morning = (s) => s.time === 'morning';
const hhmm = (m) => `6:${String(m).padStart(2, '0')}`;

// Новое утро после неудачи
const again = (s, why) => [
  ['set', { min: 37, holding: false, fails: (s.flags.fails || 0) + 1 }],
  ['music', null, { fade: 1.5 }],
  ['go', 'room', { transition: 'fade', dur: 2.5 }],
  ['card', 'Следующее утро', ''],
  ['think', why],
];

export default {
  id: 'ch4',
  title: 'Глава 4. Два гудка',
  hero: 't',
  next: 'ch5',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: 'Тихон', world: 'p' },
    v: { name: 'Вера', world: 'p' },
  },

  start: { location: 'book', time: 'evening' },

  locations: {
    room: { name: 'Комната Тихона', scene: (s) => `room-np-${s.time}`, music: (s) => (morning(s) ? 'np-morning' : 'np-night') },
    hall: { name: 'Коридор', scene: (s) => `hall-np-${morning(s) ? 'evening' : s.time}`, music: (s) => (morning(s) ? 'np-morning' : 'np-night') },
    kitchen: { name: 'Кухня', scene: (s) => `kitchen-np-${s.time}`, music: (s) => (morning(s) ? 'np-morning' : 'np-night') },
    book: { name: 'Книга', hidden: true, scene: () => 'book-np', music: () => 'np-night' },
  },

  sceneClasses: (s) => [
    'note-shift', 'book-on-sill', 'book-taken', 'book-shifted',
    'w-pencil-on', 'w-burn-on', 'w-reply-on', 'w-m2-on',
  ].filter(Boolean),

  carry: (s) => (s.flags.holding ? 'фото с полки' : ''),

  end: {
    text: [
      'Два гудка — и Тихоны поменялись местами.',
      'Один проснулся в доме, где сестра не уехала. Другой — в доме, где её нет шесть лет.',
    ],
  },

  intro: [
    ['card', 'Следующий вечер', 'Мамина записка на холодильнике', 'np'],
    ['think', 'Утром в книге нашлась новая подпалина. Внизу левой страницы, под текстом.'],
    ['say', 't', '«ФОТО. 6:40. ВМЕСТЕ.»'],
    ['think', 'Фото на кухонной полке: мы с Верой на подоконнике, за день до её отъезда. Почему именно оно?'],
    ['think', 'Взять его в одну и ту же минуту. Он — там, я — здесь.'],
  ],

  interact(scene, id, s) {
    const f = s.flags;

    if (scene.startsWith('kitchen') && id === 'sill') return { go: 'book' };
    if (scene.startsWith('hall')) {
      if (id === 'corridor') return { go: 'kitchen' };
      if (id === 'mine') return { go: 'room' };
      if (id === 'vera') return { key: 'locked', lines: ['Дверь Веры. Не сейчас. Сейчас — только кухня.'] };
    }

    if (scene === 'book-np') {
      if (id === 'marginL' || id === 'pageL') return { key: 'msg', lines: ['«ФОТО. 6:40. ВМЕСТЕ.» Точками, как всегда. Ровно — он не спешил.'] };
      if (id === 'marginR' || id === 'pageR') return { key: 'full', lines: ['Места на полях почти нет. Ещё пара писем — и Верина книга станет одной большой подпалиной.'] };
    }

    // ---------- вечер ----------
    if (!morning(s)) {
      if (id === 'photo') return { key: 'eve', lines: ['Мы с Верой на подоконнике. Завтра в 6:40 я возьму эту рамку.', 'А с той стороны — он.'] };
      if (id === 'clock') return { key: 'eve', lines: ['Кухонные часы. Вечером тикают громче. И, как всегда, торопятся.'] };
      if (id === 'bed') {
        return {
          beat: [
            ['think', 'Будильник на 6:35. Спать. Если получится.'],
            ['music', null, { fade: 2 }],
            ['time', 'morning'],
            ['set', { min: 37, holding: false }],
            ['go', 'room', { transition: 'fade', dur: 3 }],
            ['card', 'Утро', ''],
            ['think', 'Будильник на телефоне — 6:37. Успеваю.'],
          ],
        };
      }
      return null;
    }

    // ---------- утро ----------
    if (id === 'bed') return { key: 'am', lines: ['Не сейчас. Не проспать бы.'] };
    if (scene.startsWith('kitchen')) {
      if (id === 'clock') return { key: `m${f.min}`, lines: [`На кухонных — ${hhmm(f.min + 3)}.`] };
      if (id === 'photo') {
        if (f.holding) return { key: 'hold', shot: 'photo', lines: ['Держу. Рамка холодная. Ещё немного.'] };
        return { key: 'take', shot: 'photo', set: { holding: true, holdAt: f.min }, lines: ['Беру фото с полки. Мы с Верой на подоконнике, окно за нами открыто.'] };
      }
    }
    return null;
  },

  timers: [
    {
      // утро идёт само: одна минута — несколько секунд игры
      id: 'minute',
      every: [7, 7],
      when: (s) => morning(s) && s.flags.min < 40,
      set: (s) => ({ min: s.flags.min + 1 }),
    },
    {
      // ушёл из кухни — фото осталось на полке
      id: 'drop',
      after: 1,
      when: (s) => s.flags.holding && s.location !== 'kitchen',
      set: { holding: false },
      do: [['thought', 'Уходя, ставлю фото обратно на полку.']],
    },
    {
      // фото нельзя держать бесконечно: через две минуты рука затекает — ловушка спешащих/точных часов
      id: 'tired',
      after: 1,
      when: (s) => s.flags.holding && s.flags.min - (s.flags.holdAt ?? s.flags.min) >= 2,
      set: { holding: false },
      do: [['thought', 'Рука затекла, рамка ледяная. Ставлю фото обратно на полку.']],
    },
    {
      id: 'freight',
      every: [35, 60],
      when: (s) => !morning(s),
      do: [['sfx', 'train', { caption: 'идёт товарный поезд', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
  ],

  rules: [
    {
      // 6:40 по-настоящему: два гудка папиной электрички. Повторяется, пока не получится.
      id: 'horns',
      repeat: true,
      when: (s) => morning(s) && s.flags.min >= 40,
      beat: (s) => {
        const fails = s.flags.fails || 0;
        if (!s.flags.holding) {
          return [
            ['sfx', 'horns', { caption: 'два гудка — папина электричка' }],
            ['event', 'glow', { wait: false }],
            ['shake', 2],
            ['think', fails ? 'Опять. Два гудка — а фото стоит на полке.' : 'Два гудка. А фото на полке дрогнуло — само, без меня. Ровно по гудкам.'],
            ...(fails >= 1 ? [['think', 'Папа говорит, на наши часы можно положиться: никогда не опаздывают. Только спешат.']] : []),
            ...again(s, 'Будильник — 6:37. Ещё раз.'),
          ];
        }
        return [
          ['sfx', 'cold', { caption: 'холод и гул' }],
          ['shake', 3],
          ['think', 'Холодно. Гул — в зубах, в стёклах. Как той ночью.'],
          ['think', 'Он здесь. Держит ту же рамку. С той стороны.'],
          ['sfx', 'horn', { caption: 'первый гудок' }],
          ['shake', 2],
          ['choice', [
            {
              text: 'Отпустить',
              do: [
                ['think', 'Пальцы разжимаются сами. Рамка стукает о полку.'],
                ['sfx', 'thud'],
                ['sfx', 'horn', { caption: 'второй гудок' }],
                ['think', 'Второй гудок — уже без меня.'],
                ...again(s, 'Будильник — 6:37. В этот раз не отпущу.'),
              ],
            },
            {
              text: 'Держать',
              do: [
                ['think', 'Держу. Холод поднимается к локтям. Гул такой, что сердца не слышно.'],
                ['sfx', 'horn', { caption: 'второй гудок' }],
                ['event', 'glow', { wait: false }],
                ['set', { resolved: true, holding: false }],
                ['sfx', 'sting'],
                ['music', null, { fade: 1 }],
                ['scene', 'kitchen-p-evening', { shot: 'wide', transition: 'morph', dur: 4 }],
                ['music', 'p-night', { fade: 4 }],
                ['card', '6:40', 'Две чашки на столе', 'p'],
                ['think', 'Кухня. Та же — и не та. Розовый свет, мокрое окно.'],
                ['think', 'На подоконнике — Верина книга. Страницы вздулись от воды.'],
                ['narr', 'Шаги в коридоре. Кто-то зевает.'],
                ['say', 'v', 'Тиш, ты чего в такую рань? И почему в водолазке — ты ж их не носишь.'],
                ['think', 'Этот голос — не из телефона. Живой. В трёх шагах.'],
                ['say', 't', '…Вера?'],
                ['card', 'Обмен', 'Каждый — в чужой жизни'],
                ['end'],
              ],
            },
          ]],
        ];
      },
    },
  ],
};
