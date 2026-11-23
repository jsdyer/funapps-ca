# Cabot Trail — The Scenic Route

A complete scenic-driving game built with native JavaScript ES modules and a custom Canvas 2D pseudo-3D road renderer. There are no dependencies, CDNs, images, audio permissions, accounts, or WebGL requirements. All scenery is drawn locally.

## Play

The red car cruises automatically. Steer through the highlands, slow below the displayed speed of **35**, and move right at each of four lookoffs to take a postcard. Reach the end of the tour before daylight expires; all four postcards earn the best result, but missing a stop does not prevent finishing.

- **A/D or left/right**: steer. Make small adjustments.
- **S or down**: hold to brake.
- **W or up**: hold to accelerate above cruising speed (optional).
- **Space / camera button**: photograph a lookoff when ready.
- **P / Escape / Pause**: pause/resume.
- Large pointer controls work with mouse, touch, and pen. Cruise removes the need to hold an accelerator on touch screens; input is released on pointer cancel, blur, and hidden tabs.

Comfort is lost on rough shoulders and restored gradually during gentle road driving, with a larger restoration at photo stops. Running out of comfort or daylight offers a fresh retry from the last photograph. Collected photos are preserved. A recovered tour is marked in the results. Only the best score is saved in localStorage; unavailable storage is handled safely.

## Build / test

`web/` is the complete static deployment directory. Serve it at any path with an ordinary HTTP server; all assets use relative URLs. The expected public path is `https://funapps.ca/play/cabot-trail/`.

```sh
npm test
npm run build
python3 -m http.server 8080 --directory web
```

`npm run build` validates syntax; there is no bundling step. `engine.test.js` tests the full four-photo completion path using ordinary discrete steering/brake inputs, automatic cruise, braking, photo eligibility, duplicate photo prevention, pause, win/loss, checkpoint recovery, bounded frame time, and 30/60 fps consistency.

## Browser QA walkthrough

1. Open `web/` through a server. Intro and dashboard are stationary until Start.
2. Start. The car accelerates automatically to a comfortable cruise; use A/D or arrows to keep it on the road. Check the large pointer controls as well.
3. First lookoff is Ingonish. When the sign appears, slow down near it and gently move right. The camera button changes to **Take the postcard** below displayed speed 35 and while positioned on the right.
4. Take the photo. Daylight stops, a postcard is added to the album, and a photo panel appears. Continue resumes just past the pullout.
5. Repeat at Neils Harbour, Pleasant Bay, and Chéticamp; finish the drive for the album/comfort/score result.
6. Pause, then Resume. Change tabs or blur the window while holding a steering key: the game pauses and input clears. Verify P/Escape resumes a paused game.
7. Drive off-road until comfort empties; retry from last photo stop and verify photos are retained. Start a fresh tour to clear progress.
8. At narrow widths, the journal moves under the road and touch buttons remain usable. Instructions remain in Field notes.

## Geographic inspiration

This is a compressed fictional tour, with invented road geometry, speeds, driving time, and pullout locations. It is not a navigation guide, accurate road model, or road-safety trainer. The selected place names are real Cabot Trail destinations, and the game explicitly labels this distinction.

Primary references checked 23 November 2026:

- Tourism Nova Scotia, [Explore the Cabot Trail](https://novascotia.com/get-inspired/top-25/explore-the-cabot-trail/) — coastal and highland scenery; Ingonish, Neils Harbour, Pleasant Bay and Chéticamp.
- Parks Canada, [Getting here — Cape Breton Highlands National Park](https://parks.canada.ca/pn-np/ns/cbreton/visit/directions) — Cabot Trail setting and the park's western/eastern entrances.

The game includes links to those references. No schedules, weather, travel advisories, trail availability, or other live-data claims are embedded.
