# Westward: A Maritimer in the Rockies

A complete, turn-based alpine route puzzle built with **Svelte 5, TypeScript and original SVG artwork**. A traveller from the Maritimes has brought a sketchbook and a thermos to the inland Canadian Rockies. Four fictional expeditions draw inspiration from Banff, Bow Lake country, the Icefields corridor and Jasper.

Production address: `https://funapps.ca/play/rockies-explorer/`.

## Play

Choose connected trails, climb through elevation bands, sketch the required views, and return to the trailhead before daylight runs out. Climbing consumes extra energy. Low contours and steep shortcuts give different route choices. A finite supply of tea restores energy, while each shelter's first break saves a ration. Optional sketches add points.

The whole game is turn-based. Actions resolve immediately and there is no timer, waiting animation, API, account, runtime CDN, external font, or WebGL dependency.

### Controls and rules

- **Pack the sketchbook** closes the introductory instructions.
- Click/tap a connected map marker or a **Walk to…** trail button. The route shows its full daylight and energy costs. The route buttons are the keyboard-accessible equivalent of the map; use Tab and Enter.
- Energy cost is the trail's base effort plus its positive elevation change. Descents have no extra ascent cost.
- **Sketch this view** costs one daylight and records the current lookout once. Required lookouts are marked with a star; other lookouts are bonuses.
- **Take a tea break** costs one daylight and one ration, restoring seven energy up to a maximum of twelve.
- **Shelter break** does the same, but each shelter's first break uses no ration. A break is unavailable at full energy.
- Return to **Trailhead** with every required sketch to win. Arrival on the last daylight point succeeds. Reaching zero daylight elsewhere, or returning without all sketches at zero daylight, ends the hike.
- **Undo** reverses an action, including an action that ended the game. **Trail hint** uses a search of the real game rules to offer one possible next action, or honestly reports that no winning route remains. Restart and expedition selection begin a fresh hike.
- All four expeditions are available immediately. Selecting an expedition discards the current hike; earned badges remain.
- Three badges reward finishing within the expedition's daylight target; otherwise a completed hike earns two. Score combines required sketches, bonus sketches, leftover daylight, energy and tea.
- Best badges are stored locally where available. Blocking storage does not prevent play. Reload starts a fresh first hike.

## Build and test

Requires Node 24 (native TypeScript stripping is used by tests).

```sh
npm ci
npm test
npm run check
npm run build
```

`npm run dev` starts Vite. `web/` contains the complete production release, with relative asset paths so it can run in a subdirectory or on its own static host. The parent FunApps build copies it to `/play/rockies-explorer/`. Rebuild `web/` after editing `src/` and commit both together. Runtime license notices are in `public/THIRD-PARTY-LICENSES.txt` and are copied into the release.

Nine rule tests cover full three-badge solutions to every expedition, ascent/descent costs, atomic invalid actions, immutable history for undo, single-use sketches, limited shelter/tea recovery, final-day win/loss boundaries, stranded-state detection, and scoring. Svelte check verifies the complete UI; production build bundles the runtime.

## Browser QA walkthrough

1. Open the game and close the introduction with **Pack the sketchbook**. Initial first-expedition supplies: 24 daylight, 12 energy, two tea rations, zero of three required sketches.
2. Complete the first expedition using this exact sequence. Every movement has an ordinary route button, so no canvas interaction is needed:
   - Walk to **Spruce bend**.
   - Walk to **Tea shelter**.
   - Walk to **High ridge**.
   - **Sketch this view**.
   - Walk to **Windy saddle**.
   - Walk to **Valley lookout**.
   - **Sketch this view**.
   - Walk to **Bluewater shore**.
   - **Sketch this view**.
   - Walk to **Trailhead**.
3. Expected result: **A grand day up country**, **402 trail points**, **three badges**, **18 daylight spent**, **three sketches**. Remaining supplies are six daylight, zero energy and two tea rations. Zero energy at the trailhead is allowed.
4. Use **Undo** from the result and confirm the game returns to Bluewater shore with the previous supplies; return again to win. The recorded best badge count must not decrease.
5. Choose **A lake worth the climb**. A complete three-badge route is Spruce bend → Tea shelter → High shoulder → Sketch → Tea shelter → Turquoise shore → Bow-country lookout → Sketch → Tea break → Turquoise shore → Sketch → Trailhead. Expected score **363**, with three daylight, four energy and one tea ration left.
6. At the Tea shelter with energy below twelve, use Shelter break. Tea remains unchanged and daylight decreases by one. After spending more energy and returning, the next break requires a ration.
7. Try **Trail hint**, make a move, and confirm the hint clears. Try spending daylight on detours; the hint must report when no complete route remains, and Undo/Restart remain available.
8. Check **How to explore**, Escape and keyboard Tab navigation. The page behind the modal is inert while it is open.
9. At narrow widths, the atlas scrolls horizontally and every travel/action button remains in the normal vertical page. The map labels are supplementary; the complete game can be played with the readable route buttons. No timed or precision gesture is required.
10. Refresh after earning a badge to verify the badge persists while the current hike resets. Source review and automated checks cover storage failure safely; root performs the live browser QA.

## Geographic and technical sources

Banff and Jasper are inland Canadian Rockies destinations in Alberta, not locations on the Pacific coast. The game uses broad regional inspiration only. Node names, trail geometry, elevation bands, resources, weather-free conditions and daylight units are invented for the puzzle. It does not provide hiking advice, real-time access information or a real trail map.

- [Parks Canada — Travelling the Icefields Parkway](https://parks.canada.ca/pn-np/ab/banff/visit/promenadedesglaciers-icefieldsparkway), consulted 23 November 2026. Confirms the Banff–Jasper corridor and its mountain, lake and icefield setting.
- [Svelte — Derived state](https://svelte.dev/docs/svelte/$derived), consulted 23 November 2026. Reactive state is derived without side effects.
- [Vite — Building for production](https://vite.dev/guide/build.html). The app uses `base: './'` and a locked local bundle.

All game artwork, maps, dialogue and puzzle data were created for FunApps. No external imagery is used.
