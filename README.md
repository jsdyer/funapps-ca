# funapps.ca

A little corner of the internet for casual games, curious detours, and feel-good fun. Built for funapps.ca with Canada in mind.

The public Netlify hub includes a configurable directory of standalone games, the original local activities below, and a central sitemap. The original games retain their own hosting; regional games are bundled into this hub at `/play/<slug>/`. Every catalogue game also gets a descriptive page.

## Publish the FunApps hub on Netlify

The production project is **funapps-hub**, with the Netlify address <https://funapps-hub.netlify.app/> and canonical domain <https://funapps.ca/>. Connect this repository in Netlify; `netlify.toml` supplies the build command `python3 build.py` and publish directory `dist`.

To preview the exact static output locally:

```sh
python3 build.py
python3 -m http.server 8080 --directory dist
```

Open <http://localhost:8080/>. Python 3 is the only build dependency. The build copies an explicit list of browser assets, preserves Packet Trace and the solo activities, and generates:

- the homepage catalogue, available without JavaScript;
- `/games/<slug>/` pages with descriptions, launch links, canonical URLs and structured data;
- `/play/<slug>/` for games with `local_bundle: true`, copied from their maintained `standalone-games/<slug>/web/` release;
- `/sitemap.xml`, `/robots.txt`, and a proper `404.html`;
- a redirect from `/games-sitemap.xml` and `/sitemap.php` to the central sitemap;
- an HTTPS `www.funapps.ca` redirect to the canonical apex domain.

The Netlify output does not include the optional multiplayer Node server or its UI. Those sources are retained for a separate Node deployment; Netlify static hosting cannot run its persistent rooms and Server-Sent Events server.

Add **funapps.ca** and **www.funapps.ca** as domains on this Netlify project before changing DNS. With external DNS, use the target Netlify recommends for the apex; if your DNS provider only supports an A record, the fallback is `@ A 75.2.60.5`. Use `www CNAME funapps-hub.netlify.app`. Keep existing game subdomains pointed at their own projects. In particular, do not point Donair or Clams at this hub.

Submit **https://funapps.ca/sitemap.xml** in the verified `funapps.ca` Google Search Console domain property once the domain serves this deployment. It contains the hub, game detail pages, the bundled games, Packet Trace, and the verified game subdomains listed in the catalogue. The foreign `netlify.app` game URLs remain working play links but are excluded from this domain's sitemap. A sitemap helps discovery; it does not guarantee indexing.

## Favicon

The gold game-controller mark is provided as `favicon.png` (96 × 96), `favicon.ico` (16–256 px), and `apple-touch-icon.png` (180 × 180). The homepage and inline activities share this tab icon. Each standalone game, its detail page, and Packet Trace use their own icon set. The former `/favicon.svg` URL redirects to the PNG. Keep these URLs stable for browser caches and Google Search; search-result icons update after Google recrawls the homepage and image.

## Add or edit a standalone game

Edit **`site.config.json`** and rebuild. No HTML editing is needed to update the catalogue, detail pages, search categories, count or sitemap. The game order follows the file, with `featured: true` entries first.

```json
{
  "slug": "your-game",
  "name": "Your Game",
  "url": "https://your-game.netlify.app/",
  "description": "A short, accurate description of what the player does.",
  "category": "Quick challenges",
  "icon": "🎮",
  "color": "#d9e2c5",
  "controls": ["Describe a confirmed way to play."]
}
```

Use a unique lowercase slug and an HTTPS play URL. `controls` is optional. Set `published: false` to retain an entry in configuration while hiding it from the site. After a game has a working custom domain under `funapps.ca`, set `include_play_url_in_sitemap: true` to include its launch URL too. Only the apex and its subdomains are eligible; third-party hostnames are deliberately excluded. Update the game's `url` when moving it to a custom domain so the directory always uses the intended address.

The builder rejects duplicate slugs, duplicate play URLs, unsafe URLs and malformed colours. Text is escaped in HTML and structured data. `catalogue.js` enhances the generated cards with search/category filters; the cards and links still work when JavaScript is unavailable.

