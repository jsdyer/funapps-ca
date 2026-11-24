# PEI Potato Harvest — Red Soil Rush

The default is now a quick 45-second harvest. Golden potatoes visibly pop out of the red soil: tap them before they hide, and leave the angular grey rocks alone. The original turn-based farm game remains available through **Season planner** (`?mode=planner`). Both modes retain the existing Svelte + TypeScript stack and local Vite bundles.

## Quick play

- The first screen has a moving field scene and potatoes popping up, without a tutorial dialog. **Start picking**, Space, or a potato starts the round. The attract scene does not consume time.
- Tap/click a potato, or use **1–9** for the labelled three-by-three plots. Native buttons support Tab and Enter. Potatoes and rocks have different colours, shapes and accessible labels.
- Each potato earns at least 10 points. Consecutive harvests grow the bonus. Clicking a rock deducts 10 points (never below zero) and resets the combo. Missed potatoes reset the combo but do not end the game.
- **Pause**, **P** or **Escape** pauses. Hiding the page or leaving the window pauses automatically, with explicit resume. The clock uses bounded elapsed time; it does not continue in the background.
- After 45 seconds, see potatoes harvested and points, then use **Pick another batch**. Restart resets every plot, score, timer and combo. The quick-play best score uses a separate failure-tolerant local-storage key.
- Reduced motion disables decorative movement. No sound, account, external runtime services or French knowledge is required.

### Quick-play QA

`npm run check`: **0 errors and 0 warnings**. `npm test`: **15 passing tests** (six quick-harvest tests and nine retained farming tests). `npm run build`: successful production build, with the season planner loaded only when requested.

Browser walkthrough: the initial field shows golden potatoes at plots **1** and **5**, and a grey rock at **9**. Press **1**, then **5** to start and harvest both (20 points); press **9** to check the rock feedback (10 points, never negative). Pause/resume, pick newly appearing potatoes, and allow the 45-second round to finish. Replay should restore 45 seconds, zero score, and the starting field. **Season planner** opens the preserved strategy game; **Quick harvest** in its header returns to the action game.

## Preserved season planner

A complete turn-based farm strategy game: twelve compressed growing turns, four red-soil fields, three potato varieties, weather and moisture, crop grades, soil depletion, market orders and an end-of-season score. The player wins by fulfilling all three community orders. A fourth premium order adds an optional challenge. There are no timers or real-money mechanics.

## Technology and build

- Svelte 5 + TypeScript, bundled locally with Vite 8.
- All illustrations are inline SVG; no images, fonts, libraries or services are fetched at runtime.
- `src/engine.ts` contains the pure, immutable game rules. `src/App.svelte` is the interface. `src/styles.css` contains responsive layouts and reduced-motion support.
- `web/` is the production package, ready to serve from any subdirectory. Relative bundle paths are intentional.
- Node 24 is used for the TypeScript test runner. Dependency versions are locked in `package-lock.json`.

```sh
npm ci
npm run check
npm test
npm run build
```

The production bundle includes third-party license notices. To develop locally, run `npm run dev`.

## Controls and rules

Click/tap a field card, then choose planting, watering, composting or harvesting in the field panel. All controls are native buttons, usable with Tab and Enter/Space. Dialogs trap focus and return it on close. Escape closes help, restart confirmation and unused-action confirmation. The simulation never advances unless the player presses **End turn & grow**.

- Each turn gives four actions. Planting, watering, composting, harvesting, delivery, tank refill and farm-gate selling each cost one.
- Reds ripen after three growing turns, golds after four, russets after five. A field cannot be planted too late to mature by turn twelve.
- The visible forecast is applied when ending the current turn; the following forecast is also shown. Growing crops left at zero moisture lose twenty health. Watering fills one field to four moisture using two barrels.
- At eighty health or higher all crates are premium. At sixty or seventy, half are premium. Below fifty, yield drops by two crates. Ripe crops start losing fifteen health per turn after two further advances; harvested crates do not spoil.
- Harvesting depletes soil. Compost restores forty soil points and gives a growing crop twenty health, capped at one hundred.
- Orders consume regular crates before premium crates. Regular orders pay two extra dollars per premium crate. The chef order accepts six premium crates across any varieties.
- On the final turn, **Finish the season** sells all stored crates automatically. Unharvested crops are left in the field. Completing all three community orders wins; final score is funds + forty per delivered order + three per premium crate grown.
- Best score is stored locally with failure-safe storage access. A reload starts a fresh season; the welcome dialog says so explicitly. No account or backend is used.

## Manual QA walkthrough

1. Open `web/index.html` through HTTP. Read the welcome dialog and activate **Let’s get planting**. Initial values: turn 1, four actions, $44, eight water barrels.
2. Plant **Island reds** in Seabreeze; select Redbank and plant **Golden table**; select Hillside and plant **Hearty russets**; select Homestead and plant **Island reds**. Four actions are spent, funds are $6. The fifth action must be unavailable.
3. Press **End turn & grow**. Turn 2 has four actions; showers raised moisture from two to three. End turn, then confirm **Yes, end turn**, reaching turn 3. The current dry-breeze forecast says it uses two moisture.
4. Select and water all four fields. Every field reaches four moisture, tank reaches zero, all actions are used. End turn. Both red fields are now ready on turn 4, with perfect health.
5. Harvest the two red fields. Deliver the **Saturday market** order. It becomes marked delivered and cannot pay twice. Four premium red crates remain in storage. Funds are $48.
6. End turn (confirm unused work), then harvest gold and deliver **Community supper** on turn 5. End turn; harvest russets and deliver **The chip truck** on turn 6. All three core orders are complete and funds are $182, before any extra farming.
7. For a bonus challenge, compost/replant the empty fields and produce two more premium crates to combine with the four stored red crates. Deliver the six-crate chef order. Alternately, leave the surplus to sell automatically at the end.
8. Advance to turn 12 and finish. The winning result shows three completed orders, harvest totals, score and best score. **Grow another season** resets funds, fields, stock and actions. A season with no completed orders must show the honest unsuccessful result.
9. Verify **How to play** can be opened and closed mid-season without changing state. **New season** prompts before discarding progress. Tab navigation works through the modal and field controls; mouse/touch use the same actions.
10. Check widths around 390, 768 and 1280 CSS pixels. Small screens use single-column field/order cards and stacked field controls. Body/instructions are sixteen pixels, controls fourteen or more, and secondary metadata twelve–thirteen pixels. The page scrolls naturally and has no canvas/key-scroll conflicts.

Automated tests cover immutability, action and funds budgets, late planting, dry-stress prevention, maturity and grade/yield, soil recovery, order consumption and double-payment, the mixed-variety chef order, crop overripening, a reproducible successful season, final sale settlement and final-state immutability. `npm run check` reports zero errors/warnings.

## Regional inspiration

The farm, products, prices, contracts and compressed weather sequence are fictional gameplay. It is not agricultural advice or a crop calendar. The red soil and potato-harvest theme are grounded in official regional sources:

- [Government of PEI — Provincial Soil](https://www.princeedwardisland.ca/en/information/executive-council-office/provincial-soil)
- [Tourism PEI — When is the potato harvest?](https://www.tourismpei.com/askanislander/questions/when-is-the-potato-harvest-and-where-are-the-potato-fields)
- [Government of Canada — Potatoes and Prince Edward Island](https://www.canada.ca/en/atlantic-canada-opportunities/campaigns/infographics/potatoes-and-pei.html)

Framework references: [Svelte TypeScript](https://svelte.dev/docs/svelte/typescript), [Vite getting started](https://vite.dev/guide/).
