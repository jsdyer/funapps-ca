"""Generate the browsing apps, including indexable local outing guides."""
from html import escape
import json
from pathlib import Path
from shutil import copy2

from scripts.game_favicons import apply_favicons

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "lifestyle"
REGIONS = ("Halifax", "Langley")
CHECKED = "2026-11-26"


def read(name):
    return json.loads((DATA / name).read_text())


def routes(apps):
    return [f"/apps/{app['slug']}/" for app in apps] + [
        f"/apps/two-hour-escape/{region.lower()}/" for region in REGIONS]


def home_sections(apps):
    groups = []
    for title, anchor in (("Go out", "go-out"), ("Find a deal", "find-a-deal")):
        cards = []
        for app in (app for app in apps if app["section"] == title):
            slug = app["slug"]
            cards.append(f'''<article class="app-teaser"><img src="/icons/{slug}.png" width="70" height="70" alt="">
<div><h3><a href="/apps/{slug}/">{escape(app['name'])}</a></h3><p>{escape(app['description'])}</p></div></article>''')
        groups.append(f'<section id="{anchor}" class="app-shelf"><h2>{title}</h2>{"".join(cards)}</section>')
    return '<div class="app-shelves">' + ''.join(groups) + '</div>'


def options(app, rows, region):
    fixed = {"minutes": [("30", "30 minutes"), ("60", "1 hour"), ("90", "90 minutes"), ("120", "2 hours")],
             "sale": [("sale", "On sale only")],
             "budget": [("500", "$5 CAD"), ("1500", "$15 CAD"), ("3000", "$30 CAD"), ("5000", "$50 CAD")]}
    fields = []
    for key, label in app["filters"]:
        values = fixed.get(key)
        if values is None:
            values = [(v, v) for v in sorted({row[key] for row in rows})]
        default = {"region":"Both regions","minutes":"Up to 2 hours","budget":"Under $50 CAD","sale":"All qualifying games"}.get(key, "Any")
        opts = [f'<option value="">{default}</option>']
        for value, text in values:
            selected = ' selected' if key == 'region' and value == region else ''
            opts.append(f'<option value="{escape(value)}"{selected}>{escape(text)}</option>')
        fields.append(f'<label>{escape(label)}<select name="{key}">{"".join(opts)}</select></label>')
    return ''.join(fields)


def result_card(app, row, rows, snapshot):
    slug = app["slug"]
    attrs = {"id": row["id"], **{k: str(row[k]) for k in ("region","minutes","mood","admission","players","cents") if k in row}}
    attr = ' '.join(f'data-{k}="{escape(v)}"' for k, v in attrs.items())
    title = escape(row["name"])
    end = ''
    hidden = ''
    extra = ''
    if slug in ("two-hour-escape", "rainy-saturday"):
        meta = row["location"] + " · " + (str(row["minutes"]) + " min on site" if "minutes" in row else row["admission"])
        extra = '<p class="challenge">'+escape(row["challenge"])+'</p>'
        link, label = row["link"], row["source"] + " visitor information"
        if row.get("snack"):
            stop = row["snack"]
            end = f'<p>Snack detour: <a href="{escape(stop["url"])}">{escape(stop["name"])}</a>. {escape(stop["tip"])}</p>'
        if row.get("calendar"):
            end = f'<p><a href="{escape(row["calendar"])}">Check the library event calendar</a> for a programme to pair with your visit.</p>'
        if row.get("backup"):
            backup = next(other for other in rows if other["id"] == row["backup"])
            end = f'<p>Free backup: <a href="{escape(backup["link"])}">{escape(backup["location"])}</a></p>'
    elif slug == "game-night":
        meta = row["mood"] + " · " + row["players"]
        price = snapshot["prices"].get(row["id"], {})
        visible = isinstance(price.get("cents"), int) and price["cents"] < 1500
        hidden = '' if visible else ' hidden'
        line = f'Last checked CAD ${price["cents"]/100:.2f}' if visible else 'Price unavailable'
        extra = '<p class="price">'+line+'</p>'
        label, link = "View on Steam Canada", f'https://store.steampowered.com/app/{row["id"]}/?cc=ca'
    else:
        meta = row["shop"] + " · " + row["mood"]
        extra = f'<p class="price">CAD ${row["cents"]/100:.2f}</p><p>{escape(row["origin"])}</p>'
        end = '<label class="pick"><input type="checkbox" class="shortlist"> Add to shortlist</label>'
        label, link = "Check shop price", row["link"]
    event = ' data-umami-event="deal-open" data-umami-event-item="'+escape(row["id"])+'"' if slug in ("game-night","canadian-finds") else ''
    return f'''<article class="result" {attr}{hidden}><p class="result-meta">{escape(meta)}</p><h2>{title}</h2>
<p>{escape(row["description"])}</p>{extra}<a class="source-link" href="{escape(link)}"{event}>{escape(label)} ↗</a>{end}</article>'''


