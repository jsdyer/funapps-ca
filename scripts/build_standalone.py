#!/usr/bin/env python3
"""Package maintained game source for the existing Netlify Drop projects."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import zipfile
from game_favicons import apply_favicons

ROOT = Path(__file__).resolve().parents[1]

def package(game, output):
    source = ROOT / 'standalone-games' / game['slug']
    target = output / game['slug']
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    layout = game.get('release_layout')
    if layout == 'project':
        project = source / 'project'
        # Package only versioned source. Local environment files and build output stay private.
        tracked = subprocess.check_output(['git', 'ls-files', '-z', '--', '.'], cwd=project)
        if not tracked or not (project / 'netlify.toml').is_file():
            raise ValueError(f"{game['slug']}: missing tracked Netlify project")
        for relative in tracked.decode().rstrip('\0').split('\0'):
            destination = target / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(project / relative, destination)
    elif (source / 'web' / 'index.html').is_file():
        shutil.copytree(source / 'web', target, dirs_exist_ok=True)
    else:
        for path in source.iterdir():
            if path.is_file() and (path.suffix in ('.html', '.js', '.mjs', '.css', '.svg', '.png', '.ico', '.webp', '.jpg') or path.name == '_headers') and not path.name.startswith(('audit-', 'test_')) and '-regression.' not in path.name:
                shutil.copy2(path, target / path.name)
    # Preserve each live release's metadata and routing while adding portable icons.
    if layout != 'project':
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
