// Painting: the city, every entity, the HUD with its minimap, and the menu
// screens, all on one 2D canvas. Nothing here changes the world; it only
// reads it. The camera follows the player and the renderer culls anything
// outside the view.

import { COLORS, ROAD_WIDTH, WORLD_SIZE } from './config.js';
import { BEACH_X, WATER_X, roadCenter } from './city.js';
import { currentObjective } from './missions.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? COLORS.hudGold : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize(w, h) {
    canvas.width = w;
    canvas.height = h;
  }

  function drawGround(world, cam, view) {
    const { city } = world;
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, 0, view.w, view.h);
    // Sidewalk strips under every road, then the asphalt.
    for (let i = 0; i < 12; i += 1) {
      const c = roadCenter(i);
      ctx.fillStyle = COLORS.sidewalk;
      ctx.fillRect(c - ROAD_WIDTH / 2 - 12 - cam.x, -cam.y, ROAD_WIDTH + 24, view.h + 200);
      ctx.fillRect(-cam.x, c - ROAD_WIDTH / 2 - 12 - cam.y, view.w + 200, ROAD_WIDTH + 24);
      ctx.fillStyle = COLORS.asphalt;
      ctx.fillRect(c - ROAD_WIDTH / 2 - cam.x, -cam.y, ROAD_WIDTH, view.h + 200);
      ctx.fillRect(-cam.x, c - ROAD_WIDTH / 2 - cam.y, view.w + 200, ROAD_WIDTH);
    }
    // Dashed centre lines.
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const c = roadCenter(i);
      ctx.moveTo(c - cam.x, -cam.y);
      ctx.lineTo(c - cam.x, view.h - cam.y + 200);
      ctx.moveTo(-cam.x, c - cam.y);
      ctx.lineTo(view.w - cam.x + 200, c - cam.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Crosswalks at every intersection.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 12; i += 1) {
      for (let j = 0; j < 12; j += 1) {
        const cx = roadCenter(i) - cam.x;
        const cy = roadCenter(j) - cam.y;
        if (cx < -80 || cx > view.w + 80 || cy < -80 || cy > view.h + 80) continue;
        for (let s = -3; s <= 3; s += 1) {
          ctx.fillRect(cx - 34 + s * 10, cy - ROAD_WIDTH / 2 + 4, 5, 10);
          ctx.fillRect(cx - 34 + s * 10, cy + ROAD_WIDTH / 2 - 14, 5, 10);
        }
      }
    }
    // Park lawn and trees.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(city.park.x - cam.x, city.park.y - cam.y, city.park.w, city.park.h);
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(city.park.x - cam.x + 20, city.park.y - cam.y + 20, city.park.w - 40, 26);
    for (const t of city.trees) {
      const tx = t.x - cam.x;
      const ty = t.y - cam.y;
      if (tx < -40 || tx > view.w + 40 || ty < -40 || ty > view.h + 40) continue;
      ctx.fillStyle = COLORS.parkTree;
      ctx.beginPath();
      ctx.arc(tx, ty, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.parkTreeLight;
      ctx.beginPath();
      ctx.arc(tx - 3, ty - 3, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Beach and water on the east edge.
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(BEACH_X - cam.x, -cam.y, WATER_X - BEACH_X, view.h + 200);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(WATER_X - cam.x, -cam.y, WORLD_SIZE - WATER_X + 200, view.h + 200);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < WORLD_SIZE; y += 90) {
      const wy = y + Math.sin(world.time * 1.4 + y * 0.05) * 6 - cam.y;
      ctx.moveTo(WATER_X + 8 - cam.x, wy);
      ctx.quadraticCurveTo(WATER_X + 26 - cam.x, wy + 8, WATER_X + 44 - cam.x, wy);
    }
    ctx.stroke();
    // Palms.
    for (const palm of city.palms) {
      const px = palm.x - cam.x;
      const py = palm.y - cam.y;
      if (px < -40 || px > view.w + 40 || py < -40 || py > view.h + 40) continue;
      ctx.fillStyle = COLORS.palm;
      ctx.beginPath();
      ctx.arc(px, py, palm.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5da85f';
      ctx.beginPath();
      ctx.arc(px - 3, py - 3, palm.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Parking lots.
    for (const lot of city.parkingLots) {
      ctx.fillStyle = COLORS.asphaltDark;
      ctx.fillRect(lot.x - cam.x, lot.y - cam.y, lot.w, lot.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = lot.x + 30; x < lot.x + lot.w - 10; x += 46) {
        ctx.moveTo(x - cam.x, lot.y + 12 - cam.y);
        ctx.lineTo(x - cam.x, lot.y + 44 - cam.y);
      }
      ctx.stroke();
    }
  }

  function drawBuildings(world, cam, view) {
    for (const b of world.city.buildings) {
      const bx = b.x - cam.x;
      const by = b.y - cam.y;
      if (bx > view.w + 40 || by > view.h + 40 || bx + b.w < -40 || by + b.h < -40) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(bx + 5, by + 7, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, b.w - 2, b.h - 2);
      // Windows.
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      const cols = Math.floor(b.w / 26);
      const rows = Math.floor(b.h / 26);
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if ((cx + cy) % 2 === 0) ctx.fillRect(bx + 8 + cx * 26, by + 8 + cy * 26, 12, 9);
        }
      }
    }
  }

  function drawCarShape(car, isPlayer) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-24, -12, 48, 26);
    // Wheels.
    ctx.fillStyle = '#141414';
    ctx.fillRect(-18, -15, 12, 5);
    ctx.fillRect(-18, 10, 12, 5);
    ctx.fillRect(8, -15, 12, 5);
    ctx.fillRect(8, 10, 12, 5);
    // Body.
    ctx.fillStyle = car.color;
    roundRect(ctx, -24, -12, 48, 24, 7);
    ctx.fill();
    if (isPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      roundRect(ctx, -24, -12, 48, 24, 7);
      ctx.stroke();
    }
    // Windshield and roof.
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    ctx.fillRect(6, -9, 8, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-8, -9, 12, 18);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(22, -9, 3, 4);
    ctx.fillRect(22, 5, 3, 4);
    if (car.kind === 'police') {
      ctx.fillStyle = '#1c1c22';
      ctx.fillRect(-4, -12, 10, 24);
      const phase = Math.floor(car.sirenPhase) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2d2d' : '#2d7dff';
      ctx.fillRect(-6, -8, 7, 5);
      ctx.fillStyle = phase ? '#2d7dff' : '#ff2d2d';
      ctx.fillRect(-6, 3, 7, 5);
    }
    if (car.kind === 'rival') {
      ctx.fillStyle = '#d94f3d';
      ctx.fillRect(-24, -3, 48, 6);
    }
    ctx.restore();
    if (car.smoke > 0.2) {
      ctx.fillStyle = `rgba(60,60,60,${0.35 + car.smoke * 0.4})`;
      ctx.beginPath();
      ctx.arc(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 8 + car.smoke * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCars(world, cam, view) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    const list = [...world.cars, ...world.police];
    if (world.rival && !world.cars.includes(world.rival)) list.push(world.rival);
    for (const car of list) {
      if (car.x < cam.x - 60 || car.x > cam.x + view.w + 60 || car.y < cam.y - 60 || car.y > cam.y + view.h + 60) continue;
      drawCarShape(car, world.player.inCar && world.player.car === car);
    }
    ctx.restore();
  }

  function drawPeds(world, cam, view) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const ped of world.peds) {
      if (ped.x < cam.x - 40 || ped.x > cam.x + view.w + 40 || ped.y < cam.y - 40 || ped.y > cam.y + view.h + 40) continue;
      if (ped.state === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(ped.x, ped.y, 13, 7, ped.angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.ellipse(ped.x, ped.y, 11, 6, ped.angle, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const bob = Math.sin(ped.bob) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 6, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y + bob * 0.3, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const cop of world.cops) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cop.x, cop.y + 6, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cop.color;
      ctx.beginPath();
      ctx.arc(cop.x, cop.y + Math.sin(cop.bob) * 0.5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22345e';
      ctx.beginPath();
      ctx.arc(cop.x + Math.cos(cop.angle) * 3, cop.y + Math.sin(cop.angle) * 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d7dff';
      ctx.fillRect(cop.x - 6, cop.y - 14, 12, 3);
    }
    ctx.restore();
  }

  function drawPlayer(world, cam) {
    const p = world.player;
    if (p.inCar) return;
    ctx.save();
    ctx.translate(p.x - cam.x, p.y - cam.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerJacket;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
    // Aim line and gun.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(p.aimAngle) * 8, Math.sin(p.aimAngle) * 8);
    ctx.lineTo(Math.cos(p.aimAngle) * 22, Math.sin(p.aimAngle) * 22);
    ctx.stroke();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBullets(world, cam) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(world, cam) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPickups(world, cam) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const pk of world.pickups) {
      const pulse = 1 + Math.sin(pk.t * 5) * 0.15;
      ctx.fillStyle = COLORS.markerGreen;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 14 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#08330f';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', pk.x, pk.y + 1);
    }
    ctx.restore();
  }

  function drawBeacon(world, cam, view) {
    const m = world.missions;
    if (!m.target || m.storyDone) return;
    const tx = m.target.x - cam.x;
    const ty = m.target.y - cam.y;
    if (tx > 0 && tx < view.w && ty > 0 && ty < view.h) {
      const pulse = 1 + Math.sin(world.time * 4) * 0.25;
      ctx.strokeStyle = COLORS.marker;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.marker;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 34);
      ctx.lineTo(tx + 9, ty - 20);
      ctx.lineTo(tx - 9, ty - 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,217,77,0.18)';
      ctx.beginPath();
      ctx.arc(tx, ty, 44 * pulse, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Off-screen: an arrow at the screen edge points the way.
      const cx = view.w / 2;
      const cy = view.h / 2;
      const a = Math.atan2(ty - cy, tx - cx);
      const ex = cx + Math.cos(a) * (Math.min(view.w, view.h) / 2 - 46);
      const ey = cy + Math.sin(a) * (Math.min(view.w, view.h) / 2 - 46);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = COLORS.marker;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMinimap(world, view) {
    const size = 172;
    const x0 = view.w - size - 14;
    const y0 = view.h - size - 14;
    const s = size / WORLD_SIZE;
    ctx.fillStyle = COLORS.hudPanel;
    roundRect(ctx, x0 - 5, y0 - 5, size + 10, size + 10, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x0, y0, size, size, 6);
    ctx.clip();
    ctx.fillStyle = '#2e2a28';
    ctx.fillRect(x0, y0, size, size);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(x0 + WATER_X * s, y0, (WORLD_SIZE - WATER_X) * s, size);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(x0 + BEACH_X * s, y0, (WATER_X - BEACH_X) * s, size);
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(x0 + world.city.park.x * s, y0 + world.city.park.y * s, world.city.park.w * s, world.city.park.h * s);
    ctx.strokeStyle = '#8a8378';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const c = roadCenter(i) * s;
      ctx.beginPath();
      ctx.moveTo(x0 + c, y0);
      ctx.lineTo(x0 + c, y0 + size);
      ctx.moveTo(x0, y0 + c);
      ctx.lineTo(x0 + size, y0 + c);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9c9c9';
    for (const b of world.city.buildings) {
      ctx.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
    }
    for (const pk of world.pickups) {
      ctx.fillStyle = COLORS.markerGreen;
      ctx.beginPath();
      ctx.arc(x0 + pk.x * s, y0 + pk.y * s, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of world.police) {
      ctx.fillStyle = '#2d7dff';
      ctx.beginPath();
      ctx.arc(x0 + car.x * s, y0 + car.y * s, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.rival) {
      ctx.fillStyle = '#ff2d2d';
      ctx.beginPath();
      ctx.arc(x0 + world.rival.x * s, y0 + world.rival.y * s, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const m = world.missions;
    if (m.target) {
      const pulse = 3 + Math.sin(world.time * 5) * 1.5;
      ctx.fillStyle = COLORS.marker;
      ctx.beginPath();
      ctx.arc(x0 + m.target.x * s, y0 + m.target.y * s, pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5b00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Player arrow, always centred on the map.
    const px = x0 + world.player.x * s;
    const py = y0 + world.player.y * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(world.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SOLMAR BAY', x0 + 2, y0 - 8);
  }

  function drawHUD(world, view, input) {
    const p = world.player;
    // Top-left: health and money.
    ctx.fillStyle = COLORS.hudPanel;
    roundRect(ctx, 12, 12, 232, 62, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('REX MARLOWE', 24, 32);
    ctx.fillStyle = '#222';
    roundRect(ctx, 24, 40, 150, 12, 6);
    ctx.fill();
    ctx.fillStyle = p.health > 30 ? '#59e07a' : '#ff4d4d';
    roundRect(ctx, 24, 40, Math.max(0, 150 * (p.health / 100)), 12, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.hudGold;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`$${p.money}`, 184, 53);
    // Top-right: wanted stars.
    ctx.fillStyle = COLORS.hudPanel;
    roundRect(ctx, view.w - 196, 12, 184, 40, 8);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      star(ctx, view.w - 172 + i * 32, 33, 12, i < world.wanted);
    }
    // Top-centre: mission objective.
    const obj = currentObjective(world.missions);
    ctx.font = 'bold 15px system-ui, sans-serif';
    const tw = ctx.measureText(obj).width;
    ctx.fillStyle = COLORS.hudPanel;
    roundRect(ctx, view.w / 2 - tw / 2 - 14, 12, tw + 28, 32, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.hudGold;
    ctx.textAlign = 'center';
    ctx.fillText(obj, view.w / 2, 34);
    ctx.textAlign = 'left';
    // Bottom-left: speed and controls.
    if (p.inCar && p.car) {
      const kmh = Math.round(Math.abs(p.car.speed) * 0.32);
      ctx.fillStyle = COLORS.hudPanel;
      roundRect(ctx, 12, view.h - 62, 212, 50, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(`${kmh}`, 24, view.h - 26);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('km/h — E to exit', 86, view.h - 28);
    } else {
      ctx.fillStyle = 'rgba(12,14,20,0.6)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('WASD move · E enter car · Click shoot · F punch · Esc pause', 14, view.h - 16);
    }
    // Crosshair.
    if (!p.inCar) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      const mx = input.mouse.x;
      const my = input.mouse.y;
      ctx.beginPath();
      ctx.arc(mx, my, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 13, my);
      ctx.lineTo(mx - 5, my);
      ctx.moveTo(mx + 5, my);
      ctx.lineTo(mx + 13, my);
      ctx.moveTo(mx, my - 13);
      ctx.lineTo(mx, my - 5);
      ctx.moveTo(mx, my + 5);
      ctx.lineTo(mx, my + 13);
      ctx.stroke();
    }
    // Toasts.
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    let ty = 62;
    for (const msg of world.messages) {
      ctx.globalAlpha = Math.min(1, msg.t);
      ctx.fillStyle = COLORS.hudPanel;
      const mw = ctx.measureText(msg.text).width;
      roundRect(ctx, view.w / 2 - mw / 2 - 12, ty, mw + 24, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(msg.text, view.w / 2, ty + 19);
      ty += 34;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    drawMinimap(world, view);
  }

  function drawTitle(world, view, saveExists) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMAR', view.w / 2, view.h / 2 - 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('STREETS OF THE SUN', view.w / 2, view.h / 2 - 56);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('Rex Marlowe is back in Solmar Bay — broke, wanted, and one job away from', view.w / 2, view.h / 2 - 8);
    ctx.fillText('owning the city. Steal cars, outrun the cops, finish Mara\'s three jobs.', view.w / 2, view.h / 2 + 16);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText('ENTER — New game', view.w / 2, view.h / 2 + 66);
    if (saveExists) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('C — Continue your story', view.w / 2, view.h / 2 + 96);
    }
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('WASD move / drive · E enter & exit cars · Mouse aim, Click shoot · F punch', view.w / 2, view.h / 2 + 136);
    ctx.fillText('Esc pause · M mute · The game saves itself as you play', view.w / 2, view.h / 2 + 158);
    ctx.textAlign = 'left';
  }

  function drawPause(view) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.6)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', view.w / 2, view.h / 2 - 40);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Enter — Resume · R — Restart story · Q — Quit to title · M — Mute', view.w / 2, view.h / 2 + 8);
    ctx.textAlign = 'left';
  }

  function drawEnd(view, title, sub) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.62)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, view.w / 2, view.h / 2 - 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(sub, view.w / 2, view.h / 2 + 24);
    ctx.fillText('Press Enter to get back on the streets', view.w / 2, view.h / 2 + 56);
    ctx.textAlign = 'left';
  }

  function render(world, screen, ui, input) {
    const view = world.view;
    const cam = world.camera;
    ctx.clearRect(0, 0, view.w, view.h);
    drawGround(world, cam, view);
    drawBuildings(world, cam, view);
    drawPickups(world, cam);
    drawCars(world, cam, view);
    drawPeds(world, cam, view);
    drawPlayer(world, cam);
    drawBullets(world, cam);
    drawParticles(world, cam);
    drawBeacon(world, cam, view);
    if (screen === 'play' || screen === 'pause') drawHUD(world, view, input);
    if (screen === 'title') drawTitle(world, view, ui.saveExists);
    if (screen === 'pause') drawPause(view);
    if (screen === 'busted') drawEnd(view, 'BUSTED!', 'The Solmar Bay PD caught you — you lost $150.');
    if (screen === 'wasted') drawEnd(view, 'WASTED', 'You blacked out — the hospital patched you up for $100.');
  }

  return { resize, render };
}