def publish(dist, base, page_head, apps):
    data = read("outings.json")
    finds, snapshot = read("finds.json"), read("steam-snapshot.json")
    data.update({"game-night": read("store-games.json"), "canadian-finds": finds["items"]})
    for name in ("lifestyle.js", "lifestyle.css"):
        copy2(DATA / name, dist / name)
    for app in apps:
        slug = app["slug"]
        root = dist / "apps" / slug
        copy2(ROOT / "game-icons" / slug / "favicon.png", dist / "icons" / (slug + ".png"))
        for region in (("", *REGIONS) if slug == "two-hour-escape" else ("",)):
            rows = data[slug]
            destination = root / region.lower()
            destination.mkdir(parents=True, exist_ok=True)
            canonical = base + "/apps/" + slug + "/" + (region.lower() + "/" if region else "")
            title = app["name"] + (" in " + region if region else "")
            description = app["description"] if not region else f"Choose a 30-, 60- or 90-minute outing around {region} with a walking idea, a small challenge and the official visitor link."
            schema = {"@context":"https://schema.org","@type":"WebApplication","name":title,"url":canonical,"description":description,"applicationCategory":"LifestyleApplication","operatingSystem":"Any","inLanguage":"en-CA"}
            head = page_head(title+" | FunApps", description, canonical, schema)
            head = head.replace('</head>', '<link rel="stylesheet" href="/lifestyle.css"><script src="/lifestyle.js" defer></script></head>')
            heading = "Go out" if app["section"] == "Go out" else "Find a deal"
            head = head.replace('<a href="/#arcade">All games</a>', f'<a href="/#{heading.lower().replace(" ","-")}">{heading}</a>')
            region_nav = ''
            if slug == "two-hour-escape":
                region_nav = '<nav class="regions" aria-label="Local outing guides"><a href="/apps/two-hour-escape/">Both regions</a>' + ''.join(f'<a href="/apps/two-hour-escape/{r.lower()}/">{r} guide</a>' for r in REGIONS)+'</nav>'
            note = "Check the venue for hours, admission and closures before heading out."
            state = {}
            if slug == "game-night":
                state = snapshot
                note = 'Price snapshot from '+snapshot["checked"][:10]+'. Open Steam to confirm availability.'
            if slug == "canadian-finds":
                note = 'Shop prices checked '+finds["checked"]+'. Stock and shipping vary by retailer.'
            cards = ''.join(result_card(app,row,rows,snapshot) for row in rows if not region or row["region"]==region)
            summary = '<aside class="shortlist-summary" id="shortlist-total" aria-live="polite">Your shortlist is empty.</aside>' if slug == "canadian-finds" else ''
            regions = ' data-region="'+region+'"' if region else ''
            visible_filters = [f for f in app["filters"] if not(region and f[0]=="region")]
            controls = options({**app, "filters":visible_filters},rows,region)
            markup = f'''<main id="main" class="app-main" data-app="{slug}"{regions}>
<div class="app-intro" style="--tint:{app['color']}"><img alt="" src="/icons/{slug}.png" width="88" height="88"><div><h1>{escape(title)}</h1><p>{escape(app['intro'] if not region else description)}</p></div></div>
{region_nav}<form class="app-controls" hidden>{controls}<button type="reset">Reset</button></form>
<p class="source-note" id="source-note">{escape(note)}</p>{summary}<p id="count" role="status"></p>
<div class="results">{cards}</div><p id="no-results" hidden>No matches for these choices. Try another filter or reset.</p>
<script type="application/json" id="app-state">{json.dumps(state)}</script>
<footer class="app-footer"><a href="/games/{app['related_game']['slug']}/">Try {escape(app['related_game']['name'])}</a><a href="/">FunApps home</a><a href="/#{heading.lower().replace(" ","-")}">More ways to {heading.lower()}</a></footer></main></body></html>'''
            (destination / "index.html").write_text(head + markup)
        apply_favicons(slug, root)
