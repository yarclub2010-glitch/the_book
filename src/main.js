import { Game } from './engine/engine.js';

// Ждём шрифты, чтобы буквы на холодильнике и титры сразу выглядели как надо
const ready = document.fonts ? document.fonts.ready : Promise.resolve();
ready.then(() => {
  window.game = new Game();
});
