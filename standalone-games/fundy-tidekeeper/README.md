# Fundy Tidekeeper

A six-round turn-based causeway puzzle inspired by the Bay of Fundy. Sail-free, combat-free: deliver supplies, pick up island visitors, read the tide, and return to Harbour before the end of the shift.

## Technology and delivery

- Native JavaScript modules, **Web Components** (`<fundy-game>`), and a procedural **SVG** archipelago. No framework, Canvas, WebGL, external runtime, or API service.
- Deployment entry point: `web/index.html`. Copy the whole `web/` directory unchanged. All local URLs are relative; suitable for `https://funapps.ca/play/fundy-tidekeeper/` or a standalone origin.
- Source and deployable files are the same. **No build step or dependencies.**
- Run tests: `npm test` in this directory, or `npm test --prefix standalone-games/fundy-tidekeeper` from the repository root.
- For local play, serve `web/` with an HTTP static server; native modules cannot be loaded reliably from `file://`.

## Mechanics

Each turn is a crossing to a connected island or a wait. A six-step tide rises from 0 to 3 and falls back to 0. Causeways have a clearance of 0, 1, or 2; bridges (3) remain open at every tide. A crossing uses the tide shown **now**, then advances the tide one step. All islands are safe waiting places.

Pickups and deliveries occur automatically on arrival; the keeper can carry all parcels and visitors. Complete the manifest **and return to Harbour** before the turn budget expires. Delivering on the last allowed turn counts as a win. Three lanterns require the tested shortest route, two allow three extra turns, and one rewards any completion within the budget. All six rounds are available from the round selector.

The keeper's hint runs a breadth-first search from the current state and supplies one valid next action. It says when the remaining turn budget cannot complete the round. Undo is unlimited and free, including after a win or a loss. Restart resets the current round. Best lantern counts are saved defensively to `localStorage`; gameplay works if storage is blocked or corrupt.

## Controls and accessibility

- Click/tap a connected island or a labelled crossing button.
- `1`–`7`: attempt to visit the corresponding numbered island.
- `W`: wait one turn. Space also waits when no interactive control is focused; focused buttons retain standard Space activation.
- `U`: undo. `R`: restart.
- All controls are native buttons/selects with keyboard focus; Tab/Enter work normally. Map buttons have labels describing location/reachability, and the text route list provides equivalent navigation.
- Persistent live announcement for action feedback. Forecast and manifest use text as well as colour. Reduced-motion preferences are respected. No ticking real-time clock, audio, motion requirement, or external font.

## Verification

`test/engine.test.js` has 14 tests, including shortest-route solvability for every authored round, automatic cargo transitions, deadline boundaries, immutability for undo, invalid/flooded crossing rejection, tide wrap, bridges at all phases, and hint recovery after a detour.

### Browser QA walkthrough

1. Open `web/index.html` over HTTP. On round 1, **Fresh lantern** should be on board at Harbour. Low water should be shown.
2. Cross **Spruce Isle**, then **Beacon**. Lantern changes to delivered, but round continues until Harbour is reached.
3. Cross **Spruce Isle**. Tide is now high, the Harbour path is underwater, and that route button is disabled.
4. **Wait one turn** twice, then cross **Harbour**. Win: **6 turns**, **3 lanterns**. This is the first round's optimal route.
5. Undo should return to a playable state at Spruce Isle; cross Harbour again to win. Click Next round, select any round from the selector, use a hint, and test restarting.
6. On any fresh round, wait until its budget expires. A loss panel appears. Undo recovers a playable state. Restart returns to turn 0.
7. Reload after a win: best lanterns should persist. Inspect a phone-width viewport: map and text navigation stay within width, sidebar moves below chart, buttons remain tappable.

Par routes (island IDs match `engine.js`; `wait` is W):

| Round | Par | Route |
|---|---:|---|
| The first lantern | 6 | g, b, g, wait, wait, h |
| A way back | 6 | wait, r, w, g, wait, h |
| The northern light | 9 | w, wait, h, g, n, b, w, wait, h |
| Seal Cove supper | 8 | g, n, w, wait, wait, s, r, h |
| Before the fog | 10 | g, h, g, w, b, n, b, s, r, h |
| Keeper of the bay | 12 | g, n, wait, g, h, r, s, b, w, r, wait, h |

## Geographic inspiration

The imaginary islands, causeways, turn durations and missions are game design, not a real geographic map or tide forecast. The footer states this explicitly.

One factual note is sourced to [Parks Canada — Tides in Fundy National Park](https://parks.canada.ca/pn-np/nb/fundy/nature/environment/marees-tides), accessed 2026-11-23: the difference between high and low water at Fundy National Park can reach 12 metres. No real-time tide predictions or real-world crossing advice are provided.
