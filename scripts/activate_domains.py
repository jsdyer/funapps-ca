#!/usr/bin/env python3
"""Check HTTPS/game identity before switching hub links and sitemap to new domains."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
from urllib.request import urlopen
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true', help='Update the catalogue and rebuild; does not commit or deploy')
args = parser.parse_args()
path = ROOT / 'site.config.json'
config = json.loads(path.read_text())
changed = []
for game in config['games']:
    if game.get('domain_ready') or not game.get('custom_domain'):
        continue
    url = 'https://' + game['custom_domain'] + '/'
    try:
        with urlopen(url, timeout=15) as response:
            page = response.read().decode('utf-8')
            if urlsplit(response.url).scheme != 'https' or urlsplit(response.url).hostname != game['custom_domain'] or f'name="funapps-game-id" content="{game["slug"]}"' not in page:
                raise ValueError('HTTPS destination does not serve the expected game')
        print('READY', url)
        changed.append(game['slug'])
        game.update(url=url, domain_ready=True, include_play_url_in_sitemap=True)
    except Exception as error:
        print('PENDING', url, str(error))
if args.apply and changed:
    path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True)
elif changed:
    print('Dry run. Use --apply to update local catalogue and sitemap.')
