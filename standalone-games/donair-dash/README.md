# Donair Dash

A standalone, 60-second donair arcade game for https://donair.funapps.ca/.

Slide the pita with arrow keys, A/D, touch-and-drag, or the on-screen buttons. Catch the next topping on the order ticket. Every correct topping scores 25; a complete donair scores an additional 150/300/450 as the order streak grows. A wrong topping costs two seconds and resets the streak, but preserves the partial order. P/Escape pauses. Leaving the tab automatically pauses the game.

## Build and deploy

Run `node --test tests/*.test.mjs` and `python3 build.py`. Upload `donair-dash-netlify.zip` to the existing Netlify project `soft-khapse-6eba6b` (site ID `915357dd-2998-43a5-840f-13943efa386d`). The ZIP contains only the 7 public files. No build service, API keys, database or external runtime libraries are needed. The domain remains donair.funapps.ca.

## Customize

- `engine.mjs`: round length, recipe order, spawn balance, collision width, scoring.
- `art.mjs`: original Canvas 2D ingredients, pita and night harbour scene.
- `style.css`: arcade colours, layout and responsive sizes.
- `index.html`: game instructions and links, including the real-world Donair After Dark tool.
- `app.mjs`: keyboard/pointer controls, display, sound and local best score.

Only the best score is stored locally, under `donair-dash-best`; no personal information is collected. Sound is off until requested. Reduced motion follows the operating-system setting, with a desktop toggle. A Canvas-capable browser and JavaScript are required. This is a visual arcade game.

The previous Kitchen Party game has been replaced by this focused game. Its 3D dependency is no longer used. Future FunApps deployments can use the same standalone Netlify workflow.
