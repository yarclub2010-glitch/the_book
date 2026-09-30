// Раскрытая книга «Опыты с водой и светом» на кухонном подоконнике, мир «Не приходи» (I-BOOK-NP).
// Книга всегда открывается на «Опыте №7» (на этой странице лежала записка Веры),
// справа — «Опыт №12. Тайнопись лимонным соком».
// Всё, что пишут на полях, — слой поверх картинки; что видно, решают классы состояния главы:
//   w-pencil — карандашом «Кто ты?»; w-faint — бледный след ответа двойника карандашом («Тихон. А ты?»);
//   w-lemon — тот же вопрос соком поверх карандаша; w-burn — проступил ожогом; w-reply — ответ ожогом.
// Всё про «Кто ты?» — на левом поле, одним столбиком; правое поле чистое (там край страницы).
import * as A from '../engine/art.js';

const B = A.plate('assets/backgrounds/I-BOOK-NP-2.jpg', 1376, 768);
// Та же книга в мире «Приходи» (I-BOOK-P): кадр снят с той же точки, разметка общая
const BP = A.plate('assets/backgrounds/I-BOOK-P.jpg', 1376, 768);

// Разметка страниц в пикселях картинки (подогнана под кадр)
export const LAYOUT = {
  left: [180, 140, 720, 675], // левая страница
  right: [725, 140, 1300, 640], // правая страница
  marginL: [195, 200, 300, 630], // внешнее поле левой страницы
  headL: [472, 183], // заголовок левой страницы (центр, поверх печатного колонтитула)
  headR: [878, 180],
  engraving: [846, 296, 1014, 397],
};

// Надпись вдоль поля (снизу вверх), как пишут на узких полях
function marginText([x0, y0, x1, y1], text, cls, { size = 30, font = 'Caveat, cursive', fill = '#444', at = 0.5, extra = '' } = {}) {
  const [a, b] = [B.I(x0, y0), B.I(x1, y1)];
  const cx = (a[0] + b[0]) / 2;
  const cy = a[1] + (b[1] - a[1]) * at;
  return `<text class="${cls}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${size}" fill="${fill}" ${extra}>${text}</text>`;
}

// Колонтитул страницы: бумажная подложка закрывает размытый печатный, сверху — наш текст
function header([x, y], text, paper = '#dccca8') {
  const [cx, cy] = B.I(x, y);
  const w = text.length * 11 + 24;
  return `<g transform="rotate(-1.5 ${cx.toFixed(1)} ${cy.toFixed(1)})">
    <rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - 11).toFixed(1)}" width="${w}" height="20" rx="10" fill="${paper}" opacity="0.8" filter="url(#bk-soft)"/>
    <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="'PT Serif', Georgia, serif" font-size="14" font-weight="700" letter-spacing="1.5" fill="#3a2a1a" opacity="0.8" style="mix-blend-mode:multiply">${text}</text></g>`;
}

// Надпись ожогом. Не шрифт, а рука: неровная плотность, подпалённый ореол, строка чуть гуляет.
//   brush — Тихон НП: кисть и лимонный сок, прогрето утюгом — сплошные мазки;
//   solder — двойник: паяльником через фольгу «по буковке» — буквы из точек-прожогов.
// at — центр надписи в пикселях картинки, rot — поворот (вдоль поля ≈ −84°), faint — ожог дошёл ослабленным.
function burnText(text, [x, y], { rot = -84, size = 58, tool = 'brush', faint = 1, cls = '' } = {}) {
  const [cx, cy] = B.I(x, y);
  const t = `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot}) skewX(-7)`;
  const font = `font-family="Caveat, cursive" font-size="${size}" text-anchor="middle" dominant-baseline="middle"`;
  // несколько строк через «|»; вторая строка чуть сдвинута — рука не пишет по линейке
  const rows = text.split('|');
  const lh = size * 0.95;
  text = rows.map((r, i) => `<tspan x="${i % 2 ? size * 0.3 : 0}" y="${((i - (rows.length - 1) / 2) * lh).toFixed(1)}">${r}</tspan>`).join('');
  let g = `<g class="${cls}" transform="${t}" style="mix-blend-mode:multiply">`;
  // подпалина вокруг букв
  g += `<text ${font} fill="#b86a28" stroke="#b86a28" stroke-width="5" opacity="${(0.5 * faint).toFixed(2)}" filter="url(#bk-halo)">${text}</text>`;
  if (tool === 'solder') {
    g += `<text ${font} fill="none" stroke="#4a220a" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 5.5" opacity="${(0.9 * faint).toFixed(2)}" filter="url(#bk-rough)">${text}</text>`;
    g += `<text ${font} fill="#7a3f14" opacity="${(0.25 * faint).toFixed(2)}" filter="url(#bk-rough)">${text}</text>`;
  } else {
    g += `<text ${font} fill="url(#bk-ink)" stroke="#4a2008" stroke-width="0.8" opacity="${(0.92 * faint).toFixed(2)}" filter="url(#bk-rough)">${text}</text>`;
  }
  return g + '</g>';
}

