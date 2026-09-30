// Глава 4. «Два гудка» — загадка «Два гудка» (docs/загадки.md, №4). Первый переход, сделанный сознательно.
//
// Двойник прожёг в книге: «ФОТО. 6:40. ВМЕСТЕ.» — взять фото-якорь одновременно (закон 7).
// Утром время идёт само: flags.min — настоящая минута (6:37, 6:38…).
// Ловушка: кухонные часы спешат на три минуты (Тихон говорил об этом ещё в главе 1),
// а в мире «Приходи» часы точные — двойник возьмёт фото в настоящие 6:40.
// Общий сигнал для обоих миров — два гудка папиной электрички ровно в 6:40 (закон 1).
// Держать фото в миг гудков — и выдержать холод и гул (закон 6): оба стоят в одной точке.
// Не удалось — утро повторяется. Удалось — Тихоны меняются местами.
// Вечером мини-загадка «Ответ»: поля книги почти кончились, лимон ушёл весь на «Кто ты?».
// В «Опыте №12» мелким шрифтом: годится и молоко. Молоко (холодильник), спичка вместо кисточки (шкафчик),
// утюг (полка у вешалки) — и слева от гравюры, где нет строк, проступает «Приду.»:
// шесть лет назад он послушался «Не приходи». Теперь это слово — его.

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
    s.flags.replied && 'w-4r-on',
  ].filter(Boolean),

  carry: (s) => {
    const f = s.flags;
    return [
      f.holding && 'фото с полки',
      !f.replied && f.hasMilk && 'молоко',
      !f.replied && f.hasMatch && 'спички',
      !f.replied && f.hasIron && 'утюг',
    ].filter(Boolean).join(', ');
  },

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

  // «Что дальше?» (Q) — чем герой сейчас занят; направление, а не готовый ответ
  goal(s) {
    const f = s.flags;
    if (s.time !== 'morning') {
      if (f.replied) return 'Ответил. Завтра в 6:40 — фото. Лечь спать, будильник на 6:35.';
      if (f.wrote) return f.hasIron ? 'Прогреть ответ утюгом.' : 'Молоко высохло. Нужен жар — утюг на полке у вешалки.';
      if (f.readAlt) {
        const need = [!f.hasMilk && 'молоко', !f.hasMatch && 'чем писать вместо кисточки'].filter(Boolean);
        return need.length ? `Написать молоком. Нужны ${need.join(' и ')}.` : 'Написать ответ на свободном месте правой страницы.';
      }
      if (f.sawFull) return 'Лимона нет. Перечитать «Опыт №12» — может, есть чем заменить.';
      return 'Ответить ему, что я приду. В книге — там, где ещё есть место.';
    }
    if (f.fails) return 'В 6:40 держать фото. Только по чьим часам? Кухонные спешат. А в 6:40 каждое утро гудит папина электричка.';
    return 'В 6:40 взять фото с полки на кухне и держать.';
  },

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
      if (id === 'marginR' || id === 'pageR') {
        if (f.replied) return { key: 'replied', lines: ['«Приду.» Коричневым, у гравюры. Первый раз за шесть лет — это слово моё.'] };
        if (f.wrote && f.hasIron) {
          return {
            beat: [
              ['think', 'Кухонное полотенце сверху. Утюг шипит.'],
              ['sfx', 'burn'],
              ['set', { replied: true }],
              ['wait', 0.8],
              ['think', 'Проступает: «ПРИДУ.»'],
              ['think', 'Шесть лет назад мне написали «Не приходи» — и я не пришёл. Теперь я пишу это слово сам.'],
            ],
          };
        }
        if (f.wrote) return { key: 'dry', lines: ['Молоко впиталось — страница чистая. Теперь нужен жар.'] };
        if (f.readAlt && f.hasMilk && f.hasMatch) {
          return {
            key: 'write',
            set: { wrote: true },
            lines: ['Слева от гравюры, где нет строк, — место. Макаю спичку в молоко: «Приду».', 'Буквы блестят секунду — и уходят в бумагу.'],
          };
        }
        if (f.readAlt) return { key: 'need', lines: ['Молоко — и чем писать. Верина кисточка… нет. Хватит с неё.'] };
        if (f.sawFull) {
          return {
            key: 'alt',
            set: { readAlt: true },
            lines: ['«Опыт №12». Внизу, мелко, в сноске: «Если нет лимона — подойдёт молоко: проявляется так же».', 'Молоко у нас есть. Мамино, к утреннему кофе.'],
          };
        }
        return {
          key: 'full',
          set: { sawFull: true },
          lines: ['Места на полях почти нет. Ответить бы ему. Одно слово.', 'Но лимон я извёл весь — на «Кто ты?».'],
        };
      }
      if (id === 'engraving') return { key: 'eng', lines: ['Лимон и свеча. Слева от них — пустое место, без строк. Как раз на одно слово.'] };
    }

    // ---------- вечер ----------
    if (!morning(s)) {
      // загадка «Ответ»: молоко, спичка, утюг
      if (scene.startsWith('kitchen') && id === 'fridge' && f.readAlt && !f.hasMilk) {
        return { key: 'milk', shot: 'fridge', set: { hasMilk: true }, lines: ['В холодильнике — ужин под тарелкой и пакет молока. Мамин, к утреннему кофе. Наливаю в крышку от банки.'] };
      }
      if (scene.startsWith('kitchen') && id === 'cabinet' && f.readAlt && !f.hasMatch) {
        return { key: 'match', set: { hasMatch: true }, lines: ['Ключи, батарейки, прищепки — и коробок спичек для плиты.', 'Спичка вместо кисточки. Тонко, и не жалко.'] };
      }
      if (scene.startsWith('hall') && (id === 'hats' || id === 'coats') && f.readAlt && !f.hasIron) {
        return { key: 'iron', set: { hasIron: true }, lines: ['Утюг опять на полке, за шапками. Мама гладила форму перед сменой.'] };
      }
      if (id === 'bed' && !f.replied) return { key: 'noreply', lines: ['Лечь, не ответив? Он будет ждать до утра — и не узнает, приду ли я.'] };
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
                ['card', '6:40', 'Три кружки на столе', 'p'],
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
