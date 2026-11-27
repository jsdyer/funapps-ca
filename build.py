#!/usr/bin/env python3
"""Build the static FunApps hub from its editable catalogue. No dependencies."""

import html
from scripts.game_favicons import apply_favicons
from datetime import date
import json
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PUBLIC_FILES = (
    "styles.css", "games.css", "postcards.css", "roadtrip.css", "extra.css",
    "rain-window.css", "postcard-maker.css", "detail.css", "favicon.ico", "favicon.png", "apple-touch-icon.png",
    "games.js", "postcards.js", "roadtrip.js", "extra.js", "rain-window.js",
    "postcard-maker.js", "extensions.js", "app.js", "catalogue.js",
)
PACKET_FILES = ("index.html", "app.js", "styles.css", "engine.js", "scene.js")


def esc(value):
    return html.escape(str(value), quote=True)


def json_ld(value):
    # A catalogue description must never be able to terminate its script element.
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace(
        ">", "\\u003e"
    ).replace("&", "\\u0026")


def validate_url(value, field):
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an HTTPS URL")
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username
            or parsed.password or parsed.query or parsed.fragment
            or any(ch.isspace() for ch in value)):
        raise ValueError(f"{field} must be an HTTPS URL without credentials, query or fragment")
    return parsed


def validate_config(config):
    base = validate_url(config["base_url"], "base_url")
    if base.path not in ("", "/"):
        raise ValueError("base_url must be a site origin")
    for field in ("title", "description"):
        if not isinstance(config.get(field), str) or not config[field].strip():
            raise ValueError(f"{field} must be nonempty text")
    games, slugs, urls = [], set(), set()
    for game in config["games"]:
        slug = game.get("slug", "")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError(f"Invalid game slug: {slug!r}")
        if slug in slugs:
            raise ValueError(f"Duplicate game slug: {slug}")
        slugs.add(slug)
        for field in ("name", "description", "category", "icon"):
            if not isinstance(game.get(field), str) or not game[field].strip():
                raise ValueError(f"{slug}: {field} must be nonempty text")
        validate_url(game.get("url"), f"{slug}.url")
        if game.get("local_bundle") and game["url"] != config["base_url"].rstrip("/") + f"/play/{slug}/":
            raise ValueError(f"{slug}: a local bundle must use its /play/{slug}/ URL")
        if game.get("audited_at"):
            date.fromisoformat(game["audited_at"])
        if game.get("custom_domain") and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*\.funapps\.ca", game["custom_domain"]):
            raise ValueError(f"{slug}: invalid custom domain")
        key = game["url"].rstrip("/").lower()
        if key in urls:
            raise ValueError(f"Duplicate game URL: {game['url']}")
        urls.add(key)
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", game.get("color", "")):
            raise ValueError(f"{slug}: color must be a six-digit hex colour")
        if "controls" in game and (not isinstance(game["controls"], list)
                or any(not isinstance(item, str) or not item.strip() for item in game["controls"])):
            raise ValueError(f"{slug}: controls must be a list of nonempty strings")
        if game.get("published", True):
            games.append(game)
    return sorted(games, key=lambda game: not game.get("featured", False))


def detail_path(game):
    return f"/games/{game['slug']}/"


def game_card(game):
    classes = "arcade-card featured" if game.get("featured") else "arcade-card"
    search = " ".join(game[field] for field in ("name", "description", "category"))
    return f'''<article class="{classes}" data-category="{esc(game['category'])}" data-search="{esc(search)}">
  <a class="arcade-art" href="{esc(game['url'])}" style="--card-color: {game['color']}" tabindex="-1" aria-hidden="true"><img src="/icons/{game['slug']}.png" alt="" width="84" height="84" loading="lazy" decoding="async"></a>
  <div class="arcade-body"><span class="game-tag">{esc(game['category'])}</span>
    <h3><a href="{esc(game['url'])}">{esc(game['name'])}</a></h3>
    <p>{esc(game['description'])}</p>
    <div class="arcade-actions"><a class="arcade-direct" href="{esc(game['url'])}" aria-label="Play {esc(game['name'])}">Play now</a>
    <a class="arcade-about" href="{detail_path(game)}">About this game</a></div>
  </div>
</article>'''