Run the focused build checks with `python3 -m unittest test_build.py`.

## Regional games

| Game | Browser technology | Play path |
| --- | --- | --- |
| Fundy Tidekeeper | Native Web Components and SVG | `/play/fundy-tidekeeper/` |
| Cabot Trail: Postcard Cruise | Canvas 2D and JavaScript | `/play/cabot-trail/` |
| Kouchibouguac Trail Ride | Phaser 3, Canvas renderer | `/play/kouchibouguac-cycle/` |
| PEI Potato Harvest | Svelte and TypeScript | `/play/pei-potato-harvest/` |
| Newfoundland Ferry | React, TypeScript and SVG | `/play/newfoundland-ferry/` |
| Postcards from Canada | Vue, TypeScript and SVG | `/play/canada-roadtrip/` |
| Westward: Mountain Run | Svelte + TypeScript + SVG | `/play/rockies-explorer/` |
| Prairie Windrider | p5.js + Canvas 2D | `/play/prairie-windrider/` |
| North of the Harbour: Supply Run | Vue + TypeScript + SVG | `/play/arctic-expedition/` |
| Bonjour, voisin! — Québec | Alpine.js + SVG | `/play/quebec-bonjour/` |
| Signal Hill: 1901 | Web Components + Web Audio + SVG | `/play/cabot-tower-signals/` |
| Niagara: Current Keeper | React + TypeScript + SVG | `/play/niagara-currents/` |

The twelve regional games open in casual quick-play modes: moving scenes, concise visual cues and direct controls. Original planning, puzzle and adventure modes remain available from secondary links inside the games. Signal Hill rewards precise centre tracking while receiving the three dots of Morse S with Marconi's kite antenna in 1901. Westward jumps on the start of a press. Québec puts an anglophone diner at a restaurant table to practise ordering in French, with picture cues and optional English help.

Each game's source, tests, reference notes, and build instructions are in its `standalone-games/<slug>/` directory. The generated `web/` releases are committed, including framework code, so the production Python build needs no npm downloads. There are no runtime CDN dependencies or API keys. Rebuild a game's release after changing its source; commit both source and release.

To install locked dependencies, run the regional game rule-test suites, and rebuild the framework releases:

```sh
python3 scripts/build_new_games.py --install --test
python3 build.py
python3 -m unittest test_build.py
```

Without `--install`, the script uses existing local dependencies. Buildless games skip the build step. New bundled entries must use `https://funapps.ca/play/<slug>/` as their URL. These routes work without new DNS records; the previous custom-domain setup list remains in `docs/FUNAPPS-AUDIT-2026-11-23.md`.

## Activities

- **Packet Trace** — investigate and contain three simulated network breaches on a rotatable 3D topology. Use the device inspector or command console to follow evidence, isolate hosts, rotate credentials, and restore services.
- **The Canada Quiz** — eight randomly selected trivia questions, with immediate feedback.
- **The Great Unscramble** — Canadian-flavoured word puzzles with hints and answer reveal.
- **Cabin Match** — a relaxed six-pair memory game with no clock.
- **The Little Things Bingo** — a fresh 3 × 3 card celebrating everyday moments.
- **Postcard Shuffle** — guess the province or territory from five randomly selected postcards; collect stamps and explore the places afterward.
- **Tiny Road Trip** — choose one of five fictional region-inspired trips and make your own unhurried choices at three stops.
- **Northern Lights Studio** — compose an aurora scene, shuffle the sky, and download your artwork as an SVG.
- **Rain Window** — mix ambient sounds with independent volume controls and a sleep timer.
- **Postcard Maker** — customize an illustrated scene, stamp, and message, then download a PNG.

Browse by activity type, choose a random activity, or save favourite picks for later. Favourites are stored in the browser's local storage, not on a server; they may disappear if browser data is cleared. If local storage is unavailable they last only until the page closes. In-progress games and artwork reset when closed. Postcard links are optional external links; nothing is fetched for the activities themselves.

