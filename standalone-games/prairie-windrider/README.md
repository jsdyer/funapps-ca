# Prairie Windrider

Five wind-vector delivery puzzles seen through the eyes of a fictional Maritime sailor travelling inland. Choose a heading and sail strength, account for the crosswind, deliver postcards at prairie stops, and reach the depot within the move budget. This is a puzzle about predictable vectors and obstacles, not a real land-sailing simulator.

**Technology:** JavaScript ES modules, **p5.js 2.4.0** in explicit **Canvas 2D (`P2D`)** mode, ordinary accessible HTML controls. All gameplay state changes immediately on an action. `noLoop()` and `redraw()` draw only when needed; the game has no real-time animation dependency, timer, WebGL, API, account, CDN, or remote font.

Production URL: `https://funapps.ca/play/prairie-windrider/`.

## Build

Node 22+ is sufficient; verified with Node 24.22.3.

```sh
npm ci
npm test
npm run build
```

The complete production directory is `web/`. Deploy it recursively, including `vendor/`. Every runtime URL is relative, so the release works under a subdirectory or standalone hostname. `src/engine.mjs` contains deterministic rules and a breadth-first hint solver; `src/game.js` contains HTML interaction and the p5 canvas artwork. `src/index.html` and `src/style.css` are the page shell and responsive style.

The build copies the upstream, **unmodified and unminified** p5 ESM distribution to `web/vendor/p5.esm.js` (about 3.7 MB before HTTP compression). It has no unresolved bare imports and is directly imported as a separate module, so it remains replaceable by a compatible modified library. The local source and complete LGPL 2.1 licence are linked from the game's field notes. The exact npm dependency is pinned in the package and lockfile. This intentionally uses more source bytes than a minified bundle in exchange for straightforward source availability and replacement.

## Rules

- The chart is 12 columns, A–L, and eight rows, 1–8. North is up.
- Select one of eight headings and a sail strength of 1, 2, or 3 grid spaces. A diagonal sail changes both axes by that amount.
- The current wind adds one space in its shown direction. For example, East ×3 plus an eastward breeze moves four columns east.
- The dashed preview shows the exact landing. Wet ground and fences block any part of the segment. Off-chart, blocked, and completely cancelled sails are rejected without spending a move.
- A postcard is delivered only when the buggy **lands** on its marker. Passing through it does not count. Deliver every postcard, then land on the depot marker.
- **Brake & wait** keeps your position, spends one move, and advances the wind forecast. **Undo** takes back a move; **Restart** resets the current course.
- **A sailor’s hint** selects the next heading and strength on a complete route. If no finish fits in the remaining budget, it says to undo or restart. Hints do not reduce stamp ratings.
- Finish at or below the course's par for three stamps, within two additional moves for two, or within its budget for one. Best stamps are saved locally; blocked browser storage does not prevent play. A reload starts a fresh first round.

## Controls

Click/tap heading, sail strength, and **Set sail**. All game actions are ordinary focusable buttons; use Tab and Enter with a keyboard. Arrow keys set cardinal headings; Q/E/Z/C set northwest/northeast/southwest/southeast; 1/2/3 set sail strength. Space sails only when focus is not on another interactive control. Escape closes the instructions dialog using native dialog behaviour.

The canvas is visual only. Current position, landing, delivery coordinates, forecast, invalid-path explanation, and a disclosure listing blocked grid spaces are also available as HTML text. There are no drag-only interactions.

## Browser QA

1. Load the release. The introductory dialog appears, with a drawn big-sky prairie course behind it. Click **Let’s catch a breeze**.
2. First course starts at **B7**, heading East, strength 3. The current wind pushes east. **Set sail to F7** delivers Golden Elevator and uses one move.
3. Click **North**, choose **1 Reefed**, then **Set sail to G6**.
4. Click **Northeast**, choose **3 Full sail**, then **Set sail to K3**. Both postcards are delivered and the depot is reached. Expected: **3 sails, 3 of 3 stamps**, success panel and **Next delivery round**.
5. Undo after the win. The prior position and next-sail controls return; the best stamp record remains. Sail again or restart.
6. Choose **The crosswind run**. Its forecast alternates East/North. Brake & wait changes the wind without changing position. Check Undo restores both position and forecast.
7. Select an out-of-bounds or blocked preview. The launch button disables with a specific explanation, and no move is charged.
8. Waste the whole budget with Brake & wait. The loss panel appears; Undo and Retry recover immediately.
9. Use hints repeatedly on another course and follow them to the finish. Keyboard and pointer controls should produce identical states.
10. Check a narrow display: course navigation scrolls horizontally, game controls stack beneath the complete chart, and no horizontal page overflow is needed. All control text is at least 14px; main instructions are 16px.

### Exact three-stamp solutions

Heading abbreviations match the compass controls; the number is sail strength. Each item is one **Set sail** action.

| Course | Sequence | Moves |
| --- | --- | --- |
| A sea of grass | E3, N1, NE3 | 3 |
| The crosswind run | N1, NE2, N2, SE3, S3, N1, N2 | 7 |
| Around the slough | N3, N3, E2, E3, SE3, S1, N3, N3 | 8 |
| Fence-line figures | N3, NE1, S2, SE3, E1, S1, NE3, NE2, NW1 | 9 |
| Last post, long light | N1, N2, NE1, N2, E3, SE2, E3, SE1, SW3, SW2, W3, NW2 | 12 |

Eleven tests cover solvability and three-stamp pars for all courses, the first-course walkthrough, wind vector addition, swept-path collision, invalid input, waiting and wind phases, exact station landing, move-budget endings, final-move victory, immutability, duplicate prevention, and coordinate labels.

## Place and technology references

The names of all stops and layouts are invented. Big skies, agricultural horizons, and wetland interruptions are inspired by the Canadian Prairies. The text does not suggest that real prairie terrain is uniformly flat or that land sailing is permitted on farms or natural grassland.

Official sources consulted 23 November 2026:

- [Tourism Saskatchewan — Explore Living Skies](https://www.tourismsaskatchewan.com/explore-living-skies)
- [p5.js — createCanvas and P2D](https://p5js.org/reference/p5/createCanvas/)
- [p5.js — noLoop](https://p5js.org/reference/p5/noLoop/)
- [p5.js — redraw](https://p5js.org/reference/p5/redraw/)
- [p5.js 2.4.0 upstream](https://github.com/processing/p5.js/tree/v2.4.0)

All game artwork is original procedural drawing. The upstream p5 library and its embedded dependency notices retain their respective licences; see `web/THIRD-PARTY-LICENSES.txt` and `web/vendor/p5.esm.js`.
