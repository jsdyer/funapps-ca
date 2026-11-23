# East Coast Mayhem audit — 2026-11-23

## Changes

- Added Pause/Resume controls and P/Escape shortcuts, with automatic pause on tab hiding and window blur. Pausing freezes the current microgame, instruction countdown and result transition; resuming preserves the remaining time.
- Added keyboard gameplay: numbered target shortcuts, Tab/Enter target activation and Space/Enter for full-screen timing/tapping tasks. Target numbers appear when keyboard input is used. Targets receive accessible labels and focus indicators.
- Fixed repeated taps counting the same blueberry more than once during its removal animation.
- Restart now cancels the previous frame, event handlers and transition timer. Paused and completed rounds ignore further actions.
- Added focus handoff on round start, pause/resume and game over; browser modifier shortcuts remain available.

## Verification

`node --test tests/regression.cjs` — 4 passing tests. The VM harness executes the actual inline script and checks initialization for all 10 microgames, pause preserving prompt/round time, blocked paused actions, duplicate blueberry taps, numeric keyboard/Space actions and restart cleanup. JavaScript syntax check passed.

Browser rendering and physical touch interaction were not tested by this audit worker; the owning agent handles browser review. The VM harness is a logic regression check, not a browser substitute.
