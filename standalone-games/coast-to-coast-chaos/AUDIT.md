# Audit — 2026-11-23

Added mobile pause/resume and automatic focus-loss pause, pointer capture/cancellation for the direction pad, and a visible carried-item HUD on mobile. Fixed hidden HUD/control visibility and made menu/upgrade overlays scrollable by touch. Replaced gameplay timeouts with game-clock tasks that stop while paused and are discarded between rooms/runs. Kept one animation loop across restarts, guarded duplicate upgrade clicks, corrected completed-set count, and allowed startup without AudioContext. Keyboard shortcuts preserve normal focused-button activation.

Validation: shared `../kitchen-party-outta-hand/action-regression.cjs` checks syntax, startup without audio support, single animation-loop scheduling, task timing/session isolation, pause state/input cleanup, and blocked gameplay actions while paused. Full long-run balance has not been simulated.
