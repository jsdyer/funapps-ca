# FunApps audit and domain setup — 23 November 2026

The audit covered all 18 listed standalone Netlify games and the regular FunApps activities. The main improvements address broken progression, stuck or inconsistent controls, timers continuing through pause, duplicate game loops, and unreliable saved progress.

**Release status:** All 18 standalone game updates and the duplicate YES B’Y deployment were published and marked ready in Netlify. The hub improvements and generated sitemap are included in this source release.

## Domain setup

Donair Dash and Clams & Chips already have working custom domains. Two more domains were added to their existing Netlify projects: **outta-hand.funapps.ca** and **souwester.funapps.ca**. They still need DNS records. The remaining **14 domains are planned, not configured in Netlify**.

Netlify returned this account-plan limit while adding the next domain: “custom_domain can only be changed 3 times per hour on this plan”. The remaining setup is left to you as requested. Existing Netlify project names and addresses are retained.

For each row marked **Planned**:

1. Open the existing Netlify project whose name matches the CNAME target without `.netlify.app`.
2. In its domain management, add the exact `funapps.ca` domain listed below.
3. In the DNS zone for `funapps.ca`, add a **CNAME** using the part before `.funapps.ca` as the hostname and the listed Netlify hostname as its target. The target contains no `https://` or path. Keep an ordinary/default TTL.
4. Wait for DNS verification and a valid HTTPS certificate. Open the custom address and confirm it serves the intended game before switching links.

For **outta-hand** and **souwester**, start at step 3. Leave the existing **donair** and **clams** records in place. If a hostname already has an A, AAAA or CNAME record, inspect that existing record before replacing it; a CNAME cannot coexist with other address records for the same name.

The companion [funapps-dns.csv](funapps-dns.csv) contains the same mapping, short DNS hostnames, project names and next actions.

| Game | Custom domain | CNAME target | Netlify status |
| --- | --- | --- | --- |
| Donair Dash | `donair.funapps.ca` | `soft-khapse-6eba6b.netlify.app` | Existing domain live |
| Clams & Chips: Fryday Rush | `clams.funapps.ca` | `clams-funapps.netlify.app` | Existing domain live |
| Kitchen Party: Outta Hand! | `outta-hand.funapps.ca` | `polite-flan-9cfec6.netlify.app` | Configured in Netlify; DNS pending |
| Sou’wester Survival | `souwester.funapps.ca` | `grand-mermaid-96fb8f.netlify.app` | Configured in Netlify; DNS pending |
| True North Turbo | `turbo.funapps.ca` | `startling-sunburst-a54d03.netlify.app` | Planned; add in Netlify, then DNS |
| Kitchen Party: Coast-to-Coast Chaos | `coast-to-coast.funapps.ca` | `deluxe-crepe-96ca99.netlify.app` | Planned; add in Netlify, then DNS |
| One More Tune! | `one-more-tune.funapps.ca` | `earnest-licorice-5a7566.netlify.app` | Planned; add in Netlify, then DNS |
| Double-Double Empire | `double-double.funapps.ca` | `delightful-basbousa-d3a469.netlify.app` | Planned; add in Netlify, then DNS |
| SOME GOOD! — The Great Maritime Gauntlet | `gauntlet.funapps.ca` | `zesty-strudel-74c18c.netlify.app` | Planned; add in Netlify, then DNS |
| Some Good Kitchen Party | `kitchen-party.funapps.ca` | `tourmaline-vacherin-14601c.netlify.app` | Planned; add in Netlify, then DNS |
| The Trans-Canada Trek | `trek.funapps.ca` | `teal-puffpuff-416dc8.netlify.app` | Planned; add in Netlify, then DNS |
| Keep ’Er Goin’! | `keep-er-goin.funapps.ca` | `superlative-valkyrie-a47571.netlify.app` | Planned; add in Netlify, then DNS |
| YES B’Y! — The Great East Coast Clicker | `yesby.funapps.ca` | `super-malasada-822d82.netlify.app` | Planned; add in Netlify, then DNS |
| Out for a Rip | `rip.funapps.ca` | `loquacious-kashata-3d2d49.netlify.app` | Planned; add in Netlify, then DNS |
| Maritime Merchant: The Cabot Trail | `merchant.funapps.ca` | `stirring-capybara-79a5a5.netlify.app` | Planned; add in Netlify, then DNS |
| Kitchen Party Tycoon | `party-tycoon.funapps.ca` | `bucolic-starship-966249.netlify.app` | Planned; add in Netlify, then DNS |
| Some Good Game — East Coast Mayhem | `mayhem.funapps.ca` | `golden-blancmange-09bd5c.netlify.app` | Planned; add in Netlify, then DNS |
| Fog Over Fundy | `fundy.funapps.ca` | `kaleidoscopic-mochi-6070f2.netlify.app` | Planned; add in Netlify, then DNS |

