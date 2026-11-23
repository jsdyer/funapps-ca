# North of the Harbour

A complete, turn-based fictional Arctic research expedition from a Maritime visitor’s perspective. Built with **Vue 3, TypeScript, CSS and SVG**, with all runtime code bundled locally. No account, API, CDN, font download or WebGL is needed.

Production path: `https://funapps.ca/play/arctic-expedition/`.

## Gameplay

You begin at Harbour base with six field days, three actions per day, ten energy, ten warmth, eight rations and two camp kits. Record the **Glacier lookout, Weather ridge and Tundra garden** observations, then return to Harbour base and hand in the notebook. Mirror lake and Quiet inlet are optional notes that add points and flavour.

- Travel to a connected location: **1 action, 2 energy**, and the forecast’s **1 or 2 warmth**.
- Record an observation or optional note: **1 action, 1 energy, 1 warmth**. Notes cannot be recorded twice.
- Establish a camp: **1 action, 1 ration, 1 kit**. The camp stays available. Harbour base and Canvas shelter already have camps.
- Rest: **1 action and 1 ration**. Restore up to **5 energy and warmth at camp**, or **3 elsewhere**, capped at ten.
- Overnight: **1 ration**, then three fresh actions. A sheltered night restores up to five energy and warmth; an exposed night restores three energy but loses warmth according to the forecast.
- Keep energy and warmth **above zero**. If either runs out, the fictional team ends the trip and arranges a return. An overnight with no rations or ending day six without completing the mission also ends the expedition.
- **Hand in the notebook** at Harbour base completes the game as soon as all three required notes are recorded. This takes no action, so arrival with zero actions remaining can still win.

Score: 250 per required observation, 150 per optional note, 300 for returning successfully, 45 per remaining day, 8 per remaining energy/warmth and 15 per ration. Only the best successful score is saved on this device. Storage failure does not block play. The active trip starts fresh after a reload.

## Controls

All actions use labelled HTML buttons, including every travel choice. Click/tap, or Tab and Enter. Reachable map markers are an additional keyboard/pointer shortcut. Three moves are available each day; the game has no timer or mandatory animation waits. Ending a day with unused actions asks for confirmation. New expedition also confirms before replacing the current trip. Field guide and notebook dialogs trap keyboard focus and close with Escape; the intro is closed by starting.

The large map scrolls horizontally on smaller screens so terrain and labels remain readable. All actions and route costs also appear in the normal responsive page. Instructions are 16px, action labels 14–16px or larger, secondary metadata at least 12px.

## Build and verification

Node 24+ recommended (Node’s native TypeScript stripping is used for the tests).

```sh
npm ci
npm test
npm run check
npm run build
```

`npm run dev` starts Vite. Production files are in **web/** and use relative asset URLs. The parent FunApps Python builder copies this directory to `/play/arctic-expedition/`. Source logic is `src/engine.ts`, interface/artwork in `src/App.vue`, styling in `src/style.css`. Runtime Vue MIT notices are copied from `public/THIRD-PARTY-LICENSES.txt` into the release. Commit source, lockfile and rebuilt web output together.

Ten meaningful tests verify both complete routes below, map connectivity, action limits, overnight reset, camp deployment/recovery, non-repeatable observations, failures/recovery, deadline and final-day boundaries, no invalid/post-terminal actions, and input immutability. The rules module is type-checked and Vite compiles the Vue interface.

## Browser QA — straightforward winning expedition

Start with **Head north**. All named movements below use the destination buttons. “Observe” means **Record observation**. “Night” means **Settle in for the night**; if actions remain, confirm **Yes, end the day**.

| Day | Three actions | Overnight |
| --- | --- | --- |
| 1 | Canvas shelter; Glacier lookout; Observe | Exposed night at Glacier lookout |
| 2 | Weather ridge; Observe; Establish camp | Sheltered night at Weather ridge |
| 3 | Tundra garden; Observe; Canvas shelter | Sheltered night at Canvas shelter |
| 4 | Harbour base; Hand in the notebook | No overnight needed |

Expected finish: **day 4**, **8 energy**, **8 warmth**, **4 rations**, **1,328 points**, three required observations. The result should say **Home with a story**. Open the notebook to inspect the travel entries. Replay should reset all resources while preserving the best successful score.

## Optional five-note route

| Day | Three actions | Overnight |
| --- | --- | --- |
| 1 | Mirror lake; Collect a field note; Tundra garden | Exposed |
| 2 | Observe; Weather ridge; Establish camp | Sheltered |
| 3 | Observe; Glacier lookout; Establish camp | Sheltered |
| 4 | Observe; Quiet inlet; Collect a field note | Exposed |
| 5 | Weather ridge; Sheltered rest; Canvas shelter | Sheltered |
| 6 | Harbour base; Hand in the notebook | No overnight needed |

Expected finish: five notes, **day 6**, **8 energy**, **9 warmth**, **0 rations**, **1,486 points**. The route is tighter; rest at Weather ridge on day five matters.

Additional QA: try travelling after three actions (disabled), repeatedly recording the same note (disabled), making a camp at an existing camp (disabled), and resting at full resources (disabled). Start a fresh trip and travel without rest to exercise a warmth/energy ending. End days at base to test the six-day deadline. Verify map taps and the corresponding HTML route buttons do the same thing.

## Inspiration and source notes

The game’s field area, camps, routes, timing, weather forecasts, resources and research activities are inventions. It is not a real park map or expedition-planning/survival tool. The Maritime traveller’s notebook is fictional. No cultural identities, communities or traditions are simulated. Northern Canada is diverse; this tiny Arctic-inspired landscape does not represent every part of the territories.

Primary references consulted 23 November 2026:

- [Parks Canada — Quttinirpaaq nature and science](https://parks.canada.ca/pn-np/nu/quttinirpaaq/nature), for broad high-Arctic landscape inspiration: mountains, ice and sparse tundra. No real route was reproduced.
- [Vue — Quick Start](https://vuejs.org/guide/quick-start.html), for the Vite/SFC build approach.
- [Vite — Guide](https://vite.dev/guide/), for local production bundling.

All scene artwork was created as original SVG/CSS for the game.
