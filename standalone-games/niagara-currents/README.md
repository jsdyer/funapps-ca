# Niagara: Current Keeper

## Quick play — default experience

The default page is now a **live water-gate arcade game**. The Niagara waterfall, current and glowing basin move immediately in a demonstration. One **Play the current** button starts a 45-second round. Move the copper gate into the glow to fill three basins: scenic falls, riverside garden and power station. The beam, splash, fill meter and target provide the instructions visually.

- Move the mouse or drag anywhere across the scene to position the gate. Left/Right, A/D, or the visible steering buttons provide the same control without dragging. A first movement key or field touch starts play.
- The glow moves gently at first, then a little farther and faster. Each filled basin advances immediately. Fill all three to win; otherwise the timer produces a score and immediate replay.
- The scene continues behind the start panel, with no compulsory tutorial, forms or codebook. Optional **Channel puzzles** opens the original six puzzles at `?mode=planner`.
- Pause/Resume and Restart stay visible. Blur and tab hiding pause a running round; returning never resumes it silently. Large frame gaps are capped and motion uses elapsed time.
- The attract demonstration respects reduced-motion preference. The action round retains essential motion. No audio is used. Storage is optional and limited to a local best score.

Quick mode uses `src/Quick.tsx`, `src/quick-engine.ts` and `src/quick.css`. `src/main.tsx` selects and lazy-loads the appropriate mode; `src/Planner.tsx` retains the original game. All assets remain bundled locally.

### Quick-play QA

1. Open the default page: moving water and a copper gate are visible immediately; only one Play button is needed.
2. Start. Move/drag toward the glowing basin. The current follows the gate, splashes when aligned, and fills the meter. Tap/hold steering buttons and use A/D or Left/Right to verify alternatives.
3. Keep the gate over the glow. Each full meter changes the destination, and the third fill ends with **Every basin filled** and **Play again**. The deterministic rule walkthrough can win in under 20 seconds of correctly tracked play.
4. Leave the gate at an edge to miss: water spills, the timer ends at 45 seconds, and replay remains available. There are no punitive lives or navigation dead ends.
5. Pause or switch tabs. The clock and gate freeze; explicit resume retains progress. Restart resets all basins, time, score and movement.
6. Open **Channel puzzles**, complete the classic first chart using the walkthrough below, and return with **Quick play**.

The suite has **14 tests**: eight original puzzle tests and six arcade tests covering an entire three-stage win, demo/restart, water conservation, time expiry, pause/resume, input bounds and frame-gap protection. Type checking and production builds pass. Live browser QA is performed by the publishing agent.

## Optional channel puzzles

A complete **React + TypeScript + SVG** channel-routing puzzle, told through little notes from a Maritime traveller visiting Niagara. Six original boards progress from a simple bend to branching networks that share twelve finite water units between scenic falls, a mist garden and a small turbine.

Production path: `https://funapps.ca/play/niagara-currents/`.

## Play

- Tap or click a channel to rotate it **clockwise**. **Tab and Enter/Space** operate the same HTML buttons. Each button has an accessible coordinate label, for example `B2, rotate channel; bend; open north, east`. The open directions update after every rotation.
- Pale tiles are fixed intake/destination channels. Copper junctions are splitters: water entering one opening divides equally between the other two openings.
- Open ends must meet. Water escaping an edge, entering a rock, or meeting a closed channel spills. Repeating a directed path is counted as trapped water, so loops cannot run forever.
- All intended solutions use even splits. For odd amounts in other arrangements, the extra unit takes the first exit clockwise from north. The rule is deterministic.
- **Show flow preview** highlights connected channels and spill locations. Target cards show the predicted allocations; they remain available when the coloured path preview is hidden.
- **Release the current** resolves immediately. Every destination must receive exactly its target, with no spill or trapped water. There is no real-time animation dependency, timer, or wait.
- A failed release keeps the chart editable. **Undo turn**, **Reset chart**, and **Chart hint** recover any arrangement. A hint sets one channel to its orientation on a known working chart; it is not an arbitrary maze solver. Undoing a hint does not erase the hint count.
- Three droplets reward an unaided solution within the reference turn count plus three. One hint and modest extra turns can earn two; any valid finish earns at least one. Saved best medals never decrease. All six charts are selectable immediately.
- Only best medals are stored locally. Reloading starts a fresh first chart; blocked local storage does not prevent play. No accounts or personal data are used.

