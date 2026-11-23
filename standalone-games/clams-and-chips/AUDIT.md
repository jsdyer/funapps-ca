# Clams & Chips audit — 2026-11-23

The independent fryer timings, golden windows, order/stock accounting and scoring were sound in the existing engine tests. Added automatic pause when the browser window loses focus, alongside the existing hidden-tab pause, so fryers do not burn while another window is active. Saved high scores now reject negative, non-finite and malformed values. Keyboard shortcuts ignore editable fields and sound-resume rejection is handled.

Validation: `node --test tests/*.mjs` passes all 11 existing tests. `node --check app.mjs` passes. Tests cover fryer timing, burns/early lifts, inventory, scoring, replay, pause, customer patience and end-of-shift behavior.

This audit used source inspection and Node simulation; parent task handles visual/browser checks. No deployment performed by this audit worker.
