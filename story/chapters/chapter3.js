// Глава 3. «Ожог» — загадка «Письмо ожогом» (docs/загадки.md, №3). Акт 2: «Это человек».
//
// Книга лежит на кухонном подоконнике — через неё приходят голоса (закон 5).
// 1) Тихон пишет карандашом на полях «Кто ты?», уходит (закон 3) — и находит под своей надписью
//    бледный след чужого ответа: написанное доходит едва-едва (закон 4).
// 2) «Опыт №12. Тайнопись лимонным соком»: прогретый сок проступает коричневым — это ожог.
//    Что случилось с самой бумагой, дойдёт сильнее, чем то, что на ней написано.
// 3) Лимон (холодильник) + Верина кисточка (её стол) — написать; утюг (полка над вешалкой в коридоре:
//    мама гладит форму прямо там, перед сменой) — прогреть.
// 4) Уйти и вернуться: ответ ожогом — «ТИХОН. А ТЫ?». В другом мире двойник прожёг его паяльником.

const HERE = ['book', 'kitchen'];

export default {
  id: 'ch3',
  title: 'Глава 3. Ожог',
  next: 'ch4',
  chars: {
    t: { name: 'Тихон', world: 'np' },
    x: { name: 'Тихон', world: 'p' },
  },

  start: { location: 'kitchen', time: 'night' },

  locations: {
    room: { name: 'Комната Тихона', scene: (s) => `room-np-${s.time}`, music: () => 'np-night' },
    hall: { name: 'Коридор', scene: (s) => `hall-np-${s.time}`, music: () => 'np-night' },
    kitchen: { name: 'Кухня', scene: (s) => `kitchen-np-${s.time}`, music: () => 'np-night' },
    vera: { name: 'Комната Веры', scene: () => 'vera-np', music: () => 'np-night' },
    book: { name: 'Книга', hidden: true, scene: () => 'book-np', music: () => 'np-night' },
  },

  sceneClasses: (s) => [
    'note-shift', 'book-on-sill', 'book-taken', 'book-shifted',
    s.flags.pencil && 'w-pencil-on',
    s.flags.faint && 'w-faint-on',
    s.flags.lemon && 'w-lemon-on',
    s.flags.burned && 'w-burn-on',
    s.flags.reply && 'w-reply-on',
  ].filter(Boolean),

  carry: (s) => [s.flags.hasLemon && 'лимон', s.flags.hasBrush && 'кисточка', s.flags.hasIron && 'утюг'].filter(Boolean).join(', '),

  // память истории: вернул ли Верину вещь на место
  remember: (s) => ({ returnedBrush: !!s.flags.returnedBrush }),

  end: {
    text: [
      'Это не призрак. Это человек — и его зовут так же.',
      'Письма ожогом доходят. Но каждое оставляет след на первой книге, которую восстановила Вера.',
    ],
  },

  intro: [
    ['card', 'Той же ночью', '23:10 · за окном идёт товарный', 'np'],
    ['think', 'Мама на смене до утра. Книга так и лежит на кухонном подоконнике — наискосок, как её оставили.'],
    ['think', 'Оттуда доходит. Может, дойдёт и отсюда.'],
  ],

  interact(scene, id, s) {
    const f = s.flags;

    // ---------- кухня ----------
    if (scene.startsWith('kitchen')) {
      if (id === 'sill') return { go: 'book' };
      if (id === 'fridge') {
        if (!f.hasLemon) return { key: 'lemon', set: { hasLemon: true }, lines: ['В холодильнике — суп под тарелкой вместо крышки, банка огурцов, половинка лимона. Беру лимон.'] };
        return { key: 'lemon2', lines: ['Буквы висят ровно. Похоже, ему сейчас не до них.'] };
      }
      if (id === 'cabinet') {
        if (f.readExp12 && !f.hasIron) return { key: 'noIron', lines: ['Батарейки, прищепки, ключи. Утюга нет.', 'Мама гладит не на кухне. Она гладит там, где висит форма.'] };
      }
      if (id === 'note') return { key: 'ch3', lines: ['«Я на смене до утра». Значит, до утра дом — мой.'] };
    }

    // ---------- коридор ----------
    if (scene.startsWith('hall')) {
      if (id === 'corridor') return { go: 'kitchen' };
      if (id === 'vera') return { go: 'vera' };
      if (id === 'mine') return { go: 'room' };
      // утюг: мама гладит форму прямо у вешалки и ставит его остывать на полку, за шапки
      if ((id === 'hats' || id === 'coats') && f.readExp12 && !f.hasIron) {
        return { key: 'iron', set: { hasIron: true }, lines: ['На полке, за шапками, — утюг. Мама гладит форму прямо тут, у вешалки, и ставит его сюда остывать. Беру.'] };
      }
    }

    // ---------- комната Веры ----------
    if (scene === 'vera-np') {
      if (id === 'desk') {
        if (!f.hasBrush && !f.returnedBrush) return { key: 'brush', set: { hasBrush: true }, lines: ['Беру Верину кисточку — самую тонкую, «нулёвку». Прости, Вер. Верну.'] };
        if (f.hasBrush && f.lemon) {
          return { key: 'back', set: { hasBrush: false, returnedBrush: true }, lines: ['Кладу кисточку на место. Ровно туда, где в пыли остался её след.', 'Вера бы заметила. Она всегда замечала.'] };
        }
        if (f.returnedBrush) return { key: 'brush3', lines: ['Кисточка на месте, в своей пыльной тени. Будто я её и не брал.'] };
        return { key: 'brush2', lines: ['Кисточка у меня. Остальное пусть лежит, как лежало шесть лет.'] };
      }
    }

    // ---------- книга ----------
    if (scene === 'book-np') {
      if (id === 'pageL') {
        return { lines: ['Опыт №7. «Как вода стирает чернила». Книга сама открывается здесь — будто между этими страницами что-то долго лежало.', 'Капля на строчку — и слово расплывается. Вера показывала мне это, когда мне было семь.'] };
      }
      if (id === 'pageR') {
        return {
          set: { readExp12: true },
          lines: [
            'Опыт №12. «Тайнопись лимонным соком». Пишешь соком — буквы невидимы. Прогреешь бумагу — проступают коричневым.',
            'Проявляет не сок, а жар: там, где писали, бумага подгорает раньше.',
          ],
        };
      }
      // Всё на левом поле: карандашный вопрос, бледный след ответа, потом тот же вопрос соком поверх карандаша
      if (id === 'marginL') {
        if (f.burned) return { key: 'burned', lines: ['«КТО ТЫ?» — коричневым поверх карандаша, как подпалина. Пахнет палёной бумагой.', 'Прости, Вер. Это твоя первая книга.'] };
        if (f.lemon) {
          if (!f.hasIron) return { key: 'needIron', lines: ['Сок высох, буквы пропали — остался только карандаш. Теперь — жар.'] };
          return {
            beat: [
              ['thought', 'Кладу сверху кухонное полотенце. Утюг шипит — раз, другой…'],
              ['sfx', 'page'],
              ['wait', 1.4],
              ['sfx', 'burn'], ['wait', 0.8], ['set', { burned: true }],
              ['sfx', 'sting'],
              ['thought', 'Поверх карандаша проступает: КТО ТЫ? Коричневым, будто выжжено.'],
            ],
          };
        }
        if (!f.pencil) return { key: 'pencil', set: { pencil: true }, lines: ['Пишу карандашом на полях: «Кто ты?»', 'Голоса она приносит. Пусть отнесёт и это.'] };
        if (!f.faint) return { key: 'wait', lines: ['«Кто ты?» — моим почерком. Карандаш, серый, как пыль.'] };
        if (f.readExp12 && f.hasLemon && f.hasBrush) {
          return { key: 'lemon', set: { lemon: true }, lines: ['Выжимаю лимон в крышку от банки. Вериной кисточкой обвожу своё «Кто ты?» — буква в букву.', 'Сок блестит секунду — и уходит в бумагу.'] };
        }
        if (f.readExp12) return { key: 'need', lines: [!f.hasLemon ? 'Карандаш до него не доходит. Нужен сок. Лимон где-то был.' : 'Пальцем не обведёшь — нужно что-то тонкое.'] };
        return {
          key: 'faint',
          set: { sawFaint: true },
          lines: ['Под моим «Кто ты?» — бледная полоса. Чужой наклон, чужой нажим. Прочесть нельзя.', 'Он ответил. От ответа осталась одна тень.'],
        };
      }
    }

    if (id === 'bed') return { key: 'ch3', lines: ['Не до сна. Там кто-то ждёт ответа.'] };
    return null;
  },

  timers: [
    {
      id: 'train',
      every: [35, 60],
      when: (s) => ['room', 'kitchen', 'vera', 'hall'].includes(s.location),
      do: [['sfx', 'train', { caption: 'идёт товарный поезд', dur: 5 }], ['event', 'train'], ['shake', 2]],
    },
    {
      id: 'near',
      after: 25,
      once: true,
      when: (s) => HERE.includes(s.location) && ((s.flags.pencil && !s.flags.faint) || (s.flags.burned && !s.flags.reply)),
      do: [['thought', 'Пока я рядом, ничего не произойдёт. Как с буквами. Как с голосами.']],
    },
    {
      // закон 3: ответ приходит, когда рядом с книгой никого
      id: 'shadow',
      after: 20,
      once: true,
      when: (s) => s.flags.pencil && !s.flags.faint && !HERE.includes(s.location),
      set: { faint: true },
      do: [['sfx', 'page', { caption: 'на кухне шелестит бумага' }], ['wait', 1], ['thought', 'Шелест. Из кухни. Будто кто-то перевернул страницу.']],
    },
    {
      id: 'exp-hint',
      after: 60,
      once: true,
      when: (s) => s.flags.sawFaint && !s.flags.readExp12,
      do: [['thought', 'Вера говорила: в этой книге есть ответ на всё. Надо только найти страницу.']],
    },
    {
      id: 'items-hint',
      after: 70,
      once: true,
      when: (s) => s.flags.readExp12 && !(s.flags.hasLemon && s.flags.hasBrush),
      do: [['thought', 'В детстве Вера не давала мне свои кисточки. Теперь она не узнает.']],
    },
    {
      id: 'iron-hint',
      after: 50,
      once: true,
      when: (s) => s.flags.lemon && !s.flags.hasIron,
      do: [['thought', 'Перед сменой мама гладит форму прямо в коридоре, у вешалки. Я засыпал под это шипение за дверью.']],
    },
    {
      id: 'reply',
      after: 25,
      once: true,
      when: (s) => s.flags.burned && !s.flags.reply && !HERE.includes(s.location),
      set: { reply: true },
      do: [['wait', 0.5], ['thought', 'Пахнет палёной бумагой. Но утюг давно остыл…']],
    },
  ],

  rules: [
    {
      id: 'finale',
      when: (s) => s.flags.reply && s.location === 'book',
      beat: [
        ['wait', 1.5],
        ['say', 't', '«ТИХОН. А ТЫ?»'],
        ['think', 'Ожогом. Только не мазками, а точками, будто иглой. Он понял, как я это сделал.'],
        ['think', 'Тихон. Его зовут Тихон.'],
        ['music', null, { fade: 2 }],
        ['wait', 0.8],
        ['sfx', 'sting'],

        // Полчаса назад, мир «Приходи»
        ['scene', 'book-p', { shot: 'wide', transition: 'morph', dur: 3.5 }],
        ['music', 'p-night', { fade: 4 }],
        ['card', 'Полчаса назад', 'Другой подоконник, тот же дождь', 'p'],
        ['say', 'x', '«КТО ТЫ?» Коричневым. Прямо на полях Вериной книги.'],
        ['say', 'x', 'Призраки не спрашивают, кто ты. И не знают про лимонный сок.'],
        ['scene', 'room-p', { shot: 'desk', transition: 'cross', dur: 1.6 }],
        ['think', 'Утюг мама унесла гладить. Зато у меня паяльник. Через фольгу, по буковке — только не дрожать.'],
        ['say', 'x', 'Вера меня убьёт. Точно убьёт.'],
        ['shot', 'board', { dur: 4 }],
        ['think', 'На доске — все его «выходки», по датам. Чашки, буквы, хлебница. Три недели я думал, что это призрак.'],
        ['say', 'x', 'А это человек. Который отвечает.'],
        ['hide'],

        ['scene', 'book-np', { shot: 'wide', transition: 'morph', dur: 3 }],
        ['music', 'np-night', { fade: 3 }],
        ['say', 't', 'Меня тоже зовут Тихон.'],
        ['think', 'Отвечу завтра. Полей почти не осталось. А книга у Веры одна.'],
        ['card', 'ТИХОН · ТИХОН', 'Два почерка — одна рука'],
        ['end'],
      ],
    },
  ],
};
