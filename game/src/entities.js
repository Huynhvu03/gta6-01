// The moving population of Solmar Bay: traffic cars that follow the roads,
// parked cars, pedestrians on the sidewalks, police cars and foot cops that
// chase the player, and the rival Viper car for the final mission. Every
// entity is plain data; the update functions below move it one step.

import {
  CAR_RADIUS,
  COLORS,
  LANE,
  ROAD_WIDTH,
  TRAFFIC_SPEED,
  WORLD_SIZE,
} from './config.js';
import { nearestRoadPoint, randomRoadPoint, resolveBuildings, roadCenter } from './city.js';

const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

export function makeCar(kind, x, y, angle, color) {
  return {
    kind,
    x,
    y,
    angle,
    speed: 0,
    color,
    health: kind === 'police' ? 120 : 100,
    axis: 'h',
    line: 0,
    along: x,
    dir: 1,
    targetAngle: angle,
    sirenPhase: Math.random() * 6,
    smoke: 0,
  };
}

function roadAngle(axis, dir) {
  if (axis === 'h') return dir > 0 ? 0 : Math.PI;
  return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function spawnTraffic(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random.chance(0.5);
    const line = random.pick(vertical ? city.roads.vertical : city.roads.horizontal);
    const along = random.range(240, WORLD_SIZE - 240);
    const dir = random.chance(0.5) ? 1 : -1;
    const car = makeCar('traffic', 0, 0, 0, random.pick(COLORS.carBody));
    car.axis = vertical ? 'v' : 'h';
    car.line = line;
    car.along = along;
    car.dir = dir;
    car.speed = random.range(TRAFFIC_SPEED * 0.7, TRAFFIC_SPEED * 1.15);
    car.cruise = car.speed;
    car.x = vertical ? line + dir * LANE : along;
    car.y = vertical ? along : line + dir * LANE;
    car.angle = roadAngle(car.axis, car.dir);
    car.targetAngle = car.angle;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    let x;
    let y;
    let angle;
    if (i < city.parkingLots.length * 3 && city.parkingLots.length > 0) {
      const lot = city.parkingLots[i % city.parkingLots.length];
      x = lot.x + random.range(30, lot.w - 30);
      y = lot.y + random.range(30, lot.h - 30);
      angle = random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    } else {
      const vertical = random.chance(0.5);
      const line = random.pick(vertical ? city.roads.vertical : city.roads.horizontal);
      const along = random.range(300, WORLD_SIZE - 300);
      const side = random.chance(0.5) ? 1 : -1;
      const off = ROAD_WIDTH / 2 - 16;
      x = vertical ? line + side * off : along;
      y = vertical ? along : line + side * off;
      angle = vertical ? Math.PI / 2 : 0;
    }
    const car = makeCar('parked', x, y, angle, random.pick(COLORS.carBody));
    cars.push(car);
  }
  return cars;
}

function nextCrossing(line, along, dir) {
  // The next road centre line ahead of `along` on the perpendicular axis.
  let best = null;
  for (let i = 0; i < 12; i += 1) {
    const c = roadCenter(i);
    if (dir > 0 && c > along + 8 && (best === null || c < best)) best = c;
    if (dir < 0 && c < along - 8 && (best === null || c > best)) best = c;
  }
  return best;
}

function turnTraffic(car, crossing) {
  // At an intersection, keep going or turn left / right.
  const r = Math.random();
  if (r < 0.55) return; // straight on
  const left = r < 0.78;
  if (car.axis === 'h') {
    const east = car.dir > 0;
    const north = east ? left : !left;
    car.axis = 'v';
    car.line = crossing;
    car.dir = north ? -1 : 1;
    car.along = car.y;
    car.x = crossing + car.dir * LANE;
    car.y = car.along;
  } else {
    const south = car.dir > 0;
    const eastTurn = south ? left : !left;
    car.axis = 'h';
    car.line = crossing;
    car.dir = eastTurn ? 1 : -1;
    car.along = car.x;
    car.y = crossing + car.dir * LANE;
    car.x = car.along;
  }
  car.targetAngle = roadAngle(car.axis, car.dir);
}

function carAheadInLane(car, cars, playerCar) {
  let nearest = Infinity;
  const all = playerCar ? [...cars, playerCar] : cars;
  for (const other of all) {
    if (other === car || other.kind === 'parked') continue;
    if (other.axis !== car.axis || other.line !== car.line || other.dir !== car.dir) continue;
    const gap = (other.along - car.along) * car.dir;
    if (gap > 0 && gap < nearest) nearest = gap;
  }
  return nearest;
}

