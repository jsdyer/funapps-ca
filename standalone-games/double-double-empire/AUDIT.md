# Game audit — 23 November 2026

- Added guarded automatic browser saving every five seconds and at page exit, while retaining export/import save codes.
- Validated save imports into a clean state before modifying the active game. Negative/nonfinite values and bad building counts are rejected.
- Loading a save clears temporary events and correctly restores both owned and unowned upgrade/achievement styles.
- Added confirmed reset, keyboard-accessible goose controls, modal labels/focus handling, reduced-motion support and narrow-screen shop adjustments.
- Fixed clipboard error handling: a rejected clipboard promise now reports a manual-copy fallback instead of falsely saying it copied.
- Prevented typing in a save code from triggering the EH bonus, and prevented random events starting behind introductory/save dialogs.

## Verification

All inline JavaScript compiles and executes in a DOM-stubbed Node VM. The shared regression suite passes 15 checks covering corrupt/blocked storage, save/reload economy invariants, trade persistence and cargo limits, town action locks and fuel-limited movement, arrival finality, and validated clicker imports.

Run from the complete games source bundle:

```sh
node kitchen-party-tycoon/strategy-regression.mjs
```

These are source/logic tests, not visual browser or real-device tests. Root agent owns browser QA and deployment. Saves remain scoped to the browser origin; changing domains does not automatically transfer old localStorage.
