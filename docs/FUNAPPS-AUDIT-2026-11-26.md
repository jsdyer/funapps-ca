# FunApps game and deployment audit

26 November 2026, Pacific time

The live homepage lists 53 arcade games and 10 Little Breaks activities. Fifteen separately published Netlify games were missing from the main branch and the catalogue. Their production uploads are now under `standalone-games/`. Boardwalk Bandit was recovered from its open game branch, merged with the existing catalogue, and published on both the hub and its previously empty Netlify project.

## Production checks

| Check | Result |
| --- | --- |
| Homepage links | 224 rendered anchors, 113 distinct link targets and 111 distinct HTTP destinations. Every destination returned 200. The three in-page destinations exist. |
| Game identity | All 53 cards have a matching detail page, heading, canonical URL and launch link. All 53 game pages opened in Chromium. |
| Homepage controls | Search and reset worked. Activity filters switched correctly. All nine inline activities opened and closed without a JavaScript exception. Packet Trace opened at its own address. |
| Sitemap and routing | 81 unique sitemap entries. The www and HTTP homepage addresses resolve to the HTTPS apex. Both legacy sitemap URLs resolve to the current XML. A missing page returns 404. |
| Independently built game sources | The five imported projects with build steps built locally from their lockfiles. Ten additional uploads were already deployable static files. |
| Netlify inventory | 41 projects examined. The hub, 38 dedicated game projects and one duplicate account for 40. The remaining project is an older deployment of a separate repository. |

## Repairs

- Eight verified custom subdomains are now used by the cards, game details and sitemap. Other games retain their working launch addresses.
- Donair Drop now uses its published title. Its existing detail URL is preserved.
- Harbour Donair and Parking Scramble now publish a stable stylesheet URL shared by the initial HTML and the browser application. Both previously requested CSS files that returned 404.
- Last Spot at New London now publishes a valid application manifest and prerenders its game entry page. Its former static shell produced a React hydration error on launch.
- Prairie Windrider now serves the p5 diagnostic dictionaries with the game. Browsers using regional English locales previously requested a missing file on startup. The game’s 17 automated tests passed.
- The extra YES B’Y project now serves the same release and icons as the primary copy. The catalogue lists the game once.

## Source and publishing inventory

The hub publishes its own games from GitHub `main`. Each independently deployed project has its own production release. A hub push updates its listing and detail page. To update the game at a separate Netlify address, package the matching directory using `python scripts/build_standalone.py --slug <slug>` and publish that package to the project listed below. The five imported framework projects package tracked build source and their Netlify configuration. Original static releases package their game files directly.

