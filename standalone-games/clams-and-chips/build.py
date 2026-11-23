"""Build a dependency-free Netlify upload and keep source separate."""
from pathlib import Path
from shutil import copy2, rmtree
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parent
PUBLIC = ('index.html','style.css','app.mjs','engine.mjs','art.mjs','icon.svg','_headers','robots.txt','sitemap.xml')
DIST = ROOT / 'dist'
if DIST.exists(): rmtree(DIST)
DIST.mkdir()
for name in PUBLIC: copy2(ROOT/name,DIST/name)
with ZipFile(ROOT/'clams-chips-netlify.zip','w',ZIP_DEFLATED) as archive:
    for name in PUBLIC: archive.write(DIST/name,name)
print(f'Built {len(PUBLIC)} public files and clams-chips-netlify.zip')
