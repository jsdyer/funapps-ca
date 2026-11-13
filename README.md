# funapps.ca

A little corner of the internet for casual games, curious detours, and feel-good fun. Built for funapps.ca with Canada in mind.

## Activities

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
