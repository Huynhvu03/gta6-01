# Solmar: Streets of the Sun

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Huynhvu03/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/Huynhvu03/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the make.fun
gta6-01 bounty. Everything is original: the city of Solmar Bay, its people,
its cars, its story, its art and its sounds — nothing from Rockstar Games.

Rex Marlowe is back in Solmar Bay, broke and one job away from owning the
city. Steal cars, outrun the Solmar Bay PD, and finish Mara Voss's three
jobs: a first drive across town, a hot pickup at the south docks, and a
showdown with the Vipers' black sedan circling the park.

## What is in the game

- A city to explore on foot and by car: a road grid with buildings, a
  central park, a beach, parking lots and a waterfront
- Driveable cars — enter and exit any car, steal traffic cars (the driver
  bails and the law notices)
- Traffic that follows the roads and pedestrians who stroll the sidewalks
  and run when things get loud
- A wanted level (0–5 stars) with police cars that chase and ram you and
  foot cops who arrest you if they catch you standing still
- Three story missions with a phone call, a map beacon and cash rewards
- Combat on foot: aim with the mouse, shoot, or punch up close
- A HUD with health, money, wanted stars, speed, a live minimap and the
  current objective — plus street-cash pickups to grab
- A start screen, pause menu, busted / wasted screens and a save that
  lives in localStorage (the game saves itself as you play)
- Synthesised sound: engine hum, sirens, gunshots, crashes and a bass
  line, all made with WebAudio — no audio files, no network

## How to run it

Serve `game/` with any static file server and open `game/index.html` in
desktop Chrome:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Node, from the repository root: `node serve.ts` (serves `game/` on
port 8080). No build step, no network requests, no install.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk, or drive (W accelerate, S brake / reverse, A D steer) |
| E | Enter / exit a car |
| Mouse + click | Aim and shoot (on foot) |
| F | Punch |
| Esc / P | Pause |
| M | Mute |
| Enter | Confirm / respawn |

## Layout

- `game/index.html` — the page and its canvas
- `game/src/config.js` — tuning and palette
- `game/src/city.js` — the city: roads, buildings, park, beach
- `game/src/random.js` — seeded random
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sound and music
- `game/src/entities.js` — traffic, pedestrians, police, the rival car
- `game/src/missions.js` — the three-job story
- `game/src/world.js` — the simulation: driving, combat, wanted, pickups
- `game/src/render.js` — canvas painting, HUD and minimap
- `game/src/shots.js` — staged scenes for the screenshots
- `game/src/save.js` — localStorage save and load
- `game/src/main.js` — boot, the game loop and the screens
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`
- `screenshots/` — four real renders of the game

## Screenshots

The four screenshots are staged with `?shot=start|drive|chase|mission`
(`&seed=N` fixes the city), which paints a scene from the game's own code.

## Tested

- Node smoke test of the simulation: city builds (151 buildings), traffic
  and pedestrians move, stealing a parked car is free while carjacking
  raises the wanted level, shooting a pedestrian raises it too, police
  cars and foot cops spawn at wanted 3, all three missions advance and
  pay out, and a 60-second soak runs with no errors.
- Played live in headless Chrome: title screen → Enter → on-foot play,
  the world steps, the HUD and minimap render, zero console errors.
- `main.ts` run twice produces byte-identical output (dossier 469,874
  bytes; game 13 files, 87,498 bytes; screenshots 63–77 KiB each).