def page_head(title, description, canonical, data=None):
    return f'''<!doctype html>
<html lang="en-CA"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(canonical)}"><meta name="theme-color" content="#253f36">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}">
<meta property="og:site_name" content="FunApps"><meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48 64x64 128x128 256x256">
  <link rel="icon" href="/favicon.png" type="image/png" sizes="96x96">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/detail.css">
{('<script type="application/ld+json">' + json_ld(data) + '</script>') if data else ''}
</head><body><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner detail-header"><a class="brand" href="/" aria-label="FunApps home"><span class="brand-mark" aria-hidden="true">✳</span> funapps<span>.ca</span></a><a href="/#arcade">All games</a></div></header>'''


def detail_page(config, game, games):
    base = config["base_url"].rstrip("/")
    canonical = base + detail_path(game)
    data = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": canonical, "url": canonical,
         "name": game["name"] + " | FunApps", "description": game["description"],
         "mainEntity": {"@id": canonical + "#game"}},
        {"@type": "VideoGame", "@id": canonical + "#game", "name": game["name"],
         "description": game["description"], "url": game["url"],
         "image": base + "/icons/" + game["slug"] + ".png",
         "gamePlatform": "Web browser", "applicationCategory": "Game"},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "FunApps", "item": base + "/"},
            {"@type": "ListItem", "position": 2, "name": game["name"], "item": canonical}]}]}
    controls = ""
    if game.get("controls"):
        controls = '<section class="detail-instructions"><h2>How to play</h2><ul>' + "".join(
            f"<li>{esc(item)}</li>" for item in game["controls"]
        ) + "</ul></section>"
    related = sorted((other for other in games if other["slug"] != game["slug"]),
                     key=lambda other: other["category"] != game["category"])[:3]
    return page_head(game["name"] + " — Play online | FunApps", game["description"], canonical, data) + f'''
<main id="main" class="detail-main">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">FunApps</a><span aria-hidden="true">/</span><span>{esc(game['name'])}</span></nav>
<section class="detail-hero">
<div class="detail-copy"><p class="eyebrow">{esc(game['category'])} · A FunApps game</p>
<h1>{esc(game['name'])}</h1><p class="detail-description">{esc(game['description'])}</p>
<a class="button button-dark detail-play" href="{esc(game['url'])}">Play {esc(game['name'])}</a>
<p class="detail-note">Opens the game in this tab. No download needed.</p></div>
<div class="detail-art" style="--card-color: {game['color']}" aria-hidden="true"><img src="/icons/{game['slug']}.png" alt="" width="128" height="128"><span class="detail-art-label">A little time, well wasted.</span></div>
</section>{controls}
<section class="detail-related" aria-labelledby="more-title"><p class="eyebrow">Keep the good time going</p><h2 id="more-title">One more round?</h2><div class="arcade-grid">{''.join(game_card(other) for other in related)}</div></section>
</main><footer class="detail-footer"><a href="/">Back to all FunApps</a><span>Small games. Good company.</span><a href="https://coolcode.ca/">Explore CoolCode</a></footer>
</body></html>'''


def sitemap_urls(config, games):
    base = config["base_url"].rstrip("/")
    host = urlsplit(base).hostname
    urls = [base + "/"] + [base + detail_path(game) for game in games] + [base + "/packet-trace/"]
    # A verified funapps.ca domain property covers these subdomains, but not
    # unrelated netlify.app hostnames. Keep those launch links out of this sitemap.
    for game in games:
        target = urlsplit(game["url"]).hostname
        if game.get("include_play_url_in_sitemap") and (target == host or target.endswith("." + host)):
            urls.append(game["url"])
    return list(dict.fromkeys(urls))


