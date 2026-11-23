# Audit — 2026-11-23

Fixed a blocking spawn bug: three game modes placed the player inside the solid central table. New runs now start in clear floor space. Movement follows screen directions instead of diagonal world axes, and collision slides along furniture instead of cancelling both axes. Cleared keyboard, joystick, interaction and dash state across pause, focus loss, menus and upgrades; suppressed repeated pause toggles and upgrade double-clicks. Clamped simultaneous snack-life losses and made storage/audio failures nonfatal.

Validation: `node action-regression.cjs` (from this directory) checks source syntax and selected gameplay invariants across all four audited action games. Outta Hand tests cover clear spawn, camera-relative motion and input reset. The browser's WebGL support is disabled, so rendered 3D play could not be verified here; the existing friendly WebGL error screen remains.
