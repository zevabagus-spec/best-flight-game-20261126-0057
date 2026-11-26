# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/zevabagus-spec/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/zevabagus-spec/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

RIDGE RUNNER — a bush-plane valley run that plays entirely in the browser. You fly a light bush plane (RR-26) down a seeded mountain valley at dusk: thread glowing rings, mind the fuel, and put her down gentle on the strip. Three sorties over the same valley — Ring Run (8 rings, fuel is the clock), Canyon Dash (10 gates, 150 seconds, hard banking bleeds speed), and Strip Landing (fly the valley, then land inside the touchdown zone at a gentle sink rate). Static files, no build step, fully offline — every sprite is drawn in code, the terrain is a seeded procedural valley, and every sound is synthesized with WebAudio.

## How it flies

The chase camera sits behind and above the plane, looking down a valley rendered as a projected ribbon of segments: bending floor, rising walls, a meandering river, tree lines, and the runway at the end. Throttle, bank and pitch are a small honest flight model — speed comes from thrust against drag, a slow wing stalls and sinks, a banked turn changes heading, and an empty tank turns the plane into a glider with one decision left: where to land. The HUD is lit glass: airspeed and altitude readouts, a heading tape, a banking attitude ball, throttle/fuel/damage bars, the next ring's distance, and warnings that blink when the terrain gets close.

## Controls

- **W/S** or **↑/↓** — throttle
- **A/D** or **←/→** — bank (turn)
- **I/K** — pitch up / down
- **Mouse** — steer by position; **P** pause; **R** restart; **M** sound on/off
- **1 / 2 / 3** or click — pick a sortie on the menu

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged deterministically from the real sim (`?shot=menu|cover|rings|landing`, `?seed=` overrides the valley seed) — the autopilot flies the actual rules forward, so every shot is a frame the game can really reach.

## Files

- `game/src/config.js` — tuning constants and the three sorties
- `game/src/random.js` — seeded RNG and value noise for the terrain
- `game/src/terrain.js` — the valley: bends, floor, walls, trees, river, rings, runway
- `game/src/physics.js` — the plane: throttle, bank, pitch, fuel, damage, landing
- `game/src/world.js` — the sortie: rings, clock, score, end of flight
- `game/src/aircraft.js` — the bush plane, drawn in code
- `game/src/render.js` — the chase view: sky, ranges, ground, rings, runway
- `game/src/hud.js` — lit instruments, mission bar, menu and end screens
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/audio.js` — synthesized engine, wind, chimes
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — the fixed-step loop and screens

---

<sub>Entered on [make.fun](https://make.fun/?ref=pkrtjm47&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
