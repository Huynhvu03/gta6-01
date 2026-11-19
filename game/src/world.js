// The world: one state object and one step function. Everything the player
// does — walking, driving, stealing cars, shooting, getting chased — happens
// here, in fixed steps, with no drawing and no DOM. The step returns events
// (sounds and toasts) for the caller to play; the renderer only paints.

import {
  BULLET_RANGE,
  BULLET_SPEED,
  CAR_ACCEL,
  CAR_BRAKE,
  CAR_MAX_SPEED,
  CAR_RADIUS,
  CAR_REVERSE_MAX,
  CAR_TURN,
  COLORS,
  CRIME_CARJACK,
  CRIME_KILL_COP,
  CRIME_KILL_PED,
  GUN_DAMAGE,
  GUN_RATE,
  PARKED_COUNT,
  PED_COUNT,
  PICKUP_CASH,
  PLAYER_HEALTH,
  PLAYER_RADIUS,
  PLAYER_WALK,
  PUNCH_DAMAGE,
  PUNCH_RANGE,
  PUNCH_RATE,
  START_MONEY,
  TRAFFIC_COUNT,
  WANTED_DECAY_SECONDS,
  WANTED_MAX,
  WORLD_SIZE,
} from './config.js';
import { buildCity, hitBuilding, isOnRoad, randomRoadPoint, resolveBuildings } from './city.js';
import { createRandom } from './random.js';
import {
  makeCar,
  spawnFootCop,
  spawnParked,
  spawnPeds,
  spawnPoliceCar,
  spawnTraffic,
  updateFootCops,
  updatePeds,
  updatePoliceCars,
  updateRival,
  updateTraffic,
} from './entities.js';
import { createMissions, startMission, updateMissions } from './missions.js';
import { saveGame } from './save.js';

export function createWorld(seed, saveData) {
  const random = createRandom(seed);
  const city = buildCity(random);
  const world = {
    seed,
    city,
    random,
    time: 0,
    player: {
      x: city.spots.player.x,
      y: city.spots.player.y,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      aimAngle: 0,
      health: PLAYER_HEALTH,
      money: START_MONEY,
      inCar: false,
      car: null,
      gunT: 0,
      punchT: 0,
      lastHurt: -99,
    },
    cars: [],
    police: [],
    cops: [],
    peds: [],
    rival: null,
    bullets: [],
    particles: [],
    pickups: [],
    wanted: 0,
    wantedTimer: 0,
    threat: 0,
    threatTimer: 0,
    policeTimer: 0,
    pickupTimer: 12,
    saveTimer: 0,
    missions: createMissions(),
    messages: [],
    busted: false,
    wasted: false,
    stats: { kills: 0, carsStolen: 0, shotsFired: 0, missionsDone: 0 },
    camera: { x: 0, y: 0 },
    view: { w: 1280, h: 720 },
    mouseWorld: { x: 0, y: 0 },
  };
  world.cars.push(...spawnTraffic(city, random, TRAFFIC_COUNT));
  world.cars.push(...spawnParked(city, random, PARKED_COUNT));
  world.peds = spawnPeds(city, random, PED_COUNT);
  if (saveData) {
    world.player.money = saveData.money ?? START_MONEY;
    world.player.health = saveData.health ?? PLAYER_HEALTH;
    world.player.x = saveData.x ?? world.player.x;
    world.player.y = saveData.y ?? world.player.y;
    world.wanted = 0;
    world.missions.index = saveData.missionIndex ?? 0;
  }
  startMission(world.missions, world.missions.index, world);
  return world;
}

export function addMessage(world, text) {
  world.messages.push({ text, t: 4 });
  if (world.messages.length > 3) world.messages.shift();
}

export function addWanted(world, n) {
  world.wanted = Math.min(WANTED_MAX, world.wanted + n);
  world.wantedTimer = 0;
}

function spawnParticles(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.random.next() * Math.PI * 2;
    const s = speed * (0.4 + world.random.next() * 0.8);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + world.random.next() * 0.5,
      maxLife: 1,
      color,
      size: 2 + world.random.next() * 4,
    });
  }
}

