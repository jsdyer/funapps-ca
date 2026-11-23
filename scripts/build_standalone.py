#!/usr/bin/env python3
"""Package maintained game source for the existing Netlify Drop projects."""
import argparse
import html
import json
from pathlib import Path
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def package(game, output):
    source = ROOT / 'standalone-games' / game['slug']
    target = output / game['slug']
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    if game.get('local_bundle'):
        shutil.copytree(source / 'web', target, dirs_exist_ok=True)
    else:
        for path in source.iterdir():
            if path.is_file() and (path.suffix in ('.html', '.js', '.mjs', '.css', '.svg', '.png', '.webp', '.jpg') or path.name == '_headers') and not path.name.startswith(('audit-', 'test_')) and '-regression.' not in path.name:
                shutil.copy2(path, target / path.name)
    canonical = 'https://' + game['custom_domain'] + '/' if game.get('custom_domain') else game['url']
    page = (target / 'index.html').read_text()
    page = re.sub(r'<link\b[^>]*rel=[\"\']canonical[\"\'][^>]*>\s*', '', page, flags=re.I)
    if not re.search(r'<meta\b[^>]*name=[\"\']description[\"\']', page, re.I):
        page = page.replace('</head>', '<meta name="description" content="' + html.escape(game['description'], quote=True) + '">\n</head>', 1)
    page = page.replace('</head>', f'<link rel="canonical" href="{canonical}">\n<meta name="funapps-game-id" content="{game["slug"]}">\n</head>', 1)
    (target / 'index.html').write_text(page)
    (target / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{canonical}</loc><lastmod>{game["audited_at"]}</lastmod></url></urlset>\n')
    (target / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + canonical + 'sitemap.xml\n')
    if not (target / '_headers').exists():
        (target / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n')
    archive = output / (game['slug'] + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(target.rglob('*')):
            if path.is_file():
                z.write(path, path.relative_to(target))
    print(archive)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'standalone-dist')
    parser.add_argument('--slug')
    args = parser.parse_args()
    games = json.loads((ROOT / 'site.config.json').read_text())['games']
    for game in games:
        if not args.slug or args.slug == game['slug']:
            package(game, args.output)
