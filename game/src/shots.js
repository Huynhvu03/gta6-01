// Screenshot staging: ?shot=start|drive|chase|mission (with &seed=N) paints
// one fixed scene from the game's own code instead of running the loop, so
// the screenshots are real renders of the game, taken the same way every
// time. Each scene steps the simulation a little first, so traffic, police
// and bullets are alive in the picture.

import { WORLD_SIZE } from './config.js';
import { roadCenter } from './city.js';
import { addWanted, createWorld, step } from './world.js';
import { startMission } from './missions.js';

export function centerCamera(world) {
  const view = world.view;
  world.camera.x = Math.max(0, Math.min(WORLD_SIZE - view.w, world.player.x - view.w / 2));
  world.camera.y = Math.max(0, Math.min(WORLD_SIZE - view.h, world.player.y - view.h / 2));
}

function stubInput(held, mouseDown, mouseX, mouseY) {
  return {
    keys: new Set(),
    mouse: { x: mouseX || 640, y: mouseY || 360, down: !!mouseDown, clicked: false },
    down(...codes) {
      return codes.some((c) => held.has(c));
    },
    pressed() {
      return false;
    },
    consumeClick() {
      return false;
    },
  };
}

function stepFrames(world, input, n) {
  for (let i = 0; i < n; i += 1) {
    world.mouseWorld.x = world.player.x + (input.mouse.x - world.view.w / 2);
    world.mouseWorld.y = world.player.y + (input.mouse.y - world.view.h / 2);
    step(world, input, 1 / 60);
    centerCamera(world);
  }
}

function putPlayerInCar(world, x, y, angle, speed) {
  const car = world.cars.find((c) => c.kind === 'parked') || world.cars[0];
  car.kind = 'player';
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  world.player.inCar = true;
  world.player.car = car;
  world.player.x = x;
  world.player.y = y;
  world.player.angle = angle;
  return car;
}

export function stageShot(name, seed, renderer, view) {
  const world = createWorld(seed);
  world.view = view;
  const ui = { saveExists: true };
  let screen = 'play';

  if (name === 'start') {
    // Title screen over downtown Solmar Bay.
    world.player.x = roadCenter(5);
    world.player.y = roadCenter(5);
    centerCamera(world);
    screen = 'title';
  } else if (name === 'drive') {
    // Cruising a boulevard in a stolen sedan, traffic all around.
    putPlayerInCar(world, roadCenter(5), roadCenter(6), 0, 320);
    const input = stubInput(new Set(['KeyW']), false);
    stepFrames(world, input, 100);
    screen = 'play';
  } else if (name === 'chase') {
    // Three stars, police on the tail, package run in progress.
    startMission(world.missions, 1, world);
    world.missions.step = 2;
    world.missions.target = { x: roadCenter(2), y: roadCenter(10) };
    world.missions.text = 'Deliver the package — lose the cops!';
    putPlayerInCar(world, roadCenter(6), roadCenter(6), 0, 380);
    addWanted(world, 3);
    const input = stubInput(new Set(['KeyW']), false);
    stepFrames(world, input, 150);
    screen = 'play';
  } else if (name === 'mission') {
    // On foot by the park, shooting at the Viper sedan while pedestrians run.
    startMission(world.missions, 2, world);
    world.player.x = roadCenter(5) - 40;
    world.player.y = roadCenter(6) + 60;
    if (world.rival) {
      world.rival.x = roadCenter(6) + 60;
      world.rival.y = roadCenter(6) + 40;
      world.rival.angle = Math.PI;
    }
    const input = stubInput(new Set(), true, 820, 300);
    stepFrames(world, input, 45);
    screen = 'play';
  } else {
    // Unknown shot: just the city from the player's spawn.
    centerCamera(world);
    screen = 'play';
  }

  centerCamera(world);
  const input = stubInput(new Set(), false);
  renderer.render(world, screen, ui, input);
  renderer.render(world, screen, ui, input);
  window.__shotReady = true;
  return { world, screen };
}
