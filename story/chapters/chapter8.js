// Глава 8. «Вокзал» — ветка «Оставил разговор двойнику». Акт 4, начало.
//
// Тихон из мира «Не приходи» спрятал записку и вернул лампу: сказать Вере должен тот, чья это жизнь.
// 1) Письмо двойнику: карандаш не доходит (закон 4), ожог — доходит. Паяльник двойника — в его
//    комнате; «через фольгу, по буковке», как он. Ответ приходит, когда у книги никого (закон 3).
// 2) Утро: в этом мире часы ТОЧНЫЕ (двойник их чинит) — ловушка главы 4 наоборот: кто по привычке
//    ждёт «на три минуты позже», опоздает. Держать фото в 6:40 и выдержать холод (законы 6, 7).
// 3) Обмен обратно. Двойник сам показывает Вере записку — и признаёт, что шесть лет прятался
//    за «она сама позвала».

const morning = (s) => s.time === 'morning';
const hhmm = (m) => `6:${String(m).padStart(2, '0')}`;
const HERE = ['kitchen', 'book'];

const again = (s, why) => [
  ['set', { min: 37, holding: false, fails: (s.flags.fails || 0) + 1 }],
  ['music', null, { fade: 1.5 }],
  ['go', 'room', { transition: 'fade', dur: 2.5 }],
  ['card', 'Следующее утро', ''],
  ['think', why],
];

