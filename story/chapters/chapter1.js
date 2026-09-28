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
  next: 'ch2',
  end: {
    text: [
      'Тихон прочёл «…ХОДИ» как «приходи». Ночью он пойдёт на зов.',
      'А в том же доме, на той же кухне, кто-то ждёт утра — проверить, ушёл ли «призрак».',
    ],
  },
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
  sceneClasses: (s) => [s.flags.lettersMoved && 'letters-moved', s.flags.uhodi && 'uhodi-on'].filter(Boolean),

  intro: [
    ['card', 'Нижние Броды', '01:46 · одна чашка на столе', 'np'],
    ['say', 't', 'Двадцать первая ночь. И опять.'],
    ['think', 'Скрип. Пауза. Скрип. Ровно, как по метроному. Старый дом так не скрипит. Так ходят.'],
    ['hint', 'Щёлкайте по предметам — из них складывается история. Другие места — внизу слева.'],
  ],

  interact(scene, id, s) {
    const inKitchen = scene.startsWith('kitchen');

    if (inKitchen && id === 'doorway') return { go: 'room' };

    if (inKitchen && id === 'fridge') {
      if (s.flags.solved) return { shot: 'letters', key: 'solved', lines: ['…ХОДИ. Четыре буквы. Начала нет.'] };
      if (s.flags.lettersMoved) {
        return { shot: 'letters', key: 'moved', set: { sawLetters: true }, lines: ['Буквы не упали. Сдвинуты — чуть-чуть. Как фальшивая нота: слышишь сразу, а найти не можешь.'] };
      }
      return null;
    }

    if (id === 'bed' && night(s)) {
      if (!s.flags.lettersMoved) return { key: 'early', lines: ['Лечь? Через минуту опять заскрипит.', 'Не усну. Диктофон мигает — пусть он и не спит за меня.'] };
      return {
        beat: [
          ['say', 't', 'Щелчки. Шёпот. Ладно. При свете разберусь.'],
          ['music', null, { fade: 2 }],
          ['time', 'morning'],
          ['go', 'room', { transition: 'fade', dur: 3 }],
          ['card', '6:39', 'Утро'],
          ['thought', 'Утром всё проще. Туман с реки, насыпь висит над крышами. Почти не страшно.'],
        ],
      };
    }
    if (id === 'bed') return { key: 'morning', lines: ['Досыпать смысла нет. В 6:40 всё равно разбудят.'] };

    if (id === 'recorder' && !night(s) && s.flags.lettersMoved) {
      return {
        key: 'record',
        set: { heardRecording: true },
        lines: ['Мотаю запись. Холодильник, товарный, тишина — и в 01:50 шёпот: «…ходи…».', 'Голос знакомый. Как свой в записи: вроде ты, а вроде чужой.'],
      };
    }
    if (id === 'laptop' && s.flags.lettersMoved) {
      return { key: 'moved', lines: ['Кидаю запись в редактор. Четыре щелчка, стук, пауза. Потом шёпот: «…ходи…». Не показалось.', 'Перед «ходи» — вдох и дыра. Будто первый слог срезали.'] };
    }
    return null;
  },

  puzzles: {
    letters: { when: (s) => s.flags.lettersMoved && !s.flags.solved, done: { solved: true } },
  },

  timers: [
    { id: 'creak', every: [35, 65], when: night, do: [['sfx', 'creak', { caption: 'где-то в доме скрипит половица' }]] },
    {
      id: 'freight',
      every: [35, 60],
      when: night,
      do: [['sfx', 'train', { caption: 'идёт товарный поезд', dur: 5 }], ['event', 'train'], ['shake', 2], ['sfx', 'clink']],
    },
    {
      // пока Тихон на кухне, буквы не сдвинутся (закон 3)
      id: 'kitchen-quiet',
      after: 30,
      once: true,
      when: (s) => night(s) && s.location === 'kitchen' && !s.flags.lettersMoved,
      do: [['thought', 'Холодильник гудит, часы тикают. Больше ничего. Пока я тут стою — ничего и не будет.']],
    },
    {
      id: 'clicks',
      after: 40,
      once: true,
      when: (s) => night(s) && s.location !== 'kitchen',
      set: { lettersMoved: true, heardWhisper: true },
      do: [
        // шаги на пустой кухне
        ['sfx', 'creak', { caption: 'на кухне скрипит пол — будто кто-то ходит' }], ['shake', 1],
        ['wait', 1.5], ['sfx', 'creak'], ['wait', 1.6],
        // четыре буквы едут по дверце и щёлкают о металл
        ['sfx', 'magnet', { caption: 'щёлк… щёлк… — магниты на холодильнике' }],
        ['wait', 0.9], ['sfx', 'magnet'], ['wait', 0.7], ['sfx', 'magnet'], ['wait', 1.1], ['sfx', 'magnet'],
        // одна срывается и стучит по полу
        ['wait', 0.5], ['sfx', 'fall', { caption: 'что-то упало и стучит по полу' }], ['shake', 1],
        ['wait', 2], ['sfx', 'whisper', { caption: 'шёпот из-за двери Веры: «…ходи…»' }], ['wait', 1.8],
        ['thought', 'Там кто-то есть.'],
      ],
    },
    {
      id: 'clicks-hint',
      after: 45,
      once: true,
      when: (s) => night(s) && s.flags.lettersMoved && !s.flags.sawLetters && s.location !== 'kitchen',
      do: [['thought', 'Этот щелчок я знаю. Магнит о дверцу. Так щёлкало, когда мама перевешивала мои буквы.']],
    },
    {
      id: 'arrive',
      after: 3,
      once: true,
      when: (s) => s.location === 'kitchen' && s.flags.lettersMoved && !s.flags.sawLetters,
      do: [['thought', 'Кухня. Лампа, гул холодильника, красный сигнал за окном. Всё как всегда. Или нет?']],
    },
    {
      id: 'letters-hint',
      after: 70,
      once: true,
      when: (s) => !night(s) && s.flags.lettersMoved && !s.flags.sawLetters,
      do: [['thought', 'Мама любит, чтобы всё висело на своих местах. Ровно, по линеечке.']],
    },
    {
      id: 'six-forty',
      after: 15,
      once: true,
      when: (s) => !night(s),
      do: [
        ['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 2],
        ['sfx', 'clink', { caption: 'звенят чашки' }], ['wait', 2.4],
        ['sfx', 'horns', { caption: 'два коротких гудка' }], ['wait', 1.5],
        ['thought', 'Два гудка. Папа. Каждое утро в 6:40 одно и то же: «я здесь».'],
      ],
    },
    {
      id: 'morning-train',
      every: [40, 65],
      when: (s) => !night(s) && s.fired['six-forty'],
      do: [['sfx', 'train', { caption: 'идёт электричка', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
  ],

  rules: [
    {
      id: 'finale',
      when: (s) => s.flags.solved,
      beat: [
        ['wait', 0.6],
        ['say', 't', '…ХОДИ.'],
        ['think', 'Перед «Х» — пустое место. Как будто начало слова не дошло.'],
        ['think', '{При}ходи.'],
        ['say', 't', 'ПРИХОДИ.'],
        ['think', 'Шесть лет назад Вера написала: «Не приходи провожать». И я не пришёл.'],
        ['think', 'А теперь кто-то пишет мне то самое слово. Без «не».'],
        ['say', 't', 'Ладно. Кто бы ты ни был. Сегодня ночью я приду.'],
        ['music', null, { fade: 2 }],
        ['wait', 1],
        ['sfx', 'sting'],

        // Та же кухня, той же ночью, мир «Приходи»
        ['scene', 'kitchen-p', { shot: 'wide', transition: 'morph', dur: 3.5 }],
        ['music', 'p-night', { fade: 4 }],
        ['card', 'Несколько часов назад · 01:50', 'Тот же дом. На столе — три кружки', 'p'],
        ['shot', 'twin', { dur: 6 }],
        ['say', 'x', 'Хватит. Я знаю, что ты здесь.'],
        ['say', 'x', 'Три недели! Чашки переставлены, ключи из хлебницы уползают, половицы скрипят, когда никто не ходит.'],
        ['say', 'x', 'Не знаю, кто ты и что тебе надо. Но это мой дом, ясно? Мой.'],
        ['hide'],
        ['scene', 'kitchen-p-fridge', { shot: 'row', transition: 'cross', dur: 1.4 }],
        ['event', 'place'],
        ['set', { uhodi: true }],
        ['wait', 1.2],
        ['say', 'x', 'У. Х. О. Д. И. Крупно и ровно. Даже призрак прочтёт.'],
        ['scene', 'kitchen-p', { shot: 'window', transition: 'cross', dur: 1.6 }],
        ['think', 'Верина книга на подоконнике. Разбухшая, волнами. Шесть лет тут лежит — и никто её не убирает.'],
        ['say', 'x', 'Слышишь? УХОДИ.'],
        ['wait', 1],
        ['event', 'glow', { wait: false }],
        ['shot', 'room', { dur: 5 }],
        ['say', 'x', 'Утром проверю. Будут висеть, как я повесил, — значит, ты ушёл.'],
        ['card', 'ПРИХОДИ · УХОДИ', 'Одни и те же буквы'],
        ['end'],
      ],
    },
  ],
};
