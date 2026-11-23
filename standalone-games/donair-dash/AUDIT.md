# Donair Dash audit — 2026-11-23

Fixed touch button movement: a held button used to add an extra move when released. Pointer presses now move promptly without a release jump; keyboard/assistive button activation still moves one step. Multiple held touch controls now track their own pointers, and canvas dragging ignores other fingers until its owning pointer ends. Pause/restart/focus loss clears every active direction. Browser modifier shortcuts and editable controls are excluded from gameplay keys.

Validation: `node --test tests/*.mjs` passes 13 tests (10 existing engine tests plus 3 pointer-control regressions). `node --check app.mjs` passes. Existing collision, ingredient fairness, scoring, restart and pause engine checks pass unchanged.

This audit used source inspection and Node simulation. Touch hit targets, visual layout and device/browser behavior still need the parent task's browser check. No deployment performed by this audit worker.
