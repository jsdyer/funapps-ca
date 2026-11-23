# Game search setup

The deploy includes an individual sitemap at `https://donair.funapps.ca/sitemap.xml`
and a shared games sitemap at `https://donair.funapps.ca/games-sitemap.xml`.
`robots.txt` advertises the individual sitemap. Titles, descriptions, canonical
URLs, social sharing metadata, and factual game structured data are in the HTML.
The instructions and game description are visible HTML, not only canvas pixels.

## Submit once in Google Search Console

1. Open https://search.google.com/search-console/ and add a **Domain** property
   named `funapps.ca` (without `https://` or a path), unless already verified.
2. Verify the domain using Google's supplied DNS record. A Domain property
   covers `donair.funapps.ca`, `clams.funapps.ca`, and future subdomains.
3. Open **Sitemaps** and submit the full URL:
   `https://donair.funapps.ca/games-sitemap.xml`.
4. Optionally inspect each game's canonical URL and request indexing.

Google allows a sitemap containing URLs from multiple sites when ownership of
all the sites has been verified. The shared sitemap is intended for that Search
Console workflow. Each game's individual sitemap also works independently.
Discovery and indexing can take time; a sitemap does not guarantee indexing or
ranking. No Search Console verification or submission is performed by the build.

## Publish Clams & Chips and add future games

`games.json` is the editable game list. Clams is included with `published: true` because its game is deployed. Before
submitting this combined sitemap, finish the CNAME setup and confirm
`https://clams.funapps.ca/` resolves over HTTPS. Add
future games as more entries; each needs its canonical URL, the date of its last
meaningful page update, and `published: true` when live.

Run:

```sh
python3 build.py
```

Deploy `donair-dash-netlify.zip` to the existing Donair project. The build
regenerates `games-sitemap.xml` and includes it in the deploy. Do not refresh
`lastmod` merely because a build ran. If you change Donair's content, update its
date in both `games.json` and `sitemap.xml`.

Each new game should have its own `robots.txt`, individual `sitemap.xml`,
canonical tag, readable description and instructions, and social metadata.
Link the games to each other once their final domains work. If a future game has
additional meaningful public pages, include those pages too; do not list scripts,
stylesheets, canvases, image files, or gameplay states as separate sitemap URLs.

Official documentation:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/webmasters/answer/34592
