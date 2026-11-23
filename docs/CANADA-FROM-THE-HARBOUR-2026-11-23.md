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

Live browser play-throughs follow publication; results are added after verification.
