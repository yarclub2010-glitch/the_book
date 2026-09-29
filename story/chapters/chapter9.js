// Глава 9. «Не» — финал ветки «Оставил разговор двойнику». Акт 4, кульминация.
//
// Оба дома. Правда сказана тем, кто должен был. Остаётся последнее совпадение (закон 7):
// одновременно написать на фото-якоре одно слово — «Не». На якорь закон 4 не действует:
// слово, которое шесть лет назад не дошло, впервые проходит между мирами целиком.
// Концовка зависит от доверия, накопленного за игру (память истории):
//   stayedCold (гл. 2) — не сбежал от холода; returnedBrush (гл. 3) — вернул Верину кисточку;
//   sentTrack (гл. 6) — двойник позаботился о чужой семье.
//   0–1 → «Разделение»; 2 → «Мост»; 3 → на выбор «Мост» или скрытая «Слияние».
// Утро снова в мире «Не приходи»: кухонные часы спешат на три минуты (как в главе 4).

const morning = (s) => s.time === 'morning';
const hhmm = (m) => `6:${String(m).padStart(2, '0')}`;
const trust = (s) => ['stayedCold', 'returnedBrush', 'sentTrack'].filter((k) => s.legacy && s.legacy[k]).length;

const ENDINGS = {
  split: {
    title: 'Разделение',
    text: [
      'Слово дошло целиком. Но рамка остыла, и книга стала просто книгой.',
      'Каждый остался в своём мире и знает правду. Больше им не встретиться.',
    ],
  },
  bridge: {
    title: 'Мост',
    text: [
      'Слово дошло целиком — и окно не закрылось. Книга по-прежнему шелестит по вечерам.',
      'А в мире, где Вера уехала, Тихон впервые за шесть лет позвал её сам.',
    ],
  },
  merge: {
    title: 'Слияние',
    text: [
      'Миры сошлись. Но каждый — лишь отчасти: насквозь ничто не проходит целым.',
      'Три кружки на столе и пыль на полке. Дождь — и солнце. Какая Вера наливает кофе, не знает никто.',
    ],
  },
};

const again = (s) => [
  ['set', { min: 37, holding: false, fails: (s.flags.fails || 0) + 1 }],
  ['music', null, { fade: 1.5 }],
  ['go', 'room', { transition: 'fade', dur: 2.5 }],
  ['card', 'Следующее утро', ''],
  ['think', 'Будильник — 6:37. Мы договорились. Он будет ждать.'],
];