## Build and checks

Requires Node 22.12+ for Vite; tests were verified with Node 24.22.3.

```sh
npm ci
npm test
npm run check
npm run build
```

`npm run build` runs TypeScript checking and Vite. Deployment output is **`web/`**, with relative asset paths and bundled React; it can be copied directly into a static subdirectory. Full runtime/build-helper license notices are copied from `public/THIRD-PARTY-LICENSES.txt`. No CDN, remote font, image server, API key, WebGL, or backend is needed. All panorama and channel art is original SVG/CSS.

`src/engine.ts` owns topology, rotation, finite flow, conservation, hint arrangement and scoring. `src/Planner.tsx` supplies the planner controls, original SVG art and records. There are no debug controls or browser game-state hooks.

Eight tests cover all six complete solutions, the first chart's precise two-click solution, immutable rotation/wrap/fixed tiles, conservation across 480 scrambled boards, hint reachability on every chart, loop detection, malformed rotations, and medal rules.

## Browser QA walkthrough

1. Open **Channel puzzles** (`?mode=planner`). The Niagara panorama and first chart are visible. No modal or audio blocks play. The initial prediction spills twelve units.
2. Activate the button whose name starts **B2, rotate channel** once, then the button starting **C3, rotate channel** once. The falls target must read **12 / 12**, spilled **0**, trapped **0**, and the counter **2 turns**.
3. Press **Release the current**. The result reads **“That’s a good current.”**, awards **3 droplets**, disables channel rotation and offers **Next chart**. The panorama adds a subtle rainbow and lit power-station windows.
4. Activate **Undo turn** from the result. The last rotation is undone and the puzzle becomes editable. Reapply C3 and release; the best three-droplet record stays intact.
5. Choose the second chart. Try an incorrect release and check the spill message/rings. Rotate a channel and use Undo; the prior arrangement and turn count return. **Chart hint** should correct one orientation and clearly identify its coordinate.
6. Repeated hints eventually reach a working arrangement on all six boards; then Release completes the board. Hint-assisted results must not overwrite a better saved medal.
7. Verify **How to play** opens an accessible modal, Escape closes it, and keyboard focus returns to its button. The background is inert while the modal is open. The modal's only actionable control is its close button, so Tab remains there.
8. At approximately 390px width, the layout becomes one column and the SVG chart's ordinary HTML tile buttons remain large enough to tap. Target numbers, result text and all controls stay outside the chart for readability. No drag or hover action is required.
9. Reload after earning a medal. The saved record remains, while the first chart resets. Browser storage errors should not prevent a fresh game.

Exact clockwise rotations from each initial chart (order does not matter):

| Chart | Working rotations |
| --- | --- |
| A bend in the day | B2 once; C3 once |
| A little for the garden | A2 once; B2 twice; C2 three times; A3 once; C3 once |
| The long way round | A2 twice; B2 three times; D2 once; B3 once; D3 once |
| Three kinds of current | A2 three times; C2 once; D2 twice; A3 once; C3 once; D3 twice |
| Across the limestone | B2 twice; C2 three times; E2 once; A3 twice; B3 three times; D3 once; A4 once; C4 once; D4 twice; E4 once |
| The keeper’s postcard | C1 three times; E1 once; A2 twice; B2 once; C3 once; D3 twice; E3 once; B4 once; D4 once |

## Regional inspiration

The game is a **fictional miniature waterworks**, not an actual model of Niagara River regulation, environmental allocations, navigation or engineering. The three destinations and twelve-unit supply are invented puzzle rules. The Maritime voice is a visiting traveller's perspective, not a claim that Niagara is coastal.

The original panorama is inspired by the Niagara landscape and the historical use of its water for power. [Niagara Parks — Power Station + Tunnel](https://www.niagaraparks.com/attractions/niagara-parks-power-station/) describes that history. No current operating schedules, prices or river-flow quantities are represented.

Technical reference: [Vite — Building for Production](https://vite.dev/guide/build.html), including relative `base: './'` output. Primary sources checked 23 November 2026.
