# Signal Hill: Harbour Watch

A fictional day at a harbour-club signal desk, viewed through the eyes of a Maritime traveller visiting Newfoundland. Decode six friendly Morse messages, choose the reply that fits each scene, then build the reply with dots and dashes. No Morse knowledge, sound, dexterity or timed keypresses are needed.

**Technology:** native Web Components, original SVG artwork, CSS, and optional Web Audio. No framework, npm runtime dependencies, external fonts, CDN, account, API or remote art. `web/` is the complete self-contained production app, ready for `https://funapps.ca/play/cabot-tower-signals/` or another static directory. All local runtime URLs are relative.

## Game and controls

- Choose **Take the watch** to begin. Each incoming strip is one letter; match it to the free, complete codebook.
- Type the decoded word into **Decoded message**, then choose **Check message**.
- Read the fictional harbour situation and select the appropriate reply. Incorrect choices explain the mismatch and let you try again.
- Build each highlighted reply letter with **Dot**, **Dash**, **Erase last** and **Clear letter**. **Send letter** checks it and moves to the next letter.
- Keyboard: `.` adds a dot, `-` adds a dash, Backspace erases, and Enter sends when focus is outside another control. Native Tab/Enter button operation and typing in the answer field are preserved.
- Click a codebook tile to pin its pattern. The next required reply letter is pinned automatically when a new letter starts. The codebook and signal replay cost no points.
- **Replay signal** flashes the tower lamp; each received strip can be replayed separately. **Sound off** is the initial state. Click it to enable optional audio, then replay a signal. Audio is created/resumed only from user actions and stops when the browser loses focus or the page changes visibility.
- **Show me the message** / **Show this pattern** are explicit hints. Each distinct hint is charged only once. Hints and incorrect submissions affect stars, but never lock out completion.
- Each completed watch earns 500 points minus 35 per retry and 50 per hint, with a minimum of 100. Three stars require no retries or hints, two stars follow one, and one star follows more. Finishing unlocks the next watch.
- **Restart this watch** resets the current puzzle. Completed watches can be replayed from the navigation. Only best stars are saved locally; blocked or malformed storage is handled safely. A reload starts a fresh first watch but preserves earned stars where storage is available.

## Build and verification

Requires a modern browser with JavaScript modules and custom elements. Optional audio requires Web Audio support. The rule tests run on Node 22+; tested with Node 24.

```sh
npm test
npm run build
```

There is no installation or compilation requirement. `npm run build` syntax-checks the three browser modules; it does not generate or rewrite the game files. The release is maintained directly in `web/`.

Ten tests cover Morse bijection and real-message round trips, invalid input, every mission's complete winning path, dispatch recovery, wrong-letter feedback and editing, stage/input guards, hint scoring, saved-record safety, Web Audio event spacing, audio opt-in/cancellation, and muting during a pending audio resume. No game rule depends on animation frames or an audio callback.

## Browser QA walkthrough

1. Load the game and select **Take the watch**. Initial stars are 0/18, first incoming strips are `....` and `..`, and sound is off.
2. Enter **HI** and choose **Check message**. Select **Send a friendly hello**. The reply is HI and H is highlighted.
3. Click **Dot** four times, then **Send letter H**. Click **Dot** twice, then **Send letter I**. Expect **Clear as a bell**, three stars, 500 points and **Next watch**. All operations are untimed.
4. Click **Next watch** and repeat using the table below. The last completion should show **Every light has a story**, six watches finished and 18/18 best stars if no retries/hints were used.

| Watch | Decode | Reply choice | Send letters, in order |
| --- | --- | --- | --- |
| A hello across the harbour | HI | Send a friendly hello | H `....`; I `..` |
| The kettle is calling | TEA | Accept the invitation | Y `-.--`; E `.`; S `...` |
| A curtain of grey | FOG | Keep it at the waiting buoy | W `.--`; A `.-`; I `..`; T `-` |
| A postcard with a destination | EAST | Send it to the east quay | E `.` |
| The homeward message | HOME | Welcome it into its berth | I `..`; N `-.` |
| All lights accounted for | SAFE | Acknowledge and close the watch | O `---`; K `-.-` |

5. On a replay, enter a wrong received word. Expect an explanatory message and one retry, with the answer field still editable. Select an incorrect dispatch response, then recover with the correct choice.
6. While sending H, enter one dot and submit. It should identify the pattern as E and ask for H. Erase/clear, then send H correctly. No letter is lost or skipped.
7. Open the codebook with Tab and pin another letter; ensure its large pattern changes. The current outgoing letter remains visible in the reply word. Use `.` and `-` keys while focus is outside the text field.
8. Enable sound and replay a received message. Expect optional gentle sine tones and matching visible lamp pulses. Disable sound and replay again: silent visual feedback should remain. Leaving the tab stops any audio. The entire six-watch path works without enabling sound.
9. At narrow widths, the mission navigation changes to two columns, the illustration and desk stack, signal strips wrap, and the alphabet changes to five columns. All controls remain ordinary HTML buttons with readable text and natural page scrolling.

## Regional and technical references

This is an invented modern harbour-club activity. The miniature model boats, replies and dispatch decisions are game fiction; these are not real marine operating procedures. The Morse alphabet itself is standard letter encoding.

Cabot Tower served as a flag-signalling tower from 1900 to 1958. Parks Canada's communications history places Marconi's 1901 wireless reception in a former hospital on Signal Hill, not inside Cabot Tower. The illustration is an original stylized view, not a geographical map or architectural survey.

Primary sources checked on 23 November 2026:

- [Parks Canada — Communication: flags, cables and de-coders](https://parks.canada.ca/lhn-nhs/nl/signalhill/culture/histoire-history/comm)
- [Parks Canada — Cabot Tower](https://parks.canada.ca/lhn-nhs/nl/signalhill/culture/histoire-history/tour-tower)
- [MDN — Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

All code and artwork in this directory are original. No third-party runtime library is bundled, so no runtime dependency licence notice is required.
