# Fog Over Fundy audit — 2026-11-23

## Changes

- Replaced restart/resume animation scheduling with one continuous animation loop. Rapid pause/resume or replay cannot start overlapping simulations.
- Pausing, tab hiding and window blur stop gameplay and clear keys, pointer fire, joystick input and mobile fire. Added an on-screen Pause button and keyboard-friendly upgrade selection.
- The first mouse press now updates aim from the actual click position. Pointer cancellation/lost capture releases fire and the joystick. Touch controls work on larger touchscreens; touch fire targets the nearest enemy. Keyboard-only fire follows the boat heading.
- Blocked local storage and unavailable Web Audio no longer prevent startup or game-over results.
- Piercing projectiles now hit each target once instead of repeatedly damaging the same target during overlapping frames.
- Colliding gulls are removed correctly. Wave advancement occurs once after collision processing; boss transitions and delayed spawns use paused simulation time and are cleared on replay. Wave boundaries clear old hazards.
- Fatal hits stop the remainder of the simulation frame, preventing score changes after results appear. Browser modifier shortcuts remain available.

## Verification

`node --test tests/regression.cjs` — 5 passing tests. The VM harness executes the actual inline game script with a lightweight DOM/clock and covers blocked storage/audio, one-loop replay, first-click aiming, cancelled touch controls, pause input clearing, piercing collisions, boss-transition timing/restart, touch targeting and blur pause. JavaScript syntax check passed.

Browser rendering and physical touch interaction were not tested by this audit worker; the owning agent handles browser review. The VM harness is a logic regression check, not a browser substitute.
