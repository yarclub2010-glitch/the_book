// Автопрогон сюжета: проходит все главы, обе ветки и все концовки так, как их прошёл бы игрок,
// и проверяет ключевые точки (сцены, флажки, развилки, экран конца главы).
// Запуск: открыть игру с ?autoplay. Результат — в консоли и в табличке поверх игры,
// итог — в window.autoplayReport. Ничего не сохраняет в настоящую игру: сохранения и память
// истории на время прогона подменяются и потом восстанавливаются.

const W = (ms) => new Promise((r) => setTimeout(r, ms));
const finish = () => document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* уже закончилась */ } });

export async function run(game) {
  const report = [];
  const saved = { ...localStorage };
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:46vw;max-height:90vh;overflow:auto;background:rgba(0,0,0,.85);color:#bfe;font:12px/1.4 monospace;padding:8px;border-radius:6px';
  document.body.appendChild(box);
  const log = (ok, text) => {
    report.push({ ok, text });
    box.textContent = report.map((r) => `${r.ok ? '✔' : '✘'} ${r.text}`).join('\n');
    console[ok ? 'log' : 'error'](`[autoplay] ${ok ? 'OK' : 'FAIL'} ${text}`);
  };
  const check = (cond, text) => log(!!cond, text);

  // ---------- помощники: действовать как игрок ----------
  const play = async (pick = () => 0, limit = 200) => {
    for (let i = 0; i < limit && game.mode !== 'explore' && game.mode !== 'end'; i++) {
      finish();
      const c = document.querySelector('#choice.on');
      if (c) {
        const bs = [...c.querySelectorAll('button')];
        const texts = bs.map((b) => b.textContent);
        const idx = Math.max(0, Math.min(pick(texts), bs.length - 1));
        bs[idx].click();
      } else game.next();
      await W(60);
    }
  };
  // дождаться, пока правило главы запустит сценку (после загадки она стартует с задержкой), и доиграть её
  const settle = async (pick) => {
    for (let i = 0; i < 60 && game.mode === 'explore'; i++) await W(100);
    // финальные сценки длинные: переходы между мирами, карточки — даём им время
    for (let i = 0; i < 6 && game.mode !== 'end' && game.mode !== 'explore'; i++) await play(pick, 300);
  };
  const scene = async (id) => {
    for (let i = 0; i < 120 && (!game.stage.scene || game.stage.scene.id !== id); i++) await W(100);
    await W(150);
    return game.stage.scene && game.stage.scene.id === id;
  };
  const go = async (loc, sceneId) => {
    game.go(loc);
    const ok = await scene(sceneId);
    check(ok, `переход «${loc}» → ${sceneId}`);
  };
  const click = async (id, pick) => {
    const el = document.querySelector(`.layer:last-child .hs[data-id="${id}"]`);
    if (!el) { log(false, `нет зоны «${id}» в ${game.stage.scene && game.stage.scene.id}`); return; }
    game.onHotspot(el, { clientX: 0, clientY: 0 });
    await W(120);
    await play(pick);
  };
  const fire = async (id) => {
    const t = game.chapter.timers.find((x) => x.id === id);
    if (!t) { log(false, `нет таймера ${id}`); return; }
    game.fire(t);
    await W(120);
    await play();
  };
  const minutesTo = async (m) => {
    const t = game.chapter.timers.find((x) => x.id === 'minute');
    while (game.state.flags.min < m) { game.fire(t); await W(40); }
    await W(120);
  };
  const start = async (id, legacy) => {
    if (legacy) localStorage.setItem('thebook:legacy', JSON.stringify(legacy));
    game.startChapter(id);
    await W(300);
    for (let i = 0; i < 6 && game.mode !== 'explore' && game.mode !== 'end'; i++) await play(() => 0, 300);
    check(game.mode === 'explore' || game.mode === 'end', `${id}: вступление пройдено`);
  };
  // длинные финалы при медленной машине: доиграть сценку до экрана конца, а не проверять на полпути
  const playToEnd = async () => {
    for (let i = 0; i < 400 && game.mode !== 'end'; i++) await play(() => 0, 20);
  };
  const ended = (id, title) => {
    const t = document.querySelector('#end-title-text').textContent;
    check(game.mode === 'end' && (!title || t.includes(title)), `${id}: экран конца «${t}»`);
  };
  const flag = (name) => game.state.flags[name];

  // ---------- сценарии глав ----------
  const chapters = {
    async ch1() {
      await start('ch1');
      await go('kitchen', 'kitchen-np-night');
      await go('room', 'room-np-night');
      await fire('clicks');
      check(flag('lettersMoved'), 'ch1: щелчки на кухне сдвинули буквы');
      await go('kitchen', 'kitchen-np-night');
      await click('fridge');
      check(game.puzzle, 'ch1: загадка с буквами открылась');
      for (const ch of ['Х', 'О', 'Д', 'И']) await click(`L${ch}`);
      await settle();
      ended('ch1');
    },
    async ch2(stay = true) {
      await start('ch2', {});
      // во вступлении выбор: бежать / остаться
      await go('vera', 'vera-np');
      await click('desk');
      await scene('vera-desk');
      await click('bookmarks');
      await click('book');
      check(flag('carryBook'), 'ch2: книга в руках');
      await go('kitchen', 'kitchen-np-evening');
      await click('miri');
      await scene('phone');
      await go('kitchen', 'kitchen-np-evening');
      await click('sill');
      await scene('sill-np');
      await click('spot');
      check(flag('bookOnSill'), 'ch2: книга на подоконнике');
      await go('room', 'room-np-evening');
      await fire('dinner');
      check(flag('captured') && flag('bookShifted'), 'ch2: Мири записала, книга сдвинулась');
      await go('kitchen', 'kitchen-np-evening');
      await click('miri');
      await scene('phone-new');
      // загадка включается, когда переход на экран телефона закончился
      for (let i = 0; i < 40 && !game.puzzle; i++) await W(100);
      check(game.puzzle, 'ch2: загадка с обрывками открылась');
      for (const f of ['f17', 'f27', 'f14', 'f20']) await click(f);
      await settle();
      ended('ch2');
      check(JSON.parse(localStorage.getItem('thebook:legacy') || '{}').stayedCold !== undefined, 'ch2: решение про холод записано в память');
      void stay;
    },
    async ch3() {
      await start('ch3', {});
      await click('sill');
      await scene('book-np');
      await click('marginL');
      await go('hall', 'hall-np-night');
      await fire('shadow');
      await go('kitchen', 'kitchen-np-night');
      await click('sill');
      await scene('book-np');
      await click('marginL');
      await click('pageR');
      game.state.flags.readExp12 = true;
      await go('kitchen', 'kitchen-np-night');
      await click('fridge');
      game.zoomOut();
      await go('hall', 'hall-np-night');
      await click('hats');
      game.zoomOut();
      await go('vera', 'vera-np');
      await click('desk');
      check(flag('hasLemon') && flag('hasIron') && flag('hasBrush'), 'ch3: лимон, утюг, кисточка собраны');
      await go('kitchen', 'kitchen-np-night');
      await click('sill');
      await scene('book-np');
      await click('marginL');
      await click('marginL');
      check(flag('burned'), 'ch3: «Кто ты?» проступило ожогом');
      await go('vera', 'vera-np');
      await click('desk');
      check(flag('returnedBrush'), 'ch3: кисточка возвращена');
      await go('hall', 'hall-np-night');
      await fire('reply');
      await go('kitchen', 'kitchen-np-night');
      await click('sill');
      await scene('book-np');
      await settle();
      ended('ch3');
    },
    async ch4() {
      await start('ch4', {});
      await go('room', 'room-np-evening');
      await click('bed');
      await scene('room-np-morning');
      await go('kitchen', 'kitchen-np-morning');
      // ловушка: поверил спешащим часам — взял фото в 6:37 (на кухонных 6:40) — рука затекла к гудкам
      await click('photo');
      await minutesTo(40);
      await play();
      check(game.state.flags.fails === 1 && game.state.flags.min === 37, 'ch4: рано взял фото — промах, утро заново');
      await go('kitchen', 'kitchen-np-morning');
      await minutesTo(38);
      await click('photo');
      await minutesTo(40);
      await play((t) => t.findIndex((x) => x.includes('Держать')));
      ended('ch4');
    },
    async ch5() {
      await start('ch5', {});
      await go('room', 'room-p');
      await fire('hint');
      await go('kitchen', 'kitchen-p-evening');
      await click('book');
      await scene('book-p');
      await click('marginL');
      await go('kitchen', 'kitchen-p-evening');
      await click('sink');
      await scene('bread-p');
      await click('breadbox');
      check(flag('hasHeadphones'), 'ch5: наушники найдены');
      await go('hall', 'hall-p');
      await click('vera');
      ended('ch5');
    },
    async ch6() {
      await start('ch6', {});
      await click('miri', (t) => t.findIndex((x) => x.includes('включи музыку')));
      check((flag('tries') || 0) >= 1, 'ch6: неверная команда засчитана');
      await click('miri', (t) => {
        const i = t.findIndex((x) => x.includes('последний трек'));
        if (i >= 0) return i;
        return t.findIndex((x) => x.includes('Отправлю'));
      });
      ended('ch6');
    },
    async ch7(choice) {
      await start('ch7', {});
      await go('hall', 'hall-p');
      await fire('msg');
      await go('kitchen', 'kitchen-p-evening');
      await click('book');
      await scene('book-p');
      await click('marginL');
      await go('vera', 'vera-p');
      await click('naillamp');
      check(flag('hasLamp'), 'ch7: лампа взята');
      await go('room', 'room-p');
      await click('drawer');
      await scene('note-p');
      await click('note', (t) => t.findIndex((x) => x.includes(choice === 'show' ? 'Показать' : 'Спрятать')));
      check(game.state.flags.uv, 'ch7: «Не» проступило в ультрафиолете');
      ended('ch7');
      check(game.nextId === (choice === 'show' ? 'ch8x' : 'ch8'), `ch7: развилка ведёт в ${game.nextId}`);
    },
    async ch8x() {
      await start('ch8x', { choice: 'show' });
      await play();
      ended('ch8x', 'Обмен');
    },
    async ch8() {
      await start('ch8', { choice: 'hide' });
      await click('solder');
      await go('kitchen', 'kitchen-p-evening');
      await click('book');
      await scene('book-p');
      await click('pageR');
      check(flag('sent'), 'ch8: письмо двойнику прожжено');
      await go('hall', 'hall-p');
      await fire('reply');
      await go('room', 'room-p');
      await click('bed');
      check(game.state.time === 'morning', 'ch8: наступило утро');
      await go('kitchen', 'kitchen-p-evening');
      await minutesTo(38);
      await click('photo');
      await minutesTo(40);
      await play((t) => t.findIndex((x) => x.includes('Держать')));
      await playToEnd();
      ended('ch8');
    },
    async ch9(legacy, pick, title) {
      await start('ch9', legacy);
      await go('room', 'room-np-evening');
      await click('mags');
      await click('bed');
      await go('kitchen', 'kitchen-np-morning');
      await minutesTo(38);
      await click('photo');
      await minutesTo(40);
      await play((t) => t.findIndex((x) => x.includes(pick)));
      check(game.state.flags.ne, 'ch9: «Не» на фото-якоре');
      await playToEnd();
      ended('ch9', title);
    },
  };

  const t0 = performance.now();

  // Картинки: в каждом состоянии каждой главы у каждого места виден фон, и все картинки загружаются
  // (ловит, например, класс, который по ошибке прячет фон, или удалённый файл)
  {
    const { scenes } = await import('../src/scenes/index.js');
    const mods = [];
    for (const n of ['1', '2', '3', '4', '5', '6', '7', '8', '8x', '9']) mods.push((await import(`../story/chapters/chapter${n}.js`)).default);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1600px;height:900px;z-index:-1;pointer-events:none';
    document.getElementById('game').appendChild(host);
    const seen = new Set();
    const hrefs = new Set();
    let bad = 0;
    for (const ch of mods) {
      for (const time of ['night', 'evening', 'morning']) {
        const st = { flags: {}, time, legacy: {}, location: '' };
        const cls = ch.sceneClasses ? ch.sceneClasses(st) : [];
        for (const [loc, L] of Object.entries(ch.locations || {})) {
          const id = L.scene(st);
          if (!scenes[id]) { bad++; log(false, `картинки: ${ch.id}/${loc} ведёт на несуществующую сцену ${id}`); continue; }
          const key = `${id}|${cls.join(',')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          host.innerHTML = `<svg class="${['scene', ...cls].join(' ')}" viewBox="0 0 1600 900" width="1600" height="900">${game.stage.markup(id)}</svg>`;
          const imgs = [...host.querySelectorAll('.art image')].filter((i) => {
            for (let el = i; el && el !== host; el = el.parentElement) {
              const c = getComputedStyle(el);
              if (c.display === 'none' || c.opacity === '0' || c.visibility === 'hidden') return false;
            }
            return true;
          });
          imgs.forEach((i) => hrefs.add(i.getAttribute('href')));
          if (!imgs.some((i) => +i.getAttribute('width') > 1200 && +i.getAttribute('height') > 600)) { bad++; log(false, `картинки: ${ch.id}/${loc} (${time}) — сцена ${id} без фона`); }
        }
      }
    }
    host.remove();
    for (const h of hrefs) {
      const r = await fetch(h, { method: 'HEAD' });
      if (!r.ok) { bad++; log(false, `картинки: нет файла ${h}`); }
    }
    check(bad === 0, `картинки: ${seen.size} состояний сцен, ${hrefs.size} файлов — фон виден, всё загружается`);
  }
  const steps = [
    ['ch1', () => chapters.ch1()],
    ['ch2', () => chapters.ch2()],
    ['ch3', () => chapters.ch3()],
    ['ch4', () => chapters.ch4()],
    ['ch5', () => chapters.ch5()],
    ['ch6', () => chapters.ch6()],
    ['ch7 (показать)', () => chapters.ch7('show')],
    ['ch8x (Обмен)', () => chapters.ch8x()],
    ['ch7 (спрятать)', () => chapters.ch7('hide')],
    ['ch8', () => chapters.ch8()],
    ['ch9 → Разделение', () => chapters.ch9({ stayedCold: true, choice: 'hide' }, 'Отпустить', 'Разделение')],
    ['ch9 → Мост', () => chapters.ch9({ stayedCold: true, sentTrack: true, choice: 'hide' }, 'Отпустить', 'Мост')],
    ['ch9 → Слияние', () => chapters.ch9({ stayedCold: true, returnedBrush: true, sentTrack: true, choice: 'hide' }, 'Держать', 'Слияние')],
  ];
  for (const [name, fn] of steps) {
    log(true, `— ${name} —`);
    try {
      await fn();
    } catch (e) {
      log(false, `${name}: ошибка ${e.message}`);
    }
  }
  // вернуть сохранения игрока как были
  localStorage.clear();
  Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
  const fails = report.filter((r) => !r.ok).length;
  log(fails === 0, `ИТОГ: ${report.length - fails} проверок прошло, ${fails} с ошибкой, ${Math.round((performance.now() - t0) / 1000)} с`);
  window.autoplayReport = report;
  return report;
}
