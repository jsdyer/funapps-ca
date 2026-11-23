# Bonjour, voisin !

A complete illustrated neighbourhood adventure built with **Alpine.js 3.17.5**, native HTML/SVG/CSS and a locally bundled JavaScript runtime. A Maritime visitor follows clues around the invented Québec village of Port-Lumière, carries parcels to their recipients, helps a market grower, and finds the right place for a neighbourhood supper.

Production route: `https://funapps.ca/play/quebec-bonjour/`.

## Play

Nine places can be visited in any order. The core task is to collect **bread, apples and a tablecloth**, then find the **lantern garden**. Parcels have recipient clues; matching objects to people unlocks the supper supplies. An optional music pavilion puzzle asks the player to arrange three sound cards in a stated order. The windy lookout provides another location clue and a useful notebook phrase.

This is an inventory-and-dialogue adventure, not a vocabulary test. Every essential action uses English controls. French dialogue has English translations enabled by default; the player can toggle them at any time with no penalty. The phrase notebook always includes both languages. Hints are free. Wrong deliveries keep the object, wrong sound choices reset the short sequence, and every wrong turn is recoverable. There is no timer, spending currency, real-time animation dependency, or unwinnable state.

Score: 500 for finishing supper, 20 per unique place visited, 100 for the optional tune. Seven required locations yield 640; visiting all nine and solving the tune yields **780**. Translation use and hints do not reduce scores. The best score is stored locally when browser storage is available. A reload starts a new visit; in-progress errands are deliberately not saved.

## Controls

- Click/tap a destination in **Explore the village**. All locations also work with Tab and Enter.
- At the post office/orchard, use the collection buttons.
- Select an object in **Your traveller’s bag** to read its French and English label.
- At the bakery, market or sewing studio, use **Offer [selected item]**.
- **Show English translations** controls dialogue and label translations. The phrase notebook always stays bilingual.
- At the pavilion, choose Bell, Rain and Waves in the order in Luc’s clue. Audio is not required or produced.
- **A friendly hint** gives the next useful step in English.
- **New visit** asks before discarding progress. Native dialog focus handling supports keyboard navigation and Escape. On the intro, closing/Escape begins the visit; other dialogs close without changing game progress.

## Exact winning browser walkthrough

1. **Let’s meet the neighbours**. The game starts at Arrival quay.
2. Visit **Post office**. Collect the **brown parcel**, then the **blue parcel**.
3. Visit **Bakery**. Select **Brown parcel** in the bag, then **Offer brown parcel**. It becomes **Fresh bread**.
4. Visit **Sewing studio**. Select **Blue parcel**, then **Offer blue parcel**. It becomes **Tablecloth**.
5. Visit **Community orchard**. **Collect the empty crate**.
6. Visit **Market square**. With Empty crate selected, **Offer empty crate**. It becomes **A crate of apples**.
7. Optional for maximum score: visit **Music pavilion**, then choose **Bell**, **Rain**, **Waves**. A little melody appears in the bag. Also visit **Windy lookout**.
8. Visit **Lantern garden**. **Set the supper table**. Expect the ending “There’s a place for you, too.” and **780** if all nine locations/tune were completed, or **640** without the optional detours.
9. **Keep the phrases** opens the bilingual notebook; **Take another little detour** restarts with an empty bag and the intro. Best score persists.

Additional QA:

- Offer the blue parcel at the bakery: it stays in your bag and a friendly message explains the mismatch.
- Try finishing at the quay/lookout or with missing items: no progress is lost and the next requirement is stated.
- Hide translations, open the notebook, and verify English remains there. Re-enable translations at any scene.
- Choose Waves first in the tune, then Bell/Rain/Waves: the wrong attempt is recoverable and earns the same bonus.
- At phone width, navigation and inventory wrap without smaller essential text; the document scrolls naturally. Dialogs scroll independently on short displays.

## Build and test

```sh
npm ci
npm test
npm run build
```

Node 22+ is sufficient; verified on Node 24. The dependency lockfile is committed. `build.mjs` bundles Alpine and its Vue reactivity dependencies through esbuild, copies HTML/CSS, and retains their full MIT notices in `web/THIRD-PARTY-LICENSES.txt`.

Deploy all of `web/` recursively. Runtime asset URLs are relative. The parent FunApps Python build can copy the directory into `/play/quebec-bonjour/`; an independent static host also works. No runtime CDN, remote font, account, API key, image service or analytics is needed. All scene art is original SVG generated from trusted built-in data.

Ten rule tests cover basic and maximal winning paths, pickup locations/uniqueness, recoverable wrong offers, atomic exchanges, melody recovery/uniqueness, destination and inventory requirements, hint scoring/unique visits, immutable state and ended-game guards, and bilingual content coverage.

## Source notes

Port-Lumière, its map, characters and errands are invented. The game is inspired by an English-speaking Maritime visitor encountering a French-speaking Québec village; it does not reproduce a real town or imply all residents have the same language or background. No personal travel data is collected.

Primary references consulted 23 November 2026:

- [Bonjour Québec — Languages and customs](https://www.bonjourquebec.com/en/plan-your-trip/useful-information/languages-and-customs), official Québec tourism context for French language and welcoming everyday expressions.
- [Alpine.js — Installation](https://alpinejs.dev/essentials/installation), bundled module registration and startup.
- [Alpine.js — x-for](https://alpinejs.dev/directives/for), template iteration.

Dialogue and translations are original game writing. There are no quoted source passages or scraped tourism assets.
