# Signal Hill: 1901

An immediate-action kite game inspired by Marconi’s first transatlantic wireless reception. The scene is moving on arrival: radio waves cross the Atlantic, a kite flies above Signal Hill, and a golden signal target shows exactly where to steer. No decoding form, map menu or introductory reading is required.

**Technology:** native Web Components, original SVG artwork and optional Web Audio. The complete dependency-free release lives in `web/`. No CDN, accounts or external assets are required. The previous six-watch Morse puzzle remains available as an optional **Original Morse puzzle** link (`classic.html`), with its engine and tests intact.

## Immediate play

- Press **Catch the signal**, click the sky, or press an arrow key to start. The attract scene has no time or score penalties.
- Move the pointer, drag on touchscreens, use Arrow keys/WASD, or hold the visible direction buttons. Tab to a direction button and activate it with Enter/Space for a short nudge. The kite follows your direction immediately.
- Hold the kite in the **golden glow** to receive a dot. Aim at the central bullseye: closer alignment earns more points throughout the hold. The filling ring shows reception progress, while the score and signal-quality percentage update live. Receive three dots to complete Morse **S**.
- Each dot needs 2.2 seconds in the signal. Leaving the signal slowly loses incomplete progress; already received dots stay collected. The target shifts after each successful dot.
- A round lasts at most 40 simulated seconds. Each completed dot earns 100 base points plus up to 400 precision points, based on your average centre alignment during that dot. Completing S adds 10 points per second remaining. Restart is one button. Best scores use a new local precision-score record so old scoring is not mixed with the new system.
- **Pause**, `P`, Escape or Space while the sky is focused pauses/resumes. Holding a pause shortcut does not repeatedly toggle the state. Losing focus or hiding the tab pauses play automatically. Resuming is explicit; elapsed time does not advance while paused.
- Sound begins off. The optional toggle enables short Morse tones; visual feedback remains complete without audio.

The game uses a responsive SVG viewport with separate artwork, target and kite placement. Pointer coordinates and target geometry use the same transform at wide and narrow widths. Motion delta is capped to 50ms, so suspended frames do not jump the simulation forward. Reduced-motion preference slows decorative waves and kite sway while preserving the playable mechanic.

## Build and checks

```sh
npm test
npm run build
```

No install step or compiler is required. The build syntax-checks both game modes. Twenty-three tests cover the action rules, a complete three-dot winning run, finite play boundaries, charge recovery, timeout, restart, pause/resume and dt handling, plus the preserved Morse puzzle and audio opt-in/cancellation checks. Six precision-specific cases verify centre-versus-edge reward, a continuous distance-to-quality relationship, frame-rate stability, no farming by losing/rebuilding unfinished dots, paused/finished/reset scoring guards, and exact capping at dot completion.

Browser QA:

1. Load the default entry: confirm the scene moves before starting, with a single **Catch the signal** button and the short steering instruction.
2. Start and move the kite into the outlined glow. The POINTS counter rises; moving closer to the bullseye raises the quality percentage and earns more points for the same hold time. Hold until the first dot illuminates and a `DOT +…` award appears, then follow the new glow twice. Expect **The Atlantic is connected**, three dots, a final score, average precision and a separate speed bonus. The third signal is left of the first two.
3. Press **Fly again**: score/precision/charge/dots/timer reset. Compare a centre-tracking run with a near-edge run: both can finish, but the centred run should score substantially higher. Move away until timeout; verify **Try again** remains obvious and only completed dots are banked.
4. Check arrow-key movement and on-screen press/release controls. Pause, switch away from the tab, and resume: no elapsed time should be consumed while paused. A visible golden target's boundary matches the actual lock region.
5. At phone widths, steer by dragging anywhere in the sky; the illustration and target remain in the viewport. No scrolling or form entry is needed during a round.
6. Enable sound, receive a dot, then mute. The entire game must also remain playable silently.
7. Follow **Original Morse puzzle** and confirm the preserved harbour-watch mode still starts. Its footer links back to the new action game.

## Precision and anti-farming rules

Signal quality is `max(0, 1 − distance / glow radius)`: 100% at the centre, 50% halfway to the boundary, and 0% at the edge. Quality is integrated only over the progress that belongs to the current dot; points are banked when that dot completes. Leaving the signal removes incomplete progress and the same proportion of its unbanked precision credit. Re-entering cannot repeatedly bank the same progress. Paused and finished states cannot score, and the final integration step is capped to the fraction of the dot still missing.

The live points counter includes the provisional current dot; these unbanked points may fall if its signal is lost. A timeout retains completed-dot points only. The final precision percentage averages the completed dots. In deterministic 50 Hz checks, centre tracking scores **1,806** at **98%** precision; an 80-unit offset within the 94-unit glow scores **832** at **17%**, with the same **330**-point speed bonus. This confirms that precision, rather than merely finishing quickly, separates the results.

## History and artistic interpretation

On December 12, 1901, Guglielmo Marconi received the Morse letter **S** (three dots) transmitted from Poldhu, Cornwall, England, to Signal Hill in Newfoundland. He used a kite to raise his antenna; his receiving apparatus was in a former hospital. Cabot Tower is shown only as a neighbouring landmark, not the room in which he received the 1901 signal.

The moving target, collection mechanic, repeated game rounds and score are an arcade interpretation, not a reconstruction of radio equipment or a radio propagation simulation. The history is optional below the active play area.

Primary sources:

- [Parks Canada — Signal Hill National Historic Site](https://www.parks.canada.ca/culture/designation/lieu-site/signal-hill)
- [Parks Canada — Communication: flags, cables and de-coders](https://parks.canada.ca/lhn-nhs/nl/signalhill/culture/histoire-history/comm)

All code and artwork here are original. No third-party runtime library is bundled.
