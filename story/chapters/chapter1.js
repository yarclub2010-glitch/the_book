// Глава 1. «Буквы» — свободное исследование.
//
// Игрок сам ходит между местами (панель внизу слева) и щёлкает по предметам.
// Камера подходит к предмету только по щелчку игрока. Сюжет открывается находками:
//   flags         — что игрок узнал или что случилось в мире;
//   timers        — живой мир: скрипы, поезда, щелчки из кухни (идут, пока игрок исследует);
//   interact      — особые реакции предметов в зависимости от состояния;
//   puzzles       — когда доступна загадка (сама загадка описана в сцене);
//   rules         — сценки, которые запускаются, когда выполнено условие.
//
// Команды сценок: scene, shot, say, think, narr, card, music, sfx, event, shake, wait,
//   hide, thought (мысль без остановки), hint (подсказка игроку), set, time, go, end.
// В тексте {слово} — «размытое» слово, как в записке Веры.

const night = (s) => s.time === 'night';

export default {
  id: 'ch1',
  title: 'Глава 1. Буквы',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: '???', world: 'p' },
  },

  start: { location: 'room', time: 'night' },

  locations: {
    room: {
      name: 'Комната Тихона',
      scene: (s) => `room-np-${s.time}`,
      music: (s) => (night(s) ? 'np-night' : 'np-morning'),
    },
    kitchen: {
      name: 'Кухня',
      scene: (s) => `kitchen-np-${s.time}`,
      music: (s) => (night(s) ? 'np-night' : 'np-morning'),
    },
  },

  // Закон 3: изменения из другого мира приходят, когда в комнате никого нет
  sceneClasses: (s) => (s.flags.lettersMoved ? ['letters-moved'] : []),

  intro: [
    ['card', 'Нижние Броды', '01:46 · мир «Не приходи»'],
    ['say', 't', 'Три недели. Каждую ночь одно и то же.'],
    ['think', 'Скрип. Тишина. Снова скрип. Как будто в доме живёт кто-то ещё.'],
    ['hint', 'Щёлкайте по предметам — так вы узнаете историю. Другая комната — внизу слева.'],
  ],

  interact(scene, id, s) {
    const inKitchen = scene.startsWith('kitchen');

    if (inKitchen && id === 'doorway') return { go: 'room' };

    if (inKitchen && id === 'fridge') {
      if (s.flags.solved) return { shot: 'letters', key: 'solved', lines: ['…ХОДИ. Кто-то зовёт меня.'] };
      if (s.flags.lettersMoved) {
        return { shot: 'letters', key: 'moved', set: { sawLetters: true }, lines: ['Буквы… Их кто-то двигал. Не упали — сдвинуты.'] };
      }
      return null;
    }

    if (id === 'bed' && night(s)) {
      if (!s.flags.lettersMoved) return { key: 'early', lines: ['Рано. Опять будет скрип.', 'Всё равно не усну.'] };
      return {
        beat: [
          ['say', 't', 'Щелчки на кухне. Шёпот. Ладно. Утром разберусь.'],
          ['music', null, { fade: 2 }],
          ['time', 'morning'],
          ['go', 'room', { transition: 'fade', dur: 3 }],
          ['card', '6:39', 'Утро'],
          ['thought', 'Утро. Всё выглядит проще. Почти.'],
        ],
      };
    }
    if (id === 'bed') return { key: 'morning', lines: ['Уже утро. Спать всё равно не выйдет.'] };

    if (id === 'recorder' && !night(s) && s.flags.lettersMoved) {
      return {
        key: 'record',
        set: { heardRecording: true },
        lines: ['Слушаю запись. Три часа тишины — и в 01:50 шёпот: «…ходи…».', 'Тот же голос, что ночью. Или мой собственный — только очень далеко.'],
      };
    }
    if (id === 'laptop' && s.flags.lettersMoved) {
      return { key: 'moved', lines: ['Щелчки и шёпот записались. Если усилить… «…ходи…». Не показалось.'] };
    }
    return null;
  },

  puzzles: {
    letters: { when: (s) => s.flags.lettersMoved && !s.flags.solved, done: { solved: true } },
  },

  timers: [
    { id: 'creak', every: [35, 65], when: night, do: [['sfx', 'creak', { caption: 'скрипит половица' }]] },
    {
      id: 'freight',
      every: [80, 120],
      when: night,
      do: [['sfx', 'train', { caption: 'идёт товарный поезд', dur: 5 }], ['event', 'train'], ['shake', 4], ['sfx', 'clink']],
    },
    {
      // пока Тихон на кухне, буквы не сдвинутся (закон 3)
      id: 'kitchen-quiet',
      after: 30,
      once: true,
      when: (s) => night(s) && s.location === 'kitchen' && !s.flags.lettersMoved,
      do: [['thought', 'Тихо. Только холодильник гудит. Кажется, пока я здесь, ничего не случится.']],
    },
    {
      id: 'clicks',
      after: 40,
      once: true,
      when: (s) => night(s) && s.location !== 'kitchen',
      set: { lettersMoved: true, heardWhisper: true },
      do: [
        ['sfx', 'magnet', { caption: 'щелчки из кухни' }], ['wait', 0.9], ['sfx', 'magnet'], ['wait', 0.7], ['sfx', 'magnet'],
        ['wait', 1.2], ['sfx', 'whisper', { caption: 'шёпот: «…ходи…»' }], ['wait', 1.8],
        ['thought', 'Щелчки. Из кухни. И этот шёпот… «ходи»?'],
      ],
    },
    {
      id: 'clicks-hint',
      after: 45,
      once: true,
      when: (s) => night(s) && s.flags.lettersMoved && !s.flags.sawLetters && s.location !== 'kitchen',
      do: [['thought', 'Щелчки были из кухни. Надо посмотреть.']],
    },
    {
      id: 'six-forty',
      after: 15,
      once: true,
      when: (s) => !night(s),
      do: [
        ['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 4],
        ['sfx', 'clink', { caption: 'звенят чашки' }], ['wait', 2.4],
        ['sfx', 'horns', { caption: 'два коротких гудка' }], ['wait', 1.5],
        ['thought', 'Два гудка. Папа. Каждое утро в 6:40 — «я здесь».'],
      ],
    },
    {
      id: 'morning-train',
      every: [100, 140],
      when: (s) => !night(s) && s.fired['six-forty'],
      do: [['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 3]],
    },
    {
      id: 'letters-hint',
      after: 70,
      once: true,
      when: (s) => !night(s) && s.flags.lettersMoved && !s.flags.sawLetters,
      do: [['thought', 'Холодильник… Ночью щёлкали именно там.']],
    },
  ],

  rules: [
    {
      id: 'finale',
      when: (s) => s.flags.solved,
      beat: [
        ['wait', 0.6],
        ['say', 't', '…ХОДИ.'],
        ['think', '{При}ходи?..'],
        ['say', 't', 'Щелчки ночью. Шёпот «…ходи». Кто-то стоял здесь и двигал буквы.'],
        ['say', 't', 'Кто-то зовёт меня. Сегодня ночью я буду здесь.'],
        ['music', null, { fade: 2 }],
        ['wait', 1],
        ['sfx', 'sting'],

        // Та же кухня, той же ночью, мир «Приходи»
        ['scene', 'kitchen-p', { shot: 'wide', transition: 'morph', dur: 3.5 }],
        ['music', 'p-night', { fade: 4 }],
        ['card', 'Той же ночью · 01:50', 'Тот же дом'],
        ['shot', 'twin', { dur: 6 }],
        ['say', 'x', 'Хватит. Я знаю, что ты здесь.'],
        ['say', 'x', 'Три недели ты двигаешь мои вещи. Переставляешь чашки. Гремишь посудой по ночам.'],
        ['say', 'x', 'Не знаю, кто ты. Но это мой дом.'],
        ['hide'],
        ['shot', 'row', { dur: 3, wait: true }],
        ['event', 'place'],
        ['wait', 1.2],
        ['shot', 'window', { dur: 4 }],
        ['think', 'Книга Веры на подоконнике. Всегда тут лежит.'],
        ['say', 'x', 'Слышишь? Уходи.'],
        ['wait', 1],
        ['event', 'glow', { wait: false }],
        ['shot', 'room', { dur: 5 }],
        ['say', 'x', 'Утром проверю. Если буквы останутся на месте — значит, ты ушёл.'],
        ['end'],
      ],
    },
  ],
};