## What changed

| Game | Main fixes and improvements |
| --- | --- |
| Donair Dash | Holding a touch direction no longer causes an extra movement jump on release. Multiple touches are tracked separately; pause, replay and focus loss clear held controls. |
| Clams & Chips | Fryers pause when the browser loses focus. Malformed high scores are rejected and gameplay shortcuts leave editable fields alone. Existing fryer timing and order-accounting tests pass. |
| Kitchen Party: Outta Hand! | Fixed three modes spawning the player inside the central table. Movement follows screen directions, collisions slide along furniture, and pause/menu/upgrade changes clear input. |
| Sou’wester Survival | Fixed duplicate spawn timers after replay and a crash on the final-life collision. Added pause/resume, touch steering, portrait framing and a readable graphics failure screen. |
| True North Turbo | Fixed the permanent upgrade loop after round six. Corrected pointer coordinates on portrait/letterboxed canvases and keyboard steering fighting an old pointer position. Added visible pause and numbered upgrade choices. |
| Coast-to-Coast Chaos | Added mobile pause and a visible carried-item display. Delayed events now respect pause and run boundaries; replay retains one animation loop. Touch menus can scroll. |
| One More Tune! | Delayed guest bursts pause correctly and cannot leak into another set/run. Added lane-button keyboard activation, blur pause, and safe handling of bad saves or unavailable audio. |
| Double-Double Empire | Added automatic saving, validated imports, safer reset and modal handling. Loading a save clears temporary events and restores upgrade state; failed clipboard copying offers manual copy. |
| Great Maritime Gauntlet | Added pause/resume, including round delays and recurring spawns. Keyboard button activation works, held keys cannot repeatedly complete tap tasks, and failed microgames no longer award success. |
| Some Good Kitchen Party | Added pause and focus-loss handling. Each interaction refreshes its target; already-served guests cannot score twice. Unsupported graphics now show a clear explanation and return link. |
| The Trans-Canada Trek | Town dialogs block actions behind them. Travel stops at towns and uses fuel for the actual distance covered; insufficient fuel no longer grants a full day of travel. Improved keyboard navigation and final-arrival behavior. |
| Keep ’Er Goin’! | Pause now freezes rhythm/candle challenges and music. Old callbacks are cleared between runs; holding an action key cannot complete a tap challenge. Both boots must actually be removed. |
| YES B’Y! | Validated saved/imported progress, enforced upgrade unlocks, saved purchases immediately and cleared temporary effects on import/reset. Improved keyboard dialogs and elapsed-time accounting. |
| Out for a Rip | Fixed replay’s frozen HUD, Help leaving gameplay running, stuck inputs, and delayed rewards crossing runs. Corrected timer rounding, upgrade limits, fatal-collision ordering and several movement edge cases. |
| Maritime Merchant | Trades save immediately and reload preserves the market. Corrupt saves fall back safely; trade controls retain keyboard focus. Added portable save export/import. |
| Kitchen Party Tycoon | Upgrade prices remain consistent after reload. Added safe storage handling, elapsed-time income, portable save export/import and small-screen improvements. |
| East Coast Mayhem | Added keyboard controls and pause across instructions, rounds and transitions. Repeated taps cannot count one blueberry twice; replay removes old handlers and timers. |
| Fog Over Fundy | Fixed overlapping animation loops, first-click aim, cancelled touch controls, repeated piercing damage and gull removal. Boss transitions respect pause; replay clears old hazards and pending spawns. |

