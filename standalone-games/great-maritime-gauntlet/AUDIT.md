# Gameplay audit — 23 November 2026

- Added a visible Pause button, P/Escape shortcut, Resume overlay, and automatic pause when the window loses focus or the page is hidden.
- Moved round delays, recurring spawns, and microgame timers onto pause-aware animation scheduling. Finishing a round cancels its pending callbacks.
- Made Sorry/Wave/Shovel buttons work with native keyboard activation; holding Space no longer generates repeated actions.
- Clear held movement when the window loses focus.
- A broken microgame no longer silently awards a successful round.

Verification: `node audit-tests.mjs` passes syntax, pause/hidden timer freeze, once-only delayed callbacks, resumption and per-round cleanup checks. Tests use a virtual animation clock and DOM stubs; the full eight-game visual playthrough is not claimed.
