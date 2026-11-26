#!/usr/bin/env python3
"""Rebuild committed regional game releases; production hub builds need only Python."""
import argparse
import json
from pathlib import Path
import subprocess
from game_favicons import apply_favicons

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true', help='Install locked npm dependencies first')
    parser.add_argument('--test', action='store_true', help='Run each game rule-test suite before building')
    parser.add_argument('--slug', help='Build one local game instead of all')
    args = parser.parse_args()
    games = [game for game in json.loads((ROOT / 'site.config.json').read_text())['games']
             if game.get('local_bundle') and (not args.slug or game['slug'] == args.slug)]
    if not games:
        parser.error('No matching bundled game')
    for game in games:
        directory = ROOT / 'standalone-games' / game['slug']
        package = json.loads((directory / 'package.json').read_text())
        scripts = package.get('scripts', {})
        print(f"\n{game['name']}", flush=True)
        if args.install and (directory / 'package-lock.json').exists():
            subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=directory, check=True)
        if args.test:
            if scripts.get('check'):
                subprocess.run(['npm', 'run', 'check'], cwd=directory, check=True)
            subprocess.run(['npm', 'test'], cwd=directory, check=True)
        if scripts.get('build'):
            subprocess.run(['npm', 'run', 'build'], cwd=directory, check=True)
        if not (directory / 'web' / 'index.html').is_file():
            raise SystemExit(f"Missing release for {game['slug']}")
        apply_favicons(game["slug"], directory / "web")


if __name__ == '__main__':
    main()
