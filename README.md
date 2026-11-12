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

Browse by activity type, choose a random activity, or save favourite picks for later. Favourites are stored in the browser's local storage, not on a server; they may disappear if browser data is cleared. If local storage is unavailable they last only until the page closes. In-progress games and artwork reset when closed. Postcard links are optional external links; nothing is fetched for the activities themselves.

## Run locally

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. For Apache, copy the files into the site's document root; no PHP, database, dependency installation, or build step is required. Set up HTTPS and DNS separately through your hosting provider. The repository alone does not configure the funapps.ca domain or publish the site.

## Add another activity

The original activities and their registry live in `games.js`; individual activities use `fg-*` styles from `games.css`. `postcards.js` registers itself, while `extensions.js` registers the standalone `roadtrip.js` and `extra.js` modules. New activities can follow either pattern: expose metadata with a unique ID and a `mount(container)` function, then register it before `app.js` runs. Activities that start timers or other resources should arrange cleanup when `FunGames.unmount(container)` is called. Main site layout and browsing controls are in `index.html`, `app.js` and `styles.css`.
