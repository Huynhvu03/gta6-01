// The story: three jobs from Mara Voss, each a small state machine. A mission
// is a list of steps; the world checks the step's condition every frame and
// this module advances it, pays the reward and hands the player the next job.
// Names, places and people are all invented for Solmar Bay.

import { MISSION_REWARDS } from './config.js';
import { roadCenter } from './city.js';
import { makeRivalCar } from './entities.js';

export const MISSION_DEFS = [
  {
    id: 'first-wheels',
    name: 'First Wheels',
    giver: 'Mara Voss',
    brief: 'Rex, welcome to Solmar Bay. Grab any car and meet me at Sunset Plaza. The city is yours — just don\'t get caught.',
    steps: [
      { type: 'goto', x: roadCenter(2), y: roadCenter(2), text: 'Get to Sunset Plaza' },
    ],
  },
  {
    id: 'the-pickup',
    name: 'The Pickup',
    giver: 'Mara Voss',
    brief: 'A package is waiting at the south docks. Pick it up on foot, then bring it to the old ferry terminal. The Vipers tipped off the cops — expect heat.',
    steps: [
      { type: 'goto', x: roadCenter(10), y: roadCenter(10), text: 'Drive to the south docks' },
      { type: 'pickup', x: roadCenter(10), y: roadCenter(10), text: 'Get out and grab the package' },
      { type: 'deliver', x: roadCenter(2), y: roadCenter(10), text: 'Deliver the package — lose the cops!' },
    ],
  },
  {
    id: 'viper-hunt',
    name: 'Viper Hunt',
    giver: 'Mara Voss',
    brief: 'The Vipers torched my garage. Their black sedan is circling the park — wreck it, then come back to me. Ram it, shoot it, whatever it takes.',
    steps: [
      { type: 'chase', x: roadCenter(5), y: roadCenter(4), text: 'Wreck the black Viper sedan' },
      { type: 'return', x: roadCenter(5), y: roadCenter(5), text: 'Return to Mara' },
    ],
  },
];

export function createMissions() {
  return {
    index: 0,
    step: 0,
    storyDone: false,
    target: null,
    text: '',
    rival: null,
    started: false,
  };
}

export function startMission(missions, index, world) {
  const def = MISSION_DEFS[index];
  if (!def) {
    missions.storyDone = true;
    missions.target = null;
    missions.text = 'Story complete — Solmar Bay is yours. Free roam!';
    return;
  }
  missions.index = index;
  missions.step = 0;
  missions.started = true;
  const step = def.steps[0];
  missions.target = { x: step.x, y: step.y };
  missions.text = step.text;
  if (step.type === 'chase' && !missions.rival) {
    missions.rival = makeRivalCar(world.city);
    world.rival = missions.rival;
    world.cars.push(missions.rival);
  }
}

export function currentObjective(missions) {
  if (missions.storyDone) return 'Free roam — the city is yours';
  const def = MISSION_DEFS[missions.index];
  return `${def.name}: ${missions.text}`;
}

export function updateMissions(missions, world, events) {
  if (missions.storyDone || !missions.started) return;
  const def = MISSION_DEFS[missions.index];
  const step = def.steps[missions.step];
  const p = world.player;
  const dx = step.x - p.x;
  const dy = step.y - p.y;
  const dist = Math.hypot(dx, dy);

  if (step.type === 'goto' || step.type === 'deliver' || step.type === 'return') {
    if (dist < 60) advanceStep(missions, world, events);
    return;
  }
  if (step.type === 'pickup') {
    if (!p.inCar && dist < 44) {
      world.wanted = Math.max(world.wanted, 2);
      world.wantedTimer = 0;
      advanceStep(missions, world, events);
      events.push('phone');
    }
    return;
  }
  if (step.type === 'chase') {
    if (missions.rival && missions.rival.health <= 0) {
      advanceStep(missions, world, events);
    }
    return;
  }
}

function advanceStep(missions, world, events) {
  const def = MISSION_DEFS[missions.index];
  missions.step += 1;
  if (missions.step >= def.steps.length) {
    const reward = MISSION_REWARDS[missions.index] || 100;
    world.player.money += reward;
    events.push('missionDone');
    events.push(`paid:${reward}`);
    const next = missions.index + 1;
    if (next >= MISSION_DEFS.length) {
      missions.storyDone = true;
      missions.target = null;
      missions.text = 'Story complete — Solmar Bay is yours. Free roam!';
      missions.started = false;
    } else {
      startMission(missions, next, world);
      events.push('phone');
    }
    return;
  }
  const step = def.steps[missions.step];
  missions.target = { x: step.x, y: step.y };
  missions.text = step.text;
  events.push('objective');
}
