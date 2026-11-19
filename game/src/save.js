// Saving and loading. One JSON blob in localStorage holds the player's money,
// story progress, position and health. Saving happens on mission completion,
// on being busted or wasted, and every twenty seconds of play; loading is the
// "Continue" choice on the title screen.

import { SAVE_KEY } from './config.js';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(world) {
  try {
    const data = {
      version: 1,
      money: world.player.money,
      health: world.player.health,
      wanted: world.wanted,
      missionIndex: world.missions.index,
      x: Math.round(world.player.x),
      y: Math.round(world.player.y),
      time: Math.round(world.time),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}