## Packet Trace

Open **Packet Trace** from the activity collection or visit `/packet-trace/`. Each incident advances on successful actions, so reading logs, checking links, and moving the camera leave the turn counter alone. The mission briefing identifies what needs to be restored. The debrief scores your response on speed, service availability, and whether the intrusion spread.

Use the map or the device list to select a node. The console supports `help`, `nodes`, `inspect`, `links`, `scan`, `isolate`, `rotate`, `restore`, `wait`, `brief`, `status`, `report`, and `clear`. For example, type `nodes` to see device IDs, then `scan <device-id>` to collect evidence. The same actions are available as buttons.

The network and incidents are fictional. The game runs entirely in the browser and sends no commands to real hosts. It works on static hosting and uses no packages or external services. Keep `packet-trace/` intact when publishing the browser assets. The scenarios and rules live in `engine.js`, the 3D camera and drawing code in `scene.js`, and the interface in `app.js`.

## Multiplayer

Open **Play together**, enter a display name and create a room. Share the link or six-character code with friends. Up to eight people can join a room and use text chat. The host can draw shared conversation cards between games.

- **Maple Quiz** — two to eight players answer five shared questions. Answers stay hidden until everyone has submitted or the host reveals the round.
- **Campfire Four** — two players take turns placing a token on a 5 × 5 board. Four in a row wins. The host and the first other connected player play while everyone else can watch and chat.
- **Cabin Mosaic** — paint a shared 12 × 12 pixel mural in real time. The host can open a canvas alone, and anyone in the room can contribute or export a PNG. Download a copy before ending the activity to keep it.

The host starts or ends activities, pauses new joins, and can remove a player. Share invitations with people you trust. A removed player can use the invite again while the room is open to new joins.

Keep the room tab to reconnect to the same seat after a reload or brief connection loss. A disconnected seat expires after about five minutes, and the host role can pass to a connected player after about 45 seconds. The room holds the latest 40 messages in memory. Rooms, matches, and chat disappear when all seats leave or expire, or when the process restarts.

## Run locally

With Node.js 22 or newer, run from the repository root:

```sh
node multiplayer/server.cjs
```

Open <http://127.0.0.1:8080/>. The server defaults to `127.0.0.1:8080`. Set `HOST` and `PORT` to override those values. There is no package installation, build step, or database. Use separate browser profiles or a private window to try a room with two seats.

For solo-only static hosting, publish the browser assets. Keep the server's `.cjs` files outside the document root. Multiplayer requires the Node process.

## Host with Apache

Run one Node process bound to loopback under your process supervisor. In the site's HTTPS virtual host, enable `mod_proxy` and `mod_proxy_http` and add:

```apache
ProxyPreserveHost On
ProxyPass "/" "http://127.0.0.1:8080/" timeout=60
ProxyPassReverse "/" "http://127.0.0.1:8080/"
```

Keep `/api/rooms/*/events` responses unbuffered and uncompressed through the proxy or CDN so room updates stream immediately. `GET /api/health` returns `{"ok":true}` when the app is reachable. Hostname and HTTPS configuration belong to your web server and DNS. Run a single process per site because rooms live in process memory.

## Multiplayer code

`multiplayer/server.cjs` serves the public files and HTTP routes. The explicit `SITE_FILES` list controls which files the server exposes. `rooms.cjs` manages room membership, chat, permissions, and per-player snapshots streamed over Server-Sent Events. `room-games.cjs` holds the authoritative game rules and quiz questions. The room browser client is in `multiplayer/rooms.js`. Cabin Mosaic keeps its server rules in `multiplayer/mosaic.cjs` and drawing controls in `multiplayer/mosaic.js`. Add or edit quiz prompts in `QUESTIONS`, with the correct option first.

## Add another activity

