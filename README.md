# funapps.ca

A little corner of the internet for casual games, curious detours, and feel-good fun. Built for funapps.ca with Canada in mind.

## Games

- **The Canada Quiz** — eight randomly selected trivia questions, with immediate feedback.
- **The Great Unscramble** — Canadian-flavoured word puzzles with hints and answer reveal.
- **Cabin Match** — a relaxed six-pair memory game with no clock.
- **The Little Things Bingo** — a fresh 3 × 3 card celebrating everyday moments.

Games run locally in the browser. There are no accounts, server-side components, external libraries, analytics, or saved progress. Closing a game resets that session.

## Run locally

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. For Apache, copy the files into the site's document root; no PHP, database, dependency installation, or build step is required. Set up HTTPS and DNS separately through your hosting provider. The repository alone does not configure the funapps.ca domain or publish the site.

## Add another game

Add a game function and its metadata to `games.js`, register it in the `games` map, and include its card details in the `list` array. Each function receives a container element; return a cleanup function if the game creates timers or other resources. Common game styling lives in `games.css`, and the main layout is in `styles.css`.
