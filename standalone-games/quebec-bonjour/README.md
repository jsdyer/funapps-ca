# Bonjour, voisin! — Your Table in Québec

You are now the **English-speaking customer**, visiting a small Québec restaurant from the Maritimes. A clear picture and English label show what you want. Pick one of three short French phrases, watch Élise bring the item to your table, and build toward ordering a whole meal. The full older village adventure is still available through **Village adventure** at `classic.html`.

## Restaurant visit

The visit has six requests: **coffee, bread, soup, water, cake, and the bill**. It starts with polite noun phrases, then introduces **Je voudrais…** (I’d like…), and ends with **L’addition, s’il vous plaît.** (The bill, please.) The player chooses what to say; they do not serve other customers or manage a kitchen.

- **Take a seat**, Space or a numbered choice starts. The restaurant and friendly server are already visible and animated; there is no tutorial dialog.
- Choose a French phrase by tapping its card or pressing **1**, **2**, **3**. Pictures and English wishes stay visible throughout.
- The first two requests show English translations beneath all choices. Later requests invite the player to try French; **English help** is always available, with no penalty. The server’s responses always include a concise English translation.
- A wrong choice illustrates what that phrase means and invites another try. It never removes points or blocks the meal.
- A correct choice earns 100 points and animates the item arriving. A short 1.35-second delivery transition prevents duplicate scoring before the next request. All six requests yield **600 points**.
- There is **no countdown**. This is a short, friendly ordering encounter, not a speed or pronunciation test. All play works silently.
- **Pause**, **P** or **Escape** pauses. Losing focus or hiding the page also pauses, including an in-progress delivery. Resume is explicit; late frames are bounded.
- The ending offers **Visit again** and **Keep these six phrases**, a bilingual illustrated phrase collection. Replay resets the requests, score and mistakes.
- Reduced-motion preference disables decorative animation. Native buttons support Tab/Enter and touch. Alpine.js and all artwork are bundled locally; no CDN, remote fonts, account or external API is needed.

## Validation and browser walkthrough

`npm test`: **18 passing tests** (eight restaurant-rule tests plus ten preserved village-rule tests). `npm run build` produces both modes and retains runtime license notices. Tests cover all choice sets and translations, friendly incorrect-choice recovery, locked delivery transitions, pause/resume, language progression, complete six-request finish, terminal scoring, restart and invalid/late inputs.

1. **Take a seat**. The wish is **Coffee**. Choose **Un café, s’il vous plaît.** (key **2**). Expect a cup on the table, 100 points, then the bread request.
2. Choose **Du pain, s’il vous plaît.** (**1**).
3. For soup, choose **Je voudrais une soupe.** (**2**). Toggle **English help** if wanted; it is free.
4. For water, choose **De l’eau, s’il vous plaît.** (**3**).
5. For cake, choose **Je voudrais une part de gâteau.** (**1**).
6. For the bill, choose **L’addition, s’il vous plaît.** (**2**). Expect **600 points** and the ending after delivery.
7. **Keep these six phrases** displays all six correct phrases with English meanings. **Visit again** starts a clean meal.

Recovery check: on the first request choose **Du pain, s’il vous plaît.** (**1**). A bread illustration appears, the server explains that it means bread, and the coffee wish remains. Choose **2** to recover without losing points. Pause during any delivery to verify that progression waits for resume.

## Preserved village adventure

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