// «Кто ты?» ожогом — ровно поверх карандашной надписи, тем же размером
const Q_BURN = { rot: -90, size: 42 };
const Q_BURN_P = { ...Q_BURN, faint: 0.6 };

// p = true — книга мира «Приходи»: там видно только то, что дошло ожогом
function build(p = false) {
  const burnDefs = `<defs>
    <!-- ожог: края букв рваные, плотность пятнами — где сока было больше, там темнее -->
    <filter id="bk-rough" x="-20%" y="-40%" width="140%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="fine"/>
      <feDisplacementMap in="SourceGraphic" in2="fine" scale="2.2" result="edge"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="blot"/>
      <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -0.45" result="mask"/>
      <feComposite in="edge" in2="mask" operator="in" result="uneven"/>
      <feGaussianBlur in="uneven" stdDeviation="0.45"/>
    </filter>
    <filter id="bk-halo" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4.5"/></filter>
    <linearGradient id="bk-ink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b2a0c"/><stop offset="0.5" stop-color="#7a3a12"/><stop offset="1" stop-color="#4a2008"/></linearGradient>
    <filter id="bk-soft" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>`;
  let s = burnDefs + (p ? BP : B).image('class="bg"');
  const paper = p ? '#e9c8c6' : '#dccca8';
  s += header(LAYOUT.headL, 'ОПЫТ № 7', paper);
  s += header(LAYOUT.headR, 'ОПЫТ № 12', paper);
  const L = LAYOUT.marginL;
  const mid = (M, at) => [(M[0] + M[2]) / 2, M[1] + (M[3] - M[1]) * at];
  // ожог дошёл до мира «Приходи» ослабленным (закон 4)
  // Одна раскладка для обеих книг — каждая надпись на своём месте в обеих:
  //   левое поле — «Кто ты?» и ответ «Тихон. А ты?»;
  //   низ левой страницы — «Фото. 6:40. Вместе.», подсказка про хлебницу, записка/ультрафиолет;
  //   справа от гравюры — «Завтра. 6:40. Домой.»; низ правой страницы — письма глав 8–9 и эпилога.
  // Что написано в ЭТОЙ книге — видно в полную силу; что пришло ожогом из другой — бледнее (закон 4).
  const W = (text, at, o, cls) => burnText(text, at, { tool: 'solder', ...o, cls });
  if (p) {
    // пришло из «Не приходи»: вопрос Тихона
    s += burnText('Кто ты?', mid(L, 0.3), Q_BURN_P);
    // написано здесь двойником: ответ (глава 3) и «Фото. 6:40. Вместе.» (перед главой 4) — отдельные классы,
    // чтобы в финале главы 3 («полчаса назад») ответа ещё не было
    s += W('Тихон. А ты?', mid(L, 0.72), { rot: -90, size: 40, faint: 1 }, 'wp-reply');
    s += W('Фото. 6:40. Вместе.', [455, 562], { rot: -3, size: 40, faint: 1 }, 'wp-m2');
    // пришло из «Не приходи» (двойник пишет уже оттуда): обрывки подсказок глав 5 и 7
    s += W('…наушн…   …хлеб…', [458, 592], { rot: -3, size: 34, faint: 0.55 }, 'w-hint');
    // глава 5: вопрос Тихона НП — выжжен здесь паяльником двойника, криво, непривычной рукой
    s += W('Где её наушники?', [455, 531], { rot: -2, size: 27, faint: 1 }, 'w-ask');
    s += W('…записк…  …в столе…  …ультраф…', [470, 620], { rot: -2, size: 30, faint: 0.55 }, 'w-p7');
    // глава 8: письмо Тихона двойнику — написано здесь; ответ пришёл оттуда
    s += W('Она писала «Не». Скажи ей сам.', [985, 590], { rot: -2, size: 30, faint: 0.9 }, 'w-8a');
    s += W('Завтра.|6:40.|Домой.', [1092, 352], { rot: -4, size: 32, faint: 0.6 }, 'w-8b');
    // эпилог «Обмен»: ответ двойника пришёл оттуда
    s += W('Ты сказал ей. За меня. Оставайся.', [985, 556], { rot: -2, size: 30, faint: 0.6 }, 'w-x8');
    return s;
  }
  // Левое поле — переписка столбиком: вопрос карандашом, поверх него тот же вопрос соком → ожог,
  // ниже — ответ из другого мира (сначала бледный след, потом точками паяльника)
  s += marginText(L, 'Кто ты?', 'w-pencil', { size: 34, fill: '#4a4a4a', at: 0.3, extra: 'opacity="0.75"' });
  s += marginText(L, '…ихо… …ты?', 'w-faint', { size: 30, fill: '#5a5048', at: 0.72, extra: 'opacity="0.16"' });
  // лимонный сок — едва заметный влажный блеск поверх карандашных букв
  s += marginText(L, 'Кто ты?', 'w-lemon', { size: 38, fill: '#fffbe0', at: 0.3, extra: 'opacity="0.14"' });
  s += burnText('Кто ты?', mid(L, 0.3), { ...Q_BURN, cls: 'w-burn' });
  // пришло из «Приходи»: ответ и «Фото. 6:40. Вместе.»
  s += W('Тихон. А ты?', mid(L, 0.72), { rot: -90, size: 40, faint: 0.8 }, 'w-reply');
  s += W('Фото. 6:40. Вместе.', [455, 562], { rot: -3, size: 40, faint: 0.9 }, 'w-m2');
  // написано здесь двойником, пока он жил в «Не приходи» (главы 5 и 7) — целиком
  s += W('Наушники — в хлебнице.', [458, 592], { rot: -3, size: 34, faint: 1 }, 'w-hint');
  s += W('…де …ё …ушник…?', [455, 531], { rot: -2, size: 27, faint: 0.55 }, 'w-ask');
  s += W('Записка — в столе. Ультрафиолет.', [470, 620], { rot: -2, size: 30, faint: 1 }, 'w-p7');
  // глава 8: письмо Тихона пришло оттуда, ответ двойника написан здесь
  s += W('Она писала «Не». Скажи ей сам.', [985, 590], { rot: -2, size: 30, faint: 0.6 }, 'w-8a');
  s += W('Завтра.|6:40.|Домой.', [1092, 352], { rot: -4, size: 32, faint: 1 }, 'w-8b');
  // глава 9: последнее письмо двойника пришло оттуда
  s += W('Спасибо. Завтра 6:40 — на фото. «Не». Вместе.', [985, 556], { rot: -2, size: 28, faint: 0.8 }, 'w-9');
  return s;
}

