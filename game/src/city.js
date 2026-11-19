// Solmar Bay: the city itself. A road grid, blocks of buildings, a central
// park, a beach on the east edge, and two parking lots. The layout is built
// once from a seed, then every system (traffic, pedestrians, police, missions)
// asks this module where things are: which points are road, what a circle
// bumps into, and where a car may spawn.
//
// Roads run at x = 160 + i * 320 and y = 160 + i * 320 (i = 0..11). The block
// between road i and road i + 1 is 224 px wide; buildings sit inside it with
// a margin. The strip east of the last road is sand, then water.

import { COLORS, ROAD_PITCH, ROAD_WIDTH, WORLD_SIZE } from './config.js';

export const ROAD_COUNT = 12;
export const BEACH_X = 3728;
export const WATER_X = 3800;

export function roadCenter(i) {
  return 160 + i * ROAD_PITCH;
}

export function buildCity(random) {
  const roads = { vertical: [], horizontal: [] };
  for (let i = 0; i < ROAD_COUNT; i += 1) {
    roads.vertical.push(roadCenter(i));
    roads.horizontal.push(roadCenter(i));
  }

  const buildings = [];
  const trees = [];
  const parkingLots = [];
  const parkBlock = { bx: 5, by: 5 };
  const lotBlocks = [
    { bx: 2, by: 8 },
    { bx: 8, by: 2 },
  ];
  const lotKey = new Set(lotBlocks.map((b) => `${b.bx},${b.by}`));

  for (let bx = 0; bx < ROAD_COUNT - 1; bx += 1) {
    for (let by = 0; by < ROAD_COUNT - 1; by += 1) {
      const x0 = roadCenter(bx) + ROAD_WIDTH / 2 + 10;
      const y0 = roadCenter(by) + ROAD_WIDTH / 2 + 10;
      const w = ROAD_PITCH - ROAD_WIDTH - 20;
      const h = ROAD_PITCH - ROAD_WIDTH - 20;
      if (bx === parkBlock.bx && by === parkBlock.by) {
        // Central park: lawn and trees, no buildings.
        for (let t = 0; t < 14; t += 1) {
          trees.push({
            x: x0 + random.range(16, w - 16),
            y: y0 + random.range(16, h - 16),
            r: random.range(10, 18),
          });
        }
        continue;
      }
      if (lotKey.has(`${bx},${by}`)) {
        parkingLots.push({ x: x0, y: y0, w, h });
        continue;
      }
      const split = random.chance(0.45);
      const color = random.pick(COLORS.roof);
      if (split && random.chance(0.7)) {
        const vertical = random.chance(0.5);
        if (vertical) {
          buildings.push({ x: x0, y: y0, w: w / 2 - 6, h, color });
          buildings.push({ x: x0 + w / 2 + 6, y: y0, w: w / 2 - 6, h, color: random.pick(COLORS.roof) });
        } else {
          buildings.push({ x: x0, y: y0, w, h: h / 2 - 6, color });
          buildings.push({ x: x0, y: y0 + h / 2 + 6, w, h: h / 2 - 6, color: random.pick(COLORS.roof) });
        }
      } else {
        buildings.push({ x: x0, y: y0, w, h, color });
      }
    }
  }

  // Palm trees along the beach.
  const palms = [];
  for (let y = 120; y < WORLD_SIZE - 120; y += 130) {
    palms.push({ x: BEACH_X + 34 + random.range(-8, 8), y: y + random.range(-20, 20), r: 12 });
  }

  return {
    roads,
    buildings,
    trees,
    palms,
    parkingLots,
    park: {
      x: roadCenter(parkBlock.bx) + ROAD_WIDTH / 2,
      y: roadCenter(parkBlock.by) + ROAD_WIDTH / 2,
      w: ROAD_PITCH - ROAD_WIDTH,
      h: ROAD_PITCH - ROAD_WIDTH,
    },
    spots: {
      player: { x: roadCenter(5), y: roadCenter(4) - 40 },
      mara: { x: roadCenter(5), y: roadCenter(5) },
      hospital: { x: roadCenter(3), y: roadCenter(3) },
      policeStation: { x: roadCenter(7), y: roadCenter(3) },
      docks: { x: roadCenter(10), y: roadCenter(10) },
    },
  };
}

// Is this point on a road (within the asphalt)?
export function isOnRoad(x, y) {
  const near = (v) => {
    const m = ((v - 160) % ROAD_PITCH + ROAD_PITCH) % ROAD_PITCH;
    return m < ROAD_WIDTH / 2 || m > ROAD_PITCH - ROAD_WIDTH / 2;
  };
  return near(x) || near(y);
}

// The building a circle of radius r at (x, y) overlaps, or null.
export function hitBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      return b;
    }
  }
  return null;
}

// Push a circle out of any building it overlaps; returns the building hit.
export function resolveBuildings(city, p, r) {
  const b = hitBuilding(city, p.x, p.y, r);
  if (!b) return null;
  const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
  let dx = p.x - cx;
  let dy = p.y - cy;
  let d = Math.hypot(dx, dy);
  if (d === 0) {
    // Centre is inside the rect: push out along the smallest penetration.
    const left = p.x - b.x + r;
    const right = b.x + b.w - p.x + r;
    const top = p.y - b.y + r;
    const bottom = b.y + b.h - p.y + r;
    const m = Math.min(left, right, top, bottom);
    if (m === left) p.x = b.x - r;
    else if (m === right) p.x = b.x + b.w + r;
    else if (m === top) p.y = b.y - r;
    else p.y = b.y + b.h + r;
    return b;
  }
  dx /= d;
  dy /= d;
  p.x = cx + dx * r;
  p.y = cy + dy * r;
  return b;
}

// A random point on a road, for spawning traffic and police.
export function randomRoadPoint(city, random) {
  const vertical = random.chance(0.5);
  const line = random.pick(vertical ? city.roads.vertical : city.roads.horizontal);
  const along = random.range(200, WORLD_SIZE - 200);
  return vertical ? { x: line, y: along } : { x: along, y: line };
}

// The nearest point on any road centre line.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const cx of city.roads.vertical) {
    const d = Math.abs(x - cx);
    if (d < bestD) {
      bestD = d;
      best = { x: cx, y };
    }
  }
  for (const cy of city.roads.horizontal) {
    const d = Math.abs(y - cy);
    if (d < bestD) {
      bestD = d;
      best = { x, y: cy };
    }
  }
  return best;
}