The original activities and their registry live in `games.js`; individual activities use `fg-*` styles from `games.css`. `postcards.js` registers itself, while `extensions.js` registers standalone modules such as `roadtrip.js` and `rain-window.js`. New activities can follow either pattern: expose metadata with a unique ID and a `mount(container)` function, then register it before `app.js` runs. Return a cleanup function from `mount` when an activity uses timers, audio, or other resources. The launcher calls it when the activity closes. Main site layout and browsing controls are in `index.html`, `app.js` and `styles.css`.

## Standalone game maintenance

Most independently deployed games are maintained as complete static releases in `standalone-games/<slug>/web/`. These releases were synchronized with their published Netlify files for the favicon update; earlier root-level source and audit files remain available for reference. Edit the maintained `web/` release, or rebuild it from the relevant source when intentionally changing a game. `published-baseline.json` records the hashes of the original downloaded production files.

Build deployment ZIPs with `python scripts/build_standalone.py`; upload the matching ZIP to the existing project. The packager preserves the release's existing metadata, redirects and game files. These games remain Netlify Drop projects, so a hub Git push does not deploy their code. Games marked `release_layout: project` keep their buildable source in `standalone-games/<slug>/project/`. The packager includes their tracked source and Netlify build configuration. Games marked `original-static` retain their original uploaded assets. The bundled games publish through the hub under `/play/<slug>/`.

### Game icons

Every standalone game and Packet Trace keep four files in `game-icons/<slug>/`: `source.png` (256 px), `favicon.png` (96 px), `favicon.ico` (16, 32, 48 and 64 px), and `apple-touch-icon.png` (180 px). The artwork uses recognizable game-specific subjects and contains no text. `game-icons/designs.json` records the illustration brief for each game.

The nine inline activities use 96 px card images from `activity-icons/<activity-id>.png`. Add a matching file when registering another inline activity. The hub emits card art under `/icons/`. Static releases use `scripts/game_favicons.py`. For a standalone framework project, copy the generated favicon formats into its public assets and update its page head and any install icon. The regional rebuild script also reapplies them after regenerating framework bundles. Icon URLs are relative to each release, so they work at a `/play/` path, a Netlify address or a future custom subdomain. Existing game-specific SVG files remain available for old bookmarks, while page declarations prefer the new PNG/ICO files.

Regenerate the sizes from the committed source images with `python scripts/render_game_icons.py` (Pillow is needed only for this artwork step; production builds still use Python's standard library). Keep the filenames stable. Google selects one favicon per hostname, so games under the same `funapps.ca` hostname retain the hub icon in Google Search even though browser tabs can show their own game icons.

See [the current production inventory and audit](docs/FUNAPPS-AUDIT-2026-11-26.md), [the November 2026 domain setup guide](docs/FUNAPPS-AUDIT-2026-11-23.md) and [DNS mapping](docs/funapps-dns.csv). The hub keeps working Netlify launch URLs while new domains await setup. Once DNS and HTTPS are ready, `python scripts/activate_domains.py --apply` verifies each game identity, changes ready links and rebuilds the sitemap; commit and push afterward.

## Lifestyle apps and analytics

The hub builds the four apps under `/apps/` from `lifestyle/`. Outdoor plans include permanent Halifax and Langley guides. The gift shortlist stores selections in the visitor’s browser. Gift prices are dated editorial checks in Canadian dollars. Update the item and verification date together when checking a shop again.

Game Night requests Canadian prices for the titles in `lifestyle/store-games.json` through the Netlify function `game-prices`. The response is cached at the edge for 30 minutes. The app can use its committed snapshot for up to 24 hours if the store is unavailable. After that, it labels suggestions as unpriced. Both the store request and the four apps work without private API keys. Run `netlify dev` to exercise the function locally or serve `dist/` to check the static fallback.

To activate Umami for the hub, add `UMAMI_SCRIPT_URL` and `UMAMI_WEBSITE_ID` to the Netlify project's build environment and rebuild. Both values are public fields from the site's Umami tracking snippet. Supply both together. The hub tracks pageviews, arcade launches, activity opens and saves, and outbound deal clicks. Standalone Netlify projects keep their own deployment settings.
