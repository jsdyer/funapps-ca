# Last Ferry to Newfoundland

A five-crossing deck-packing puzzle built with **React 19, TypeScript, Vite and native SVG**. It runs entirely in the browser; React and all game assets are bundled in `web/`. No external font, image, CDN, API or WebGL dependency is needed.

## Play

Pick a waiting vehicle and then select a deck lane. Each vehicle has a length in deck squares and a separate load weight. Load everyone within the lane capacities, then balance the total **Port** and **Starboard** weights within the displayed departure tolerance. Centre load does not affect the side difference. Later manifests require exact balance; wide lorries require the centre lane.

Select a loaded vehicle to return it to the queue. Other vehicles automatically close the gap. Undo reverses the latest change, and Harbour tip searches for a completion from the current deck. If an arrangement cannot be completed, it explains that a vehicle must be moved. Every manifest has a verified solution. There is no timer, money penalty or unwinnable locked state.

Once the deck is ready, **Sound the horn & sail** starts a 4.5-second decorative crossing. **Skip to arrival** completes it immediately. Arrival awards one to three stars and offers the next manifest or replay. All five crossings are selectable from the top row. The final crossing shows a deckmaster message once all five have been completed.

### Controls and accessibility

- Mouse/touch: choose vehicle, choose lane; select an aboard vehicle to unload it.
- Keyboard: Tab and Enter/Space work for every action, including SVG vehicles. When the page background is focused, `1`, `2`, `3` load the selected vehicle and `U` undoes.
- No dragging, held controls or time-critical input.
- Status messages are announced through a polite live region; selection uses `aria-pressed`; lane controls describe the selected vehicle.
- Reduced-motion users get a static crossing scene. Best stars are saved locally, with unavailable/malformed storage handled safely.

## Development

Requires Node 22.12+ (verified on Node 24.22.3).

```sh
npm ci
npm test
npm run build
```

`npm run dev` starts Vite. `npm run build` type-checks the app and regenerates `web/` with relative asset URLs. The repository's hub build copies `web/` to `/play/newfoundland-ferry/`.

`src/engine.ts` contains pure puzzle rules and the recursive hint solver. `src/main.tsx` contains React UI and SVG artwork. `src/style.css` includes responsive layouts and reduced-motion styling.

## QA walkthrough

1. First crossing: load **Red hatchback → Port**, **Blue coupe → Port**, **Bakery van → Centre**, **Garden van → Centre**, **Weekend camper → Starboard**. Port and Starboard both weigh 2; all five are aboard. Sail, skip to arrival, and verify three stars plus the next-crossing button.
2. Before finishing, select an aboard vehicle and confirm it returns to the queue; Undo restores it. Try a vehicle in a full lane and verify the explanatory message without losing the vehicle.
3. Open Freight night: select Wide grocery lorry and try Port. It must refuse with a centre-lane explanation. Load it in Centre.
4. Use Harbour tip repeatedly, loading the selected vehicle into the suggested lane. It should reach a valid full deck on every manifest. More than one hint earns one star, and no existing higher medal should be overwritten.
5. Final manifest solution in queue order: **Wide grocery lorry → Centre**, **Fish delivery → Port**, **Building supplies → Starboard**, **Family camper → Centre**, **Bakery van → Port**, **Mail van → Starboard**, **Cream hatchback → Port**, **Rose coupe → Centre**, **Sea-blue hatchback → Starboard**. Each side weighs 6; all capacities are exactly filled.
6. At phone width, verify queue cards form two columns, three lane buttons remain usable, SVG vehicles can be tapped, and balance/dispatch appear below the deck. Use Tab through controls at desktop width.
7. Reload after earning a medal to verify saved progress. Clear/block local storage and verify the game remains playable.

Tests cover every manifest's solvability, progressively constrained hint solutions, lane capacity, wide vehicle restrictions, incomplete/invalid decks, exact balance, and scoring.

## Regional inspiration and sources

The real Marine Atlantic route connects **North Sydney, Nova Scotia, and Port aux Basques, Newfoundland and Labrador**. The vessel, miniature deck, loads, crossing duration and rules in this game are fictional. They are not a real ferry loading or operating model, and the game does not present live schedules.

- [Marine Atlantic — Sailing Routes](https://www.marineatlantic.ca/sailing-information/sailing-routes)
- [Vite — Building for Production](https://vite.dev/guide/build.html) (relative `base: './'` for portable bundles)

Regional source checked on 2026-11-23. All artwork is original SVG/CSS.
