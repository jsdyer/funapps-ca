# Signal Hill: 1901

An immediate-action kite game inspired by Marconi’s first transatlantic wireless reception. The scene is moving on arrival: radio waves cross the Atlantic, a kite flies above Signal Hill, and a golden signal target shows exactly where to steer. No decoding form, map menu or introductory reading is required.

**Technology:** native Web Components, original SVG artwork and optional Web Audio. The complete dependency-free release lives in `web/`. No CDN, accounts or external assets are required. The previous six-watch Morse puzzle remains available as an optional **Original Morse puzzle** link (`classic.html`), with its engine and tests intact.

## Immediate play

- Press **Catch the signal**, click the sky, or press an arrow key to start. The attract scene has no time or score penalties.
- Move the pointer, drag on touchscreens, use Arrow keys/WASD, or hold the visible direction buttons. The kite follows your direction immediately.
- Hold the kite in the **golden glow** to receive a dot. The filling ring shows progress. Receive three dots to complete Morse **S**.
- Each dot needs 2.2 seconds in the signal. Leaving the signal slowly loses incomplete progress; already received dots stay collected. The target shifts after each successful dot.
- A round lasts at most 40 simulated seconds. Win for 300 points plus a time bonus; restart is one button. Only the best score is stored locally.
- **Pause**, `P`, Escape or Space while the sky is focused pauses/resumes. Losing focus or hiding the tab pauses play automatically. Resuming is explicit; elapsed time does not advance while paused.
- Sound begins off. The optional toggle enables short Morse tones; visual feedback remains complete without audio.

The game uses a responsive SVG viewport with separate artwork, target and kite placement. Pointer coordinates and target geometry use the same transform at wide and narrow widths. Motion delta is capped to 50ms, so suspended frames do not jump the simulation forward. Reduced-motion preference slows decorative waves and kite sway while preserving the playable mechanic.

## Build and checks

```sh
npm test
npm run build
```

No install step or compiler is required. The build syntax-checks both game modes. Seventeen tests cover the new action rules, a complete three-dot winning run, finite play boundaries, charge recovery, timeout, restart, pause/resume and dt handling, plus the preserved Morse puzzle and audio opt-in/cancellation checks.

Browser QA:

1. Load the default entry: confirm the scene moves before starting, with a single **Catch the signal** button and the short steering instruction.
2. Start and move the kite into the outlined glow. Hold until the first dot illuminates, then follow the new glow twice. Expect **The Atlantic is connected**, three dots and a score. The third signal is left of the first two.
3. Press **Fly again**: score/charge/dots/timer reset. Move away until timeout; verify **Try again** remains obvious.
4. Check arrow-key movement and on-screen press/release controls. Pause, switch away from the tab, and resume: no elapsed time should be consumed while paused. A visible golden target's boundary matches the actual lock region.
5. At phone widths, steer by dragging anywhere in the sky; the illustration and target remain in the viewport. No scrolling or form entry is needed during a round.
6. Enable sound, receive a dot, then mute. The entire game must also remain playable silently.
7. Follow **Original Morse puzzle** and confirm the preserved harbour-watch mode still starts. Its footer links back to the new action game.

## History and artistic interpretation

On December 12, 1901, Guglielmo Marconi received the Morse letter **S** (three dots) transmitted from Poldhu, Cornwall, England, to Signal Hill in Newfoundland. He used a kite to raise his antenna; his receiving apparatus was in a former hospital. Cabot Tower is shown only as a neighbouring landmark, not the room in which he received the 1901 signal.

The moving target, collection mechanic, repeated game rounds and score are an arcade interpretation, not a reconstruction of radio equipment or a radio propagation simulation. The history is optional below the active play area.

Primary sources:

- [Parks Canada — Signal Hill National Historic Site](https://www.parks.canada.ca/culture/designation/lieu-site/signal-hill)
- [Parks Canada — Communication: flags, cables and de-coders](https://parks.canada.ca/lhn-nhs/nl/signalhill/culture/histoire-history/comm)

All code and artwork here are original. No third-party runtime library is bundled.
