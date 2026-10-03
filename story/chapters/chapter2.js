// Глава 2. «Голоса» — загадка «Колонка слышит маму» (docs/загадки.md, №2).
//
// Ночью Тихон приходит на кухню «на зов» и попадает в одну точку с двойником (закон 6):
// холод, гул — бегство. Вечером следующего дня мама на смене, дом пуст.
// Колонка «Мири» по вечерам слышит обрывки фраз — но не каждый вечер. Голоса приходят,
// только когда рядом Верина книга (закон 5): в мире «Приходи» она всегда на кухонном
// подоконнике, а здесь её приносит мама — почитать перед ночной сменой.
// Решение: 1) связать даты обрывков с мамиными сменами и закладкой в книге;
// 2) положить книгу на подоконник и уйти из кухни (закон 3);
// 3) сложить обрывки нескольких вечеров по секундам (закон 4): «Тиша, ужинать!» — мамин голос,
//    хотя мама на смене. И смех Веры, которая уехала шесть лет назад.

const ev = (s) => s.time === 'evening';
const bookGone = (s) => s.flags.carryBook || s.flags.bookOnSill;

export default {
  id: 'ch2',
  title: 'Глава 2. Голоса',
  next: 'ch3',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: 'Тихон', world: 'p' },
    m: { name: 'Мама', world: 'p' },
    v: { name: 'Вера', world: 'p' },
  },

  start: { location: 'kitchen', time: 'night' },

  locations: {
    room: {
      name: 'Комната Тихона',
      scene: (s) => `room-np-${s.time}`,
      music: () => 'np-night',
    },
    kitchen: {
      name: 'Кухня',
      scene: (s) => `kitchen-np-${s.time}`,
      music: () => 'np-night',
    },
    vera: {
      name: 'Комната Веры',
      scene: () => 'vera-np',
      music: () => 'np-morning',
    },
    desk: {
      name: 'Стол Веры',
      hidden: true,
      scene: () => 'vera-desk',
      music: () => 'np-morning',
    },
    sill: {
      name: 'Подоконник',
      hidden: true,
      scene: () => 'sill-np',
      music: () => 'np-night',
    },
    phone: {
      name: 'Мири',
      hidden: true,
      scene: (s) => (s.flags.captured ? 'phone-new' : 'phone'),
      music: () => 'np-night',
    },
  },

  sceneClasses: (s) => [
    ev(s) && 'note-shift',
    s.flags.bookOnSill && 'book-on-sill',
    s.flags.bookShifted && 'book-shifted',
    bookGone(s) && 'book-taken',
    s.flags.captured && 'miri-listen',
  ].filter(Boolean),

  carry: (s) => (s.flags.carryBook ? 'книга Веры' : ''),

  // память истории: не сбежал от холода — первый шаг к доверию
  remember: (s) => ({ stayedCold: !!s.flags.stayedCold }),

  end: {
    text: [
      'В пустом доме, где мама на смене, а сестра шесть лет как уехала, Тихона зовут ужинать.',
      'Голоса приходят только туда, где лежит книга. Может быть, через неё можно и ответить.',
    ],
  },

  intro: [
    ['card', 'Следующая ночь', '01:50 · гудит только холодильник', 'np'],
    ['say', 't', 'Я пришёл. Ты звал.'],
    ['wait', 1.2],
    ['sfx', 'cold', { caption: 'холод и гул' }],
    ['shake', 3],
    ['think', 'Холод — будто открыли морозилку во всю стену. И гул на одной низкой ноте. В зубах, в стёклах.'],
    ['sfx', 'sting'],
    ['think', 'Кто-то стоит здесь. Не рядом — там же, где я. Как второй голос в том же канале.'],
    ['choice', [
      {
        text: 'Бежать',
        do: [['say', 't', 'Нет. Нет-нет-нет…'], ['sfx', 'steps']],
      },
      {
        text: 'Остаться',
        do: [
          ['think', 'Стою. Холод дошёл до зубов — и вдруг отпустил.'],
          ['think', 'Тот, другой, отступил первым. Будто испугался сильнее меня.'],
          ['set', { stayedCold: true }],
        ],
      },
    ]],
    ['music', null, { fade: 1 }],
    ['time', 'evening'],
    ['go', 'room', { transition: 'fade', dur: 2.5 }],
    ['card', 'Вечер следующего дня', '18:40 · мама на смене', 'np'],
    ['think', 'До утра я сидел при свете, в наушниках, без музыки.'],
    ['think', 'Утром буквы висели ровно, по линеечке. Будто кто-то вернул их на места.'],
  ],

  // «Что дальше?» (Q) — чем герой сейчас занят; направление, а не готовый ответ
  goal(s) {
    const f = s.flags;
    if (f.captured) return 'Мири что-то расслышала. Посмотреть историю в телефоне и сложить обрывки по времени.';
    if (f.bookOnSill) return 'Книга на подоконнике. Теперь уйти из кухни — и ждать семи вечера.';
    if (f.carryBook) return 'Книга у меня. Положить туда, где мама её читает, — где в пыли её след.';
    if (f.sawHistory) return 'Голоса в Мири — не каждый вечер. Что было на кухне в те вечера? Мама тогда была на смене — и что-то читала.';
    return 'Мама говорила, что Мири по вечерам бубнит сама. Посмотреть её историю.';
  },

  interact(scene, id, s) {
    // ---------- телефон: история Мири ----------
    if (scene === 'phone' || scene === 'phone-new') {
      if (id === 'back') return { go: 'kitchen' };
      const cards = {
        c14: ['«…жи…». 14-е, 19:02. Я сидел у Димы. Дома — никого.', 'Мама в тот вечер ушла на смену пораньше.'],
        c17: ['«Ти…». 17-е, снова 19:02. Будто кто-то начинает моё имя.'],
        c20: ['«…нать!» — и смех. 20-е. Короткий, звонкий, на выдохе.', 'Я этот смех знаю. Не может быть.'],
        c27: ['Сегодня, 19:02. «…ша, у…». Я был дома — и ничего не слышал.'],
      };
      if (cards[id]) return { lines: cards[id] };
      return null;
    }

    // ---------- кухня ----------
    if (scene.startsWith('kitchen') && ev(s)) {
      if (id === 'miri') return { go: 'phone', set: { sawHistory: true } };
      if (id === 'note') {
        return {
          key: 'shift',
          view: 'assets/items/I-CALENDAR-2.jpg',
          lines: ['«Я на смене до утра. Ужин в холодильнике». Мама.', 'В календаре у холодильника ночные смены обведены красным: 14-е, 17-е, 20-е. И сегодня.'],
        };
      }
      if (id === 'fridge') return { key: 'ev', lines: ['Алфавит висит ровно. «…ХОДИ» больше не видно.', 'А холод я помню до сих пор. Зубами.'] };
      if (id === 'sill') return { go: 'sill' };
    }

    // ---------- подоконник крупно ----------
    if (scene === 'sill-np') {
      if (id === 'spot') {
        if (s.flags.carryBook) {
          return {
            key: 'place',
            set: { carryBook: false, bookOnSill: true },
            lines: ['Кладу книгу на чистый прямоугольник в пыли. Совпадает до миллиметра — она лежала здесь.'],
          };
        }
        if (s.flags.captured) return { key: 'done', lines: ['Книга сдвинута. Я клал её ровно по следу — а она лежит наискосок.', 'Сюда никто не заходил. Будто её тронули за ужином.'] };
        if (s.flags.bookOnSill) return { key: 'wait', lines: ['Книга на месте. Пока я здесь, ничего не будет. Как с буквами.'] };
        return { key: 'dust', lines: ['Пыль на подоконнике. А в пыли — чистый прямоугольник размером с книгу.'] };
      }
    }

    // ---------- комната Веры ----------
    if (scene === 'vera-np') {
      if (id === 'desk') {
        if (bookGone(s)) return { key: 'empty', lines: ['Книги нет. Стол без неё как будто ниже.'] };
        return { go: 'desk' };
      }
      if (id === 'door') return { key: 'in', lines: ['Шесть лет я сюда не заходил. Мама — только по воскресеньям, с тряпкой.'] };
    }
    if (scene === 'vera-desk') {
      if (id === 'bookmarks') {
        return {
          set: { seenBookmark: true },
          lines: [
            'Белая закладка, мамин почерк: «Верочка, прости, взяла почитать. Положу на место».',
            'Мама читает Верину книгу. Одна, по вечерам. Я не знал.',
          ],
        };
      }
      if (id === 'book') {
        return {
          beat: [
            ['set', { carryBook: true, seenBookmark: true }],
            ['sfx', 'page'],
            ['go', 'vera', { transition: 'fade', dur: 1 }],
            ['thought', 'Беру с собой. Верну, Вер. Честно.'],
          ],
        };
      }
    }

    // ---------- комната Тихона ----------
    if (id === 'bed') return { key: 'ch2', lines: ['Лечь? После вчерашнего — нет. Не сегодня.'] };
    if (id === 'laptop') return { key: 'ch2', lines: ['В записи прошлой ночи — только гул. Долгий, низкий, будто поезд стоит прямо в комнате.'] };
    return null;
  },

  puzzles: {
    frags: { when: (s) => s.flags.captured && !s.flags.assembled, done: { assembled: true } },
  },

  timers: [
    {
      id: 'train',
      every: [35, 60],
      when: (s) => ev(s) && ['room', 'kitchen', 'vera'].includes(s.location),
      do: [['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
    {
      id: 'miri-hint',
      after: 60,
      once: true,
      when: (s) => ev(s) && !s.flags.sawHistory,
      do: [['thought', 'Мама жаловалась: по вечерам на кухне кто-то бубнит. Думает — Мири глючит.']],
    },
    {
      id: 'dates-hint',
      after: 70,
      once: true,
      when: (s) => s.flags.sawHistory && !s.flags.seenBookmark && !bookGone(s),
      do: [['thought', 'Голоса — не каждый вечер. Что было на кухне в те вечера, чего не было в другие?']],
    },
    {
      id: 'desk-hint',
      after: 35,
      once: true,
      when: (s) => s.location === 'vera' && !bookGone(s),
      do: [['thought', 'Вера говорила: всё важное лежит на столе, а не в ящиках.']],
    },
    {
      id: 'carry-hint',
      after: 40,
      once: true,
      when: (s) => s.flags.carryBook,
      do: [['thought', 'Мама вечно читает там, где светлее всего вечером. Не у себя же в спальне.']],
    },
    {
      id: 'captured-hint',
      after: 40,
      once: true,
      when: (s) => s.flags.captured && !s.flags.assembled && s.location !== 'phone',
      do: [['thought', 'Мири пищит, только когда что-то расслышала. Надо посмотреть историю.']],
    },
    {
      id: 'kitchen-quiet',
      after: 25,
      once: true,
      when: (s) => s.flags.bookOnSill && !s.flags.captured && ['kitchen', 'sill'].includes(s.location),
      do: [['thought', 'Тихо. Пока я здесь — ничего не будет. Как с буквами.']],
    },
    {
      // закон 3: голоса приходят, когда на кухне никого нет
      id: 'dinner',
      after: 20,
      once: true,
      when: (s) => s.flags.bookOnSill && !s.flags.captured && !['kitchen', 'sill', 'phone'].includes(s.location),
      // в мире «Приходи» за ужином книгу тронули — у нас она сдвинулась (закон 3, не до конца — закон 4)
      set: { captured: true, bookShifted: true },
      do: [
        ['sfx', 'ui', { caption: 'на кухне пискнула колонка' }], ['wait', 1],
        ['sfx', 'whisper', { caption: 'далёкие голоса' }], ['wait', 1.6],
        ['thought', 'Мири пискнула. На кухне никого. Семь ноль две.'],
      ],
    },
  ],

  rules: [
    {
      id: 'finale',
      when: (s) => s.flags.assembled,
      beat: [
        ['wait', 0.6],
        ['say', 't', '«Тиша, ужинать!»'],
        ['scene', 'miri-close', { shot: 'close', transition: 'fade', dur: 1.6 }],
        ['sfx', 'whisper'],
        ['think', 'Мамин голос. Так она кричала из кухни, когда я был маленький и нас было четверо.'],
        ['think', 'Но мама сегодня на смене. И четырнадцатого. И семнадцатого. И двадцатого.'],
        ['narr', 'В конце записи — смех. Короткий, звонкий.'],
        ['say', 't', 'Вера?..'],
        ['think', 'Вера шесть лет как уехала. На нашей кухне некому так смеяться.'],
        ['think', 'И каждый раз рядом лежала её книга.'],
        ['music', null, { fade: 2 }],
        ['wait', 0.8],
        ['sfx', 'sting'],

        // Тот же вечер в мире «Приходи»
        ['scene', 'kitchen-p-evening', { shot: 'wide', transition: 'morph', dur: 3.5 }],
        ['music', 'p-night', { fade: 4 }],
        ['card', 'Тот же вечер · 19:02', 'За стеной смеётся Вера', 'p'],
        ['say', 'm', 'Тиша, ужинать!'],
        ['say', 'v', 'Мам, он опять в наушниках. Ти-и-иша!'],
        ['narr', 'Смех. Звон тарелок. Дождь по стеклу.'],
        ['say', 'x', 'Иду, иду! Паяльник только выключу… Вер, ты опять книгу на подоконник бросила? Отсыреет же.'],
        ['say', 'v', 'Она там шесть лет лежит. Не трогай.'],
        ['shot', 'window', { dur: 4 }],
        ['think', 'Книга как книга. Только иногда кажется, что из неё кто-то дышит. Ладно, бред.'],
        ['hide'],

        ['scene', 'kitchen-np-evening', { shot: 'wide', transition: 'morph', dur: 3 }],
        ['music', 'np-night', { fade: 3 }],
        ['say', 't', 'Где-то, где лежит эта книга, меня зовут ужинать.'],
        ['think', 'Там есть мама. Там есть Вера. Там есть я.'],
        ['think', 'Тогда кто из нас призрак?'],
        ['end'],
      ],
    },
  ],
};
