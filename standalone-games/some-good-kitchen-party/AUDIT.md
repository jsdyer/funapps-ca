# Gameplay audit — 23 November 2026

- Added visible pause/resume controls, P/Escape, and automatic pause on blur/hidden page; resumption resets the clock and audio scheduling.
- Clear keyboard/joystick state on pause and restart to prevent stuck movement.
- Holding the action key no longer repeatedly picks up/delivers; each action recomputes its target, and already-served guests cannot be scored twice.
- Added a descriptive WebGL-unavailable screen with a FunApps return link and disabled game startup after rendering failure.
- Kept menu overlays scrollable on touch screens and removed the explicit zoom restriction.

Verification: `node audit-tests.mjs` passes full script syntax, duplicate/mismatched delivery prevention, current-target refresh and fallback checks. The shared cloud browser lacks WebGL, so 3D rendering and physical joystick feel were not visually verified. This game remains dependent on Three.js/WebGL; no visual playability claim is made for unsupported devices.
