# Game audit — 23 November 2026

- Validated both browser saves and imported codes before applying them. Bad numeric states and building counts are rejected; unknown/duplicate achievement or upgrade IDs are discarded.
- Purchases save immediately; upgrade actions enforce their unlock conditions.
- Save imports and reset clear temporary event effects and synchronize sound controls and timing state.
- Added page-exit saves, bounded elapsed-time catch-up, prevented zero/invalid prestige, and improved modal keyboard handling and labels.
- Added visible focus and reduced-motion styles. Existing art, progression and portable save-code format are retained.

## Verification

All inline JavaScript compiles and executes in a DOM-stubbed Node VM. The shared regression suite passes 15 checks covering corrupt/blocked storage, save/reload economy invariants, trade persistence and cargo limits, town action locks and fuel-limited movement, arrival finality, and validated clicker imports.

Run from the complete games source bundle:

```sh
node kitchen-party-tycoon/strategy-regression.mjs
```

These are source/logic tests, not visual browser or real-device tests. Root agent owns browser QA and deployment. Saves remain scoped to the browser origin; changing domains does not automatically transfer old localStorage.
