#!/usr/bin/env python3
"""Package maintained game source for the existing Netlify Drop projects."""
import argparse
import json
from pathlib import Path
import shutil
import zipfile
from game_favicons import apply_favicons

ROOT = Path(__file__).resolve().parents[1]

def package(game, output):
    source = ROOT / 'standalone-games' / game['slug']
    target = output / game['slug']
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    if (source / 'web' / 'index.html').is_file():
        shutil.copytree(source / 'web', target, dirs_exist_ok=True)
    else:
        for path in source.iterdir():
            if path.is_file() and (path.suffix in ('.html', '.js', '.mjs', '.css', '.svg', '.png', '.ico', '.webp', '.jpg') or path.name == '_headers') and not path.name.startswith(('audit-', 'test_')) and '-regression.' not in path.name:
                shutil.copy2(path, target / path.name)
    # Preserve each live release's metadata and routing while adding portable icons.
    apply_favicons(game['slug'], target)
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
