# Game audit — 23 November 2026

- Guarded storage reads/writes so malformed saves and blocked browser storage do not crash the game.
- Reconstructed upgrade prices using the same per-purchase rounding as live purchases. Prices no longer jump after a reload.
- Validated saved counts; added page-exit saves and elapsed-time income accounting for throttled tabs (one-hour catch-up cap).
- Reset now works even when storage is blocked. Purchase keyboard focus is restored after rerendering.
- Fixed narrow-screen panel overflow, gave the lobster button an accessible name, and enlarged descriptions.

- Added portable export/import codes for domain/device migration, with full validation before replacing progress.

## Verification

All inline JavaScript compiles and executes in a DOM-stubbed Node VM. The shared regression suite passes 15 checks covering corrupt/blocked storage, save/reload economy invariants, trade persistence and cargo limits, town action locks and fuel-limited movement, arrival finality, and validated clicker imports.

Run from the complete games source bundle:

```sh
node kitchen-party-tycoon/strategy-regression.mjs
```

These are source/logic tests, not visual browser or real-device tests. Root agent owns browser QA and deployment. Browser saves are scoped to their origin. Export on the old address and import on the new address to transfer progress.