| Game and live play link | Maintained game files | Netlify project |
| --- | --- | --- |
| [Last Boat](https://funapps.ca/play/last-boat/) | [last-boat](../standalone-games/last-boat/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Bring 'Em In](https://funapps.ca/play/bring-em-in/) | [bring-em-in](../standalone-games/bring-em-in/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Boardwalk Bandit](https://funapps.ca/play/boardwalk-bandit/) | [boardwalk-bandit](../standalone-games/boardwalk-bandit/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) and [dedicated copy](https://app.netlify.com/projects/boardwalk-bandit-funapps/deploys) |
| [Westward: Mountain Run](https://funapps.ca/play/rockies-explorer/) | [rockies-explorer](../standalone-games/rockies-explorer/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Prairie Windrider](https://funapps.ca/play/prairie-windrider/) | [prairie-windrider](../standalone-games/prairie-windrider/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [North of the Harbour: Supply Run](https://funapps.ca/play/arctic-expedition/) | [arctic-expedition](../standalone-games/arctic-expedition/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Bonjour, voisin! — Québec](https://funapps.ca/play/quebec-bonjour/) | [quebec-bonjour](../standalone-games/quebec-bonjour/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Signal Hill: 1901](https://funapps.ca/play/cabot-tower-signals/) | [cabot-tower-signals](../standalone-games/cabot-tower-signals/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Niagara: Current Keeper](https://funapps.ca/play/niagara-currents/) | [niagara-currents](../standalone-games/niagara-currents/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Fundy Tidekeeper](https://funapps.ca/play/fundy-tidekeeper/) | [fundy-tidekeeper](../standalone-games/fundy-tidekeeper/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Cabot Trail: Postcard Cruise](https://funapps.ca/play/cabot-trail/) | [cabot-trail](../standalone-games/cabot-trail/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Hemmed In: Confederation Bridge](https://funapps.ca/play/confederation-bridge/) | [confederation-bridge](../standalone-games/confederation-bridge/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Kouchibouguac: Trail Ride](https://funapps.ca/play/kouchibouguac-cycle/) | [kouchibouguac-cycle](../standalone-games/kouchibouguac-cycle/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [PEI Potato Harvest](https://funapps.ca/play/pei-potato-harvest/) | [pei-potato-harvest](../standalone-games/pei-potato-harvest/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Newfoundland Ferry](https://funapps.ca/play/newfoundland-ferry/) | [newfoundland-ferry](../standalone-games/newfoundland-ferry/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Jellybean Row](https://jellybean-row-funapps.netlify.app/) | [jellybean-row](../standalone-games/jellybean-row/) | [jellybean-row-funapps](https://app.netlify.com/projects/jellybean-row-funapps/deploys) |
| [Postcards from Canada](https://funapps.ca/play/canada-roadtrip/) | [canada-roadtrip](../standalone-games/canada-roadtrip/) | [funapps-hub](https://app.netlify.com/projects/funapps-hub/deploys) |
| [Donair Drop](https://donair.funapps.ca/) | [donair-dash](../standalone-games/donair-dash/) | [soft-khapse-6eba6b](https://app.netlify.com/projects/soft-khapse-6eba6b/deploys) |
| [Clams & Chips: Fryday Rush](https://clams.funapps.ca/) | [clams-and-chips](../standalone-games/clams-and-chips/) | [clams-funapps](https://app.netlify.com/projects/clams-funapps/deploys) |
| [Shell Shocked: Harbourfront Lobster Rush](https://shell-shocked-lobster.netlify.app/) | [shell-shocked](../standalone-games/shell-shocked/) | [shell-shocked-lobster](https://app.netlify.com/projects/shell-shocked-lobster/deploys) |
| [Some Steep! A Maritimer Skis Banff](https://banff-funapps.netlify.app/) | [some-steep-banff](../standalone-games/some-steep-banff/) | [banff-funapps](https://app.netlify.com/projects/banff-funapps/deploys) |
| [Wildlife Jam! A Maritimer Drives Banff](https://wildlife-jam-funapps.netlify.app/) | [wildlife-jam-banff](../standalone-games/wildlife-jam-banff/) | [wildlife-jam-funapps](https://app.netlify.com/projects/wildlife-jam-funapps/deploys) |
| [Kitchen Party: Outta Hand!](https://outta-hand.funapps.ca/) | [kitchen-party-outta-hand](../standalone-games/kitchen-party-outta-hand/) | [polite-flan-9cfec6](https://app.netlify.com/projects/polite-flan-9cfec6/deploys) |
| [Sou’wester Survival](https://souwester.funapps.ca/) | [souwester-survival](../standalone-games/souwester-survival/) | [grand-mermaid-96fb8f](https://app.netlify.com/projects/grand-mermaid-96fb8f/deploys) |
| [True North Turbo](https://turbo.funapps.ca/) | [true-north-turbo](../standalone-games/true-north-turbo/) | [startling-sunburst-a54d03](https://app.netlify.com/projects/startling-sunburst-a54d03/deploys) |
| [Kitchen Party: Coast-to-Coast Chaos](https://coast-to-coast.funapps.ca/) | [coast-to-coast-chaos](../standalone-games/coast-to-coast-chaos/) | [deluxe-crepe-96ca99](https://app.netlify.com/projects/deluxe-crepe-96ca99/deploys) |
| [One More Tune!](https://one-more-tune.funapps.ca/) | [one-more-tune](../standalone-games/one-more-tune/) | [earnest-licorice-5a7566](https://app.netlify.com/projects/earnest-licorice-5a7566/deploys) |
| [Double-Double Empire](https://double-double.funapps.ca/) | [double-double-empire](../standalone-games/double-double-empire/) | [delightful-basbousa-d3a469](https://app.netlify.com/projects/delightful-basbousa-d3a469/deploys) |
| [SOME GOOD! — The Great Maritime Gauntlet](https://gauntlet.funapps.ca/) | [great-maritime-gauntlet](../standalone-games/great-maritime-gauntlet/) | [zesty-strudel-74c18c](https://app.netlify.com/projects/zesty-strudel-74c18c/deploys) |
| [Some Good Kitchen Party](https://kitchen-party.funapps.ca/) | [some-good-kitchen-party](../standalone-games/some-good-kitchen-party/) | [tourmaline-vacherin-14601c](https://app.netlify.com/projects/tourmaline-vacherin-14601c/deploys) |
| [The Trans-Canada Trek](https://teal-puffpuff-416dc8.netlify.app/) | [trans-canada-trek](../standalone-games/trans-canada-trek/) | [teal-puffpuff-416dc8](https://app.netlify.com/projects/teal-puffpuff-416dc8/deploys) |
| [Keep ’Er Goin’!](https://superlative-valkyrie-a47571.netlify.app/) | [keep-er-goin](../standalone-games/keep-er-goin/) | [superlative-valkyrie-a47571](https://app.netlify.com/projects/superlative-valkyrie-a47571/deploys) |
| [YES B’Y! — The Great East Coast Clicker](https://super-malasada-822d82.netlify.app/) | [yes-by](../standalone-games/yes-by/) | [super-malasada-822d82](https://app.netlify.com/projects/super-malasada-822d82/deploys) |
| [Out for a Rip](https://loquacious-kashata-3d2d49.netlify.app/) | [out-for-a-rip](../standalone-games/out-for-a-rip/) | [loquacious-kashata-3d2d49](https://app.netlify.com/projects/loquacious-kashata-3d2d49/deploys) |
| [Maritime Merchant: The Cabot Trail](https://stirring-capybara-79a5a5.netlify.app/) | [maritime-merchant](../standalone-games/maritime-merchant/) | [stirring-capybara-79a5a5](https://app.netlify.com/projects/stirring-capybara-79a5a5/deploys) |
| [Kitchen Party Tycoon](https://bucolic-starship-966249.netlify.app/) | [kitchen-party-tycoon](../standalone-games/kitchen-party-tycoon/) | [bucolic-starship-966249](https://app.netlify.com/projects/bucolic-starship-966249/deploys) |
| [Some Good Game — East Coast Mayhem](https://golden-blancmange-09bd5c.netlify.app/) | [east-coast-mayhem](../standalone-games/east-coast-mayhem/) | [golden-blancmange-09bd5c](https://app.netlify.com/projects/golden-blancmange-09bd5c/deploys) |
| [Fog Over Fundy](https://kaleidoscopic-mochi-6070f2.netlify.app/) | [fog-over-fundy](../standalone-games/fog-over-fundy/) | [kaleidoscopic-mochi-6070f2](https://app.netlify.com/projects/kaleidoscopic-mochi-6070f2/deploys) |
| [Harbour Donair](https://harbour-donair-funapps.netlify.app/) | [harbour-donair](../standalone-games/harbour-donair/) | [harbour-donair-funapps](https://app.netlify.com/projects/harbour-donair-funapps/deploys) |
| [Powerline Pedal](https://powerline-funapps.netlify.app/) | [powerline-pedal](../standalone-games/powerline-pedal/) | [powerline-funapps](https://app.netlify.com/projects/powerline-funapps/deploys) |
| [One Bar — Dead Zone: Trans-Canada](https://one-bar-funapps.netlify.app/) | [one-bar](../standalone-games/one-bar/) | [one-bar-funapps](https://app.netlify.com/projects/one-bar-funapps/deploys) |
| [Harbour Candlepin](https://candlepin-funapps.netlify.app/) | [harbour-candlepin](../standalone-games/harbour-candlepin/) | [candlepin-funapps](https://app.netlify.com/projects/candlepin-funapps/deploys) |
| [Return Chute](https://returnchute-funapps.netlify.app/) | [return-chute](../standalone-games/return-chute/) | [returnchute-funapps](https://app.netlify.com/projects/returnchute-funapps/deploys) |
| [Arrow: Keep Her Flying](https://arrow-funapps.netlify.app/) | [avro-arrow](../standalone-games/avro-arrow/) | [arrow-funapps](https://app.netlify.com/projects/arrow-funapps/deploys) |
| [Loonie Meltdown](https://loonie-funapps.netlify.app/) | [loonie-meltdown](../standalone-games/loonie-meltdown/) | [loonie-funapps](https://app.netlify.com/projects/loonie-funapps/deploys) |
| [Stay Off the Black Rocks!](https://blackrocks-funapps.netlify.app/) | [black-rocks](../standalone-games/black-rocks/) | [blackrocks-funapps](https://app.netlify.com/projects/blackrocks-funapps/deploys) |
| [Parking Scramble](https://parking-scramble-funapps.netlify.app/) | [parking-scramble](../standalone-games/parking-scramble/) | [parking-scramble-funapps](https://app.netlify.com/projects/parking-scramble-funapps/deploys) |
| [Park Hopper](https://park-hopper-funapps.netlify.app/) | [park-hopper](../standalone-games/park-hopper/) | [park-hopper-funapps](https://app.netlify.com/projects/park-hopper-funapps/deploys) |
| [Mountie Ride Home](https://rcmp-funapps.netlify.app/) | [mountie-ride-home](../standalone-games/mountie-ride-home/) | [rcmp-funapps](https://app.netlify.com/projects/rcmp-funapps/deploys) |
| [Last Spot at New London](https://last-spot-funapps.netlify.app/) | [last-spot](../standalone-games/last-spot/) | [last-spot-funapps](https://app.netlify.com/projects/last-spot-funapps/deploys) |
| [Citadel Hill Climb](https://citadel-funapps.netlify.app/) | [citadel-hill-climb](../standalone-games/citadel-hill-climb/) | [citadel-funapps](https://app.netlify.com/projects/citadel-funapps/deploys) |
| [Bluenose — Race for the Fishermen’s Trophy](https://bluenose-funapps.netlify.app/) | [bluenose](../standalone-games/bluenose/) | [bluenose-funapps](https://app.netlify.com/projects/bluenose-funapps/deploys) |
| [Pepperoni Rain](https://pepperoni-rain.netlify.app/) | [pepperoni-rain](../standalone-games/pepperoni-rain/) | [pepperoni-rain](https://app.netlify.com/projects/pepperoni-rain/deploys) |

The browser checks cover launch, homepage navigation and selected new-game controls. Completing every game or testing on physical phones was outside this verification.
