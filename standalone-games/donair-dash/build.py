"""Build the static Netlify bundle without dependencies or private files."""
from pathlib import Path
from urllib.parse import urlsplit
from xml.sax.saxutils import escape
import datetime
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = ('index.html', 'style.css', 'app.mjs', 'art.mjs', 'engine.mjs', 'icon.svg', '_headers', 'robots.txt', 'sitemap.xml', 'games-sitemap.xml')

# Include only live canonical URLs. Keep dates tied to real page changes, not builds.
entries = []
seen = set()
for game in json.loads((ROOT / 'games.json').read_text(encoding='utf-8')):
    if not game.get('published', False):
        continue
    url = game['url']
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError(f'Use a canonical HTTPS URL without credentials, query or fragment: {url}')
    if url in seen:
        raise ValueError(f'Duplicate game URL: {url}')
    seen.add(url)
    date = datetime.date.fromisoformat(game['lastmod']).isoformat()
    entries.append(f'  <url>\n    <loc>{escape(url)}</loc>\n    <lastmod>{date}</lastmod>\n  </url>')
if not entries:
    raise ValueError('The games sitemap must contain at least one published game.')
(ROOT / 'games-sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '\n'.join(entries) + '\n</urlset>\n', encoding='utf-8')

out = ROOT / 'dist'
if out.exists():
    shutil.rmtree(out)
out.mkdir()
for name in FILES:
    shutil.copy2(ROOT / name, out / name)
with zipfile.ZipFile(ROOT / 'donair-dash-netlify.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in FILES:
        archive.write(out / name, name)
print(f'Built {len(FILES)} static files and donair-dash-netlify.zip')