function explodeCar(world, car, events) {
  spawnParticles(world, car.x, car.y, '#ff7a1a', 16, 260);
  spawnParticles(world, car.x, car.y, '#3a3532', 10, 120);
  spawnParticles(world, car.x, car.y, '#ffd94d', 8, 320);
  events.push('explosion');
  if (world.player.inCar && world.player.car === car) {
    world.player.inCar = false;
    world.player.car = null;
    world.player.x = car.x + 30;
    world.player.y = car.y + 30;
    world.player.health -= 15;
    world.player.lastHurt = world.time;
  }
  const i = world.cars.indexOf(car);
  if (i >= 0) world.cars.splice(i, 1);
  const j = world.police.indexOf(car);
  if (j >= 0) world.police.splice(j, 1);
  if (world.rival === car) world.rival = null;
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.cars) {
    if (car.kind === 'player') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterCar(world, events) {
  const p = world.player;
  const car = nearestCar(world, p.x, p.y, 58);
  if (!car) return;
  if (car.kind === 'traffic') {
    // Carjacking: the driver bails and runs, and the law notices.
    const driver = {
      x: car.x - 26,
      y: car.y,
      angle: 0,
      speed: 60,
      color: '#e8e8e8',
      state: 'flee',
      health: 30,
      axis: 'h',
      line: car.line,
      along: car.along,
      dir: 1,
      side: 1,
      fleeT: 4,
      deadT: 0,
      bob: 0,
    };
    world.peds.push(driver);
    addWanted(world, CRIME_CARJACK);
    world.stats.carsStolen += 1;
    addMessage(world, 'Car stolen — wanted level up!');
    events.push('carjack');
  }
  car.kind = 'player';
  car.speed = 0;
  p.inCar = true;
  p.car = car;
  p.x = car.x;
  p.y = car.y;
}

function exitCar(world) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  p.inCar = false;
  p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  resolveBuildings(world.city, p, PLAYER_RADIUS);
}

function shoot(world, events) {
  const p = world.player;
  if (p.gunT > 0) return;
  p.gunT = GUN_RATE;
  world.stats.shotsFired += 1;
  const a = p.aimAngle;
  world.bullets.push({
    x: p.x + Math.cos(a) * 22,
    y: p.y + Math.sin(a) * 22,
    vx: Math.cos(a) * BULLET_SPEED,
    vy: Math.sin(a) * BULLET_SPEED,
    life: BULLET_RANGE / BULLET_SPEED,
    from: 'player',
  });
  world.threat = 1;
  world.threatTimer = 1.5;
  events.push('shot');
}

function punch(world, events) {
  const p = world.player;
  if (p.punchT > 0) return;
  p.punchT = PUNCH_RATE;
  events.push('punch');
  const range = PUNCH_RANGE + 10;
  for (const ped of world.peds) {
    if (ped.state === 'dead') continue;
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < range) {
      ped.health -= PUNCH_DAMAGE;
      if (ped.health <= 0) killPed(world, ped, events);
      else {
        ped.state = 'flee';
        ped.fleeT = 2;
      }
    }
  }
  for (const cop of world.cops) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) < range) {
      cop.health = (cop.health ?? 50) - PUNCH_DAMAGE;
      if (cop.health <= 0) killCop(world, cop, events);
    }
  }
  for (const car of [...world.cars, ...world.police]) {
    if (Math.hypot(car.x - p.x, car.y - p.y) < CAR_RADIUS + 16) {
      car.health -= 6;
      if (car.health <= 0) explodeCar(world, car, events);
    }
  }
}

function killPed(world, ped, events) {
  ped.state = 'dead';
  ped.deadT = 0;
  world.stats.kills += 1;
  addWanted(world, CRIME_KILL_PED);
  spawnParticles(world, ped.x, ped.y, '#c0392b', 8, 120);
}

function killCop(world, cop, events) {
  const i = world.cops.indexOf(cop);
  if (i >= 0) world.cops.splice(i, 1);
  world.stats.kills += 1;
  addWanted(world, CRIME_KILL_COP);
  spawnParticles(world, cop.x, cop.y, '#22345e', 10, 140);
  addMessage(world, 'A cop is down — wanted level up!');
}

