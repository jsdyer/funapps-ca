# Audit — 2026-11-23

Fixed the permanent upgrade loop after round six: choosing an upgrade now advances to round seven. Corrected touch/mouse hit coordinates for letterboxed portrait canvases. Keyboard steering no longer fights a stale pointer or snaps back when a key is released. Added visible pause/resume and numbered keyboard upgrade choices; clear stuck input after focus loss and pointer cancellation. Saved-stat corruption or blocked storage no longer stops startup. Fixed final microgame count and guarded audio startup.

Validation: shared `../kitchen-party-outta-hand/action-regression.cjs` executes the source in a mocked browser and checks upgrade progression, portrait coordinate conversion, keyboard movement/release, pause cleanup and malformed stored stats. The tests do not establish complete balance or visual accessibility of every microgame.
