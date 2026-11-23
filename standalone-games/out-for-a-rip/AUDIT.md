# Out for a Rip audit — 2026-11-23

Fixed these gameplay/control defects:

- Replaying kept the previous run's HUD timestamp, freezing the new HUD until the old elapsed time was reached. Replay now resets it.
- Opening Help left the run ticking under the overlay. Help now pauses the run and returns to an explicit resume screen.
- Lost focus, pause and other mode changes could retain held keys, joystick direction or boost. They now reset controls, and hidden tabs pause too. Pointer capture/cancellation and touch-action behavior are handled.
- Delayed upgrade and pickup callbacks ran on wall-clock time. Upgrade rewards could disappear when paused or leak into another run. They now belong to simulation time and reset with the run.
- A timer at 59.9 seconds displayed 0:00. Minute/second rounding is now consistent.
- Saved nested nulls/invalid values could crash upgrades/achievements or corrupt progression. Save fields are validated and bounded.
- Audio initialization failure could prevent a run from starting. Gameplay continues silently when audio is unavailable.
- Repeated suspension upgrades could exceed 100% resistance and heal pothole hits. Resistance is capped; collision damage remains positive.
- Bottle-refund luck could eliminate every other useful pickup. Other pickup types retain a share even at maximum luck.
- Angle interpolation could take a long turn across ±π. It now uses the shortest angular difference.
- A gull exactly on the player could divide by zero and become NaN. That case is guarded.
- Fatal collisions now end the run before a simultaneous delivery can repair the vehicle.

Added keyboard focus at start/resume, narrower touch controls for small phones, and reduced CSS motion for the system preference.

Validation: `node --test tests/regression.test.mjs` passes 8 tests using the production script in a mocked DOM/Node VM. Tests cover replay HUD, Help/focus pause and input reset, delayed upgrade pause/replay, malformed saves/missing audio, suspension limits, timer/angle boundaries, zero-distance gulls and pickup distribution. `node --check game.js` passes.

Source/logic audit only; no device/browser playthrough was run by this worker. Parent task owns browser verification and deployment.