const [lx0, ly0, lx1, ly1] = LAYOUT.left;
const [rx0, ry0, rx1, ry1] = LAYOUT.right;

export const bookNP = {
  id: 'book-np',
  world: 'np',
  title: 'Книга',
  bg: B.src,
  shots: {
    wide: [0, 0, 1600, 900],
    left: B.shot((lx0 + lx1) / 2 - 60, (ly0 + ly1) / 2, 760),
    right: B.shot(Math.min((rx0 + rx1) / 2 + 60, 1376 - 380), (ry0 + ry1) / 2, 760),
  },
  ambience: ['fridge', 'clock', 'drizzle'],
  build: () => build(false),
  hotspots: [
    { id: 'pageL', label: 'Опыт №7', shot: '', shape: B.rect(...LAYOUT.left), lines: [] },
    { id: 'pageR', label: 'Опыт №12', shot: '', shape: B.rect(...LAYOUT.right), lines: [] },
    { id: 'engraving', label: 'Гравюра', shot: '', shape: B.rect(...LAYOUT.engraving), lines: ['Старая гравюра: половинка лимона и свеча. Вера в детстве обводила её карандашом.'] },
    { id: 'marginL', label: 'Поле', shot: '', shape: B.rect(...LAYOUT.marginL), lines: [] },
  ],
  events: {},
};

export const bookP = {
  ...bookNP,
  id: 'book-p',
  world: 'p',
  bg: BP.src,
  ambience: ['rain'],
  build: () => build(true),
  // та же разметка страниц, что и в мире «Не приходи» — кадр снят с той же точки
  hotspots: bookNP.hotspots,
};