export function updateTraffic(cars, city, playerCar, dt, events) {
  for (const car of cars) {
    if (car.kind !== 'traffic') continue;
    const crossing = nextCrossing(car.line, car.along, car.dir);
    if (crossing !== null && Math.abs(car.along - crossing) < car.speed * dt + 2) {
      car.along = crossing;
      turnTraffic(car, crossing);
    }
    const gap = carAheadInLane(car, cars, playerCar);
    const target = gap < 90 ? car.cruise * 0.25 : car.cruise;
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    car.along += car.dir * car.speed * dt;
    if (car.along > WORLD_SIZE - 120) car.along = 120;
    if (car.along < 120) car.along = WORLD_SIZE - 120;
    if (car.axis === 'h') {
      car.x = car.along;
      car.y = car.line + car.dir * LANE;
    } else {
      car.x = car.line + car.dir * LANE;
      car.y = car.along;
    }
    car.angle = lerpAngle(car.angle, car.targetAngle, Math.min(1, dt * 8));
  }
  // Bump into each other and into the player's car (the player car lives in
  // the same array with kind 'player', so it is already among `cars`).
  const all = cars;
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i];
      const b = all[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = CAR_RADIUS * 2 - 4;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        if (a.kind !== 'parked') {
          a.x -= nx * push;
          a.y -= ny * push;
        }
        if (b.kind !== 'parked') {
          b.x += nx * push;
          b.y += ny * push;
        }
        if (Math.abs(a.speed - b.speed) > 120 && events) {
          events.push('crash');
          a.health -= 4;
          b.health -= 4;
        }
      }
    }
  }
}

export function spawnPeds(city, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random.chance(0.5);
    const line = random.pick(vertical ? city.roads.vertical : city.roads.horizontal);
    const along = random.range(200, WORLD_SIZE - 200);
    const dir = random.chance(0.5) ? 1 : -1;
    const side = random.chance(0.5) ? 1 : -1;
    const ped = {
      x: vertical ? line + side * (ROAD_WIDTH / 2 + 14) : along,
      y: vertical ? along : line + side * (ROAD_WIDTH / 2 + 14),
      angle: 0,
      speed: random.range(28, 52),
      color: random.pick(['#e8e8e8', '#3d7dd9', '#d94f3d', '#e8c53a', '#7a4fd0', '#3fae7a', '#e07b39']),
      state: 'walk',
      health: 30,
      axis: vertical ? 'v' : 'h',
      line,
      along,
      dir,
      side,
      fleeT: 0,
      deadT: 0,
      bob: random.range(0, 6),
    };
    ped.angle = roadAngle(ped.axis, ped.dir);
    peds.push(ped);
  }
  return peds;
}

export function updatePeds(peds, city, player, threat, dt, random) {
  for (const ped of peds) {
    if (ped.state === 'dead') {
      ped.deadT += dt;
      continue;
    }
    ped.bob += dt * 8;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const dist = Math.hypot(dx, dy);
    const playerDanger = threat > 0 && dist < 200;
    if (playerDanger && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.fleeT = 2.5;
    }
    if (ped.state === 'flee') {
      ped.fleeT -= dt;
      const nx = dist > 1 ? dx / dist : 1;
      const ny = dist > 1 ? dy / dist : 0;
      ped.x += nx * 215 * dt;
      ped.y += ny * 215 * dt;
      ped.angle = Math.atan2(ny, nx);
      resolveBuildings(city, ped, 12);
      ped.x = Math.max(40, Math.min(WORLD_SIZE - 40, ped.x));
      ped.y = Math.max(40, Math.min(WORLD_SIZE - 40, ped.y));
      if (ped.fleeT <= 0) {
        ped.state = 'walk';
        const near = nearestRoadPoint(city, ped.x, ped.y);
        const vertical = Math.abs(ped.x - near.x) < Math.abs(ped.y - near.y);
        ped.axis = vertical ? 'v' : 'h';
        ped.line = vertical ? near.x : near.y;
        ped.along = vertical ? ped.y : ped.x;
        ped.dir = random.chance(0.5) ? 1 : -1;
        ped.side = random.chance(0.5) ? 1 : -1;
      }
      continue;
    }
    // Stroll along the sidewalk; turn at intersections sometimes.
    const crossing = nextCrossing(ped.line, ped.along, ped.dir);
    if (crossing !== null && Math.abs(ped.along - crossing) < ped.speed * dt + 2) {
      ped.along = crossing;
      if (random.chance(0.35)) {
        if (ped.axis === 'h') {
          ped.axis = 'v';
          ped.line = crossing;
          ped.dir = random.chance(0.5) ? 1 : -1;
          ped.along = ped.y;
          ped.side = random.chance(0.5) ? 1 : -1;
        } else {
          ped.axis = 'h';
          ped.line = crossing;
          ped.dir = random.chance(0.5) ? 1 : -1;
          ped.along = ped.x;
          ped.side = random.chance(0.5) ? 1 : -1;
        }
      }
    }
    ped.along += ped.dir * ped.speed * dt;
    if (ped.along > WORLD_SIZE - 100) ped.along = 100;
    if (ped.along < 100) ped.along = WORLD_SIZE - 100;
    const off = ROAD_WIDTH / 2 + 14;
    if (ped.axis === 'h') {
      ped.x = ped.along;
      ped.y = ped.line + ped.side * off;
    } else {
      ped.x = ped.line + ped.side * off;
      ped.y = ped.along;
    }
    ped.angle = roadAngle(ped.axis, ped.dir);
  }
  // Drop the long-dead so the array stays short.
  for (let i = peds.length - 1; i >= 0; i -= 1) {
    if (peds[i].state === 'dead' && peds[i].deadT > 20) peds.splice(i, 1);
  }
}