function updateBullets(world, dt, events) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && hitBuilding(world.city, b.x, b.y, 1)) {
      spawnParticles(world, b.x, b.y, '#e8d44d', 3, 90);
      dead = true;
    }
    if (!dead) {
      for (const ped of world.peds) {
        if (ped.state === 'dead') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.health -= GUN_DAMAGE;
          spawnParticles(world, b.x, b.y, '#c0392b', 5, 110);
          if (ped.health <= 0) killPed(world, ped, events);
          else {
            ped.state = 'flee';
            ped.fleeT = 2.5;
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const cop of [...world.cops]) {
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
          cop.health = (cop.health ?? 50) - GUN_DAMAGE;
          spawnParticles(world, b.x, b.y, '#22345e', 5, 110);
          if (cop.health <= 0) killCop(world, cop, events);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      const targets = [...world.cars, ...world.police];
      if (world.rival) targets.push(world.rival);
      for (const car of targets) {
        if (car.kind === 'player') continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < CAR_RADIUS) {
          car.health -= GUN_DAMAGE;
          spawnParticles(world, b.x, b.y, '#ffd94d', 5, 130);
          if (car.health <= 0) explodeCar(world, car, events);
          dead = true;
          break;
        }
      }
    }
    if (dead) world.bullets.splice(i, 1);
  }
}

function updateWanted(world, dt, events) {
  const p = world.player;
  if (world.wanted > 0) {
    world.wantedTimer += dt;
    let policeNear = false;
    for (const car of world.police) {
      if (Math.hypot(car.x - p.x, car.y - p.y) < 600) policeNear = true;
    }
    for (const cop of world.cops) {
      if (Math.hypot(cop.x - p.x, cop.y - p.y) < 600) policeNear = true;
    }
    if (!policeNear && world.wantedTimer > WANTED_DECAY_SECONDS) {
      world.wanted -= 1;
      world.wantedTimer = 0;
      addMessage(world, 'The heat is cooling off…');
    }
  }
  // Keep the right number of police on the streets.
  const wantCars = world.wanted;
  const wantCops = world.wanted >= 2 ? world.wanted - 1 : 0;
  world.policeTimer -= dt;
  if (world.police.length < wantCars && world.policeTimer <= 0) {
    world.policeTimer = 1.5;
    const car = spawnPoliceCar(world.city, world.random, p.x, p.y);
    world.police.push(car);
  }
  if (world.cops.length < wantCops && world.policeTimer <= 0) {
    world.policeTimer = 1.5;
    world.cops.push(spawnFootCop(world.city, world.random, p.x, p.y));
  }
  if (world.wanted === 0) {
    world.police.length = 0;
    world.cops.length = 0;
  }
}

function updatePickups(world, dt, events) {
  world.pickupTimer -= dt;
  if (world.pickupTimer <= 0 && world.pickups.length < 3) {
    world.pickupTimer = 22;
    const pt = randomRoadPoint(world.city, world.random);
    world.pickups.push({ x: pt.x, y: pt.y, t: 0, kind: 'cash' });
  }
  const p = world.player;
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.t += dt;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 42) {
      p.money += PICKUP_CASH;
      events.push('pickup');
      addMessage(world, `+$${PICKUP_CASH} street cash`);
      world.pickups.splice(i, 1);
    } else if (pk.t > 60) {
      world.pickups.splice(i, 1);
    }
  }
}

export function respawn(world, place) {
  const p = world.player;
  const spot = place === 'police' ? world.city.spots.policeStation : world.city.spots.hospital;
  p.x = spot.x;
  p.y = spot.y;
  p.vx = 0;
  p.vy = 0;
  p.health = PLAYER_HEALTH;
  p.inCar = false;
  p.car = null;
  world.wanted = 0;
  world.wantedTimer = 0;
  world.police.length = 0;
  world.cops.length = 0;
  world.threat = 0;
  world.busted = false;
  world.wasted = false;
  world.bullets.length = 0;
  saveGame(world);
}

