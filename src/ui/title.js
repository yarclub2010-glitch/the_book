// Главная страница: стена между двумя кухнями живая.
//  — шов между мирами плавно идёт за курсором (переменная --seam на #title, проценты ширины);
//  — по фону можно постучать: стук, круг от точки удара, а через паузу с той стороны шва
//    отвечают тем же ритмом — глуше. Кто там — страница не говорит.
import { audio } from '../engine/audio.js';

const REST = 52; // где шов стоит, пока мышь не трогают
const MIN = 36;
const MAX = 90;
const TAGLINES = ['Постучи в стену.', 'Тебе ответили.', 'Кто-то повторяет за тобой.', 'Там тоже не спят.'];

export function initTitle(title) {
  const game = title.closest('.game');
  const tagline = title.querySelector('#tagline');
  const layer = title.querySelector('#knocks');
  const letters = [...title.querySelectorAll('.mag-l')];
  let seam = REST;
  let target = REST;
  let lastMove = 0;
  let replies = 0;
  let knocks = []; // времена ударов текущей серии
  let replyTimer = null;

  const active = () => game.classList.contains('at-title');

  // ---------- шов идёт за мышью ----------
  title.addEventListener('pointermove', (e) => {
    const r = title.getBoundingClientRect();
    target = Math.min(MAX, Math.max(MIN, ((e.clientX - r.left) / r.width) * 100));
    lastMove = performance.now();
  });
  title.addEventListener('pointerleave', () => { lastMove = 0; });
  const frame = (now) => {
    if (active()) {
      // мышь давно не двигали — шов возвращается и медленно «дышит»
      const goal = now - lastMove > 5000 ? REST + Math.sin(now / 2600) * 2.2 : target;
      seam += (goal - seam) * 0.06;
      title.style.setProperty('--s', seam.toFixed(2));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // ---------- стук ----------
  const ring = (x, y, far) => {
    const el = document.createElement('i');
    el.className = `knock${far ? ' far' : ''}`;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    layer.append(el);
    setTimeout(() => el.remove(), 1600);
  };
  // x шва на высоте y (шов наклонён: сверху правее на 12 %, снизу левее на 12 %)
  const seamAt = (y) => seam + 12 - (y / 100) * 24;

  const answer = () => {
    const series = knocks.slice(-6);
    knocks = [];
    const t0 = series[0].t;
    series.forEach((k) => {
      setTimeout(() => {
        if (!active()) return;
        audio.sfx('knock', { muffled: true });
        // отвечают с той стороны шва — зеркально точке удара
        const sx = seamAt(k.y);
        const x = Math.min(97, Math.max(3, 2 * sx - k.x));
        ring(x, k.y, true);
        title.classList.remove('answered');
        void title.offsetWidth;
        title.classList.add('answered');
        const l = letters[Math.floor(Math.random() * letters.length)];
        l.classList.remove('rattle');
        void l.offsetWidth;
        l.classList.add('rattle');
      }, k.t - t0);
    });
    replies += 1;
    setTimeout(() => {
      if (!tagline) return;
      tagline.classList.add('swap');
      setTimeout(() => {
        tagline.textContent = TAGLINES[Math.min(replies, TAGLINES.length - 1)];
        tagline.classList.remove('swap');
      }, 450);
    }, series[series.length - 1].t - t0 + 500);
  };

  title.addEventListener('pointerdown', (e) => {
    if (!active() || e.button !== 0 || e.target.closest('button, .menu, .chapters, a')) return;
    const r = title.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    audio.unlock();
    audio.sfx('knock');
    ring(x, y, false);
    knocks.push({ t: performance.now(), x, y });
    clearTimeout(replyTimer);
    // ответ — когда серия закончилась: тишина чуть дольше секунды
    replyTimer = setTimeout(answer, 1150);
  });
}
