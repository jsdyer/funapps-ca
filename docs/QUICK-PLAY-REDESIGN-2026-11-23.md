# Regional games: immediate casual play

The twelve regional games now default to short action rounds. Each opens on a moving demonstration, gives a concise visual goal, and starts with one prominent button or supported first input. The catalogue's artwork, title and primary Play now link open the game directly. About this game remains a secondary link.

The original planning and puzzle modes remain available from secondary links. Existing public URLs are preserved, and no DNS changes are needed. The hub build regenerates all 30 game detail pages and the 46-URL sitemap from the updated catalogue.

| Game | Default activity | Original mode | Passing tests |
| --- | --- | --- | ---: |
| Signal Hill: 1901 | Steer the kite into the glowing reception zone to collect the three dots of Morse S | `classic.html` | 17 |
| Westward: Mountain Run | Jump rocks and collect mountain postcards | `?mode=planner` | 15 |
| North of the Harbour: Supply Run | Steer a sled toward orange supplies and away from dark ice | `?mode=planner` | 16 |
| Prairie Windrider | Sail a land yacht through mail pickups, wind and hay bales | `planner.html` | 17 |
| Niagara: Current Keeper | Move the water gate to fill the glowing basin | `?mode=planner` | 14 |
| Bonjour, voisin! — Québec | Match picture orders with bread, coffee and apples | `classic.html` | 16 |
| PEI Potato Harvest | Tap ripe potatoes and leave the rocks | `?mode=planner` | 15 |
| Fundy Tidekeeper | Steer a boat to collect golden crates as changing tides expose rocks | `puzzles.html` | 21 |
| Newfoundland Ferry | Match arriving cars to three shape-marked boarding lanes | `?mode=puzzles` | 13 |
| Kouchibouguac: Trail Ride | Steer an automatically pedalling bike through camera pickups and logs | `planner.html` | 13 |
| Cabot Trail: Postcard Cruise | Steer along the coast, collect postcards and avoid rocks | `classic.html` | 15 |
| Postcards from Canada | Snap moving landmarks as they enter the camera frame | `?mode=planner` | 12 |

## Signal Hill historical framing

The default game is inspired by Marconi's reception of the Morse letter S on December 12, 1901, transmitted from Poldhu, Cornwall. The scene uses a kite antenna and a receiver at the former hospital; Cabot Tower is a separate landmark. The reception-zone mechanic is a playful abstraction, not a reconstruction of radio propagation.

Primary references:

- [Parks Canada: Signal Hill designation](https://www.parks.canada.ca/culture/designation/lieu-site/signal-hill)
- [Parks Canada: Communications at Signal Hill](https://www.parks.canada.ca/lhn-nhs/nl/signalhill/culture/histoire-history/comm)

## Verification

- All twelve game suites passed: **184 tests**. The hub builder's **7 tests** also passed, for **191 checks** total with no skips or failures.
- Production releases were rebuilt for the games with build steps; TypeScript and Svelte checks passed where configured. Buildless game scripts passed syntax checks.
- The integrated Python build generated 30 detail pages and 46 sitemap URLs. Static entry points and retained HTML modes were checked for missing local assets; none were found.
- Browser checks covered the opening and start/interaction/pause states of all twelve quick-play modes. Visible scoring was confirmed in the café, potato field and ferry; Signal Hill displayed its receiving state. Fundy's original route puzzles also mounted successfully, and the roadtrip keyboard pause was checked while the SNAP control had focus.
- Browser testing caught and fixed Fundy's startup collision with the native HTMLElement `hidden` property; a mount regression test now covers it. Peer review also corrected focused-button keyboard handling, held pause keys, paused steering, and narrow-screen layouts.
- The cloud browser throttles animation heavily. Complete winning rounds for every game were **not** manually played through; automated game-rule tests cover the end conditions. Responsive CSS was reviewed, but this was not a physical-phone test.

No paid services, runtime CDN dependencies or new custom hostnames were added. The different existing browser stacks are retained. The older domain setup checklist remains in `FUNAPPS-AUDIT-2026-11-23.md` for manual completion.