export default {
  id: 'ch9',
  title: 'Глава 9. Не',
  branch: true,
  hero: 't',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: 'Тихон', world: 'p' },
    v: { name: 'Вера', world: 'p' },
  },

  start: { location: 'book', time: 'evening' },

  locations: {
    room: { name: 'Моя комната', scene: (s) => `room-np-${s.time}`, music: (s) => (morning(s) ? 'np-morning' : 'np-night') },
    hall: { name: 'Коридор', scene: (s) => `hall-np-${morning(s) ? 'evening' : s.time}`, music: () => 'np-night' },
    kitchen: { name: 'Кухня', scene: (s) => `kitchen-np-${s.time}`, music: (s) => (morning(s) ? 'np-morning' : 'np-night') },
    vera: { name: 'Комната Веры', scene: () => 'vera-np', music: () => 'np-morning' },
    book: { name: 'Книга', hidden: true, scene: () => 'book-np', music: () => 'np-night' },
  },

  sceneClasses: (s) => [
    'book-on-sill', 'book-taken', 'book-shifted',
    'w-pencil-on', 'w-burn-on', 'w-reply-on', 'w-m2-on', 'w-9-on', 'w-hint-on', 'w-p7-on', 'w-8a-on', 'w-8b-on',
    s.flags.ne && 'ne-written',
  ].filter(Boolean),

  carry: (s) => [s.flags.hasPen && !s.flags.ne && 'маркер', s.flags.holding && 'фото с полки'].filter(Boolean).join(', '),

  end: {
    kicker: 'Концовка',
    title: (s) => (ENDINGS[s.flags.ending] || ENDINGS.split).title,
    text: (s) => (ENDINGS[s.flags.ending] || ENDINGS.split).text,
  },

  intro: [
    ['card', 'Вечер', 'Гудит только холодильник', 'np'],
    ['think', 'Мой дом. Верина книга на подоконнике — сдвинутая, обожжённая, с моим «Кто ты?» на полях.'],
    ['think', 'Внизу правой страницы — новый ожог. Его последнее письмо.'],
    ['say', 't', '«Спасибо. Завтра 6:40 — на фото. «Не». Вместе».'],
    ['think', 'Слово, которое шесть лет назад не дошло. Вдвоём, в одну секунду. На единственной вещи, которая у нас одинаковая.'],
  ],

  interact(scene, id, s) {
    const f = s.flags;
    if (scene.startsWith('kitchen') && id === 'sill') return { go: 'book' };
    if (scene.startsWith('hall')) {
      if (id === 'corridor') return { go: 'kitchen' };
      if (id === 'mine') return { go: 'room' };
      if (id === 'vera') return { go: 'vera' };
    }
    if (scene === 'book-np' && (id === 'pageR' || id === 'marginR' || id === 'engraving')) {
      return { key: 'last', lines: ['«Спасибо. Завтра 6:40 — на фото. «Не». Вместе». Точками, бледно — и всё равно понятно.'] };
    }
    if (scene.startsWith('room')) {
      if (id === 'mags' && !f.hasPen) return { key: 'pen', set: { hasPen: true }, lines: ['Между журналами — открытка из Петербурга и маркер, которым я подписываю треки. Беру маркер.'] };
      if (id === 'bed' && !morning(s)) {
        return {
          beat: [
            ['think', 'Будильник на 6:35.'],
            ['music', null, { fade: 2 }],
            ['time', 'morning'],
            ['set', { min: 37, holding: false }],
            ['go', 'room', { transition: 'fade', dur: 3 }],
            ['card', 'Утро', ''],
            ['think', 'Будильник на телефоне — 6:37.'],
          ],
        };
      }
      if (id === 'bed') return { key: 'am', lines: ['Не сейчас.'] };
    }
    if (scene === 'vera-np' && id === 'desk') {
      return s.legacy && s.legacy.returnedBrush
        ? { key: 'ch9', lines: ['Её стол. Кисточка лежит там, где я её оставил, — в своём следе в пыли.', 'Хоть что-то в этом доме я вернул на место.'] }
        : { key: 'ch9', lines: ['Её стол. В пыли — тонкий чистый след, а кисточки нет.', 'Она так и лежит у меня в ящике. Я всё собирался вернуть.'] };
    }
    if (scene.startsWith('kitchen') && morning(s)) {
      if (id === 'clock') return { key: `m${f.min}`, lines: [`На кухонных — ${hhmm(f.min + 3)}.`] };
      if (id === 'photo') {
        if (!f.hasPen) return { key: 'nopen', shot: 'photo', lines: ['Взять фото — полдела. А писать чем? Нужно что-то, что возьмёт глянец.'] };
        if (f.holding) return { key: 'hold', shot: 'photo', lines: ['Держу. Маркер — в другой руке.'] };
        return { key: 'take', shot: 'photo', set: { holding: true, holdAt: f.min }, lines: ['Беру фото с полки. Открываю маркер.'] };
      }
    }
    return null;
  },

  timers: [
    { id: 'minute', every: [7, 7], when: (s) => morning(s) && s.flags.min < 40, set: (s) => ({ min: s.flags.min + 1 }) },
    { id: 'drop', after: 1, when: (s) => s.flags.holding && s.location !== 'kitchen', set: { holding: false }, do: [['thought', 'Поставил фото обратно на полку.']] },
    {
      // фото нельзя держать бесконечно: через две минуты рука затекает — ловушка спешащих/точных часов
      id: 'tired',
      after: 1,
      when: (s) => s.flags.holding && s.flags.min - (s.flags.holdAt ?? s.flags.min) >= 2,
      set: { holding: false },
      do: [['thought', 'Рука затекла, рамка ледяная. Ставлю фото обратно на полку.']],
    },
    {
      id: 'train',
      every: [35, 60],
      when: (s) => !morning(s),
      do: [['sfx', 'train', { caption: 'идёт товарный поезд', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
  ],

  rules: [
    {
      id: 'horns',
      repeat: true,
      when: (s) => morning(s) && s.flags.min >= 40,
      beat: (s) => {
        if (!s.flags.holding) {
          return [['sfx', 'horns', { caption: 'два гудка — папина электричка' }], ['shake', 2], ['think', 'Гудки. А я не у полки.'], ...again(s)];
        }
        const t = trust(s);
        const common = [
          ['sfx', 'cold', { caption: 'холод и гул' }],
          ['shake', 3],
          ['think', 'Холод. Гул. Он здесь — с той стороны рамки. И на этот раз я не боюсь.'],
          ['sfx', 'horn', { caption: 'первый гудок' }],
          ['think', 'Пишем. Одно слово. На обороте — нет: прямо на фото, под нами с Верой.'],
          ['set', { ne: true }],
          ['sfx', 'pluck'],
          ['sfx', 'horn', { caption: 'второй гудок' }],
          ['event', 'glow', { wait: false }],
          ['think', '«Не». Моей рукой. И его — буквы ложатся одна в другую, как на кальке.'],
          ['think', 'Слово, которое шесть лет назад не дошло, прошло целиком.'],
        ];
        const split = [
          ['set', { ending: 'split' }],
          ['think', 'Рамка остывает. Холод уходит — и гул уходит вместе с ним.'],
          ['think', 'Книга на подоконнике — просто книга. Он больше не ответит.'],
          ['think', 'Но я знаю: там, у него, сегодня завтракают втроём.'],
          ['end'],
        ];
        const bridge = [
          ['set', { ending: 'bridge' }],
          ['music', 'finale', { fade: 3 }],
          ['think', 'Отпускаю. Рамка тёплая, как ладонь.'],
          ['think', 'Книга на подоконнике шелестит сама. Окно осталось открытым.'],
          ['think', 'Беру телефон. Пишу Вере — своей Вере — одно слово. Без «не».'],
          ['say', 't', '«Приходи».'],
          ['wait', 2],
          ['sfx', 'ping', { caption: 'новое сообщение' }],
          ['narr', '«Приеду в субботу. Встречай на вокзале. В.»'],
          // если двойник в главе 6 отправил ей трек — она его слышала
          ...(s.legacy && s.legacy.sentTrack ? [['narr', '«P.S. Твой «дом_03» я слушаю каждый вечер. Там в конце кто-то шепчет. Кто это?»'], ['think', 'Это он отправил ей мой трек — в тот день, когда жил моей жизнью.']] : []),
          ['end'],
        ];
        const merge = [
          ['set', { ending: 'merge' }],
          ['think', 'Держу. Холод становится теплом. Гул — дыханием.'],
          ['music', null, { fade: 2 }],
          ['scene', 'kitchen-p-evening', { shot: 'wide', transition: 'morph', dur: 3 }],
          ['scene', 'kitchen-np-morning', { shot: 'wide', transition: 'morph', dur: 3 }],
          ['scene', 'kitchen-p-evening', { shot: 'wide', transition: 'morph', dur: 4 }],
          ['music', 'finale', { fade: 4 }],
          ['narr', 'Три кружки на столе. Пыль на полке. Дождь за окном — и солнце.'],
          ['say', 'v', 'Тиш, кофе будешь?'],
          ['think', 'Какая это Вера — та, что уехала, или та, что осталась?'],
          ['think', 'И какой из нас — я?'],
          ['end'],
        ];
        if (t <= 1) return [...common, ...split];
        // «Держать» открывает скрытую концовку только при полном доверии; иначе тепло не приходит
        const hold = t >= 3 ? merge : [['think', 'Держу. Жду тепла. Но рамка остаётся просто рамкой.'], ...bridge];
        return [...common, ['choice', [{ text: 'Отпустить фото', do: bridge }, { text: 'Держать, пока не станет тепло', do: hold }]]];
      },
    },
  ],
};
