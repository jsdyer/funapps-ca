# Canada from the harbour — 23 November 2026

Six additional games explore Canada through a Maritime traveller’s perspective. Each has a distinct mechanic and runs directly under the existing FunApps domain; no new DNS records or custom-hostname changes are required.

| Game | Technology | Source directory under standalone-games/ |
| --- | --- | --- |
| [Westward: A Maritimer in the Rockies](https://funapps.ca/play/rockies-explorer/) | Svelte + TypeScript + SVG | `rockies-explorer` |
| [Prairie Windrider](https://funapps.ca/play/prairie-windrider/) | p5.js + Canvas 2D | `prairie-windrider` |
| [North of the Harbour](https://funapps.ca/play/arctic-expedition/) | Vue + TypeScript + SVG | `arctic-expedition` |
| [Bonjour, voisin! — Québec](https://funapps.ca/play/quebec-bonjour/) | Alpine.js + SVG | `quebec-bonjour` |
| [Signal Hill: Harbour Watch](https://funapps.ca/play/cabot-tower-signals/) | Web Components + Web Audio + SVG | `cabot-tower-signals` |
| [Niagara: Current Keeper](https://funapps.ca/play/niagara-currents/) | React + TypeScript + SVG | `niagara-currents` |

The mountain game explores the inland Rockies around Banff and Jasper. The Arctic expedition and all game maps, route costs and waterworks are fictional. Québec remains playable entirely with English help, without translation penalties. Signal Hill’s modern fictional puzzle is kept separate from its historical notes. Game READMEs contain the relevant primary references.

## Maintenance

Each directory includes source, test and build scripts, a README, and a deployment-ready `web/` release. Bundled third-party runtime licenses are retained. The normal Netlify build remains `python3 build.py`: it copies the checked-in releases and generates catalogue/detail pages and the sitemap.

Rebuild an individual game with `python3 scripts/build_new_games.py --slug <slug> --install --test`, then run `python3 build.py`. Commit source and rebuilt release together. The older custom-domain setup remains the owner’s manual task; this batch does not alter it.

## Validation

All 58 new-game tests and seven hub tests pass. Framework type checks and all six production builds pass. Niagara includes 480 randomized conservation cases within its rule suite; every Rockies expedition, prairie course, Niagara board and signal mission has a verified winning path. The Arctic and Québec suites verify complete journeys and recovery from invalid actions.

The hub generates 30 game detail pages and 46 sitemap URLs, including all six new play routes. Entry scripts/styles are local and present. The source review also improved Niagara channel labels and synchronized visual/audio Morse timing.

Live browser play-throughs passed on the production release `e5908b79aca7e0a13b9715f3fba602d11c20d383` (Netlify deploy `6b049ee82ce5d8ac0aefc041`, ready).

| Game | Observed result through the live controls |
| --- | --- |
| Rockies | First expedition completed with all three required sketches, 402 points and three badges. |
| Prairie | First delivery round completed in three sails, with both postcards delivered and three stamps. |
| Arctic | All three required observations returned to base on day four, with 1,328 points; the completed notebook opens correctly. |
| Québec | Full nine-place visit, optional melody and supper completed for 780 points. An intentionally wrong parcel offer retained the item and allowed recovery. English translations remained available throughout. |
| Signal Hill | All six watches completed with 18/18 stars. Optional sound enabled, replayed and muted through the controls without application errors. |
| Niagara | First chart completed in two turns, with 12/12 units at the falls, no spill or trapped water, and three droplets. Progression to the second chart works. |

No application console errors were observed on these play-throughs. Desktop layouts were visually reviewed; physical mobile/touch devices were not tested. Later Rockies, Prairie and Niagara rounds are covered by rule tests rather than complete live-browser runs.

All six play pages and six detail pages returned HTTP 200 with correct canonical URLs, game IDs and play links. All 22 local release assets matched the production SHA-256 hashes, including the p5.js vendor module. The live sitemap contains 46 unique URLs, including all six new play routes. The hub displays 30 cards; searching for “Québec” finds the one matching game, and clearing the search restores all 30.
