# Clams & Chips — Fryday Rush

A standalone 90-second Maritime fry-shack game: breaded, deep-fried clam meat and thick-cut fried potato chips. No accounts, remote assets, APIs, analytics or backend. Personal best is saved to localStorage when available. Sound is opt-in.

## Play

Tap a fryer to load it; tap when golden to lift 3 portions. Match the order quantities and serve. Keyboard: 1 clams, 2 chips, Space serve, P/Escape pause. The game pauses when the tab is hidden. Burnt baskets must be cleared. Early lifts waste the batch. Every consecutive order raises the score multiplier up to 3×; missed customers reset it.

## Develop and deploy

Run `node --test tests/*.test.mjs` then `python3 build.py`. Upload `clams-chips-netlify.zip` to the existing Netlify project `clams-funapps` (ID 5888ff4d-755d-404e-b264-a7d3dee0694f). The deployment archive contains only the public game files.

For future Git-based Netlify deploys: build command `python3 build.py`, publish directory `dist`, no dependencies or environment variables required. Deploy from the project root.

Use Netlify Domain management to assign `clams.funapps.ca`, then create the CNAME instructed by Netlify, normally `clams` → `clams-funapps.netlify.app` at the authoritative DNS provider. Let Netlify provision HTTPS before submitting the sitemap.

## Easy changes

- `engine.mjs` / `GAME_CONFIG`: round length, cooking times, golden windows, portions, patience and scoring. Cooking time uses capped animation frames; hidden tabs pause.
- `app.mjs`: controls, announcements, sounds and presentation.
- `art.mjs`: original Canvas illustrations of fried clam meat and chips.
- `style.css`: colours, layout and responsive presentation.
- `index.html`: search copy, canonical URL and VideoGame structured data.
- `sitemap.xml` and `robots.txt`: public hostname for Google.

## Search indexing

After the custom domain is live, verify `funapps.ca` as a Domain property in Google Search Console using the supplied DNS TXT record. Submit `https://clams.funapps.ca/sitemap.xml`. Only the playable canonical page belongs in this game's sitemap; scripts and artwork are not index pages. Static HTML includes the game description and instructions. A sitemap helps discovery but does not guarantee indexing or ranking.

The related Donair Dash project also contains an extensible games.json and combined games-sitemap.xml; add only published game URLs there.
