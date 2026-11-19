// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, busted and wasted. ?shot=name&seed=N stages one
// screenshot scene instead of running the loop.

import { createWorld, respawn, step } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { centerCamera, stageShot } from './shots.js';
import { clearSave, hasSave, loadGame, saveGame } from './save.js';
import { WORLD_SIZE } from './config.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

// Any uncaught error is reported where a headless check can read it.
window.addEventListener('error', (e) => {
  status.textContent = `error: ${e.message}`;
  document.title = `error: ${e.message}`;
});

const renderer = createRenderer(canvas);

function fitCanvas() {
  renderer.resize(window.innerWidth, window.innerHeight);
}

if (shot) {
  fitCanvas();
  const view = { w: window.innerWidth, h: window.innerHeight };
  stageShot(shot, seed, renderer, view);
} else {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = 'title';
  let world = createWorld(Math.floor(Math.random() * 4294967296));
  let last = performance.now();
  let acc = 0;
  let titleTime = 0;

  fitCanvas();
  window.addEventListener('resize', () => {
    fitCanvas();
    world.view = { w: window.innerWidth, h: window.innerHeight };
  });
  world.view = { w: window.innerWidth, h: window.innerHeight };

  function newGame(saveData) {
    world = createWorld(Math.floor(Math.random() * 4294967296), saveData || null);
    world.view = { w: window.innerWidth, h: window.innerHeight };
    centerCamera(world);
    screen = 'play';
    audio.unlock();
    audio.musicStart();
    status.textContent = 'Playing Solmar: Streets of the Sun';
  }

  function playEvents(events) {
    for (const e of events) {
      if (e === 'shot') audio.shot();
      else if (e === 'punch') audio.punch();
      else if (e === 'crash' || e === 'explosion') audio.crash();
      else if (e === 'pickup') audio.pickup();
      else if (e === 'missionDone') audio.missionDone();
      else if (e === 'phone') audio.phone();
      else if (e === 'busted') audio.busted();
      else if (e.startsWith('paid:')) {
        const amount = e.slice(5);
        status.textContent = `Mission complete — +$${amount}`;
      }
    }
    const sirensOn = world.police.length > 0;
    audio.setSiren(sirensOn);
    const driving = world.player.inCar && world.player.car;
    audio.setEngine(!!driving, driving ? Math.abs(world.player.car.speed) / 470 : 0);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;

    // Title screen: slow pan over the city behind the menu.
    if (screen === 'title') {
      titleTime += dt;
      world.view = { w: window.innerWidth, h: window.innerHeight };
      const span = WORLD_SIZE - world.view.w;
      world.camera.x = (Math.sin(titleTime * 0.07) * 0.5 + 0.5) * span;
      const spanY = WORLD_SIZE - world.view.h;
      world.camera.y = (Math.sin(titleTime * 0.05 + 2) * 0.5 + 0.5) * spanY;
      renderer.render(world, screen, { saveExists: hasSave() }, input);
      if (input.pressed('Enter')) {
        audio.click();
        newGame(null);
      } else if (input.pressed('KeyC') && hasSave()) {
        audio.click();
        newGame(loadGame());
      }
      if (input.pressed('KeyM')) audio.setMuted(!audio.isMuted());
      return;
    }

    if (screen === 'pause') {
      renderer.render(world, screen, {}, input);
      if (input.pressed('Enter') || input.pressed('Escape')) {
        audio.click();
        screen = 'play';
      } else if (input.pressed('KeyR')) {
        audio.click();
        clearSave();
        newGame(null);
      } else if (input.pressed('KeyQ')) {
        audio.click();
        audio.setEngine(false, 0);
        audio.setSiren(false);
        audio.musicStop();
        screen = 'title';
        titleTime = 0;
      }
      if (input.pressed('KeyM')) audio.setMuted(!audio.isMuted());
      return;
    }

    if (screen === 'busted' || screen === 'wasted') {
      renderer.render(world, screen, {}, input);
      if (input.pressed('Enter')) {
        audio.click();
        const fine = screen === 'busted' ? 150 : 100;
        world.player.money = Math.max(0, world.player.money - fine);
        respawn(world, screen === 'busted' ? 'police' : 'hospital');
        screen = 'play';
      }
      return;
    }

    // Playing.
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      world.view = { w: window.innerWidth, h: window.innerHeight };
      world.mouseWorld.x = world.player.x + (input.mouse.x - world.view.w / 2);
      world.mouseWorld.y = world.player.y + (input.mouse.y - world.view.h / 2);
      const events = step(world, input, STEP);
      playEvents(events);
      acc -= STEP;
      n += 1;
    }
    if (n === 5) acc = 0;
    centerCamera(world);
    renderer.render(world, screen, {}, input);

    if (world.busted) {
      world.player.money = Math.max(0, world.player.money - 150);
      screen = 'busted';
      saveGame(world);
    } else if (world.wasted) {
      world.player.money = Math.max(0, world.player.money - 100);
      screen = 'wasted';
      saveGame(world);
    } else if (input.pressed('Escape') || input.pressed('KeyP')) {
      audio.click();
      saveGame(world);
      screen = 'pause';
    }
    if (input.pressed('KeyM')) audio.setMuted(!audio.isMuted());
    if (world.missions.storyDone && !world.storyToastShown) {
      world.storyToastShown = true;
      status.textContent = 'Story complete — free roam!';
    }
  }

  window.__game = { get world() { return world; }, get screen() { return screen; } };
  requestAnimationFrame(frame);
}