export function spawnPoliceCar(city, random, nearX, nearY) {
  const p = randomRoadPoint(city, random);
  // Nudge the spawn toward the player so the chase starts close.
  const car = makeCar('police', p.x, p.y, 0, COLORS.policeBody);
  car.speed = 200;
  car.cruise = 420;
  car.x = p.x;
  car.y = p.y;
  car.angle = Math.atan2(nearY - p.y, nearX - p.x);
  car.targetAngle = car.angle;
  return car;
}

export function updatePoliceCars(cars, player, city, dt, events) {
  for (const car of cars) {
    car.sirenPhase += dt * 6;
    const tx = player.inCar ? player.car.x : player.x;
    const ty = player.inCar ? player.car.y : player.y;
    const dx = tx - car.x;
    const dy = ty - car.y;
    const dist = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    car.targetAngle = want;
    car.angle = lerpAngle(car.angle, car.targetAngle, Math.min(1, dt * 3.4));
    const targetSpeed = dist > 60 ? 430 : 200;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (resolveBuildings(city, car, CAR_RADIUS - 2)) {
      car.speed *= 0.55;
      if (events && Math.abs(car.speed) > 150) events.push('crash');
    }
    car.x = Math.max(30, Math.min(WORLD_SIZE - 30, car.x));
    car.y = Math.max(30, Math.min(WORLD_SIZE - 30, car.y));
    // Ram the player's car.
    if (player.inCar && dist < CAR_RADIUS * 2 + 4) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      player.car.x -= nx * 26;
      player.car.y -= ny * 26;
      player.car.speed *= 0.86;
      player.car.health -= 3;
      if (events) events.push('crash');
    }
  }
}

export function spawnFootCop(city, random, nearX, nearY) {
  const p = randomRoadPoint(city, random);
  return {
    x: p.x,
    y: p.y,
    angle: 0,
    speed: 205,
    color: '#22345e',
    state: 'chase',
    punchT: 0,
    arrestT: 0,
    bob: random.range(0, 6),
  };
}

export function updateFootCops(cops, player, city, dt, events) {
  for (const cop of cops) {
    cop.bob += dt * 9;
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (player.inCar) {
      // A foot cop cannot catch a car: run to the nearest road and wait.
      const near = nearestRoadPoint(city, cop.x, cop.y);
      const nx = near.x - cop.x;
      const ny = near.y - cop.y;
      const nd = Math.hypot(nx, ny);
      if (nd > 4) {
        cop.x += (nx / nd) * cop.speed * 0.5 * dt;
        cop.y += (ny / nd) * cop.speed * 0.5 * dt;
        cop.angle = Math.atan2(ny, nx);
      }
      cop.arrestT = 0;
      continue;
    }
    cop.angle = Math.atan2(dy, dx);
    if (dist > 26) {
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      resolveBuildings(city, cop, 12);
      cop.arrestT = 0;
    } else {
      cop.punchT -= dt;
      if (cop.punchT <= 0) {
        cop.punchT = 1;
        player.health -= 8;
        if (events) events.push('punch');
      }
      const playerSpeed = Math.hypot(player.vx || 0, player.vy || 0);
      if (playerSpeed < 40) {
        cop.arrestT += dt;
        if (cop.arrestT > 1.2 && events) events.push('busted');
      } else {
        cop.arrestT = 0;
      }
    }
  }
}

// The rival Viper car: it runs a circuit around the central park until the
// player wrecks it.
export function makeRivalCar(city) {
  const car = makeCar('rival', roadCenter(5), roadCenter(4), 0, '#1c1c22');
  car.speed = 0;
  car.cruise = 380;
  car.waypoints = [
    { x: roadCenter(5), y: roadCenter(4) },
    { x: roadCenter(7), y: roadCenter(4) },
    { x: roadCenter(7), y: roadCenter(7) },
    { x: roadCenter(5), y: roadCenter(7) },
  ];
  car.wp = 0;
  return car;
}

export function updateRival(car, city, dt) {
  if (car.health <= 0) {
    car.speed *= Math.max(0, 1 - dt * 2);
    car.smoke = Math.min(1, car.smoke + dt);
    return;
  }
  const wp = car.waypoints[car.wp];
  const dx = wp.x - car.x;
  const dy = wp.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 60) {
    car.wp = (car.wp + 1) % car.waypoints.length;
    return;
  }
  const want = Math.atan2(dy, dx);
  car.angle = lerpAngle(car.angle, want, Math.min(1, dt * 2.6));
  car.speed += (car.cruise - car.speed) * Math.min(1, dt * 1.4);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  resolveBuildings(city, car, CAR_RADIUS - 2);
}
