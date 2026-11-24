# Action-first Trail Ride

The default game is now a moving, full-screen 50-second bicycle ride. Pedalling is automatic: steer into bright camera tokens and dodge brown logs. A brief animated demonstration runs before play without consuming the player's timer or score. No route choices or instructions dialog blocks the first ride. A single **Ride!** button starts, and the first steering input can also start it.

- **Controls:** A/D or left/right, drag on the trail, or large left/right buttons. Tab + Enter also operates the steering buttons in useful steps. P or Escape pauses. Space starts or pauses when not on a button.
- **Round:** cameras award 100 points; bumps only reduce the end-of-round bonus, so a mistake never traps the player in a failure screen. All rounds end at 50 seconds with score and replay.
- **Safety of input:** pointer cancellation, key release, blur and hidden-tab pause clear held controls. Simulation uses bounded elapsed seconds. Reduced-motion preference stops the attract demo.
- **Original game:** `planner.html` retains the existing route-planning adventure, its controls, and tests. The default screen links to it as **Trail planner**.

### Quick-play validation

`npm test`: 13 tests (7 original planner tests and 6 arcade-rule tests). Covers ready mode, frame-independent steering, camera/log collisions, pause/resume, bounded deltas, finish-once scoring and restart. `npm run build` bundles both Phaser entries with local assets and licensing.

Browser QA: confirm the trail moves behind the opening card, click Ride!, hold left/right or drag to cameras, hit a log for a nonfatal bump, pause/resume, and allow the 50-second finish. Replay must show zero photos/bumps and 50 seconds. Follow Trail planner to retain the original adventure.

---

# Kouchibouguac — A Good Day to Ride

A complete, local-first cycling adventure made with **Phaser 3.90.0** in explicit **Canvas mode** (no WebGL dependency). Every tree, trail, waterway, marker and bicycle is drawn procedurally. The production bundle includes the engine; no CDN, account, API, remote font or external art is required to play.

## Game

Plan a miniature afternoon through woodland, wildflowers, a lagoon and a river. Choose branches in the cycle network, photograph four landscapes, manage energy, and return to the trailhead before four **simulated** hours run out. Rest shelters recover more energy in less time; resting at any junction prevents energy dead ends. An optional bird-hide detour adds a fifth photograph and points. The clock only advances while riding or taking an action, so route decisions are relaxed. Scores reward photographs, remaining daylight and energy. Only the best score is stored locally; blocked localStorage is handled safely.

The rider follows curved trails automatically. This is an itinerary-and-exploration adventure, not a twitch steering game. All trail selection and game actions are available through ordinary accessible HTML buttons outside the Canvas.

### Controls

- **Click/tap a destination button** below the map to ride an adjoining trail. A route shows its time, energy cost and terrain.
- **Click/tap a neighbouring marker** on the map for the same action.
- **Arrow keys / WASD:** at a junction, select the adjoining trail most closely matching that direction. The bicycle rides automatically and stops at the next junction. Held keys do not accidentally select another trail.
- **Take a photo:** at each uncollected landscape; Space also takes a photo when focus is not on a button.
- **Rest:** restores energy at any junction; shelter breaks are more efficient.
- **Finish ride:** available at the trailhead after all four required photos. Space also finishes when focus is not on a button.
- **P / Escape / Pause:** pause and resume. Leaving the tab or browser window pauses automatically.
- **Start a new ride:** restarts immediately. Best score is preserved.

## Build and tests

```sh
npm ci
npm test
npm run build
```

The deployment-ready files are in `web/`. All runtime URLs are relative, so the game can be hosted under `/play/kouchibouguac-cycle/` or on an independent domain. `src/engine.mjs` is deterministic game logic; `src/main.js` is the Phaser scene and accessible DOM interface. `web/game.js` is the bundled, minified Phaser/game output. Do not commit `node_modules/`.

Seven Node tests cover a complete winning loop with the optional detour, invalid/exhausted routes, duplicate photos, finish eligibility, daylight expiry, frame-rate independence, and curve endpoints in both directions.

## Browser QA walkthrough

1. Load `web/index.html` through HTTP. The illustrated map is visible behind an introductory panel. Start with **Let's ride**.
2. Choose **Leaning pine**. The rider follows the curved woodland path (about nine real seconds), energy and daylight decrease, and destination buttons lock during travel. Take a photo on arrival.
3. Choose **Wildflower marsh**; take a photo. Choose **Lagoon lookout**; take a photo. Use **Trailside rest** before continuing.
4. Choose **River bend**; take a photo. For a bonus, visit **Bird hide**, take a photo and rest. Return to **Trailhead** and **Finish ride**. A scored winning panel should appear, including all five collected stamps.
5. Start another afternoon. Check arrow keys work even after clicking Start; P pauses, and Resume continues without elapsed-time catch-up. Click another browser tab, then return: the game should remain paused.
6. For a shorter shelter route, go from a landmark to **Rest shelter**, then choose another branch. A shelter break restores 65 energy for 12 virtual minutes; an ordinary break restores 38 for 18 minutes.
7. Waste daylight in repeated routes/rests to verify the dusk ending, then restart.
8. At narrow widths, the full map remains visible and destination/action buttons wrap below it. The intro panel can scroll on very short displays. Touch play needs no keyboard or drag gesture.

## Place and source notes

This is a **fictional, simplified cycle network**, not a navigation aid or real-distance representation. The terrain and gentle cycling emphasis are inspired by the park; the network, route costs, campsite layout, rest actions and story encounters are game inventions. On real visits, use designated cycling trails; beaches and dunes are not cycling routes.

Primary source consulted 23 November 2026: [Parks Canada — Cycling in Kouchibouguac National Park](https://parks.canada.ca/pn-np/nb/kouchibouguac/activ/velo-bike). This documents woodland, wildflowers, saltwater lagoon scenery, Leaning Pine, a bicycle-path network and rest shelters. The game does not reproduce a real trail map or imply cycling on beaches/dunes.

Technology reference: [Phaser API documentation](https://docs.phaser.io/). The installed dependency is pinned to Phaser 3.90.0; the current main documentation may describe later major releases. Engine behavior used here is verified against the installed Phaser source and package build.