The regular FunApps hub also received keyboard-flow improvements for the quiz, unscramble, memory and postcard activities. Long activity dialogs keep the Close button visible and contain background scrolling. Packet Trace now explains the next action, disables actions that cannot currently succeed, and moves focus to the final report.

## Verification and limits

Source and logic checks ran against the actual game scripts and engines. They cover pause/resume timing, restart cleanup, touch ownership, progression, corrupted/blocked storage, economic state, import validation and invalid actions. The Donair and Clams engine suites pass, alongside the action, party-game, driving, strategy, Mayhem and Fundy regressions.

The hub’s introductory Packet Trace mission was also completed in the browser (Grade S, score 100), and quiz focus transitions were verified. The hub’s nine inline activities passed DOM interaction checks, including quiz/replay, memory completion, postcard progression, road-trip choices, SVG output and real canvas rendering for Postcard Maker. All three Packet Trace mission win paths pass. The existing hub build tests and JavaScript syntax checks passed during the audit.

Browser checks started, paused and resumed all ten edited 2D action games, including True North Turbo. The five strategy/idle games were clicked and their displayed state updated. These are focused smoke checks, not complete long-run playthroughs of every random event, upgrade or microgame.

The available cloud browser has WebGL disabled. The fallback screens were verified for **Outta Hand**, **Sou’wester Survival** and **Some Good Kitchen Party**; their rendered 3D gameplay still needs a browser/device with WebGL. Physical touch feel and every mobile layout have not been exhaustively tested.

## Sitemaps, links and saved progress

The central sitemap has updated `lastmod` dates for this audit. Each standalone game has a prepared sitemap and canonical URL for its assigned custom domain. The hub continues to use the working Netlify addresses for pending domains and will not publish those domains as play links before HTTPS is valid. After adding the domains, run `python scripts/activate_domains.py` to check HTTPS and the game identity. Run it with `--apply` to update only the verified catalogue URLs and rebuild the hub, then commit and push the result. The per-game source and audit notes are retained under `standalone-games/`; the hub build excludes those source directories from its public output.

Browser saves belong to an address. Progress on a `netlify.app` address does **not** automatically appear on the new `funapps.ca` address. **Double-Double Empire, YES B’Y!, Kitchen Party Tycoon and Maritime Merchant** have portable save export/import controls: export from the old address, open the new address, and import the saved code. Keep that copy until progress is confirmed. Other local high scores/settings also remain separate between addresses.

## Ideas to consider next

These are concepts for your review; no new games were built as part of this audit.

| Concept | What makes it distinct |
| --- | --- |
| **Fundy Tidekeeper** | A turn-based puzzle where a rising and falling tide changes which causeways, islands and harbour gates can be crossed. Plan several moves ahead using a stylized tide clock. |
| **Harbour Dispatcher** | A Halifax-inspired ferry dispatch game: queue passengers, assign boats and protect connections while fog and vessel turnaround affect capacity. Start with fictional schedules so it stays maintenance-free. |
| **Last Light on the Coast** | A lighthouse signal puzzle. Rotate beams, decode short flash patterns and guide boats between islands through fog; each level has a clear, solvable signal sequence. |
| **Where Does This Road Go?** | A Canadian road-sign detective game: infer a province or region from combinations of route shields, sign typography, distances and landscape clues. Original illustrations keep assets consistent. |
| **Say That Again, B’y** | A regional phrase quiz with meaning, usage and an explanation after each answer. Research and attribute expressions before writing questions, and allow more than one region where usage overlaps. |
| **Rails to Trails** | A relaxed route-building puzzle inspired by converted rail corridors. Join towns, ferries, bridges and campsites while balancing grades and limited track pieces; Atlantic maps could be the first set. |

Fundy Tidekeeper and Harbour Dispatcher would add the most variety beside the existing kitchen-party games and clickers.

## Other Netlify projects

The unlisted `funny-mermaid-9568eb` project was an identical YES B’Y copy. It received the same fixes; no new catalogue entry or domain was created. `flourishing-naiad-659496` returns 404 and its published deploy points to `jsdyer/jsdyer.github.io` (the separate PHP/tools project). It was left unchanged because it is outside this game catalogue.
