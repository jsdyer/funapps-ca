# Game audit — 23 November 2026

- Town visits now block driving/rest/pace changes underneath the overlay and restrict shopping to actual town visits.
- Town dialogs have keyboard focus management, a Tab loop, Escape to leave, and inactive background content.
- Travel stops at the next town and fuel cost scales to the distance actually covered; insufficient fuel limits distance rather than granting a full day's travel.
- Travel logs now report the actual distance, and post-event health/morale are clamped at zero.
- Town purchase buttons reflect affordability and full resources. Final arrival remains visible and all trip actions stop after game over.
- Added small-screen sizing, accessible event log and visible focus styles.

## Verification

All inline JavaScript compiles and executes in a DOM-stubbed Node VM. The shared regression suite passes 15 checks covering corrupt/blocked storage, save/reload economy invariants, trade persistence and cargo limits, town action locks and fuel-limited movement, arrival finality, and validated clicker imports.

Run from the complete games source bundle:

```sh
node kitchen-party-tycoon/strategy-regression.mjs
```

These are source/logic tests, not visual browser or real-device tests. Root agent owns browser QA and deployment. Saves remain scoped to the browser origin; changing domains does not automatically transfer old localStorage.
