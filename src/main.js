import { Game } from './engine/engine.js';

// Ждём шрифты, чтобы буквы на холодильнике и титры сразу выглядели как надо
const ready = document.fonts ? document.fonts.ready : Promise.resolve();
ready.then(() => {
  window.game = new Game();
  // Для разработки: ?zones — показать активные зоны контурами
  if (new URLSearchParams(location.search).has('zones')) document.getElementById('game').classList.add('debug-zones');
  // Для разработки: ?autoplay — автопрогон всех глав, веток и концовок с отчётом
  if (new URLSearchParams(location.search).has('autoplay')) import('../tools/autoplay.js').then((m) => m.run(window.game));
});