export default {
  id: 'ch8',
  title: 'Глава 8. Вокзал',
  branch: true,
  next: 'ch9',
  hero: 't',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: 'Тихон', world: 'p' },
    v: { name: 'Вера', world: 'p' },
  },

  start: { location: 'room', time: 'evening' },

  locations: {
    room: { name: 'Его комната', scene: () => 'room-p', music: (s) => (morning(s) ? 'p-night' : 'p-night') },
    hall: { name: 'Коридор', scene: () => 'hall-p', music: () => 'p-night' },
    kitchen: { name: 'Кухня', scene: () => 'kitchen-p-evening', music: () => 'p-night' },
    book: { name: 'Книга', hidden: true, scene: () => 'book-p', music: () => 'p-night' },
  },

  sceneClasses: (s) => [
    'w-hint-on', 'w-p7-on', 'wp-reply-on', 'wp-m2-on', 'wp-4r-on',
    s.flags.sent && 'w-8a-on',
    s.flags.reply && 'w-8b-on',
    !morning(s) && 'vera-here',
  ].filter(Boolean),

  carry: (s) => [s.flags.hasSolder && !s.flags.sent && 'его паяльник', s.flags.hasFoil && !s.flags.sent && 'кусок фольги', s.flags.holding && 'фото с полки'].filter(Boolean).join(', '),

  end: {
    text: [
      'Тихоны вернулись домой. Здешний сам показал Вере записку — и признал, что шесть лет прятался за «она позвала».',
      'Осталось последнее совпадение: одно слово на фото-якоре, написанное вдвоём.',
    ],
  },

  intro: [
    ['card', '20:40', 'Дождь по подоконнику', 'p'],
    ['think', 'Всё ещё его дом. Завтра в 6:40 мы можем вернуться — каждый к себе.'],
    ['think', 'Лампа на месте. Записка — в ящике. Вера за стеной слушает музыку в своих наушниках.'],
    ['think', 'Ему нужно сказать. Но как — если я здесь, а он там?'],
    ['think', 'Паяльником я ему уже писал — про наушники. Криво, но дошло. Значит, и сейчас дойдёт.'],
  ],

  // «Что дальше?» (Q) — чем герой сейчас занят; направление, а не готовый ответ
  goal(s) {
    const f = s.flags;
    if (s.time === 'morning') return f.fails ? 'В 6:40 держать фото. Здесь часы не спешат — он их починил.' : 'В 6:40 взять фото с полки и держать.';
    if (f.reply) return 'Он ответил. Завтра 6:40. Лечь спать.';
    if (f.sent) return 'Письмо ушло. Уйти от книги — пусть ответит.';
    if (f.hasSolder && f.triedBurn && !f.hasFoil) return 'Голым жалом — пятно. Как у него выходят ровные точки? Посмотреть на его рабочем столе, под лупой.';
    if (f.hasSolder) return 'Выжечь письмо на полях книги. Как он — по буковке.';
    return 'Сказать ему, что она писала «Не». Карандаш не дойдёт — нужен его паяльник.';
  },

  interact(scene, id, s) {
    const f = s.flags;

    if (scene === 'hall-p') {
      if (id === 'corridor') return { go: 'kitchen' };
      if (id === 'mine') return { go: 'room' };
      if (id === 'vera' && !morning(s)) return { key: 'eve', lines: ['«Ты чего такой тихий весь вечер?» — Вера смотрит из дверей.', 'Я молчу. Это не мой разговор.'] };
      if (id === 'vera') return { key: 'am', lines: ['Её дверь прикрыта. Спит. Сегодня с ней поговорит тот, чей это разговор.'] };
    }
    if (scene === 'kitchen-p-evening') {
      if (id === 'book') return { go: 'book' };
      if (id === 'clock') return morning(s) ? { key: `m${f.min}`, lines: [`На часах — ${hhmm(f.min)}.`] } : { key: 'eve', lines: ['Часы тикают ровно, секунда в секунду. Внутри — новая батарейка и капля клея.'] };
      if (id === 'photo' && morning(s)) {
        if (f.holding) return { key: 'hold', shot: 'photo', lines: ['Держу. Ещё немного.'] };
        return { key: 'take', shot: 'photo', set: { holding: true, holdAt: f.min }, lines: ['Беру фото с полки. Единственное здесь, что выглядит как дома. Пальцы холодеют.'] };
      }
    }

    if (scene === 'room-p') {
      if (id === 'lamp' && !f.hasFoil) {
        return {
          key: 'foil',
          set: { hasFoil: true },
          lines: ['Под лупой, в лотке с платами, — сложенный лист фольги в мелких дырочках. Дырочки складываются в буквы, задом наперёд: «?ЫТ А .НОХИТ».', 'Трафарет. Он прожигал через фольгу — по точке, и бумага не горела. В ящике с мелочью — рулон. Отрываю чистый кусок.'],
        };
      }
      if (id === 'solder') {
        if (!f.hasSolder && !f.sent) return { key: 'take', set: { hasSolder: true }, lines: ['Паяльник. Второй раз беру его вещь без спроса. В этот раз — ради него. Беру.'] };
        return { key: 'has', lines: ['Паяльник. Верну на место, жалом к стене, как лежал. Это его вещь.'] };
      }
      if (id === 'bed') {
        if (morning(s)) return { key: 'am', lines: ['Не сейчас.'] };
        if (!f.reply) return { key: 'wait', lines: ['Не усну, пока он не ответит. Дождь по подоконнику, как метроном.'] };
        return {
          beat: [
            ['think', 'Ставлю будильник на 6:35. Сплю в его кровати последнюю ночь.'],
            ['music', null, { fade: 2 }],
            ['time', 'morning'],
            ['set', { min: 37, holding: false }],
            ['go', 'room', { transition: 'fade', dur: 3 }],
            ['card', 'Утро', ''],
            ['think', 'Будильник — 6:37.'],
          ],
        };
      }
    }

    if (scene === 'book-p') {
      if (id === 'marginR' || id === 'pageR') {
        if (f.reply) return { key: 'reply', lines: ['«Завтра. 6:40. Домой.» — его ответ, бледный, точками, над гравюрой.', 'Только по чьим часам?'] };
        if (f.sent) return { key: 'sent', lines: ['«Она писала «Не». Скажи ей сам.» Буквы — точками, как у него.'] };
        if (!f.hasSolder) return { key: 'nothing', lines: ['Карандаш не дойдёт — только тень. Нужен ожог.'] };
        // мини-загадка «Фольга»: голым жалом страница темнеет пятном — у него же ровные точки
        if (!f.hasFoil) {
          return {
            key: 'blot',
            set: { triedBurn: true },
            lines: ['Подношу жало к полю — бумага сразу темнеет пятном. Так я прожгу Верину книгу насквозь.', 'В тот раз буквы плясали. А у него — ровные точки, одна к одной. Как?'],
          };
        }
        return {
          beat: [
            ['think', 'Фольгу на поле, как у него. Жалом — по точке, по буковке.'],
            ['sfx', 'page'],
            ['wait', 1.2],
            ['sfx', 'burn'], ['wait', 0.8], ['set', { sent: true }],
            ['think', '«Она писала «Не». Скажи ей сам».'],
            ['think', 'Ещё один ожог в Вериной книге. Последний — обещаю.'],
          ],
        };
      }
      if (id === 'marginL' || id === 'pageL') {
        if (f.reply) return { key: 'reply', lines: ['«Завтра. 6:40. Домой.» — его ответ, бледный, точками.', 'Завтра. Шесть сорок. Только по чьим часам?'] };
        return { key: 'old', lines: ['Старые обрывки: «…записк… …в столе…». Он помог мне. Теперь моя очередь.'] };
      }
    }
    return null;
  },

  timers: [
    {
      id: 'reply',
      after: 25,
      once: true,
      when: (s) => s.flags.sent && !s.flags.reply && !HERE.includes(s.location),
      set: { reply: true },
      do: [['sfx', 'page', { caption: 'на кухне шелестит бумага' }], ['wait', 0.8], ['thought', 'Снова палёной бумагой. Он ответил.']],
    },
    {
      id: 'minute',
      every: [7, 7],
      when: (s) => morning(s) && s.flags.min < 40,
      set: (s) => ({ min: s.flags.min + 1 }),
    },
    {
      id: 'drop',
      after: 1,
      when: (s) => s.flags.holding && s.location !== 'kitchen',
      set: { holding: false },
      do: [['thought', 'Поставил фото обратно на полку.']],
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
      id: 'train',
      every: [35, 60],
      when: (s) => !morning(s),
      do: [['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
  ],

  rules: [
    {
      id: 'horns',
      repeat: true,
      when: (s) => morning(s) && s.flags.min >= 40,
      beat: (s) => {
        const fails = s.flags.fails || 0;
        if (!s.flags.holding) {
          return [
            ['sfx', 'horns', { caption: 'два гудка — папина электричка' }],
            ['shake', 2],
            ['think', 'Два гудка. А фото стоит на полке.'],
            ...(fails >= 1 ? [['think', 'Здесь часы не спешат. Он их сам починил.']] : []),
            ...again(s, 'Будильник — 6:37. Ещё раз.'),
          ];
        }
        return [
          ['sfx', 'cold', { caption: 'холод и гул' }],
          ['shake', 3],
          ['think', 'Холод. Гул. Он там — с той стороны рамки.'],
          ['sfx', 'horn', { caption: 'первый гудок' }],
          ['choice', [
            { text: 'Отпустить', do: [['think', 'Пальцы разжимаются.'], ['sfx', 'horn', { caption: 'второй гудок' }], ...again(s, 'Будильник — 6:37. Не отпущу.')] },
            {
              text: 'Держать',
              do: [
                ['sfx', 'horn', { caption: 'второй гудок' }],
                ['set', { resolved: true, holding: false }],
                ['sfx', 'sting'],
                ['music', null, { fade: 1 }],
                ['scene', 'kitchen-np-morning', { shot: 'wide', transition: 'morph', dur: 4 }],
                ['music', 'np-morning', { fade: 3 }],
                ['card', '6:40', 'Пыль на подоконнике', 'np'],
                ['think', 'Дома. Пыльно, тихо, одна чашка. Мой дом.'],
                ['think', 'А там, у него, сейчас начнётся главный разговор.'],
                ['music', null, { fade: 2 }],
                ['scene', 'kitchen-p-evening', { shot: 'wide', transition: 'morph', dur: 3 }],
                ['music', 'vera', { fade: 3 }],
                ['card', 'Тем же утром', 'На кухне двое', 'p'],
                ['say', 'v', 'Тиш? Ты опять в худи. Вчера же в водолазке ходил.'],
                ['say', 'x', 'Вер. Сядь, пожалуйста. Нет, правда сядь. Мне надо тебе кое-что показать.'],
                ['narr', 'Лампа для ногтей. Записка, протёртая на сгибах. Фиолетовый свет.'],
                ['say', 'v', '«Не»…'],
                ['say', 'x', 'Ты писала «не». А я прочёл «приходи». Шесть лет я всем говорил, что ты сама позвала.'],
                ['say', 'x', 'Мне так было легче. Если позвала — значит, я не виноват.'],
                ['say', 'v', 'А я шесть лет думала, что ты разбудил маму назло. Чтобы я не уехала.'],
                ['say', 'x', 'Я не смог прочесть, Вер. Дождь.'],
                ['narr', 'Долгая тишина. Потом Вера смеётся — коротко, звонко, сквозь слёзы.'],
                ['say', 'v', 'Дождь. Шесть лет — из-за дождя.'],
                ['card', 'Вокзал', 'Шесть лет спустя они договорили'],
                ['end'],
              ],
            },
          ]],
        ];
      },
    },
  ],
};
