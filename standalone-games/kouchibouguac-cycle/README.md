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