export function step(world, input, dt) {
  const events = [];
  const p = world.player;
  world.time += dt;

  // Mouse aim in world coordinates (the caller sets mouseWorld).
  p.aimAngle = Math.atan2(world.mouseWorld.y - p.y, world.mouseWorld.x - p.x);
  p.gunT = Math.max(0, p.gunT - dt);
  p.punchT = Math.max(0, p.punchT - dt);
  if (world.threatTimer > 0) {
    world.threatTimer -= dt;
    if (world.threatTimer <= 0) world.threat = 0;
  }

  if (!p.inCar) {
    let mx = 0;
    let my = 0;
    if (input.down('KeyW', 'ArrowUp')) my -= 1;
    if (input.down('KeyS', 'ArrowDown')) my += 1;
    if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
    if (input.down('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      p.vx = mx * PLAYER_WALK;
      p.vy = my * PLAYER_WALK;
      p.angle = Math.atan2(my, mx);
    } else {
      p.vx = 0;
      p.vy = 0;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (resolveBuildings(world.city, p, PLAYER_RADIUS)) {
      p.vx *= 0.4;
      p.vy *= 0.4;
    }
    p.x = Math.max(30, Math.min(WORLD_SIZE - 30, p.x));
    p.y = Math.max(30, Math.min(WORLD_SIZE - 30, p.y));
    if (input.pressed('KeyE')) enterCar(world, events);
    if (input.pressed('KeyF')) punch(world, events);
    if (input.mouse.down || input.consumeClick()) shoot(world, events);
  } else {
    const car = p.car;
    const fwd = input.down('KeyW', 'ArrowUp') ? 1 : 0;
    const back = input.down('KeyS', 'ArrowDown') ? 1 : 0;
    const steer = (input.down('KeyA', 'ArrowLeft') ? -1 : 0) + (input.down('KeyD', 'ArrowRight') ? 1 : 0);
    const onRoad = isOnRoad(car.x, car.y);
    const maxSpeed = onRoad ? CAR_MAX_SPEED : CAR_MAX_SPEED * 0.55;
    if (fwd) car.speed += CAR_ACCEL * dt;
    if (back) {
      if (car.speed > 20) car.speed -= CAR_BRAKE * dt;
      else car.speed -= CAR_ACCEL * 0.7 * dt;
    }
    if (!fwd && !back) car.speed *= Math.max(0, 1 - 0.9 * dt);
    car.speed = Math.max(-CAR_REVERSE_MAX, Math.min(maxSpeed, car.speed));
    const steerAuthority = Math.min(1, Math.abs(car.speed) / 140);
    car.angle += steer * CAR_TURN * dt * steerAuthority * (car.speed >= 0 ? 1 : -1);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (resolveBuildings(world.city, car, CAR_RADIUS - 2)) {
      if (Math.abs(car.speed) > 200) {
        events.push('crash');
        car.health -= 6;
        spawnParticles(world, car.x, car.y, '#e8d44d', 6, 140);
      }
      car.speed *= 0.45;
    }
    car.x = Math.max(30, Math.min(WORLD_SIZE - 30, car.x));
    car.y = Math.max(30, Math.min(WORLD_SIZE - 30, car.y));
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.vx = Math.cos(car.angle) * car.speed;
    p.vy = Math.sin(car.angle) * car.speed;
    if (input.pressed('KeyE')) exitCar(world);
    if (car.health <= 0) explodeCar(world, car, events);
  }

  updateTraffic(world.cars, world.city, null, dt, events);
  updatePeds(world.peds, world.city, p, world.threat, dt, world.random);
  updatePoliceCars(world.police, p, world.city, dt, events);
  updateFootCops(world.cops, p, world.city, dt, events);
  if (world.rival) updateRival(world.rival, world.city, dt);
  updateBullets(world, dt, events);
  updateWanted(world, dt, events);
  updatePickups(world, dt, events);
  updateMissions(world.missions, world, events);

  // Slow health regen while the heat is off.
  if (world.wanted === 0 && world.time - p.lastHurt > 6 && p.health < PLAYER_HEALTH) {
    p.health = Math.min(PLAYER_HEALTH, p.health + 2 * dt);
  }
  if (p.health <= 0 && !world.wasted) {
    world.wasted = true;
    events.push('wasted');
  }
  if (events.includes('busted') && !world.busted) {
    world.busted = true;
  }

  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.max(0, 1 - 2 * dt);
    pt.vy *= Math.max(0, 1 - 2 * dt);
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.messages.length - 1; i >= 0; i -= 1) {
    world.messages[i].t -= dt;
    if (world.messages[i].t <= 0) world.messages.splice(i, 1);
  }

  // Autosave while playing.
  world.saveTimer += dt;
  if (world.saveTimer > 20) {
    world.saveTimer = 0;
    saveGame(world);
  }
  return events;
}

export { COLORS };
