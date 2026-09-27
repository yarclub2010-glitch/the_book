// Раскрытая книга «Опыты с водой и светом» на кухонном подоконнике, мир «Не приходи» (I-BOOK-NP).
// Книга всегда открывается на «Опыте №7» (на этой странице лежала записка Веры),
// справа — «Опыт №12. Тайнопись лимонным соком».
// Всё, что пишут на полях, — слой поверх картинки; что видно, решают классы состояния главы:
//   w-pencil — карандашом «Кто ты?»; w-faint — бледный след ответа;
//   w-lemon — невидимые буквы лимонным соком; w-burn — проступили ожогом; w-reply — ответ ожогом.
import * as A from '../engine/art.js';

const B = A.plate('assets/backgrounds/I-BOOK-NP-2.jpg', 1376, 768);
// Та же книга в мире «Приходи» (I-BOOK-P): кадр снят с той же точки, разметка общая
const BP = A.plate('assets/backgrounds/I-BOOK-P.jpg', 1376, 768);

// Разметка страниц в пикселях картинки (подогнана под кадр)
export const LAYOUT = {
  left: [180, 140, 720, 675], // левая страница
  right: [725, 140, 1300, 640], // правая страница
  marginL: [195, 200, 300, 630], // внешнее поле левой страницы
  marginR: [1140, 190, 1230, 590], // внешнее поле правой страницы
  headL: [470, 184], // заголовок левой страницы (центр, поверх колонтитула)
  headR: [900, 184],
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
  return `<rect x="${(cx - 215).toFixed(1)}" y="${(cy - 16).toFixed(1)}" width="430" height="26" rx="8" fill="${paper}" opacity="0.75" filter="url(#bk-soft)"/>
    <text x="${cx.toFixed(1)}" y="${(cy - 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="'PT Serif', Georgia, serif" font-size="13" font-weight="700" letter-spacing="0.5" fill="#3a2a1a" opacity="0.85" style="mix-blend-mode:multiply">${text}</text>`;
}

// Надпись ожогом. Не шрифт, а рука: неровная плотность, подпалённый ореол, строка чуть гуляет.
//   brush — Тихон НП: кисть и лимонный сок, прогрето утюгом — сплошные мазки;
//   solder — двойник: паяльником через фольгу «по буковке» — буквы из точек-прожогов.
// at — центр надписи в пикселях картинки, rot — поворот (вдоль поля ≈ −84°), faint — ожог дошёл ослабленным.
function burnText(text, [x, y], { rot = -84, size = 58, tool = 'brush', faint = 1, cls = '' } = {}) {
  const [cx, cy] = B.I(x, y);
  const t = `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot}) skewX(-7)`;
  const font = `font-family="Caveat, cursive" font-size="${size}" text-anchor="middle" dominant-baseline="middle"`;
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
    <filter id="bk-soft" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>`;
  let s = burnDefs + (p ? BP : B).image('class="bg"');
  const paper = p ? '#e9c8c6' : '#dccca8';
  s += header(LAYOUT.headL, 'ОПЫТ № 7. КАК ВОДА СТИРАЕТ ЧЕРНИЛА', paper);
  s += header(LAYOUT.headR, 'ОПЫТ № 12. ТАЙНОПИСЬ ЛИМОННЫМ СОКОМ', paper);
  const L = LAYOUT.marginL;
  const R = LAYOUT.marginR;
  const mid = (M, at) => [(M[0] + M[2]) / 2, M[1] + (M[3] - M[1]) * at];
  // ожог дошёл до мира «Приходи» ослабленным (закон 4)
  if (p) {
    s += burnText('Кто ты?', mid(R, 0.45), { faint: 0.6 });
    // глава 5: двойник (уже в мире «Не приходи») прожёг подсказку — сюда дошли обрывки (закон 4)
    s += burnText('…наушн…   …хлеб…', [450, 612], { rot: -3, tool: 'solder', size: 50, faint: 0.55, cls: 'w-hint' });
    // глава 7: двойник узнал у здешней Веры про ультрафиолет — дошли обрывки
    s += burnText('…записк… …в столе…', [470, 200], { rot: -2, tool: 'solder', size: 46, faint: 0.55, cls: 'w-p7' });
    s += burnText('…ультраф…', mid(L, 0.5), { tool: 'solder', size: 46, faint: 0.5, cls: 'w-p7' });
    // эпилог «Обмен»: двойник отказывается возвращаться
    s += burnText('Ты сказал ей. За меня. Оставайся.', [960, 600], { rot: -3, tool: 'solder', size: 44, faint: 0.6, cls: 'w-x8' });
    // глава 8: письмо Тихона двойнику (паяльником, по-его) и ответ
    s += burnText('Она писала «Не». Скажи ей сам.', [960, 600], { rot: -3, tool: 'solder', size: 44, faint: 0.9, cls: 'w-8a' });
    s += burnText('Завтра. 6:40. Домой.', [960, 200], { rot: -2, tool: 'solder', size: 44, faint: 0.6, cls: 'w-8b' });
    return s;
  }
  // карандаш и бледный след ответа — на левом поле
  s += marginText(L, 'Кто ты?', 'w-pencil', { size: 34, fill: '#4a4a4a', at: 0.3, extra: 'opacity="0.75"' });
  s += marginText(L, '…ы …о… …ихо…', 'w-faint', { size: 30, fill: '#5a5048', at: 0.72, extra: 'opacity="0.16"' });
  // лимонный сок — едва заметный влажный блеск на правом поле
  s += marginText(R, 'Кто ты?', 'w-lemon', { size: 44, fill: '#fffbe0', at: 0.45, extra: 'opacity="0.12"' });
  // ожог кистью и утюгом
  s += burnText('Кто ты?', mid(R, 0.45), { cls: 'w-burn' });
  // ответ из другого мира — паяльником, на левом поле ниже карандаша
  s += burnText('Тихон. А ты?', mid(L, 0.7), { tool: 'solder', size: 48, faint: 0.8, cls: 'w-reply' });
  // глава 9: последнее письмо двойника — на правой странице, под гравюрой
  s += burnText('Спасибо. Завтра 6:40 — на фото. «Не». Вместе.', [980, 560], { rot: -3, tool: 'solder', size: 40, faint: 0.8, cls: 'w-9' });
  // глава 4: новое послание двойника — внизу левой страницы, под текстом, чуть наискось
  s += burnText('Фото. 6:40. Вместе.', [450, 612], { rot: -3, tool: 'solder', size: 52, faint: 1, cls: 'w-m2' });
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
  ambience: ['fridge', 'clock'],
  build: () => build(false),
  hotspots: [
    { id: 'pageL', label: 'Опыт №7', shot: '', shape: B.rect(...LAYOUT.left), lines: [] },
    { id: 'pageR', label: 'Опыт №12', shot: '', shape: B.rect(...LAYOUT.right), lines: [] },
    { id: 'engraving', label: 'Гравюра', shot: '', shape: B.rect(...LAYOUT.engraving), lines: ['Старая гравюра: половинка лимона и свеча. Вера в детстве обводила её карандашом.'] },
    { id: 'marginL', label: 'Поле', shot: '', shape: B.rect(...LAYOUT.marginL), lines: [] },
    { id: 'marginR', label: 'Поле', shot: '', shape: B.rect(...LAYOUT.marginR), lines: [] },
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
