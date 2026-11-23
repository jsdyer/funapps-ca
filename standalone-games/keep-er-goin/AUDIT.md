# Gameplay audit — 23 November 2026

- Pause now works during the rhythm and candle challenges and preserves whichever modal was active.
- Added P/Escape and automatic pause on blur/hidden page; pauses stop both challenge timers and background music.
- Scheduled gameplay callbacks use active game time and are cleared on restart/end, preventing old guests, rewards and challenges from leaking into the next run.
- Converted stations/minigame buttons to click activation; added keyboard focus and Enter/Space to illustrated stations, guests and Buddy.
- Prevented a held key from completing a tapping challenge and stopped keyboard events from triggering a second action after opening a challenge.
- Repeatedly clicking one removed boot no longer unlocks the entrance without removing both.

Verification: `node audit-tests.mjs` passes full script syntax, paused gameplay callbacks, new-run timer cleanup, and frozen rhythm/candle states during pause/hidden page. Tests use DOM stubs; mobile visual scale and timing feel still need a real browser playthrough.
