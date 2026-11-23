# Six new Canadian games — 23 November 2026

The new games play directly on funapps.ca. They require no new DNS records and are included in the catalogue, individual game pages, search, category filters, and sitemap. The existing hostname setup is still left for the owner; no automation was created and no remaining hostname changes were retried.

| Game | Technology | Source directory under standalone-games/ |
| --- | --- | --- |
| [Fundy Tidekeeper](https://funapps.ca/play/fundy-tidekeeper/) | SVG + Web Components | `fundy-tidekeeper` |
| [Cabot Trail: Scenic Drive](https://funapps.ca/play/cabot-trail/) | Canvas 2D | `cabot-trail` |
| [Kouchibouguac: Trail Ride](https://funapps.ca/play/kouchibouguac-cycle/) | Phaser 3 | `kouchibouguac-cycle` |
| [PEI Potato Harvest](https://funapps.ca/play/pei-potato-harvest/) | Svelte + TypeScript | `pei-potato-harvest` |
| [Newfoundland Ferry](https://funapps.ca/play/newfoundland-ferry/) | React + TypeScript + SVG | `newfoundland-ferry` |
| [Postcards from Canada](https://funapps.ca/play/canada-roadtrip/) | Vue + TypeScript + SVG | `canada-roadtrip` |

## Maintenance

Each game includes a README with its rules, control scheme, build instructions and relevant geographic references. Framework runtimes are bundled with the game. No game needs accounts, API keys, or a third-party runtime CDN. Fictional route geometry, simplified travel times and game rules are identified as such.

All six release directories are under `standalone-games/<slug>/web/`. Their source and lockfiles live alongside them. The main deployment remains a Python static build; it copies these already-built releases to `/play/<slug>/` and adds canonical and game-identity metadata.

Run `python3 scripts/build_new_games.py --install --test` when rebuilding from a fresh checkout, then `python3 build.py` and `python3 -m unittest test_build.py`. Commit source and rebuilt releases together. `scripts/build_standalone.py --slug <slug>` can also package a game's complete release, including nested bundle assets, for a future independent static host.

## Domain setup

These games use the existing funapps.ca domain, so the earlier Netlify hostname rate limit does not block playing them. The remaining original-game setup instructions are in [the audit report](FUNAPPS-AUDIT-2026-11-23.md) and [DNS CSV](funapps-dns.csv). No additional Netlify sites or custom domains were created for this batch.

## Verification

All 52 game-rule tests and all 7 hub tests pass. All six releases build successfully; Svelte reports no errors or warnings and the ferry build includes a TypeScript check. Entry-point scripts and styles resolve locally, all six play URLs appear in the 34-URL sitemap, and standalone packaging preserves nested assets. The catalogue now contains 24 games.

The managed local preview service timed out during startup, so browser interaction checks used the published games.

| Game | Live browser check |
| --- | --- |
| Fundy Tidekeeper | First round completed in six turns for three lanterns; tide progression and deliveries worked. Fixed a misleading map label after completion. |
| Newfoundland Ferry | Loaded all five first-crossing vehicles, sailed, arrived, and earned three stars. |
| PEI Potato Harvest | Played a complete twelve-turn season; all three orders delivered, nineteen premium crates grown, surplus settled, and final score 383. |
| Postcards from Canada | Completed Vancouver to St. John’s with nine postcards, three days left, $370, twelve fuel and 1,878 points. Collection gallery showed all nine postcards. Fixed singular/plural labels. |
| Cabot Trail | Canvas scenery rendered; start, steering input, pause and resume controls exercised. Full four-photo completion is covered by engine tests. |
| Kouchibouguac | Phaser Canvas map rendered; start, trail selection and pause controls exercised. Complete loop and optional detour are covered by engine tests. |

No game-origin JavaScript errors were observed. Full real-time browser play-throughs of the driving and cycling games remain unverified: animation frames advanced unusually slowly in this cloud browser. Their timing and complete winning paths pass automated engine tests; source review found no concrete update-loop stall. Mobile layouts were reviewed in responsive CSS, not on physical touch devices.
