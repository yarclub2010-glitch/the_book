// Записка Веры в ящике стола двойника (мир «Приходи»), глава 7.
// «Тиша, поезд в 6:40. Не приходи провожать…» — в этом мире слово «Не» размыто каплей дождя.
// Днём видно пятно. В ультрафиолете (класс uv-on — кадр I-NOTE-P-UV) железо-галловые чернила
// проступают тёмным — и «Не» читается.
import * as A from '../engine/art.js';

const N = A.plate('assets/backgrounds/I-NOTE-P.jpg', 1376, 768);
const NUV = A.plate('assets/backgrounds/I-NOTE-P-UV.jpg', 1376, 768);

// Разметка листа в пикселях картинки: начало первой строки и пятно (подгоняется под кадр)
export const NOTE = {
  line1: [468, 212], // «Тиша, поезд в 6:40.» — по первой линейке листа
  line2: [488, 272], // «Не приходи провожать.» — «Не» ложится на пятно (центр ≈ 520, 258)
  line3: [500, 332], // «мама проснётся. Я напишу. В.»
  rot: -8, // лист повёрнут: линейки поднимаются вправо
  size: 42,
};

function ink(text, [x, y], extra = '') {
  const [cx, cy] = N.I(x, y);
  return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" transform="rotate(${NOTE.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})" font-family="Caveat, cursive" font-size="${NOTE.size}" ${extra}>${text}</text>`;
}

function build() {
  const [bx, by] = NOTE.line2;
  let s = `<defs>
    <filter id="nt-ink" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter>
    <filter id="nt-smudge" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>`;
  s += N.image('class="bg note-day"') + NUV.image('class="bg note-uv"');
  // чернила: днём — выцветшие фиолетово-коричневые, в ультрафиолете — тёмные
  const day = 'fill="#4a3558" opacity="0.8" filter="url(#nt-ink)" style="mix-blend-mode:multiply"';
  const uv = 'fill="#140a1e" opacity="0.92" filter="url(#nt-ink)"';
  s += `<g class="note-day">${ink('Тиша, поезд в 6:40.', NOTE.line1, day)}${ink('<tspan fill-opacity="0">Не</tspan> приходи провожать —', NOTE.line2, day)}${ink('мама проснётся. Я напишу. В.', NOTE.line3, day)}`;
  // размытое слово: только расплывшееся пятно чернил
  s += ink('Не', [bx, by], 'fill="#6a4a7a" opacity="0.45" filter="url(#nt-smudge)"') + '</g>';
  s += `<g class="note-uv">${ink('Тиша, поезд в 6:40.', NOTE.line1, uv)}${ink('<tspan class="uv-word">Не</tspan> приходи провожать —', NOTE.line2, uv)}${ink('мама проснётся. Я напишу. В.', NOTE.line3, uv)}</g>`;
  return s;
}

export const noteP = {
  id: 'note-p',
  world: 'p',
  title: 'Записка',
  bg: N.src,
  extra: [NUV.src],
  shots: { wide: [0, 0, 1600, 900] },
  ambience: ['rain'],
  build,
  hotspots: [
    { id: 'note', label: 'Записка', shot: '', shape: N.poly([[438, 160], [860, 110], [980, 628], [500, 672]]), lines: [] },
    { id: 'drawer', label: 'Ящик', shot: '', shape: N.rect(0, 690, 1376, 768), lines: ['Резисторы, изолента, отвёртка. И записка — сложенная вчетверо, протёртая на сгибах.'] },
  ],
  events: {},
};
