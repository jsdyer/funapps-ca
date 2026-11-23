# Gameplay audit — 23 November 2026

- Prevented startup and results-screen crashes when browser storage is blocked, corrupt, or contains a non-array save.
- Made delayed burst requests use the gameplay clock, so pause freezes arrivals and old events cannot leak into the next set/run.
- Added keyboard activation for the four lane buttons, and automatic pause on window blur.
- Guarded repeated upgrade selection, prevented an expired game from proceeding into another set, and allowed gameplay when audio is unavailable.

Verification: `node audit-tests.mjs` passes syntax, blocked/corrupt saves, paused burst requests, resumed spawning, and fresh-run state checks. DOM stubs verify logic; audio and visual rhythm timing still need a real browser playthrough.
