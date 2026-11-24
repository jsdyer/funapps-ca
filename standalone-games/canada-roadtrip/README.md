# Postcards from Canada

A moving cross-country postcard hunt made with **Vue 3, TypeScript and SVG**. The van drives automatically: tap SNAP or press Space as each landmark enters the camera frame. Ten views pass in a 48-second trip, from the Pacific to Newfoundland. A moving demonstration and one short cue replace the compulsory introduction. No accounts, network API, runtime CDN, or remote font is required.

The original turn-based journey remains available through **Trip planner** (`?mode=planner`). Its rules and walkthrough are retained below. Existing planner saves are preserved.

## Quick play

- **Let’s roll**, the SNAP button, or a tap on the scene starts the trip.
- Photograph the moving views inside the central frame. The frame and SNAP button turn gold at the right moment. Each view scores once, with up to 200 points for a centred shot; missed shots do not remove points.
- **Pause**, **P**, or **Escape** pauses the round. Leaving the tab/window pauses it too. Resume is explicit; a fresh trip clears the current score and collection.
- The end screen lists collected views and a local personal best. No camera permission or actual photograph capture is involved; this is an illustrated arcade game.
- Reduced-motion preference stops the attract animation and removes flashes/bobbing. Gameplay scenery still moves because timing is the mechanic.
- `src/QuickPlay.vue` and `src/quick-engine.ts` implement the default. The old app and its styles load only in planner mode.

Quick QA: load the page and verify scenery is visible immediately, start, snap while the frame glows, verify score/card increase, pause/resume, then finish and restart. Six new rule tests cover all ten captures, duplicate/missed shots, demo, pause/resume, bounded deltas and completion/reset.

Production address: `https://funapps.ca/play/canada-roadtrip/`.

## Build and run

```sh
npm ci
npm test
npm run build
npm run dev
```

Node 24 or newer is recommended (tests use Node's native TypeScript stripping). Production is the `web/` directory; `web/index.html` uses relative, locally bundled assets and can be served under any subdirectory. The parent FunApps Python build copies this directory. `src/engine.ts` contains all deterministic game rules; `src/App.vue` renders the UI and SVG map. The lockfile pins all dependencies.

## Rules and controls

- Click/tap **Start your trip**. Tab and Enter operate ordinary buttons, including route choices. Map nodes are an additional pointer shortcut; every action is available through a labelled button.
- Begin with 32 fictional travel days, $1,500, a full 100-unit tank, 100% van condition and 5 driver energy.
- Pick a route card and press **Drive to…**. Every route shows its exact day, fuel, cash and wear costs. Each leg costs one driver energy. Unaffordable travel is disabled, with a reason.
- **Fuel** buys up to 20 units at $2 per unit, capped at a full tank. It takes no day. **Rest** costs a day and $20, restoring five energy. **Repair** costs a day and $80, restoring up to 50 condition, capped at 100.
- **Explore & collect a postcard** costs a day plus the shown local cost. Each stop’s postcard can only be collected once. Vancouver and St. John’s cards are automatic. Aim for seven or more, but reaching the destination is the win condition.
- Reach St. John’s before time expires. Arrival on the last day succeeds. Using the last day at another stop ends the trip. Players can end a stranded trip or start again at any time.
- Score: 100 per postcard, 45 per distinct province, 12 per remaining day, one per $10 remaining, and 500 for finishing.
- **Trip journal** records arrivals and experiences. **Open collection** displays illustrated postcards. **New trip** asks before replacing the current journey.
- Saves locally after each change where browser storage is available. Storage failure does not prevent play. No personal data or analytics are sent anywhere.

## Browser QA walkthrough

1. Load the production directory. Intro shows purpose, starting supplies and rules. Click **Start your trip**.
2. The map highlights the van in Vancouver and its next road to Revelstoke. Drive there; days fall to 30, fuel to 74, money to $1,465 and energy to 4.
3. Pick **Jasper** and then **Banff** to confirm route highlighting and costs change. Continue using the following winning itinerary. “Explore” means **Explore & collect a postcard**; use the displayed fuel button the number of times stated.

| Current stop | Actions before driving | Next stop |
|---|---|---|
| Vancouver | — | Revelstoke |
| Revelstoke | Explore | Banff |
| Banff | Explore | Regina |
| Regina | Explore, Fuel once | Winnipeg |
| Winnipeg | Explore, Fuel once | Thunder Bay |
| Thunder Bay | Rest, Fuel twice | Sudbury |
| Sudbury | Fuel once | Ottawa |
| Ottawa | Explore | Montréal |
| Montréal | Fuel once | Québec City |
| Québec City | Explore, Fuel once | Fredericton |
| Fredericton | Rest, Fuel once | Halifax |
| Halifax | Explore, Fuel twice | St. John’s |

Expected finish: **9 postcards, 3 days, $370, 12 fuel, 9% condition, 3 energy, 1,878 points**. The ending shows a finished journey and postcard gallery.

4. Verify fuel cannot exceed 100; already collected cards cannot be purchased again. A blocked drive explains whether fuel, rest, repairs, money or days are missing.
5. Verify New trip → Keep this trip preserves progress; Start fresh resets to the intro. Reload midway and check that progress resumes. With local storage blocked, play still works.
6. At a narrow width, the map can scroll horizontally; all route and service buttons remain in the normal single-column page. Use keyboard Tab/Enter through the intro and main controls. Background content is inert while a modal is open.

## Automated verification

`npm test` has six rule-focused tests: a winning main route with nine postcards, a viable northern/Toronto/PEI route, atomic blocked travel, fuel and repair caps, non-repeatable postcards, and the final-day win/loss boundary. `npx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler src/engine.ts` checks the rules module. `npm run build` verifies the Vue production bundle.

## Place and technical references

The game is inspired by real Canadian places. The map is an illustrated route diagram, not a navigation map; roads, fares, fuel units, costs and compressed travel times are entirely fictional. The Halifax–St. John’s edge represents multiple mainland/island road legs and a ferry, not a direct ferry service.

- [Destination Canada — Road trips](https://travel.destinationcanada.com/en-ca/road-trips)
- [Destination Canada — The best road trips in Canada](https://travel.destinationcanada.com/en-ca/things-to-do/best-road-trips-in-canada)
- [Destination Canada — Three road trips through Atlantic Canada](https://travel.destinationcanada.com/en-ca/things-to-do/canada-by-car-three-road-trips-through-atlantic-canada)
- [Vue official quick start](https://vuejs.org/guide/quick-start.html)
- [Vite official guide](https://vite.dev/guide/)

All SVG artwork and game data were created for this game. The Vue runtime is locally bundled; its MIT license is retained in the package distribution.