def build():
    config = json.loads((ROOT / "site.config.json").read_text())
    games = validate_config(config)
    # Framework bundles are committed alongside their source, keeping the hub's
    # deployment dependency-free. Never publish a catalogue link to a missing game.
    for game in games:
        if game.get("local_bundle"):
            bundle = ROOT / "standalone-games" / game["slug"] / "web"
            if not (bundle / "index.html").is_file():
                raise ValueError(f"{game['slug']}: missing web/index.html; build the game first")
    source = (ROOT / "index.html").read_text()
    markers = ("<!-- STRUCTURED_DATA -->", "<!-- GAME_COUNT -->", "<!-- CATALOGUE_START -->", "<!-- CATALOGUE_END -->")
    for marker in markers:
        if source.count(marker) != 1:
            raise ValueError(f"index.html must contain exactly one {marker}")
    base = config["base_url"].rstrip("/")
    data = {"@context": "https://schema.org", "@type": "CollectionPage", "url": base + "/",
            "name": config["title"], "description": config["description"],
            "mainEntity": {"@type": "ItemList", "numberOfItems": len(games), "itemListElement": [
                {"@type": "ListItem", "position": position, "name": game["name"],
                 "url": base + detail_path(game)} for position, game in enumerate(games, 1)]}}
    source = source.replace("<!-- STRUCTURED_DATA -->", '<script type="application/ld+json">' + json_ld(data) + '</script>')
    source = source.replace("<!-- GAME_COUNT -->", str(len(games)))
    source = re.sub(r"<!-- CATALOGUE_START -->.*?<!-- CATALOGUE_END -->",
                    lambda _: '<div class="arcade-grid" id="arcade-grid">\n' + "\n".join(game_card(game) for game in games) + '\n</div>',
                    source, flags=re.S)
    # Clean only generated output, after checking source/config to avoid a partial build.
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / "index.html").write_text(source)
    for name in PUBLIC_FILES:
        shutil.copy2(ROOT / name, DIST / name)
    icons = DIST / "icons"
    shutil.copytree(ROOT / "activity-icons", icons)
    for slug in [game["slug"] for game in games] + ["packet-trace"]:
        shutil.copy2(ROOT / "game-icons" / slug / "favicon.png", icons / (slug + ".png"))
    packet_dir = DIST / "packet-trace"
    packet_dir.mkdir()
    for name in PACKET_FILES:
        shutil.copy2(ROOT / "packet-trace" / name, packet_dir / name)
    apply_favicons("packet-trace", packet_dir)
    packet = (packet_dir / "index.html").read_text()
    packet = packet.replace("</head>", f'<link rel="canonical" href="{esc(base)}/packet-trace/">\n</head>')
    (packet_dir / "index.html").write_text(packet)
    for game in games:
        destination = DIST / "games" / game["slug"]
        destination.mkdir(parents=True)
        (destination / "index.html").write_text(detail_page(config, game, games))
        apply_favicons(game["slug"], destination)
        if game.get("local_bundle"):
            play_dir = DIST / "play" / game["slug"]
            shutil.copytree(ROOT / "standalone-games" / game["slug"] / "web", play_dir)
            apply_favicons(game["slug"], play_dir)
            page = (play_dir / "index.html").read_text()
            page = re.sub(r'<link\b[^>]*rel=[\"\']canonical[\"\'][^>]*>\s*', '', page, flags=re.I)
            page = page.replace("</head>", f'<link rel="canonical" href="{esc(game["url"])}">\n<meta name="funapps-game-id" content="{game["slug"]}">\n</head>', 1)
            (play_dir / "index.html").write_text(page)
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    sitemap = ET.Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")
    for url in sitemap_urls(config, games):
        element = ET.SubElement(sitemap, "url")
        ET.SubElement(element, "loc").text = url
        modified = config.get("updated_at") if url in (base + "/", base + "/packet-trace/") else None
        for game in games:
            if url == base + detail_path(game):
                modified = game.get("detail_updated_at", config.get("game_pages_updated_at"))
                break
            if url == game["url"]:
                modified = game.get("play_updated_at")
                break
        if modified:
            ET.SubElement(element, "lastmod").text = date.fromisoformat(modified).isoformat()
    ET.indent(sitemap)
    ET.ElementTree(sitemap).write(DIST / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n")
    (DIST / "_redirects").write_text(
        f"https://www.funapps.ca/* {base}/:splat 301!\n"
        "/games-sitemap.xml /sitemap.xml 301\n/sitemap.php /sitemap.xml 301\n"
        "/favicon.svg /favicon.png 301\n")
    (DIST / "_headers").write_text("/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n")
    missing = page_head("Page not found | FunApps", "That page is missing. Find your next game at FunApps.", base + "/404.html")
    missing = missing.replace("</head>", '<meta name="robots" content="noindex">\n</head>')
    (DIST / "404.html").write_text(missing + '<main id="main" class="detail-main missing-page"><p class="eyebrow">404 · A wrong turn</p><h1>This one got away.</h1><p>There is plenty more to play. Head back to the games and pick something good.</p><a class="button button-dark" href="/">Back to FunApps</a></main></body></html>')
    print(f"Built {len(games)} game pages and {len(sitemap_urls(config, games))} sitemap URLs in dist/")


if __name__ == "__main__":
    build()
